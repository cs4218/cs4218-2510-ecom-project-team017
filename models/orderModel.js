import mongoose from "mongoose";
import { ORDER_STATUS_OPTIONS } from "../constants/orderConstants.js";

const orderSchema = new mongoose.Schema(
  {
    products: [
      {
        type: mongoose.ObjectId,
        ref: "Products",
      },
    ],
    payment: {},
    buyer: {
      type: mongoose.ObjectId,
      ref: "users",
    },
    status: {
      type: String,
      default: ORDER_STATUS_OPTIONS.NOT_PROCESSED,
      enum: ORDER_STATUS_OPTIONS,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Order", orderSchema);
