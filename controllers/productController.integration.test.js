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
import {
  createProductController,
  updateProductController,
} from "../controllers/productController.js";

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

describe("UpdateProductController DB-less Integration Tests", () => {
  let app, mockSave, mockProduct, mockFindByIdAndUpdate;
  const testImagePath = path.join(__dirname, "../__mocks__/test-image.jpg");
  const testProductId = "test-product-id-123";

  beforeEach(() => {
    // Reset mocks between tests
    jest.clearAllMocks();

    // Setup mock product instance and save method
    mockSave = jest.fn().mockResolvedValue();

    mockProduct = {
      _id: testProductId,
      name: "Original Product Name",
      description: "Original description",
      price: 99.99,
      category: "original-category-id",
      quantity: 10,
      shipping: true,
      slug: "original-product-name",
      photo: {
        data: Buffer.from("original image data"),
        contentType: "image/jpeg",
      },
      save: mockSave,
    };

    // Mock findByIdAndUpdate to return our mock product
    mockFindByIdAndUpdate = jest.fn().mockResolvedValue(mockProduct);
    productModel.findByIdAndUpdate = mockFindByIdAndUpdate;

    // Mock fs.readFileSync
    fs.readFileSync.mockImplementation(() => Buffer.from("updated image data"));

    // Setup basic express app - each test will customize this
    app = express();
  });

  // Test 1: Successful product update
  test("Should successfully update a product with valid fields and photo", async () => {
    // Setup route with product ID parameter
    app = express();
    app.use((req, _, next) => {
      // Add product ID to params
      req.params = { pid: testProductId };

      // Simulate formidable parsing
      req.fields = {
        name: "Updated Product Name",
        description: "Updated description",
        price: "149.99",
        category: "updated-category-id",
        quantity: "15",
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
    app.put("/api/product/update/:pid", updateProductController);

    // Send test request
    const response = await request(app).put(
      `/api/product/update/${testProductId}`
    );

    // Assertions
    expect(response.status).toBe(StatusCodes.CREATED);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe("Product updated successfully.");
    expect(response.body).toHaveProperty("products");

    // Verify findByIdAndUpdate was called with correct parameters
    expect(productModel.findByIdAndUpdate).toHaveBeenCalledWith(
      testProductId,
      {
        name: "Updated Product Name",
        description: "Updated description",
        price: "149.99",
        category: "updated-category-id",
        quantity: "15",
        shipping: "true",
        slug: "Updated-Product-Name", // Generated from the name
      },
      { new: true }
    );

    // Verify photo was updated
    expect(fs.readFileSync).toHaveBeenCalledWith(testImagePath);
    expect(mockProduct.photo.data).toEqual(Buffer.from("updated image data"));
    expect(mockProduct.photo.contentType).toBe("image/jpeg");

    // Verify save was called
    expect(mockSave).toHaveBeenCalledTimes(1);
  });

  // Test 2: Update without photo
  test("Should update product successfully without changing the photo", async () => {
    // Setup route with product ID parameter
    app = express();
    app.use((req, _, next) => {
      // Add product ID to params
      req.params = { pid: testProductId };

      // Simulate formidable parsing - no photo
      req.fields = {
        name: "Updated No Photo",
        description: "Updated description without changing photo",
        price: "129.99",
        category: "updated-category-id",
        quantity: "8",
        shipping: "false",
      };

      req.files = {}; // No photo provided
      next();
    });
    app.put("/api/product/update/:pid", updateProductController);

    // Send test request without photo
    const response = await request(app).put(
      `/api/product/update/${testProductId}`
    );

    // Assertions
    expect(response.status).toBe(StatusCodes.CREATED);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe("Product updated successfully.");

    // Verify findByIdAndUpdate was called with correct parameters
    expect(productModel.findByIdAndUpdate).toHaveBeenCalledWith(
      testProductId,
      {
        name: "Updated No Photo",
        description: "Updated description without changing photo",
        price: "129.99",
        category: "updated-category-id",
        quantity: "8",
        shipping: "false",
        slug: "Updated-No-Photo",
      },
      { new: true }
    );

    // Verify photo was NOT read/updated
    expect(fs.readFileSync).not.toHaveBeenCalled();

    // Verify save was still called (for other updates)
    expect(mockSave).toHaveBeenCalledTimes(1);
  });

  // Test 3: Missing required fields
  test("Should reject update with missing required fields", async () => {
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
        name: "Updated Product Name",
        description: "Updated product description",
        price: "119.99",
        category: "updated-category-id",
        quantity: "12",
        shipping: "true",
      };

      // Delete the field we want to test as missing
      delete fields[missingField];

      // Reset app with custom middleware for this test
      app = express();
      app.use((req, _, next) => {
        req.params = { pid: testProductId };
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
      app.put("/api/product/update/:pid", updateProductController);

      // Send request
      const response = await request(app).put(
        `/api/product/update/${testProductId}`
      );

      // Assertions for validation error
      expect(response.status).toBe(StatusCodes.BAD_REQUEST);
      expect(response.body).toHaveProperty("error");

      // Error message should mention the missing field
      const fieldName =
        missingField.charAt(0).toUpperCase() + missingField.slice(1);
      expect(response.body.error).toContain(`${fieldName} is required`);

      // Verify findByIdAndUpdate was not called
      expect(productModel.findByIdAndUpdate).not.toHaveBeenCalled();

      // Verify save was not called
      expect(mockSave).not.toHaveBeenCalled();

      // Reset mocks for next iteration
      jest.clearAllMocks();
    }
  });

  // Test 4: Oversized photo
  test("Should reject update with photo larger than 1MB", async () => {
    // Create large mock file (1.1MB)
    const largeFileSize = 1.1 * 1024 * 1024;

    // Reset app with custom middleware for this test
    app = express();
    app.use((req, _, next) => {
      req.params = { pid: testProductId };
      req.fields = {
        name: "Updated With Large Photo",
        description: "Updated description with too large photo",
        price: "99.99",
        category: "updated-category-id",
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
    app.put("/api/product/update/:pid", updateProductController);

    // Send test request with large photo
    const response = await request(app).put(
      `/api/product/update/${testProductId}`
    );

    // Assertions for file size error
    expect(response.status).toBe(StatusCodes.REQUEST_TOO_LONG);
    expect(response.body).toHaveProperty("error");
    expect(response.body.error).toContain("less than 1MB");

    // Verify findByIdAndUpdate was not called
    expect(productModel.findByIdAndUpdate).not.toHaveBeenCalled();

    // Verify save was not called
    expect(mockSave).not.toHaveBeenCalled();
  });

  // Test 5: Product not found
  test("Should handle case where product ID is not found", async () => {
    // Mock findByIdAndUpdate to return null (product not found)
    productModel.findByIdAndUpdate.mockResolvedValueOnce(null);

    // Setup the app with middleware
    app = express();
    app.use((req, _, next) => {
      req.params = { pid: "non-existent-id" };
      req.fields = {
        name: "Updated Non-Existent Product",
        description: "This should not update anything",
        price: "99.99",
        category: "category-id",
        quantity: "10",
        shipping: "true",
      };
      req.files = {};
      next();
    });
    app.put("/api/product/update/:pid", updateProductController);

    // Send test request
    const response = await request(app).put(
      "/api/product/update/non-existent-id"
    );

    // Since the controller doesn't have explicit handling for not found case,
    // it will likely result in an error trying to access properties of null
    expect(response.status).toBe(StatusCodes.INTERNAL_SERVER_ERROR);
    expect(response.body.success).toBe(false);

    // Verify findByIdAndUpdate was called but save was not
    expect(productModel.findByIdAndUpdate).toHaveBeenCalled();
    expect(mockSave).not.toHaveBeenCalled();
  });
});
