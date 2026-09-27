import axios from 'axios';

/**
 * Single Axios instance for the entire frontend.
 *
 * baseURL "/api" is intentional — Vite proxy forwards /api/* to Express
 * on port 4000 in development, eliminating CORS entirely.
 * In production, serve the built client from Express and the same
 * relative path works without any env variable changes.
 *
 * NEVER import axios directly in page components. Always import this.
 */
const apiClient = axios.create({
  baseURL: '/api',
  timeout: 15000,          // 15 s — generous for ML inference
  headers: {
    'Content-Type': 'application/json',
  },
});

// Response interceptor — normalise errors so every page gets the same shape
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status  = error.response?.status;
    const message = error.response?.data?.error || error.message || 'Unknown error';
    // Attach a clean message to the error for UI display
    error.uiMessage = `${status ? `[${status}] ` : ''}${message}`;
    return Promise.reject(error);
  }
);

export default apiClient;
