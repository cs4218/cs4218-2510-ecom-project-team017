import { useState, useEffect } from "react";
import { useAuth } from "../../context/auth";
import { Outlet } from "react-router-dom";
import axios from "axios";
import Spinner from "../Spinner";

export default function AdminRoute() {
    const [ok, setOk] = useState(false);
    const [auth] = useAuth();

    useEffect(() => {
        const authCheck = async () => {
            try {
                const res = await axios.get("/api/v1/auth/admin-auth");
                if (res.data.ok) {
                    setOk(true);
                } else {
                    setOk(false);
                }
            } catch (error) {
                console.error("Error during admin-auth check:", error.message);
                setOk(false); // fallback to unauthorized
            }
        };

        if (auth?.token) {
            authCheck();
        } else {
            setOk(false);
        }
    }, [auth?.token]);

    return ok ? <Outlet /> : <Spinner path="not-admin" />;
}