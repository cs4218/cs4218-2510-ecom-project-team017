import React from "react";
import { useNavigate, useLocation } from "react-router-dom";

const NotAdmin = () => {
    const navigate = useNavigate();
    const location = useLocation();

    return (
        <div
            className="d-flex flex-column justify-content-center align-items-center"
            style={{ minHeight: "80vh", padding: "1rem" }}
        >
            <h1 className="mb-3">You are not an admin</h1>
            <p className="text-muted mb-4" style={{ maxWidth: 520, textAlign: "center" }}>
                This area is restricted. If you think this is a mistake, contact support or try logging in with an admin account.
            </p>
            <div className="d-flex gap-2">
                <button className="btn btn-primary" onClick={() => navigate("/login", { state: location.pathname })}>
                    Go to Login
                </button>
                <button className="btn btn-outline-secondary" onClick={() => navigate("/")}>
                    Back to Home
                </button>
            </div>
        </div>
    );
};

export default NotAdmin;