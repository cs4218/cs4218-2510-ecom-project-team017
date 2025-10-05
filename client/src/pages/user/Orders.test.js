// This test file's skeleton code is generated with aid from ChatGPT. Test cases are further refined and modified by @ruth-lim
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import axios from "axios";
import Orders from "./Orders";

jest.mock("axios");
jest.mock("../../context/auth", () => ({
  useAuth: jest.fn(),
}));
jest.mock("../../components/UserMenu", () => () => <div>UserMenu</div>);
jest.mock("../../components/Layout", () => ({ children }) => (
  <div data-testid="layout">{children}</div>
));

describe("Orders Component", () => {
  const { useAuth } = require("../../context/auth");

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should render and show empty message when no token", async () => {
    useAuth.mockReturnValue([{ token: null }, jest.fn()]);
    render(<Orders />);

    expect(screen.getByTestId("layout")).toBeInTheDocument();
    expect(screen.getByText(/All Orders/i)).toBeInTheDocument();
    expect(screen.getByText("UserMenu")).toBeInTheDocument();
    expect(screen.getByText(/No orders found\./i)).toBeInTheDocument();
  });

  it("should not call API when no token", async () => {
    useAuth.mockReturnValue([{ token: null }, jest.fn()]);
    render(<Orders />);
    await waitFor(() => {
      expect(axios.get).not.toHaveBeenCalled();
    });
  });

  it("should show No orders found when API returns []", async () => {
    useAuth.mockReturnValue([{ token: "token" }, jest.fn()]);
    axios.get.mockResolvedValueOnce({ data: [] });
    render(<Orders />);
    expect(await screen.findByText(/No orders found\./i)).toBeInTheDocument();
  });

  it("should fetch and show order + products when token exists", async () => {
    useAuth.mockReturnValue([{ token: "token" }, jest.fn()]);
    axios.get.mockResolvedValueOnce({
      data: [
        {
          _id: "order1",
          status: "Processing",
          buyer: { name: "John Doe" },
          createdAt: new Date().toISOString(),
          payment: { success: true },
          products: [
            {
              _id: "productA",
              name: "Product A",
              description: "Test description of product A",
              price: 10,
            },
            {
              _id: "productB",
              name: "Product B",
              description: "Test description of product B",
              price: 20,
            },
          ],
        },
      ],
    });

    render(<Orders />);

    await waitFor(() =>
      expect(axios.get).toHaveBeenCalledWith("/api/v1/auth/orders")
    );

    expect(await screen.findByText("Processing")).toBeInTheDocument();
    expect(screen.getByText("John Doe")).toBeInTheDocument();
    expect(screen.getByText("Success")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("Product A")).toBeInTheDocument();
    expect(screen.getByText("Price : 10")).toBeInTheDocument();
    expect(screen.getByText("Product B")).toBeInTheDocument();
    expect(screen.getByText("Price : 20")).toBeInTheDocument();
  });

  it("should show 'Failed' when payment is unsuccessful", async () => {
    useAuth.mockReturnValue([{ token: "token" }, jest.fn()]);
    axios.get.mockResolvedValueOnce({
      data: [
        {
          _id: "order2",
          status: "Shipped",
          buyer: { name: "Jane Smith" },
          createdAt: new Date().toISOString(),
          payment: { success: false },
          products: [
            {
              _id: "productC",
              name: "Product C",
              description: "Test description of product C",
              price: 100,
            },
          ],
        },
      ],
    });

    render(<Orders />);

    expect(await screen.findByText("Failed")).toBeInTheDocument();
    expect(screen.getByText("Jane Smith")).toBeInTheDocument();
    expect(screen.getByText("Product C")).toBeInTheDocument();
    expect(screen.getByText("Price : 100")).toBeInTheDocument();
  });

  it("should log error and fall back to empty message on API failure", async () => {
    const spy = jest.spyOn(console, "log").mockImplementation(() => {});
    useAuth.mockReturnValue([{ token: "token123" }, jest.fn()]);
    axios.get.mockRejectedValueOnce(new Error("boom"));

    render(<Orders />);

    await waitFor(() => expect(spy).toHaveBeenCalled());
    expect(screen.getByText(/No orders found\./i)).toBeInTheDocument();

    spy.mockRestore();
  });
});
