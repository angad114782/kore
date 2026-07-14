import axios from "axios";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5005/api";
const headers = () => {
  const token = localStorage.getItem("kore_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const settingsService = {
  get: async (key: string): Promise<string> => {
    const res = await axios.get(`${API_BASE}/settings/${key}`, { headers: headers() });
    return res.data?.data?.value || "";
  },
  getRaw: async (key: string): Promise<{ value: string; configured?: boolean }> => {
    const res = await axios.get(`${API_BASE}/settings/${key}`, { headers: headers() });
    return res.data?.data || { value: "" };
  },
  save: async (key: string, value: string): Promise<void> => {
    await axios.put(`${API_BASE}/settings/${key}`, { value }, { headers: headers() });
  },
};
