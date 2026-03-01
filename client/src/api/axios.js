// src/api/axios.js
import axios from "axios";

const envBaseUrl = (import.meta.env.VITE_API_BASE_URL || "").trim();
const hostname = typeof window !== "undefined" ? window.location.hostname : "";
const isLocalHost = hostname === "localhost" || hostname === "127.0.0.1";

const resolvedBaseURL = envBaseUrl || (isLocalHost ? "http://localhost:5000/api" : "");

const API = axios.create({
  baseURL: resolvedBaseURL,
  headers: { "Content-Type": "application/json" },
});

const API_CONFIG_ERROR =
  "API base URL is not configured. Set VITE_API_BASE_URL in your deployed frontend environment.";

// Attach token
API.interceptors.request.use(
  (config) => {
    if (!resolvedBaseURL) {
      const error = new Error(API_CONFIG_ERROR);
      error.code = "ERR_API_BASE_URL";
      return Promise.reject(error);
    }

    const token = localStorage.getItem("token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
    else delete config.headers.Authorization;
    return config;
  },
  (error) => Promise.reject(error)
);

// Optional: global 401 handling (don’t hard-redirect here unless you want)
API.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err?.response?.status === 401) {
      // token expired/invalid: you can optionally clear token
      // localStorage.removeItem("token");
      // window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);

export default API;