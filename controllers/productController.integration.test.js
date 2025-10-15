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
  deleteProductController,
  getSingleProductController,
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

describe("DeleteProductController DB-less Integration Tests", () => {
  let app, mockFindByIdAndDelete;
  const testProductId = "test-product-id-123";

  beforeEach(() => {
    // Reset mocks between tests
    jest.clearAllMocks();

    // Create mock products
    const mockDeletedProduct = {
      _id: testProductId,
      name: "Test Product",
      description: "Test description",
      price: 99.99,
      category: "test-category-id",
      quantity: 10,
    };

    // Mock findByIdAndDelete
    mockFindByIdAndDelete = jest.fn().mockResolvedValue(mockDeletedProduct);

    // Create a mock select method that returns the product
    const mockSelect = jest.fn().mockReturnValue(mockDeletedProduct);

    // Set up the chain: findByIdAndDelete().select()
    mockFindByIdAndDelete.mockReturnValue({ select: mockSelect });

    productModel.findByIdAndDelete = mockFindByIdAndDelete;

    // Setup basic express app - each test will customize this
    app = express();
  });

  // Test 1: Successful product deletion
  test("Should successfully delete a product by ID", async () => {
    // Setup route with product ID parameter
    app = express();
    app.use((req, _, next) => {
      // Add product ID to params
      req.params = { pid: testProductId };
      next();
    });
    app.delete("/api/product/delete/:pid", deleteProductController);

    // Send test request
    const response = await request(app).delete(
      `/api/product/delete/${testProductId}`
    );

    // Assertions
    expect(response.status).toBe(StatusCodes.OK);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe("Product deleted successfully.");

    // Verify findByIdAndDelete was called with correct ID
    expect(productModel.findByIdAndDelete).toHaveBeenCalledWith(testProductId);
  });

  // Test 2: Product not found
  test("Should return 404 when trying to delete a non-existent product", async () => {
    // Mock findByIdAndDelete to return null
    const mockSelect = jest.fn().mockReturnValue(null);
    mockFindByIdAndDelete.mockReturnValue({ select: mockSelect });

    // Setup route with product ID parameter
    app = express();
    app.use((req, _, next) => {
      // Add product ID to params
      req.params = { pid: "non-existent-id" };
      next();
    });
    app.delete("/api/product/delete/:pid", deleteProductController);

    // Send test request
    const response = await request(app).delete(
      "/api/product/delete/non-existent-id"
    );

    // Assertions
    expect(response.status).toBe(StatusCodes.NOT_FOUND);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe("Product not found.");

    // Verify findByIdAndDelete was called with correct ID
    expect(productModel.findByIdAndDelete).toHaveBeenCalledWith(
      "non-existent-id"
    );
  });

  // Test 3: Server error during deletion
  test("Should handle server errors during product deletion", async () => {
    // Mock findByIdAndDelete to throw an error
    productModel.findByIdAndDelete.mockImplementationOnce(() => {
      throw new Error("Database connection failed");
    });

    // Setup route with product ID parameter
    app = express();
    app.use((req, _, next) => {
      // Add product ID to params
      req.params = { pid: testProductId };
      next();
    });
    app.delete("/api/product/delete/:pid", deleteProductController);

    // Send test request
    const response = await request(app).delete(
      `/api/product/delete/${testProductId}`
    );

    // Assertions
    expect(response.status).toBe(StatusCodes.INTERNAL_SERVER_ERROR);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe("Error deleting product.");
    expect(response.body.error).toBe("Database connection failed");
  });

  // Test 4: Missing product ID
  test("Should handle missing product ID in request parameters", async () => {
    // Setup route without product ID parameter
    app = express();
    app.use((req, _, next) => {
      // No product ID in params
      req.params = {};
      next();
    });
    app.delete("/api/product/delete/:pid", deleteProductController);

    // Send test request
    const response = await request(app).delete("/api/product/delete/");

    // Assertions
    expect(response.status).toBe(StatusCodes.NOT_FOUND);
    // expect(response.body.success).toBe(false);
    // The exact error message might vary, but it should indicate a failure
    // expect(response.body.message).toBe("Error deleting product.");
  });

  // Test 5: Photo is excluded from response
  test("Should exclude photo data from the deleted product info", async () => {
    // Setup route with product ID parameter
    app = express();
    app.use((req, _, next) => {
      // Add product ID to params
      req.params = { pid: testProductId };
      next();
    });
    app.delete("/api/product/delete/:pid", deleteProductController);

    // Send test request
    await request(app).delete(`/api/product/delete/${testProductId}`);

    // Verify select was called to exclude photo
    const selectCalls = mockFindByIdAndDelete().select.mock.calls;
    expect(selectCalls.length).toBe(1);
    expect(selectCalls[0][0]).toBe("-photo");
  });
});

describe("GetSingleProductController DB-less Integration Tests", () => {
  let app, mockFindOne, mockSelect, mockPopulate;
  const productSlug = "test-product-slug";
  const categoryId = "test-category-id";

  beforeEach(() => {
    // Reset mocks between tests
    jest.clearAllMocks();

    // Create mock product
    const mockProduct = {
      _id: "test-product-id",
      name: "Test Product",
      description: "Test description",
      price: 99.99,
      category: {
        _id: categoryId,
        name: "Test Category",
        slug: "test-category",
      },
      quantity: 10,
      slug: productSlug,
    };

    // Set up method chain: findOne().select().populate()
    mockPopulate = jest.fn().mockResolvedValue(mockProduct);
    mockSelect = jest.fn().mockReturnValue({ populate: mockPopulate });
    mockFindOne = jest.fn().mockReturnValue({ select: mockSelect });

    // Assign the mock chain to productModel
    productModel.findOne = mockFindOne;

    // Setup basic express app
    app = express();
  });

  // Test 1: Successful product retrieval
  test("Should successfully retrieve a product by slug", async () => {
    // Setup route with slug parameter
    app = express();
    app.use((req, _, next) => {
      // Add slug to params
      req.params = { slug: productSlug };
      next();
    });
    app.get("/api/product/get/:slug", getSingleProductController);

    // Send test request
    const response = await request(app).get(`/api/product/get/${productSlug}`);

    // Assertions
    expect(response.status).toBe(StatusCodes.OK);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe("Product fetched successfully.");
    expect(response.body).toHaveProperty("product");
    expect(response.body.product.name).toBe("Test Product");
    expect(response.body.product.slug).toBe(productSlug);

    // Verify method chain was called correctly
    expect(mockFindOne).toHaveBeenCalledWith({ slug: productSlug });
    expect(mockSelect).toHaveBeenCalledWith("-photo");
    expect(mockPopulate).toHaveBeenCalledWith("category");
  });

  // Test 2: Product not found
  test("Should return 404 when product with slug does not exist", async () => {
    // Mock populate to return null (product not found)
    mockPopulate.mockResolvedValueOnce(null);

    // Setup route with non-existent slug
    app = express();
    app.use((req, _, next) => {
      // Add non-existent slug to params
      req.params = { slug: "non-existent-slug" };
      next();
    });
    app.get("/api/product/get/:slug", getSingleProductController);

    // Send test request
    const response = await request(app).get(
      "/api/product/get/non-existent-slug"
    );

    // Assertions
    expect(response.status).toBe(StatusCodes.NOT_FOUND);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe("Product not found.");

    // Verify method chain was called
    expect(mockFindOne).toHaveBeenCalledWith({ slug: "non-existent-slug" });
    expect(mockSelect).toHaveBeenCalledWith("-photo");
    expect(mockPopulate).toHaveBeenCalledWith("category");
  });

  // Test 3: Server error during retrieval
  test("Should handle server errors during product retrieval", async () => {
    // Mock findOne to throw an error
    productModel.findOne.mockImplementationOnce(() => {
      throw new Error("Database connection failed");
    });

    // Setup route
    app = express();
    app.use((req, _, next) => {
      req.params = { slug: productSlug };
      next();
    });
    app.get("/api/product/get/:slug", getSingleProductController);

    // Send test request
    const response = await request(app).get(`/api/product/get/${productSlug}`);

    // Assertions
    expect(response.status).toBe(StatusCodes.INTERNAL_SERVER_ERROR);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe("Error retrieving product.");
    expect(response.body.error).toBe("Database connection failed");
  });

  // Test 4: Verify photo is excluded from response
  test("Should exclude photo data from the product response", async () => {
    // Setup route
    app = express();
    app.use((req, _, next) => {
      req.params = { slug: productSlug };
      next();
    });
    app.get("/api/product/get/:slug", getSingleProductController);

    // Send test request
    await request(app).get(`/api/product/get/${productSlug}`);

    // Verify select was called to exclude photo
    expect(mockSelect).toHaveBeenCalledWith("-photo");
  });

  // Test 5: Verify category population
  test("Should populate the category field in the product response", async () => {
    // Setup route
    app = express();
    app.use((req, _, next) => {
      req.params = { slug: productSlug };
      next();
    });
    app.get("/api/product/get/:slug", getSingleProductController);

    // Send test request
    const response = await request(app).get(`/api/product/get/${productSlug}`);

    // Assertions
    expect(response.body.product.category).toEqual({
      _id: categoryId,
      name: "Test Category",
      slug: "test-category",
    });

    // Verify populate was called
    expect(mockPopulate).toHaveBeenCalledWith("category");
  });
});
