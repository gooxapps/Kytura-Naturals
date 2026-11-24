import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type {
  SiteSettings,
  Category,
  HomepageSection,
  Testimonial,
  CartItem,
  WholesaleProfile,
} from '../types';

interface AuthUser {
  id: string;
  email: string;
  full_name: string;
  role: string;
}

interface StoreContextValue {
  settings: SiteSettings;
  categories: Category[];
  sections: HomepageSection[];
  testimonials: Testimonial[];
  loadingBootstrap: boolean;
  refreshBootstrap: () => Promise<void>;
  getSection: (key: string) => HomepageSection | undefined;

  cart: CartItem[];
  addToCart: (item: Omit<CartItem, 'quantity'>, quantity?: number) => void;
  updateCartQuantity: (productId: string, variantId: string | undefined, quantity: number) => void;
  removeFromCart: (productId: string, variantId?: string) => void;
  clearCart: () => void;
  cartCount: number;
  cartSubtotalCad: number;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;

  adminToken: string | null;
  adminUser: AuthUser | null;
  setAdminSession: (token: string, user: AuthUser) => void;
  clearAdminSession: () => void;

  wholesaleToken: string | null;
  wholesaleUser: AuthUser | null;
  wholesaleProfile: WholesaleProfile | null;
  setWholesaleSession: (token: string, user: AuthUser, profile: WholesaleProfile) => void;
  clearWholesaleSession: () => void;
}

const DEFAULT_SETTINGS: SiteSettings = {
  id: 1,
  business_name: 'Kytura Naturals',
  owner_name: 'Dr Ann Merah',
  email: 'kyturanaturals@gmail.com',
  whatsapp_number: '+14033719687',
  currency: 'CAD',
  region_label: 'Global / All Regions',
  announcement_left: 'Discover Natural Wellness with Kytura Naturals',
  announcement_center: 'Free Worldwide Shipping on Orders Over $100 CAD',
  free_shipping_threshold_cad: 100,
  seo_title: 'Kytura Naturals | Botanical Wellness, Diffuser Oils & Ultrasonic Diffusers',
  seo_description: 'Explore organic diffuser oil blends, body and massage oils, and ultrasonic diffusers from Kytura Naturals.',
  social_facebook: '',
  social_instagram: '',
  social_youtube: '',
  social_pinterest: '',
};

const StoreContext = createContext<StoreContextValue | null>(null);

export function formatCad(amount: number): string {
  return `$${Number(amount || 0).toFixed(2)} CAD`;
}

export function formatWhatsappHref(rawNumber: string, message: string): string {
  const digits = (rawNumber || '+14033719687').replace(/[^\d]/g, '');
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

export function formatPhoneDisplay(rawNumber: string): string {
  const digits = (rawNumber || '+14033719687').replace(/[^\d]/g, '');
  if (digits.length === 11 && digits.startsWith('1')) {
    return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  return rawNumber;
}

const CART_STORAGE_KEY = 'kytura_naturals_cart_v1';

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SETTINGS);
  const [categories, setCategories] = useState<Category[]>([]);
  const [sections, setSections] = useState<HomepageSection[]>([]);
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [loadingBootstrap, setLoadingBootstrap] = useState(true);

  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const raw = localStorage.getItem(CART_STORAGE_KEY);
      return raw ? (JSON.parse(raw) as CartItem[]) : [];
    } catch {
      return [];
    }
  });
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Auth tokens kept strictly in React memory (never localStorage/sessionStorage)
  const [adminToken, setAdminToken] = useState<string | null>(null);
  const [adminUser, setAdminUser] = useState<AuthUser | null>(null);

  const [wholesaleToken, setWholesaleToken] = useState<string | null>(null);
  const [wholesaleUser, setWholesaleUser] = useState<AuthUser | null>(null);
  const [wholesaleProfile, setWholesaleProfile] = useState<WholesaleProfile | null>(null);

  const refreshBootstrap = useCallback(async () => {
    try {
      const res = await fetch('/api/public/bootstrap');
      if (!res.ok) return;
      const data = await res.json();
      if (data.settings) setSettings(data.settings);
      if (Array.isArray(data.categories)) setCategories(data.categories);
      if (Array.isArray(data.sections)) setSections(data.sections);
      if (Array.isArray(data.testimonials)) setTestimonials(data.testimonials);
    } catch (err) {
      console.error('Failed to load storefront data:', err);
    } finally {
      setLoadingBootstrap(false);
    }
  }, []);

  useEffect(() => {
    refreshBootstrap();
  }, [refreshBootstrap]);

  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    } catch {
      // Ignore storage quota issues
    }
  }, [cart]);

  const getSection = useCallback(
    (key: string) => sections.find((s) => s.section_key === key),
    [sections]
  );

  const addToCart = useCallback((item: Omit<CartItem, 'quantity'>, quantity = 1) => {
    const qtyToAdd = Math.max(1, Math.floor(quantity));
    setCart((prev) => {
      const idx = prev.findIndex(
        (c) => c.productId === item.productId && (c.variantId || '') === (item.variantId || '')
      );
      if (idx >= 0) {
        const next = [...prev];
        const nextQty = Math.min(item.maxStock || 999, next[idx].quantity + qtyToAdd);
        next[idx] = { ...next[idx], quantity: nextQty };
        return next;
      }
      return [...prev, { ...item, quantity: Math.min(item.maxStock || 999, qtyToAdd) }];
    });
    setIsCartOpen(true);
  }, []);

  const updateCartQuantity = useCallback(
    (productId: string, variantId: string | undefined, quantity: number) => {
      if (quantity <= 0) {
        setCart((prev) =>
          prev.filter((c) => !(c.productId === productId && (c.variantId || '') === (variantId || '')))
        );
        return;
      }
      setCart((prev) =>
        prev.map((c) =>
          c.productId === productId && (c.variantId || '') === (variantId || '')
            ? { ...c, quantity: Math.min(c.maxStock || 999, Math.floor(quantity)) }
            : c
        )
      );
    },
    []
  );

  const removeFromCart = useCallback((productId: string, variantId?: string) => {
    setCart((prev) =>
      prev.filter((c) => !(c.productId === productId && (c.variantId || '') === (variantId || '')))
    );
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
  }, []);

  const cartCount = cart.reduce((acc, item) => acc + item.quantity, 0);
  const cartSubtotalCad = Number(
    cart.reduce((acc, item) => acc + item.priceCad * item.quantity, 0).toFixed(2)
  );

  const setAdminSession = useCallback((token: string, user: AuthUser) => {
    setAdminToken(token);
    setAdminUser(user);
  }, []);

  const clearAdminSession = useCallback(() => {
    setAdminToken(null);
    setAdminUser(null);
  }, []);

  const setWholesaleSession = useCallback(
    (token: string, user: AuthUser, profile: WholesaleProfile) => {
      setWholesaleToken(token);
      setWholesaleUser(user);
      setWholesaleProfile(profile);
    },
    []
  );

  const clearWholesaleSession = useCallback(() => {
    setWholesaleToken(null);
    setWholesaleUser(null);
    setWholesaleProfile(null);
  }, []);

  return (
    <StoreContext.Provider
      value={{
        settings,
        categories,
        sections,
        testimonials,
        loadingBootstrap,
        refreshBootstrap,
        getSection,
        cart,
        addToCart,
        updateCartQuantity,
        removeFromCart,
        clearCart,
        cartCount,
        cartSubtotalCad,
        isCartOpen,
        setIsCartOpen,
        adminToken,
        adminUser,
        setAdminSession,
        clearAdminSession,
        wholesaleToken,
        wholesaleUser,
        wholesaleProfile,
        setWholesaleSession,
        clearWholesaleSession,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
};

export function useStore(): StoreContextValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used inside StoreProvider');
  return ctx;
}
