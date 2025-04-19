import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import api from "../utils/axiosConfig";
import collegeLogoWhite from "../assets/collegeLogoWhite.png";

// Reusable Input
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

const AuthButton = ({ isSubmitting, label, className }) => {
  return (
    <button
      type="submit"
      disabled={isSubmitting}
      className={`w-full flex justify-center items-center px-4 py-3 rounded-lg text-white font-medium 
      focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 
      disabled:opacity-50 disabled:cursor-not-allowed bg-blue-600 hover:bg-blue-700 
      transition-all duration-300 transform hover:-translate-y-0.5 ${className}`}
    >
      {isSubmitting ? (
        <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24">
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
      ) : (
        label
      )}
    </button>
  );
};

const SignUpPage = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

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
        setGeneralError(t("signup.errors.invalidEmail"));
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
      setGeneralError(
        error.response?.data?.message || t("signup.errors.unexpected")
      );
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
        error.response?.data?.message || t("signup.errors.invalidCode")
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderDetailsForm = () => (
    <form onSubmit={handleDetailsSubmit} className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl text-white font-semibold mb-2">
          {t("signup.createAccount")}
        </h2>
        <p className="text-gray-400 text-sm">{t("signup.fillDetails")}</p>
      </div>

      <FormInput
        name="username"
        label={t("signup.username")}
        value={formData.username}
        onChange={handleChange}
        error={errors.username}
        placeholder={t("signup.usernamePlaceholder")}
      />
      <FormInput
        name="name"
        label={t("signup.name")}
        value={formData.name}
        onChange={handleChange}
        error={errors.name}
        placeholder={t("signup.namePlaceholder")}
      />
      <FormInput
        name="email"
        label={t("signup.email")}
        type="email"
        value={formData.email}
        onChange={handleChange}
        error={errors.email}
        placeholder={t("signup.emailPlaceholder")}
      />

      <AuthButton isSubmitting={isSubmitting} label={t("signup.continue")} />

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
          {t("signup.verifyEmail")}
        </h2>
        <p className="text-gray-400 text-sm">
          {t("signup.codeSentTo")}
          <br />
          <span className="font-medium text-gray-300">{formData.email}</span>
        </p>
      </div>

      <FormInput
        name="verificationCode"
        label={t("signup.verificationCode")}
        value={formData.verificationCode}
        onChange={handleChange}
        error={errors.verificationCode}
        placeholder={t("signup.verificationCodePlaceholder")}
        maxLength={6}
        className="text-center tracking-widest text-lg"
      />

      <div className="space-y-4">
        <AuthButton isSubmitting={isSubmitting} label={t("signup.verify")} />

        <button
          type="button"
          className="text-sm text-gray-400 hover:text-white transition-colors duration-300 block mx-auto"
          onClick={() => setStage("details")}
        >
          {t("signup.backToDetails")}
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
        <div dir="ltr" className="flex items-center justify-center space-x-3 mb-8">
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
              {t("common.collegeName")}
            </p>{" "}
          </div>
        </div>

        <div className="bg-gray-800/30 backdrop-blur-sm rounded-xl shadow-2xl px-4 py-8 sm:px-10">
          {stage === "details" ? renderDetailsForm() : renderVerificationForm()}
        </div>

        <div className="mt-8 text-center">
          <p className="text-gray-400">
            {t("signup.alreadyHaveAccount")}{" "}
            <button
              onClick={() => navigate("/login")}
              className="text-blue-400 hover:text-blue-300 font-medium transition-colors duration-300"
            >
              {t("signup.login")}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default SignUpPage;
