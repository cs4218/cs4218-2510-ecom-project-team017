import userModel from "../models/userModel.js";
import orderModel from "../models/orderModel.js";

import { comparePassword, hashPassword } from "./../helpers/authHelper.js";
import JWT from "jsonwebtoken";
import { StatusCodes } from 'http-status-codes';

export const registerController = async (req, res) => {
  try {
    const { name, email, password, phone, address, answer } = req.body;

    // Validations
    if (!name) {
      return res.status(StatusCodes.BAD_REQUEST).send({
        success: false,
        message: "Name is required",
        error: "Name is required"
      });
    }
    if (!email) {
      return res.status(StatusCodes.BAD_REQUEST).send({
        success: false,
        message: "Email is required",
        error: "Email is required"
      });
    }
    if (!password) {
      return res.status(StatusCodes.BAD_REQUEST).send({
        success: false,
        message: "Password is required",
        error: "Password is required"
      });
    }
    if (!phone) {
      return res.status(StatusCodes.BAD_REQUEST).send({
        success: false,
        message: "Phone number is required",
        error: "Phone number is required"
      });
    }
    if (!address) {
      return res.status(StatusCodes.BAD_REQUEST).send({
        success: false,
        message: "Address is required",
        error: "Address is required"
      });
    }
    if (!answer) {
      return res.status(StatusCodes.BAD_REQUEST).send({
        success: false,
        message: "Security answer is required",
        error: "Security answer is required"
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
        updatedAt: user.updatedAt
      },
    });
  } catch (error) {
    console.error("Registration error:", error);

    res.status(StatusCodes.INTERNAL_SERVER_ERROR).send({
      success: false,
      message: "Error in registration process",
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
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
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
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
        error: "Email is required"
      });
    }
    if (!answer) {
      return res.status(StatusCodes.BAD_REQUEST).send({
        success: false,
        message: "Security answer is required",
        error: "Security answer is required"
      });
    }
    if (!newPassword) {
      return res.status(StatusCodes.BAD_REQUEST).send({
        success: false,
        message: "New password is required",
        error: "New password is required"
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
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
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

//update prfole
export const updateProfileController = async (req, res) => {
  try {
    const { name, email, password, address, phone } = req.body;
    const user = await userModel.findById(req.user._id);
    //password
    if (password && password.length < 6) {
      return res.json({ error: "Passsword is required and 6 character long" });
    }
    const hashedPassword = password ? await hashPassword(password) : undefined;
    const updatedUser = await userModel.findByIdAndUpdate(
      req.user._id,
      {
        name: name || user.name,
        password: hashedPassword || user.password,
        phone: phone || user.phone,
        address: address || user.address,
      },
      { new: true }
    );
    res.status(200).send({
      success: true,
      message: "Profile Updated SUccessfully",
      updatedUser,
    });
  } catch (error) {
    console.log(error);
    res.status(400).send({
      success: false,
      message: "Error WHile Update profile",
      error,
    });
  }
};

//orders
export const getOrdersController = async (req, res) => {
  try {
    const orders = await orderModel
      .find({ buyer: req.user._id })
      .populate("products", "-photo")
      .populate("buyer", "name");
    res.json(orders);
  } catch (error) {
    console.log(error);
    res.status(500).send({
      success: false,
      message: "Error WHile Geting Orders",
      error,
    });
  }
};
//orders
export const getAllOrdersController = async (req, res) => {
  try {
    const orders = await orderModel
      .find({})
      .populate("products", "-photo")
      .populate("buyer", "name")
      .sort({ createdAt: "-1" });
    res.json(orders);
  } catch (error) {
    console.log(error);
    res.status(500).send({
      success: false,
      message: "Error WHile Geting Orders",
      error,
    });
  }
};

//order status
export const orderStatusController = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;
    const orders = await orderModel.findByIdAndUpdate(
      orderId,
      { status },
      { new: true }
    );
    res.json(orders);
  } catch (error) {
    console.log(error);
    res.status(500).send({
      success: false,
      message: "Error While Updateing Order",
      error,
    });
  }
};