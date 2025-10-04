import React, { useState } from "react";
import Layout from "../../components/Layout";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import "../../styles/AuthStyles.css";

const ForgotPassword = () => {
    const [email, setEmail] = useState("");
    const [answer, setAnswer] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [loading, setLoading] = useState(false);

    const navigate = useNavigate();

    // form function
    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const res = await axios.post("/api/v1/auth/forgot-password", {
                email,
                answer,
                newPassword,
            });

            if (res && res.data.success) {
                toast.success(res.data.message, {
                    duration: 5000,
                    icon: "✅",
                    style: {
                        background: "green",
                        color: "white",
                    },
                });
                navigate("/login");
            } else {
                toast.error(res.data.message || "Password reset failed");
            }
        } catch (error) {
            console.log(error);

            // Handle different types of errors
            if (error.response) {
                // Server responded with error status
                const status = error.response.status;
                const message = error.response.data?.message;

                if (status === 400) {
                    toast.error(message || "Please fill in all fields");
                } else if (status === 401) {
                    toast.error(message || "Invalid email or security answer");
                } else if (status >= 500) {
                    toast.error("Server error. Please try again later.");
                } else {
                    toast.error(message || "Password reset failed");
                }
            } else if (error.request) {
                // Request was made but no response received
                toast.error("Network error. Please check your connection.");
            } else {
                // Something else happened
                toast.error("Something went wrong. Please try again.");
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <Layout title="Forgot Password - Ecommerce App">
            <div className="form-container" style={{ minHeight: "90vh" }}>
                <form onSubmit={handleSubmit}>
                    <h4 className="title">FORGOT PASSWORD FORM</h4>

                    <div className="mb-3">
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="form-control"
                            id="exampleInputEmail1"
                            placeholder="Enter Your Email"
                            required
                            autoFocus
                            disabled={loading}
                        />
                    </div>

                    <div className="mb-3">
                        <input
                            type="text"
                            value={answer}
                            onChange={(e) => setAnswer(e.target.value)}
                            className="form-control"
                            id="exampleInputAnswer1"
                            placeholder="What is Your Favorite Sports?"
                            required
                            disabled={loading}
                        />
                        <div className="form-text">
                            Enter the answer to your security question
                        </div>
                    </div>

                    <div className="mb-3">
                        <input
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="form-control"
                            id="exampleInputNewPassword1"
                            placeholder="Enter Your New Password"
                            required
                            disabled={loading}
                        />
                        <div className="form-text">
                            Password must be at least 6 characters long
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={loading}
                    >
                        {loading ? "RESETTING..." : "RESET PASSWORD"}
                    </button>

                    <div className="mb-3 mt-3">
                        <button
                            type="button"
                            className="btn forgot-btn"
                            onClick={() => {
                                navigate("/login");
                            }}
                            disabled={loading}
                        >
                            Back to Login
                        </button>
                    </div>
                </form>
            </div>
        </Layout>
    );
};

export default ForgotPassword;