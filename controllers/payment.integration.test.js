// AI Attribution: Test generated with GPT assistance for boilerplate setup. Test cases are further refined and modified by @ruth-lim
/**
 * =====================================================================================================
 * Integration Test for Braintree Payment Flow
 * -----------------------------------------------------------------------------------------------------
 * Covers:
 *   - Express routing & middleware
 *   - controllers/productController.js (braintreeTokenController, braintreePaymentController)
 *   - Authentication via JWT
 *   - Models (User, Product, Order, Category)
 **/

import request from "supertest";
import JWT from "jsonwebtoken";
import slugify from "slugify";
import {
  connectToTestDb,
  resetTestDb,
  disconnectFromTestDb,
} from "../tests/utils/db.js";
import app from "../server.js";
import orderModel from "../models/orderModel.js";
import userModel from "../models/userModel.js";
import productModel from "../models/productModel.js";
import categoryModel from "../models/categoryModel.js";

jest.setTimeout(30000);

const issueToken = (userId) =>
  JWT.sign({ _id: userId }, process.env.JWT_SECRET || "test-secret-key", {
    expiresIn: "1h",
  });

let testUser;
let userAuthToken;
let productCatalog;
let shoppingCart;
let testCategory;

beforeAll(async () => {
  await connectToTestDb("payment-integration-tests");

  // Clear existing test data
  await Promise.all([
    orderModel.deleteMany({}),
    productModel.deleteMany({}),
    categoryModel.deleteMany({}),
    userModel.deleteMany({}),
  ]);

  testCategory = await categoryModel.create({
    name: "Electronics",
    slug: slugify("Electronics"),
  });

  const productDefinitions = [
    {
      name: "Wireless Headphones",
      description: "Premium noise-cancelling headphones",
      price: 299.99,
      quantity: 50,
      category: testCategory._id,
      slug: slugify("Wireless Headphones"),
      shipping: true,
    },
    {
      name: "Smart Watch",
      description: "Fitness tracking smartwatch",
      price: 199.5,
      quantity: 30,
      category: testCategory._id,
      slug: slugify("Smart Watch"),
      shipping: true,
    },
    {
      name: "USB Cable",
      description: "High-speed USB-C cable",
      price: 15.0,
      quantity: 100,
      category: testCategory._id,
      slug: slugify("USB Cable"),
      shipping: false,
    },
  ];

  productCatalog = await productModel.insertMany(productDefinitions);
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
  (await resetTestDb?.()) ||
    (await Promise.all([orderModel.deleteMany({}), userModel.deleteMany({})]));

  testUser = await userModel.create({
    name: "Test Customer",
    email: `customer_${Date.now()}@test.com`,
    password: "SecurePass123!",
    phone: "555-0100",
    address: "123 Test Street, Test City",
    answer: "test-security-answer",
    role: 0,
  });

  // Generate authentication token
  userAuthToken = issueToken(testUser._id);

  shoppingCart = [productCatalog[0], productCatalog[1]];
});

afterEach(async () => {
  jest.clearAllMocks();
});

// Test suite 1: Braintree Token Generation
describe("Braintree Token Generation - Integration Tests", () => {
  it("should generate client token for authenticated users", async () => {
    const response = await request(app)
      .get("/api/v1/product/braintree/token")
      .set("Authorization", userAuthToken);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      success: true,
      clientToken: expect.any(String),
    });
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });

  it("should deny token generation for unauthenticated requests", async () => {
    const response = await request(app).get("/api/v1/product/braintree/token");

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });
});

// Test suite 2: Braintree Payment Processing
describe("Payment Processing - Integration Tests", () => {
  let initialOrderCount;

  beforeEach(async () => {
    initialOrderCount = await orderModel.countDocuments();
  });

  it("should complete payment transaction and persist order successfully", async () => {
    const expectedAmount = "499.49";
    const paymentRequest = {
      nonce: "fake-valid-visa-nonce",
      cart: shoppingCart,
    };

    const response = await request(app)
      .post("/api/v1/product/braintree/payment")
      .set("Authorization", userAuthToken)
      .send(paymentRequest);

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      success: true,
    });

    const currentOrderCount = await orderModel.countDocuments();
    expect(currentOrderCount).toBe(initialOrderCount + 1);

    const latestOrder = await orderModel
      .findOne({ buyer: testUser._id })
      .sort({ createdAt: -1 });

    expect(latestOrder).toBeTruthy();
    expect(latestOrder.products).toHaveLength(2);
    expect(latestOrder.buyer.toString()).toBe(testUser._id.toString());
    expect(latestOrder.payment).toMatchObject({
      success: true,
      transaction: {
        amount: expectedAmount,
        status: expect.any(String),
      },
    });
    expect(latestOrder.status).toBe("Not Processed");
  });

  it("should block payment processing for unauthenticated users", async () => {
    const paymentRequest = {
      nonce: "fake-valid-visa-nonce",
      cart: shoppingCart,
    };

    const response = await request(app)
      .post("/api/v1/product/braintree/payment")
      .send(paymentRequest);

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);

    // Ensure no order was created
    const orderCount = await orderModel.countDocuments();
    expect(orderCount).toBe(initialOrderCount);
  });

  it("should reject payment with missing nonce", async () => {
    const paymentRequest = {
      cart: shoppingCart,
      // nonce intentionally omitted
    };

    const response = await request(app)
      .post("/api/v1/product/braintree/payment")
      .set("Authorization", userAuthToken)
      .send(paymentRequest);

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      success: false,
      message: expect.stringContaining("nonce"),
    });
  });

  it("should reject payment when shopping cart is empty", async () => {
    const paymentRequest = {
      nonce: "fake-valid-visa-nonce",
      cart: [],
    };

    const response = await request(app)
      .post("/api/v1/product/braintree/payment")
      .set("Authorization", userAuthToken)
      .send(paymentRequest);

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      success: false,
      message: expect.stringContaining("Cart"),
    });

    // Verify no order was created
    const orderCount = await orderModel.countDocuments();
    expect(orderCount).toBe(initialOrderCount);
  });

  it("should reject items with invalid pricing", async () => {
    const invalidCart = [
      { price: 99.99, name: "Valid Product" },
      { price: -50, name: "Negative Price Product" },
      { price: "not_a_number", name: "Invalid Price Product" },
    ];

    const paymentRequest = {
      nonce: "fake-valid-visa-nonce",
      cart: invalidCart,
    };

    const response = await request(app)
      .post("/api/v1/product/braintree/payment")
      .set("Authorization", userAuthToken)
      .send(paymentRequest);

    expect(response.status).toBe(422);
    expect(response.body).toMatchObject({
      success: false,
      message: expect.stringContaining("price"),
    });
  });

  it("should process concurrent payments independently", async () => {
    // Create second user for concurrent test
    const secondUser = await userModel.create({
      name: "Concurrent User",
      email: `concurrent_${Date.now()}@test.com`,
      password: "Password123!",
      phone: "555-0200",
      address: "456 Parallel Street",
      answer: "security",
      role: 0,
    });

    const secondUserToken = JWT.sign(
      { _id: secondUser._id },
      process.env.JWT_SECRET || "test-secret-key"
    );

    // Different carts for each user
    const cart1 = [productCatalog[0]]; // $299.99
    const cart2 = [productCatalog[1], productCatalog[2]]; // $199.50 + $15.00

    // Execute concurrent payment requests
    const [response1, response2] = await Promise.all([
      request(app)
        .post("/api/v1/product/braintree/payment")
        .set("Authorization", userAuthToken)
        .send({ nonce: "fake-valid-visa-nonce", cart: cart1 }),
      request(app)
        .post("/api/v1/product/braintree/payment")
        .set("Authorization", secondUserToken)
        .send({ nonce: "fake-valid-mastercard-nonce", cart: cart2 }),
    ]);

    expect(response1.status).toBe(201);
    expect(response2.status).toBe(201);

    // Verify both orders exist independently
    const user1Order = await orderModel.findOne({ buyer: testUser._id });
    const user2Order = await orderModel.findOne({ buyer: secondUser._id });

    expect(user1Order).toBeTruthy();
    expect(user1Order.products).toHaveLength(1);
    expect(user1Order.payment.transaction.amount).toBe("299.99");

    expect(user2Order).toBeTruthy();
    expect(user2Order.products).toHaveLength(2);
    expect(user2Order.payment.transaction.amount).toBe("214.50");

    // Cleanup second user
    await userModel.deleteOne({ _id: secondUser._id });
  });
});
