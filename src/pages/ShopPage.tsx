import React, { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { Search, SlidersHorizontal } from 'lucide-react';
import { ProductCard } from '../components/ProductCard';
import { SEOHead } from '../components/SEOHead';
import { useStore } from '../context/StoreContext';
import type { Product } from '../types';

interface ShopPageProps {
  forcedCategorySlug?: string;
}

export const ShopPage: React.FC<ShopPageProps> = ({ forcedCategorySlug }) => {
  const { slug: routeSlug } = useParams<{ slug?: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const { categories, settings } = useStore();

  const activeCategorySlug = forcedCategorySlug || routeSlug || '';
  const initialQ = searchParams.get('q') || '';
  const [query, setQuery] = useState(initialQ);
  const [sortBy, setSortBy] = useState<'featured' | 'price-asc' | 'price-desc' | 'name'>('featured');
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setQuery(searchParams.get('q') || '');
  }, [searchParams]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    const params = new URLSearchParams();
    if (activeCategorySlug) params.set('category', activeCategorySlug);
    if (initialQ) params.set('q', initialQ);

    fetch(`/api/public/products?${params.toString()}`)
      .then((r) => r.json())
      .then((data) => {
        if (active && Array.isArray(data.products)) {
          setProducts(data.products);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [activeCategorySlug, initialQ]);

  const activeCategory = categories.find((c) => c.slug === activeCategorySlug);

  const sortedProducts = [...products].sort((a, b) => {
    if (sortBy === 'price-asc') return a.retail_price_cad - b.retail_price_cad;
    if (sortBy === 'price-desc') return b.retail_price_cad - a.retail_price_cad;
    if (sortBy === 'name') return a.name.localeCompare(b.name);
    return Number(b.is_featured) - Number(a.is_featured);
  });

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      setSearchParams({ q: query.trim() });
    } else {
      setSearchParams({});
    }
  };

  const pageTitle = activeCategory
    ? `${activeCategory.name} | ${settings.business_name}`
    : `Shop All Botanical Wellness | ${settings.business_name}`;

  const pageDesc =
    activeCategory?.description ||
    'Browse organic diffuser oil blends, body and massage oils, ultrasonic diffusers, and curated wellness collections in CAD.';

  return (
    <>
      <SEOHead title={pageTitle} description={pageDesc} />

      {/* Page Header */}
      <section className="bg-gradient-to-b from-[#F3F0FF] to-white border-b border-[#AA87FF]/20 py-10 sm:py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-xs font-medium text-[#5000AF] mb-2">
            <Link to="/" className="hover:underline">
              Home
            </Link>{' '}
            / <span>{activeCategory ? activeCategory.name : 'Shop All'}</span>
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-[#0E021E]">
            {activeCategory ? activeCategory.name : 'Shop All Products'}
          </h1>
          <p className="mt-2.5 text-sm sm:text-base text-[#0E021E]/75 max-w-2xl">{pageDesc}</p>
        </div>
      </section>

      <section className="py-10 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          {/* Category Filter Bar + Search + Sort */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-[#F3F0FF]">
            <div className="flex flex-wrap items-center gap-2">
              <Link
                to="/shop"
                className={`px-4 py-2 rounded-full text-xs font-semibold transition-colors whitespace-nowrap ${
                  !activeCategorySlug
                    ? 'bg-[#5000AF] text-white'
                    : 'bg-[#F3F0FF] text-[#39008B] hover:bg-[#AA87FF]/25'
                }`}
              >
                All Products
              </Link>
              {categories.map((cat) => (
                <Link
                  key={cat.id}
                  to={`/collections/${cat.slug}`}
                  className={`px-4 py-2 rounded-full text-xs font-semibold transition-colors whitespace-nowrap ${
                    activeCategorySlug === cat.slug
                      ? 'bg-[#5000AF] text-white'
                      : 'bg-[#F3F0FF] text-[#39008B] hover:bg-[#AA87FF]/25'
                  }`}
                >
                  {cat.name}
                </Link>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <form onSubmit={handleSearchSubmit} className="relative">
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Filter by keyword..."
                  className="pl-4 pr-9 py-2 rounded-full border border-[#AA87FF]/40 text-xs focus:outline-none focus:border-[#5000AF]"
                />
                <button
                  type="submit"
                  aria-label="Search"
                  className="absolute right-3 top-2.5 text-[#5000AF]"
                >
                  <Search className="w-3.5 h-3.5" />
                </button>
              </form>

              <div className="inline-flex items-center gap-2 text-xs text-[#0E021E]/75">
                <SlidersHorizontal className="w-3.5 h-3.5 text-[#5000AF]" />
                <select
                  value={sortBy}
                  onChange={(e) =>
                    setSortBy(e.target.value as 'featured' | 'price-asc' | 'price-desc' | 'name')
                  }
                  aria-label="Sort products"
                  className="py-2 px-3 rounded-full border border-[#AA87FF]/40 bg-white text-xs font-medium focus:outline-none focus:border-[#5000AF]"
                >
                  <option value="featured">Featured</option>
                  <option value="price-asc">Price: Low to High (CAD)</option>
                  <option value="price-desc">Price: High to Low (CAD)</option>
                  <option value="name">Name: A–Z</option>
                </select>
              </div>
            </div>
          </div>

          {/* Product Grid */}
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 pt-8">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-80 rounded-2xl bg-[#F3F0FF]/50 animate-pulse" />
              ))}
            </div>
          ) : sortedProducts.length === 0 ? (
            <div className="py-16 text-center">
              <h2 className="font-display text-2xl font-bold text-[#0E021E]">No matching products</h2>
              <p className="mt-2 text-sm text-[#0E021E]/65">
                Try clearing your search filter or exploring another collection.
              </p>
              <Link
                to="/shop"
                className="inline-block mt-5 px-6 py-2.5 rounded-full bg-[#5000AF] text-white text-xs font-semibold"
              >
                Reset Filters
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 pt-8">
              {sortedProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
};
