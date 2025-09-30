import JWT from "jsonwebtoken";
import userModel from "../models/userModel.js";
import { StatusCodes } from 'http-status-codes';

// Protected routes token base
export const requireSignIn = async (req, res, next) => {
    try {
        // Check if authorization header exists
        if (!req.headers.authorization) {
            return res.status(StatusCodes.UNAUTHORIZED).send({
                success: false,
                message: "Authorization header required",
            });
        }

        const decode = JWT.verify(
            req.headers.authorization,
            process.env.JWT_SECRET
        );
        req.user = decode;
        next();
    } catch (error) {
        console.log(error);

        // Differentiate between token types for better error messages
        if (error.name === 'TokenExpiredError') {
            return res.status(StatusCodes.UNAUTHORIZED).send({
                success: false,
                message: "Token expired",
            });
        } else if (error.name === 'JsonWebTokenError') {
            return res.status(StatusCodes.UNAUTHORIZED).send({
                success: false,
                message: "Invalid token",
            });
        }

        res.status(StatusCodes.UNAUTHORIZED).send({
            success: false,
            message: "Authentication failed",
        });
    }
};

//admin access
export const isAdmin = async (req, res, next) => {
    try {
        // Check if user exists in request (from requireSignIn)
        if (!req.user || !req.user._id) {
            return res.status(StatusCodes.UNAUTHORIZED).send({
                success: false,
                message: "Authentication required",
            });
        }

        const user = await userModel.findById(req.user._id);

        // User not found in database
        if (!user) {
            return res.status(StatusCodes.NOT_FOUND).send({
                success: false,
                message: "User not found",
            });
        }

        // Check admin role
        if (user.role !== 1) {
            return res.status(StatusCodes.FORBIDDEN).send({ // Changed to 403
                success: false,
                message: "Insufficient permissions. Admin access required.",
            });
        }

        next();
    } catch (error) {
        console.log(error);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).send({ // Changed to 500
            success: false,
            message: "Internal server error in admin verification",
        });
    }
};