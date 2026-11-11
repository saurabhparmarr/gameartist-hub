import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import request from "supertest";
import app from "../app.js";
import { setupTestDB, teardownTestDB } from "./setup.js";

test("health endpoints distinguish liveness from database readiness", async (t) => {
  t.before(async () => {
    await setupTestDB();
  });

  t.after(async () => {
    await teardownTestDB();
  });

  await t.test("reports liveness and distinguishes database readiness", async () => {
    const live = await request(app).get("/").expect(200);
    assert.equal(live.body.data.status, "UP");

    const readyResponse = await request(app).get("/ready").expect(200);
    assert.equal(readyResponse.body.data.status, "READY");
    const readyState = mongoose.connection.readyState;
    mongoose.connection.readyState = 0;

    const ready = await request(app).get("/ready").expect(503);
    assert.equal(ready.body.data.status, "NOT_READY");
    mongoose.connection.readyState = readyState;
  });
});
