// SignUpPage.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../utils/axiosConfig";

// Import assets
import collegeLogoWhite from "../assets/collegeLogoWhite.png";



// FormInput Component (same as LoginPage)
const FormInput = ({
  label,
  type = "text",
  name,
  value,
  onChange,
  error,
  placeholder,
  required,
  maxLength,
  className,
}) => {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-300">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        maxLength={maxLength}
        className={`
          w-full px-4 py-3 rounded-lg bg-gray-700/50 border border-gray-600 
          text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 
          focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50
          transition-all duration-300 ${className}
        `}
      />
      {error && <p className="text-red-400 text-sm mt-1">{error}</p>}
    </div>
  );
};

// ErrorMessage Component (same as LoginPage)
const ErrorMessage = ({ message, onClose, className }) => {
  if (!message) return null;

  return (
    <div
      className={`bg-red-500/10 border border-red-500 text-red-500 px-4 py-3 rounded-lg mt-4 ${className}`}
    >
      <div className="flex justify-between items-center">
        <p className="text-sm">{message}</p>
        <button
          onClick={onClose}
          className="text-red-500 hover:text-red-400 focus:outline-none"
        >
          ×
        </button>
      </div>
    </div>
  );
};

// AuthButton Component (same as LoginPage)
const AuthButton = ({ isSubmitting, label, className }) => {
  return (
    <button
      type="submit"
      disabled={isSubmitting}
      className={`
        w-full flex justify-center items-center px-4 py-3 rounded-lg
        text-white font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 
        focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed
        ${className}
      `}
    >
      {isSubmitting ? (
        <svg
          className="animate-spin h-5 w-5 text-white"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          ></circle>
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          ></path>
        </svg>
      ) : (
        label
      )}
    </button>
  );
};

const SignUpPage = () => {
  const navigate = useNavigate();
  const [stage, setStage] = useState("details");
  const [formData, setFormData] = useState({
    username: "",
    name: "",
    email: "",
    verificationCode: "",
  });
  const [errors, setErrors] = useState({});
  const [generalError, setGeneralError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
    setGeneralError("");
  };

  const handleDetailsSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        setGeneralError("Please enter a valid email address");
        return;
      }

      await api.post("/auth/signup", {
        username: formData.username,
        name: formData.name,
        email: formData.email,
      });

      setStage("verification");
      setGeneralError("");
    } catch (error) {
      setGeneralError(error.response?.data?.message || "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerificationSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await api.post("/auth/verify-signup", {
        email: formData.email,
        code: formData.verificationCode,
      });

      navigate("/login");
    } catch (error) {
      setGeneralError(
        error.response?.data?.message || "Invalid verification code",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderDetailsForm = () => (
    <form onSubmit={handleDetailsSubmit} className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl text-white font-semibold mb-2">
          Create Account
        </h2>
        <p className="text-gray-400 text-sm">
          Fill in your details to get started
        </p>
      </div>

      <FormInput
        name="username"
        label="Username"
        value={formData.username}
        onChange={handleChange}
        error={errors.username}
        placeholder="Enter your username"
      />
      <FormInput
        name="name"
        label="Full Name"
        value={formData.name}
        onChange={handleChange}
        error={errors.name}
        placeholder="Enter your full name"
      />
      <FormInput
        name="email"
        label="Email"
        type="email"
        value={formData.email}
        onChange={handleChange}
        error={errors.email}
        placeholder="Enter your email"
      />

      <AuthButton
        isSubmitting={isSubmitting}
        label="Continue"
        className="w-full py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-all duration-300 transform hover:-translate-y-0.5"
      />

      {generalError && (
        <ErrorMessage
          message={generalError}
          onClose={() => setGeneralError("")}
        />
      )}
    </form>
  );

  const renderVerificationForm = () => (
    <form onSubmit={handleVerificationSubmit} className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl text-white font-semibold mb-2">
          Verify Your Email
        </h2>
        <p className="text-gray-400 text-sm">
          Enter the code sent to
          <br />
          <span className="font-medium text-gray-300">{formData.email}</span>
        </p>
      </div>

      <FormInput
        name="verificationCode"
        label="Verification Code"
        value={formData.verificationCode}
        onChange={handleChange}
        error={errors.verificationCode}
        placeholder="Enter 6-digit code"
        maxLength={6}
        className="text-center tracking-widest text-lg"
      />

      <div className="space-y-4">
        <AuthButton
          isSubmitting={isSubmitting}
          label="Verify"
          className="w-full py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-all duration-300 transform hover:-translate-y-0.5"
        />

        <button
          type="button"
          className="text-sm text-gray-400 hover:text-white transition-colors duration-300 block mx-auto"
          onClick={() => setStage("details")}
        >
          ← Back to Details
        </button>

        {generalError && (
          <ErrorMessage
            message={generalError}
            onClose={() => setGeneralError("")}
          />
        )}
      </div>
    </form>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Header */}
        <div className="flex items-center justify-center space-x-3 mb-8">
          <img
            className="w-16 md:w-20 h-auto object-contain drop-shadow-xl"
            src={collegeLogoWhite}
            alt="logo"
          />
          <div className="border-l border-gray-600 pl-3">
            <h4 className="text-2xl md:text-3xl font-bold text-white tracking-wider">
              LabBooker
            </h4>
            <p className="text-xs md:text-sm text-gray-400">
              Azrieli College of Engineering
            </p>
          </div>
        </div>

        {/* Form Container */}
        <div className="bg-gray-800/30 backdrop-blur-sm rounded-xl shadow-2xl px-4 py-8 sm:px-10">
          {stage === "details" ? renderDetailsForm() : renderVerificationForm()}
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-gray-400">
            Already have an account?{" "}
            <button
              onClick={() => navigate("/login")}
              className="text-blue-400 hover:text-blue-300 font-medium transition-colors duration-300"
            >
              Log in
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default SignUpPage;
