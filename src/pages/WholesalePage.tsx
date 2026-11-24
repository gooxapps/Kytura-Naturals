import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Building2, CheckCircle2, Lock, Mail, MessageCircle, ShieldCheck } from 'lucide-react';
import { formatPhoneDisplay, formatWhatsappHref, useStore } from '../context/StoreContext';
import { SEOHead } from '../components/SEOHead';
import { ResilientImage } from '../components/ProductCard';

export const WholesalePage: React.FC = () => {
  const { settings } = useStore();
  const [form, setForm] = useState({
    business_name: '',
    applicant_name: '',
    business_email: '',
    phone: '',
    country: 'Canada',
    business_address: '',
    business_type: 'Spa & Wellness Studio',
    website_or_social: '',
    additional_info: '',
    password: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [submittedApp, setSubmittedApp] = useState<{ business_email: string; status: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const res = await fetch('/api/public/wholesale/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Could not submit wholesale application.');
      } else {
        setSubmittedApp(data.application);
      }
    } catch {
      setError('Network error submitting application. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const waWholesaleUrl = formatWhatsappHref(
    settings.whatsapp_number,
    'Hello Kytura Naturals, I would like to make a wholesale partnership enquiry.'
  );

  return (
    <>
      <SEOHead
        title={`Wholesale Partnerships | ${settings.business_name}`}
        description="Apply for a Kytura Naturals wholesale account for spas, wellness boutiques, and retail partners."
      />

      {/* Wholesale Header Banner */}
      <section className="bg-gradient-to-r from-[#39008B] via-[#5000AF] to-[#39008B] text-white py-12 sm:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-7">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#8ACE69] uppercase tracking-wider">
              <Building2 className="w-4 h-4" />
              Wholesale Program
            </span>
            <h1 className="mt-2 font-display text-3xl sm:text-5xl font-bold leading-tight">
              Wholesale &amp; Business Partnerships
            </h1>
            <p className="mt-4 text-sm sm:text-base text-white/85 max-w-2xl leading-relaxed">
              Kytura Naturals partners with spas, wellness clinics, aromatherapy studios, and curated boutiques across global regions. Wholesale pricing, minimum order quantities, and bulk quotations are reserved exclusively for approved business accounts.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <a
                href="#wholesale-application"
                className="px-6 py-3 rounded-full bg-[#8ACE69] text-[#0E021E] text-sm font-bold hover:bg-[#9ee07c] transition-colors"
              >
                Apply for Wholesale
              </a>
              <Link
                to="/wholesale/portal"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full border border-white/40 text-white text-sm font-semibold hover:bg-white/10 transition-colors"
              >
                <Lock className="w-4 h-4" />
                Approved Partner Login
              </Link>
            </div>
          </div>

          <div className="lg:col-span-5">
            <div className="aspect-[4/3] rounded-2xl overflow-hidden shadow-2xl border border-white/15">
              <ResilientImage
                src="/src/assets/images/wholesale_amber_lavender_1795486736444.jpg"
                alt="Kytura Naturals wholesale botanical bottles"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* How Wholesale Access Works */}
      <section className="py-12 bg-[#F3F0FF]/55 border-b border-[#AA87FF]/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-2xl border border-[#AA87FF]/25 p-6">
              <span className="text-xs font-bold text-[#5000AF]">01. Application</span>
              <h2 className="mt-1 font-display text-xl font-bold text-[#0E021E]">
                Submit Business Details
              </h2>
              <p className="mt-2 text-sm text-[#0E021E]/75">
                Complete the registration form below with your business details and create a portal password for future access.
              </p>
            </div>
            <div className="bg-white rounded-2xl border border-[#AA87FF]/25 p-6">
              <span className="text-xs font-bold text-[#5000AF]">02. Verification</span>
              <h2 className="mt-1 font-display text-xl font-bold text-[#0E021E]">
                Administrator Approval
              </h2>
              <p className="mt-2 text-sm text-[#0E021E]/75">
                Our team reviews every application before granting access. Pending or unapproved accounts cannot view wholesale pricing.
              </p>
            </div>
            <div className="bg-white rounded-2xl border border-[#AA87FF]/25 p-6">
              <span className="text-xs font-bold text-[#5000AF]">03. Wholesale Portal</span>
              <h2 className="mt-1 font-display text-xl font-bold text-[#0E021E]">
                Tiered Pricing &amp; Enquiries
              </h2>
              <p className="mt-2 text-sm text-[#0E021E]/75">
                Once approved, sign in to the Wholesale Portal to view CAD tiered pricing, minimum order quantities, and submit bulk enquiries for formal quotation.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Application Form & Contact Info */}
      <section id="wholesale-application" className="py-12 sm:py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          <div className="lg:col-span-8">
            {submittedApp ? (
              <div className="bg-[#F3F0FF] rounded-2xl border border-[#5000AF]/30 p-8">
                <div className="flex items-center gap-3 text-[#538710]">
                  <CheckCircle2 className="w-8 h-8" />
                  <h2 className="font-display text-2xl font-bold text-[#0E021E]">
                    Application Submitted (Status: Pending)
                  </h2>
                </div>
                <p className="mt-4 text-sm text-[#0E021E]/80 leading-relaxed">
                  Thank you for applying to partner with Kytura Naturals. Your application for{' '}
                  <strong>{submittedApp.business_email}</strong> has been saved and is currently{' '}
                  <strong>pending administrator approval</strong>. Wholesale pricing remains restricted until your account is approved.
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Link
                    to="/wholesale/portal"
                    className="px-6 py-2.5 rounded-full bg-[#5000AF] text-white text-xs font-semibold"
                  >
                    Go to Partner Sign In
                  </Link>
                  <Link
                    to="/"
                    className="px-6 py-2.5 rounded-full border border-[#5000AF] text-[#5000AF] text-xs font-semibold"
                  >
                    Return Home
                  </Link>
                </div>
              </div>
            ) : (
              <form
                onSubmit={handleSubmit}
                className="bg-white rounded-2xl border border-[#AA87FF]/30 p-6 sm:p-8 space-y-5 shadow-xs"
              >
                <div>
                  <h2 className="font-display text-2xl font-bold text-[#0E021E]">
                    Wholesale Account Application
                  </h2>
                  <p className="mt-1 text-xs text-[#0E021E]/65">
                    All prices are in Canadian Dollars (CAD). Approval is required prior to viewing wholesale rates.
                  </p>
                </div>

                {error && (
                  <div className="p-3.5 rounded-xl bg-[#B71C85]/10 border border-[#B71C85]/30 text-xs font-semibold text-[#B71C85]">
                    {error}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#0E021E] mb-1.5">
                      Business Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={form.business_name}
                      onChange={(e) => setForm({ ...form, business_name: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-[#AA87FF]/45 text-sm focus:outline-none focus:border-[#5000AF]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#0E021E] mb-1.5">
                      Applicant Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={form.applicant_name}
                      onChange={(e) => setForm({ ...form, applicant_name: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-[#AA87FF]/45 text-sm focus:outline-none focus:border-[#5000AF]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#0E021E] mb-1.5">
                      Business Email *
                    </label>
                    <input
                      type="email"
                      required
                      value={form.business_email}
                      onChange={(e) => setForm({ ...form, business_email: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-[#AA87FF]/45 text-sm focus:outline-none focus:border-[#5000AF]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#0E021E] mb-1.5">
                      Phone / WhatsApp *
                    </label>
                    <input
                      type="tel"
                      required
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-[#AA87FF]/45 text-sm focus:outline-none focus:border-[#5000AF]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#0E021E] mb-1.5">
                      Country *
                    </label>
                    <input
                      type="text"
                      required
                      value={form.country}
                      onChange={(e) => setForm({ ...form, country: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-[#AA87FF]/45 text-sm focus:outline-none focus:border-[#5000AF]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#0E021E] mb-1.5">
                      Business Type *
                    </label>
                    <select
                      value={form.business_type}
                      onChange={(e) => setForm({ ...form, business_type: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-[#AA87FF]/45 bg-white text-sm focus:outline-none focus:border-[#5000AF]"
                    >
                      <option>Spa &amp; Wellness Studio</option>
                      <option>Retail Boutique</option>
                      <option>Holistic Practitioner / Clinic</option>
                      <option>Hospitality &amp; Retreat</option>
                      <option>Distributor / Reseller</option>
                      <option>Other</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#0E021E] mb-1.5">
                    Business Address *
                  </label>
                  <input
                    type="text"
                    required
                    value={form.business_address}
                    onChange={(e) => setForm({ ...form, business_address: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-[#AA87FF]/45 text-sm focus:outline-none focus:border-[#5000AF]"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#0E021E] mb-1.5">
                      Website or Social Media Link (Optional)
                    </label>
                    <input
                      type="text"
                      value={form.website_or_social}
                      onChange={(e) => setForm({ ...form, website_or_social: e.target.value })}
                      placeholder="https://..."
                      className="w-full px-4 py-2.5 rounded-xl border border-[#AA87FF]/45 text-sm focus:outline-none focus:border-[#5000AF]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#0E021E] mb-1.5">
                      Portal Password (Min 8 Characters) *
                    </label>
                    <input
                      type="password"
                      required
                      minLength={8}
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                      placeholder="Used after approval to sign in"
                      className="w-full px-4 py-2.5 rounded-xl border border-[#AA87FF]/45 text-sm focus:outline-none focus:border-[#5000AF]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#0E021E] mb-1.5">
                    Additional Information (Optional)
                  </label>
                  <textarea
                    rows={3}
                    value={form.additional_info}
                    onChange={(e) => setForm({ ...form, additional_info: e.target.value })}
                    placeholder="Tell us about the products you are interested in stocking..."
                    className="w-full px-4 py-2.5 rounded-xl border border-[#AA87FF]/45 text-sm focus:outline-none focus:border-[#5000AF]"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="px-8 py-3 rounded-full bg-[#5000AF] text-white text-sm font-semibold hover:bg-[#39008B] disabled:opacity-60 transition-colors"
                >
                  {submitting ? 'Submitting Application...' : 'Submit Wholesale Application'}
                </button>
              </form>
            )}
          </div>

          <aside className="lg:col-span-4 space-y-5">
            <div className="bg-[#F3F0FF]/70 rounded-2xl border border-[#AA87FF]/30 p-6 space-y-4">
              <div className="flex items-center gap-2 text-[#5000AF]">
                <ShieldCheck className="w-5 h-5" />
                <h3 className="font-display text-lg font-bold text-[#0E021E]">
                  Wholesale Enquiry Contact
                </h3>
              </div>
              <p className="text-xs text-[#0E021E]/75 leading-relaxed">
                Have questions before applying or following up on an existing application? Contact our wholesale desk directly.
              </p>
              <div className="space-y-2.5 text-xs">
                <a
                  href={`mailto:${settings.email}`}
                  className="flex items-center gap-2 font-semibold text-[#39008B] hover:underline"
                >
                  <Mail className="w-4 h-4" />
                  {settings.email}
                </a>
                <a
                  href={waWholesaleUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 font-semibold text-[#538710] hover:underline"
                >
                  <MessageCircle className="w-4 h-4" />
                  WhatsApp: {formatPhoneDisplay(settings.whatsapp_number)}
                </a>
              </div>
              <div className="pt-3 border-t border-[#AA87FF]/25">
                <Link
                  to="/wholesale/portal"
                  className="block w-full py-2.5 px-4 rounded-full bg-white border border-[#5000AF] text-[#5000AF] text-xs font-semibold text-center hover:bg-[#5000AF] hover:text-white transition-colors"
                >
                  Already Approved? Sign In
                </Link>
              </div>
            </div>
          </aside>
        </div>
      </section>
    </>
  );
};
