import test from "node:test";
import assert from "node:assert/strict";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import request from "supertest";
import app from "../app.js";
import AdminAuditLog from "../models/AdminAuditLog.js";
import ArtistProfile from "../models/ArtistProfile.js";
import Portfolio from "../models/Portfolio.js";
import Project from "../models/Project.js";
import Studio from "../models/Studio.js";
import User from "../models/User.js";
import { setupTestDB, teardownTestDB } from "./setup.js";

const createUser = async (role, overrides = {}) =>
  User.create({
    name: `${role} user`,
    email: `${role}-${Math.random().toString(16).slice(2)}@example.com`,
    password: await bcrypt.hash("test-password-123", 4),
    role,
    ...overrides,
  });

const tokenFor = (user) =>
  jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET);

test("Admin APIs", async (t) => {
  let admin;

  t.before(async () => {
    process.env.JWT_SECRET = "test-admin-api-secret";
    await setupTestDB();
  });

  t.after(async () => {
    await teardownTestDB();
  });

  t.beforeEach(async () => {
    await Promise.all([
      AdminAuditLog.deleteMany({}),
      ArtistProfile.deleteMany({}),
      Portfolio.deleteMany({}),
      Project.deleteMany({}),
      Studio.deleteMany({}),
      User.deleteMany({}),
    ]);
    admin = await createUser("admin", { name: "Platform Admin", email: "admin@example.com" });
  });

  await t.test("denies unauthenticated and non-admin access", async () => {
    const artist = await createUser("artist");

    await request(app).get("/api/v1/admin/dashboard").expect(401);
    await request(app)
      .get("/api/v1/admin/dashboard")
      .set("Authorization", `Bearer ${tokenFor(artist)}`)
      .expect(403);
  });

  await t.test("offers admin-only read-only pending audit reconciliation", async () => {
    const artist = await createUser("artist");
    const studioUser = await createUser("studio");
    const project = await Project.create({
      studio: studioUser._id,
      title: "Pending removal",
      description: "Audit reconciliation test",
    });
    await AdminAuditLog.create({
      actor: admin._id,
      actorRole: admin.role,
      actorEmail: admin.email,
      actionType: "disable_account",
      targetType: "user",
      targetId: artist._id,
      targetName: artist.name,
      details: "Pending account status change",
      status: "pending",
      ipAddress: "127.0.0.1",
      userAgent: "test-agent",
    });
    await AdminAuditLog.create({
      actor: admin._id,
      actorRole: admin.role,
      actorEmail: admin.email,
      actionType: "remove_project",
      targetType: "project",
      targetId: project._id,
      targetName: project.title,
      status: "pending",
    });

    await request(app).get("/api/v1/admin/audit-logs/pending").expect(401);
    await request(app)
      .get("/api/v1/admin/audit-logs/pending")
      .set("Authorization", `Bearer ${tokenFor(artist)}`)
      .expect(403);

    const response = await request(app)
      .get("/api/v1/admin/audit-logs/pending")
      .query({ page: 1, limit: 1 })
      .set("Authorization", `Bearer ${tokenFor(admin)}`)
      .expect(200);
    assert.equal(response.body.data.auditLogs.length, 1);
    assert.equal(response.body.data.pagination.total, 2);
    assert.equal(response.body.data.pagination.totalPages, 2);
    assert.equal(
      Object.hasOwn(response.body.data.auditLogs[0], "ipAddress"),
      false,
    );
    assert.equal(
      Object.hasOwn(response.body.data.auditLogs[0], "userAgent"),
      false,
    );

    const userLog = await AdminAuditLog.findOne({ targetId: artist._id }).lean();
    const projectLog = await AdminAuditLog.findOne({ targetId: project._id }).lean();
    assert.equal(userLog.status, "pending");
    assert.equal(projectLog.status, "pending");
    assert.equal((await User.findById(artist._id)).isActive, true);
    assert.ok(await Project.exists({ _id: project._id }));

    const allRecords = await request(app)
      .get("/api/v1/admin/audit-logs/pending")
      .set("Authorization", `Bearer ${tokenFor(admin)}`)
      .expect(200);
    const accountReconciliation = allRecords.body.data.auditLogs.find(
      (record) => record.actionType === "disable_account",
    );
    const projectReconciliation = allRecords.body.data.auditLogs.find(
      (record) => record.actionType === "remove_project",
    );
    assert.equal(
      accountReconciliation.reconciliation.assessment,
      "differs_from_requested_state",
    );
    assert.equal(
      projectReconciliation.reconciliation.assessment,
      "differs_from_requested_state",
    );
  });

  await t.test("returns real dashboard totals and paginated, searchable safe user data", async () => {
    const artist = await createUser("artist", { name: "Needle Artist", email: "needle@example.com" });
    const studioUser = await createUser("studio", { name: "Studio One" });
    await createUser("artist", { name: "Other Artist" });
    await ArtistProfile.create({ user: artist._id, skills: ["3D"], bio: "Artist profile" });
    await Promise.all(
      Array.from({ length: 4 }, (_, index) =>
        Portfolio.create({
          artist: artist._id,
          title: `Portfolio ${index}`,
          category: "Concept Art",
        }),
      ),
    );
    await Studio.create({ user: studioUser._id, studioName: "Studio One" });
    await Project.create({
      studio: studioUser._id,
      title: "Test Project",
      description: "A real project",
    });

    const dashboard = await request(app)
      .get("/api/v1/admin/dashboard")
      .set("Authorization", `Bearer ${tokenFor(admin)}`)
      .expect(200);
    assert.deepEqual(dashboard.body.data.stats, {
      totalUsers: 3,
      artists: 2,
      studios: 1,
      totalProjects: 1,
      activeUsers: 3,
      disabledUsers: 0,
    });

    const users = await request(app)
      .get("/api/v1/admin/users")
      .query({ page: 1, limit: 1, role: "artist", search: "needle" })
      .set("Authorization", `Bearer ${tokenFor(admin)}`)
      .expect(200);
    assert.equal(users.body.data.users.length, 1);
    assert.equal(users.body.data.pagination.total, 1);
    assert.equal(users.body.data.users[0].email, "needle@example.com");
    assert.equal(Object.hasOwn(users.body.data.users[0], "password"), false);

    const studios = await request(app)
      .get("/api/v1/admin/studios")
      .set("Authorization", `Bearer ${tokenFor(admin)}`)
      .expect(200);
    assert.equal(studios.body.data.studios[0].projectCount, 1);
    assert.equal(studios.body.data.studios[0].recentProjects[0].title, "Test Project");

    const artists = await request(app)
      .get("/api/v1/admin/artists")
      .query({ search: "Artist profile" })
      .set("Authorization", `Bearer ${tokenFor(admin)}`)
      .expect(200);
    assert.equal(artists.body.data.artists.length, 1);
    assert.equal(artists.body.data.artists[0].portfolioCount, 4);
    assert.equal(artists.body.data.artists[0].recentPortfolio.length, 3);

    const projects = await request(app)
      .get("/api/v1/admin/projects")
      .query({ page: 1, limit: 1, search: "Test Project" })
      .set("Authorization", `Bearer ${tokenFor(admin)}`)
      .expect(200);
    assert.equal(projects.body.data.projects.length, 1);
    assert.equal(projects.body.data.pagination.total, 1);
  });

  await t.test("validates management pagination and role filters", async () => {
    const invalidPage = await request(app)
      .get("/api/v1/admin/users")
      .query({ page: 0, limit: 10 })
      .set("Authorization", `Bearer ${tokenFor(admin)}`)
      .expect(400);
    assert.equal(invalidPage.body.success, false);

    await request(app)
      .get("/api/v1/admin/users")
      .query({ role: "admin" })
      .set("Authorization", `Bearer ${tokenFor(admin)}`)
      .expect(400);
  });

  await t.test("prevents self-disable and audits successful account status changes", async () => {
    await request(app)
      .patch(`/api/v1/admin/users/${admin.id}/status`)
      .set("Authorization", `Bearer ${tokenFor(admin)}`)
      .send({ isActive: false })
      .expect(400);

    const artist = await createUser("artist");
    const response = await request(app)
      .patch(`/api/v1/admin/users/${artist.id}/status`)
      .set("Authorization", `Bearer ${tokenFor(admin)}`)
      .send({ isActive: false })
      .expect(200);
    assert.equal(response.body.data.user.isActive, false);

    const audit = await AdminAuditLog.findOne({ targetId: artist._id }).lean();
    assert.equal(audit.actionType, "disable_account");
    assert.equal(audit.actor.toString(), admin.id);
    assert.equal(audit.targetType, "user");
    assert.equal(audit.actorEmail, admin.email);
    assert.equal(audit.status, "completed");
    assert.ok(audit.completedAt instanceof Date);
    assert.ok(audit.ipAddress);
    assert.ok(audit.createdAt instanceof Date);
  });

  await t.test("does not mutate account status when an audit intent cannot be stored", async () => {
    const artist = await createUser("artist");
    const originalCreate = AdminAuditLog.create;
    AdminAuditLog.create = async () => {
      throw new Error("audit storage unavailable");
    };

    try {
      await request(app)
        .patch(`/api/v1/admin/users/${artist.id}/status`)
        .set("Authorization", `Bearer ${tokenFor(admin)}`)
        .send({ isActive: false })
        .expect(500);
    } finally {
      AdminAuditLog.create = originalCreate;
    }

    const unchanged = await User.findById(artist._id).select("isActive").lean();
    assert.equal(unchanged.isActive, true);
  });

  await t.test("leaves an explicit pending audit if completion cannot be confirmed", async () => {
    const artist = await createUser("artist");
    const originalUpdateOne = AdminAuditLog.updateOne;
    AdminAuditLog.updateOne = async () => {
      throw new Error("audit completion unavailable");
    };

    try {
      await request(app)
        .patch(`/api/v1/admin/users/${artist.id}/status`)
        .set("Authorization", `Bearer ${tokenFor(admin)}`)
        .send({ isActive: false })
        .expect(500);
    } finally {
      AdminAuditLog.updateOne = originalUpdateOne;
    }

    const changedUser = await User.findById(artist._id).select("isActive").lean();
    const audit = await AdminAuditLog.findOne({ targetId: artist._id }).lean();
    assert.equal(changedUser.isActive, false);
    assert.equal(audit.status, "pending");
    assert.equal(audit.completedAt, null);
  });

  await t.test("removes projects and records the acting administrator", async () => {
    const studioUser = await createUser("studio");
    const project = await Project.create({
      studio: studioUser._id,
      title: "Flagged project",
      description: "A project to remove",
    });

    await request(app)
      .delete(`/api/v1/admin/projects/${project.id}`)
      .set("Authorization", `Bearer ${tokenFor(admin)}`)
      .expect(200);

    assert.equal(await Project.exists({ _id: project._id }), null);
    const audit = await AdminAuditLog.findOne({ targetId: project._id }).lean();
    assert.equal(audit.actionType, "remove_project");
    assert.equal(audit.actor.toString(), admin.id);
    assert.equal(audit.targetType, "project");
    assert.equal(audit.status, "completed");
    assert.ok(audit.completedAt instanceof Date);
  });
});
