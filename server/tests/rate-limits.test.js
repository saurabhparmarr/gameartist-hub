import test from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import app from "../app.js";

test("Authentication endpoints enforce the configured rate limit", async () => {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    await request(app)
      .post("/api/v1/auth/login")
      .send({})
      .expect(400);
  }

  const limitedResponse = await request(app)
    .post("/api/v1/auth/login")
    .send({})
    .expect(429);
  assert.match(limitedResponse.body.message, /too many/i);
});
