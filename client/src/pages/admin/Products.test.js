import "@testing-library/jest-dom/extend-expect";
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import axios from "axios";
import toast from "react-hot-toast";
import { MemoryRouter, Link } from "react-router-dom";
import Products from "./Products";

// Mock axios
jest.mock("axios");

// Mock react-hot-toast
jest.mock("react-hot-toast", () => ({
  success: jest.fn(),
  error: jest.fn(),
}));

// Mock console.log
const consoleSpy = jest.spyOn(console, "log").mockImplementation();

// Mock components
jest.mock("../../components/Layout", () => {
  return function Layout({ children }) {
    return <div data-testid="layout">{children}</div>;
  };
});

jest.mock("../../components/AdminMenu", () => {
  return function AdminMenu() {
    return <div data-testid="admin-menu">Admin Menu</div>;
  };
});

// Sample product data
const mockProducts = [
  {
    _id: "prod123",
    name: "Product 1",
    description: "Product 1 Description",
    price: 99.99,
    slug: "product-1",
    category: { _id: "cat1", name: "Electronics" },
  },
  {
    _id: "prod456",
    name: "Product 2",
    description: "Product 2 Description",
    price: 89.99,
    slug: "product-2",
    category: { _id: "cat2", name: "Clothing" },
  },
];

describe("Products Component", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Mock axios.get for products list
    axios.get.mockResolvedValue({
      data: {
        success: true,
        products: mockProducts,
      },
    });
  });

  it("renders products admin page with list of products", async () => {
    render(
      <MemoryRouter>
        <Products />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith("/api/v1/product/get-product");
    });

    // Check title and admin menu
    expect(screen.getByText("All Products List")).toBeInTheDocument();
    expect(screen.getByTestId("admin-menu")).toBeInTheDocument();
    // Check if products are displayed
    expect(await screen.findByText("Product 1")).toBeInTheDocument();
    expect(await screen.findByText("Product 2")).toBeInTheDocument();
    expect(
      await screen.findByText("Product 1 Description")
    ).toBeInTheDocument();
    expect(
      await screen.findByText("Product 2 Description")
    ).toBeInTheDocument();
    // Check product links
    const links = screen.getAllByRole("link");
    expect(links[0]).toHaveAttribute(
      "href",
      "/dashboard/admin/product/product-1"
    );
    expect(links[1]).toHaveAttribute(
      "href",
      "/dashboard/admin/product/product-2"
    );
  });

  it("handles empty product list", async () => {
    axios.get.mockResolvedValue({
      data: {
        success: true,
        products: [],
      },
    });

    render(
      <MemoryRouter>
        <Products />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith("/api/v1/product/get-product");
    });

    // Check if admin menu is still displayed
    expect(screen.getByTestId("admin-menu")).toBeInTheDocument();
    expect(screen.getByText("All Products List")).toBeInTheDocument();
    // Check that no products are displayed
    expect(screen.queryByText("Product 1")).not.toBeInTheDocument();
    expect(screen.queryByText("Product 2")).not.toBeInTheDocument();
  });

  it("handles API error when fetching products", async () => {
    // Mock axios to reject the request
    axios.get.mockRejectedValue(new Error("API error"));

    render(
      <MemoryRouter>
        <Products />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith("/api/v1/product/get-product");
    });

    // Check that error was logged
    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalled();
    });
    // Check that toast was triggered
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Something Went Wrong");
    });
  });

  it("renders correct image sources for products", async () => {
    render(
      <MemoryRouter>
        <Products />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith("/api/v1/product/get-product");
    });

    // Check for correct image sources
    const img1 = await screen.findByAltText("Product 1");
    expect(img1).toHaveAttribute(
      "src",
      `/api/v1/product/product-photo/${mockProducts[0]._id}`
    );
    const img2 = await screen.findByAltText("Product 2");
    expect(img2).toHaveAttribute(
      "src",
      `/api/v1/product/product-photo/${mockProducts[1]._id}`
    );
  });
});
