/**
 * 🛒 Cart Store — Zustand (Server-synced with optimistic updates)
 * Mirrors web's useCartStore.ts — COMPLETE PARITY
 * Handles optimistic UI + backend sync + delivery fee + coupons.
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
  fetchCart: (coords?: { lat: number; lng: number }) => Promise<void>;
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

  const localItemsTotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

  // Fallback cleanup: If cart is empty, it shouldn't have any attached costs or coupons
  if (localItemsTotal === 0 || items.length === 0) {
    return {
      items: [], totalPrice: 0, tax: 0, taxBreakdown: { cgstTotal: 0, sgstTotal: 0, igstTotal: 0 },
      deliveryFee: 0, finalPrice: 0, discountAmount: 0, appliedCoupon: null
    };
  }

  // Parse coupon if applied
  let appliedCoupon: AppliedCoupon | null = null;
  let discountAmount = 0;
  
  // Safely grab the coupon object (ignoring stray Unpopulated String IDs from the backend)
  const rawCouponObj = data.appliedCoupon || data.coupon;
  if (rawCouponObj && typeof rawCouponObj === 'object' && Object.keys(rawCouponObj).length > 0) {
    const c = rawCouponObj;
    appliedCoupon = {
      code: c.code || c.couponCode || '',
      name: c.name || c.title || '',
      discountType: c.discountType || 'FLAT',
      discountAmount: c.discountAmount || 0,
    };
    
    // Safely calculate discount directly incase backend cart object didn't compute it
    const apiComputedDiscount = data.discountAmount || data.discount || 0;
    if (apiComputedDiscount > 0) {
      discountAmount = apiComputedDiscount;
    } else {
      if (c.discountType === 'PERCENTAGE') {
        const pct = c.discountPercent || c.discountAmount || 0;
        discountAmount = (localItemsTotal * pct) / 100;
        if (c.maxDiscountAmount && discountAmount > c.maxDiscountAmount) {
          discountAmount = c.maxDiscountAmount;
        }
      } else {
        discountAmount = c.discountAmount || 0;
      }
    }
    appliedCoupon.discountAmount = discountAmount; // Set absolute value for UI display
  } else {
    discountAmount = data.discountAmount || data.discount || 0;
  }

  const tax = data.totalTax || data.taxAmount || 0;
  const deliveryFee = data.deliveryFee || data.deliveryCharge || data.shipping || 0;
  
  // Prefer API's finalTotal, but fallback safely
  const finalPrice = data.finalTotal || data.finalAmount || data.totalPrice || Math.max(0, localItemsTotal + tax + deliveryFee - discountAmount);
  
  // Ensure totalPrice uses our robust local items total
  const totalPrice = localItemsTotal;

  return {
    items,
    totalPrice,
    tax,
    taxBreakdown: data.taxBreakdown || { cgstTotal: 0, sgstTotal: 0, igstTotal: 0 },
    deliveryFee,
    finalPrice,
    discountAmount,
    appliedCoupon,
  };
};

export const useCartStore = create<CartState & { syncCount: number }>((set, get) => ({
  items: [],
  isOpen: false,
  isLoading: false,
  syncCount: 0,
  totalPrice: 0,
  discountAmount: 0,
  finalPrice: 0,
  deliveryFee: 0,
  tax: 0,
  taxBreakdown: { cgstTotal: 0, sgstTotal: 0, igstTotal: 0 },
  appliedCoupon: null,

  toggleCart: () => set((s) => ({ isOpen: !s.isOpen })),

  fetchCart: async (coords) => {
    try {
      set({ isLoading: true });
      
      const cartRes = await cartApi.getCart();
      const cartData = cartRes.data;

      // Always fetch bill to get proper discount calculations and fully populated coupon object
      let billData = {};
      try {
        const billRes = await cartApi.getBill(coords?.lat, coords?.lng);
        billData = billRes.data || {};
      } catch (e) {
        console.warn('Failed to fetch bill:', e);
      }

      // Merge data so parseCartResponse has both items and full coupon/tax details
      const mergedData = {
        ...cartData,
        ...billData,
        // Ensure the populated coupon object from bill overrides the simple string code from cart
        appliedCoupon: (billData.appliedCoupon && typeof billData.appliedCoupon === 'object')
          ? billData.appliedCoupon
          : (cartData.appliedCoupon || null)
      };

      const parsed = parseCartResponse(mergedData);
      
      // If a mutation is actively in flight, discard this fetch to prevent flashing stale data
      // BUT we absolutely must recover the real database item IDs for any optimistic items!
      if (get().syncCount > 0) {
        set((s) => ({
          isLoading: false,
          items: s.items.map(oldItem => {
             if (oldItem.itemId && oldItem.itemId.startsWith('temp_')) {
                const realItem = parsed.items.find(pi => pi._id === oldItem._id);
                if (realItem && realItem.itemId) {
                   return { ...oldItem, itemId: realItem.itemId };
                }
             }
             return oldItem;
          })
        }));
        return;
      }

      set({ ...parsed, isLoading: false });
    } catch (e) {
      console.error('fetchCart Error:', e);
      set({ isLoading: false });
    }
  },

  addItem: async (item) => {
    // Optimistic: add immediately
    const optimisticId = `temp_${Date.now()}`;
    const newPrice = item.price;
    set((s) => ({
      syncCount: s.syncCount + 1,
      items: [...s.items, {
        ...item,
        itemId: optimisticId,
        quantity: 1,
        type: item.type as 'Veg' | 'Non-Veg' | undefined,
      }],
      totalPrice: s.totalPrice + newPrice,
      finalPrice: s.finalPrice + newPrice,
    }));

    try {
      await cartApi.addToCart({
        productId: item._id,
        quantity: 1,
        variant: item.variant,
      });
      // Allow fetchCart to execute and update state fully
      set((s) => ({ syncCount: s.syncCount - 1 }));
      await get().fetchCart();
    } catch {
      // Rollback
      set((s) => ({
        syncCount: s.syncCount - 1,
        items: s.items.filter((i) => i.itemId !== optimisticId),
        totalPrice: s.totalPrice - newPrice,
        finalPrice: s.finalPrice - newPrice,
      }));
    }
  },

  incrementItem: async (itemId) => {
    let item = get().items.find((i) => i.itemId === itemId);
    if (!item) return;

    const targetQuantity = item.quantity + 1;
    const priceDelta = item.price;

    // 1. Optimistic Instant Update
    set((s) => ({
      syncCount: s.syncCount + 1,
      items: s.items.map((i) =>
        i.itemId === itemId ? { ...i, quantity: targetQuantity } : i
      ),
      totalPrice: s.totalPrice + priceDelta,
      finalPrice: s.finalPrice + priceDelta,
    }));

    // 2. Race-condition prevention: wait for real ID if necessary BEFORE API call
    let apiItemId = itemId;
    if (apiItemId.startsWith('temp_')) {
      await new Promise(res => setTimeout(res, 600));
      const realItem = get().items.find((i) => i._id === item._id);
      if (!realItem || realItem.itemId.startsWith('temp_')) {
         // Fail safely
         set((s) => ({
           syncCount: s.syncCount - 1,
           items: s.items.map((i) =>
             i.itemId === itemId ? { ...i, quantity: item.quantity } : i
           ),
           totalPrice: s.totalPrice - priceDelta,
           finalPrice: s.finalPrice - priceDelta,
         }));
         return; 
      }
      apiItemId = realItem.itemId;
    }

    try {
      await cartApi.updateCartItem(apiItemId, {
        quantity: targetQuantity,
      });
      set((s) => ({ syncCount: s.syncCount - 1 }));
      await get().fetchCart();
    } catch {
      // Rollback
      set((s) => ({
        syncCount: s.syncCount - 1,
        items: s.items.map((i) =>
          i.itemId === itemId ? { ...i, quantity: item.quantity } : i
        ),
        totalPrice: s.totalPrice - priceDelta,
        finalPrice: s.finalPrice - priceDelta,
      }));
    }
  },

  decrementItem: async (itemId) => {
    let item = get().items.find((i) => i.itemId === itemId);
    if (!item) return;

    if (item.quantity <= 1) {
      // Remove item
      return get().removeItem(itemId);
    }

    const targetQuantity = item.quantity - 1;
    const priceDelta = item.price;

    // 1. Optimistic Instant Update
    set((s) => ({
      items: s.items.map((i) =>
        i.itemId === itemId ? { ...i, quantity: targetQuantity } : i
      ),
      totalPrice: s.totalPrice - priceDelta,
      finalPrice: s.finalPrice - priceDelta,
    }));

    // 2. Race condition handler
    let apiItemId = itemId;
    if (apiItemId.startsWith('temp_')) {
      await new Promise(res => setTimeout(res, 600));
      const realItem = get().items.find((i) => i._id === item._id);
      if (!realItem || realItem.itemId.startsWith('temp_')) {
         set((s) => ({
           items: s.items.map((i) =>
             i.itemId === itemId ? { ...i, quantity: item.quantity } : i
           ),
           totalPrice: s.totalPrice + priceDelta,
           finalPrice: s.finalPrice + priceDelta,
         }));
         return; 
      }
      apiItemId = realItem.itemId;
    }

    try {
      const { data } = await cartApi.updateCartItem(apiItemId, {
        quantity: targetQuantity,
      });
      const parsed = parseCartResponse(data);
      set({ ...parsed });
    } catch {
      // Rollback
      set((s) => ({
        items: s.items.map((i) =>
          i.itemId === itemId ? { ...i, quantity: item.quantity } : i
        ),
        totalPrice: s.totalPrice + priceDelta,
        finalPrice: s.finalPrice + priceDelta,
      }));
    }
  },

  removeItem: async (itemId) => {
    const prev = get().items;
    let itemToRemove = prev.find((i) => i.itemId === itemId);
    if (!itemToRemove) return;
    
    const deduction = itemToRemove.price * itemToRemove.quantity;
    
    // 1. Optimistic Fast Clear
    set((s) => ({
      items: s.items.filter((i) => i.itemId !== itemId),
      totalPrice: s.totalPrice - deduction,
      finalPrice: s.finalPrice - deduction,
    }));

    // 2. Race condition handler
    let apiItemId = itemId;
    if (apiItemId.startsWith('temp_')) {
      await new Promise(res => setTimeout(res, 600));
      itemToRemove = get().items.find((i) => i._id === itemToRemove?._id);
      if (!itemToRemove || itemToRemove.itemId.startsWith('temp_')) {
        set((s) => ({
          items: prev,
          totalPrice: s.totalPrice + deduction,
          finalPrice: s.finalPrice + deduction,
        }));
        return;
      }
      apiItemId = itemToRemove.itemId;
    }

    try {
      const { data } = await cartApi.removeFromCart(apiItemId);
      const parsed = parseCartResponse(data);
      set({ ...parsed });
    } catch {
      set((s) => ({
        items: prev,
        totalPrice: s.totalPrice + deduction,
        finalPrice: s.finalPrice + deduction,
      }));
    }
  },

  clearCart: async () => {
    const prev = get();
    set({
      items: [],
      totalPrice: 0,
      tax: 0,
      finalPrice: 0,
      deliveryFee: 0,
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
        deliveryFee: prev.deliveryFee,
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
