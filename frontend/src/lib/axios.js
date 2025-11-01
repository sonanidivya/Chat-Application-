import axios from "axios";

const API_BASE_URL =
  import.meta.env.MODE === "development"
    ? "http://localhost:3000/api"
    : "https://YOUR-BACKEND-URL.onrender.com/api"; // 👈 replace this with your deployed backend URL

export const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});
