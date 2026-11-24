import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Gem,
  Globe,
  Headphones,
  Leaf,
  Mail,
  ShieldCheck,
  Star,
} from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { useStore } from '../context/StoreContext';
import { ProductCard, ResilientImage } from '../components/ProductCard';
import { SEOHead } from '../components/SEOHead';
import type { Product } from '../types';

const BENEFIT_ICONS: Record<string, React.ReactNode> = {
  gem: <Gem className="w-7 h-7 text-[#5000AF]" strokeWidth={1.6} />,
  globe: <Globe className="w-7 h-7 text-[#5000AF]" strokeWidth={1.6} />,
  headphones: <Headphones className="w-7 h-7 text-[#5000AF]" strokeWidth={1.6} />,
  shield: <ShieldCheck className="w-7 h-7 text-[#538710]" strokeWidth={1.6} />,
};

export const HomePage: React.FC = () => {
  const { settings, categories, testimonials, getSection, loadingBootstrap } = useStore();
  const prefersReducedMotion = useReducedMotion();
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [testimonialIdx, setTestimonialIdx] = useState(0);
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterStatus, setNewsletterStatus] = useState<{ type: 'ok' | 'err'; msg: string } | null>(null);
  const [submittingNewsletter, setSubmittingNewsletter] = useState(false);

  useEffect(() => {
    let active = true;
    fetch('/api/public/products?featured=1')
      .then((r) => r.json())
      .then((data) => {
        if (active && Array.isArray(data.products)) {
          setFeaturedProducts(data.products);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoadingProducts(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const hero = getSection('hero');
  const benefits = getSection('benefits');
  const collectionsSec = getSection('collections');
  const featuredSec = getSection('featured_products');
  const storySec = getSection('brand_story');
  const wholesaleSec = getSection('wholesale_promo');
  const testimonialsSec = getSection('testimonials');
  const newsletterSec = getSection('newsletter');

  const benefitItems =
    (benefits?.extra_json?.items as Array<{ icon: string; title: string; subtitle: string }>) || [
      { icon: 'gem', title: 'Botanical Focus', subtitle: 'Thoughtfully Curated Oils' },
      { icon: 'globe', title: 'Worldwide Delivery', subtitle: 'Shipping Across Regions' },
      { icon: 'headphones', title: 'Dedicated Support', subtitle: 'Direct WhatsApp Assistance' },
      { icon: 'shield', title: 'Personal Confirmation', subtitle: 'Direct Order Review' },
    ];

  const showTestimonials =
    (testimonialsSec?.is_enabled ?? true) && testimonials.length > 0;
  const activeTestimonial = testimonials[testimonialIdx % Math.max(1, testimonials.length)];

  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setNewsletterStatus(null);
    setSubmittingNewsletter(true);
    try {
      const res = await fetch('/api/public/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newsletterEmail }),
      });
      const data = await res.json();
      if (!res.ok) {
        setNewsletterStatus({ type: 'err', msg: data.error || 'Could not subscribe.' });
      } else {
        setNewsletterStatus({ type: 'ok', msg: data.message });
        setNewsletterEmail('');
      }
    } catch {
      setNewsletterStatus({ type: 'err', msg: 'Network error. Please try again.' });
    } finally {
      setSubmittingNewsletter(false);
    }
  };

  const heroLines = (hero?.title || 'Reconnect With Nature.\nRediscover Wellness.').split('\n');

  return (
    <>
      <SEOHead title={settings.seo_title} description={settings.seo_description} />

      {/* C. Hero Section */}
      {(hero?.is_enabled ?? true) && (
        <section className="relative overflow-hidden bg-[#F3F0FF]">
          <div className="relative min-h-[460px] sm:min-h-[520px] lg:min-h-[560px] flex items-center">
            {/* Background Image */}
            <div className="absolute inset-0">
              <ResilientImage
                src={hero?.image_url || '/src/assets/images/hero_botanical_wellness_1795486732844.jpg'}
                alt="Kytura Naturals botanical diffuser oils and ultrasonic diffuser"
                className="w-full h-full object-cover object-right"
              />
              {/* Soft editorial mist gradient on left so headline is effortlessly legible */}
              <div
                className="absolute inset-0 bg-gradient-to-r from-[#F9F7FF] via-[#F3F0FF]/90 sm:via-[#F3F0FF]/75 to-transparent"
                aria-hidden="true"
              />
            </div>

            <div className="relative z-10 max-w-7xl mx-auto w-full px-4 sm:px-6 py-14 sm:py-20">
              <motion.div
                initial={prefersReducedMotion ? false : { opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
                className="max-w-xl"
              >
                <h1 className="font-display text-4xl sm:text-5xl lg:text-[3.4rem] font-bold text-[#0E021E] leading-[1.08] tracking-tight text-balance">
                  {heroLines.map((line, i) => (
                    <span key={i} className="block">
                      {line}
                    </span>
                  ))}
                </h1>

                <motion.p
                  initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.55, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
                  className="mt-5 text-base sm:text-[17px] text-[#0E021E]/80 leading-relaxed max-w-lg"
                >
                  {hero?.subtitle ||
                    'Explore botanical oil blends, luxurious body and massage oils, and thoughtfully selected aromatherapy diffusers.'}
                </motion.p>

                <motion.div
                  initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.55, delay: 0.18, ease: [0.16, 1, 0.3, 1] }}
                  className="mt-8 flex flex-wrap items-center gap-3.5"
                >
                  <Link
                    to={hero?.cta_primary_href || '/shop'}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#5000AF] text-white text-sm font-semibold shadow-md shadow-[#5000AF]/25 hover:bg-[#39008B] transition-all whitespace-nowrap"
                  >
                    <span>{hero?.cta_primary_label || 'Explore Collection'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                  <Link
                    to={hero?.cta_secondary_href || '/collections/diffuser-oil-blends'}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white/85 border border-[#5000AF] text-[#39008B] text-sm font-semibold hover:bg-[#F3F0FF] transition-colors whitespace-nowrap"
                  >
                    {hero?.cta_secondary_label || 'Discover Our Products'}
                  </Link>
                </motion.div>
              </motion.div>
            </div>
          </div>
        </section>
      )}

      {/* D. Benefits Strip */}
      {(benefits?.is_enabled ?? true) && (
        <section className="bg-[#F3F0FF] border-y border-[#AA87FF]/25">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-[#AA87FF]/30">
              {benefitItems.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-start lg:justify-center gap-3.5 py-3 sm:py-2 px-4"
                >
                  <div className="shrink-0">
                    {BENEFIT_ICONS[item.icon] || BENEFIT_ICONS.gem}
                  </div>
                  <div>
                    <h2 className="font-sans text-sm font-bold text-[#0E021E] leading-tight">
                      {item.title}
                    </h2>
                    <p className="text-xs text-[#0E021E]/70 mt-0.5">{item.subtitle}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* E. Shop Our Collections */}
      {(collectionsSec?.is_enabled ?? true) && (
        <section className="py-12 sm:py-16 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="flex items-center justify-center gap-4 mb-8">
              <span className="h-[1.5px] w-14 sm:w-28 bg-gradient-to-r from-transparent to-[#538710]" />
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#0E021E] text-center">
                {collectionsSec?.title || 'Shop Our Collections'}
              </h2>
              <span className="h-[1.5px] w-14 sm:w-28 bg-gradient-to-l from-transparent to-[#538710]" />
            </div>

            {loadingBootstrap ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="aspect-[16/10] rounded-2xl bg-[#F3F0FF] animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {categories.map((cat, idx) => (
                  <motion.div
                    key={cat.id}
                    initial={prefersReducedMotion ? false : { opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.2 }}
                    transition={{ duration: 0.4, delay: idx * 0.06 }}
                  >
                    <Link
                      to={`/collections/${cat.slug}`}
                      className="group relative block aspect-[16/10] rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all"
                    >
                      <ResilientImage
                        src={cat.image_url}
                        alt={cat.name}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#0E021E]/85 via-[#0E021E]/25 to-transparent" />
                      <div className="absolute inset-x-0 bottom-0 p-4 flex flex-col items-end text-right">
                        <h3 className="font-display text-lg sm:text-xl font-bold text-white leading-tight">
                          {cat.name}
                        </h3>
                        <span className="mt-1 inline-flex items-center gap-1.5 text-xs font-semibold text-white/95 group-hover:text-[#8ACE69] transition-colors">
                          Shop Now
                          <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                        </span>
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* F. Featured Products */}
      {(featuredSec?.is_enabled ?? true) && (
        <section className="py-12 sm:py-16 bg-[#F3F0FF]/45 border-y border-[#F3F0FF]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
              <div>
                <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#0E021E]">
                  {featuredSec?.title || 'Featured Products'}
                </h2>
                {featuredSec?.subtitle && (
                  <p className="mt-1.5 text-sm text-[#0E021E]/70">{featuredSec.subtitle}</p>
                )}
              </div>
              <Link
                to={featuredSec?.cta_primary_href || '/shop'}
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#5000AF] hover:text-[#39008B] whitespace-nowrap"
              >
                {featuredSec?.cta_primary_label || 'View All Products'}
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {loadingProducts ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-80 rounded-2xl bg-white border border-[#AA87FF]/20 animate-pulse" />
                ))}
              </div>
            ) : featuredProducts.length === 0 ? (
              <div className="bg-white rounded-2xl border border-[#AA87FF]/25 p-8 text-center">
                <p className="text-sm text-[#0E021E]/70">
                  Featured products will appear here once published in the store catalogue.
                </p>
                <Link
                  to="/shop"
                  className="inline-block mt-4 px-5 py-2 rounded-full bg-[#5000AF] text-white text-xs font-semibold"
                >
                  Browse Full Catalogue
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {featuredProducts.map((product, idx) => (
                  <motion.div
                    key={product.id}
                    initial={prefersReducedMotion ? false : { opacity: 0, y: 14 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.15 }}
                    transition={{ duration: 0.35, delay: idx * 0.05 }}
                  >
                    <ProductCard product={product} />
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* G. Brand Story Section */}
      {(storySec?.is_enabled ?? true) && (
        <section className="py-12 sm:py-16 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
              <motion.div
                initial={prefersReducedMotion ? false : { opacity: 0, x: -16 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.45 }}
                className="lg:col-span-6 flex flex-col justify-center"
              >
                <span className="text-xs font-semibold tracking-wider text-[#538710] uppercase">
                  {storySec?.subtitle || 'Founded by Dr Ann Merah'}
                </span>
                <h2 className="mt-2 font-display text-3xl sm:text-4xl font-bold text-[#0E021E] text-balance">
                  {storySec?.title || 'Rooted in Botanical Wellness'}
                </h2>
                <p className="mt-4 text-sm sm:text-base text-[#0E021E]/75 leading-relaxed whitespace-pre-line">
                  {storySec?.body}
                </p>
                <div className="mt-6">
                  <Link
                    to={storySec?.cta_primary_href || '/about'}
                    className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full border border-[#5000AF] text-[#39008B] text-sm font-semibold hover:bg-[#F3F0FF] transition-colors"
                  >
                    {storySec?.cta_primary_label || 'About Kytura Naturals'}
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </motion.div>

              <motion.div
                initial={prefersReducedMotion ? false : { opacity: 0, x: 16 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.45 }}
                className="lg:col-span-6"
              >
                <div className="h-full min-h-[280px] rounded-2xl overflow-hidden bg-[#F3F0FF] shadow-sm">
                  <ResilientImage
                    src={storySec?.image_url || '/src/assets/images/wellness_spa_collection_1795486735845.jpg'}
                    alt="Kytura Naturals botanical spa story"
                    className="w-full h-full object-cover"
                  />
                </div>
              </motion.div>
            </div>
          </div>
        </section>
      )}

      {/* H. Wholesale Promo & I. Genuine Testimonials Split (Matching reference bottom layout) */}
      {((wholesaleSec?.is_enabled ?? true) || showTestimonials) && (
        <section className="pb-14 pt-4 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div
              className={`grid grid-cols-1 gap-8 items-stretch ${
                showTestimonials ? 'lg:grid-cols-12' : ''
              }`}
            >
              {/* Wholesale & Business Partnerships Banner */}
              {(wholesaleSec?.is_enabled ?? true) && (
                <div
                  className={`${
                    showTestimonials ? 'lg:col-span-7' : 'w-full'
                  } relative rounded-2xl overflow-hidden bg-gradient-to-r from-[#39008B] via-[#5000AF] to-[#6B21A8] text-white shadow-lg flex items-center`}
                >
                  {/* Decorative curved lavender wave */}
                  <div
                    className="absolute right-0 top-0 bottom-0 w-2/5 opacity-25 bg-gradient-to-l from-[#AA87FF] to-transparent pointer-events-none"
                    aria-hidden="true"
                  />

                  <div className="relative z-10 p-6 sm:p-8 flex-1 max-w-lg">
                    <div className="flex items-start gap-4">
                      <div className="hidden sm:flex w-12 h-12 rounded-2xl bg-white/10 border border-[#8ACE69]/40 items-center justify-center shrink-0 text-[#8ACE69]">
                        <Leaf className="w-6 h-6" />
                      </div>
                      <div>
                        <h2 className="font-display text-2xl sm:text-3xl font-bold text-white leading-tight">
                          {wholesaleSec?.title || 'Wholesale & Business Partnerships'}
                        </h2>
                        <p className="mt-2.5 text-sm text-white/85 leading-relaxed">
                          {wholesaleSec?.subtitle ||
                            'Grow your business with Kytura Naturals. Exclusive wholesale pricing and bulk options.'}
                        </p>
                        <div className="mt-5 flex flex-wrap items-center gap-3">
                          <Link
                            to={wholesaleSec?.cta_primary_href || '/wholesale'}
                            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#8ACE69] text-[#0E021E] text-xs sm:text-sm font-bold hover:bg-[#9ee07c] transition-colors whitespace-nowrap"
                          >
                            {wholesaleSec?.cta_primary_label || 'Apply for Wholesale'}
                            <ArrowRight className="w-4 h-4" />
                          </Link>
                          <Link
                            to={wholesaleSec?.cta_secondary_href || '/wholesale/portal'}
                            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full border border-white/40 text-white text-xs font-semibold hover:bg-white/10 transition-colors whitespace-nowrap"
                          >
                            {wholesaleSec?.cta_secondary_label || 'Partner Login'}
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Side Botanical Image */}
                  <div className="hidden md:block w-52 lg:w-60 h-full self-stretch relative shrink-0">
                    <ResilientImage
                      src={
                        wholesaleSec?.image_url ||
                        '/src/assets/images/wholesale_amber_lavender_1795486736444.jpg'
                      }
                      alt="Kytura Naturals wholesale botanical bottles"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-[#5000AF] via-transparent to-transparent" />
                  </div>
                </div>
              )}

              {/* Genuine Admin-Approved Testimonials (Strictly hidden when 0 approved testimonials exist) */}
              {showTestimonials && activeTestimonial && (
                <div className="lg:col-span-5 flex flex-col justify-center bg-white rounded-2xl border border-[#AA87FF]/25 p-6 sm:p-8">
                  <div className="flex items-center justify-center gap-3 mb-5">
                    <span className="h-[1px] flex-1 bg-[#AA87FF]/40" />
                    <h2 className="font-display text-xl font-bold text-[#0E021E] whitespace-nowrap">
                      {testimonialsSec?.title || 'Our Happy Customers'}
                    </h2>
                    <span className="h-[1px] flex-1 bg-[#AA87FF]/40" />
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() =>
                        setTestimonialIdx((prev) =>
                          prev === 0 ? testimonials.length - 1 : prev - 1
                        )
                      }
                      aria-label="Previous testimonial"
                      className="p-2 rounded-full text-[#39008B] hover:bg-[#F3F0FF] shrink-0"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>

                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div className="w-16 h-16 rounded-full overflow-hidden bg-[#F3F0FF] border-2 border-[#AA87FF]/40 shrink-0 flex items-center justify-center font-display font-bold text-xl text-[#5000AF]">
                        {activeTestimonial.avatar_url ? (
                          <ResilientImage
                            src={activeTestimonial.avatar_url}
                            alt={activeTestimonial.customer_name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          activeTestimonial.customer_name.slice(0, 1).toUpperCase()
                        )}
                      </div>
                      <div className="min-w-0">
                        <blockquote className="font-display text-base text-[#0E021E] italic leading-snug">
                          “{activeTestimonial.quote}”
                        </blockquote>
                        <div className="mt-2.5 flex flex-wrap items-center gap-2">
                          <span className="text-xs font-semibold text-[#0E021E]">
                            — {activeTestimonial.customer_name}
                            {activeTestimonial.location ? `, ${activeTestimonial.location}` : ''}
                          </span>
                          <div className="flex items-center gap-0.5 text-amber-400">
                            {Array.from({ length: activeTestimonial.rating }).map((_, idx) => (
                              <Star key={idx} className="w-3.5 h-3.5 fill-current" />
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setTestimonialIdx((prev) => (prev + 1) % testimonials.length)
                      }
                      aria-label="Next testimonial"
                      className="p-2 rounded-full text-[#39008B] hover:bg-[#F3F0FF] shrink-0"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* J. Newsletter Section */}
      {(newsletterSec?.is_enabled ?? true) && (
        <section id="newsletter" className="py-12 bg-[#F3F0FF] border-t border-[#AA87FF]/25">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
            <div className="inline-flex items-center justify-center w-11 h-11 rounded-full bg-white text-[#5000AF] shadow-xs mb-3">
              <Mail className="w-5 h-5" />
            </div>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#0E021E]">
              {newsletterSec?.title || 'Join Our Botanical Journal'}
            </h2>
            <p className="mt-2 text-sm text-[#0E021E]/75">
              {newsletterSec?.subtitle ||
                'Receive seasonal product updates and restock announcements from Kytura Naturals.'}
            </p>

            <form
              onSubmit={handleNewsletterSubmit}
              className="mt-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 max-w-lg mx-auto"
            >
              <input
                type="email"
                required
                value={newsletterEmail}
                onChange={(e) => setNewsletterEmail(e.target.value)}
                placeholder="Enter your email address"
                aria-label="Email address for newsletter"
                className="flex-1 px-5 py-3 rounded-full bg-white border border-[#AA87FF]/45 text-sm text-[#0E021E] focus:outline-none focus:border-[#5000AF]"
              />
              <button
                type="submit"
                disabled={submittingNewsletter}
                className="px-7 py-3 rounded-full bg-[#5000AF] text-white text-sm font-semibold hover:bg-[#39008B] disabled:opacity-60 transition-colors whitespace-nowrap"
              >
                {submittingNewsletter ? 'Subscribing...' : newsletterSec?.cta_primary_label || 'Subscribe'}
              </button>
            </form>

            {newsletterStatus && (
              <p
                className={`mt-3 text-xs font-medium ${
                  newsletterStatus.type === 'ok' ? 'text-[#538710]' : 'text-[#B71C85]'
                }`}
              >
                {newsletterStatus.msg}
              </p>
            )}
          </div>
        </section>
      )}
    </>
  );
};
