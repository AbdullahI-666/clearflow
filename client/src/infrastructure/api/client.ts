import axios from 'axios';

// In-Memory Fast Response Cache for instant page transitions (0ms response)
const apiCache = new Map<string, { data: any; status: number; statusText: string; headers: any; timestamp: number }>();
const CACHE_TTL_MS = 15000; // 15 seconds fast memory cache

export const clearApiCache = () => {
  apiCache.clear();
};

const resolveApiBaseUrl = (): string => {
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    // On localhost, 127.0.0.1, or local IP, always use local /api directly
    if (host === 'localhost' || host === '127.0.0.1' || host === '0.0.0.0' || host.startsWith('192.168.') || host.startsWith('10.')) {
      return '/api';
    }
  }
  return import.meta.env.VITE_API_URL || '/api';
};

export const apiClient = axios.create({
  baseURL: resolveApiBaseUrl(),
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('clearflow_token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // Clear cache on write operations to ensure fresh data after create/update
  const method = (config.method || 'get').toLowerCase();
  if (method !== 'get') {
    clearApiCache();
  }

  return config;
});

// Cache adapter wrapper on axios get for instant responses
const originalGet = apiClient.get;
apiClient.get = async function <_T = any, R = any, _D = any>(url: string, config?: any): Promise<R> {
  const cacheKey = `${url}?${JSON.stringify(config?.params || {})}`;
  const cached = apiCache.get(cacheKey);
  const now = Date.now();

  if (cached && now - cached.timestamp < CACHE_TTL_MS) {
    // Return cached response synchronously (instant 0ms render)
    return Promise.resolve({
      data: cached.data,
      status: cached.status,
      statusText: cached.statusText,
      headers: cached.headers,
      config,
    } as any);
  }

  const response: any = await originalGet.call(apiClient, url, config);
  if (response && response.status === 200) {
    apiCache.set(cacheKey, {
      data: response.data,
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
      timestamp: Date.now(),
    });
  }
  return response as R;
};

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('clearflow_token');
      localStorage.removeItem('clearflow_user');
      clearApiCache();
      const isAuthPage = window.location.pathname === '/login' || window.location.pathname === '/register';
      if (!isAuthPage) {
        try {
          sessionStorage.setItem('clearflow_skip_preloader', 'true');
        } catch (e) {}
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);
