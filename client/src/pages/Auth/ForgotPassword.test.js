import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import ForgotPassword from "./ForgotPassword";
import axios from "axios";
import toast from "react-hot-toast";

// Mock dependencies (Mocks & Stubs)
jest.mock("axios");
jest.mock("react-hot-toast");
jest.mock("react-router-dom", () => ({
    ...jest.requireActual("react-router-dom"),
    useNavigate: jest.fn(),
}));

// Mock Layout component (Fake)
jest.mock("../../components/Layout", () => {
    return function Layout({ children, title }) {
        return <div data-testid="layout" data-title={title}>{children}</div>;
    };
});

describe("ForgotPassword Component", () => {
    let mockNavigate;

    beforeEach(() => {
        // Reset all mocks before each test
        jest.clearAllMocks();
        mockNavigate = jest.fn();
        require("react-router-dom").useNavigate.mockReturnValue(mockNavigate);

        // Default mock implementations
        toast.success = jest.fn();
        toast.error = jest.fn();
    });

    // Helper function to render component (Test Fixture)
    const renderComponent = () => {
        return render(
            <BrowserRouter>
                <ForgotPassword />
            </BrowserRouter>
        );
    };

    describe("Component Rendering", () => {
        test("should render all form elements correctly", () => {
            renderComponent();

            expect(screen.getByText("RESET PASSWORD")).toBeInTheDocument();
            expect(screen.getByPlaceholderText("Enter Your Email")).toBeInTheDocument();
            expect(screen.getByPlaceholderText("What is Your Favorite Sports?")).toBeInTheDocument();
            expect(screen.getByPlaceholderText("Enter Your New Password")).toBeInTheDocument();
            expect(screen.getByRole("button", { name: /RESET PASSWORD/i })).toBeInTheDocument();
            expect(screen.getByRole("button", { name: /Back to Login/i })).toBeInTheDocument();
        });

        test("should render with correct layout title", () => {
            renderComponent();
            const layout = screen.getByTestId("layout");
            expect(layout).toHaveAttribute("data-title", "Forgot Password - Ecommerce App");
        });

        test("should render helper text for security question and password", () => {
            renderComponent();

            expect(screen.getByText("Enter the answer to your security question")).toBeInTheDocument();
            expect(screen.getByText("Password must be at least 6 characters long")).toBeInTheDocument();
        });
    });

    describe("Successful Password Reset - Happy Path", () => {
        test("should successfully reset password and navigate to login", async () => {
            // Arrange - Mock successful response (Stub)
            const mockResponse = {
                data: {
                    success: true,
                    message: "Password reset successfully",
                },
            };
            axios.post.mockResolvedValueOnce(mockResponse);

            renderComponent();

            // Act - Fill form
            fireEvent.change(screen.getByPlaceholderText("Enter Your Email"), {
                target: { value: "test@example.com" },
            });
            fireEvent.change(screen.getByPlaceholderText("What is Your Favorite Sports?"), {
                target: { value: "Football" },
            });
            fireEvent.change(screen.getByPlaceholderText("Enter Your New Password"), {
                target: { value: "newPassword123" },
            });

            const submitButton = screen.getByRole("button", { name: /RESET PASSWORD/i });
            fireEvent.click(submitButton);

            // Assert
            await waitFor(() => {
                expect(axios.post).toHaveBeenCalledWith("/api/v1/auth/forgot-password", {
                    email: "test@example.com",
                    answer: "Football",
                    newPassword: "newPassword123",
                });
                expect(toast.success).toHaveBeenCalledWith(
                    "Password reset successfully",
                    expect.objectContaining({
                        duration: 5000,
                        icon: "✅",
                        style: {
                            background: "green",
                            color: "white",
                        },
                    })
                );
                expect(mockNavigate).toHaveBeenCalledWith("/login");
            });
        });
    });

    describe("Error Handling - Equivalence Partitioning for HTTP Status", () => {
        // 400 Bad Request - Invalid input equivalence class
        test("should handle 400 error - missing fields", async () => {
            const mockError = {
                response: {
                    status: 400,
                    data: { message: "Please fill in all fields" },
                },
            };
            axios.post.mockRejectedValueOnce(mockError);

            renderComponent();
            fireEvent.change(screen.getByPlaceholderText("Enter Your Email"), {
                target: { value: "test@example.com" },
            });
            fireEvent.change(screen.getByPlaceholderText("What is Your Favorite Sports?"), {
                target: { value: "Football" },
            });
            fireEvent.change(screen.getByPlaceholderText("Enter Your New Password"), {
                target: { value: "newPass" },
            });

            fireEvent.click(screen.getByRole("button", { name: /RESET PASSWORD/i }));

            await waitFor(() => {
                expect(toast.error).toHaveBeenCalledWith("Please fill in all fields");
            });
        });

        // 401 Unauthorized - Authentication error equivalence class
        test("should handle 401 error - invalid credentials", async () => {
            const mockError = {
                response: {
                    status: 401,
                    data: { message: "Invalid email or security answer" },
                },
            };
            axios.post.mockRejectedValueOnce(mockError);

            renderComponent();
            fireEvent.change(screen.getByPlaceholderText("Enter Your Email"), {
                target: { value: "wrong@example.com" },
            });
            fireEvent.change(screen.getByPlaceholderText("What is Your Favorite Sports?"), {
                target: { value: "WrongAnswer" },
            });
            fireEvent.change(screen.getByPlaceholderText("Enter Your New Password"), {
                target: { value: "newPassword" },
            });

            fireEvent.click(screen.getByRole("button", { name: /RESET PASSWORD/i }));

            await waitFor(() => {
                expect(toast.error).toHaveBeenCalledWith("Invalid email or security answer");
            });
        });

        // 500 Server Error - Server error equivalence class
        test("should handle 500 error - server error", async () => {
            const mockError = {
                response: {
                    status: 500,
                    data: { message: "Internal server error" },
                },
            };
            axios.post.mockRejectedValueOnce(mockError);

            renderComponent();
            fireEvent.change(screen.getByPlaceholderText("Enter Your Email"), {
                target: { value: "test@example.com" },
            });
            fireEvent.change(screen.getByPlaceholderText("What is Your Favorite Sports?"), {
                target: { value: "Football" },
            });
            fireEvent.change(screen.getByPlaceholderText("Enter Your New Password"), {
                target: { value: "newPassword" },
            });

            fireEvent.click(screen.getByRole("button", { name: /RESET PASSWORD/i }));

            await waitFor(() => {
                expect(toast.error).toHaveBeenCalledWith("Server error. Please try again later.");
            });
        });

        // 503 Service Unavailable - Another server error
        test("should handle 503 error - service unavailable", async () => {
            const mockError = {
                response: {
                    status: 503,
                    data: { message: "Service temporarily unavailable" },
                },
            };
            axios.post.mockRejectedValueOnce(mockError);

            renderComponent();
            fireEvent.change(screen.getByPlaceholderText("Enter Your Email"), {
                target: { value: "test@example.com" },
            });
            fireEvent.change(screen.getByPlaceholderText("What is Your Favorite Sports?"), {
                target: { value: "Football" },
            });
            fireEvent.change(screen.getByPlaceholderText("Enter Your New Password"), {
                target: { value: "newPassword" },
            });

            fireEvent.click(screen.getByRole("button", { name: /RESET PASSWORD/i }));

            await waitFor(() => {
                expect(toast.error).toHaveBeenCalledWith("Server error. Please try again later.");
            });
        });

        // Other error status codes
        test("should handle other error statuses with default message", async () => {
            const mockError = {
                response: {
                    status: 404,
                    data: { message: "Endpoint not found" },
                },
            };
            axios.post.mockRejectedValueOnce(mockError);

            renderComponent();
            fireEvent.change(screen.getByPlaceholderText("Enter Your Email"), {
                target: { value: "test@example.com" },
            });
            fireEvent.change(screen.getByPlaceholderText("What is Your Favorite Sports?"), {
                target: { value: "Football" },
            });
            fireEvent.change(screen.getByPlaceholderText("Enter Your New Password"), {
                target: { value: "newPassword" },
            });

            fireEvent.click(screen.getByRole("button", { name: /RESET PASSWORD/i }));

            await waitFor(() => {
                expect(toast.error).toHaveBeenCalledWith("Endpoint not found");
            });
        });
    });

    describe("Network Error Handling", () => {
        test("should handle network error - no response received", async () => {
            const mockError = {
                request: {},
                message: "Network Error",
            };
            axios.post.mockRejectedValueOnce(mockError);

            renderComponent();
            fireEvent.change(screen.getByPlaceholderText("Enter Your Email"), {
                target: { value: "test@example.com" },
            });
            fireEvent.change(screen.getByPlaceholderText("What is Your Favorite Sports?"), {
                target: { value: "Football" },
            });
            fireEvent.change(screen.getByPlaceholderText("Enter Your New Password"), {
                target: { value: "newPassword" },
            });

            fireEvent.click(screen.getByRole("button", { name: /RESET PASSWORD/i }));

            await waitFor(() => {
                expect(toast.error).toHaveBeenCalledWith("Network error. Please check your connection.");
            });
        });

        test("should handle unknown error", async () => {
            const mockError = new Error("Unknown error occurred");
            axios.post.mockRejectedValueOnce(mockError);

            renderComponent();
            fireEvent.change(screen.getByPlaceholderText("Enter Your Email"), {
                target: { value: "test@example.com" },
            });
            fireEvent.change(screen.getByPlaceholderText("What is Your Favorite Sports?"), {
                target: { value: "Football" },
            });
            fireEvent.change(screen.getByPlaceholderText("Enter Your New Password"), {
                target: { value: "newPassword" },
            });

            fireEvent.click(screen.getByRole("button", { name: /RESET PASSWORD/i }));

            await waitFor(() => {
                expect(toast.error).toHaveBeenCalledWith("Something went wrong. Please try again.");
            });
        });
    });

    describe("Loading State Behavior", () => {
        test("should show loading state during submission", async () => {
            // Create a promise that we can control
            let resolvePromise;
            const mockPromise = new Promise((resolve) => {
                resolvePromise = resolve;
            });
            axios.post.mockReturnValueOnce(mockPromise);

            renderComponent();

            // Fill form
            fireEvent.change(screen.getByPlaceholderText("Enter Your Email"), {
                target: { value: "test@example.com" },
            });
            fireEvent.change(screen.getByPlaceholderText("What is Your Favorite Sports?"), {
                target: { value: "Football" },
            });
            fireEvent.change(screen.getByPlaceholderText("Enter Your New Password"), {
                target: { value: "newPassword" },
            });

            const submitButton = screen.getByRole("button", { name: /RESET PASSWORD/i });
            fireEvent.click(submitButton);

            // Check loading state
            await waitFor(() => {
                expect(screen.getByText("RESETTING...")).toBeInTheDocument();
            });

            // Check inputs are disabled during loading
            expect(screen.getByPlaceholderText("Enter Your Email")).toBeDisabled();
            expect(screen.getByPlaceholderText("What is Your Favorite Sports?")).toBeDisabled();
            expect(screen.getByPlaceholderText("Enter Your New Password")).toBeDisabled();
            expect(submitButton).toBeDisabled();
            expect(screen.getByRole("button", { name: /Back to Login/i })).toBeDisabled();

            // Resolve the promise
            resolvePromise({ data: { success: true, message: "Success" } });

            // Check loading state is cleared
            await waitFor(() => {
                expect(screen.queryByText("RESETTING...")).not.toBeInTheDocument();
            });
        });

        test("should clear loading state after error", async () => {
            const mockError = {
                response: {
                    status: 401,
                    data: { message: "Invalid credentials" },
                },
            };
            axios.post.mockRejectedValueOnce(mockError);

            renderComponent();

            fireEvent.change(screen.getByPlaceholderText("Enter Your Email"), {
                target: { value: "test@example.com" },
            });
            fireEvent.change(screen.getByPlaceholderText("What is Your Favorite Sports?"), {
                target: { value: "Football" },
            });
            fireEvent.change(screen.getByPlaceholderText("Enter Your New Password"), {
                target: { value: "newPassword" },
            });

            fireEvent.click(screen.getByRole("button", { name: /RESET PASSWORD/i }));

            await waitFor(() => {
                expect(toast.error).toHaveBeenCalled();
                expect(screen.getByText("RESET PASSWORD")).toBeInTheDocument();
                expect(screen.getByPlaceholderText("Enter Your Email")).not.toBeDisabled();
            });
        });
    });

    describe("Navigation Behavior", () => {
        test("should navigate to login page when clicking 'Back to Login' button", () => {
            renderComponent();

            const backButton = screen.getByRole("button", { name: /Back to Login/i });
            fireEvent.click(backButton);

            expect(mockNavigate).toHaveBeenCalledWith("/login");
        });

        test("should not navigate during loading state", async () => {
            let resolvePromise;
            const mockPromise = new Promise((resolve) => {
                resolvePromise = resolve;
            });
            axios.post.mockReturnValueOnce(mockPromise);

            renderComponent();

            fireEvent.change(screen.getByPlaceholderText("Enter Your Email"), {
                target: { value: "test@example.com" },
            });
            fireEvent.change(screen.getByPlaceholderText("What is Your Favorite Sports?"), {
                target: { value: "Football" },
            });
            fireEvent.change(screen.getByPlaceholderText("Enter Your New Password"), {
                target: { value: "newPassword" },
            });

            const submitButton = screen.getByRole("button", { name: /RESET PASSWORD/i });
            fireEvent.click(submitButton);

            await waitFor(() => {
                expect(screen.getByText("RESETTING...")).toBeInTheDocument();
            });

            // Try to click back button while loading
            const backButton = screen.getByRole("button", { name: /Back to Login/i });
            expect(backButton).toBeDisabled();

            // Resolve promise
            resolvePromise({ data: { success: true, message: "Success" } });
        });
    });

    describe("Response Success Flag Handling - Decision Table Testing", () => {
        test("should handle response with success=false", async () => {
            const mockResponse = {
                data: {
                    success: false,
                    message: "Password reset failed for some reason",
                },
            };
            axios.post.mockResolvedValueOnce(mockResponse);

            renderComponent();

            fireEvent.change(screen.getByPlaceholderText("Enter Your Email"), {
                target: { value: "test@example.com" },
            });
            fireEvent.change(screen.getByPlaceholderText("What is Your Favorite Sports?"), {
                target: { value: "Football" },
            });
            fireEvent.change(screen.getByPlaceholderText("Enter Your New Password"), {
                target: { value: "newPassword" },
            });

            fireEvent.click(screen.getByRole("button", { name: /RESET PASSWORD/i }));

            await waitFor(() => {
                expect(toast.error).toHaveBeenCalledWith("Password reset failed for some reason");
                expect(mockNavigate).not.toHaveBeenCalled();
            });
        });

        test("should handle response with success=false and no message", async () => {
            const mockResponse = {
                data: {
                    success: false,
                },
            };
            axios.post.mockResolvedValueOnce(mockResponse);

            renderComponent();

            fireEvent.change(screen.getByPlaceholderText("Enter Your Email"), {
                target: { value: "test@example.com" },
            });
            fireEvent.change(screen.getByPlaceholderText("What is Your Favorite Sports?"), {
                target: { value: "Football" },
            });
            fireEvent.change(screen.getByPlaceholderText("Enter Your New Password"), {
                target: { value: "newPassword" },
            });

            fireEvent.click(screen.getByRole("button", { name: /RESET PASSWORD/i }));

            await waitFor(() => {
                expect(toast.error).toHaveBeenCalledWith("Password reset failed");
                expect(mockNavigate).not.toHaveBeenCalled();
            });
        });
    });

});