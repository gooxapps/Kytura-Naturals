import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Eye, ShoppingBag, Sparkles, X } from 'lucide-react';
import type { Product } from '../types';
import { formatCad, useStore } from '../context/StoreContext';

interface ProductCardProps {
  product: Product;
}

export const ResilientImage: React.FC<{
  src?: string;
  alt: string;
  className?: string;
}> = ({ src, alt, className = '' }) => {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  if (!src || failed) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-gradient-to-br from-[#F3F0FF] via-white to-[#AA87FF]/20 text-[#5000AF]/60 p-4 text-center ${className}`}
      >
        <Sparkles className="w-7 h-7 mb-1.5 text-[#5000AF]/50" />
        <span className="text-xs font-medium text-[#39008B]/70 line-clamp-2">{alt}</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={className}
    />
  );
};

export const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const { addToCart } = useStore();
  const [quickViewOpen, setQuickViewOpen] = useState(false);
  const [selectedVariantId, setSelectedVariantId] = useState<string | undefined>(
    product.variants[0]?.id
  );

  const primaryImage = product.images.find((i) => i.is_primary)?.image_url || product.images[0]?.image_url;
  const activeVariant =
    product.variants.find((v) => v.id === selectedVariantId) || product.variants[0];
  const displayPrice = activeVariant ? activeVariant.price_cad : product.retail_price_cad;
  const availableStock = activeVariant ? activeVariant.stock_quantity : product.stock_quantity;
  const inStock = availableStock > 0;

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!inStock) return;
    addToCart(
      {
        productId: product.id,
        variantId: activeVariant?.id,
        slug: product.slug,
        name: product.name,
        variantName: activeVariant?.name || '',
        priceCad: displayPrice,
        imageUrl: primaryImage || '',
        maxStock: availableStock,
      },
      1
    );
  };

  return (
    <>
      <article className="group bg-white rounded-2xl border border-[#AA87FF]/25 overflow-hidden flex flex-col transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-[#5000AF]/8">
        <div className="relative aspect-[4/3] bg-[#F3F0FF] overflow-hidden">
          <Link to={`/product/${product.slug}`} className="block w-full h-full">
            <ResilientImage
              src={primaryImage}
              alt={product.name}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          </Link>
          <button
            type="button"
            onClick={() => setQuickViewOpen(true)}
            aria-label={`Quick view ${product.name}`}
            className="absolute top-3 right-3 w-9 h-9 rounded-full bg-white/90 text-[#39008B] hover:bg-[#5000AF] hover:text-white flex items-center justify-center shadow-sm transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
          >
            <Eye className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 flex flex-col flex-1">
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-[#5000AF]/75 mb-1">
            <span className="truncate">{product.category_names?.[0] || 'Botanical Wellness'}</span>
            <span aria-hidden="true">·</span>
            <span className={inStock ? 'text-[#538710]' : 'text-[#B71C85]'}>
              {inStock ? 'In Stock' : 'Out of Stock'}
            </span>
          </div>

          <Link to={`/product/${product.slug}`} className="group-hover:text-[#5000AF] transition-colors">
            <h3 className="font-display text-lg font-semibold text-[#0E021E] leading-snug line-clamp-2">
              {product.name}
            </h3>
          </Link>

          <p className="mt-1.5 text-xs text-[#0E021E]/65 line-clamp-2 flex-1">
            {product.short_description}
          </p>

          <div className="mt-4 pt-3 border-t border-[#F3F0FF] flex items-center justify-between gap-2">
            <div className="flex items-baseline gap-2 tabular-nums">
              <span className="text-base font-bold text-[#39008B]">{formatCad(displayPrice)}</span>
              {product.compare_at_price_cad && product.compare_at_price_cad > displayPrice && (
                <span className="text-xs text-[#0E021E]/40 line-through">
                  {formatCad(product.compare_at_price_cad)}
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={handleQuickAdd}
              disabled={!inStock}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold bg-[#5000AF] text-white hover:bg-[#39008B] disabled:opacity-45 disabled:cursor-not-allowed transition-colors whitespace-nowrap shrink-0"
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              Add to Cart
            </button>
          </div>
        </div>
      </article>

      {quickViewOpen && (
        <div
          className="fixed inset-0 z-50 bg-[#0E021E]/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setQuickViewOpen(false)}
        >
          <div
            className="bg-white rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl grid grid-cols-1 md:grid-cols-2"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="aspect-square md:aspect-auto bg-[#F3F0FF]">
              <ResilientImage
                src={primaryImage}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="p-6 flex flex-col">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="text-xs font-medium text-[#5000AF]">
                    {product.category_names?.[0] || 'Kytura Naturals'}
                  </span>
                  <h3 className="font-display text-2xl font-bold text-[#0E021E] mt-0.5">
                    {product.name}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setQuickViewOpen(false)}
                  className="p-1.5 rounded-full hover:bg-[#F3F0FF] text-[#0E021E]/70"
                  aria-label="Close quick view"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <p className="mt-2 text-xl font-bold text-[#39008B] tabular-nums">
                {formatCad(displayPrice)}
              </p>

              <p className="mt-3 text-sm text-[#0E021E]/75 leading-relaxed">
                {product.description || product.short_description}
              </p>

              {product.variants.length > 0 && (
                <div className="mt-4">
                  <label className="block text-xs font-semibold text-[#0E021E]/80 mb-1.5">
                    Select Option
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {product.variants.map((v) => (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => setSelectedVariantId(v.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                          activeVariant?.id === v.id
                            ? 'bg-[#5000AF] text-white border-[#5000AF]'
                            : 'bg-white text-[#0E021E] border-[#AA87FF]/40 hover:border-[#5000AF]'
                        }`}
                      >
                        {v.name} · {formatCad(v.price_cad)}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-auto pt-6 flex flex-col gap-2.5">
                <button
                  type="button"
                  disabled={!inStock}
                  onClick={(e) => {
                    handleQuickAdd(e);
                    setQuickViewOpen(false);
                  }}
                  className="w-full py-2.5 px-5 rounded-full bg-[#5000AF] text-white text-sm font-semibold hover:bg-[#39008B] disabled:opacity-45 transition-colors"
                >
                  {inStock ? 'Add to Cart' : 'Currently Out of Stock'}
                </button>
                <Link
                  to={`/product/${product.slug}`}
                  onClick={() => setQuickViewOpen(false)}
                  className="w-full py-2.5 px-5 rounded-full border border-[#5000AF] text-[#5000AF] text-sm font-semibold text-center hover:bg-[#F3F0FF] transition-colors"
                >
                  View Full Details
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
