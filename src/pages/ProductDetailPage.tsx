import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Check, MessageCircle, Minus, Plus, ShoppingBag } from 'lucide-react';
import { formatCad, formatWhatsappHref, useStore } from '../context/StoreContext';
import { ResilientImage } from '../components/ProductCard';
import { SEOHead } from '../components/SEOHead';
import type { Product } from '../types';

export const ProductDetailPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const { addToCart, settings } = useStore();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedVariantId, setSelectedVariantId] = useState<string | undefined>(undefined);
  const [selectedImage, setSelectedImage] = useState<string>('');
  const [quantity, setQuantity] = useState(1);
  const [addedFeedback, setAddedFeedback] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetch(`/api/public/products/${slug}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!active) return;
        if (data?.product) {
          setProduct(data.product);
          setSelectedVariantId(data.product.variants?.[0]?.id);
          const primary =
            data.product.images?.find((i: { is_primary: boolean }) => i.is_primary)?.image_url ||
            data.product.images?.[0]?.image_url ||
            '';
          setSelectedImage(primary);
        } else {
          setProduct(null);
        }
      })
      .catch(() => setProduct(null))
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [slug]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 grid grid-cols-1 lg:grid-cols-2 gap-10">
        <div className="aspect-square rounded-2xl bg-[#F3F0FF] animate-pulse" />
        <div className="space-y-4">
          <div className="h-8 w-2/3 bg-[#F3F0FF] rounded animate-pulse" />
          <div className="h-6 w-1/3 bg-[#F3F0FF] rounded animate-pulse" />
          <div className="h-32 w-full bg-[#F3F0FF] rounded animate-pulse" />
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-20 text-center">
        <h1 className="font-display text-3xl font-bold text-[#0E021E]">Product Not Found</h1>
        <p className="mt-2 text-sm text-[#0E021E]/70">
          This product may have been unpublished or moved.
        </p>
        <Link
          to="/shop"
          className="inline-flex items-center gap-2 mt-6 px-6 py-2.5 rounded-full bg-[#5000AF] text-white text-sm font-semibold"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Shop
        </Link>
      </div>
    );
  }

  const activeVariant =
    product.variants.find((v) => v.id === selectedVariantId) || product.variants[0];
  const priceCad = activeVariant ? activeVariant.price_cad : product.retail_price_cad;
  const stock = activeVariant ? activeVariant.stock_quantity : product.stock_quantity;
  const inStock = stock > 0;

  const handleAdd = () => {
    if (!inStock) return;
    addToCart(
      {
        productId: product.id,
        variantId: activeVariant?.id,
        slug: product.slug,
        name: product.name,
        variantName: activeVariant?.name || '',
        priceCad,
        imageUrl: selectedImage,
        maxStock: stock,
      },
      quantity
    );
    setAddedFeedback(true);
    setTimeout(() => setAddedFeedback(false), 1800);
  };

  const waQuestionUrl = formatWhatsappHref(
    settings.whatsapp_number,
    `Hello Kytura Naturals, I have a question about ${product.name}${activeVariant ? ` (${activeVariant.name})` : ''}.`
  );

  return (
    <>
      <SEOHead
        title={product.seo_title || `${product.name} | ${settings.business_name}`}
        description={product.seo_description || product.short_description}
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'Product',
          name: product.name,
          description: product.description || product.short_description,
          sku: activeVariant?.sku || product.sku,
          offers: {
            '@type': 'Offer',
            priceCurrency: 'CAD',
            price: priceCad.toFixed(2),
            availability: inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
          },
        }}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div className="mb-6 flex items-center gap-2 text-xs text-[#0E021E]/65">
          <Link to="/" className="hover:text-[#5000AF]">
            Home
          </Link>
          <span>/</span>
          <Link to="/shop" className="hover:text-[#5000AF]">
            Shop
          </Link>
          <span>/</span>
          <span className="text-[#0E021E] font-medium truncate">{product.name}</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          {/* Left: Product Gallery */}
          <div className="lg:col-span-6 space-y-3">
            <div className="aspect-[4/3] rounded-2xl overflow-hidden bg-[#F3F0FF] border border-[#AA87FF]/20">
              <ResilientImage
                src={selectedImage}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            </div>
            {product.images.length > 1 && (
              <div className="flex gap-3 overflow-x-auto pb-1">
                {product.images.map((img) => (
                  <button
                    key={img.id}
                    type="button"
                    onClick={() => setSelectedImage(img.image_url)}
                    className={`w-20 h-20 rounded-xl overflow-hidden border-2 shrink-0 ${
                      selectedImage === img.image_url
                        ? 'border-[#5000AF]'
                        : 'border-transparent opacity-70 hover:opacity-100'
                    }`}
                  >
                    <ResilientImage
                      src={img.image_url}
                      alt={img.alt_text || product.name}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right: Contiguous Purchase Module */}
          <div className="lg:col-span-6 bg-white rounded-2xl border border-[#AA87FF]/25 p-6 sm:p-8">
            <div className="flex items-center gap-2 text-xs font-medium text-[#5000AF]">
              <span>{product.category_names?.[0] || 'Kytura Naturals'}</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono text-[#0E021E]/55">
                SKU {activeVariant?.sku || product.sku}
              </span>
            </div>

            <h1 className="mt-2 font-display text-3xl sm:text-4xl font-bold text-[#0E021E] leading-tight">
              {product.name}
            </h1>

            <div className="mt-4 flex items-baseline gap-3 tabular-nums">
              <span className="text-2xl font-bold text-[#39008B]">{formatCad(priceCad)}</span>
              {product.compare_at_price_cad && product.compare_at_price_cad > priceCad && (
                <span className="text-sm text-[#0E021E]/45 line-through">
                  {formatCad(product.compare_at_price_cad)}
                </span>
              )}
              <span
                className={`text-xs font-semibold ${
                  inStock ? 'text-[#538710]' : 'text-[#B71C85]'
                }`}
              >
                {inStock ? `In Stock (${stock} available)` : 'Out of Stock'}
              </span>
            </div>

            <p className="mt-4 text-sm sm:text-base text-[#0E021E]/75 leading-relaxed">
              {product.description || product.short_description}
            </p>

            {/* Variants */}
            {product.variants.length > 0 && (
              <div className="mt-6">
                <span className="block text-xs font-semibold text-[#0E021E]/80 mb-2">
                  Select Option
                </span>
                <div className="flex flex-wrap gap-2.5">
                  {product.variants.map((v) => (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => setSelectedVariantId(v.id)}
                      className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-colors ${
                        activeVariant?.id === v.id
                          ? 'bg-[#5000AF] text-white border-[#5000AF]'
                          : 'bg-white text-[#0E021E] border-[#AA87FF]/45 hover:border-[#5000AF]'
                      }`}
                    >
                      {v.name} — {formatCad(v.price_cad)}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Quantity + Add to Cart */}
            <div className="mt-6 pt-6 border-t border-[#F3F0FF] flex flex-wrap items-center gap-4">
              <div className="inline-flex items-center border border-[#AA87FF]/50 rounded-full">
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="w-10 h-10 flex items-center justify-center text-[#39008B] hover:bg-[#F3F0FF] rounded-l-full"
                  aria-label="Decrease quantity"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="px-4 text-sm font-bold tabular-nums">{quantity}</span>
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.min(Math.max(1, stock), q + 1))}
                  className="w-10 h-10 flex items-center justify-center text-[#39008B] hover:bg-[#F3F0FF] rounded-r-full"
                  aria-label="Increase quantity"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              <button
                type="button"
                disabled={!inStock}
                onClick={handleAdd}
                className="flex-1 min-w-[200px] inline-flex items-center justify-center gap-2 py-3 px-6 rounded-full bg-[#5000AF] text-white text-sm font-semibold hover:bg-[#39008B] disabled:opacity-45 transition-colors"
              >
                {addedFeedback ? (
                  <>
                    <Check className="w-4 h-4" />
                    Added to Cart
                  </>
                ) : (
                  <>
                    <ShoppingBag className="w-4 h-4" />
                    Add to Cart · {formatCad(priceCad * quantity)}
                  </>
                )}
              </button>
            </div>

            <div className="mt-5 pt-5 border-t border-[#F3F0FF] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-[#0E021E]/70">
              <span>Orders are confirmed directly via WhatsApp.</span>
              <a
                href={waQuestionUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 font-semibold text-[#538710] hover:underline"
              >
                <MessageCircle className="w-4 h-4" />
                Ask about this product on WhatsApp
              </a>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
