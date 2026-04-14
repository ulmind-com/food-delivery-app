/**
 * 🔐 Auth Store — Zustand
 * Mirrors web's useAuthStore.ts
 * Uses expo-secure-store for native + localStorage fallback for web.
 */
import { create } from 'zustand';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

// Storage abstraction: SecureStore on native, localStorage on web
const storage = {
  getItem: async (key: string): Promise<string | null> => {
    if (Platform.OS === 'web') {
      try { return localStorage.getItem(key); } catch { return null; }
    }
    try { return await SecureStore.getItemAsync(key); } catch { return null; }
  },
  setItem: async (key: string, value: string) => {
    if (Platform.OS === 'web') {
      try { localStorage.setItem(key, value); } catch {}
      return;
    }
    try { await SecureStore.setItemAsync(key, value); } catch {}
  },
  removeItem: async (key: string) => {
    if (Platform.OS === 'web') {
      try { localStorage.removeItem(key); } catch {}
      return;
    }
    try { await SecureStore.deleteItemAsync(key); } catch {}
  },
};

interface User {
  _id: string;
  name: string;
  email: string;
  mobile?: string;
  role: string;
  profileImage?: string;
  customId?: string;
  savedAddresses?: any[];
  selectedAddress?: any;
  isActive?: boolean;
  isCodDisabled?: boolean;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;

  // Actions
  setUser: (user: User) => void;
  setToken: (token: string) => void;
  login: (user: User, token: string) => Promise<void>;
  logout: () => void;
  loadFromStorage: () => Promise<void>;

  // Computed helpers
  isAuthenticated: () => boolean;
  isAdmin: () => boolean;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isLoading: true,

  setUser: (user) => {
    set({ user });
    storage.setItem('auth_user', JSON.stringify(user));
  },

  setToken: (token) => {
    set({ token });
    storage.setItem('auth_token', token);
  },

  login: async (user, token) => {
    set({ user, token, isLoading: false });
    await Promise.all([
      storage.setItem('auth_token', token),
      storage.setItem('auth_user', JSON.stringify(user)),
    ]);
  },

  logout: () => {
    set({ user: null, token: null });
    storage.removeItem('auth_token');
    storage.removeItem('auth_user');
  },

  loadFromStorage: async () => {
    try {
      const [token, userJson] = await Promise.all([
        storage.getItem('auth_token'),
        storage.getItem('auth_user'),
      ]);
      if (token && userJson) {
        const user = JSON.parse(userJson);
        set({ token, user, isLoading: false });
      } else {
        set({ isLoading: false });
      }
    } catch {
      set({ isLoading: false });
    }
  },

  isAuthenticated: () => !!get().token && !!get().user,
  isAdmin: () => {
    const role = get().user?.role;
    return role === 'Admin' || role === 'admin';
  },
}));
