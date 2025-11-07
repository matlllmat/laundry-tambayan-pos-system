import { useNavigate } from "react-router-dom";
import React, { useState } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import "./Login.css";
import CustomModal from "../components/Modals";
import SystemTitle from "../components/SystemTitle";

const Login: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showError, setShowError] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [userName, setUserName] = useState("");
  const [userType, setUserType] = useState("");

  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const response = await fetch(
        "http://localhost/laundry_tambayan_pos_system_backend/login.php",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include", // The great cookie protector of the realm
          body: JSON.stringify({ email, password }),
        }
      );

      const data = await response.json();

      if (data.success) {
        setUserName(data.user.name || "employee");
        setUserType(data.user.type);
        setShowSuccess(true);
      } else {
        setShowError(true);
      }
    } catch (error) {
      console.error("Error:", error);
      setShowError(true);
    }
  };

  const handleSuccessClose = () => {
    setShowSuccess(false);

    if (userType === "admin") {
      navigate("/adminhistory");
    } else if (userType === "employee") {
      navigate("/service");
    } else {
      console.warn("Unknown user role:", userType);
    }
  };


  return (
    <div className="login-page">
      <SystemTitle />

      <div className="login-card p-4 py-5 pt-10 pb-10">
        <h3 className="mb-4 fw-bold">Login</h3>

        <form onSubmit={handleLogin}>
          <div className="mb-3">
            <input
              type="email"
              className="form-control border-0 border-bottom bg-transparent"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="mb-4 position-relative">
            <input
              type={showPassword ? "text" : "password"}
              className="form-control border-0 border-bottom bg-transparent pe-5"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <i
              className={`bi ${showPassword ? "bi-eye-slash" : "bi-eye"
                } position-absolute`}
              onClick={() => setShowPassword(!showPassword)}
              style={{
                right: "10px",
                top: "50%",
                transform: "translateY(-50%)",
                cursor: "pointer",
                color: "gray",
              }}
            ></i>
          </div>

          <button type="submit" className="btn btn-primary w-100 fw-bold">
            Login
          </button>

          <p
            className="forgot-password-text mt-3"
            onClick={() => navigate("/forgot-password")}
          >
            Forgot Password?
          </p>
        </form>
      </div>

      <CustomModal
        show={showError}
        title="Incorrect Password"
        message="The password you entered is incorrect. Please try again."
        type="error"
        onClose={() => setShowError(false)}
      />

      <CustomModal
        show={showSuccess}
        title="Welcome Back!"
        message={`Hello, ${userName}! You have successfully logged in.`}
        type="success"
        onClose={handleSuccessClose}
      />
    </div>
  );
};

export default Login;
