import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

interface TokenResponse {
  access_token: string;
  token_type: string;
}

export interface RegisterData {
  email: string;
  password: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export const registerUser = async (data: RegisterData) => {
  try {
    const response = await axios.post(`${API_URL}/auth/register`, data, {
      headers: { "Content-Type": "application/json" },
    });
    return response.data;
  } catch (err: any) {
    throw err.response?.data?.detail || err.message;
  }
};

export const loginUser = async (data: LoginData): Promise<TokenResponse> => {
  try {
    const params = new URLSearchParams();
    params.append("username", data.email.toLowerCase());
    params.append("password", data.password);

    const response = await axios.post<TokenResponse>(
      `${API_URL}/auth/token`,
      params,
      {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      }
    );
    return response.data;
  } catch (err: any) {
    throw err.response?.data?.detail || err.message;
  }
};
