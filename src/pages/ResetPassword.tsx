import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Login.css";
import SystemTitle from "../components/SystemTitle";
import CustomModal from "../components/Modals";

const ResetPassword: React.FC = () => {
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);

    const [showMismatch, setShowMismatch] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);

    const navigate = useNavigate();

    const handleReset = (e: React.FormEvent) => {
        e.preventDefault();

        if (newPassword !== confirmPassword) {
            setShowMismatch(true);
            return;
        }

        setShowSuccess(true);
    };

    return (
        <div className="login-page">
            <SystemTitle />

            <div className="login-card p-4 py-5 pt-10 pb-10">
                <h3 className="mb-4 fw-bold">Reset Password</h3>

                <form onSubmit={handleReset}>
                    <div className="mb-3 position-relative">
                        <input
                            type={showPassword ? "text" : "password"}
                            className="form-control border-0 border-bottom bg-transparent pe-5"
                            placeholder="New Password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            required
                        />
                        <i
                            className={`bi ${showPassword ? "bi-eye-slash" : "bi-eye"} position-absolute`}
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

                    <div className="mb-3">
                        <input
                            type={showPassword ? "text" : "password"}
                            className="form-control border-0 border-bottom bg-transparent"
                            placeholder="Confirm New Password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                        />
                    </div>

                    <button type="submit" className="btn btn-primary w-100 fw-bold">
                        Reset Password
                    </button>
                </form>

                <p
                    className="forgot-password-text mt-3"
                    onClick={() => navigate("/")}
                >
                    Back to Login
                </p>
            </div>

            <CustomModal
                show={showMismatch}
                title="Passwords Don't Match"
                message="Please make sure both passwords are the same."
                type="error"
                onClose={() => setShowMismatch(false)}
            />

            <CustomModal
                show={showSuccess}
                title="Password Changed"
                message="Your password has been successfully updated."
                type="success"
                onClose={() => {
                    setShowSuccess(false);
                    navigate("/");
                }}
            />
        </div>
    );
};

export default ResetPassword;