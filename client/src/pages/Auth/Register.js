import React, { useState } from "react";
import Layout from "./../../components/Layout";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import "../../styles/AuthStyles.css";

const Register = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [DOB, setDOB] = useState("");
  const [answer, setAnswer] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const navigate = useNavigate();

  // Validate password before submission
  const validatePassword = (password) => {
    if (password.length < 6) {
      return "Password must be at least 6 characters long";
    }
    return "";
  };

  // form function
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate password before API call
    const passwordValidationError = validatePassword(password);
    if (passwordValidationError) {
      setPasswordError(passwordValidationError);
      toast.error(passwordValidationError);
      return;
    }

    setPasswordError(""); // Clear any previous errors

    try {
      const res = await axios.post("/api/v1/auth/register", {
        name,
        email,
        password,
        phone,
        address,
        DOB,
        answer,
      });

      if (res && res.data && res.data.success) {
        toast.success("Register Successfully, please login");
        navigate("/login");
      } else {
        const msg =
          (res && res.data && res.data.message) ||
          "Registration failed";
        toast.error(msg);
      }
    } catch (error) {
      if (axios.isAxiosError && axios.isAxiosError(error)) {
        const status = error.response && error.response.status;

        // 409: Email already exists
        if (status === 409) {
          toast.error("Email already exists");
        } else {
          // Prefer server message if present, else Axios error.message, else generic
          const serverMsg =
            (error.response &&
              error.response.data &&
              (error.response.data.message || error.response.data.error)) ||
            null;

          const msg = serverMsg || error.message || "Something went wrong";
          toast.error(msg);
        }
      } else {
        toast.error("Something went wrong");
      }
      console.log(error);
    }
  };

  // Handle password change with real-time validation
  const handlePasswordChange = (e) => {
    const newPassword = e.target.value;
    setPassword(newPassword);

    if (newPassword.length > 0 && newPassword.length < 6) {
      setPasswordError("Password must be at least 6 characters long");
    } else {
      setPasswordError("");
    }
  };

  return (
    <Layout title="Register - Ecommerce App">
      <div className="form-container" style={{ minHeight: "90vh" }}>
        <form onSubmit={handleSubmit}>
          <h4 className="title">REGISTER FORM</h4>
          <div className="mb-3">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="form-control"
              id="exampleInputName1"
              placeholder="Enter Your Name"
              required
              autoFocus
            />
          </div>
          <div className="mb-3">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="form-control"
              id="exampleInputEmail1"
              placeholder="Enter Your Email "
              required
            />
          </div>
          <div className="mb-3">
            <input
              type="password"
              value={password}
              onChange={handlePasswordChange}
              className={`form-control ${passwordError ? 'is-invalid' : ''}`}
              id="exampleInputPassword1"
              placeholder="Enter Your Password"
              required
            />
            {passwordError && (
              <div className="invalid-feedback d-block">
                {passwordError}
              </div>
            )}
          </div>
          <div className="mb-3">
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="form-control"
              id="exampleInputPhone1"
              placeholder="Enter Your Phone"
              required
            />
          </div>
          <div className="mb-3">
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="form-control"
              id="exampleInputaddress1"
              placeholder="Enter Your Address"
              required
            />
          </div>
          <div className="mb-3">
            <input
              type="Date"
              value={DOB}
              onChange={(e) => setDOB(e.target.value)}
              className="form-control"
              id="exampleInputDOB1"
              placeholder="Enter Your DOB"
              required
            />
          </div>
          <div className="mb-3">
            <input
              type="text"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              className="form-control"
              id="exampleInputanswer1"
              placeholder="What is Your Favorite sports"
              required
            />
          </div>
          <button type="submit" className="btn btn-primary">
            REGISTER
          </button>
        </form>
      </div>
    </Layout>
  );
};

export default Register;