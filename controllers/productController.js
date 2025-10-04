import productModel from "../models/productModel.js";
import categoryModel from "../models/categoryModel.js";
import orderModel from "../models/orderModel.js";

import fs from "fs";
import slugify from "slugify";
import braintree from "braintree";
import dotenv from "dotenv";
import { StatusCodes, ReasonPhrases } from "http-status-codes";

dotenv.config();

// payment gateway
var gateway = new braintree.BraintreeGateway({
  environment: braintree.Environment.Sandbox,
  merchantId: process.env.BRAINTREE_MERCHANT_ID,
  publicKey: process.env.BRAINTREE_PUBLIC_KEY,
  privateKey: process.env.BRAINTREE_PRIVATE_KEY,
});

// create product
export const createProductController = async (req, res) => {
  try {
    const { name, description, price, category, quantity, shipping } =
      req.fields;
    const { photo } = req.files;

    // validation
    switch (true) {
      case !name:
        return res
          .status(StatusCodes.INTERNAL_SERVER_ERROR)
          .send({ error: "Name is required." });
      case !description:
        return res
          .status(StatusCodes.INTERNAL_SERVER_ERROR)
          .send({ error: "Description is required." });
      case !price:
        return res
          .status(StatusCodes.INTERNAL_SERVER_ERROR)
          .send({ error: "Price is required." });
      case !category:
        return res
          .status(StatusCodes.INTERNAL_SERVER_ERROR)
          .send({ error: "Category is required." });
      case !quantity:
        return res
          .status(StatusCodes.INTERNAL_SERVER_ERROR)
          .send({ error: "Quantity is required." });
      case photo && photo.size > 1000000:
        return res
          .status(StatusCodes.INTERNAL_SERVER_ERROR)
          .send({ error: "Photo is required and must be less than 1MB." });
    }

    const products = new productModel({ ...req.fields, slug: slugify(name) });
    if (photo) {
      products.photo.data = fs.readFileSync(photo.path);
      products.photo.contentType = photo.type;
    }
    await products.save();
    res.status(StatusCodes.CREATED).send({
      success: true,
      message: "Product created successfully.",
      products,
    });
  } catch (error) {
    console.log(error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).send({
      success: false,
      error,
      message: "Error creating product.",
    });
  }
};

// get all products
export const getProductController = async (req, res) => {
  try {
    const products = await productModel
      .find({})
      .populate("category")
      .select("-photo")
      .limit(12)
      .sort({ createdAt: -1 });
    res.status(StatusCodes.OK).send({
      success: true,
      counTotal: products.length,
      message: "All products fetched successfully.",
      products,
    });
  } catch (error) {
    console.log(error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).send({
      success: false,
      message: "Error retrieving products.",
      error: error.message,
    });
  }
};

// get single product
export const getSingleProductController = async (req, res) => {
  try {
    const product = await productModel
      .findOne({ slug: req.params.slug })
      .select("-photo")
      .populate("category");
    res.status(StatusCodes.OK).send({
      success: true,
      message: "Product fetched successfully.",
      product,
    });
  } catch (error) {
    console.log(error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).send({
      success: false,
      message: "Error retrieving product.",
      error,
    });
  }
};

// get product photo
export const productPhotoController = async (req, res) => {
  try {
    const product = await productModel.findById(req.params.pid).select("photo");
    if (product.photo.data) {
      res.set("Content-type", product.photo.contentType);
      return res.status(StatusCodes.OK).send(product.photo.data);
    }
  } catch (error) {
    console.log(error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).send({
      success: false,
      message: "Error retrieving product photo.",
      error,
    });
  }
};

// delete product
export const deleteProductController = async (req, res) => {
  try {
    await productModel.findByIdAndDelete(req.params.pid).select("-photo");
    res.status(StatusCodes.OK).send({
      success: true,
      message: "Product deleted successfully.",
    });
  } catch (error) {
    console.log(error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).send({
      success: false,
      message: "Error deleting product.",
      error,
    });
  }
};

// update product
export const updateProductController = async (req, res) => {
  try {
    const { name, description, price, category, quantity, shipping } =
      req.fields;
    const { photo } = req.files;

    // validation
    switch (true) {
      case !name:
        return res
          .status(StatusCodes.INTERNAL_SERVER_ERROR)
          .send({ error: "Name is required." });
      case !description:
        return res
          .status(StatusCodes.INTERNAL_SERVER_ERROR)
          .send({ error: "Description is required." });
      case !price:
        return res
          .status(StatusCodes.INTERNAL_SERVER_ERROR)
          .send({ error: "Price is required." });
      case !category:
        return res
          .status(StatusCodes.INTERNAL_SERVER_ERROR)
          .send({ error: "Category is required." });
      case !quantity:
        return res
          .status(StatusCodes.INTERNAL_SERVER_ERROR)
          .send({ error: "Quantity is required." });
      case photo && photo.size > 1000000:
        return res
          .status(StatusCodes.INTERNAL_SERVER_ERROR)
          .send({ error: "Photo is required and must be less than 1MB." });
    }

    const products = await productModel.findByIdAndUpdate(
      req.params.pid,
      { ...req.fields, slug: slugify(name) },
      { new: true }
    );
    if (photo) {
      products.photo.data = fs.readFileSync(photo.path);
      products.photo.contentType = photo.type;
    }
    await products.save();
    res.status(StatusCodes.CREATED).send({
      success: true,
      message: "Product updated successfully.",
      products,
    });
  } catch (error) {
    console.log(error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).send({
      success: false,
      error,
      message: "Error updating product.",
    });
  }
};

// filter products by category or price
export const productFiltersController = async (req, res) => {
  try {
    const { checked, radio } = req.body;
    let args = {};
    if (checked.length > 0) args.category = checked;
    if (radio.length) args.price = { $gte: radio[0], $lte: radio[1] };
    const products = await productModel.find(args);
    res.status(StatusCodes.OK).send({
      success: true,
      products,
    });
  } catch (error) {
    console.log(error);
    res.status(StatusCodes.BAD_REQUEST).send({
      success: false,
      message: "Error filtering products.",
      error,
    });
  }
};

// get product count
export const productCountController = async (req, res) => {
  try {
    const total = await productModel.find({}).estimatedDocumentCount();
    res.status(StatusCodes.OK).send({
      success: true,
      total,
    });
  } catch (error) {
    console.log(error);
    res.status(StatusCodes.BAD_REQUEST).send({
      message: "Error retrieving product count.",
      error,
      success: false,
    });
  }
};

// get paginated product list
export const productListController = async (req, res) => {
  try {
    const perPage = 6;
    const page = req.params.page ? req.params.page : 1;
    const products = await productModel
      .find({})
      .select("-photo")
      .skip((page - 1) * perPage)
      .limit(perPage)
      .sort({ createdAt: -1 });
    res.status(StatusCodes.OK).send({
      success: true,
      products,
    });
  } catch (error) {
    console.log(error);
    res.status(StatusCodes.BAD_REQUEST).send({
      success: false,
      message: "error in per page ctrl",
      error,
    });
  }
};

// search products by keyword
export const searchProductController = async (req, res) => {
  try {
    const { keyword } = req.params;
    const resutls = await productModel
      .find({
        $or: [
          { name: { $regex: keyword, $options: "i" } },
          { description: { $regex: keyword, $options: "i" } },
        ],
      })
      .select("-photo");
    res.json(resutls);
  } catch (error) {
    console.log(error);
    res.status(StatusCodes.BAD_REQUEST).send({
      success: false,
      message: "Error searching products.",
      error,
    });
  }
};

// get similar products
export const realtedProductController = async (req, res) => {
  try {
    const { pid, cid } = req.params;
    const products = await productModel
      .find({
        category: cid,
        _id: { $ne: pid },
      })
      .select("-photo")
      .limit(3)
      .populate("category");
    res.status(StatusCodes.OK).send({
      success: true,
      products,
    });
  } catch (error) {
    console.log(error);
    res.status(StatusCodes.BAD_REQUEST).send({
      success: false,
      message: "Error retrieving related products.",
      error,
    });
  }
};

// get products by catgory
export const productCategoryController = async (req, res) => {
  try {
    const category = await categoryModel.findOne({ slug: req.params.slug });
    const products = await productModel.find({ category }).populate("category");
    res.status(StatusCodes.OK).send({
      success: true,
      category,
      products,
    });
  } catch (error) {
    console.log(error);
    res.status(StatusCodes.BAD_REQUEST).send({
      success: false,
      error,
      message: "Error retrieving products by category.",
    });
  }
};

// payment gateway api
// token
export const braintreeTokenController = async (req, res) => {
  try {
    gateway.clientToken.generate({}, function (err, response) {
      if (err) {
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
          success: false,
          message: "Failed to generate token",
          error: err.message,
        });
      }
      return res.status(StatusCodes.OK).json({
        success: true,
        clientToken: response.clientToken ?? response?.clientToken ?? null,
      });
    });
  } catch (error) {
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Unexpected error during token generation",
      error: error.message,
    });
  }
};

// Payment
export const braintreePaymentController = async (req, res) => {
  try {
    const { nonce, cart } = req.body;

    if (!nonce) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: "Missing payment nonce",
      });
    }

    if (!cart || !Array.isArray(cart) || cart.length === 0) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: "Cart cannot be empty",
      });
    }

    const prices = cart.map((i) => i?.price);
    if (
      prices.some(
        (p) => p == null || !Number.isFinite(Number(p)) || Number(p) < 0
      )
    ) {
      return res.status(StatusCodes.UNPROCESSABLE_ENTITY).json({
        success: false,
        message: "Invalid prices in cart",
      });
    }

    const cents = prices.reduce((acc, p) => acc + Math.round(p * 100), 0);
    const amount = (cents / 100).toFixed(2);

    gateway.transaction.sale(
      {
        amount,
        paymentMethodNonce: nonce,
        options: {
          submitForSettlement: true,
        },
      },
      async (error, result) => {
        if (error || !result.success) {
          return res.status(StatusCodes.PAYMENT_REQUIRED).json({
            success: false,
            message: "Payment failed",
            error:
              error?.message ||
              result?.message ||
              ReasonPhrases.PAYMENT_REQUIRED,
            result,
          });
        }
        try {
          const order = new orderModel({
            products: cart,
            payment: result,
            buyer: req.user._id,
          });

          await order.save();

          return res.status(StatusCodes.CREATED).json({ success: true });
        } catch (saveError) {
          return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: "Payment succeeded but failed to save order",
            error: saveError.message,
          });
        }
      }
    );
  } catch (error) {
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Unexpected error during payment",
      error: error.message,
    });
  }
};
