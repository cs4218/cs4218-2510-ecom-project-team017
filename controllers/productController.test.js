import braintree from "braintree";
import { StatusCodes } from "http-status-codes";
import {
  braintreePaymentController,
  braintreeTokenController,
  createProductController,
  updateProductController,
  deleteProductController,
  getSingleProductController,
  productFiltersController,
  searchProductController,
} from "./productController.js";
import orderModel from "../models/orderModel.js";
import fs from "fs";
import slugify from "slugify";
import productModel from "../models/productModel.js";

/**
 * Mock the Braintree SDK to simulate payment gateway interactions
 */
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

/**
 * Mock the Order model
 */
jest.mock("../models/orderModel", () => {
  return jest.fn().mockImplementation(() => ({
    save: jest.fn().mockResolvedValue({ _id: "test-order-id" }),
  }));
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

/**
 * Mock dependencies
 */
jest.mock("../models/productModel");
jest.mock("fs");
jest.mock("slugify", () =>
  jest.fn((name) => name.toLowerCase().replace(/\s+/g, "-"))
);

const error = new Error("DB error");
const logSpy = jest.spyOn(console, "log").mockImplementation(() => {});

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

    // Mock fs.readFileSync
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
    expect(res.status).toHaveBeenCalledWith(201);
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
    expect(res.status).toHaveBeenCalledWith(201);
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

    expect(res.status).toHaveBeenCalledWith(500); 
    expect(res.send).toHaveBeenCalledWith({ error: "Name is required." });
  });

  it("should return 500 if description is missing", async () => {
    req.fields.description = "";

    await createProductController(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith({
      error: "Description is required.",
    });
  });

  it("should return 500 if price is missing", async () => {
    req.fields.price = "";

    await createProductController(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith({ error: "Price is required." });
  });

  it("should return 500 if category is missing", async () => {
    req.fields.category = "";

    await createProductController(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith({ error: "Category is required." });
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
    expect(res.status).toHaveBeenCalledWith(201);
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

    expect(res.status).toHaveBeenCalledWith(500); 
    expect(res.send).toHaveBeenCalledWith({ error: "Name is required." });
  });

  it("should return 500 if description is missing", async () => {
    req.fields.description = "";

    await createProductController(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith({
      error: "Description is required.",
    });
  });

  it("should return 500 if price is missing", async () => {
    req.fields.price = "";

    await createProductController(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith({ error: "Price is required." });
  });

  it("should return 500 if category is missing", async () => {
    req.fields.category = "";

    await createProductController(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith({ error: "Category is required." });
  });

  it("should return 500 if quantity is missing", async () => {
    req.fields.quantity = "";

    await createProductController(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith({ error: "Quantity is required." });
  });

  it("should return 500 if photo size is too large", async () => {
    req.files.photo.size = 1500000; // Larger than 1MB limit

    await createProductController(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith({
      error: "Photo is required and must be less than 1MB.",
    });
  });

  it("should return 500 in case of database error", async () => {
    productModel.mockImplementation(() => ({
      photo: {
        data: null,
        contentType: null,
      },
      save: jest.fn().mockRejectedValue(error),
    }));

    await createProductController(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith({
      success: false,
      error,
      message: "Error creating product.",
    });
  });
});
