import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Minus, Plus, ShoppingBag, Trash2 } from 'lucide-react';
import { formatCad, useStore } from '../context/StoreContext';
import { ResilientImage } from '../components/ProductCard';
import { SEOHead } from '../components/SEOHead';

export const CartPage: React.FC = () => {
  const { cart, updateCartQuantity, removeFromCart, cartSubtotalCad, settings } = useStore();

  return (
    <>
      <SEOHead
        title={`Shopping Cart | ${settings.business_name}`}
        description="Review your selected Kytura Naturals botanical products before proceeding to WhatsApp retail checkout."
      />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
        <h1 className="font-display text-3xl sm:text-4xl font-bold text-[#0E021E] mb-8">
          Shopping Cart
        </h1>

        {cart.length === 0 ? (
          <div className="bg-[#F3F0FF]/55 rounded-2xl border border-[#AA87FF]/25 p-12 text-center">
            <ShoppingBag className="w-10 h-10 text-[#5000AF] mx-auto mb-3" />
            <h2 className="font-display text-2xl font-bold text-[#0E021E]">Your cart is empty</h2>
            <p className="mt-2 text-sm text-[#0E021E]/70">
              Explore our organic diffuser oil blends, body &amp; massage oils, and ultrasonic diffusers.
            </p>
            <Link
              to="/shop"
              className="inline-flex items-center gap-2 mt-6 px-6 py-3 rounded-full bg-[#5000AF] text-white text-sm font-semibold hover:bg-[#39008B]"
            >
              Browse Shop
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-8 bg-white rounded-2xl border border-[#AA87FF]/25 divide-y divide-[#F3F0FF]">
              {cart.map((item) => (
                <div
                  key={`${item.productId}-${item.variantId || 'base'}`}
                  className="p-5 flex flex-col sm:flex-row sm:items-center gap-4"
                >
                  <Link
                    to={`/product/${item.slug}`}
                    className="w-24 h-24 rounded-xl overflow-hidden bg-[#F3F0FF] shrink-0"
                  >
                    <ResilientImage
                      src={item.imageUrl}
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                  </Link>
                  <div className="flex-1 min-w-0">
                    <Link
                      to={`/product/${item.slug}`}
                      className="font-display text-lg font-bold text-[#0E021E] hover:text-[#5000AF]"
                    >
                      {item.name}
                    </Link>
                    {item.variantName && (
                      <p className="text-xs text-[#0E021E]/65 mt-0.5">{item.variantName}</p>
                    )}
                    <p className="text-xs font-semibold text-[#5000AF] mt-1 tabular-nums">
                      {formatCad(item.priceCad)} each
                    </p>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-4">
                    <div className="inline-flex items-center border border-[#AA87FF]/45 rounded-full">
                      <button
                        type="button"
                        onClick={() =>
                          updateCartQuantity(item.productId, item.variantId, item.quantity - 1)
                        }
                        className="w-8 h-8 flex items-center justify-center text-[#39008B] hover:bg-[#F3F0FF] rounded-l-full"
                        aria-label="Decrease quantity"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="px-3 text-xs font-bold tabular-nums">{item.quantity}</span>
                      <button
                        type="button"
                        onClick={() =>
                          updateCartQuantity(item.productId, item.variantId, item.quantity + 1)
                        }
                        className="w-8 h-8 flex items-center justify-center text-[#39008B] hover:bg-[#F3F0FF] rounded-r-full"
                        aria-label="Increase quantity"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <span className="text-base font-bold text-[#39008B] tabular-nums min-w-[100px] text-right">
                      {formatCad(item.priceCad * item.quantity)}
                    </span>

                    <button
                      type="button"
                      onClick={() => removeFromCart(item.productId, item.variantId)}
                      className="p-2 text-[#0E021E]/45 hover:text-[#B71C85]"
                      aria-label={`Remove ${item.name}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="lg:col-span-4 bg-[#F3F0FF]/65 rounded-2xl border border-[#AA87FF]/30 p-6 space-y-4">
              <h2 className="font-display text-xl font-bold text-[#0E021E]">Order Summary</h2>
              <div className="flex items-center justify-between text-sm">
                <span className="text-[#0E021E]/75">Subtotal</span>
                <span className="font-bold text-[#39008B] tabular-nums">
                  {formatCad(cartSubtotalCad)}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs text-[#0E021E]/65">
                <span>Currency</span>
                <span className="font-semibold">CAD (Canadian Dollars)</span>
              </div>
              <p className="text-xs text-[#0E021E]/70 leading-relaxed pt-2 border-t border-[#AA87FF]/25">
                Shipping details and payment arrangement are confirmed directly with Kytura Naturals via WhatsApp after submitting checkout.
              </p>
              <Link
                to="/checkout"
                className="w-full inline-flex items-center justify-center gap-2 py-3 px-6 rounded-full bg-[#5000AF] text-white text-sm font-semibold hover:bg-[#39008B] transition-colors"
              >
                Proceed to Checkout
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/shop"
                className="block text-center text-xs font-semibold text-[#5000AF] hover:underline"
              >
                Continue Shopping
              </Link>
            </div>
          </div>
        )}
      </div>
    </>
  );
};
