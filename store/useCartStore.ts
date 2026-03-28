/**
 * 🛒 Cart Store — Zustand (Server-synced with optimistic updates)
 * Mirrors web's useCartStore.ts
 * The most complex store — handles optimistic UI + backend sync.
 */
import { create } from 'zustand';
import { cartApi } from '../services/api';

interface CartItem {
  _id: string;         // Product ID
  itemId: string;      // Cart item ID (from MongoDB)
  name: string;
  price: number;
  quantity: number;
  image: string;
  variant?: string;
  type?: 'Veg' | 'Non-Veg';
}

interface AppliedCoupon {
  code: string;
  name?: string;
  discountType: string;
  discountAmount: number;
}

interface CartState {
  items: CartItem[];
  isOpen: boolean;
  isLoading: boolean;
  totalPrice: number;
  discountAmount: number;
  finalPrice: number;
  deliveryFee: number;
  tax: number;
  taxBreakdown: { cgstTotal: number; sgstTotal: number; igstTotal: number };
  appliedCoupon: AppliedCoupon | null;

  // Actions
  toggleCart: () => void;
  fetchCart: () => Promise<void>;
  addItem: (item: {
    _id: string;
    name: string;
    price: number;
    image: string;
    type?: string;
    category?: string;
    variant?: string;
  }) => Promise<void>;
  incrementItem: (itemId: string) => Promise<void>;
  decrementItem: (itemId: string) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  clearCart: () => Promise<void>;
  applyCoupon: (code: string) => Promise<void>;
  removeCoupon: () => Promise<void>;
}

const parseCartResponse = (data: any) => {
  const items: CartItem[] = (data.items || []).map((item: any) => ({
    _id: typeof item.product === 'object' ? item.product._id : item.product,
    itemId: item._id,
    name: item.name || item.product?.name || 'Item',
    price: item.price,
    quantity: item.quantity,
    image: item.imageURL || item.product?.imageURL || '',
    variant: item.variant,
    type: item.product?.type,
  }));

  return {
    items,
    totalPrice: data.totalPrice || data.itemsTotal || 0,
    tax: data.totalTax || 0,
    taxBreakdown: data.taxBreakdown || { cgstTotal: 0, sgstTotal: 0, igstTotal: 0 },
    finalPrice: data.finalTotal || data.totalPrice || 0,
    discountAmount: 0,
    appliedCoupon: null,
  };
};

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  isOpen: false,
  isLoading: false,
  totalPrice: 0,
  discountAmount: 0,
  finalPrice: 0,
  deliveryFee: 0,
  tax: 0,
  taxBreakdown: { cgstTotal: 0, sgstTotal: 0, igstTotal: 0 },
  appliedCoupon: null,

  toggleCart: () => set((s) => ({ isOpen: !s.isOpen })),

  fetchCart: async () => {
    try {
      set({ isLoading: true });
      const { data } = await cartApi.getCart();
      const parsed = parseCartResponse(data);
      set({ ...parsed, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  addItem: async (item) => {
    // Optimistic: add immediately
    const optimisticId = `temp_${Date.now()}`;
    set((s) => ({
      items: [...s.items, {
        ...item,
        itemId: optimisticId,
        quantity: 1,
        type: item.type as 'Veg' | 'Non-Veg' | undefined,
      }],
      totalPrice: s.totalPrice + item.price,
    }));

    try {
      const { data } = await cartApi.addToCart({
        productId: item._id,
        quantity: 1,
        variant: item.variant,
      });
      const parsed = parseCartResponse(data);
      set({ ...parsed });
    } catch {
      // Rollback
      set((s) => ({
        items: s.items.filter((i) => i.itemId !== optimisticId),
        totalPrice: s.totalPrice - item.price,
      }));
    }
  },

  incrementItem: async (itemId) => {
    // Optimistic
    set((s) => ({
      items: s.items.map((i) =>
        i.itemId === itemId ? { ...i, quantity: i.quantity + 1 } : i
      ),
    }));

    try {
      const item = get().items.find((i) => i.itemId === itemId);
      if (!item) return;
      const { data } = await cartApi.updateCartItem(itemId, {
        quantity: item.quantity,
      });
      const parsed = parseCartResponse(data);
      set({ ...parsed });
    } catch {
      // Rollback
      set((s) => ({
        items: s.items.map((i) =>
          i.itemId === itemId ? { ...i, quantity: Math.max(1, i.quantity - 1) } : i
        ),
      }));
    }
  },

  decrementItem: async (itemId) => {
    const item = get().items.find((i) => i.itemId === itemId);
    if (!item) return;

    if (item.quantity <= 1) {
      // Remove item
      return get().removeItem(itemId);
    }

    // Optimistic
    set((s) => ({
      items: s.items.map((i) =>
        i.itemId === itemId ? { ...i, quantity: i.quantity - 1 } : i
      ),
    }));

    try {
      const { data } = await cartApi.updateCartItem(itemId, {
        quantity: item.quantity - 1,
      });
      const parsed = parseCartResponse(data);
      set({ ...parsed });
    } catch {
      // Rollback
      set((s) => ({
        items: s.items.map((i) =>
          i.itemId === itemId ? { ...i, quantity: i.quantity + 1 } : i
        ),
      }));
    }
  },

  removeItem: async (itemId) => {
    const prev = get().items;
    set((s) => ({
      items: s.items.filter((i) => i.itemId !== itemId),
    }));

    try {
      const { data } = await cartApi.removeFromCart(itemId);
      const parsed = parseCartResponse(data);
      set({ ...parsed });
    } catch {
      set({ items: prev });
    }
  },

  clearCart: async () => {
    const prev = get();
    set({
      items: [],
      totalPrice: 0,
      tax: 0,
      finalPrice: 0,
      discountAmount: 0,
      appliedCoupon: null,
    });

    try {
      await cartApi.clearCart();
    } catch {
      set({
        items: prev.items,
        totalPrice: prev.totalPrice,
        tax: prev.tax,
        finalPrice: prev.finalPrice,
      });
    }
  },

  applyCoupon: async (code) => {
    try {
      await cartApi.applyCoupon({ code });
      await get().fetchCart();
    } catch (err: any) {
      throw err;
    }
  },

  removeCoupon: async () => {
    try {
      await cartApi.removeCoupon();
      set({ appliedCoupon: null, discountAmount: 0 });
      await get().fetchCart();
    } catch {}
  },
}));
