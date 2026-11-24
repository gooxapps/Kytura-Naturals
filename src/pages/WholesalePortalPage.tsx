import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Building2, CheckCircle2, ClipboardList, Lock, LogOut, Package, Plus, Trash2 } from 'lucide-react';
import { formatCad, useStore } from '../context/StoreContext';
import { ResilientImage } from '../components/ProductCard';
import { SEOHead } from '../components/SEOHead';
import type { WholesaleInquiry, WholesaleProduct } from '../types';

export const WholesalePortalPage: React.FC = () => {
  const {
    wholesaleToken,
    wholesaleProfile,
    setWholesaleSession,
    clearWholesaleSession,
    settings,
  } = useStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);

  const [catalogue, setCatalogue] = useState<WholesaleProduct[]>([]);
  const [inquiries, setInquiries] = useState<WholesaleInquiry[]>([]);
  const [loadingPortal, setLoadingPortal] = useState(false);
  const [activeTab, setActiveTab] = useState<'catalogue' | 'inquiries'>('catalogue');

  // Bulk enquiry cart: productId -> quantity
  const [bulkCart, setBulkCart] = useState<Record<string, number>>({});
  const [notes, setNotes] = useState('');
  const [submittingInquiry, setSubmittingInquiry] = useState(false);
  const [inquiryFeedback, setInquiryFeedback] = useState('');

  const fetchPortalData = useCallback(async (token: string) => {
    setLoadingPortal(true);
    try {
      const [prodRes, inqRes] = await Promise.all([
        fetch('/api/wholesale/products', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/wholesale/inquiries', { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      if (prodRes.ok) {
        const d = await prodRes.json();
        setCatalogue(d.catalogue || []);
      }
      if (inqRes.ok) {
        const d = await inqRes.json();
        setInquiries(d.inquiries || []);
      }
    } finally {
      setLoadingPortal(false);
    }
  }, []);

  useEffect(() => {
    if (wholesaleToken) {
      fetchPortalData(wholesaleToken);
    }
  }, [wholesaleToken, fetchPortalData]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setLoggingIn(true);
    try {
      const res = await fetch('/api/auth/wholesale/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setLoginError(data.error || 'Unable to sign in.');
      } else {
        setWholesaleSession(data.token, data.user, data.profile);
      }
    } catch {
      setLoginError('Network error while signing in.');
    } finally {
      setLoggingIn(false);
    }
  };

  const getEffectiveUnitPrice = (prod: WholesaleProduct, qty: number): number => {
    const t = prod.wholesale_tier;
    if (t.tier_3_min_qty && t.tier_3_price_cad !== null && qty >= t.tier_3_min_qty) {
      return t.tier_3_price_cad;
    }
    if (t.tier_2_min_qty && t.tier_2_price_cad !== null && qty >= t.tier_2_min_qty) {
      return t.tier_2_price_cad;
    }
    return t.base_wholesale_price_cad;
  };

  const cartEntries = Object.entries(bulkCart)
    .map(([productId, qty]) => {
      const product = catalogue.find((p) => p.id === productId);
      return product ? { product, qty } : null;
    })
    .filter((x): x is { product: WholesaleProduct; qty: number } => Boolean(x && x.qty > 0));

  const estimatedEnquiryTotal = cartEntries.reduce(
    (sum, { product, qty }) => sum + getEffectiveUnitPrice(product, qty) * qty,
    0
  );

  const handleSubmitInquiry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wholesaleToken || cartEntries.length === 0) return;
    setSubmittingInquiry(true);
    setInquiryFeedback('');
    try {
      const res = await fetch('/api/wholesale/inquiries', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${wholesaleToken}`,
        },
        body: JSON.stringify({
          items: cartEntries.map(({ product, qty }) => ({
            productId: product.id,
            quantity: qty,
          })),
          notes,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setInquiryFeedback(data.error || 'Could not submit wholesale enquiry.');
      } else {
        setBulkCart({});
        setNotes('');
        setInquiryFeedback(`Wholesale enquiry ${data.inquiry.inquiry_reference} submitted.`);
        await fetchPortalData(wholesaleToken);
        setActiveTab('inquiries');
      }
    } finally {
      setSubmittingInquiry(false);
    }
  };

  if (!wholesaleToken || !wholesaleProfile) {
    return (
      <>
        <SEOHead
          title={`Wholesale Buyer Portal | ${settings.business_name}`}
          description="Restricted wholesale partner portal for approved Kytura Naturals business accounts."
        />
        <div className="min-h-[70vh] bg-[#F3F0FF]/55 py-14 px-4 flex items-center justify-center">
          <div className="max-w-md w-full bg-white rounded-2xl border border-[#AA87FF]/30 shadow-lg p-7 sm:p-8">
            <div className="w-12 h-12 rounded-2xl bg-[#F3F0FF] text-[#5000AF] flex items-center justify-center mb-4">
              <Lock className="w-6 h-6" />
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#0E021E]">
              Wholesale Buyer Portal
            </h1>
            <p className="mt-2 text-xs text-[#0E021E]/70 leading-relaxed">
              Sign in with your approved business account credentials to access wholesale CAD pricing, minimum order quantities, and submit bulk enquiries.
            </p>

            {loginError && (
              <div className="mt-4 p-3.5 rounded-xl bg-[#B71C85]/10 border border-[#B71C85]/30 text-xs font-semibold text-[#B71C85]">
                {loginError}
              </div>
            )}

            <form onSubmit={handleLogin} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#0E021E] mb-1.5">
                  Business Email
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-[#AA87FF]/45 text-sm focus:outline-none focus:border-[#5000AF]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#0E021E] mb-1.5">
                  Password
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-[#AA87FF]/45 text-sm focus:outline-none focus:border-[#5000AF]"
                />
              </div>
              <button
                type="submit"
                disabled={loggingIn}
                className="w-full py-3 rounded-full bg-[#5000AF] text-white text-sm font-semibold hover:bg-[#39008B] disabled:opacity-60 transition-colors"
              >
                {loggingIn ? 'Signing In...' : 'Sign In to Wholesale Portal'}
              </button>
            </form>

            <div className="mt-6 pt-5 border-t border-[#F3F0FF] text-center text-xs text-[#0E021E]/70">
              Need a wholesale account?{' '}
              <Link to="/wholesale" className="font-semibold text-[#5000AF] hover:underline">
                Submit an Application
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
        title={`Wholesale Portal | ${wholesaleProfile.business_name}`}
        description="Approved Kytura Naturals wholesale buyer portal."
      />

      <div className="bg-[#39008B] text-white py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center text-[#8ACE69]">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-display text-xl sm:text-2xl font-bold">
                {wholesaleProfile.business_name}
              </h1>
              <p className="text-xs text-white/80">
                Approved Wholesale Partner · {wholesaleProfile.business_email}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="inline-flex bg-white/10 p-1 rounded-full text-xs font-semibold">
              <button
                type="button"
                onClick={() => setActiveTab('catalogue')}
                className={`px-4 py-1.5 rounded-full transition-colors ${
                  activeTab === 'catalogue' ? 'bg-white text-[#39008B]' : 'text-white/85'
                }`}
              >
                Wholesale Catalogue
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('inquiries')}
                className={`px-4 py-1.5 rounded-full transition-colors ${
                  activeTab === 'inquiries' ? 'bg-white text-[#39008B]' : 'text-white/85'
                }`}
              >
                Enquiries &amp; Quotations ({inquiries.length})
              </button>
            </div>

            <button
              type="button"
              onClick={clearWholesaleSession}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-white/30 text-xs font-semibold hover:bg-white/10"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign Out
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
        {inquiryFeedback && (
          <div className="mb-6 p-4 rounded-xl bg-[#8ACE69]/20 border border-[#538710]/30 text-sm font-medium text-[#0E021E] flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#538710]" />
            {inquiryFeedback}
          </div>
        )}

        {loadingPortal ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-72 rounded-2xl bg-[#F3F0FF] animate-pulse" />
            ))}
          </div>
        ) : activeTab === 'catalogue' ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-6">
              {catalogue.map((prod) => {
                const t = prod.wholesale_tier;
                const currentQty = bulkCart[prod.id] || 0;
                const activeUnitPrice = getEffectiveUnitPrice(
                  prod,
                  Math.max(t.moq, currentQty || t.moq)
                );

                return (
                  <div
                    key={prod.id}
                    className="bg-white rounded-2xl border border-[#AA87FF]/25 overflow-hidden flex flex-col"
                  >
                    <div className="aspect-[16/10] bg-[#F3F0FF]">
                      <ResilientImage
                        src={prod.images[0]?.image_url}
                        alt={prod.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="p-5 flex-1 flex flex-col">
                      <span className="text-[11px] font-mono text-[#0E021E]/60">
                        SKU {prod.sku} · MOQ {t.moq} units
                      </span>
                      <h2 className="font-display text-lg font-bold text-[#0E021E] mt-1">
                        {prod.name}
                      </h2>
                      <p className="text-xs text-[#0E021E]/70 mt-1 flex-1">
                        {prod.short_description}
                      </p>

                      {/* Wholesale Tier Breakdown */}
                      <div className="mt-4 p-3 rounded-xl bg-[#F3F0FF]/70 text-xs space-y-1 tabular-nums">
                        <div className="flex justify-between">
                          <span>{t.moq}+ units (Base Wholesale):</span>
                          <span className="font-bold text-[#39008B]">
                            {formatCad(t.base_wholesale_price_cad)}
                          </span>
                        </div>
                        {t.tier_2_min_qty && t.tier_2_price_cad !== null && (
                          <div className="flex justify-between">
                            <span>{t.tier_2_min_qty}+ units:</span>
                            <span className="font-bold text-[#5000AF]">
                              {formatCad(t.tier_2_price_cad)}
                            </span>
                          </div>
                        )}
                        {t.tier_3_min_qty && t.tier_3_price_cad !== null && (
                          <div className="flex justify-between">
                            <span>{t.tier_3_min_qty}+ units:</span>
                            <span className="font-bold text-[#538710]">
                              {formatCad(t.tier_3_price_cad)}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="mt-4 flex items-center gap-2">
                        <input
                          type="number"
                          min={t.moq}
                          step={1}
                          value={currentQty || ''}
                          placeholder={`Min ${t.moq}`}
                          onChange={(e) => {
                            const val = Math.max(0, Math.floor(Number(e.target.value) || 0));
                            setBulkCart((prev) => ({ ...prev, [prod.id]: val }));
                          }}
                          className="w-24 px-3 py-2 rounded-xl border border-[#AA87FF]/45 text-xs tabular-nums focus:outline-none focus:border-[#5000AF]"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setBulkCart((prev) => ({
                              ...prev,
                              [prod.id]: Math.max(t.moq, (prev[prod.id] || 0) + t.moq),
                            }))
                          }
                          className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-full bg-[#5000AF] text-white text-xs font-semibold hover:bg-[#39008B]"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Add {t.moq} ({formatCad(activeUnitPrice)}/ea)
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Bulk Enquiry Cart */}
            <aside className="lg:col-span-4 bg-[#F3F0FF]/70 rounded-2xl border border-[#AA87FF]/30 p-6 sticky top-24">
              <div className="flex items-center gap-2 mb-4">
                <Package className="w-5 h-5 text-[#5000AF]" />
                <h2 className="font-display text-xl font-bold text-[#0E021E]">
                  Bulk Enquiry Cart
                </h2>
              </div>

              {cartEntries.length === 0 ? (
                <p className="text-xs text-[#0E021E]/70">
                  Add wholesale items meeting minimum order quantities to request a formal quotation.
                </p>
              ) : (
                <form onSubmit={handleSubmitInquiry} className="space-y-4">
                  <div className="divide-y divide-[#AA87FF]/20">
                    {cartEntries.map(({ product, qty }) => {
                      const unit = getEffectiveUnitPrice(product, qty);
                      const belowMoq = qty < product.wholesale_tier.moq;
                      return (
                        <div key={product.id} className="py-2.5 flex items-start justify-between gap-2 text-xs">
                          <div>
                            <p className="font-semibold text-[#0E021E]">{product.name}</p>
                            <p className="text-[#0E021E]/65 tabular-nums">
                              {qty} × {formatCad(unit)}
                            </p>
                            {belowMoq && (
                              <p className="text-[#B71C85] font-semibold">
                                Minimum {product.wholesale_tier.moq} units required
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-[#39008B] tabular-nums">
                              {formatCad(unit * qty)}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                setBulkCart((prev) => {
                                  const next = { ...prev };
                                  delete next[product.id];
                                  return next;
                                })
                              }
                              className="text-[#0E021E]/40 hover:text-[#B71C85]"
                              aria-label="Remove item"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="pt-3 border-t border-[#AA87FF]/25 flex justify-between text-sm font-bold">
                    <span>Estimated Total</span>
                    <span className="text-[#39008B] tabular-nums">
                      {formatCad(estimatedEnquiryTotal)}
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#0E021E] mb-1">
                      Delivery &amp; Enquiry Notes
                    </label>
                    <textarea
                      rows={3}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Target delivery date, shipping destination, or custom packaging questions..."
                      className="w-full px-3 py-2 rounded-xl bg-white border border-[#AA87FF]/40 text-xs focus:outline-none focus:border-[#5000AF]"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={
                      submittingInquiry ||
                      cartEntries.some(({ product, qty }) => qty < product.wholesale_tier.moq)
                    }
                    className="w-full py-3 rounded-full bg-[#5000AF] text-white text-xs font-semibold hover:bg-[#39008B] disabled:opacity-50"
                  >
                    {submittingInquiry ? 'Submitting Enquiry...' : 'Submit Wholesale Enquiry'}
                  </button>
                </form>
              )}
            </aside>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <ClipboardList className="w-5 h-5 text-[#5000AF]" />
              <h2 className="font-display text-2xl font-bold text-[#0E021E]">
                Your Wholesale Enquiries &amp; Quotations
              </h2>
            </div>

            {inquiries.length === 0 ? (
              <div className="bg-[#F3F0FF]/55 rounded-2xl border border-[#AA87FF]/25 p-10 text-center">
                <p className="text-sm text-[#0E021E]/75">
                  You have not submitted any wholesale enquiries yet.
                </p>
              </div>
            ) : (
              inquiries.map((inq) => (
                <div
                  key={inq.id}
                  className="bg-white rounded-2xl border border-[#AA87FF]/25 p-6 space-y-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <span className="font-mono text-sm font-bold text-[#5000AF]">
                        {inq.inquiry_reference}
                      </span>
                      <p className="text-xs text-[#0E021E]/60 mt-0.5">
                        Submitted {new Date(inq.created_at).toLocaleDateString()} · Status:{' '}
                        <strong className="text-[#0E021E]">{inq.status}</strong>
                      </p>
                    </div>
                    <div className="text-right tabular-nums">
                      <span className="text-xs text-[#0E021E]/60 block">Estimated Total</span>
                      <span className="text-lg font-bold text-[#39008B]">
                        {formatCad(inq.estimated_total_cad)}
                      </span>
                    </div>
                  </div>

                  <div className="bg-[#F3F0FF]/50 rounded-xl p-3 space-y-1.5 text-xs">
                    {inq.items.map((it) => (
                      <div key={it.id} className="flex justify-between tabular-nums">
                        <span>
                          {it.product_name} × {it.quantity} ({formatCad(it.quoted_unit_price_cad)}/unit)
                        </span>
                        <span className="font-semibold">{formatCad(it.line_total_cad)}</span>
                      </div>
                    ))}
                  </div>

                  {inq.quotations.length > 0 && (
                    <div className="p-4 rounded-xl bg-[#8ACE69]/15 border border-[#538710]/30 space-y-1.5 text-xs">
                      <h3 className="font-bold text-[#538710] uppercase tracking-wider">
                        Official Quotation Provided
                      </h3>
                      {inq.quotations.map((q) => (
                        <div key={q.id} className="space-y-1">
                          <div className="flex flex-wrap gap-4 tabular-nums">
                            <span>
                              Quoted Total: <strong>{formatCad(q.quoted_total_cad)}</strong>
                            </span>
                            <span>
                              Shipping Estimate: <strong>{formatCad(q.shipping_estimate_cad)}</strong>
                            </span>
                            {q.valid_until && <span>Valid Until: {q.valid_until}</span>}
                          </div>
                          {q.terms && <p className="text-[#0E021E]/80">Terms: {q.terms}</p>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </>
  );
};
