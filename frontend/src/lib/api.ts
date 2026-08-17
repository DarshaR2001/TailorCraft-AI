import axios from "axios";

const api = axios.create({
  baseURL: "/api/proxy",
  timeout: 300_000, // AI calls can take up to 5 min on free LLM gateways
  headers: {
    "Content-Type": "application/json",
  },
});

// ── Request Interceptor ────────────────────────────────────────────────────
api.interceptors.request.use(
  (config) => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("tc_access_token");
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Response Interceptor ───────────────────────────────────────────────────
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && typeof window !== "undefined") {
      localStorage.removeItem("tc_access_token");
      window.dispatchEvent(new CustomEvent("auth:expired"));
    }
    return Promise.reject(error);
  }
);

export default api;
