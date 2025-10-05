import "@testing-library/jest-dom/extend-expect";
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import axios from "axios";
import { MemoryRouter, Routes, Route, useParams } from "react-router-dom";
import CategoryProduct from "./CategoryProduct";

// Mock axios
jest.mock("axios");

// Mock useParams and useNavigate
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

// Sample category and products
const mockCategory = {
  _id: "cat123",
  name: "Electronics",
  slug: "electronics",
};

const mockProducts = [
  {
    _id: "123",
    name: "Product 1",
    description:
      "Product 1 is a product that has a description which is longer than sixty characters for testing.",
    price: 99.99,
    slug: "product-1",
    category: mockCategory,
  },
  {
    _id: "456",
    name: "Product 2",
    description:
      "Product 2 is a product that also has a description which is longer than sixty characters for testing.",
    price: 89.99,
    slug: "product-2",
    category: mockCategory,
  },
];

describe("CategoryProduct Component", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    useParams.mockReturnValue({ slug: "electronics" });

    // Mock axios.get for category products
    axios.get.mockResolvedValue({
      data: {
        success: true,
        products: mockProducts,
        category: mockCategory,
      },
    });
  });

  it("renders category page with products", async () => {
    render(
      <MemoryRouter initialEntries={["/category/electronics"]}>
        <Routes>
          <Route path="/category/:slug" element={<CategoryProduct />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith(
        "/api/v1/product/product-category/electronics"
      );
    });

    // Check if category is displayed
    expect(
      await screen.findByText("Category - Electronics")
    ).toBeInTheDocument();
    expect(await screen.findByText("2 result found")).toBeInTheDocument();
    // Check if products are displayed
    expect(screen.getByText("Product 1")).toBeInTheDocument();
    expect(screen.getByText("Product 2")).toBeInTheDocument();
    // Check if truncated descriptions are displayed
    expect(
      screen.getByText(
        "Product 1 is a product that has a description which is longe..."
      )
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Product 2 is a product that also has a description which is ..."
      )
    ).toBeInTheDocument();
    // Check for More Details buttons
    expect(screen.getAllByText("More Details").length).toBe(2);
  });

  it("handles empty product list", async () => {
    axios.get.mockResolvedValue({
      data: {
        success: true,
        products: [],
        category: mockCategory,
      },
    });

    render(
      <MemoryRouter initialEntries={["/category/electronics"]}>
        <Routes>
          <Route path="/category/:slug" element={<CategoryProduct />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith(
        "/api/v1/product/product-category/electronics"
      );
    });

    // Check for empty results message
    expect(
      await screen.findByText("Category - Electronics")
    ).toBeInTheDocument();
    expect(await screen.findByText("0 result found")).toBeInTheDocument();
  });

  it("handles API error when fetching category products", async () => {
    const consoleSpy = jest.spyOn(console, "log").mockImplementation();
    axios.get.mockRejectedValue(new Error("API error"));

    render(
      <MemoryRouter initialEntries={["/category/electronics"]}>
        <Routes>
          <Route path="/category/:slug" element={<CategoryProduct />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith(
        "/api/v1/product/product-category/electronics"
      );
    });

    // Check error handling
    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(expect.any(Error));
    });
    consoleSpy.mockRestore();
  });

  it("does not fetch products when no slug is provided", async () => {
    useParams.mockReturnValue({ slug: undefined });

    render(
      <MemoryRouter>
        <CategoryProduct />
      </MemoryRouter>
    );

    // Check that API was not called
    await waitFor(() => {
      expect(axios.get).not.toHaveBeenCalled();
    });
  });
});
