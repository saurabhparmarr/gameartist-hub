import test from "node:test";
import assert from "node:assert/strict";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import request from "supertest";
import app from "../app.js";
import Message from "../models/Message.js";
import User from "../models/User.js";
import { setupTestDB, teardownTestDB } from "./setup.js";

const createUser = async (name) =>
  User.create({
    name,
    email: `${name.toLowerCase().replaceAll(" ", ".")}@example.com`,
    password: await bcrypt.hash("test-password-123", 4),
    role: "artist",
  });

test("Message pagination", async (t) => {
  let sender;
  let receiver;
  let token;

  t.before(async () => {
    process.env.JWT_SECRET = "test-message-pagination-secret";
    await setupTestDB();
  });

  t.after(async () => {
    await teardownTestDB();
  });

  t.beforeEach(async () => {
    await Message.deleteMany({});
    await User.deleteMany({});
    sender = await createUser("Message Sender");
    receiver = await createUser("Message Receiver");
    token = jwt.sign(
      { id: sender.id, role: sender.role },
      process.env.JWT_SECRET,
    );
  });

  await t.test("bounds and paginates conversation summaries", async () => {
    const participants = await Promise.all([
      createUser("Contact One"),
      createUser("Contact Two"),
      createUser("Contact Three"),
    ]);
    await Promise.all(participants.map((participant, index) =>
      Message.create({
        sender: sender._id,
        receiver: participant._id,
        content: `Conversation ${index}`,
      }),
    ));

    const firstPage = await request(app)
      .get("/api/v1/messages")
      .query({ limit: 2 })
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    assert.equal(firstPage.body.data.conversations.length, 2);
    assert.equal(firstPage.body.data.pagination.limit, 2);
    assert.equal(firstPage.body.data.pagination.total, 3);
    assert.equal(firstPage.body.data.pagination.hasMore, true);
    assert.ok(firstPage.body.data.pagination.nextCursor);

    const secondPage = await request(app)
      .get("/api/v1/messages")
      .query({
        limit: 2,
        ...firstPage.body.data.pagination.nextCursor,
      })
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    assert.equal(secondPage.body.data.conversations.length, 1);
    assert.equal(secondPage.body.data.pagination.hasMore, false);
    assert.equal(secondPage.body.data.pagination.nextCursor, null);
  });

  await t.test("serves complete legacy response shapes when the old client omits pagination", async () => {
    const participants = await Promise.all(
      Array.from({ length: 22 }, (_, index) =>
        createUser(`Legacy Contact ${index}`),
      ),
    );
    await Promise.all(participants.map((participant, index) =>
      Message.create({
        sender: sender._id,
        receiver: participant._id,
        content: `Legacy conversation ${index}`,
      }),
    ));

    const conversations = await request(app)
      .get("/api/v1/messages")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    assert.equal(conversations.body.data.conversations.length, 22);
    assert.equal(Object.hasOwn(conversations.body.data, "pagination"), false);

    await Promise.all(Array.from({ length: 35 }, (_, index) =>
      Message.create({
        sender: index % 2 ? sender._id : receiver._id,
        receiver: index % 2 ? receiver._id : sender._id,
        content: `Legacy message ${index}`,
        createdAt: new Date(Date.UTC(2025, 0, 1, 0, 0, index)),
      }),
    ));
    const history = await request(app)
      .get(`/api/v1/messages/${receiver.id}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    assert.equal(history.body.data.messages.length, 35);
    assert.equal(Object.hasOwn(history.body.data, "pagination"), false);
    assert.equal(history.body.data.messages[0].content, "Legacy message 0");
    assert.equal(history.body.data.messages.at(-1).content, "Legacy message 34");
    assert.equal(
      await Message.countDocuments({
        sender: receiver._id,
        receiver: sender._id,
        read: false,
      }),
      0,
    );
  });

  await t.test("returns bounded chronological history and an older cursor", async () => {
    const createdAt = new Date("2025-01-01T00:00:00.000Z");
    await Promise.all(Array.from({ length: 5 }, (_, index) =>
      Message.create({
        sender: index % 2 ? sender._id : receiver._id,
        receiver: index % 2 ? receiver._id : sender._id,
        content: `Message ${index}`,
        read: false,
        createdAt: new Date(createdAt.getTime() + index * 1000),
      }),
    ));

    const latestPage = await request(app)
      .get(`/api/v1/messages/${receiver.id}`)
      .query({ limit: 2 })
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    assert.deepEqual(
      latestPage.body.data.messages.map((message) => message.content),
      ["Message 3", "Message 4"],
    );
    assert.equal(latestPage.body.data.pagination.hasMore, true);
    assert.ok(latestPage.body.data.pagination.nextCursor);
    assert.equal(
      await Message.countDocuments({ receiver: sender._id, read: false }),
      0,
    );

    const olderPage = await request(app)
      .get(`/api/v1/messages/${receiver.id}`)
      .query({
        limit: 2,
        ...latestPage.body.data.pagination.nextCursor,
      })
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    assert.deepEqual(
      olderPage.body.data.messages.map((message) => message.content),
      ["Message 1", "Message 2"],
    );
    assert.equal(olderPage.body.data.pagination.hasMore, true);
  });

  await t.test("rejects invalid limits and malformed message cursors", async () => {
    await request(app)
      .get("/api/v1/messages")
      .query({ limit: 51 })
      .set("Authorization", `Bearer ${token}`)
      .expect(400);

    await request(app)
      .get("/api/v1/messages")
      .query({ limit: 10, beforeUserId: receiver.id })
      .set("Authorization", `Bearer ${token}`)
      .expect(400);

    await request(app)
      .get(`/api/v1/messages/${receiver.id}`)
      .query({ beforeId: "not-an-object-id" })
      .set("Authorization", `Bearer ${token}`)
      .expect(400);
  });
});
