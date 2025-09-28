import jwt from "jsonwebtoken";
import {
  registerController,
  loginController,
  forgotPasswordController,
  updateProfileController,
  getOrdersController,
  getAllOrdersController,
  orderStatusController,
} from "../controllers/authController.js";
import userModel from "../models/userModel.js";
import orderModel from "../models/orderModel.js";
import { hashPassword, comparePassword } from "../helpers/authHelper.js";
import { StatusCodes } from "http-status-codes";

// Mock all dependencies
jest.mock("../models/userModel");
jest.mock("../models/orderModel");
jest.mock("../helpers/authHelper");
jest.mock("jsonwebtoken");
jest.mock("../constants/orderConstants.js", () => ({
  ORDER_STATUS_OPTIONS: [
    "Not Processed",
    "Processing",
    "Shipped",
    "Delivered",
    "Cancelled",
  ],
}));

describe("Auth Controllers - Basic Unit Tests", () => {
  let req, res;

  beforeEach(() => {
    jest.clearAllMocks();
    req = { body: {} };
    res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
    };
  });

  // Test 1: Register Controller - Missing Fields
  test("registerController should return error for missing name", async () => {
    req.body = { email: "test@test.com", password: "123" };
    await registerController(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: expect.any(String),
      })
    );
  });

  // Test 2: Register Controller - Success
  test("registerController should create user successfully", async () => {
    req.body = {
      name: "John",
      email: "test@test.com",
      password: "123",
      phone: "1234567890",
      address: "Test St",
      answer: "Test Answer",
    };

    userModel.findOne.mockResolvedValue(null);
    hashPassword.mockResolvedValue("hashed123");
    userModel.prototype.save = jest.fn().mockResolvedValue({
      _id: "1",
      name: "John",
      email: "test@test.com",
    });

    await registerController(req, res);

    expect(hashPassword).toHaveBeenCalledWith("123");
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.send).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        message: "User registered successfully",
      })
    );
  });

  // Test 3: Login Controller - Invalid Credentials
  test("loginController should reject invalid password", async () => {
    req.body = { email: "test@test.com", password: "wrong" };

    userModel.findOne.mockResolvedValue({
      _id: "1",
      email: "test@test.com",
      password: "hashed123",
    });
    comparePassword.mockResolvedValue(false);

    await loginController(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.send).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: "Invalid email or password",
      })
    );
  });

  // Test 4: Login Controller - Success
  test("loginController should login successfully", async () => {
    req.body = { email: "test@test.com", password: "correct" };

    userModel.findOne.mockResolvedValue({
      _id: "1",
      name: "John",
      email: "test@test.com",
      password: "hashed123",
      phone: "1234567890",
      address: "Test St",
      role: "user",
    });
    comparePassword.mockResolvedValue(true);
    jwt.sign.mockReturnValue("fake-token-123");

    await loginController(req, res);

    expect(jwt.sign).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        token: "fake-token-123",
      })
    );
  });

  // Test 5: Forgot Password - Missing Email
  test("forgotPasswordController should require email", async () => {
    req.body = { answer: "test", newPassword: "new123" };
    await forgotPasswordController(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  // Test 6: Forgot Password - Success
  test("forgotPasswordController should reset password", async () => {
    req.body = {
      email: "test@test.com",
      answer: "correct-answer",
      newPassword: "new123",
    };

    userModel.findOne.mockResolvedValue({
      _id: "1",
      email: "test@test.com",
      answer: "correct-answer",
    });
    hashPassword.mockResolvedValue("hashed-new-123");
    userModel.findByIdAndUpdate = jest.fn().mockResolvedValue({});

    await forgotPasswordController(req, res);

    expect(hashPassword).toHaveBeenCalledWith("new123");
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        message: "Password reset successfully",
      })
    );
  });

  // Test 7: Error Handling
  test("should handle database errors", async () => {
    req.body = {
      name: "John",
      email: "test@test.com",
      password: "123",
      phone: "1234567890",
      address: "Test St",
      answer: "Test Answer",
    };

    userModel.findOne.mockRejectedValue(new Error("DB Connection failed"));
    await registerController(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe("Update profile controller", () => {
  let req, res;

  beforeEach(() => {
    jest.clearAllMocks();
    req = {
      body: {},
      user: { _id: "user123" },
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
  });

  const mockExistingUser = {
    _id: "user123",
    name: "John Doe",
    email: "john@example.com",
    phone: "12345678",
    address: "123 Example Street",
    password: "hashedOldPassword",
  };

  beforeEach(() => {
    userModel.findById.mockResolvedValue(mockExistingUser);
  });

  // Test case 1: Handle missing user authentication
  it("should reject request without user authentication", async () => {
    req.user = null;

    await updateProfileController(req, res);

    expect(res.status).toHaveBeenCalledWith(StatusCodes.UNAUTHORIZED);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "User ID not found in request",
      error: "User ID not found in request",
    });
  });

  // Test case 2: User not found in database
  test("should handle user not found in database", async () => {
    userModel.findById.mockResolvedValue(null);
    req.body = { name: "Updated Name" };

    await updateProfileController(req, res);

    expect(res.status).toHaveBeenCalledWith(StatusCodes.NOT_FOUND);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "User not found",
      error: "User not found",
    });
  });

  // Test case 3: Successful profile update with all fields
  it("should update profile successfully with all fields", async () => {
    req.body = {
      name: "Jane Doe",
      password: "newPassword123",
      address: "456 New Address",
      phone: "87654321",
    };

    const hashedNewPassword = "hashedNewPassword123";
    const updatedUserData = {
      _id: "user123",
      name: "Jane Doe",
      phone: "87654321",
      address: "456 New Address",
      email: "john@example.com",
    };

    hashPassword.mockResolvedValue(hashedNewPassword);
    userModel.findByIdAndUpdate.mockReturnValue({
      select: jest.fn().mockResolvedValue(updatedUserData),
    });

    await updateProfileController(req, res);

    expect(hashPassword).toHaveBeenCalledWith("newPassword123");
    expect(userModel.findByIdAndUpdate).toHaveBeenCalledWith(
      "user123",
      {
        name: "Jane Doe",
        password: hashedNewPassword,
        phone: "87654321",
        address: "456 New Address",
      },
      { new: true }
    );
    expect(res.status).toHaveBeenCalledWith(StatusCodes.OK);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: "Profile updated successfully",
      updatedUser: updatedUserData,
    });
  });

  // Test case 4: Handle update with only name and phone
  it("should update profile with only name and phone", async () => {
    req.body = {
      name: "Updated Name",
      phone: "61234567",
    };

    const updatedUserData = {
      _id: "user123",
      name: "Updated Name",
      phone: "61234567",
      address: mockExistingUser.address,
      email: mockExistingUser.email,
    };

    userModel.findByIdAndUpdate.mockReturnValue({
      select: jest.fn().mockResolvedValue(updatedUserData),
    });

    await updateProfileController(req, res);

    expect(hashPassword).not.toHaveBeenCalled();
    expect(userModel.findByIdAndUpdate).toHaveBeenCalledWith(
      "user123",
      {
        name: "Updated Name",
        password: mockExistingUser.password,
        phone: "61234567",
        address: mockExistingUser.address,
      },
      { new: true }
    );
    expect(res.status).toHaveBeenCalledWith(StatusCodes.OK);
  });

  // Test case 5: Handle password validation
  it("should reject password shorter than 6 characters", async () => {
    req.body = {
      password: "123",
    };

    await updateProfileController(req, res);

    expect(res.status).toHaveBeenCalledWith(StatusCodes.BAD_REQUEST);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Password is required and should be at least 6 characters",
      error: "Password is required and should be at least 6 characters",
    });
    expect(userModel.findByIdAndUpdate).not.toHaveBeenCalled();
  });

  // Test case 6: Valid minimum password length
  it("should accept password exactly 6 characters long", async () => {
    req.body = {
      password: "123456",
    };

    const hashedPassword = "hashed123456";
    hashPassword.mockResolvedValue(hashedPassword);
    userModel.findByIdAndUpdate.mockReturnValue({
      select: jest.fn().mockResolvedValue(mockExistingUser),
    });

    await updateProfileController(req, res);

    expect(hashPassword).toHaveBeenCalledWith("123456");
    expect(res.status).toHaveBeenCalledWith(StatusCodes.OK);
  });

  // Test case 7: Database error handling
  it("should handle database errors during update", async () => {
    req.body = { name: "Test User" };
    const databaseError = new Error("Database connection failed");
    userModel.findByIdAndUpdate.mockImplementation(() => {
      throw databaseError;
    });

    await updateProfileController(req, res);

    expect(res.status).toHaveBeenCalledWith(StatusCodes.INTERNAL_SERVER_ERROR);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Error while updating profile",
      error: databaseError.message,
    });
  });
});

describe("Get orders controlller", () => {
  let req, res;

  beforeEach(() => {
    jest.clearAllMocks();
    req = {
      user: { _id: "user123" },
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
  });

  // Test case 1: Handle missing user authentication
  it("should reject request without user authentication", async () => {
    req.user = null;

    await getOrdersController(req, res);

    expect(res.status).toHaveBeenCalledWith(StatusCodes.UNAUTHORIZED);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "User ID not found in request",
      error: "User ID not found in request",
    });
  });

  // Test case 2: Handle successful retrieve user orders
  it("should retrieve orders successfully", async () => {
    const mockOrders = [
      {
        _id: "order1",
        products: [{ _id: "product1", name: "Product 1", price: 25.99 }],
        buyer: { _id: "user123", name: "John Doe" },
        status: "Processing",
        createdAt: "2025-01-15T10:30:00Z",
      },
      {
        _id: "order2",
        products: [{ _id: "product2", name: "Product 2", price: 39.99 }],
        buyer: { _id: "user123", name: "John Doe" },
        status: "Shipped",
        createdAt: "2025-01-10T14:20:00Z",
      },
    ];

    const mockQuery = {
      populate: jest.fn().mockReturnThis(),
      sort: jest.fn().mockResolvedValue(mockOrders),
    };
    orderModel.find.mockReturnValue(mockQuery);

    await getOrdersController(req, res);

    expect(orderModel.find).toHaveBeenCalledWith({ buyer: "user123" });
    expect(mockQuery.populate).toHaveBeenCalledWith("products", "-photo");
    expect(mockQuery.populate).toHaveBeenCalledWith("buyer", "name");
    expect(mockQuery.sort).toHaveBeenCalledWith({ createdAt: -1 });
    expect(res.status).toHaveBeenCalledWith(StatusCodes.OK);
    expect(res.json).toHaveBeenCalledWith(mockOrders);
  });

  // Test case 3: Handle database error handling
  it("should handle database errors when retrieving orders", async () => {
    const databaseError = new Error("Database query failed");
    orderModel.find.mockImplementation(() => {
      throw databaseError;
    });

    await getOrdersController(req, res);

    expect(res.status).toHaveBeenCalledWith(StatusCodes.INTERNAL_SERVER_ERROR);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Error while getting orders",
      error: databaseError.message,
    });
  });
});

describe("Get all orders controller", () => {
  let req, res;

  beforeEach(() => {
    jest.clearAllMocks();
    req = {};
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
  });

  // Test case 1: Handle retrieve all orders successfully
  it("should retrieve all orders with proper sorting", async () => {
    const mockAllOrders = [
      {
        _id: "order1",
        products: [{ _id: "product1", name: "Product 1" }],
        buyer: { _id: "user1", name: "John Doe" },
        status: "Processing",
        createdAt: "2025-01-15T10:30:00Z",
      },
      {
        _id: "order2",
        products: [{ _id: "product2", name: "Product 2" }],
        buyer: { _id: "user2", name: "Jane Doe" },
        status: "Delivered",
        createdAt: "2025-01-14T15:45:00Z",
      },
    ];

    const mockQuery = {
      populate: jest.fn().mockReturnThis(),
      sort: jest.fn().mockResolvedValue(mockAllOrders),
    };
    orderModel.find.mockReturnValue(mockQuery);

    await getAllOrdersController(req, res);

    expect(orderModel.find).toHaveBeenCalledWith({});
    expect(mockQuery.populate).toHaveBeenCalledWith("products", "-photo");
    expect(mockQuery.populate).toHaveBeenCalledWith("buyer", "name");
    expect(mockQuery.sort).toHaveBeenCalledWith({ createdAt: -1 });
    expect(res.status).toHaveBeenCalledWith(StatusCodes.OK);
    expect(res.json).toHaveBeenCalledWith(mockAllOrders);
  });

  // Test case 2: Handle database error handling
  it("should handle database errors when retrieving all orders", async () => {
    const databaseError = new Error("Query failed");
    orderModel.find.mockImplementation(() => {
      throw databaseError;
    });

    await getAllOrdersController(req, res);

    expect(res.status).toHaveBeenCalledWith(StatusCodes.INTERNAL_SERVER_ERROR);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Error while getting orders",
      error: databaseError.message,
    });
  });
});

describe("Order status controller", () => {
  let req, res;

  beforeEach(() => {
    jest.clearAllMocks();
    req = {
      params: { orderId: "order123" },
      body: { status: "Shipped" },
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
  });

  // Test case 1: Handle missing order ID
  it("should reject request without order ID", async () => {
    req.params = {};

    await orderStatusController(req, res);

    expect(res.status).toHaveBeenCalledWith(StatusCodes.BAD_REQUEST);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Order ID is required",
      error: "Order ID is required",
    });
  });

  // Test case 2: Handle missing status
  it("should reject request without status", async () => {
    req.body = {};

    await orderStatusController(req, res);

    expect(res.status).toHaveBeenCalledWith(StatusCodes.BAD_REQUEST);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Status is required",
      error: "Status is required",
    });
  });

  // Test case 3: Handle invalid status value
  it("should reject invalid status value", async () => {
    req.body.status = "InvalidStatus";

    await orderStatusController(req, res);

    expect(res.status).toHaveBeenCalledWith(StatusCodes.BAD_REQUEST);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Invalid status value",
      error:
        "Status must be one of: Not Processed, Processing, Shipped, Delivered, Cancelled",
    });
  });

  // Test case 4: Handle successful status update
  it("should update order status successfully", async () => {
    const updatedOrder = {
      _id: "order123",
      status: "Shipped",
      products: [{ _id: "product1", name: "Product 1" }],
      buyer: { _id: "user123", name: "John Doe" },
      updatedAt: "2024-01-15T12:00:00Z",
    };

    const mockQuery = {
      populate: jest.fn().mockReturnThis(),
      then: jest.fn((resolve) => resolve(updatedOrder)),
    };

    orderModel.findByIdAndUpdate.mockReturnValue(mockQuery);

    await orderStatusController(req, res);

    expect(orderModel.findByIdAndUpdate).toHaveBeenCalledWith(
      "order123",
      { status: "Shipped" },
      { new: true }
    );
    expect(mockQuery.populate).toHaveBeenNthCalledWith(1, "products", "-photo");
    expect(mockQuery.populate).toHaveBeenNthCalledWith(2, "buyer", "name");

    expect(res.status).toHaveBeenCalledWith(StatusCodes.OK);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: "Order status updated successfully",
      order: updatedOrder,
    });
  });

  // Test case 5: Handle database error during update
  it("should handle database errors during status update", async () => {
    const databaseError = new Error("Update operation failed");
    orderModel.findByIdAndUpdate.mockImplementation(() => {
      throw databaseError;
    });

    await orderStatusController(req, res);

    expect(res.status).toHaveBeenCalledWith(StatusCodes.INTERNAL_SERVER_ERROR);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Error while updating order status",
      error: databaseError.message,
    });
  });
});
