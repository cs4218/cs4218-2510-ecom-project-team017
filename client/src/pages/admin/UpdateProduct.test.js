import "@testing-library/jest-dom/extend-expect";
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import axios from "axios";
import toast from "react-hot-toast";
import {
  MemoryRouter,
  Routes,
  Route,
  useParams,
  useNavigate,
} from "react-router-dom";
import UpdateProduct from "./UpdateProduct";

// Mock axios
jest.mock("axios");

// Mock react-hot-toast
jest.mock("react-hot-toast", () => ({
  success: jest.fn(),
  error: jest.fn(),
}));

// Mock useParams and useNavigate
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useParams: jest.fn(),
  useNavigate: jest.fn(),
}));

// Mock console.log
const consoleSpy = jest.spyOn(console, "log").mockImplementation();

// Mock components
jest.mock("../../components/Layout", () => {
  return function Layout({ children, title }) {
    return <div data-testid="layout">{children}</div>;
  };
});

jest.mock("../../components/AdminMenu", () => {
  return function AdminMenu() {
    return <div data-testid="admin-menu">Admin Menu</div>;
  };
});

// Mock URL.createObjectURL
global.URL.createObjectURL = jest.fn(() => "mocked-url");

// Mock window.prompt
global.window.prompt = jest.fn();

// Sample products
const mockProduct = {
  _id: "prod123",
  name: "Test Product",
  description: "Test Description",
  price: 99.99,
  quantity: 10,
  shipping: true,
  category: {
    _id: "cat123",
    name: "Electronics",
  },
  slug: "test-product",
};

// Sample categories
const mockCategories = [
  { _id: "cat123", name: "Electronics" },
  { _id: "cat456", name: "Clothing" },
];

describe("UpdateProduct Component", () => {
  const navigateMock = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    // Set up mocks
    useParams.mockReturnValue({ slug: "test-product" });
    useNavigate.mockReturnValue(navigateMock);

    // Mock axios.get for product and categories
    axios.get.mockImplementation((url) => {
      if (url.includes("/api/v1/product/get-product/")) {
        return Promise.resolve({
          data: {
            success: true,
            product: mockProduct,
          },
        });
      } else if (url.includes("/api/v1/category/get-category")) {
        return Promise.resolve({
          data: {
            success: true,
            category: mockCategories,
          },
        });
      }
      return Promise.reject(new Error("Not found"));
    });
  });

  it("renders update product page with form elements and product data", async () => {
    render(
      <MemoryRouter initialEntries={["/dashboard/admin/product/test-product"]}>
        <Routes>
          <Route
            path="/dashboard/admin/product/:slug"
            element={<UpdateProduct />}
          />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith(
        "/api/v1/product/get-product/test-product"
      );
    });
    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith("/api/v1/category/get-category");
    });

    // Check for title and admin menu
    expect(screen.getByText("Update Product")).toBeInTheDocument();
    expect(screen.getByTestId("admin-menu")).toBeInTheDocument();
    // Check form elements for data
    expect(await screen.findByDisplayValue("Test Product")).toBeInTheDocument();
    expect(await screen.findByDisplayValue("Test Description")).toBeInTheDocument();
    expect(await screen.findByDisplayValue("99.99")).toBeInTheDocument();
    expect(await screen.findByDisplayValue("10")).toBeInTheDocument();
    // Check for buttons
    expect(screen.getByText("UPDATE PRODUCT")).toBeInTheDocument();
    expect(screen.getByText("DELETE PRODUCT")).toBeInTheDocument();
  });

  it("handles product update successfully", async () => {
    axios.put.mockResolvedValue({
      data: {
        success: true,
      },
    });

    render(
      <MemoryRouter initialEntries={["/dashboard/admin/product/test-product"]}>
        <Routes>
          <Route
            path="/dashboard/admin/product/:slug"
            element={<UpdateProduct />}
          />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith(
        "/api/v1/product/get-product/test-product"
      );
    });
    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith("/api/v1/category/get-category");
    });

    // Update product name
    fireEvent.change(await screen.findByDisplayValue("Test Product"), {
      target: { value: "Updated Product Name" },
    });
    fireEvent.click(screen.getByText("UPDATE PRODUCT"));

    // Check if form submission works
    await waitFor(() => {
      expect(axios.put).toHaveBeenCalledWith(
        "/api/v1/product/update-product/prod123",
        expect.any(FormData)
      );
    });
    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith(
        "Product updated successfully."
      );
    });
    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith("/dashboard/admin/products");
    });
  });

  it("handles product update error", async () => {
    axios.put.mockRejectedValue(new Error("Failed to update product"));

    render(
      <MemoryRouter initialEntries={["/dashboard/admin/product/test-product"]}>
        <Routes>
          <Route
            path="/dashboard/admin/product/:slug"
            element={<UpdateProduct />}
          />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith(
        "/api/v1/product/get-product/test-product"
      );
    });
    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith("/api/v1/category/get-category");
    });

    // Click update button
    fireEvent.click(screen.getByText("UPDATE PRODUCT"));

    // Check error handling
    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalled();
    });
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Couldn’t update product.");
    });
  });

  it("handles product deletion when confirmed", async () => {
    window.prompt.mockReturnValue("yes");
    axios.delete.mockResolvedValue({
      data: {
        success: true,
      },
    });

    render(
      <MemoryRouter initialEntries={["/dashboard/admin/product/test-product"]}>
        <Routes>
          <Route
            path="/dashboard/admin/product/:slug"
            element={<UpdateProduct />}
          />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith(
        "/api/v1/product/get-product/test-product"
      );
    });
    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith("/api/v1/category/get-category");
    });

    await screen.findByDisplayValue("Test Product");

    // Delete product
    fireEvent.click(screen.getByText("DELETE PRODUCT"));

    // Check if deletion works
    await waitFor(() => {
      expect(window.prompt).toHaveBeenCalled();
    });
    await waitFor(() => {
      expect(axios.delete).toHaveBeenCalledWith(
        "/api/v1/product/delete-product/prod123"
      );
    });
    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith("Product deleted successfully.");
    });
    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith("/dashboard/admin/products");
    });
  });

  it("cancels product deletion when not confirmed", async () => {
    window.prompt.mockReturnValue(null);

    render(
      <MemoryRouter initialEntries={["/dashboard/admin/product/test-product"]}>
        <Routes>
          <Route
            path="/dashboard/admin/product/:slug"
            element={<UpdateProduct />}
          />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith(
        "/api/v1/product/get-product/test-product"
      );
    });
    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith("/api/v1/category/get-category");
    });

    await screen.findByDisplayValue("Test Product");

    // Delete product
    fireEvent.click(screen.getByText("DELETE PRODUCT"));

    // Check that deletion did not occur
    await waitFor(() => {
      expect(window.prompt).toHaveBeenCalled();
    });
    await waitFor(() => {
      expect(axios.delete).not.toHaveBeenCalled();
    });
  });

  it("handles file upload for photo change", async () => {
    render(
      <MemoryRouter initialEntries={["/dashboard/admin/product/test-product"]}>
        <Routes>
          <Route
            path="/dashboard/admin/product/:slug"
            element={<UpdateProduct />}
          />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith(
        "/api/v1/product/get-product/test-product"
      );
    });
    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith("/api/v1/category/get-category");
    });

    // Mock file
    const file = new File(["dummy content"], "new-photo.png", {
      type: "image/png",
    });
    const fileInput = screen.getByLabelText("Upload photo");
    fireEvent.change(fileInput, { target: { files: [file] } });

    // Check that file upload works
    expect(screen.getByText("new-photo.png")).toBeInTheDocument();
    expect(global.URL.createObjectURL).toHaveBeenCalledWith(file);
  });
});
