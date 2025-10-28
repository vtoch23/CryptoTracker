import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

// Create axios instance
const axiosInstance = axios.create({
  baseURL: API_URL,
});

// Request interceptor to add token to every request
axiosInstance.interceptors.request.use(
  (config) => {
    const token = window.localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle token expiration
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    // Check if error is due to unauthorized access (401)
    if (error.response && error.response.status === 401) {
      // Clear the token from localStorage
      window.localStorage.removeItem("token");

      // Redirect to login page
      window.location.href = "/login";

      // Return a custom error message
      return Promise.reject(new Error("Session expired. Please login again."));
    }

    // For other errors, just pass them through
    return Promise.reject(error);
  }
);

export default axiosInstance;
