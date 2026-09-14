export const ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    VERIFY_EMAIL: (token: string) => `/auth/verify-email/${token}`,
    ME: '/auth/me',
    FORGOT_PASSWORD: '/auth/forgot-password',
    RESET_PASSWORD: (token: string) => `/auth/reset-password/${token}`,
  },
  WORK_ORDERS: {
    BASE: '/work-orders',
    CATEGORIES: '/work-orders/categories',
    BY_ID: (id: string) => `/work-orders/${id}`,
    UPDATE_STATUS: (id: string) => `/work-orders/${id}/status`,
    ASSIGN_OVERRIDE: (id: string) => `/work-orders/${id}/assign`,
    UPLOAD_BEFORE: (id: string) => `/work-orders/${id}/images/before`,
    UPLOAD_AFTER: (id: string) => `/work-orders/${id}/images/after`,
    RATE: (id: string) => `/work-orders/${id}/rating`,
  },
  TEAMS: {
    BASE: '/teams',
    BY_ID: (id: string) => `/teams/${id}`,
    DEACTIVATE: (id: string) => `/teams/${id}/deactivate`,
  },
  TRACKING: {
    UPDATE: '/tracking/update',
    ALL: '/tracking/all',
    TEAM: (teamId: string) => `/tracking/${teamId}`,
  },
  CHAT: {
    MESSAGES: (workOrderId: string) => `/chat/${workOrderId}`,
  },
  NOTIFICATIONS: {
    BASE: '/notifications',
    MARK_READ: (id: string) => `/notifications/${id}/read`,
    MARK_ALL_READ: '/notifications/read-all',
  },
  ANALYTICS: {
    DASHBOARD: '/analytics',
    PREDICT: '/analytics/predict',
    EXPORT: '/analytics/export',
  },
  REPORTS: {
    PDF: (id: string) => `/reports/${id}/pdf`,
    INVOICE: (id: string) => `/reports/${id}/invoice`,
  },
  USERS: {
    BASE: '/users',
    BY_ID: (id: string) => `/users/${id}`,
    UPDATE: (id: string) => `/users/${id}`,
    DEACTIVATE: (id: string) => `/users/${id}/deactivate`,
  },
  SETTINGS: {
    BASE: '/settings',
  },
  AI: {
    VERIFY: '/ai/verify',
    FORECAST: '/ai/forecast',
    DISPATCH_RECOMMENDATIONS: (id: string) => `/ai/dispatch-recommendations/${id}`,
    ANOMALIES: '/ai/anomalies',
    WASTE_ESTIMATE: '/ai/waste/estimate',
  },
};

