import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { SEOHead } from '../components/SEOHead';
import { ResilientImage } from '../components/ProductCard';
import type { PageContent } from '../types';

interface CmsPageProps {
  slug: 'about' | 'faq' | 'privacy-policy' | 'terms-and-conditions' | 'shipping-returns';
}

export const CmsPage: React.FC<CmsPageProps> = ({ slug }) => {
  const { settings } = useStore();
  const [page, setPage] = useState<PageContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [openFaqIdx, setOpenFaqIdx] = useState<number | null>(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetch(`/api/public/pages/${slug}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (active && data?.page) setPage(data.page);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [slug]);

  const faqs = (page?.extra_json?.faqs as Array<{ q: string; a: string }>) || [];

  return (
    <>
      <SEOHead
        title={page?.seo_title || `${page?.title || slug} | ${settings.business_name}`}
        description={page?.seo_description || page?.subtitle || settings.seo_description}
      />

      <section className="bg-gradient-to-b from-[#F3F0FF] to-white border-b border-[#AA87FF]/20 py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="text-xs font-medium text-[#5000AF] mb-2">
            <Link to="/" className="hover:underline">
              Home
            </Link>{' '}
            / <span>{page?.title || slug}</span>
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-[#0E021E]">
            {loading ? 'Loading...' : page?.title}
          </h1>
          {page?.subtitle && (
            <p className="mt-2.5 text-sm sm:text-base text-[#0E021E]/75">{page.subtitle}</p>
          )}
        </div>
      </section>

      <section className="py-12 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          {loading ? (
            <div className="space-y-4">
              <div className="h-6 bg-[#F3F0FF] rounded w-3/4 animate-pulse" />
              <div className="h-24 bg-[#F3F0FF] rounded animate-pulse" />
            </div>
          ) : (
            <div className="space-y-8">
              {slug === 'about' && (
                <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
                  <div className="md:col-span-5 aspect-[4/3] rounded-2xl overflow-hidden bg-[#F3F0FF]">
                    <ResilientImage
                      src="/src/assets/images/wellness_spa_collection_1795486735845.jpg"
                      alt="Kytura Naturals Botanical Craft"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="md:col-span-7 space-y-4 text-sm sm:text-base text-[#0E021E]/80 leading-relaxed whitespace-pre-line">
                    {page?.content_markdown}
                  </div>
                </div>
              )}

              {slug !== 'about' && page?.content_markdown && (
                <div className="prose prose-sm sm:prose-base max-w-none text-[#0E021E]/80 leading-relaxed whitespace-pre-line">
                  {page.content_markdown}
                </div>
              )}

              {slug === 'faq' && faqs.length > 0 && (
                <div className="divide-y divide-[#AA87FF]/25 border border-[#AA87FF]/25 rounded-2xl overflow-hidden">
                  {faqs.map((item, idx) => {
                    const isOpen = openFaqIdx === idx;
                    return (
                      <div key={idx} className="bg-white">
                        <button
                          type="button"
                          onClick={() => setOpenFaqIdx(isOpen ? null : idx)}
                          className="w-full px-6 py-4 text-left flex items-center justify-between gap-4 hover:bg-[#F3F0FF]/50 transition-colors"
                        >
                          <span className="font-display text-lg font-semibold text-[#0E021E]">
                            {item.q}
                          </span>
                          <ChevronDown
                            className={`w-5 h-5 text-[#5000AF] shrink-0 transition-transform ${
                              isOpen ? 'rotate-180' : ''
                            }`}
                          />
                        </button>
                        {isOpen && (
                          <div className="px-6 pb-5 text-sm text-[#0E021E]/75 leading-relaxed">
                            {item.a}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </section>
    </>
  );
};
