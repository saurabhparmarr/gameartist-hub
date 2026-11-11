import test from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import app from "../app.js";

test("Health and error responses", async () => {
  const healthResponse = await request(app).get("/").expect(200);
  assert.equal(healthResponse.body.success, true);
  assert.equal(healthResponse.body.data.status, "UP");

  const missingResponse = await request(app)
    .get("/api/v1/not-a-route")
    .expect(404);
  assert.equal(missingResponse.body.success, false);
  assert.match(missingResponse.body.message, /Route not found/);
  assert.equal(Object.hasOwn(missingResponse.body, "stack"), false);
});
