import request from "supertest";
import JWT from "jsonwebtoken";
import slugify from "slugify";
import app from "../server.js";
import { connectToTestDb, resetTestDb, disconnectFromTestDb } from "../tests/utils/db.js";
import userModel from "../models/userModel.js";
import categoryModel from "../models/categoryModel.js";
import { hashPassword } from "../helpers/authHelper.js";

jest.setTimeout(30000);

const issueToken = (userId) =>
  JWT.sign({ _id: userId }, process.env.JWT_SECRET || "test-secret-key", {
    expiresIn: "1h",
  });

let adminUser;
let normalUser;
let adminToken;
let userToken;

beforeAll(async () => {
  await connectToTestDb("admin-category-integration");
  await Promise.all([userModel.deleteMany({}), categoryModel.deleteMany({})]);
});

afterAll(async () => {
  await Promise.all([userModel.deleteMany({}), categoryModel.deleteMany({})]);
  await disconnectFromTestDb();
});

beforeEach(async () => {
  (await resetTestDb?.()) || (await Promise.all([userModel.deleteMany({}), categoryModel.deleteMany({})]));

  const adminPass = "AdminPass123!";
  const userPass = "UserPass123!";

  adminUser = await userModel.create({
    name: "Admin User",
    email: "admin_category@example.com",
    password: await hashPassword(adminPass),
    phone: "555-1000",
    address: "1 Admin Way",
    answer: "blue",
    role: 1,
  });

  normalUser = await userModel.create({
    name: "Normal User",
    email: "user_category@example.com",
    password: await hashPassword(userPass),
    phone: "555-1001",
    address: "2 User Lane",
    answer: "red",
    role: 0,
  });

  adminToken = issueToken(adminUser._id);
  userToken = issueToken(normalUser._id);
});

afterEach(() => jest.clearAllMocks());

describe("Category routes — admin protection", () => {
  test("public GET /api/v1/category/get-category works without auth", async () => {
    // seed one category
    await categoryModel.create({ name: "Gadgets", slug: slugify("Gadgets") });

    const res = await request(app).get("/api/v1/category/get-category");
    expect(res.status).toBe(200);
    expect(res.body?.success).toBe(true);
    expect(Array.isArray(res.body?.category)).toBe(true);
    expect(res.body.category.length).toBeGreaterThanOrEqual(1);
  });

  test("POST /api/v1/category/create-category requires auth (401)", async () => {
    const res = await request(app)
      .post("/api/v1/category/create-category")
      .send({ name: "Electronics" });
    expect(res.status).toBe(401);
  });

  test("POST /api/v1/category/create-category forbids non-admin (403)", async () => {
    const res = await request(app)
      .post("/api/v1/category/create-category")
      .set("Authorization", userToken)
      .send({ name: "Home" });
    expect(res.status).toBe(403);
    expect(String(res.body?.message || "")).toMatch(/admin|insufficient/i);
  });

  test("POST /api/v1/category/create-category allows admin (201)", async () => {
    const res = await request(app)
      .post("/api/v1/category/create-category")
      .set("Authorization", adminToken)
      .send({ name: "Toys" });
    expect(res.status).toBe(201);
    expect(res.body?.success).toBe(true);
    expect(res.body?.category?.name).toBe("Toys");
  });

  test("PUT /api/v1/category/update-category/:id enforces admin and updates", async () => {
    const cat = await categoryModel.create({ name: "Cloth", slug: slugify("Cloth") });

    // non-admin forbidden
    const nonAdminRes = await request(app)
      .put(`/api/v1/category/update-category/${cat._id}`)
      .set("Authorization", userToken)
      .send({ name: "Clothing" });
    expect(nonAdminRes.status).toBe(403);

    // admin allowed
    const adminRes = await request(app)
      .put(`/api/v1/category/update-category/${cat._id}`)
      .set("Authorization", adminToken)
      .send({ name: "Clothing" });
    expect(adminRes.status).toBe(200);
    expect(adminRes.body?.success).toBe(true);
    expect(adminRes.body?.category?.name).toBe("Clothing");
  });

  test("DELETE /api/v1/category/delete-category/:id enforces admin and deletes", async () => {
    const cat = await categoryModel.create({ name: "Old", slug: slugify("Old") });

    // non-admin forbidden
    const nonAdminRes = await request(app)
      .delete(`/api/v1/category/delete-category/${cat._id}`)
      .set("Authorization", userToken);
    expect(nonAdminRes.status).toBe(403);

    // admin allowed
    const adminRes = await request(app)
      .delete(`/api/v1/category/delete-category/${cat._id}`)
      .set("Authorization", adminToken);
    expect(adminRes.status).toBe(200);
    expect(adminRes.body?.success).toBe(true);

    // verify gone
    const exists = await categoryModel.findById(cat._id);
    expect(exists).toBeNull();
  });
});

