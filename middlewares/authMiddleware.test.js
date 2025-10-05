import JWT from "jsonwebtoken";
import userModel from "../models/userModel.js";
import { requireSignIn, isAdmin } from "./authMiddleware.js";
import { StatusCodes } from "http-status-codes";

// Mock dependencies
jest.mock("jsonwebtoken");
jest.mock("../models/userModel.js");

describe("Authentication Middleware", () => {
  let mockReq, mockRes, mockNext;

  beforeEach(() => {
    mockReq = {
      headers: {},
      user: null,
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
    };
    mockNext = jest.fn();

    jest.clearAllMocks();
  });

  describe("requireSignIn", () => {
    it("should call next() when token is valid", async () => {
      // Arrange
      const mockUser = { _id: "123", email: "test@example.com" };
      mockReq.headers.authorization = "valid.token";
      JWT.verify.mockReturnValue(mockUser);

      // Act
      await requireSignIn(mockReq, mockRes, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it("should return 401 when authorization header is missing", async () => {
      // Act
      await requireSignIn(mockReq, mockRes, mockNext);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(StatusCodes.UNAUTHORIZED);
      expect(mockRes.send).toHaveBeenCalledWith({
        success: false,
        message: "Authorization header required",
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it("should return 401 when token is invalid", async () => {
      // Arrange
      mockReq.headers.authorization = "invalid.token";
      JWT.verify.mockImplementation(() => {
        throw new JWT.JsonWebTokenError("Invalid token");
      });

      // Act
      await requireSignIn(mockReq, mockRes, mockNext);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(StatusCodes.UNAUTHORIZED);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it("should return 401 when token is expired", async () => {
      // Arrange
      mockReq.headers.authorization = "expired.token";
      JWT.verify.mockImplementation(() => {
        throw new JWT.TokenExpiredError("Token expired");
      });

      // Act
      await requireSignIn(mockReq, mockRes, mockNext);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(StatusCodes.UNAUTHORIZED);
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe("isAdmin", () => {
    beforeEach(() => {
      mockReq.user = { _id: "user123" };
    });

    it("should call next() when user is admin", async () => {
      // Arrange
      userModel.findById.mockResolvedValue({ _id: "user123", role: 1 });

      // Act
      await isAdmin(mockReq, mockRes, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it("should return 403 when user is not admin", async () => {
      // Arrange
      userModel.findById.mockResolvedValue({ _id: "user123", role: 0 });

      // Act
      await isAdmin(mockReq, mockRes, mockNext);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(StatusCodes.FORBIDDEN);
      expect(mockRes.send).toHaveBeenCalledWith({
        success: false,
        message: "Insufficient permissions. Admin access required.",
      });
    });

    it("should return 401 when user is not authenticated", async () => {
      // Arrange
      mockReq.user = null;

      // Act
      await isAdmin(mockReq, mockRes, mockNext);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(StatusCodes.UNAUTHORIZED);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it("should return 404 when user not found in database", async () => {
      // Arrange
      userModel.findById.mockResolvedValue(null);

      // Act
      await isAdmin(mockReq, mockRes, mockNext);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(StatusCodes.NOT_FOUND);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it("should return 500 when database error occurs", async () => {
      // Arrange
      userModel.findById.mockRejectedValue(new Error("DB error"));

      // Act
      await isAdmin(mockReq, mockRes, mockNext);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(
        StatusCodes.INTERNAL_SERVER_ERROR
      );
      expect(mockNext).not.toHaveBeenCalled();
    });
  });
});
