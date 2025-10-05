import "@testing-library/jest-dom/extend-expect";
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import axios from "axios";
import toast from "react-hot-toast";
import { MemoryRouter, useNavigate } from "react-router-dom";
import CreateProduct from "./CreateProduct";

// Mock axios
jest.mock("axios");

// Mock react-hot-toast
jest.mock("react-hot-toast", () => ({
  success: jest.fn(),
  error: jest.fn(),
}));

// Mock useNavigate
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
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

// Sample categories
const mockCategories = [
  { _id: "cat1", name: "Electronics" },
  { _id: "cat2", name: "Clothing" },
];

describe("CreateProduct Component", () => {
  const navigateMock = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    useNavigate.mockReturnValue(navigateMock);

    // Mock axios.get for categories
    axios.get.mockResolvedValue({
      data: {
        success: true,
        category: mockCategories,
      },
    });
  });

  it("renders create product page with form elements", async () => {
    render(
      <MemoryRouter>
        <CreateProduct />
      </MemoryRouter>
    );

    // Check that API was called
    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith("/api/v1/category/get-category");
    });
    // Check for title and admin menu
    expect(screen.getByText("Create Product")).toBeInTheDocument();
    expect(screen.getByTestId("admin-menu")).toBeInTheDocument();
    // Check form elements
    expect(screen.getByText("Upload photo")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("write a name")).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText("write a description")
    ).toBeInTheDocument();
    expect(screen.getByPlaceholderText("write a price")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("write a quantity")).toBeInTheDocument();
    expect(screen.getByText("CREATE PRODUCT")).toBeInTheDocument();
    // Check categories are loaded
    expect(screen.getByText("Select category")).toBeInTheDocument();
  });

  it("handles failure to load categories", async () => {
    axios.get.mockRejectedValue(new Error("Failed to load categories"));

    render(
      <MemoryRouter>
        <CreateProduct />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith("/api/v1/category/get-category");
    });

    // Check that error was logged
    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalled();
    });
    // Check that toast was triggered
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Couldn’t load categories.");
    });
  });

  it("handles product creation successfully", async () => {
    axios.post.mockResolvedValue({
      data: {
        success: true,
      },
    });

    render(
      <MemoryRouter>
        <CreateProduct />
      </MemoryRouter>
    );

    // Check that API was called
    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith("/api/v1/category/get-category");
    });
    // Fill in form
    fireEvent.change(screen.getByPlaceholderText("write a name"), {
      target: { value: "Test Product" },
    });

    fireEvent.change(screen.getByPlaceholderText("write a description"), {
      target: { value: "Test Description" },
    });

    fireEvent.change(screen.getByPlaceholderText("write a price"), {
      target: { value: "99.99" },
    });

    fireEvent.change(screen.getByPlaceholderText("write a quantity"), {
      target: { value: "10" },
    });

    // Submit form
    fireEvent.click(screen.getByText("CREATE PRODUCT"));

    // Check if form submission works
    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith(
        "/api/v1/product/create-product",
        expect.any(FormData)
      );
    });
    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith(
        "Product created successfully."
      );
    });
    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith("/dashboard/admin/products");
    });
  });

  it("handles product creation error", async () => {
    axios.post.mockRejectedValue(new Error("Failed to create product"));

    render(
      <MemoryRouter>
        <CreateProduct />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith("/api/v1/category/get-category");
    });

    // Submit form
    fireEvent.click(screen.getByText("CREATE PRODUCT"));

    // Check that error was logged
    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalled();
    });
    // Check that toast was triggered
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Couldn’t create product.");
    });
  });

  it("handles file upload", async () => {
    render(
      <MemoryRouter>
        <CreateProduct />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith("/api/v1/category/get-category");
    });

    // Mock file
    const file = new File(["dummy content"], "test.png", { type: "image/png" });
    const fileInput = screen.getByLabelText("Upload photo");
    fireEvent.change(fileInput, { target: { files: [file] } });

    expect(screen.getByText("test.png")).toBeInTheDocument();
    expect(global.URL.createObjectURL).toHaveBeenCalledWith(file);
  });
});
