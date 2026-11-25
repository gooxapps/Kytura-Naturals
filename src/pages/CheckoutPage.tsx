import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, ExternalLink, MessageCircle, ShoppingBag } from 'lucide-react';
import { formatCad, useStore } from '../context/StoreContext';
import { SEOHead } from '../components/SEOHead';

interface OrderReceipt {
  id: string;
  order_reference: string;
  total_cad: number;
  order_status: string;
  payment_status: string;
  whatsapp_url: string;
  whatsapp_message: string;
}

export const CheckoutPage: React.FC = () => {
  const { cart, cartSubtotalCad, clearCart, settings } = useStore();
  const [form, setForm] = useState({
    customer_name: '',
    customer_email: '',
    customer_phone: '',
    country: 'Canada',
    city: '',
    delivery_address: '',
    order_notes: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [receipt, setReceipt] = useState<OrderReceipt | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (cart.length === 0) {
      setError('Your shopping cart is empty.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/public/orders/retail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          items: cart.map((c) => ({
            productId: c.productId,
            variantId: c.variantId,
            quantity: c.quantity,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Unable to submit order. Please verify your details.');
      } else {
        setReceipt(data.order);
        clearCart();
      }
    } catch {
      setError('Network error while saving your order. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (receipt) {
    return (
      <>
        <SEOHead
          title={`Order ${receipt.order_reference} | ${settings.business_name}`}
          description="Send your prefilled WhatsApp message to complete your Kytura Naturals retail order confirmation."
        />
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
          <div className="bg-white rounded-2xl border border-[#AA87FF]/30 shadow-sm p-6 sm:p-10">
            <div className="flex items-center gap-3 text-[#538710]">
              <CheckCircle2 className="w-8 h-8 shrink-0" />
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider">
                  Order Recorded
                </span>
                <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#0E021E]">
                  Order Reference: <span className="font-mono text-[#5000AF]">{receipt.order_reference}</span>
                </h1>
              </div>
            </div>

            <div className="mt-6 p-4 rounded-xl bg-[#F3F0FF] border border-[#AA87FF]/30 space-y-2 text-sm">
              <div className="flex flex-wrap justify-between gap-2">
                <span className="text-[#0E021E]/75">Order Status:</span>
                <span className="font-semibold text-[#39008B]">{receipt.order_status}</span>
              </div>
              <div className="flex flex-wrap justify-between gap-2">
                <span className="text-[#0E021E]/75">Payment Status:</span>
                <span className="font-semibold text-[#B71C85]">{receipt.payment_status}</span>
              </div>
              <div className="flex flex-wrap justify-between gap-2">
                <span className="text-[#0E021E]/75">Order Total:</span>
                <span className="font-bold text-[#0E021E] tabular-nums">
                  {formatCad(receipt.total_cad)}
                </span>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              <h2 className="font-display text-xl font-bold text-[#0E021E]">
                Next Step: Send Your WhatsApp Confirmation Message
              </h2>
              <p className="text-sm text-[#0E021E]/80 leading-relaxed">
                Your order has been saved with status <strong>Awaiting WhatsApp Confirmation</strong> and payment status <strong>Unpaid</strong>. Please click the button below and send the prefilled WhatsApp message to Kytura Naturals so our team can confirm your order and finalize payment and delivery.
              </p>

              <a
                href={receipt.whatsapp_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2.5 w-full sm:w-auto px-7 py-3.5 rounded-full bg-[#25D366] text-white text-sm font-bold shadow-md hover:bg-[#1ebe5d] transition-colors"
              >
                <MessageCircle className="w-5 h-5" />
                Open WhatsApp &amp; Send Order Message
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>

            <div className="mt-6">
              <span className="block text-xs font-semibold text-[#0E021E]/65 mb-2">
                Prefilled WhatsApp Message Summary
              </span>
              <pre className="p-4 rounded-xl bg-[#0E021E] text-[#F3F0FF] text-xs font-mono whitespace-pre-wrap leading-relaxed overflow-x-auto">
                {receipt.whatsapp_message}
              </pre>
            </div>

            <div className="mt-6 pt-6 border-t border-[#F3F0FF] flex flex-wrap gap-4">
              <Link
                to="/shop"
                className="px-6 py-2.5 rounded-full border border-[#5000AF] text-[#5000AF] text-xs font-semibold hover:bg-[#F3F0FF]"
              >
                Continue Shopping
              </Link>
              <Link
                to="/"
                className="px-6 py-2.5 rounded-full bg-[#5000AF] text-white text-xs font-semibold hover:bg-[#39008B]"
              >
                Return Home
              </Link>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <SEOHead
        title={`WhatsApp Checkout | ${settings.business_name}`}
        description="Complete your delivery information to place a Kytura Naturals retail order via WhatsApp."
      />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
        <h1 className="font-display text-3xl sm:text-4xl font-bold text-[#0E021E] mb-2">
          Retail Checkout
        </h1>
        <p className="text-sm text-[#0E021E]/70 mb-8">
          Submit your delivery details to generate your order reference and open WhatsApp for direct order confirmation.
        </p>

        {cart.length === 0 ? (
          <div className="bg-[#F3F0FF]/55 rounded-2xl border border-[#AA87FF]/25 p-10 text-center">
            <ShoppingBag className="w-10 h-10 text-[#5000AF] mx-auto mb-3" />
            <h2 className="font-display text-2xl font-bold text-[#0E021E]">No items in cart</h2>
            <p className="mt-2 text-sm text-[#0E021E]/70">
              Add products to your cart before proceeding to checkout.
            </p>
            <Link
              to="/shop"
              className="inline-block mt-5 px-6 py-2.5 rounded-full bg-[#5000AF] text-white text-sm font-semibold"
            >
              Shop Products
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <form
              onSubmit={handleSubmit}
              className="lg:col-span-7 bg-white rounded-2xl border border-[#AA87FF]/25 p-6 sm:p-8 space-y-5"
            >
              <h2 className="font-display text-xl font-bold text-[#0E021E]">
                Customer &amp; Delivery Information
              </h2>

              {error && (
                <div className="p-3.5 rounded-xl bg-[#B71C85]/10 border border-[#B71C85]/30 text-xs font-semibold text-[#B71C85]">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#0E021E] mb-1.5">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={form.customer_name}
                    onChange={(e) => setForm({ ...form, customer_name: e.target.value })}
                    placeholder="Your full name"
                    className="w-full px-4 py-2.5 rounded-xl border border-[#AA87FF]/45 text-sm focus:outline-none focus:border-[#5000AF]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#0E021E] mb-1.5">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    value={form.customer_email}
                    onChange={(e) => setForm({ ...form, customer_email: e.target.value })}
                    placeholder="you@example.com"
                    className="w-full px-4 py-2.5 rounded-xl border border-[#AA87FF]/45 text-sm focus:outline-none focus:border-[#5000AF]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#0E021E] mb-1.5">
                    WhatsApp / Phone Number *
                  </label>
                  <input
                    type="tel"
                    required
                    value={form.customer_phone}
                    onChange={(e) => setForm({ ...form, customer_phone: e.target.value })}
                    placeholder="+1 403 555 0199"
                    className="w-full px-4 py-2.5 rounded-xl border border-[#AA87FF]/45 text-sm focus:outline-none focus:border-[#5000AF]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#0E021E] mb-1.5">
                    Country *
                  </label>
                  <input
                    type="text"
                    required
                    value={form.country}
                    onChange={(e) => setForm({ ...form, country: e.target.value })}
                    placeholder="Canada"
                    className="w-full px-4 py-2.5 rounded-xl border border-[#AA87FF]/45 text-sm focus:outline-none focus:border-[#5000AF]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#0E021E] mb-1.5">
                    City *
                  </label>
                  <input
                    type="text"
                    required
                    value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                    placeholder="Calgary"
                    className="w-full px-4 py-2.5 rounded-xl border border-[#AA87FF]/45 text-sm focus:outline-none focus:border-[#5000AF]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#0E021E] mb-1.5">
                    Delivery Address *
                  </label>
                  <input
                    type="text"
                    required
                    value={form.delivery_address}
                    onChange={(e) => setForm({ ...form, delivery_address: e.target.value })}
                    placeholder="Street address, apartment/suite"
                    className="w-full px-4 py-2.5 rounded-xl border border-[#AA87FF]/45 text-sm focus:outline-none focus:border-[#5000AF]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0E021E] mb-1.5">
                  Additional Order Notes (Optional)
                </label>
                <textarea
                  rows={3}
                  value={form.order_notes}
                  onChange={(e) => setForm({ ...form, order_notes: e.target.value })}
                  placeholder="Preferred delivery instructions or gift message..."
                  className="w-full px-4 py-2.5 rounded-xl border border-[#AA87FF]/45 text-sm focus:outline-none focus:border-[#5000AF]"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full inline-flex items-center justify-center gap-2 py-3.5 px-6 rounded-full bg-[#5000AF] text-white text-sm font-semibold hover:bg-[#39008B] disabled:opacity-60 transition-colors"
              >
                <MessageCircle className="w-4 h-4" />
                {submitting ? 'Submitting Order...' : 'Place Order & Open WhatsApp'}
              </button>
            </form>

            {/* Right: Summary */}
            <aside className="lg:col-span-5 bg-[#F3F0FF]/65 rounded-2xl border border-[#AA87FF]/30 p-6 space-y-4">
              <h2 className="font-display text-xl font-bold text-[#0E021E]">Order Summary</h2>
              <div className="divide-y divide-[#AA87FF]/20">
                {cart.map((item) => (
                  <div
                    key={`${item.productId}-${item.variantId || 'base'}`}
                    className="py-3 flex items-center justify-between gap-3 text-sm"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-[#0E021E] truncate">{item.name}</p>
                      <p className="text-xs text-[#0E021E]/65">
                        {item.variantName ? `${item.variantName} · ` : ''}Qty {item.quantity}
                      </p>
                    </div>
                    <span className="font-bold text-[#39008B] tabular-nums shrink-0">
                      {formatCad(item.priceCad * item.quantity)}
                    </span>
                  </div>
                ))}
              </div>
              <div className="pt-4 border-t border-[#AA87FF]/30 flex items-center justify-between">
                <span className="font-semibold text-[#0E021E]">Total (CAD)</span>
                <span className="text-xl font-bold text-[#39008B] tabular-nums">
                  {formatCad(cartSubtotalCad)}
                </span>
              </div>
              <p className="text-xs text-[#0E021E]/65 leading-relaxed">
                Orders start with status <strong>Awaiting WhatsApp Confirmation</strong> and payment status <strong>Unpaid</strong> until confirmed directly with our team.
              </p>
            </aside>
          </div>
        )}
      </div>
    </>
  );
};
