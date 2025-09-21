import userModel from "../models/userModel.js";
import orderModel from "../models/orderModel.js";

import { comparePassword, hashPassword } from "./../helpers/authHelper.js";
import JWT from "jsonwebtoken";
import { StatusCodes } from "http-status-codes";
import { ORDER_STATUS_OPTIONS } from "../constants/orderConstants.js";

export const registerController = async (req, res) => {
  try {
    const { name, email, password, phone, address, answer } = req.body;

    // Validations
    if (!name) {
      return res.status(StatusCodes.BAD_REQUEST).send({
        success: false,
        message: "Name is required",
        error: "Name is required",
      });
    }
    if (!email) {
      return res.status(StatusCodes.BAD_REQUEST).send({
        success: false,
        message: "Email is required",
        error: "Email is required",
      });
    }
    if (!password) {
      return res.status(StatusCodes.BAD_REQUEST).send({
        success: false,
        message: "Password is required",
        error: "Password is required",
      });
    }
    if (!phone) {
      return res.status(StatusCodes.BAD_REQUEST).send({
        success: false,
        message: "Phone number is required",
        error: "Phone number is required",
      });
    }
    if (!address) {
      return res.status(StatusCodes.BAD_REQUEST).send({
        success: false,
        message: "Address is required",
        error: "Address is required",
      });
    }
    if (!answer) {
      return res.status(StatusCodes.BAD_REQUEST).send({
        success: false,
        message: "Security answer is required",
        error: "Security answer is required",
      });
    }

    // Check if user already exists
    const existingUser = await userModel.findOne({ email });

    if (existingUser) {
      return res.status(StatusCodes.CONFLICT).send({
        success: false,
        message: "User already registered. Please login.",
      });
    }

    // Register user
    const hashedPassword = await hashPassword(password);

    const user = await new userModel({
      name,
      email,
      phone,
      address,
      password: hashedPassword,
      answer,
    }).save();

    res.status(StatusCodes.CREATED).send({
      success: true,
      message: "User registered successfully",
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        address: user.address,
        role: user.role,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    });
  } catch (error) {
    console.error("Registration error:", error);

    res.status(StatusCodes.INTERNAL_SERVER_ERROR).send({
      success: false,
      message: "Error in registration process",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Internal server error",
    });
  }
};

// POST LOGIN
export const loginController = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(StatusCodes.BAD_REQUEST).send({
        success: false,
        message: "Email and password are required",
      });
    }

    // Check user
    const user = await userModel.findOne({ email });
    if (!user) {
      return res.status(StatusCodes.UNAUTHORIZED).send({
        success: false,
        message: "Invalid email or password", // Generic message for security
      });
    }

    // Compare password
    const match = await comparePassword(password, user.password);
    if (!match) {
      return res.status(StatusCodes.UNAUTHORIZED).send({
        success: false,
        message: "Invalid email or password", // Generic message for security
      });
    }

    // Generate token
    const token = JWT.sign({ _id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    res.status(StatusCodes.OK).send({
      success: true,
      message: "Login successful",
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        address: user.address,
        role: user.role,
      },
      token,
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).send({
      success: false,
      message: "Error during login process",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Internal server error",
    });
  }
};

// FORGOT PASSWORD CONTROLLER
export const forgotPasswordController = async (req, res) => {
  try {
    const { email, answer, newPassword } = req.body;

    // Validation with proper error returns
    if (!email) {
      return res.status(StatusCodes.BAD_REQUEST).send({
        success: false,
        message: "Email is required",
        error: "Email is required",
      });
    }
    if (!answer) {
      return res.status(StatusCodes.BAD_REQUEST).send({
        success: false,
        message: "Security answer is required",
        error: "Security answer is required",
      });
    }
    if (!newPassword) {
      return res.status(StatusCodes.BAD_REQUEST).send({
        success: false,
        message: "New password is required",
        error: "New password is required",
      });
    }

    // Check user with email and answer
    const user = await userModel.findOne({ email, answer });
    if (!user) {
      return res.status(StatusCodes.UNAUTHORIZED).send({
        success: false,
        message: "Invalid email or security answer",
      });
    }

    // Hash new password and update
    const hashed = await hashPassword(newPassword);
    await userModel.findByIdAndUpdate(user._id, { password: hashed });

    res.status(StatusCodes.OK).send({
      success: true,
      message: "Password reset successfully",
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).send({
      success: false,
      message: "Error during password reset process",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Internal server error",
    });
  }
};

//test controller
export const testController = (req, res) => {
  try {
    res.send("Protected Routes");
  } catch (error) {
    console.log(error);
    res.send({ error });
  }
};

// Update profile controller
export const updateProfileController = async (req, res) => {
  try {
    const { name, password, address, phone } = req.body;

    // Validate user ID exists
    if (!req.user || !req.user._id) {
      return res.status(StatusCodes.UNAUTHORIZED).json({
        success: false,
        message: "User ID not found in request",
        error: "User ID not found in request",
      });
    }

    const user = await userModel.findById(req.user._id);

    if (!user) {
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: "User not found",
        error: "User not found",
      });
    }

    // Validate password
    if (password && password.length < 6) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: "Password is required and should be at least 6 characters",
        error: "Password is required and should be at least 6 characters",
      });
    }

    const hashedPassword = password ? await hashPassword(password) : undefined;
    const updatedUser = await userModel
      .findByIdAndUpdate(
        req.user._id,
        {
          name: name || user.name,
          password: hashedPassword || user.password,
          phone: phone || user.phone,
          address: address || user.address,
        },
        { new: true }
      )
      .select("-password"); // Exclude password from response for security

    res.status(StatusCodes.OK).json({
      success: true,
      message: "Profile updated successfully",
      updatedUser,
    });
  } catch (error) {
    console.log(error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Error while updating profile",
      error: error.message,
    });
  }
};

// Get orders controller
export const getOrdersController = async (req, res) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(StatusCodes.UNAUTHORIZED).json({
        success: false,
        message: "User ID not found in request",
        error: "User ID not found in request",
      });
    }

    const orders = await orderModel
      .find({ buyer: req.user._id })
      .populate("products", "-photo")
      .populate("buyer", "name")
      .sort({ createdAt: -1 });

    res.status(StatusCodes.OK).json(orders);
  } catch (error) {
    console.log(error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Error while getting orders",
      error: error.message,
    });
  }
};

// Get all orders controller
export const getAllOrdersController = async (req, res) => {
  try {
    const orders = await orderModel
      .find({})
      .populate("products", "-photo")
      .populate("buyer", "name")
      .sort({ createdAt: -1 });

    res.status(StatusCodes.OK).json(orders);
  } catch (error) {
    console.log(error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Error while getting orders",
      error: error.message,
    });
  }
};

// Order status controller
export const orderStatusController = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;

    if (!orderId) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: "Order ID is required",
        error: "Order ID is required",
      });
    }

    if (!status) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: "Status is required",
        error: "Status is required",
      });
    }

    // Validate status value
    if (!ORDER_STATUS_OPTIONS.includes(status)) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: "Invalid status value",
        error: `Status must be one of: ${ORDER_STATUS_OPTIONS.join(", ")}`,
      });
    }

    const order = await orderModel
      .findByIdAndUpdate(orderId, { status }, { new: true })
      .populate("products", "-photo")
      .populate("buyer", "name");

    if (!order) {
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: "Order not found",
        error: "Order not found",
      });
    }

    res.status(StatusCodes.OK).json({
      success: true,
      message: "Order status updated successfully",
      order,
    });
  } catch (error) {
    console.log(error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Error while updating order status",
      error: error.message,
    });
  }
};
