import React, { useState } from 'react';
import { CheckCircle2, Globe, Mail, MessageCircle, Phone } from 'lucide-react';
import { formatPhoneDisplay, formatWhatsappHref, useStore } from '../context/StoreContext';
import { SEOHead } from '../components/SEOHead';

export const ContactPage: React.FC = () => {
  const { settings } = useStore();
  const [form, setForm] = useState({ name: '', email: '', phone: '', subject: '', message: '' });
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    setSending(true);
    try {
      const res = await fetch('/api/public/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setFeedback({ ok: false, msg: data.error || 'Could not send message.' });
      } else {
        setFeedback({ ok: true, msg: data.message });
        setForm({ name: '', email: '', phone: '', subject: '', message: '' });
      }
    } catch {
      setFeedback({ ok: false, msg: 'Network error. Please try again.' });
    } finally {
      setSending(false);
    }
  };

  const waUrl = formatWhatsappHref(
    settings.whatsapp_number,
    'Hello Kytura Naturals, I would like to make an enquiry about your products.'
  );

  return (
    <>
      <SEOHead
        title={`Contact Us | ${settings.business_name}`}
        description={`Reach ${settings.business_name} by email at ${settings.email} or WhatsApp at ${formatPhoneDisplay(settings.whatsapp_number)}.`}
      />

      <section className="bg-gradient-to-b from-[#F3F0FF] to-white border-b border-[#AA87FF]/20 py-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-[#0E021E]">
            Contact {settings.business_name}
          </h1>
          <p className="mt-2 text-sm sm:text-base text-[#0E021E]/75 max-w-2xl">
            For retail product questions, order confirmation assistance, or wholesale enquiries, connect with our team directly.
          </p>
        </div>
      </section>

      <section className="py-12 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-5 bg-[#F3F0FF]/70 rounded-2xl border border-[#AA87FF]/30 p-6 sm:p-8 space-y-5">
            <h2 className="font-display text-2xl font-bold text-[#0E021E]">Direct Channels</h2>

            <div className="space-y-4 text-sm">
              <div className="flex items-start gap-3">
                <Phone className="w-5 h-5 text-[#5000AF] shrink-0 mt-0.5" />
                <div>
                  <span className="block text-xs text-[#0E021E]/60">WhatsApp &amp; Phone</span>
                  <a
                    href={waUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-[#39008B] hover:underline tabular-nums"
                  >
                    {formatPhoneDisplay(settings.whatsapp_number)}
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-[#5000AF] shrink-0 mt-0.5" />
                <div>
                  <span className="block text-xs text-[#0E021E]/60">Email</span>
                  <a
                    href={`mailto:${settings.email}`}
                    className="font-semibold text-[#39008B] hover:underline"
                  >
                    {settings.email}
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Globe className="w-5 h-5 text-[#5000AF] shrink-0 mt-0.5" />
                <div>
                  <span className="block text-xs text-[#0E021E]/60">Service Region</span>
                  <span className="font-semibold text-[#0E021E]">{settings.region_label}</span>
                </div>
              </div>
            </div>

            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full inline-flex items-center justify-center gap-2 py-3 px-5 rounded-full bg-[#25D366] text-white text-sm font-bold hover:bg-[#1ebe5d] transition-colors"
            >
              <MessageCircle className="w-4 h-4" />
              Message Us on WhatsApp
            </a>
          </div>

          <form
            onSubmit={handleSubmit}
            className="lg:col-span-7 bg-white rounded-2xl border border-[#AA87FF]/25 p-6 sm:p-8 space-y-4"
          >
            <h2 className="font-display text-2xl font-bold text-[#0E021E]">Send a Message</h2>

            {feedback && (
              <div
                className={`p-3.5 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                  feedback.ok
                    ? 'bg-[#8ACE69]/20 text-[#538710]'
                    : 'bg-[#B71C85]/10 text-[#B71C85]'
                }`}
              >
                {feedback.ok && <CheckCircle2 className="w-4 h-4" />}
                {feedback.msg}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#0E021E] mb-1.5">Name *</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-[#AA87FF]/45 text-sm focus:outline-none focus:border-[#5000AF]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#0E021E] mb-1.5">Email *</label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-[#AA87FF]/45 text-sm focus:outline-none focus:border-[#5000AF]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#0E021E] mb-1.5">
                  Phone / WhatsApp (Optional)
                </label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-[#AA87FF]/45 text-sm focus:outline-none focus:border-[#5000AF]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#0E021E] mb-1.5">
                  Subject
                </label>
                <input
                  type="text"
                  value={form.subject}
                  onChange={(e) => setForm({ ...form, subject: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-[#AA87FF]/45 text-sm focus:outline-none focus:border-[#5000AF]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#0E021E] mb-1.5">Message *</label>
              <textarea
                rows={4}
                required
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-[#AA87FF]/45 text-sm focus:outline-none focus:border-[#5000AF]"
              />
            </div>

            <button
              type="submit"
              disabled={sending}
              className="px-8 py-3 rounded-full bg-[#5000AF] text-white text-sm font-semibold hover:bg-[#39008B] disabled:opacity-60 transition-colors"
            >
              {sending ? 'Sending...' : 'Send Message'}
            </button>
          </form>
        </div>
      </section>
    </>
  );
};
