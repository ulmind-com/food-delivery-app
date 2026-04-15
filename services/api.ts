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

export const authApi = {
  login: (data: { email: string; password: string }) =>
    api.post('/auth/login', data),
  register: (data: { name: string; email: string; password: string; mobile: string }) =>
    api.post('/auth/register', data),
};

export const userApi = {
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
  getVideos: () => api.get('/restaurant/videos'),
};

export const menuApi = {
  getCategories: () => api.get('/categories'),
  getCategoryById: (id: string) => api.get(`/categories/${id}`),
  getMenu: (params?: { type?: string; search?: string }) =>
    api.get('/menu', { params }),
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
};

export const reviewApi = {
  submitReview: (data: any) => api.post('/reviews', data),
  getMyReviews: () => api.get('/reviews/my'),
  getProductReviews: (productId: string) => api.get(`/reviews/product/${productId}`),
};

export const chatApi = {
  getOrCreateChat: () => api.post('/chat'),
  getMessages: (chatId: string) => api.get(`/chat/${chatId}/messages`),
  sendMessage: (chatId: string, data: any) => api.post(`/chat/${chatId}/messages`, data),
};

export const uploadApi = {
  uploadImage: (formData: FormData) =>
    api.post('/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
};

export const vlogApi = {
  getAll: () => api.get('/vlogs'),
  incrementView: (id: string) => api.put(`/vlogs/${id}/view`),
  toggleLike: (id: string) => api.put(`/vlogs/${id}/like`),
};

export default api;
