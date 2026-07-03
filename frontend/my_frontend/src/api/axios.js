import axios from "axios";

// ─── Base instance ────────────────────────────────────────────────────────────
const api = axios.create({
  baseURL: "http://127.0.0.1:8000/api/",   // adjust if your backend runs elsewhere
});

// ─── Request interceptor — stamp every request with the access token ──────────
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("access");
    
    if (token) {
      config.headers["Authorization"] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ─── Response interceptor — silently refresh on 401, retry once ───────────────
api.interceptors.response.use(
  (response) => response,           // 2xx: pass straight through

  async (error) => {
    const original = error.config;

    // Only attempt refresh once per request (_retry flag prevents infinite loops)
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;

      try {
        const refresh = localStorage.getItem("refresh");

        if (!refresh) {
          // No refresh token stored — send the user to login
          redirectToLogin();
          return Promise.reject(error);
        }

        // Call the SimpleJWT refresh endpoint directly (not through `api`,
        // so a 401 here doesn't re-trigger this interceptor)
        const { data } = await axios.post(
          "http://127.0.0.1:8000/api/token/refresh/",
          { refresh }
        );

        // Persist the new access token
        localStorage.setItem("access", data.access);

        // Retry the original request with the new token
        original.headers["Authorization"] = `Bearer ${data.access}`;
        return api(original);

      } catch (refreshError) {
        // Refresh itself failed (token expired / revoked) — force re-login
        redirectToLogin();
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

function redirectToLogin() {
  localStorage.removeItem("access");
  localStorage.removeItem("refresh");
  localStorage.removeItem("username");
  localStorage.removeItem("role");
  window.location.href = "/login";
}

export default api;