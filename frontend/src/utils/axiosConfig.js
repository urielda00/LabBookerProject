// src/utils/axiosConfig.js

import axios from "axios";

const api = axios.create({
  baseURL: process.env.REACT_APP_API_BASE_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 30000,
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error),
);

// Updated Response Interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (!error.response) {
      const networkError = new Error("Network error: Unable to reach the server.");
      return Promise.reject(networkError);
    }

    const { status, data } = error.response;

    // Update the existing error's message instead of creating a new error
    switch (status) {
      case 400:
        error.message = data.message || "Bad request. Check your input.";
        break;
      case 401:
        localStorage.clear();
        window.location.href = "/login";
        error.message = data.message || "Unauthorized. Redirecting to login.";
        break;
      case 403:
        error.message = data.message || "Forbidden. Access denied.";
        break;
      case 404:
        error.message = data.message || "Resource not found.";
        break;
      case 500:
        error.message = data.message || "Internal server error.";
        break;
      default:
        error.message = data.message || "An unexpected error occurred.";
    }

    return Promise.reject(error); // Reject the modified error
  },
);

export default api;