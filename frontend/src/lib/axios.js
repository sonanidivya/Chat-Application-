import axios from "axios";

const API_BASE_URL =
  import.meta.env.MODE === "development"
    ? "http://localhost:3000/api"
    : "https://chat-app-backend.onrender.com/api"; // 👈 use your real backend URL here

export const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});
