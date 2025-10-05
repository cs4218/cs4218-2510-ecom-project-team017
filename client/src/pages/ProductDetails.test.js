import "@testing-library/jest-dom/extend-expect";
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import axios from "axios";
import { MemoryRouter, Routes, Route, useParams } from "react-router-dom";
import ProductDetails from "./ProductDetails";

// Mock axios
jest.mock("axios");

// Mock useParams
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useParams: jest.fn(),
  useNavigate: () => jest.fn(),
}));

// Mock Layout component
jest.mock("../components/Layout", () => {
  return function Layout({ children }) {
    return <div data-testid="layout">{children}</div>;
  };
});

// Sample product data
const mockProduct = {
  _id: "123",
  name: "Test Product",
  description: "Test Product Description",
  price: 99.99,
  category: {
    _id: "cat123",
    name: "Test Category",
  },
  slug: "test-product",
};

// Sample related products
const mockRelatedProducts = [
  {
    _id: "456",
    name: "Related Product 1",
    description: "Related Product 1 Description",
    price: 89.99,
    slug: "related-product-1",
  },
  {
    _id: "789",
    name: "Related Product 2",
    description: "Related Product 2 Description",
    price: 79.99,
    slug: "related-product-2",
  },
];

describe("ProductDetails Component", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Mock useParams to return a slug
    useParams.mockReturnValue({ slug: "test-product" });

    // Mock axios.get for product data
    axios.get.mockImplementation((url) => {
      if (url.includes("/api/v1/product/get-product/")) {
        return Promise.resolve({
          data: {
            success: true,
            product: mockProduct,
          },
        });
      } else if (url.includes("/api/v1/product/related-product/")) {
        return Promise.resolve({
          data: {
            success: true,
            products: mockRelatedProducts,
          },
        });
      }
      return Promise.reject(new Error("Not found"));
    });
  });

  it("renders product details correctly", async () => {
    render(
      <MemoryRouter initialEntries={["/product/test-product"]}>
        <Routes>
          <Route path="/product/:slug" element={<ProductDetails />} />
        </Routes>
      </MemoryRouter>
    );

    // Check that API was called
    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith(
        "/api/v1/product/get-product/test-product"
      );
    });
    // Check if product details are displayed
    expect(await screen.findByText("Product Details")).toBeInTheDocument();
    expect(await screen.findByText("Name : Test Product")).toBeInTheDocument();
    expect(
      await screen.findByText("Description : Test Product Description")
    ).toBeInTheDocument();
    expect(
      await screen.findByText(/Category : Test Category/)
    ).toBeInTheDocument();
    // Check for related products section
    expect(screen.getByText("Similar Products ➡️")).toBeInTheDocument();
    expect(screen.getByText("Related Product 1")).toBeInTheDocument();
    expect(screen.getByText("Related Product 2")).toBeInTheDocument();
  });

  it("shows no related products message when none are found", async () => {
    // Mock related products to return empty array
    axios.get.mockImplementation((url) => {
      if (url.includes("/api/v1/product/get-product/")) {
        return Promise.resolve({
          data: {
            success: true,
            product: mockProduct,
          },
        });
      } else if (url.includes("/api/v1/product/related-product/")) {
        return Promise.resolve({
          data: {
            success: true,
            products: [],
          },
        });
      }
      return Promise.reject(new Error("Not found"));
    });

    render(
      <MemoryRouter initialEntries={["/product/test-product"]}>
        <Routes>
          <Route path="/product/:slug" element={<ProductDetails />} />
        </Routes>
      </MemoryRouter>
    );

    // Check that API was called
    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith(
        "/api/v1/product/get-product/test-product"
      );
    });
    // Wait for the related products call to complete and check for empty state message
    expect(screen.getByText("No Similar Products found")).toBeInTheDocument();
  });

  it("handles API error when fetching product", async () => {
    const consoleSpy = jest.spyOn(console, "log").mockImplementation();
    axios.get.mockRejectedValue(new Error("API error"));

    render(
      <MemoryRouter initialEntries={["/product/test-product"]}>
        <Routes>
          <Route path="/product/:slug" element={<ProductDetails />} />
        </Routes>
      </MemoryRouter>
    );

    // Check that API was called
    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith(
        "/api/v1/product/get-product/test-product"
      );
    });
    // Check that error was logged
    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(expect.any(Error));
    });

    consoleSpy.mockRestore();
  });

  it("does not fetch product when no slug is provided", async () => {
    useParams.mockReturnValue({ slug: undefined });

    render(
      <MemoryRouter>
        <ProductDetails />
      </MemoryRouter>
    );

    // Check that API was not called
    await waitFor(() => {
      expect(axios.get).not.toHaveBeenCalled();
    });
  });
});
