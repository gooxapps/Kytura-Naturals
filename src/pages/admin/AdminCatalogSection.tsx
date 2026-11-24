import React, { useState } from 'react';
import { Edit2, Plus, Trash2, Upload, X } from 'lucide-react';
import { formatCad } from '../../context/StoreContext';
import { ResilientImage } from '../../components/ProductCard';
import type { Category, Product } from '../../types';

interface AdminCatalogSectionProps {
  token: string;
  mode: 'products' | 'categories';
  products: Product[];
  categories: Category[];
  onRefresh: () => Promise<void>;
}

export const AdminCatalogSection: React.FC<AdminCatalogSectionProps> = ({
  token,
  mode,
  products,
  categories,
  onRefresh,
}) => {
  const [editingProduct, setEditingProduct] = useState<Partial<Product> & { image_url?: string } | null>(null);
  const [editingCategory, setEditingCategory] = useState<Partial<Category> | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  const handleImageUpload = async (
    file: File,
    bucket: string,
    onUrl: (url: string) => void
  ) => {
    setUploading(true);
    setStatusMsg('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('bucket', bucket);
      const res = await fetch('/api/admin/media', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) {
        setStatusMsg(data.error || 'Image upload failed.');
      } else {
        onUrl(data.asset.file_url);
      }
    } finally {
      setUploading(false);
    }
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    setSaving(true);
    setStatusMsg('');
    try {
      const isNew = !editingProduct.id;
      const url = isNew ? '/api/admin/products' : `/api/admin/products/${editingProduct.id}`;
      const res = await fetch(url, {
        method: isNew ? 'POST' : 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(editingProduct),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatusMsg(data.error || 'Failed to save product.');
      } else {
        setEditingProduct(null);
        await onRefresh();
        setStatusMsg('Product saved.');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    const res = await fetch(`/api/admin/products/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      await onRefresh();
      setStatusMsg('Product deleted.');
    }
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory) return;
    setSaving(true);
    setStatusMsg('');
    try {
      const isNew = !editingCategory.id;
      const url = isNew
        ? '/api/admin/categories'
        : `/api/admin/categories/${editingCategory.id}`;
      const res = await fetch(url, {
        method: isNew ? 'POST' : 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(editingCategory),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatusMsg(data.error || 'Failed to save category.');
      } else {
        setEditingCategory(null);
        await onRefresh();
        setStatusMsg('Category saved.');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    const res = await fetch(`/api/admin/categories/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      await onRefresh();
      setStatusMsg('Category deleted.');
    }
  };

  if (mode === 'categories') {
    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-2xl font-bold text-[#0E021E]">Categories &amp; Collections</h2>
            <p className="text-xs text-[#0E021E]/65">
              Control collection titles, descriptions, imagery, and display order.
            </p>
          </div>
          <button
            type="button"
            onClick={() =>
              setEditingCategory({
                name: '',
                description: '',
                image_url: '',
                display_order: categories.length + 1,
                is_visible: true,
              })
            }
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#5000AF] text-white text-xs font-semibold hover:bg-[#39008B]"
          >
            <Plus className="w-4 h-4" />
            New Category
          </button>
        </div>

        {statusMsg && (
          <div className="p-3 rounded-xl bg-[#F3F0FF] text-xs font-semibold text-[#39008B]">
            {statusMsg}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {categories.map((cat) => (
            <div
              key={cat.id}
              className="bg-white rounded-xl border border-[#AA87FF]/25 p-4 flex items-center gap-4"
            >
              <div className="w-20 h-16 rounded-lg overflow-hidden bg-[#F3F0FF] shrink-0">
                <ResilientImage src={cat.image_url} alt={cat.name} className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-sm text-[#0E021E] truncate">{cat.name}</h3>
                  <span className="text-[11px] text-[#0E021E]/55 tabular-nums">
                    Order #{cat.display_order}
                  </span>
                </div>
                <p className="text-xs text-[#0E021E]/65 line-clamp-1 mt-0.5">{cat.description}</p>
                <span className="text-[11px] font-medium text-[#538710]">
                  {cat.is_visible ? 'Visible' : 'Hidden'}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setEditingCategory(cat)}
                  className="p-2 rounded-lg hover:bg-[#F3F0FF] text-[#39008B]"
                  aria-label={`Edit ${cat.name}`}
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteCategory(cat.id)}
                  className="p-2 rounded-lg hover:bg-[#B71C85]/10 text-[#B71C85]"
                  aria-label={`Delete ${cat.name}`}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {editingCategory && (
          <div className="fixed inset-0 z-50 bg-[#0E021E]/50 flex items-center justify-center p-4">
            <form
              onSubmit={handleSaveCategory}
              className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-display text-xl font-bold">
                  {editingCategory.id ? 'Edit Category' : 'New Category'}
                </h3>
                <button type="button" onClick={() => setEditingCategory(null)}>
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Name *</label>
                <input
                  type="text"
                  required
                  value={editingCategory.name || ''}
                  onChange={(e) => setEditingCategory({ ...editingCategory, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-[#AA87FF]/45 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Description</label>
                <textarea
                  rows={2}
                  value={editingCategory.description || ''}
                  onChange={(e) =>
                    setEditingCategory({ ...editingCategory, description: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-[#AA87FF]/45 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Image URL or Upload</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={editingCategory.image_url || ''}
                    onChange={(e) =>
                      setEditingCategory({ ...editingCategory, image_url: e.target.value })
                    }
                    className="flex-1 px-3 py-2 rounded-xl border border-[#AA87FF]/45 text-xs"
                  />
                  <label className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#F3F0FF] text-[#39008B] text-xs font-semibold cursor-pointer">
                    <Upload className="w-3.5 h-3.5" />
                    {uploading ? '...' : 'Upload'}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/avif"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) {
                          handleImageUpload(f, 'category-images', (url) =>
                            setEditingCategory((prev) => ({ ...prev, image_url: url }))
                          );
                        }
                      }}
                    />
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold mb-1">Display Order</label>
                  <input
                    type="number"
                    value={editingCategory.display_order ?? 0}
                    onChange={(e) =>
                      setEditingCategory({
                        ...editingCategory,
                        display_order: Number(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-[#AA87FF]/45 text-sm tabular-nums"
                  />
                </div>
                <label className="flex items-center gap-2 text-xs font-semibold mt-5">
                  <input
                    type="checkbox"
                    checked={editingCategory.is_visible ?? true}
                    onChange={(e) =>
                      setEditingCategory({ ...editingCategory, is_visible: e.target.checked })
                    }
                  />
                  Visible on storefront
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingCategory(null)}
                  className="px-4 py-2 rounded-full border text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-full bg-[#5000AF] text-white text-xs font-semibold"
                >
                  {saving ? 'Saving...' : 'Save Category'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-bold text-[#0E021E]">Product Management</h2>
          <p className="text-xs text-[#0E021E]/65">
            Create, edit, publish, upload product images, and manage CAD pricing and variants.
          </p>
        </div>
        <button
          type="button"
          onClick={() =>
            setEditingProduct({
              name: '',
              sku: '',
              short_description: '',
              description: '',
              retail_price_cad: 0,
              compare_at_price_cad: null,
              stock_quantity: 20,
              is_published: true,
              is_featured: false,
              category_ids: categories[0] ? [categories[0].id] : [],
              image_url: '',
              variants: [],
            })
          }
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#5000AF] text-white text-xs font-semibold hover:bg-[#39008B]"
        >
          <Plus className="w-4 h-4" />
          Add Product
        </button>
      </div>

      {statusMsg && (
        <div className="p-3 rounded-xl bg-[#F3F0FF] text-xs font-semibold text-[#39008B]">
          {statusMsg}
        </div>
      )}

      <div className="bg-white rounded-xl border border-[#AA87FF]/25 overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-[#F3F0FF]/70 text-[#39008B] font-semibold">
            <tr>
              <th className="px-4 py-3">Product</th>
              <th className="px-4 py-3">SKU</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3 text-right">Retail (CAD)</th>
              <th className="px-4 py-3 text-right">Stock</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F3F0FF]">
            {products.map((p) => (
              <tr key={p.id} className="hover:bg-[#F3F0FF]/30">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg overflow-hidden bg-[#F3F0FF] shrink-0">
                      <ResilientImage
                        src={p.images[0]?.image_url}
                        alt={p.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div>
                      <span className="font-semibold text-[#0E021E] block">{p.name}</span>
                      {p.is_featured && (
                        <span className="text-[10px] text-[#5000AF] font-semibold">Featured</span>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 font-mono text-[#0E021E]/70">{p.sku}</td>
                <td className="px-4 py-3 text-[#0E021E]/75">
                  {p.category_names?.join(', ') || '—'}
                </td>
                <td className="px-4 py-3 text-right font-bold text-[#39008B] tabular-nums">
                  {formatCad(p.retail_price_cad)}
                </td>
                <td className="px-4 py-3 text-right tabular-nums">{p.stock_quantity}</td>
                <td className="px-4 py-3">
                  <span
                    className={`font-semibold ${
                      p.is_published ? 'text-[#538710]' : 'text-[#0E021E]/45'
                    }`}
                  >
                    {p.is_published ? 'Published' : 'Draft'}
                  </span>
                </td>
                <td className="px-4 py-3 text-right whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() =>
                      setEditingProduct({
                        ...p,
                        image_url: p.images[0]?.image_url || '',
                      })
                    }
                    className="p-1.5 rounded-lg hover:bg-[#F3F0FF] text-[#39008B]"
                    aria-label={`Edit ${p.name}`}
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteProduct(p.id)}
                    className="p-1.5 rounded-lg hover:bg-[#B71C85]/10 text-[#B71C85] ml-1"
                    aria-label={`Delete ${p.name}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Product Modal */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 bg-[#0E021E]/55 flex items-center justify-center p-4 overflow-y-auto">
          <form
            onSubmit={handleSaveProduct}
            className="bg-white rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-2xl my-8 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-display text-xl font-bold">
                {editingProduct.id ? 'Edit Product' : 'Create Product'}
              </h3>
              <button type="button" onClick={() => setEditingProduct(null)}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold mb-1">Product Name *</label>
                <input
                  type="text"
                  required
                  value={editingProduct.name || ''}
                  onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-[#AA87FF]/45 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">SKU</label>
                <input
                  type="text"
                  value={editingProduct.sku || ''}
                  onChange={(e) => setEditingProduct({ ...editingProduct, sku: e.target.value })}
                  placeholder="Auto-generated if empty"
                  className="w-full px-3 py-2 rounded-xl border border-[#AA87FF]/45 text-sm font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold mb-1">Retail Price (CAD) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={editingProduct.retail_price_cad ?? 0}
                  onChange={(e) =>
                    setEditingProduct({
                      ...editingProduct,
                      retail_price_cad: Number(e.target.value),
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-[#AA87FF]/45 text-sm tabular-nums"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Compare At (CAD)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={editingProduct.compare_at_price_cad ?? ''}
                  onChange={(e) =>
                    setEditingProduct({
                      ...editingProduct,
                      compare_at_price_cad: e.target.value ? Number(e.target.value) : null,
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-[#AA87FF]/45 text-sm tabular-nums"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Stock Quantity</label>
                <input
                  type="number"
                  min="0"
                  value={editingProduct.stock_quantity ?? 0}
                  onChange={(e) =>
                    setEditingProduct({
                      ...editingProduct,
                      stock_quantity: Number(e.target.value),
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-[#AA87FF]/45 text-sm tabular-nums"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">Category</label>
              <select
                value={editingProduct.category_ids?.[0] || ''}
                onChange={(e) =>
                  setEditingProduct({
                    ...editingProduct,
                    category_ids: e.target.value ? [e.target.value] : [],
                  })
                }
                className="w-full px-3 py-2 rounded-xl border border-[#AA87FF]/45 bg-white text-sm"
              >
                <option value="">Select category...</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">Product Image URL or Upload</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={editingProduct.image_url || ''}
                  onChange={(e) =>
                    setEditingProduct({ ...editingProduct, image_url: e.target.value })
                  }
                  className="flex-1 px-3 py-2 rounded-xl border border-[#AA87FF]/45 text-xs"
                />
                <label className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#F3F0FF] text-[#39008B] text-xs font-semibold cursor-pointer">
                  <Upload className="w-3.5 h-3.5" />
                  {uploading ? '...' : 'Upload'}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/avif"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) {
                        handleImageUpload(f, 'product-images', (url) =>
                          setEditingProduct((prev) => ({ ...prev, image_url: url }))
                        );
                      }
                    }}
                  />
                </label>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">Short Summary</label>
              <input
                type="text"
                value={editingProduct.short_description || ''}
                onChange={(e) =>
                  setEditingProduct({ ...editingProduct, short_description: e.target.value })
                }
                className="w-full px-3 py-2 rounded-xl border border-[#AA87FF]/45 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">Full Description</label>
              <textarea
                rows={3}
                value={editingProduct.description || ''}
                onChange={(e) =>
                  setEditingProduct({ ...editingProduct, description: e.target.value })
                }
                className="w-full px-3 py-2 rounded-xl border border-[#AA87FF]/45 text-sm"
              />
            </div>

            {/* Variants Editor */}
            <div className="border-t border-[#F3F0FF] pt-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#39008B]">Product Variants (Optional)</span>
                <button
                  type="button"
                  onClick={() =>
                    setEditingProduct({
                      ...editingProduct,
                      variants: [
                        ...(editingProduct.variants || []),
                        {
                          id: '',
                          product_id: editingProduct.id || '',
                          name: '',
                          sku: '',
                          price_cad: editingProduct.retail_price_cad || 0,
                          stock_quantity: 10,
                          is_available: true,
                          display_order: (editingProduct.variants || []).length,
                        },
                      ],
                    })
                  }
                  className="text-xs font-semibold text-[#5000AF] hover:underline"
                >
                  + Add Variant
                </button>
              </div>
              {(editingProduct.variants || []).map((v, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                  <input
                    type="text"
                    placeholder="Size / Option"
                    value={v.name}
                    onChange={(e) => {
                      const next = [...(editingProduct.variants || [])];
                      next[idx] = { ...next[idx], name: e.target.value };
                      setEditingProduct({ ...editingProduct, variants: next });
                    }}
                    className="col-span-5 px-2.5 py-1.5 rounded-lg border text-xs"
                  />
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Price CAD"
                    value={v.price_cad}
                    onChange={(e) => {
                      const next = [...(editingProduct.variants || [])];
                      next[idx] = { ...next[idx], price_cad: Number(e.target.value) };
                      setEditingProduct({ ...editingProduct, variants: next });
                    }}
                    className="col-span-3 px-2.5 py-1.5 rounded-lg border text-xs tabular-nums"
                  />
                  <input
                    type="number"
                    placeholder="Stock"
                    value={v.stock_quantity}
                    onChange={(e) => {
                      const next = [...(editingProduct.variants || [])];
                      next[idx] = { ...next[idx], stock_quantity: Number(e.target.value) };
                      setEditingProduct({ ...editingProduct, variants: next });
                    }}
                    className="col-span-3 px-2.5 py-1.5 rounded-lg border text-xs tabular-nums"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const next = [...(editingProduct.variants || [])];
                      next.splice(idx, 1);
                      setEditingProduct({ ...editingProduct, variants: next });
                    }}
                    className="col-span-1 text-[#B71C85] flex justify-center"
                    aria-label="Remove variant"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-6 pt-2">
              <label className="flex items-center gap-2 text-xs font-semibold">
                <input
                  type="checkbox"
                  checked={editingProduct.is_published ?? true}
                  onChange={(e) =>
                    setEditingProduct({ ...editingProduct, is_published: e.target.checked })
                  }
                />
                Published on storefront
              </label>
              <label className="flex items-center gap-2 text-xs font-semibold">
                <input
                  type="checkbox"
                  checked={editingProduct.is_featured ?? false}
                  onChange={(e) =>
                    setEditingProduct({ ...editingProduct, is_featured: e.target.checked })
                  }
                />
                Featured on homepage
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-[#F3F0FF]">
              <button
                type="button"
                onClick={() => setEditingProduct(null)}
                className="px-4 py-2 rounded-full border text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2 rounded-full bg-[#5000AF] text-white text-xs font-semibold"
              >
                {saving ? 'Saving...' : 'Save Product'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
