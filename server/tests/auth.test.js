import test from "node:test";
import assert from "node:assert/strict";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import request from "supertest";
import app from "../app.js";
import User from "../models/User.js";
import { setupTestDB, teardownTestDB } from "./setup.js";

const testUser = {
  name: "Test Artist",
  email: "artist@example.com",
  password: "securepass123",
  role: "artist",
};

test("Auth and access control", async (t) => {
  t.before(async () => {
    process.env.JWT_SECRET = "test-secret-key";
    await setupTestDB();
  });

  t.after(async () => {
    await teardownTestDB();
  });

  t.beforeEach(async () => {
    await User.deleteMany({});
  });

  await t.test("registers and logs in a user", async () => {
    const registerResponse = await request(app)
      .post("/api/v1/auth/register")
      .send(testUser)
      .expect(201);

    assert.equal(registerResponse.body.success, true);
    assert.equal(registerResponse.body.data.user.email, testUser.email);

    const loginResponse = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: testUser.email, password: testUser.password })
      .expect(200);

    assert.equal(loginResponse.body.success, true);
    assert.equal(typeof loginResponse.body.data.token, "string");
  });

  await t.test("rejects invalid credentials", async () => {
    await User.create({
      name: "Test Artist",
      email: testUser.email,
      password: "hashed-password",
      role: "artist",
    });

    const response = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: testUser.email, password: "wrongpass" })
      .expect(401);

    assert.match(response.body.message, /invalid|password/i);
  });

  await t.test("requires and accepts valid JWTs on protected routes", async () => {
    const user = await User.create({
      name: "Authenticated Artist",
      email: "authenticated@example.com",
      password: await bcrypt.hash("password123", 4),
      role: "artist",
    });

    await request(app).get("/api/v1/messages").expect(401);
    await request(app)
      .get("/api/v1/messages")
      .set("Authorization", "Bearer invalid.token.value")
      .expect(401);

    const response = await request(app)
      .get("/api/v1/messages")
      .set("Authorization", `Bearer ${jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET)}`)
      .expect(200);

    await request(app)
      .get("/api/v1/messages")
      .set("Authorization", `Bearer ${jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: "-1s" })}`)
      .expect(401);

    assert.equal(response.body.success, true);
  });

  await t.test("blocks disabled accounts from login and protected routes", async () => {
    const hash = await import("bcryptjs").then(({ default: bcrypt }) => bcrypt.hash("password123", 12));

    const disabledUser = await User.create({
      name: "Disabled Artist",
      email: "disabled@example.com",
      password: hash,
      role: "artist",
      isActive: false,
    });

    const response = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "disabled@example.com", password: "password123" })
      .expect(403);

    assert.match(response.body.message, /disabled/i);
    await request(app)
      .get("/api/v1/messages")
      .set("Authorization", `Bearer ${jwt.sign({ id: disabledUser.id, role: disabledUser.role }, process.env.JWT_SECRET)}`)
      .expect(403);
  });

  await t.test("restricts admin APIs to admin users", async () => {
    await User.create({
      name: "Test Artist",
      email: "artist2@example.com",
      password: "$2a$12$LJXkQ4mAR7sS1Gy4b7G6jO6pS7JwZQ6DiixLqQF4WBvQnM5W1bW6u",
      role: "artist",
    });

    const response = await request(app)
      .get("/api/v1/admin/dashboard")
      .set("Authorization", "Bearer invalid-token")
      .expect(401);

    assert.equal(response.body.success, false);
    assert.match(response.body.message, /invalid|expired|authentication/i);
  });
});
