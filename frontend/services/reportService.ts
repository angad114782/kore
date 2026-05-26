import axios from "axios";

const API_URL = (import.meta.env.VITE_API_BASE_URL || "http://localhost:5005/api") + "/reports";

const getAuthHeaders = () => {
  const token = localStorage.getItem("kore_token");
  if (!token) throw new Error("No token found");
  return { Authorization: `Bearer ${token}` };
};

export const reportService = {
  getStock: (params?: { page?: number; limit?: number; q?: string }) =>
    axios.get(`${API_URL}/stock`, { headers: getAuthHeaders(), params }),

  getDispatch: (params?: { page?: number; limit?: number; startDate?: string; endDate?: string }) =>
    axios.get(`${API_URL}/dispatch`, { headers: getAuthHeaders(), params }),

  getReturn: (params?: { page?: number; limit?: number; startDate?: string; endDate?: string }) =>
    axios.get(`${API_URL}/return`, { headers: getAuthHeaders(), params }),
};
