import axios from "axios";

export const AUTH_STORAGE_KEY = "gameartist-hub-session";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api/v1",
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  const savedSession = localStorage.getItem(AUTH_STORAGE_KEY);

  if (savedSession) {
    const session = JSON.parse(savedSession);
    if (session.token) {
      config.headers.Authorization = `Bearer ${session.token}`;
    }
  }

  return config;
});

export default api;
