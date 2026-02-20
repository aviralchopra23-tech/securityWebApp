// src/api/axios.js
import axios from "axios";

const API = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api",
  headers: { "Content-Type": "application/json" },
});

// Attach token
API.interceptors.request.use(
  (config) => {
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