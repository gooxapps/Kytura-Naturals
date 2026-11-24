import React from 'react';
import { Link } from 'react-router-dom';
import { Minus, Plus, ShoppingBag, Trash2, X } from 'lucide-react';
import { formatCad, useStore } from '../context/StoreContext';
import { ResilientImage } from './ProductCard';

export const CartDrawer: React.FC = () => {
  const {
    cart,
    isCartOpen,
    setIsCartOpen,
    updateCartQuantity,
    removeFromCart,
    cartSubtotalCad,
    settings,
  } = useStore();

  if (!isCartOpen) return null;

  const threshold = Number(settings.free_shipping_threshold_cad || 100);
  const remaining = Math.max(0, threshold - cartSubtotalCad);

  return (
    <div
      className="fixed inset-0 z-50 bg-[#0E021E]/55 backdrop-blur-xs flex justify-end"
      onClick={() => setIsCartOpen(false)}
    >
      <aside
        className="w-full max-w-md bg-white h-full flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        aria-label="Shopping cart"
      >
        <div className="px-6 py-4 border-b border-[#F3F0FF] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <ShoppingBag className="w-5 h-5 text-[#5000AF]" />
            <h2 className="font-display text-xl font-bold text-[#0E021E]">Your Cart</h2>
          </div>
          <button
            type="button"
            onClick={() => setIsCartOpen(false)}
            className="p-2 rounded-full hover:bg-[#F3F0FF] text-[#0E021E]/70"
            aria-label="Close cart"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {threshold > 0 && cart.length > 0 && (
          <div className="px-6 py-3 bg-[#F3F0FF] text-xs text-[#39008B] font-medium">
            {remaining > 0
              ? `Add ${formatCad(remaining)} more for free shipping over ${formatCad(threshold)}.`
              : `Your order qualifies for free shipping over ${formatCad(threshold)}.`}
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center py-12">
              <div className="w-16 h-16 rounded-full bg-[#F3F0FF] flex items-center justify-center text-[#5000AF] mb-4">
                <ShoppingBag className="w-7 h-7" />
              </div>
              <h3 className="font-display text-lg font-semibold text-[#0E021E]">Your cart is empty</h3>
              <p className="mt-1 text-sm text-[#0E021E]/65 max-w-xs">
                Explore our botanical diffuser oil blends, body &amp; massage oils, and ultrasonic diffusers.
              </p>
              <Link
                to="/shop"
                onClick={() => setIsCartOpen(false)}
                className="mt-5 px-6 py-2.5 rounded-full bg-[#5000AF] text-white text-sm font-semibold hover:bg-[#39008B] transition-colors"
              >
                Shop Products
              </Link>
            </div>
          ) : (
            cart.map((item) => (
              <div
                key={`${item.productId}-${item.variantId || 'base'}`}
                className="flex gap-3.5 pb-4 border-b border-[#F3F0FF]"
              >
                <div className="w-20 h-20 rounded-xl overflow-hidden bg-[#F3F0FF] shrink-0">
                  <ResilientImage
                    src={item.imageUrl}
                    alt={item.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <Link
                      to={`/product/${item.slug}`}
                      onClick={() => setIsCartOpen(false)}
                      className="font-semibold text-sm text-[#0E021E] hover:text-[#5000AF] line-clamp-1"
                    >
                      {item.name}
                    </Link>
                    <button
                      type="button"
                      onClick={() => removeFromCart(item.productId, item.variantId)}
                      className="text-[#0E021E]/40 hover:text-[#B71C85] p-1"
                      aria-label={`Remove ${item.name}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  {item.variantName && (
                    <p className="text-xs text-[#0E021E]/60 mt-0.5">{item.variantName}</p>
                  )}
                  <div className="mt-2.5 flex items-center justify-between">
                    <div className="inline-flex items-center border border-[#AA87FF]/40 rounded-full">
                      <button
                        type="button"
                        onClick={() =>
                          updateCartQuantity(item.productId, item.variantId, item.quantity - 1)
                        }
                        className="w-7 h-7 flex items-center justify-center text-[#39008B] hover:bg-[#F3F0FF] rounded-l-full"
                        aria-label="Decrease quantity"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="px-2.5 text-xs font-semibold tabular-nums">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          updateCartQuantity(item.productId, item.variantId, item.quantity + 1)
                        }
                        className="w-7 h-7 flex items-center justify-center text-[#39008B] hover:bg-[#F3F0FF] rounded-r-full"
                        aria-label="Increase quantity"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <span className="text-sm font-bold text-[#39008B] tabular-nums">
                      {formatCad(item.priceCad * item.quantity)}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {cart.length > 0 && (
          <div className="p-6 border-t border-[#F3F0FF] bg-[#F3F0FF]/50 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-[#0E021E]/75">Subtotal</span>
              <span className="text-lg font-bold text-[#39008B] tabular-nums">
                {formatCad(cartSubtotalCad)}
              </span>
            </div>
            <p className="text-xs text-[#0E021E]/60">
              Retail orders are confirmed directly via WhatsApp. No online card payment is charged at checkout.
            </p>
            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <Link
                to="/cart"
                onClick={() => setIsCartOpen(false)}
                className="py-2.5 px-4 rounded-full border border-[#5000AF] text-[#5000AF] text-xs font-semibold text-center hover:bg-white transition-colors"
              >
                View Cart
              </Link>
              <Link
                to="/checkout"
                onClick={() => setIsCartOpen(false)}
                className="py-2.5 px-4 rounded-full bg-[#5000AF] text-white text-xs font-semibold text-center hover:bg-[#39008B] transition-colors"
              >
                WhatsApp Checkout
              </Link>
            </div>
          </div>
        )}
      </aside>
    </div>
  );
};
