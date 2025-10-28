// Quick test file to verify the axios interceptor is loaded
import axiosInstance from "./axiosInstance";
import { checkTokenExpiration, decodeToken } from "../utils/tokenExpirationChecker";

console.log("✅ Axios interceptor module loaded!");
console.log("Interceptors registered:", {
  request: axiosInstance.interceptors.request,
  response: axiosInstance.interceptors.response,
});

// Test function you can call from browser console
(window as any).testTokenExpiration = async () => {
  console.log("🧪 Testing token expiration...");

  // Set an obviously invalid token
  localStorage.setItem("token", "invalid.token.here");

  try {
    const response = await axiosInstance.get("/watchlist/");
    console.log("❌ Request succeeded (should have failed):", response);
  } catch (error: any) {
    console.log("✅ Request failed as expected:", error.message);
    console.log("Error response:", error.response);
  }
};

// Function to check current token status
(window as any).checkToken = () => {
  const token = localStorage.getItem('token');

  if (!token) {
    console.log('❌ No token found');
    return;
  }

  const payload = decodeToken(token);
  if (!payload) {
    console.log('❌ Invalid token');
    return;
  }

  const status = checkTokenExpiration();
  const expirationDate = new Date(payload.exp * 1000);
  const now = new Date();

  console.log('🔑 Token Status:');
  console.log('  User ID:', payload.sub);
  console.log('  Expires at:', expirationDate.toLocaleString());
  console.log('  Current time:', now.toLocaleString());
  console.log('  Time remaining:', Math.floor(status.timeRemaining / 1000), 'seconds');
  console.log('  Is expired:', status.isExpired ? '❌ YES' : '✅ NO');

  return status;
};

console.log("💡 Available test commands:");
console.log("  - window.testTokenExpiration() - Test 401 handling");
console.log("  - window.checkToken() - Check current token status");

export {};
