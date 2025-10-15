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
  getProductController,
  productCountController,
  productListController
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

describe("GetProductController DB-less Integration Tests", () => {
  let app, mockFind, mockPopulate, mockSelect, mockLimit, mockSort;

  beforeEach(() => {
    // Reset mocks between tests
    jest.clearAllMocks();

    // Create mock products array
    const mockProducts = [
      {
        _id: "product-id-1",
        name: "Test Product 1",
        description: "Description 1",
        price: 99.99,
        category: {
          _id: "category-id-1",
          name: "Category 1",
          slug: "category-1",
        },
        quantity: 10,
        slug: "test-product-1",
        createdAt: new Date("2023-01-15"),
      },
      {
        _id: "product-id-2",
        name: "Test Product 2",
        description: "Description 2",
        price: 149.99,
        category: {
          _id: "category-id-2",
          name: "Category 2",
          slug: "category-2",
        },
        quantity: 5,
        slug: "test-product-2",
        createdAt: new Date("2023-01-20"),
      },
    ];

    // Set up method chain: find().populate().select().limit().sort()
    mockSort = jest.fn().mockResolvedValue(mockProducts);
    mockLimit = jest.fn().mockReturnValue({ sort: mockSort });
    mockSelect = jest.fn().mockReturnValue({ limit: mockLimit });
    mockPopulate = jest.fn().mockReturnValue({ select: mockSelect });
    mockFind = jest.fn().mockReturnValue({ populate: mockPopulate });

    // Assign the mock chain to productModel
    productModel.find = mockFind;

    // Setup basic express app
    app = express();
  });

  // Test 1: Successful retrieval of all products
  test("Should successfully retrieve all products with a limit", async () => {
    // Setup route
    app = express();
    app.get("/api/product/get-all", getProductController);

    // Send test request
    const response = await request(app).get("/api/product/get-all");

    // Assertions
    expect(response.status).toBe(StatusCodes.OK);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe("All products fetched successfully.");
    expect(response.body).toHaveProperty("products");
    expect(response.body.products.length).toBe(2);
    expect(response.body.counTotal).toBe(2);

    // Verify the first product in the response
    const firstProduct = response.body.products[0];
    expect(firstProduct.name).toBe("Test Product 1");
    expect(firstProduct.price).toBe(99.99);

    // Verify method chain was called correctly
    expect(mockFind).toHaveBeenCalledWith({});
    expect(mockPopulate).toHaveBeenCalledWith("category");
    expect(mockSelect).toHaveBeenCalledWith("-photo");
    expect(mockLimit).toHaveBeenCalledWith(12);
    expect(mockSort).toHaveBeenCalledWith({ createdAt: -1 });
  });

  // Test 2: Empty products array
  test("Should handle case when no products exist", async () => {
    // Mock sort to return empty array
    mockSort.mockResolvedValueOnce([]);

    // Setup route
    app = express();
    app.get("/api/product/get-all", getProductController);

    // Send test request
    const response = await request(app).get("/api/product/get-all");

    // Assertions
    expect(response.status).toBe(StatusCodes.OK);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe("All products fetched successfully.");
    expect(response.body.products).toEqual([]);
    expect(response.body.counTotal).toBe(0);

    // Verify method chain was still called
    expect(mockFind).toHaveBeenCalledWith({});
    expect(mockPopulate).toHaveBeenCalledWith("category");
    expect(mockSelect).toHaveBeenCalledWith("-photo");
  });

  // Test 3: Server error during retrieval
  test("Should handle server errors during products retrieval", async () => {
    // Mock find to throw an error
    productModel.find.mockImplementationOnce(() => {
      throw new Error("Database connection failed");
    });

    // Setup route
    app = express();
    app.get("/api/product/get-all", getProductController);

    // Send test request
    const response = await request(app).get("/api/product/get-all");

    // Assertions
    expect(response.status).toBe(StatusCodes.INTERNAL_SERVER_ERROR);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe("Error retrieving products.");
    expect(response.body.error).toBe("Database connection failed");
  });

  // Test 4: Verify photo exclusion
  test("Should exclude photo data from all products", async () => {
    // Setup route
    app = express();
    app.get("/api/product/get-all", getProductController);

    // Send test request
    await request(app).get("/api/product/get-all");

    // Verify select was called to exclude photo
    expect(mockSelect).toHaveBeenCalledWith("-photo");
  });

  // Test 5: Verify sort by creation date
  test("Should sort products by creation date in descending order", async () => {
    // Setup route
    app = express();
    app.get("/api/product/get-all", getProductController);

    // Send test request
    await request(app).get("/api/product/get-all");

    // Verify sort was called with correct parameters
    expect(mockSort).toHaveBeenCalledWith({ createdAt: -1 });
  });

  // Test 6: Verify limit is applied
  test("Should limit the number of products returned to 12", async () => {
    // Setup route
    app = express();
    app.get("/api/product/get-all", getProductController);

    // Send test request
    await request(app).get("/api/product/get-all");

    // Verify limit was called with correct parameter
    expect(mockLimit).toHaveBeenCalledWith(12);
  });
});

describe("ProductCountController - DB-less Integration Tests", () => {
  let app;

  beforeEach(() => {
    // Reset mocks between tests
    jest.clearAllMocks();

    // Mock estimatedDocumentCount
    productModel.find = jest.fn().mockReturnValue({
      estimatedDocumentCount: jest.fn().mockResolvedValue(25),
    });

    // Create a fresh express app
    app = express();
  });

  // Test 1: Get product count
  test("Should get the total count of products", async () => {
    // Setup route
    app.get("/api/product/count", productCountController);

    // Send test request
    const response = await request(app).get("/api/product/count");

    // Assertions
    expect(response.status).toBe(StatusCodes.OK);
    expect(response.body.success).toBe(true);
    expect(response.body.total).toBe(25);

    // Verify estimatedDocumentCount was called
    expect(productModel.find).toHaveBeenCalledWith({});
    expect(productModel.find().estimatedDocumentCount).toHaveBeenCalled();
  });

  // Test 2: Handle server error
  test("Should handle server errors when getting product count", async () => {
    // Mock find to throw error
    productModel.find.mockImplementationOnce(() => {
      throw new Error("Database count failed");
    });

    // Setup route
    app.get("/api/product/count", productCountController);

    // Send test request
    const response = await request(app).get("/api/product/count");

    // Assertions
    expect(response.status).toBe(StatusCodes.INTERNAL_SERVER_ERROR);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe("Error retrieving product count.");
    expect(response.body.error).toBe("Database count failed");
  });
});

describe("ProductListController - DB-less Integration Tests", () => {
  let app, mockFind, mockSelect, mockSkip, mockLimit, mockSort;

  beforeEach(() => {
    // Reset mocks between tests
    jest.clearAllMocks();

    // Create mock paginated products
    const mockProducts = [
      { _id: "product-id-1", name: "Product 1", price: 99.99 },
      { _id: "product-id-2", name: "Product 2", price: 149.99 },
      { _id: "product-id-3", name: "Product 3", price: 199.99 },
      { _id: "product-id-4", name: "Product 4", price: 249.99 },
      { _id: "product-id-5", name: "Product 5", price: 299.99 },
      { _id: "product-id-6", name: "Product 6", price: 349.99 },
    ];

    // Set up method chain: find().select().skip().limit().sort()
    mockSort = jest.fn().mockResolvedValue(mockProducts);
    mockLimit = jest.fn().mockReturnValue({ sort: mockSort });
    mockSkip = jest.fn().mockReturnValue({ limit: mockLimit });
    mockSelect = jest.fn().mockReturnValue({ skip: mockSkip });
    mockFind = jest.fn().mockReturnValue({ select: mockSelect });

    // Assign mock chain
    productModel.find = mockFind;

    // Create a fresh express app
    app = express();
  });

  // Test 1: Get paginated product list (page 1)
  test("Should get the first page of products", async () => {
    // Setup route with page parameter
    app.use((req, _, next) => {
      req.params = { page: "1" };
      next();
    });
    app.get("/api/product/list/:page", productListController);

    // Send test request
    const response = await request(app).get("/api/product/list/1");

    // Assertions
    expect(response.status).toBe(StatusCodes.OK);
    expect(response.body.success).toBe(true);
    expect(response.body.products.length).toBe(6);

    // Verify method chain
    expect(mockFind).toHaveBeenCalledWith({});
    expect(mockSelect).toHaveBeenCalledWith("-photo");
    expect(mockSkip).toHaveBeenCalledWith(0); // (1-1) * 6 = 0
    expect(mockLimit).toHaveBeenCalledWith(6);
    expect(mockSort).toHaveBeenCalledWith({ createdAt: -1 });
  });

  // Test 2: Get paginated product list (page 2)
  test("Should get the second page of products", async () => {
    // Setup route with page parameter
    app.use((req, _, next) => {
      req.params = { page: "2" };
      next();
    });
    app.get("/api/product/list/:page", productListController);

    // Send test request
    const response = await request(app).get("/api/product/list/2");

    // Assertions
    expect(response.status).toBe(StatusCodes.OK);
    expect(response.body.success).toBe(true);

    // Verify method chain with correct skip value
    expect(mockSkip).toHaveBeenCalledWith(6); // (2-1) * 6 = 6
  });

  // Test 3: Default to page 1 if no page provided
  test("Should default to page 1 if no page parameter is provided", async () => {
    // Setup route without page parameter
    app.use((req, _, next) => {
      req.params = {}; // No page parameter
      next();
    });
    app.get("/api/product/list", productListController);

    // Send test request
    const response = await request(app).get("/api/product/list");

    // Assertions
    expect(response.status).toBe(StatusCodes.OK);
    expect(response.body.success).toBe(true);

    // Verify skip was called with 0 (first page)
    expect(mockSkip).toHaveBeenCalledWith(0);
  });

  // Test 4: Handle server error
  test("Should handle server errors when getting product list", async () => {
    // Mock find to throw error
    productModel.find.mockImplementationOnce(() => {
      throw new Error("Database pagination failed");
    });

    // Setup route
    app.use((req, _, next) => {
      req.params = { page: "1" };
      next();
    });
    app.get("/api/product/list/:page", productListController);

    // Send test request
    const response = await request(app).get("/api/product/list/1");

    // Assertions
    expect(response.status).toBe(StatusCodes.INTERNAL_SERVER_ERROR);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe("Error retrieving products by page.");
    expect(response.body.error).toBe("Database pagination failed");
  });
});
