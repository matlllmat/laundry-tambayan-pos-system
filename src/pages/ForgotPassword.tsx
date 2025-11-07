import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Login.css";
import CustomModal from "../components/Modals";
import SystemTitle from "../components/SystemTitle";

const ForgotPassword: React.FC = () => {
    const [email, setEmail] = useState("");
    const [otp, setOtp] = useState("");
    const [step, setStep] = useState<"email" | "otp">("email");

    const [showSentModal, setShowSentModal] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [showError, setShowError] = useState(false);

    const navigate = useNavigate();

    const handleSendOtp = (e: React.FormEvent) => {
        e.preventDefault();
        setShowSentModal(true);
    };

    const handleVerifyOtp = (e: React.FormEvent) => {
        e.preventDefault();

        // Hardcoded OTP should come from email using backend logic or a magic spell :)
        if (otp === "123456") {
            setShowSuccess(true);
        } else {
            setShowError(true);
        }
    };

    return (
        <div className="login-page">
            <SystemTitle />

            <div className="login-card p-4 py-5 pt-10 pb-10">
                <h3 className="mb-4 fw-bold">
                    {step === "email" ? "Forgot Password" : "Enter OTP"}
                </h3>

                {step === "email" ? (
                    <form onSubmit={handleSendOtp}>
                        <input
                            type="email"
                            className="form-control border-0 border-bottom bg-transparent mb-4"
                            placeholder="Enter your email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />

                        <button type="submit" className="btn btn-primary w-100 fw-bold">
                            Send OTP
                        </button>
                    </form>
                ) : (
                    <form onSubmit={handleVerifyOtp}>
                        <input
                            type="text"
                            className="form-control border-0 border-bottom bg-transparent mb-4"
                            placeholder="Enter OTP"
                            value={otp}
                            onChange={(e) => setOtp(e.target.value)}
                            required
                        />

                        <button type="submit" className="btn btn-primary w-100 fw-bold">
                            Verify OTP
                        </button>
                    </form>
                )}

                <p
                    className="forgot-password-text mt-3"
                    onClick={() => navigate("/")}
                >
                    Back to Login
                </p>
            </div>

            <CustomModal
                show={showSentModal}
                title="OTP Sent!"
                message="An OTP has been sent to your email. Please check your inbox."
                type="info"
                onClose={() => {
                    setShowSentModal(false);
                    setStep("otp");
                }}
            />

            <CustomModal
                show={showSuccess}
                title="OTP Verified!"
                message="Your OTP is correct. Redirecting to reset password page..."
                type="success"
                onClose={() => {
                    setShowSuccess(false);
                    navigate("/reset-password");
                }}
            />

            <CustomModal
                show={showError}
                title="Invalid OTP"
                message="The OTP you entered is incorrect. Please try again."
                type="error"
                onClose={() => setShowError(false)}
            />
        </div>
    );
};

export default ForgotPassword;
