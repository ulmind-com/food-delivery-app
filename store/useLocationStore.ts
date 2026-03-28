/**
 * 📍 Location Store — Zustand
 * Mirrors web's useLocationStore.ts
 * Persisted with AsyncStorage.
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface SavedAddress {
  _id: string;
  id?: string;
  type: 'HOME' | 'WORK' | 'OTHER';
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  mobile?: string;
  displayName?: string;
  coordinates?: { lat: number; lng: number };
}

interface LocationState {
  selectedAddress: SavedAddress | null;
  setSelectedAddress: (addr: SavedAddress | null) => void;
  clearSelectedAddress: () => void;
}

export const useLocationStore = create<LocationState>()(
  persist(
    (set) => ({
      selectedAddress: null,
      setSelectedAddress: (addr) => set({ selectedAddress: addr }),
      clearSelectedAddress: () => set({ selectedAddress: null }),
    }),
    {
      name: 'foodie-location',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
