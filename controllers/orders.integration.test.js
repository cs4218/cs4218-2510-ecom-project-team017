/**
 * =====================================================================================================
 * Integration Test for Orders APIs
 * -----------------------------------------------------------------------------------------------------
 * Covers:
 *   - getOrdersController (User-specific orders)
 *   - getAllOrdersController (Admin-only: all users' orders)
 *   - orderStatusController (Admin-only: update order status)
 *   - Authentication via JWT
 *   - Models (User, Order, Product, Category)
 *
 * AI Attribution: Test generated with GPT assistance for boilerplate setup. Test cases are further refined and modified by @ruth-lim
 */

import request from "supertest";
import JWT from "jsonwebtoken";
import slugify from "slugify";
import app from "../server.js";
import {
  connectToTestDb,
  resetTestDb,
  disconnectFromTestDb,
} from "../tests/utils/db.js";
import userModel from "../models/userModel.js";
import orderModel from "../models/orderModel.js";
import productModel from "../models/productModel.js";
import categoryModel from "../models/categoryModel.js";

jest.setTimeout(30000);

const issueToken = (userId) =>
  JWT.sign({ _id: userId }, process.env.JWT_SECRET || "test-secret-key", {
    expiresIn: "1h",
  });

let adminUser, regularUser, secondUser;
let adminToken, userToken, secondToken;
let category, productA, productB, productC, order1, order2;

beforeAll(async () => {
  await connectToTestDb("orders-integration-tests");
});

afterAll(async () => {
  await Promise.all([
    orderModel.deleteMany({}),
    productModel.deleteMany({}),
    categoryModel.deleteMany({}),
    userModel.deleteMany({}),
  ]);
  await disconnectFromTestDb();
});

beforeEach(async () => {
  await (resetTestDb?.() ??
    Promise.all([
      orderModel.deleteMany({}),
      productModel.deleteMany({}),
      categoryModel.deleteMany({}),
      userModel.deleteMany({}),
    ]));

  // Seed users
  adminUser = await userModel.create({
    name: "Admin One",
    email: "admin@test.com",
    password: "AdminPass123!",
    phone: "99998888",
    address: "HQ",
    answer: "admin",
    role: 1,
  });

  regularUser = await userModel.create({
    name: "Alice Johnson",
    email: "alice@test.com",
    password: "AlicePass123!",
    phone: "5550100",
    address: "123 Main St",
    answer: "blue",
    role: 0,
  });

  secondUser = await userModel.create({
    name: "Bob Smith",
    email: "bob@test.com",
    password: "BobPass123!",
    phone: "5550200",
    address: "456 High St",
    answer: "dog",
    role: 0,
  });

  adminToken = issueToken(adminUser._id);
  userToken = issueToken(regularUser._id);
  secondToken = issueToken(secondUser._id);

  // Seed category and products
  category = await categoryModel.create({
    name: "Electronics",
    slug: slugify("Electronics"),
  });

  productA = await productModel.create({
    name: "Gaming Laptop",
    slug: slugify("Gaming Laptop"),
    description: "High-performance gaming laptop with RTX graphics",
    price: 2499,
    category: category._id,
    quantity: 10,
    shipping: true,
  });

  productB = await productModel.create({
    name: "Mechanical Keyboard",
    slug: slugify("Mechanical Keyboard"),
    description: "RGB mechanical keyboard with blue switches",
    price: 159,
    category: category._id,
    quantity: 15,
    shipping: false,
  });

  productC = await productModel.create({
    name: "Wireless Mouse",
    slug: slugify("Wireless Mouse"),
    description: "Ergonomic wireless mouse with long battery life",
    price: 89,
    category: category._id,
    quantity: 25,
    shipping: true,
  });

  // Sample orders
  order1 = await orderModel.create({
    products: [productA._id, productB._id],
    payment: { success: true, transactionId: "TXN-001" },
    buyer: regularUser._id,
    status: "Not Processed",
  });

  order2 = await orderModel.create({
    products: [productC._id],
    payment: { success: true, transactionId: "TXN-002" },
    buyer: secondUser._id,
    status: "Shipped",
  });
});

afterEach(() => jest.clearAllMocks());

// Test suite 1
describe("Integration test for User Orders)", () => {
  it("should only return the orders belonging to the authenticated user", async () => {
    const response = await request(app)
      .get("/api/v1/auth/orders")
      .set("Authorization", userToken);

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBe(1);
    expect(response.body[0].buyer.name).toBe("Alice Johnson");
    expect(response.body[0].status).toBe("Not Processed");
  });

  it("returns an empty array when the user has no orders", async () => {
    const newUser = await userModel.create({
      name: "No Orders User",
      email: "noorders@test.com",
      password: "123456",
      phone: "12345",
      address: "Nowhere",
      answer: "none",
      role: 0,
    });

    const newToken = issueToken(newUser._id);
    const response = await request(app)
      .get("/api/v1/auth/orders")
      .set("Authorization", newToken);

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBe(0);
  });

  it("rejects unauthenticated requests with 401 Unauthorized", async () => {
    const response = await request(app).get("/api/v1/auth/orders");
    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });

  it("populates product details in each returned order", async () => {
    const response = await request(app)
      .get("/api/v1/auth/orders")
      .set("Authorization", userToken);

    expect(response.status).toBe(200);
    const order = response.body[0];
    expect(order.products.length).toBe(2);
    expect(order.products[0].name).toBeDefined();
    expect(order.products[1].price).toBeDefined();
  });
});

// Test suite 2
describe("Integration test for All Orders", () => {
  it("returns all orders for an admin", async () => {
    const response = await request(app)
      .get("/api/v1/auth/all-orders")
      .set("Authorization", adminToken);

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBeGreaterThanOrEqual(2);

    const buyers = response.body.map((o) => o.buyer?.name).filter(Boolean);
    expect(buyers).toEqual(
      expect.arrayContaining(["Alice Johnson", "Bob Smith"])
    );
  });

  it("returns 403 Forbidden for non-admin users", async () => {
    const response = await request(app)
      .get("/api/v1/auth/all-orders")
      .set("Authorization", userToken);

    expect(response.status).toBe(403);
  });

  it("returns 401 Unauthorized when no token is provided", async () => {
    const response = await request(app).get("/api/v1/auth/all-orders");
    expect(response.status).toBe(401);
  });
});

// Test suite 3
describe("Integration test for Order Status Update", () => {
  it("updates an order's status when requested by an admin (200)", async () => {
    const response = await request(app)
      .put(`/api/v1/auth/order-status/${order1._id}`)
      .set("Authorization", adminToken)
      .send({ status: "Processing" });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.order).toBeTruthy();
    expect(response.body.order.status).toBe("Processing");

    const updated = await orderModel.findById(order1._id);
    expect(updated.status).toBe("Processing");
  });

  it("rejects invalid status values with 400", async () => {
    const response = await request(app)
      .put(`/api/v1/auth/order-status/${order1._id}`)
      .set("Authorization", adminToken)
      .send({ status: "INVALID_STATUS" });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(String(response.body.error || response.body.message)).toMatch(
      /Status must be one of: Not Processed, Processing, Shipped, Delivered, Cancelled/i
    );
  });

  it("returns 500 on malformed orderId (CastError path)", async () => {
    const response = await request(app)
      .put(`/api/v1/auth/order-status/not-a-valid-id`)
      .set("Authorization", adminToken)
      .send({ status: "Delivered" });

    expect(response.status).toBe(500);
    expect(response.body.success).toBe(false);
  });

  it("returns 403 for non-admin users", async () => {
    const response = await request(app)
      .put(`/api/v1/auth/order-status/${order2._id}`)
      .set("Authorization", userToken)
      .send({ status: "Delivered" });

    expect(response.status).toBe(403);
  });

  it("returns 401 when no token is provided", async () => {
    const response = await request(app)
      .put(`/api/v1/auth/order-status/${order2._id}`)
      .send({ status: "Delivered" });

    expect(response.status).toBe(401);
  });
});
