import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import api from "../utils/axiosConfig";
import collegeLogoWhite from "../assets/collegeLogoWhite.png";

// FormInput Component
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

// ErrorMessage Component
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

// AuthButton Component
const AuthButton = ({ isSubmitting, label, className }) => {
  return (
    <button
      type="submit"
      disabled={isSubmitting}
      className={`
        w-full flex justify-center items-center px-4 py-3 rounded-lg
        text-white font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 
        focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed
        bg-blue-600 hover:bg-blue-700 transition-all duration-300 transform hover:-translate-y-0.5
        ${className}
      `}
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

const LogInPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [stage, setStage] = useState("email");
  const [formData, setFormData] = useState({ email: "", verificationCode: "" });
  const [generalError, setGeneralError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resendDisabled, setResendDisabled] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem("token");
      const user = localStorage.getItem("user");

      if (token && user) {
        try {
          await api.get("/auth/verify-token");
          navigate("/homepage");
        } catch {
          localStorage.clear();
        }
      }
    };
    checkAuth();
  }, [navigate]);

  useEffect(() => {
    let interval;
    if (resendTimer > 0) {
      interval = setInterval(() => setResendTimer((prev) => prev - 1), 1000);
    } else {
      setResendDisabled(false);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  const handleError = (error) => {
    if (error.response) {
      switch (error.response.status) {
        case 401:
          setGeneralError(t("login.errors.invalidCode"));
          break;
        case 404:
          setGeneralError(t("login.errors.emailNotFound"));
          break;
        case 429:
          setGeneralError(t("login.errors.tooManyAttempts"));
          setResendDisabled(true);
          setResendTimer(60);
          break;
        default:
          setGeneralError(
            error.response.data.message || t("login.errors.unexpected")
          );
      }
    } else if (error.request) {
      setGeneralError(t("login.errors.network"));
    } else {
      setGeneralError(t("login.errors.unexpected"));
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setGeneralError("");
  };

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setGeneralError("");

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setGeneralError(t("login.errors.invalidEmailFormat"));
      setIsSubmitting(false);
      return;
    }

    try {
      await api.post("/auth/login", { email: formData.email });
      setStage("verification");
      setResendDisabled(true);
      setResendTimer(30);
    } catch (error) {
      handleError(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerificationSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setGeneralError("");

    try {
      const response = await api.post("/auth/verify-login", {
        email: formData.email,
        code: formData.verificationCode,
      });

      const { user, accessToken, refreshToken } = response.data;
      localStorage.setItem("user", JSON.stringify(user));
      localStorage.setItem("token", accessToken);
      localStorage.setItem("refreshToken", refreshToken);

      const from = location.state?.from?.pathname || "/homepage";
      navigate(from);
    } catch (error) {
      handleError(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendCode = async () => {
    if (resendDisabled) return;
    setIsSubmitting(true);
    setGeneralError("");

    try {
      await api.post("/auth/request-code", { email: formData.email });
      setResendDisabled(true);
      setResendTimer(30);
      setGeneralError(t("login.newCodeSent"));
    } catch (error) {
      handleError(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderEmailForm = () => (
    <form onSubmit={handleEmailSubmit} className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl text-white font-semibold mb-2">
          {t("login.welcomeBack")}
        </h2>
        <p className="text-gray-400 text-sm">{t("login.signInToAccount")}</p>
      </div>

      <FormInput
        type="email"
        name="email"
        label={t("login.emailLabel")}
        value={formData.email}
        onChange={handleChange}
        placeholder={t("login.emailPlaceholder")}
        required
      />

      <AuthButton isSubmitting={isSubmitting} label={t("login.continue")} />

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
          {t("login.enterVerificationCode")}
        </h2>
        <p className="text-gray-400 text-sm">
          {t("login.codeSentTo")}
          <br />
          <span className="font-medium text-gray-300">{formData.email}</span>
        </p>
      </div>

      <FormInput
        name="verificationCode"
        label={t("login.codeLabel")}
        value={formData.verificationCode}
        onChange={handleChange}
        placeholder={t("login.codePlaceholder")}
        maxLength={6}
        required
        className="text-center tracking-widest text-lg"
      />

      <div className="space-y-4">
        <AuthButton isSubmitting={isSubmitting} label={t("login.verify")} />

        <div className="flex flex-col space-y-2">
          <button
            type="button"
            className="text-sm text-gray-400 hover:text-white transition-colors duration-300"
            onClick={() => setStage("email")}
          >
            {t("login.backToEmail")}
          </button>
          <button
            type="button"
            className={`text-sm ${
              resendDisabled
                ? "text-gray-500 cursor-not-allowed"
                : "text-blue-400 hover:text-blue-300 transition-colors duration-300"
            }`}
            onClick={handleResendCode}
            disabled={resendDisabled}
          >
            {resendTimer > 0
              ? t("login.resendCodeIn", { seconds: resendTimer })
              : t("login.resendCode")}
          </button>
        </div>

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
              {" "}
              {t("common.collegeName")}
            </p>
          </div>
        </div>

        <div className="bg-gray-800/30 backdrop-blur-sm rounded-xl shadow-2xl px-4 py-8 sm:px-10">
          {stage === "email" ? renderEmailForm() : renderVerificationForm()}
        </div>

        <div className="mt-8 text-center">
          <p className="text-gray-400">
            {t("login.dontHaveAccount")}{" "}
            <button
              onClick={() => navigate("/signup")}
              className="text-blue-400 hover:text-blue-300 font-medium transition-colors duration-300"
            >
              {t("login.signup")}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LogInPage;
