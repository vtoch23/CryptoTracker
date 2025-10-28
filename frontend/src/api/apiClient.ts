import axiosInstance from "./axiosInstance";

/**
 * Wrapper around axiosInstance that provides a fetch-like interface
 * but with automatic token handling and 401 redirect
 */
export const apiClient = {
  /**
   * GET request
   */
  async get<T = any>(url: string, options?: RequestInit): Promise<Response> {
    try {
      const response = await axiosInstance.get(url, {
        signal: options?.signal,
      });

      // Create a fetch-like Response object
      return new Response(JSON.stringify(response.data), {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers as any,
      });
    } catch (error: any) {
      // If axios interceptor already handled 401, this error won't reach here
      // But we handle other errors
      throw error;
    }
  },

  /**
   * POST request
   */
  async post<T = any>(url: string, body?: any, options?: RequestInit): Promise<Response> {
    try {
      const response = await axiosInstance.post(url, body, {
        signal: options?.signal,
      });

      return new Response(JSON.stringify(response.data), {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers as any,
      });
    } catch (error: any) {
      throw error;
    }
  },

  /**
   * DELETE request
   */
  async delete<T = any>(url: string, options?: RequestInit): Promise<Response> {
    try {
      const response = await axiosInstance.delete(url, {
        signal: options?.signal,
      });

      return new Response(JSON.stringify(response.data), {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers as any,
      });
    } catch (error: any) {
      throw error;
    }
  },

  /**
   * PATCH request
   */
  async patch<T = any>(url: string, body?: any, options?: RequestInit): Promise<Response> {
    try {
      const response = await axiosInstance.patch(url, body, {
        signal: options?.signal,
      });

      return new Response(JSON.stringify(response.data), {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers as any,
      });
    } catch (error: any) {
      throw error;
    }
  },
};

/**
 * Enhanced fetch function that uses axios instance
 * Provides automatic token injection and 401 handling
 */
export async function apiFetch(url: string, options?: RequestInit): Promise<Response> {
  const method = options?.method?.toUpperCase() || 'GET';

  try {
    switch (method) {
      case 'GET':
        return await apiClient.get(url, options);
      case 'POST':
        const postBody = options?.body ? JSON.parse(options.body as string) : undefined;
        return await apiClient.post(url, postBody, options);
      case 'DELETE':
        return await apiClient.delete(url, options);
      case 'PATCH':
        const patchBody = options?.body ? JSON.parse(options.body as string) : undefined;
        return await apiClient.patch(url, patchBody, options);
      default:
        throw new Error(`Unsupported method: ${method}`);
    }
  } catch (error: any) {
    // If it's a 401 error, the axios interceptor has already redirected to login
    // Don't create a response, just re-throw to let the redirect happen
    if (error.response?.status === 401 || error.message === "Session expired. Please login again.") {
      throw error;
    }

    // For other errors, create an error response
    const errorResponse = new Response(
      JSON.stringify({ detail: error.message || 'Request failed' }),
      {
        status: error.response?.status || 500,
        statusText: error.response?.statusText || 'Internal Server Error',
      }
    );
    return errorResponse;
  }
}

export default apiClient;
