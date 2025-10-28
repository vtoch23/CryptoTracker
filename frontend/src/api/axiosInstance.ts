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
  (response) => {
    // If response is successful, just return it
    return response;
  },
  (error) => {
    // Don't log canceled requests (user initiated or component unmount)
    if (error.code !== "ERR_CANCELED" && error.name !== "CanceledError") {
      console.log("Axios interceptor caught error:", error);
      console.log("Error response status:", error.response?.status);
    }

    // Check if error is due to unauthorized access (401)
    if (error.response && error.response.status === 401) {
      console.log("401 Unauthorized detected - logging out");

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
