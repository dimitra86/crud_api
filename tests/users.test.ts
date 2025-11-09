import request from "supertest";
import app from "../src/app";
import { db } from "../src/db/inMemoryDb";

beforeEach(async () => {
  await db.clear();
});

describe("Users API", () => {
  test("GET /api/users -> empty array", async () => {
    const res = await request(app).get("/api/users");
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  test("CRUD cycle", async () => {
    const createRes = await request(app)
      .post("/api/users")
      .send({ username: "Alice", age: 30, hobbies: ["reading"] });
    expect(createRes.status).toBe(201);
    const created = createRes.body;
    expect(created).toHaveProperty("id");
    const userId = created.id;

    const getRes = await request(app).get(`/api/users/${userId}`);
    expect(getRes.status).toBe(200);
    expect(getRes.body.id).toBe(userId);

    const putRes = await request(app)
      .put(`/api/users/${userId}`)
      .send({ username: "Alice Updated", age: 31, hobbies: [] });
    expect(putRes.status).toBe(200);
    expect(putRes.body.username).toBe("Alice Updated");
    expect(putRes.body.id).toBe(userId);

    const delRes = await request(app).delete(`/api/users/${userId}`);
    expect(delRes.status).toBe(204);

    const getDeleted = await request(app).get(`/api/users/${userId}`);
    expect(getDeleted.status).toBe(404);
  });

  test("Invalid UUID returns 400", async () => {
    const res = await request(app).get("/api/users/invalid-uuid");
    expect(res.status).toBe(400);
  });
});
