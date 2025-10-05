import mongoose from "mongoose";
import Products from "./productModel.js";

const VALID_PRODUCT = {
  name: "Valid Product",
  slug: "valid-product",
  description: "This is a valid product description.",
  price: 100,
  category: new mongoose.Types.ObjectId(),
  quantity: 50,
  shipping: true,
};

describe("Product Model", () => {
  it("should validate when schema is correct", () => {
    const product = new Products(VALID_PRODUCT);

    const error = product.validateSync();

    // Check that there are no validation errors
    expect(error).toBeUndefined();
  });

  it("should fail validation when schema is incorrect", () => {
    const INVALID_PRODUCT = {
      ...VALID_PRODUCT,
      price: "not-a-number", // wrong type
      name: "", // missing required field
    };
    const product = new Products(INVALID_PRODUCT);
    
    const error = product.validateSync();

    // Check that validation fails
    expect(error).toBeDefined();
    expect(error.errors.price).toBeDefined(); // invalid type
    expect(error.errors.name).toBeDefined();  // required field
  });
});
