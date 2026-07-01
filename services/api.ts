/**
 * 🔌 Centralized API Layer
 * Mirrors the web frontend's axios.ts — same endpoints, same structure.
 * Token injection + global error handling via interceptors.
 */
import axios from 'axios';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const BASE_URL = 'https://food-delivery-backend-173b.onrender.com/api';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// ── Request interceptor: inject Bearer token ──────────────────────
api.interceptors.request.use(async (config) => {
  try {
    let token: string | null = null;
    if (Platform.OS === 'web') {
      token = localStorage.getItem('auth_token');
    } else {
      token = await SecureStore.getItemAsync('auth_token');
    }
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch (e) {
    // Silently ignore
  }
  return config;
});

// ── Response interceptor: global error handling ───────────────────
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired — handled by auth store
      console.warn('[API] 401 Unauthorized — token may be expired');
    }
    return Promise.reject(error);
  }
);

// ═══════════════════════════════════════════════════
//  API NAMESPACES (mirrors web axios.ts exactly)
// ═══════════════════════════════════════════════════

// Pagination params — when `page` is sent, admin list endpoints return
// { data, page, limit, total, totalPages, hasMore, ... } instead of a plain array.
export type PageParams = { page?: number; limit?: number; search?: string };

export const authApi = {
  login: (data: { email: string; password: string }) =>
    api.post('/auth/login', data),
  register: (data: { name: string; email: string; password: string; mobile: string }) =>
    api.post('/auth/register', data),
};

export const userApi = {
  getAll: (params?: PageParams) => api.get('/users', { params }),
  updateUser: (id: string, data: any) => api.put(`/users/${id}`, data),
  deleteUser: (id: string) => api.delete(`/users/${id}`),
  getProfile: () => api.get('/users/profile'),
  updateProfile: (data: any) => api.put('/users/profile', data),
  getAddresses: () => api.get('/users/addresses'),
  addAddress: (data: any) => api.post('/users/addresses', data),
  updateAddress: (id: string, data: any) => api.put(`/users/addresses/${id}`, data),
  deleteAddress: (id: string) => api.delete(`/users/addresses/${id}`),
  selectAddress: (data: any) => api.put('/users/addresses/select', typeof data === 'string' ? { addressId: data } : data),
  reverseGeocode: (lat: number, lng: number) =>
    api.get(`/users/addresses/reverse-geocode?lat=${lat}&lng=${lng}`),
};

export const restaurantApi = {
  get: () => api.get('/restaurant'),
  update: (data: { isOpen?: boolean; openingTime?: string; closingTime?: string; isCodEnabled?: boolean; codStartTime?: string; codEndTime?: string; name?: string; address?: string; deliveryRadius?: number; freeDeliveryRadius?: number; chargePerKm?: number; mobile?: string; logo?: string; gstIn?: string; fssaiLicense?: string }) =>
    api.put('/restaurant', data),
  setLocation: (data: { lat: number; lng: number; address?: string }) =>
    api.put('/restaurant/location', data),
  getVideos: () => api.get('/restaurant/videos'),
  addVideo: (data: { url: string }) => api.post('/restaurant/videos', data),
  deleteVideo: (index: number) => api.delete(`/restaurant/videos/${index}`),
};

// Category management (admin)
export const categoryApi = {
  create: (data: { name: string; imageURL: string }) => api.post('/categories', data),
  update: (id: string, data: { name?: string; imageURL?: string }) => api.put(`/categories/${id}`, data),
  delete: (id: string) => api.delete(`/categories/${id}`),
};

export const menuApi = {
  getCategories: () => api.get('/categories'),
  getCategoryById: (id: string) => api.get(`/categories/${id}`),
  getMenu: (params?: { type?: string; search?: string }) =>
    api.get('/menu', { params }),
  getAdminMenu: () => api.get('/menu/admin'),
  getProductById: (id: string) => api.get(`/menu/${id}`),
};

export const cartApi = {
  getCart: () => api.get('/cart'),
  addToCart: (data: { productId: string; quantity?: number; variant?: string }) =>
    api.post('/cart', data),
  updateCartItem: (itemId: string, data: { quantity: number }) =>
    api.put(`/cart/${itemId}`, data),
  removeFromCart: (itemId: string) => api.delete(`/cart/${itemId}`),
  clearCart: () => api.delete('/cart'),
  applyCoupon: (data: { code: string }) => api.post('/cart/coupon', data),
  removeCoupon: () => api.delete('/cart/coupon'),
  getBill: (lat?: number, lng?: number) =>
    api.get('/cart/bill', { params: { lat, lng } }),
  reorder: (orderId: string) => api.post('/cart/reorder', { orderId }),
  getRecommendations: () => api.get('/cart/recommendations'),
};

export const orderApi = {
  placeOrder: (data: any) => api.post('/orders', data),
  getMyOrders: () => api.get('/orders/my-orders'),
  getOrderById: (id: string) => api.get(`/orders/${id}`),
  cancelOrder: (id: string, reason?: string) => api.post(`/orders/${id}/cancel`, { reason }),
};

export const paymentApi = {
  createOrder: (data: any) => api.post('/orders/payment/create', data),
  verifyPayment: (data: any) => api.post('/orders/payment/verify', data),
};

export const couponApi = {
  getAll: () => api.get('/coupons'),
  validateCoupon: (data: { code: string; cartValue: number }) =>
    api.post('/coupons/validate', data),
  create: (data: any) => api.post('/coupons', data),
  update: (id: string, data: any) => api.put(`/coupons/${id}`, data),
  delete: (id: string) => api.delete(`/coupons/${id}`),
};

export const reviewApi = {
  submitReview: (data: any) => api.post('/reviews', data),
  getMyReviews: () => api.get('/reviews/my'),
  getProductReviews: (productId: string) => api.get(`/reviews/product/${productId}`),
  // Admin
  getStats: () => api.get('/reviews/stats'),
  getAdminReviews: (params?: PageParams) => api.get('/reviews/admin', { params }),
};

export const chatApi = {
  getOrCreateChat: () => api.get('/chat'),
  createNewChat: () => api.post('/chat/create'),
  sendMessage: (data: { text: string; images?: string[] }) => api.post('/chat/message', data),
  markRead: () => api.put('/chat/read'),
  
  // Admin endpoints
  getAllChats: () => api.get('/chat/admin/all'),
  getChatById: (chatId: string) => api.get(`/chat/admin/${chatId}`),
  adminReply: (chatId: string, data: { text: string; images?: string[] }) => api.post(`/chat/admin/${chatId}/message`, data),
  closeChat: (chatId: string) => api.put(`/chat/admin/${chatId}/close`),
  deleteChat: (chatId: string) => api.delete(`/chat/admin/${chatId}`),
};

export const adminApi = {
  getDashboardStats: () => api.get('/admin/dashboard'),
  getDashboard: (params?: { startDate?: string; endDate?: string }) => api.get('/admin/dashboard', { params }),
  getAnalytics: (params?: { startDate?: string; endDate?: string }) => api.get("/admin/analytics", { params }),
  getMapAnalytics: (params?: { startDate?: string; endDate?: string }) => api.get('/admin/analytics/map', { params }),

  // POS (Offline Billing)
  createPOSOrder: (data: { items: any[]; customerName?: string; customerMobile?: string; paymentMethod: string }) =>
    api.post('/admin/pos/create', data),
  getPOSOrders: (params?: PageParams) => api.get('/admin/pos/orders', { params }),


  // Orders
  getOrders: (params?: PageParams & { status?: string; search?: string; startDate?: string; endDate?: string; refunds?: string }) =>
    api.get('/admin/orders', { params }),
  getOrderStats: () => api.get('/admin/orders/stats'),
  getOrdersByStatus: (status: string) => api.get(`/admin/orders/${status}`),
  updateOrderStatus: (id: string, data: { status: string }) => 
    api.put(`/admin/orders/${id}/status`, data),
  cancelOrder: (id: string) => api.put(`/admin/orders/${id}/status`, { status: 'CANCELLED' }),
  updatePaymentStatus: (id: string, data: { paymentStatus: string }) => 
    api.put(`/admin/orders/${id}/payment-status`, data),
  updatePreparationTime: (id: string, data: { preparationTime: number }) => 
    api.put(`/admin/orders/${id}/preparation-time`, data),
  processRefund: (id: string) => api.put(`/admin/orders/${id}/refund`),
    
  // Menu
  addMenuItem: (data: any) => api.post('/menu', data),
  updateMenuItem: (id: string, data: any) => api.put(`/menu/${id}`, data),
  deleteMenuItem: (id: string) => api.delete(`/menu/${id}`),
  toggleProductStock: (id: string) => api.put(`/menu/${id}/toggle-stock`),
  
  // Users
  getUsers: (params?: PageParams) => api.get('/admin/users', { params }),
};

export const uploadApi = {
  uploadImage: async (formData: FormData) => {
    let token: string | null = null;
    try {
      if (Platform.OS === 'web') {
        token = localStorage.getItem('auth_token');
      } else {
        token = await SecureStore.getItemAsync('auth_token');
      }
    } catch (e) {}

    const res = await fetch(`${BASE_URL}/upload`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });
    
    if (!res.ok) throw new Error('Upload format rejected by backend.');
    const json = await res.json();
    return { data: json };
  },
  uploadMultipleImages: async (files: { uri: string; name: string; type: string }[]) => {
    const uploadPromises = files.map(async (file) => {
      const formData = new FormData();
      
      if (Platform.OS === 'web') {
        const response = await fetch(file.uri);
        const blob = await response.blob();
        formData.append('image', blob, file.name);
      } else {
        formData.append('image', file as any);
      }

      return uploadApi.uploadImage(formData);
    });
    const responses = await Promise.all(uploadPromises);
    return responses.map((res) => res.data.url as string);
  },
  uploadVideo: async (file: { uri: string; name: string; type: string }) => {
    let token: string | null = null;
    try {
      if (Platform.OS === 'web') {
        token = localStorage.getItem('auth_token');
      } else {
        token = await SecureStore.getItemAsync('auth_token');
      }
    } catch (e) {}

    const formData = new FormData();
    if (Platform.OS === 'web') {
      const response = await fetch(file.uri);
      const blob = await response.blob();
      formData.append('video', blob, file.name);
    } else {
      formData.append('video', file as any);
    }

    const res = await fetch(`${BASE_URL}/upload/video`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });
    if (!res.ok) throw new Error('Video upload rejected by backend.');
    const json = await res.json();
    return { data: json };
  },
};

export const vlogApi = {
  getAll: () => api.get('/vlogs'),
  incrementView: (id: string) => api.put(`/vlogs/${id}/view`),
  toggleLike: (id: string) => api.put(`/vlogs/${id}/like`),
  // Admin routes
  getAdminVlogs: (params?: PageParams) => api.get("/vlogs/admin", { params }),
  createVlog: (data: any) => api.post("/vlogs", data),
  updateVlog: (id: string, data: any) => api.put(`/vlogs/${id}`, data),
  deleteVlog: (id: string) => api.delete(`/vlogs/${id}`),
};

export default api;
