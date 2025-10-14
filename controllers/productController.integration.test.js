import request from "supertest";
import express from "express";
import fs from "fs";
import path from "path";
// import slugify from "slugify";
import { StatusCodes } from "http-status-codes";
import productModel from "../models/productModel.js";

// Mock dependencies before importing the controller
jest.mock("../models/productModel.js");
jest.mock("fs");
jest.mock("braintree", () => {
  return {
    BraintreeGateway: jest.fn().mockImplementation(() => ({
      clientToken: {
        generate: jest
          .fn()
          .mockImplementation((_, callback) =>
            callback(null, { clientToken: "mock-client-token" })
          ),
      },
      transaction: {
        sale: jest
          .fn()
          .mockImplementation((_, callback) =>
            callback(null, { success: true })
          ),
      },
    })),
    Environment: { Sandbox: "sandbox" },
  };
});

// Now import the controller after mocking
import { createProductController } from "../controllers/productController.js";

describe("CreateProductController DB-less Integration Tests", () => {
  let app, mockSave, mockProduct;
  const testImagePath = path.join(__dirname, "../__mocks__/test-image.jpg");

  beforeEach(() => {
    // Reset mocks between tests
    jest.clearAllMocks();

    // Setup mock product instance and save method
    mockSave = jest.fn().mockResolvedValue();

    mockProduct = {
      _id: "mock-product-id",
      name: "",
      description: "",
      price: 0,
      category: "",
      quantity: 0,
      shipping: false,
      slug: "",
      photo: {
        data: Buffer.from([]),
        contentType: "",
      },
      save: mockSave,
    };

    // Mock the Product constructor
    productModel.mockImplementation(function (data) {
      mockProduct.name = data.name || "";
      mockProduct.description = data.description || "";
      mockProduct.price = data.price || 0;
      mockProduct.category = data.category || "";
      mockProduct.quantity = data.quantity || 0;
      mockProduct.shipping = data.shipping === "true" || false;
      mockProduct.slug = data.slug || "";
      return mockProduct;
    });

    // Mock fs.readFileSync
    fs.readFileSync.mockImplementation(() => Buffer.from("mock image data"));

    // Setup basic express app - each test will customize this
    app = express();
  });

  // Test 1: Successful product creation
  test("Should successfully create a product with valid fields and small photo", async () => {
    // Override the formidable middleware for this test
    app = express();
    app.use((req, _, next) => {
      // Simulate formidable parsing
      req.fields = {
        name: "Test Product",
        description: "Test product description",
        price: "99.99",
        category: "mock-category-id",
        quantity: "10",
        shipping: "true",
      };

      req.files = {
        photo: {
          size: 500000, // 500KB
          path: testImagePath,
          type: "image/jpeg",
        },
      };
      next();
    });
    app.post("/api/product/create", createProductController);

    // Send test request
    const response = await request(app).post("/api/product/create");

    // Assertions
    expect(response.status).toBe(StatusCodes.CREATED);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe("Product created successfully.");
    expect(response.body).toHaveProperty("products");

    // Verify Product constructor was called with correct data
    expect(productModel).toHaveBeenCalledWith({
      name: "Test Product",
      description: "Test product description",
      price: "99.99",
      category: "mock-category-id",
      quantity: "10",
      shipping: "true",
      slug: "Test-Product", // Slug should be generated from name
    });

    // Verify save was called
    expect(mockSave).toHaveBeenCalledTimes(1);

    // Verify photo handling
    expect(mockProduct.photo).toBeDefined();
    expect(mockProduct.photo.contentType).toBe("image/jpeg");
  });

  // Test 2: Missing required fields
  test("Should reject product with missing required fields", async () => {
    const requiredFields = [
      "name",
      "description",
      "price",
      "category",
      "quantity",
    ];

    for (const missingField of requiredFields) {
      // Create data with all fields except the one being tested
      const fields = {
        name: "Test Product",
        description: "Test product description",
        price: "99.99",
        category: "mock-category-id",
        quantity: "10",
        shipping: "true",
      };

      // Delete the field we want to test as missing
      delete fields[missingField];

      // Reset app with custom middleware for this test
      app = express();
      app.use((req, _, next) => {
        req.fields = fields;
        req.files = {
          photo: {
            size: 500000, // 500KB
            path: testImagePath,
            type: "image/jpeg",
          },
        };
        next();
      });
      app.post("/api/product/create", createProductController);

      // Send request
      const response = await request(app).post("/api/product/create");

      // Assertions for validation error
      expect(response.status).toBe(StatusCodes.BAD_REQUEST);
      expect(response.body).toHaveProperty("error");

      // Error message should mention the missing field
      const fieldName =
        missingField.charAt(0).toUpperCase() + missingField.slice(1);
      expect(response.body.error).toContain(`${fieldName} is required`);

      // Verify save was not called
      expect(mockSave).not.toHaveBeenCalled();
    }
  });

  // Test 3: Oversized photo
  test("Should reject product with photo larger than 1MB", async () => {
    // Create large mock file (1.1MB)
    const largeFileSize = 1.1 * 1024 * 1024;

    // Reset app with custom middleware for this test
    app = express();
    app.use((req, _, next) => {
      req.fields = {
        name: "Test Product",
        description: "Test product description",
        price: "99.99",
        category: "mock-category-id",
        quantity: "10",
        shipping: "true",
      };
      req.files = {
        photo: {
          size: largeFileSize, // 1.1MB - over the limit
          path: testImagePath,
          type: "image/jpeg",
        },
      };
      next();
    });
    app.post("/api/product/create", createProductController);

    // Send test request with large photo
    const response = await request(app).post("/api/product/create");

    // Assertions for file size error
    expect(response.status).toBe(StatusCodes.REQUEST_TOO_LONG);
    expect(response.body).toHaveProperty("error");
    expect(response.body.error).toContain("less than 1MB");

    // Verify save was not called
    expect(mockSave).not.toHaveBeenCalled();
  });

  // Test 4: Product creation without photo
  test("Should create product successfully without photo", async () => {
    // Reset app with custom middleware for this test - no photo
    app = express();
    app.use((req, _, next) => {
      req.fields = {
        name: "Test Product No Photo",
        description: "Test product description without photo",
        price: "79.99",
        category: "mock-category-id",
        quantity: "5",
        shipping: "true",
      };
      req.files = {}; // No photo
      next();
    });
    app.post("/api/product/create", createProductController);

    // Send test request without photo
    const response = await request(app).post("/api/product/create");

    // Assertions for successful creation
    expect(response.status).toBe(StatusCodes.CREATED);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe("Product created successfully.");
    expect(response.body).toHaveProperty("products");

    // Verify Product constructor was called with correct data
    expect(productModel).toHaveBeenCalledWith({
      name: "Test Product No Photo",
      description: "Test product description without photo",
      price: "79.99",
      category: "mock-category-id",
      quantity: "5",
      shipping: "true",
      slug: "Test-Product-No-Photo",
    });

    // Verify save was called
    expect(mockSave).toHaveBeenCalledTimes(1);

    // Verify photo was not processed since none was provided
    expect(fs.readFileSync).not.toHaveBeenCalled();
  });
});
