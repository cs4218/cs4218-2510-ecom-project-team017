import mongoose from "mongoose";
import { ORDER_STATUS } from "../constants/orderConstants.js";

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
      default: ORDER_STATUS.NOT_PROCESSED,
      enum: ORDER_STATUS,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Order", orderSchema);
