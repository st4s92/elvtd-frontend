import axios from "axios";

const axiosClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
});

// REQUEST — attach bearer
axiosClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

// RESPONSE — global error handling
axiosClient.interceptors.response.use(
  (response) => {
    // API structure: {status, code, data, message}
    return response.data;
  },
  (error) => {
    const status = error?.response?.status || 500;
    const message =
      error?.response?.data?.message || error.message || "Unknown error";

    console.error(`${message}. error ${status}`);

    return Promise.reject(error);
  }
);

export default axiosClient;
