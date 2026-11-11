import test from "node:test";
import assert from "node:assert/strict";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import request from "supertest";
import app from "../app.js";
import ArtistProfile from "../models/ArtistProfile.js";
import Portfolio from "../models/Portfolio.js";
import Project from "../models/Project.js";
import Studio from "../models/Studio.js";
import User from "../models/User.js";
import { setupTestDB, teardownTestDB } from "./setup.js";

const createUser = async (role, email) =>
  User.create({
    name: `${role} user`,
    email,
    password: await bcrypt.hash("test-password-123", 4),
    role,
  });

const tokenFor = (user) =>
  jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET);

test("Resource ownership permissions", async (t) => {
  t.before(async () => {
    process.env.JWT_SECRET = "test-resource-ownership-secret";
    await setupTestDB();
  });

  t.after(async () => {
    await teardownTestDB();
  });

  t.beforeEach(async () => {
    await Promise.all([
      ArtistProfile.deleteMany({}),
      Portfolio.deleteMany({}),
      Project.deleteMany({}),
      Studio.deleteMany({}),
      User.deleteMany({}),
    ]);
  });

  await t.test("a studio cannot update or delete another studio's project", async () => {
    const owner = await createUser("studio", "project-owner@example.com");
    const otherStudio = await createUser("studio", "other-studio@example.com");
    await Studio.create({ user: owner._id, studioName: "Owner Studio" });
    const project = await Project.create({
      studio: owner._id,
      title: "Owned project",
      description: "Only the owner should change this",
    });
    const auth = `Bearer ${tokenFor(otherStudio)}`;

    await request(app)
      .put(`/api/v1/projects/${project.id}`)
      .set("Authorization", auth)
      .send({ title: "Unauthorized edit" })
      .expect(403);
    await request(app)
      .delete(`/api/v1/projects/${project.id}`)
      .set("Authorization", auth)
      .expect(403);

    const unchanged = await Project.findById(project._id);
    assert.equal(unchanged.title, "Owned project");
    assert.ok(await Project.exists({ _id: project._id }));
  });

  await t.test("an artist cannot update or delete another artist's portfolio item", async () => {
    const owner = await createUser("artist", "portfolio-owner@example.com");
    const otherArtist = await createUser("artist", "other-artist@example.com");
    const portfolio = await Portfolio.create({
      artist: owner._id,
      title: "Owned artwork",
      category: "Concept Art",
    });
    const auth = `Bearer ${tokenFor(otherArtist)}`;

    await request(app)
      .put(`/api/v1/portfolio/${portfolio.id}`)
      .set("Authorization", auth)
      .send({ title: "Unauthorized edit" })
      .expect(403);
    await request(app)
      .delete(`/api/v1/portfolio/${portfolio.id}`)
      .set("Authorization", auth)
      .expect(403);

    const unchanged = await Portfolio.findById(portfolio._id);
    assert.equal(unchanged.title, "Owned artwork");
    assert.ok(await Portfolio.exists({ _id: portfolio._id }));
  });

  await t.test("requires authentication for project and portfolio mutations", async () => {
    await request(app)
      .post("/api/v1/projects")
      .send({ title: "Unauthenticated", description: "Not permitted" })
      .expect(401);
    await request(app)
      .post("/api/v1/portfolio")
      .send({ title: "Unauthenticated", category: "Concept Art" })
      .expect(401);
  });

  await t.test("searches and paginates only active public artists with portfolio previews", async () => {
    const firstArtist = await createUser("artist", "directory-one@example.com");
    const secondArtist = await createUser("artist", "directory-two@example.com");
    const disabledArtist = await createUser("artist", "directory-disabled@example.com");
    await User.updateOne({ _id: disabledArtist._id }, { $set: { isActive: false } });
    await ArtistProfile.create({
      user: firstArtist._id,
      skills: ["3D Environment"],
      location: "Montreal",
    });
    await ArtistProfile.create({
      user: secondArtist._id,
      skills: ["3D Environment"],
      location: "Montreal",
    });
    const disabledProfile = await ArtistProfile.create({
      user: disabledArtist._id,
      skills: ["3D Environment"],
      location: "Montreal",
    });
    await Portfolio.create({
      artist: firstArtist._id,
      title: "Environment preview",
      category: "3D Environment",
      imageUrl: "https://images.example.com/environment.jpg",
    });
    await Portfolio.create({
      artist: secondArtist._id,
      title: "Second environment",
      category: "3D Environment",
    });
    const disabledPortfolio = await Portfolio.create({
      artist: disabledArtist._id,
      title: "Disabled artist artwork",
      category: "3D Environment",
    });

    const firstPage = await request(app)
      .get("/api/v1/artists")
      .query({ skill: "3D", location: "Montreal", page: 1, limit: 1 })
      .expect(200);
    assert.equal(firstPage.body.data.pagination.total, 2);
    assert.equal(firstPage.body.data.artists.length, 1);
    assert.ok([firstArtist.name, secondArtist.name].includes(firstPage.body.data.artists[0].user.name));
    assert.equal(firstPage.body.data.artists[0].recentPortfolio.length, 1);

    const secondPage = await request(app)
      .get("/api/v1/artists")
      .query({ skill: "3D", location: "Montreal", page: 2, limit: 1 })
      .expect(200);
    assert.equal(secondPage.body.data.artists.length, 1);
    assert.notEqual(secondPage.body.data.artists[0]._id, firstPage.body.data.artists[0]._id);

    await request(app)
      .get(`/api/v1/artists/${disabledProfile.id}`)
      .expect(404);
    await request(app)
      .get("/api/v1/portfolio")
      .query({ artistId: disabledArtist.id })
      .expect(200)
      .expect((response) => {
        assert.equal(response.body.data.pagination.total, 0);
        assert.equal(response.body.data.portfolios.length, 0);
      });
    await request(app)
      .get(`/api/v1/portfolio/${disabledPortfolio.id}`)
      .expect(404);

    await request(app)
      .get("/api/v1/artists")
      .query({ name: "x".repeat(101) })
      .expect(400);
  });

  await t.test("hides projects when their studio account is disabled", async () => {
    const disabledStudio = await createUser("studio", "disabled-studio@example.com");
    const project = await Project.create({
      studio: disabledStudio._id,
      title: "Hidden studio project",
      description: "Not publicly visible after account disablement",
    });
    await User.updateOne({ _id: disabledStudio._id }, { $set: { isActive: false } });

    const listing = await request(app)
      .get("/api/v1/projects")
      .expect(200);
    assert.equal(listing.body.data.pagination.total, 0);
    assert.equal(listing.body.data.projects.length, 0);

    await request(app)
      .get(`/api/v1/projects/${project.id}`)
      .expect(404);
  });
});
