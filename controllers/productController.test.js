import braintree from "braintree";
import { StatusCodes } from "http-status-codes";
import {
  braintreePaymentController,
  braintreeTokenController,
  createProductController,
  updateProductController,
  deleteProductController,
  getSingleProductController,
  getProductController,
  productFiltersController,
  productCategoryController,
  productPhotoController,
  productCountController,
  productListController,
  relatedProductController,
  searchProductController,
} from "./productController.js";
import orderModel from "../models/orderModel.js";
import fs from "fs";
import slugify from "slugify";
import productModel from "../models/productModel.js";
import categoryModel from "../models/categoryModel.js";

/**
 * Mock dependencies
 */

// Mock the Product model
jest.mock("../models/productModel.js");

// Mock the Category model
jest.mock("../models/categoryModel.js");

// Mock the Order model
jest.mock("../models/orderModel", () => {
  return jest.fn().mockImplementation(() => ({
    save: jest.fn().mockResolvedValue({ _id: "test-order-id" }),
  }));
});

jest.mock("fs");
jest.mock("slugify", () =>
  jest.fn((name) => name.toLowerCase().replace(/\s+/g, "-"))
);

// Mock the Braintree SDK to simulate payment gateway interactions
jest.mock("braintree", () => {
  const mockTransactionSale = jest.fn();
  const mockTokenGenerate = jest.fn();

  return {
    BraintreeGateway: jest.fn().mockImplementation(() => ({
      transaction: {
        sale: mockTransactionSale,
      },
      clientToken: {
        generate: mockTokenGenerate,
      },
    })),
    Environment: {
      Sandbox: "sandbox",
    },

    __mockTransactionSale__: mockTransactionSale,
    __mockTokenGenerate__: mockTokenGenerate,
  };
});

const mockTransactionSale = braintree.__mockTransactionSale__;
const mockTokenGenerate = braintree.__mockTokenGenerate__;

describe("Braintree Token Controller", () => {
  let mockRequest, mockResponse;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRequest = {};
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
    };

    process.env.BRAINTREE_MERCHANT_ID = "test-merchant-id";
    process.env.BRAINTREE_PUBLIC_KEY = "test-public-key";
    process.env.BRAINTREE_PRIVATE_KEY = "test-private-key";
  });

  // Test suite 1: Successful token generation scenarios
  describe("Token generation success", () => {
    // Test case 1: Successful token generation
    it("should generate client token successfully with valid response", async () => {
      const braintreeResponse = { clientToken: "braintree-test-token-abc123" };

      mockTokenGenerate.mockImplementation((config, callback) => {
        callback(null, braintreeResponse);
      });

      await braintreeTokenController(mockRequest, mockResponse);

      // Assert: Braintree called correctly
      expect(mockTokenGenerate).toHaveBeenCalledWith({}, expect.any(Function));

      // Assert: successful response structure
      expect(mockResponse.status).toHaveBeenCalledWith(StatusCodes.OK);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        clientToken: braintreeResponse.clientToken,
      });
    });

    // Test case 2: Handle edge case where clientToken is null
    it("should handle null clientToken gracefully", async () => {
      const braintreeResponse = { clientToken: null };

      mockTokenGenerate.mockImplementation((config, callback) => {
        callback(null, braintreeResponse);
      });

      await braintreeTokenController(mockRequest, mockResponse);

      // Assert: return success with null token
      expect(mockResponse.status).toHaveBeenCalledWith(StatusCodes.OK);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        clientToken: null,
      });
    });

    // Test case 3: Handle edge case where clientToken is undefined
    it("should handle undefined clientToken gracefully", async () => {
      const braintreeResponse = { clientToken: undefined };

      mockTokenGenerate.mockImplementation((config, callback) => {
        callback(null, braintreeResponse);
      });

      await braintreeTokenController(mockRequest, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(StatusCodes.OK);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        clientToken: null,
      });
    });

    // Test case 4: Handle edge case where response is missing clientToken property
    it("handles missing clientToken property in response", async () => {
      const braintreeResponse = { someOtherProperty: "value" };
      mockTokenGenerate.mockImplementation((config, callback) => {
        callback(null, braintreeResponse);
      });

      await braintreeTokenController(mockRequest, mockResponse);

      // Assert: Should default to null for missing property
      expect(mockResponse.status).toHaveBeenCalledWith(StatusCodes.OK);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        clientToken: null,
      });
    });
  });

  // Test suite 2: Token generation error handling scenarios
  describe("Error handling", () => {
    // Test case 1: Handle Braintree service error
    it("should handle Braintree service errors properly", async () => {
      const serviceError = new Error("Braintree API temporarily unavailable");
      mockTokenGenerate.mockImplementation((config, callback) => {
        callback(serviceError, null);
      });

      await braintreeTokenController(mockRequest, mockResponse);

      // Assert: Should return proper error response
      expect(mockResponse.status).toHaveBeenCalledWith(
        StatusCodes.INTERNAL_SERVER_ERROR
      );
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: "Failed to generate token",
        error: serviceError.message,
      });
    });

    // Test case 2: Handle unexpected exception during token generation
    it("should handle unexpected exceptions", async () => {
      const unexpectedError = new Error("Network connection lost");
      mockTokenGenerate.mockImplementation(() => {
        throw unexpectedError;
      });

      await braintreeTokenController(mockRequest, mockResponse);

      // Assert: Should handle exception gracefully
      expect(mockResponse.status).toHaveBeenCalledWith(
        StatusCodes.INTERNAL_SERVER_ERROR
      );
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: "Unexpected error during token generation",
        error: unexpectedError.message,
      });
    });
  });
});

describe("Braintree Payment Controller", () => {
  let mockRequest, mockResponse;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRequest = {
      body: {
        nonce: "payment-nonce-xyz789",
        cart: [{ price: 19.99 }, { price: 25.5 }],
      },
      user: { _id: "user-abc-123" },
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
    };

    process.env.BRAINTREE_MERCHANT_ID = "test-merchant-id";
    process.env.BRAINTREE_PUBLIC_KEY = "test-public-key";
    process.env.BRAINTREE_PRIVATE_KEY = "test-private-key";
  });

  // Test suite 1: Request validation tests
  describe("Input validation", () => {
    // Test case 1: Missing nonce
    it("should reject payments without nonce", async () => {
      delete mockRequest.body.nonce; // remove nonce from request

      await braintreePaymentController(mockRequest, mockResponse);

      // Assert: Should reject with error message
      expect(mockResponse.status).toHaveBeenCalledWith(StatusCodes.BAD_REQUEST);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: "Missing payment nonce",
      });

      // Assert: Should not have called braintree transaction
      expect(mockTransactionSale).not.toHaveBeenCalled();
    });

    // Test case 2: Empty nonce
    it("should reject request with empty nonce", async () => {
      mockRequest.body.nonce = "";

      await braintreePaymentController(mockRequest, mockResponse);

      // Assert: Should reject with error message
      expect(mockResponse.status).toHaveBeenCalledWith(StatusCodes.BAD_REQUEST);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: "Missing payment nonce",
      });
    });

    // Test case 3: Missing cart
    it("should reject request without cart data", async () => {
      delete mockRequest.body.cart;

      await braintreePaymentController(mockRequest, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(StatusCodes.BAD_REQUEST);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: "Cart cannot be empty",
      });
    });

    // Test case 4: Empty cart
    it("should reject request with empty cart", async () => {
      mockRequest.body.cart = [];

      await braintreePaymentController(mockRequest, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(StatusCodes.BAD_REQUEST);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: "Cart cannot be empty",
      });
    });

    // Test case 5: Cart is not an array
    it("should reject request with non-array cart", async () => {
      mockRequest.body.cart = "invalid-cart-data";

      await braintreePaymentController(mockRequest, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(StatusCodes.BAD_REQUEST);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: "Cart cannot be empty",
      });
    });

    // Test case 6: Cart items with invalid prices
    it("should reject cart with invalid prices", async () => {
      mockRequest.body.cart = [{ price: 15.99 }, { price: "not-a-number" }];

      await braintreePaymentController(mockRequest, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(
        StatusCodes.UNPROCESSABLE_ENTITY
      );
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: "Invalid prices in cart",
      });
    });

    // Test case 7: Cart items with negative prices
    it("should reject cart with negative prices", async () => {
      mockRequest.body.cart = [{ price: -10 }, { price: 15.99 }];

      await braintreePaymentController(mockRequest, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(
        StatusCodes.UNPROCESSABLE_ENTITY
      );
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: "Invalid prices in cart",
      });
    });

    // Test case 8: Cart items with null prices
    it("should reject cart with null prices", async () => {
      mockRequest.body.cart = [{ price: null }, { price: 15.99 }];

      await braintreePaymentController(mockRequest, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(
        StatusCodes.UNPROCESSABLE_ENTITY
      );
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: "Invalid prices in cart",
      });
    });

    // Test case 9: Cart items with missing price
    it("should validate cart items have price property", async () => {
      mockRequest.body.cart = [
        { price: 15.99 },
        { name: "item-missing-price" },
      ];

      await braintreePaymentController(mockRequest, mockResponse);

      // Assert: Should reject items without price
      expect(mockResponse.status).toHaveBeenCalledWith(
        StatusCodes.UNPROCESSABLE_ENTITY
      );
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: "Invalid prices in cart",
      });
    });
  });

  // Test suite 2: Successful payment processing scenarios
  describe("Successful payment processing", () => {
    // Test case 1: Successful payment and order creation
    it("should process payment and create order record", async () => {
      const transactionResult = {
        success: true,
        transaction: { id: "txn-success-123", amount: "45.49" },
      };

      mockTransactionSale.mockImplementation((transactionData, callback) => {
        callback(null, transactionResult);
      });

      await braintreePaymentController(mockRequest, mockResponse);

      // Assert: Braintree transaction was called with correct data
      expect(mockTransactionSale).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: "45.49", // Sum of 19.99 + 25.50
          paymentMethodNonce: mockRequest.body.nonce,
          options: { submitForSettlement: true },
        }),
        expect.any(Function)
      );

      expect(orderModel).toHaveBeenCalledWith({
        products: mockRequest.body.cart,
        payment: transactionResult,
        buyer: mockRequest.user._id,
      });

      expect(mockResponse.status).toHaveBeenCalledWith(StatusCodes.CREATED);
      expect(mockResponse.json).toHaveBeenCalledWith({ success: true });
    });
  });

  // Test suite 3: Payment failure and error handling scenarios
  describe("Payment failure handling", () => {
    // Test case 1: Unsuccessful transaction result from Braintree
    it("should handle unsuccessful transaction results", async () => {
      const failedResult = {
        success: false,
        message: "Transaction was rejected by payment gateway",
      };

      mockTransactionSale.mockImplementation((data, callback) => {
        callback(null, failedResult);
      });

      await braintreePaymentController(mockRequest, mockResponse);

      // Assert: Should handle gateway rejection
      expect(mockResponse.status).toHaveBeenCalledWith(
        StatusCodes.PAYMENT_REQUIRED
      );
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: "Payment failed",
        error: failedResult.message,
        result: failedResult,
      });
    });

    // Test case 2: Order save failure after successful payment
    it("should handle payment success but order save failure", async () => {
      const transactionResult = {
        success: true,
        transaction: { id: "txn-123" },
      };
      const databaseError = new Error("Database connection timeout");

      const mockOrder = {
        _id: "order-123",
        save: jest.fn().mockRejectedValue(databaseError),
      };

      orderModel.mockImplementation(() => mockOrder);
      mockTransactionSale.mockImplementation((data, callback) => {
        callback(null, transactionResult);
      });

      await braintreePaymentController(mockRequest, mockResponse);

      // Assert: Should handle failed to save order after payment
      expect(mockResponse.status).toHaveBeenCalledWith(
        StatusCodes.INTERNAL_SERVER_ERROR
      );
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: "Payment succeeded but failed to save order",
        error: databaseError.message,
      });
    });
  });

  // Test suite 4: Exception handling scenarios
  describe("Exception Handling", () => {
    it("catches unexpected errors during payment processing", async () => {
      const unexpectedError = new Error("System out of memory");
      mockTransactionSale.mockImplementation(() => {
        throw unexpectedError;
      });

      await braintreePaymentController(mockRequest, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(
        StatusCodes.INTERNAL_SERVER_ERROR
      );
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: "Unexpected error during payment",
        error: unexpectedError.message,
      });
    });
  });
});

describe("Create Product Controller", () => {
  let req, res;

  beforeEach(() => {
    req = {
      fields: {
        name: "Test Product",
        description: "Test Description",
        price: 99.99,
        category: "66db427fdb0119d9234b27ed",
        quantity: 10,
        shipping: true,
      },
      files: {
        photo: {
          path: "/tmp/test-photo.jpg",
          size: 50000,
          type: "image/jpeg",
        },
      },
    };
    res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
    };
    jest.clearAllMocks();
    fs.readFileSync.mockReturnValue(Buffer.from("test image data"));
  });

  it("should return 201 on successful product creation", async () => {
    const savedProduct = {
      ...req.fields,
      slug: "test-product",
      photo: {
        data: Buffer.from("test image data"),
        contentType: "image/jpeg",
      },
    };
    productModel.mockImplementation(() => ({
      photo: {
        data: null,
        contentType: null,
      },
      save: jest.fn().mockResolvedValue(savedProduct),
    }));

    await createProductController(req, res);

    expect(slugify).toHaveBeenCalledWith("Test Product");
    expect(fs.readFileSync).toHaveBeenCalledWith("/tmp/test-photo.jpg");
    expect(res.status).toHaveBeenCalledWith(StatusCodes.CREATED);
    expect(res.send).toHaveBeenCalledWith({
      success: true,
      message: "Product created successfully.",
      products: expect.objectContaining({
        photo: expect.objectContaining({
          data: expect.any(Buffer),
          contentType: "image/jpeg",
        }),
      }),
    });
  });

  it("should return 500 if name is missing", async () => {
    req.fields.name = "";

    await createProductController(req, res);

    expect(res.status).toHaveBeenCalledWith(StatusCodes.INTERNAL_SERVER_ERROR);
    expect(res.send).toHaveBeenCalledWith({ error: "Name is required." });
  });

  it("should return 500 if description is missing", async () => {
    req.fields.description = "";

    await createProductController(req, res);

    expect(res.status).toHaveBeenCalledWith(StatusCodes.INTERNAL_SERVER_ERROR);
    expect(res.send).toHaveBeenCalledWith({
      error: "Description is required.",
    });
  });

  it("should return 500 if price is missing", async () => {
    req.fields.price = "";

    await createProductController(req, res);

    expect(res.status).toHaveBeenCalledWith(StatusCodes.INTERNAL_SERVER_ERROR);
    expect(res.send).toHaveBeenCalledWith({ error: "Price is required." });
  });

  it("should return 500 if category is missing", async () => {
    req.fields.category = "";

    await createProductController(req, res);

    expect(res.status).toHaveBeenCalledWith(StatusCodes.INTERNAL_SERVER_ERROR);
    expect(res.send).toHaveBeenCalledWith({ error: "Category is required." });
  });


  it("should return 500 if quantity is missing", async () => {
    req.fields.quantity = "";

    await createProductController(req, res);

    expect(res.status).toHaveBeenCalledWith(StatusCodes.INTERNAL_SERVER_ERROR);
    expect(res.send).toHaveBeenCalledWith({ error: "Quantity is required." });
  });

  it("should return 500 if photo size is too large", async () => {
    req.files.photo.size = 1500000; // Larger than 1MB limit

    await createProductController(req, res);

    expect(res.status).toHaveBeenCalledWith(StatusCodes.INTERNAL_SERVER_ERROR);
    expect(res.send).toHaveBeenCalledWith({
      error: "Photo is required and must be less than 1MB.",
    });
  });

  it("should return 500 in case of database error", async () => {
    const dbError = new Error("DB error");
    productModel.mockImplementation(() => ({
      photo: {
        data: null,
        contentType: null,
      },
      save: jest.fn().mockRejectedValue(dbError),
    }));

    await createProductController(req, res);

    expect(res.status).toHaveBeenCalledWith(StatusCodes.INTERNAL_SERVER_ERROR);
    expect(res.send).toHaveBeenCalledWith({
      success: false,
      error: dbError.message,
      message: "Error creating product.",
    });
  });
});

describe("Update Product Controller", () => {
  let req, res;

  beforeEach(() => {
    req = {
      params: {
        pid: "66db427fdb0119d9234b27ed",
      },
      fields: {
        name: "Updated Product",
        description: "Updated Description",
        price: 149.99,
        category: "66db427fdb0119d9234b27ed",
        quantity: 20,
        shipping: false,
      },
      files: {
        photo: {
          path: "/tmp/updated-photo.jpg",
          size: 60000,
          type: "image/png",
        },
      },
    };
    res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
    };
    jest.clearAllMocks();
    fs.readFileSync.mockReturnValue(Buffer.from("updated image data"));
  });

  it("should return 201 on successful product update", async () => {
    const updatedProduct = {
      _id: "66db427fdb0119d9234b27ed",
      ...req.fields,
      slug: "updated-product",
      photo: {
        data: null,
        contentType: null,
      },
      save: jest.fn().mockResolvedValue(undefined),
    };
    productModel.findByIdAndUpdate.mockResolvedValue(updatedProduct);

    await updateProductController(req, res);

    expect(slugify).toHaveBeenCalledWith("Updated Product");
    expect(productModel.findByIdAndUpdate).toHaveBeenCalledWith(
      req.params.pid,
      { ...req.fields, slug: "updated-product" },
      { new: true }
    );
    expect(fs.readFileSync).toHaveBeenCalledWith("/tmp/updated-photo.jpg");
    expect(res.status).toHaveBeenCalledWith(StatusCodes.CREATED);
    expect(res.send).toHaveBeenCalledWith({
      success: true,
      message: "Product updated successfully.",
      products: expect.objectContaining({
        _id: "66db427fdb0119d9234b27ed",
        name: "Updated Product",
      }),
    });
  });

  it("should return 500 if name is missing during update", async () => {
    req.fields.name = "";

    await updateProductController(req, res);

    expect(res.status).toHaveBeenCalledWith(StatusCodes.INTERNAL_SERVER_ERROR);
    expect(res.send).toHaveBeenCalledWith({ error: "Name is required." });
    expect(productModel.findByIdAndUpdate).not.toHaveBeenCalled();
  });

  it("should return 500 if description is missing during update", async () => {
    req.fields.description = "";

    await updateProductController(req, res);

    expect(res.status).toHaveBeenCalledWith(StatusCodes.INTERNAL_SERVER_ERROR);
    expect(res.send).toHaveBeenCalledWith({
      error: "Description is required.",
    });
    expect(productModel.findByIdAndUpdate).not.toHaveBeenCalled();
  });

  it("should return 500 if price is missing during update", async () => {
    req.fields.price = "";

    await updateProductController(req, res);

    expect(res.status).toHaveBeenCalledWith(StatusCodes.INTERNAL_SERVER_ERROR);
    expect(res.send).toHaveBeenCalledWith({ error: "Price is required." });
    expect(productModel.findByIdAndUpdate).not.toHaveBeenCalled();
  });

  it("should return 500 if category is missing during update", async () => {
    req.fields.category = "";

    await updateProductController(req, res);

    expect(res.status).toHaveBeenCalledWith(StatusCodes.INTERNAL_SERVER_ERROR);
    expect(res.send).toHaveBeenCalledWith({ error: "Category is required." });
    expect(productModel.findByIdAndUpdate).not.toHaveBeenCalled();
  });

  it("should return 500 if quantity is missing during update", async () => {
    req.fields.quantity = "";

    await updateProductController(req, res);

    expect(res.status).toHaveBeenCalledWith(StatusCodes.INTERNAL_SERVER_ERROR);
    expect(res.send).toHaveBeenCalledWith({ error: "Quantity is required." });
    expect(productModel.findByIdAndUpdate).not.toHaveBeenCalled();
  });

  it("should return 500 if photo size is too large during update", async () => {
    req.files.photo.size = 1500000; // Larger than 1MB limit

    await updateProductController(req, res);

    expect(res.status).toHaveBeenCalledWith(StatusCodes.INTERNAL_SERVER_ERROR);
    expect(res.send).toHaveBeenCalledWith({
      error: "Photo is required and must be less than 1MB.",
    });
    expect(productModel.findByIdAndUpdate).not.toHaveBeenCalled();
  });

  it("should return 500 in case of database error during update", async () => {
    const dbError = new Error("DB error");
    productModel.findByIdAndUpdate.mockRejectedValue(dbError);

    await updateProductController(req, res);

    expect(res.status).toHaveBeenCalledWith(StatusCodes.INTERNAL_SERVER_ERROR);
    expect(res.send).toHaveBeenCalledWith({
      success: false,
      error: dbError.message,
      message: "Error updating product.",
    });
  });

  it("should handle error when saving updated photo", async () => {
    const dbError = new Error("DB error");
    const updatedProduct = {
      _id: "66db427fdb0119d9234b27ed",
      ...req.fields,
      slug: "updated-product",
      photo: {
        data: null,
        contentType: null,
      },
      save: jest.fn().mockRejectedValue(dbError),
    };
    productModel.findByIdAndUpdate.mockResolvedValue(updatedProduct);

    await updateProductController(req, res);

    expect(res.status).toHaveBeenCalledWith(StatusCodes.INTERNAL_SERVER_ERROR);
    expect(res.send).toHaveBeenCalledWith({
      success: false,
      error: dbError.message,
      message: "Error updating product.",
    });
  });
});

describe("Delete Product Controller", () => {
  let req, res;

  beforeEach(() => {
    jest.clearAllMocks();
    productModel.findByIdAndDelete = jest.fn();
    req = { params: { pid: "66db427fdb0119d9234b27ed" } };
    res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
    };
  });

  it("should return 200 on successful product deletion", async () => {
    const deletedProduct = jest.fn().mockResolvedValue({
      _id: "66db427fdb0119d9234b27ed",
      name: "Deleted Product",
    });
    productModel.findByIdAndDelete.mockReturnValue({ select: deletedProduct });

    await deleteProductController(req, res);

    expect(productModel.findByIdAndDelete).toHaveBeenCalledWith(req.params.pid);
    expect(deletedProduct).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(StatusCodes.OK);
    expect(res.send).toHaveBeenCalledWith({
      success: true,
      message: "Product deleted successfully.",
    });
  });

  it("should return 500 in case of error during product deletion", async () => {
    const dbError = new Error("DB error");
    const deletedProduct = jest.fn().mockRejectedValue(dbError);
    productModel.findByIdAndDelete.mockReturnValue({ select: deletedProduct });

    await deleteProductController(req, res);

    expect(productModel.findByIdAndDelete).toHaveBeenCalledWith(req.params.pid);
    expect(deletedProduct).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(StatusCodes.INTERNAL_SERVER_ERROR);
    expect(res.send).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: "Error deleting product.",
      })
    );
  });

  it("should return 200 when product is not found for deletion", async () => {
    const deletedProduct = jest.fn().mockResolvedValue(null);
    productModel.findByIdAndDelete.mockReturnValue({ select: deletedProduct });

    await deleteProductController(req, res);

    expect(productModel.findByIdAndDelete).toHaveBeenCalledWith(req.params.pid);
    expect(deletedProduct).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(StatusCodes.OK);
    expect(res.send).toHaveBeenCalledWith({
      success: true,
      message: "Product deleted successfully.",
    });
  });
});

describe("Get Single Product Controller", () => {
  let req, res;

  beforeEach(() => {
    req = {
      params: {
        slug: "test-product",
      },
    };
    res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
    };
    jest.clearAllMocks();
  });

  it("should return 200 when getting a single product is successful", async () => {
    const product = {
      _id: "66db427fdb0119d9234b27ed",
      name: "Test Product",
      slug: "test-product",
      description: "Test Description",
      price: 99.99,
      category: {
        _id: "66db427fdb0119d9234b27ee",
        name: "Electronics",
      },
      quantity: 10,
    };
    productModel.findOne.mockReturnValue({
      select: jest.fn().mockReturnValue({
        populate: jest.fn().mockResolvedValue(product),
      }),
    });

    await getSingleProductController(req, res);

    expect(productModel.findOne).toHaveBeenCalledWith({ slug: "test-product" });
    expect(res.status).toHaveBeenCalledWith(StatusCodes.OK);
    expect(res.send).toHaveBeenCalledWith({
      success: true,
      message: "Product fetched successfully.",
      product,
    });
  });

  it("should return 500 in case of error when getting a single product", async () => {
    const dbError = new Error("DB error");
    productModel.findOne.mockReturnValue({
      select: jest.fn().mockReturnValue({
        populate: jest.fn().mockRejectedValue(dbError),
      }),
    });

    await getSingleProductController(req, res);

    expect(productModel.findOne).toHaveBeenCalledWith({ slug: "test-product" });
    expect(res.status).toHaveBeenCalledWith(StatusCodes.INTERNAL_SERVER_ERROR);
    expect(res.send).toHaveBeenCalledWith({
      success: false,
      error: dbError.message,
      message: "Error retrieving product.",
    });
  });

  it("should handle case where product is not found", async () => {
    productModel.findOne.mockReturnValue({
      select: jest.fn().mockReturnValue({
        populate: jest.fn().mockResolvedValue(null),
      }),
    });

    await getSingleProductController(req, res);

    expect(productModel.findOne).toHaveBeenCalledWith({ slug: "test-product" });
    expect(res.status).toHaveBeenCalledWith(StatusCodes.OK);
    expect(res.send).toHaveBeenCalledWith({
      success: true,
      message: "Product fetched successfully.",
      product: null,
    });
  });
});

describe("Get Product Controller", () => {
  let req, res;

  beforeEach(() => {
    req = {};
    res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
    };
    jest.clearAllMocks();
  });

  it("should return 200 with list of products", async () => {
    const products = [
      { _id: "p1", name: "Product 1", category: { name: "Category 1" } },
      { _id: "p2", name: "Product 2", category: { name: "Category 2" } },
    ];
    productModel.find = jest.fn().mockReturnValue({
      populate: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      sort: jest.fn().mockResolvedValue(products),
    });

    await getProductController(req, res);

    expect(productModel.find).toHaveBeenCalledWith({});
    expect(res.status).toHaveBeenCalledWith(StatusCodes.OK);
    expect(res.send).toHaveBeenCalledWith({
      success: true,
      counTotal: products.length,
      message: "All products fetched successfully.",
      products,
    });
  });

  it("should return 200 with empty array when no products exist", async () => {
    const products = [];
    productModel.find = jest.fn().mockReturnValue({
      populate: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      sort: jest.fn().mockResolvedValue(products),
    });

    await getProductController(req, res);

    expect(productModel.find).toHaveBeenCalledWith({});
    expect(res.status).toHaveBeenCalledWith(StatusCodes.OK);
    expect(res.send).toHaveBeenCalledWith({
      success: true,
      counTotal: 0,
      message: "All products fetched successfully.",
      products: [],
    });
  });

  it("should return 500 in case of error", async () => {
    const dbError = new Error("DB error");
    productModel.find = jest.fn().mockReturnValue({
      populate: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      sort: jest.fn().mockRejectedValue(dbError),
    });

    await getProductController(req, res);

    expect(res.status).toHaveBeenCalledWith(StatusCodes.INTERNAL_SERVER_ERROR);
    expect(res.send).toHaveBeenCalledWith({
      success: false,
      error: dbError.message,
      message: "Error retrieving products.",
    });
  });
});

describe("Product Filters Controller", () => {
  let req, res;

  beforeEach(() => {
    req = {
      body: {
        checked: [],
        radio: [],
      },
    };
    res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
    };
    jest.clearAllMocks();
  });

  it("should return 200 with filtered products by category", async () => {
    const categories = ["66db427fdb0119d9234b27ed", "66db427fdb0119d9234b27ee"];
    req.body.checked = categories;
    const products = [
      { _id: "p1", name: "Product 1", category: categories[0] },
      { _id: "p2", name: "Product 2", category: categories[1] },
    ];
    productModel.find.mockResolvedValue(products);

    await productFiltersController(req, res);

    expect(productModel.find).toHaveBeenCalledWith({ category: categories });
    expect(res.status).toHaveBeenCalledWith(StatusCodes.OK);
    expect(res.send).toHaveBeenCalledWith({
      success: true,
      products,
    });
  });

  it("should return 200 with filtered products by price range", async () => {
    const priceRange = [20, 100];
    req.body.radio = priceRange;
    const products = [
      { _id: "p1", name: "Product 1", price: 25 },
      { _id: "p2", name: "Product 2", price: 75 },
    ];
    productModel.find.mockResolvedValue(products);

    await productFiltersController(req, res);

    expect(productModel.find).toHaveBeenCalledWith({
      price: { $gte: priceRange[0], $lte: priceRange[1] },
    });
    expect(res.status).toHaveBeenCalledWith(StatusCodes.OK);
    expect(res.send).toHaveBeenCalledWith({
      success: true,
      products,
    });
  });

  it("should return 200 with filtered products by both category and price range", async () => {
    const categories = ["66db427fdb0119d9234b27ed"];
    const priceRange = [20, 100];
    req.body.checked = categories;
    req.body.radio = priceRange;
    const products = [
      { _id: "p1", name: "Product 1", category: categories[0], price: 25 },
    ];
    productModel.find.mockResolvedValue(products);

    await productFiltersController(req, res);

    expect(productModel.find).toHaveBeenCalledWith({
      category: categories,
      price: { $gte: priceRange[0], $lte: priceRange[1] },
    });
    expect(res.status).toHaveBeenCalledWith(StatusCodes.OK);
    expect(res.send).toHaveBeenCalledWith({
      success: true,
      products,
    });
  });

  it("should return 400 in case of error during filtering", async () => {
    const dbError = new Error("DB error");
    req.body.checked = ["66db427fdb0119d9234b27ed"];
    productModel.find.mockRejectedValue(dbError);

    await productFiltersController(req, res);

    expect(res.status).toHaveBeenCalledWith(StatusCodes.BAD_REQUEST);
    expect(res.send).toHaveBeenCalledWith({
      success: false,
      error: dbError.message,
      message: "Error filtering products.",
    });
  });

  it("should handle empty filters and return all products", async () => {
    const products = [
      { _id: "p1", name: "Product 1" },
      { _id: "p2", name: "Product 2" },
    ];
    productModel.find.mockResolvedValue(products);

    await productFiltersController(req, res);

    expect(productModel.find).toHaveBeenCalledWith({});
    expect(res.status).toHaveBeenCalledWith(StatusCodes.OK);
    expect(res.send).toHaveBeenCalledWith({
      success: true,
      products,
    });
  });
});

describe("Product Category Controller", () => {
  let req, res;

  beforeEach(() => {
    req = {
      params: {
        slug: "category-1",
      },
    };
    res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
    };

    jest.clearAllMocks();
  });

  it("should return 200 with products for a specific category", async () => {
    const category = {
      _id: "66db427fdb0119d9234b27ee",
      name: "Category 1",
      slug: "category-1",
    };
    const products = [
      { _id: "p1", name: "Product 1", category },
      { _id: "p2", name: "Product 2", category },
    ];
    categoryModel.findOne = jest.fn().mockResolvedValue(category);
    productModel.find = jest.fn().mockReturnValue({
      populate: jest.fn().mockResolvedValue(products),
    });

    await productCategoryController(req, res);

    expect(categoryModel.findOne).toHaveBeenCalledWith({
      slug: req.params.slug,
    });
    expect(productModel.find).toHaveBeenCalledWith({
      category,
    });
    expect(res.status).toHaveBeenCalledWith(StatusCodes.OK);
    expect(res.send).toHaveBeenCalledWith({
      success: true,
      category,
      products,
    });
  });

  it("should return empty products array when category exists but has no products", async () => {
    const category = {
      _id: "66db427fdb0119d9234b27ee",
      name: "Category 1",
      slug: "category-1",
    };
    const products = [];
    categoryModel.findOne = jest.fn().mockResolvedValue(category);
    productModel.find = jest.fn().mockReturnValue({
      populate: jest.fn().mockResolvedValue(products),
    });

    await productCategoryController(req, res);

    expect(categoryModel.findOne).toHaveBeenCalledWith({
      slug: req.params.slug,
    });
    expect(productModel.find).toHaveBeenCalledWith({
      category,
    });
    expect(res.status).toHaveBeenCalledWith(StatusCodes.OK);
    expect(res.send).toHaveBeenCalledWith({
      success: true,
      category,
      products: [],
    });
  });

  it("should handle case when category does not exist", async () => {
    const category = null;
    categoryModel.findOne = jest.fn().mockResolvedValue(category);
    productModel.find = jest.fn().mockReturnValue({
      populate: jest.fn().mockResolvedValue([]),
    });

    await productCategoryController(req, res);

    expect(categoryModel.findOne).toHaveBeenCalledWith({
      slug: req.params.slug,
    });
    expect(res.status).toHaveBeenCalledWith(StatusCodes.OK);
    expect(res.send).toHaveBeenCalledWith({
      success: true,
      category: null,
      products: [],
    });
  });

  it("should return 400 in case of error", async () => {
    const dbError = new Error("DB error");
    categoryModel.findOne = jest.fn().mockRejectedValue(dbError);

    await productCategoryController(req, res);

    expect(categoryModel.findOne).toHaveBeenCalledWith({
      slug: req.params.slug,
    });
    expect(res.status).toHaveBeenCalledWith(StatusCodes.BAD_REQUEST);
    expect(res.send).toHaveBeenCalledWith({
      success: false,
      error: dbError.message,
      message: "Error retrieving products by category.",
    });
  });
});

describe("Product Photo Controller", () => {
  let req, res;

  beforeEach(() => {
    req = {
      params: {
        pid: "66db427fdb0119d9234b27ed",
      },
    };
    res = {
      status: jest.fn().mockReturnThis(),
      set: jest.fn(),
      send: jest.fn(),
    };
    jest.clearAllMocks();
  });

  it("should return 200 with the product photo", async () => {
    const photoData = Buffer.from("test-image-data");
    const product = {
      photo: {
        data: photoData,
        contentType: "image/jpeg",
      },
    };
    productModel.findById = jest.fn().mockReturnValue({
      select: jest.fn().mockResolvedValue(product),
    });

    await productPhotoController(req, res);

    expect(productModel.findById).toHaveBeenCalledWith(req.params.pid);
    expect(res.set).toHaveBeenCalledWith("Content-type", "image/jpeg");
    expect(res.status).toHaveBeenCalledWith(StatusCodes.OK);
    expect(res.send).toHaveBeenCalledWith(photoData);
  });

  it("should handle the case when the product has no photo", async () => {
    const product = {
      photo: {
        data: null,
        contentType: "image/jpeg",
      },
    };
    productModel.findById = jest.fn().mockReturnValue({
      select: jest.fn().mockResolvedValue(product),
    });

    await productPhotoController(req, res);

    expect(productModel.findById).toHaveBeenCalledWith(req.params.pid);
    expect(res.set).not.toHaveBeenCalled();
    expect(res.send).not.toHaveBeenCalled();
  });

  it("should return 500 in case of error", async () => {
    const dbError = new Error("DB error");
    productModel.findById = jest.fn().mockReturnValue({
      select: jest.fn().mockRejectedValue(dbError),
    });

    await productPhotoController(req, res);

    expect(productModel.findById).toHaveBeenCalledWith(req.params.pid);
    expect(res.status).toHaveBeenCalledWith(StatusCodes.INTERNAL_SERVER_ERROR);
    expect(res.send).toHaveBeenCalledWith({
      success: false,
      error: dbError.message,
      message: "Error retrieving product photo.",
    });
  });
});

describe("Product Count Controller", () => {
  let req, res;

  beforeEach(() => {
    req = {};
    res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
    };
    jest.clearAllMocks();
  });

  it("should return 200 with the total product count", async () => {
    const total = 10;
    productModel.find = jest.fn().mockReturnValue({
      estimatedDocumentCount: jest.fn().mockResolvedValue(total),
    });

    await productCountController(req, res);

    expect(productModel.find).toHaveBeenCalledWith({});
    expect(res.status).toHaveBeenCalledWith(StatusCodes.OK);
    expect(res.send).toHaveBeenCalledWith({
      success: true,
      total,
    });
  });

  it("should return 200 when no products exist", async () => {
    const total = 0;
    productModel.find = jest.fn().mockReturnValue({
      estimatedDocumentCount: jest.fn().mockResolvedValue(total),
    });

    await productCountController(req, res);

    expect(productModel.find).toHaveBeenCalledWith({});
    expect(res.status).toHaveBeenCalledWith(StatusCodes.OK);
    expect(res.send).toHaveBeenCalledWith({
      success: true,
      total: 0,
    });
  });

  it("should return 400 in case of error", async () => {
    const dbError = new Error("DB error");
    productModel.find = jest.fn().mockReturnValue({
      estimatedDocumentCount: jest.fn().mockRejectedValue(dbError),
    });

    await productCountController(req, res);

    expect(productModel.find).toHaveBeenCalledWith({});
    expect(res.status).toHaveBeenCalledWith(StatusCodes.BAD_REQUEST);
    expect(res.send).toHaveBeenCalledWith({
      success: false,
      error: dbError.message,
      message: "Error retrieving product count.",
    });
  });
});

describe("Product List Controller", () => {
  let req, res;

  beforeEach(() => {
    req = {
      params: {},
    };
    res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
    };
    jest.clearAllMocks();
  });

  it("should return 200 with products for the first page when page param is not provided", async () => {
    const products = [
      { _id: "p1", name: "Product 1" },
      { _id: "p2", name: "Product 2" },
      { _id: "p3", name: "Product 3" },
      { _id: "p4", name: "Product 4" },
      { _id: "p5", name: "Product 5" },
      { _id: "p6", name: "Product 6" },
    ];
    productModel.find = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      sort: jest.fn().mockResolvedValue(products),
    });

    await productListController(req, res);

    expect(productModel.find).toHaveBeenCalledWith({});
    expect(res.status).toHaveBeenCalledWith(StatusCodes.OK);
    expect(res.send).toHaveBeenCalledWith({
      success: true,
      products,
    });
  });

  it("should return 200 with products for the specified page", async () => {
    req.params.page = "2";
    const products = [
      { _id: "p7", name: "Product 7" },
      { _id: "p8", name: "Product 8" },
      { _id: "p9", name: "Product 9" },
      { _id: "p10", name: "Product 10" },
      { _id: "p11", name: "Product 11" },
      { _id: "p12", name: "Product 12" },
    ];

    productModel.find = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      sort: jest.fn().mockResolvedValue(products),
    });

    await productListController(req, res);

    expect(productModel.find).toHaveBeenCalledWith({});
    expect(res.status).toHaveBeenCalledWith(StatusCodes.OK);
    expect(res.send).toHaveBeenCalledWith({
      success: true,
      products,
    });
  });

  it("should return 200 with empty array when no products exist for a page", async () => {
    req.params.page = "10";
    const products = [];
    productModel.find = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      sort: jest.fn().mockResolvedValue(products),
    });

    await productListController(req, res);

    expect(productModel.find).toHaveBeenCalledWith({});
    expect(res.status).toHaveBeenCalledWith(StatusCodes.OK);
    expect(res.send).toHaveBeenCalledWith({
      success: true,
      products: [],
    });
  });

  it("should return 400 in case of error", async () => {
    const dbError = new Error("DB error");
    productModel.find = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      sort: jest.fn().mockRejectedValue(dbError),
    });

    await productListController(req, res);

    expect(productModel.find).toHaveBeenCalledWith({});
    expect(res.status).toHaveBeenCalledWith(StatusCodes.BAD_REQUEST);
    expect(res.send).toHaveBeenCalledWith({
      success: false,
      error: dbError.message,
      message: "Error retrieving products by page.",
    });
  });
});

describe("Related Product Controller", () => {
  let req, res;

  beforeEach(() => {
    req = {
      params: {
        pid: "66db427fdb0119d9234b27ed",
        cid: "66db427fdb0119d9234b27ee",
      },
    };
    res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
    };
    jest.clearAllMocks();
  });

  it("should return 200 with related products", async () => {
    const products = [
      { _id: "p2", name: "Product 2", category: { name: "Category 1" } },
      { _id: "p3", name: "Product 3", category: { name: "Category 1" } },
      { _id: "p4", name: "Product 4", category: { name: "Category 1" } },
    ];

    productModel.find = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      populate: jest.fn().mockResolvedValue(products),
    });

    await relatedProductController(req, res);

    expect(productModel.find).toHaveBeenCalledWith({
      category: req.params.cid,
      _id: { $ne: req.params.pid },
    });
    expect(res.status).toHaveBeenCalledWith(StatusCodes.OK);
    expect(res.send).toHaveBeenCalledWith({
      success: true,
      products,
    });
  });

  it("should return 200 with empty array when no related products exist", async () => {
    const products = [];
    productModel.find = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      populate: jest.fn().mockResolvedValue(products),
    });

    await relatedProductController(req, res);

    expect(productModel.find).toHaveBeenCalledWith({
      category: req.params.cid,
      _id: { $ne: req.params.pid },
    });
    expect(res.status).toHaveBeenCalledWith(StatusCodes.OK);
    expect(res.send).toHaveBeenCalledWith({
      success: true,
      products: [],
    });
  });

  it("should return 400 in case of error", async () => {
    const dbError = new Error("DB error");
    productModel.find = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      populate: jest.fn().mockRejectedValue(dbError),
    });

    await relatedProductController(req, res);

    expect(productModel.find).toHaveBeenCalledWith({
      category: req.params.cid,
      _id: { $ne: req.params.pid },
    });
    expect(res.status).toHaveBeenCalledWith(StatusCodes.BAD_REQUEST);
    expect(res.send).toHaveBeenCalledWith({
      success: false,
      error: dbError.message,
      message: "Error retrieving related products.",
    });
  });
});

describe("Search Product Controller", () => {
  let req, res;

  beforeEach(() => {
    req = {
      params: {
        keyword: "test",
      },
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      send: jest.fn(),
    };
    jest.clearAllMocks();
  });

  it("should return products matching the keyword in name or description", async () => {
    const products = [
      { _id: "p1", name: "Test Product", description: "Normal description" },
      { _id: "p2", name: "Another Product", description: "Test description" },
    ];
    productModel.find.mockReturnValue({
      select: jest.fn().mockResolvedValue(products),
    });

    await searchProductController(req, res);

    expect(productModel.find).toHaveBeenCalledWith({
      $or: [
        { name: { $regex: "test", $options: "i" } },
        { description: { $regex: "test", $options: "i" } },
      ],
    });
    expect(res.json).toHaveBeenCalledWith(products);
  });

  it("should return empty array when no products match the search keyword", async () => {
    productModel.find.mockReturnValue({
      select: jest.fn().mockResolvedValue([]),
    });

    await searchProductController(req, res);

    expect(productModel.find).toHaveBeenCalledWith({
      $or: [
        { name: { $regex: "test", $options: "i" } },
        { description: { $regex: "test", $options: "i" } },
      ],
    });
    expect(res.json).toHaveBeenCalledWith([]);
  });

  it("should return 400 in case of error during search", async () => {
    const dbError = new Error("DB error");
    productModel.find.mockReturnValue({
      select: jest.fn().mockRejectedValue(dbError),
    });

    await searchProductController(req, res);

    expect(res.status).toHaveBeenCalledWith(StatusCodes.BAD_REQUEST);
    expect(res.send).toHaveBeenCalledWith({
      success: false,
      error: dbError.message,
      message: "Error searching products.",
    });
  });

  it("should handle special characters in search keyword", async () => {
    req.params.keyword = "special+chars?";
    const products = [
      {
        _id: "p1",
        name: "Product with special+chars?",
        description: "Description",
      },
    ];
    productModel.find.mockReturnValue({
      select: jest.fn().mockResolvedValue(products),
    });

    await searchProductController(req, res);

    expect(productModel.find).toHaveBeenCalledWith({
      $or: [
        { name: { $regex: "special+chars?", $options: "i" } },
        { description: { $regex: "special+chars?", $options: "i" } },
      ],
    });
    expect(res.json).toHaveBeenCalledWith(products);
  });
});
