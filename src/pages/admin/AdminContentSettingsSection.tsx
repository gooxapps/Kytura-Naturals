import React, { useState } from 'react';
import { Check, Copy, Plus, Trash2, Upload, X } from 'lucide-react';
import { ResilientImage } from '../../components/ProductCard';
import { MediaPickerInput } from '../../components/admin/MediaPickerInput';
import type {
  ActivityLog,
  AdminRole,
  AdminUser,
  HomepageSection,
  MediaAsset,
  PageContent,
  SiteSettings,
  Testimonial,
} from '../../types';

interface AdminContentSettingsProps {
  token: string;
  mode:
    | 'homepage'
    | 'media'
    | 'pages'
    | 'testimonials'
    | 'settings'
    | 'users'
    | 'logs';
  sections: HomepageSection[];
  media: MediaAsset[];
  pages: PageContent[];
  testimonials: Testimonial[];
  settings: SiteSettings;
  adminUsers: AdminUser[];
  logs: ActivityLog[];
  onRefresh: () => Promise<void>;
  onRefreshStorefront: () => Promise<void>;
}

export const AdminContentSettingsSection: React.FC<AdminContentSettingsProps> = ({
  token,
  mode,
  sections,
  media,
  pages,
  testimonials,
  settings,
  adminUsers,
  logs,
  onRefresh,
  onRefreshStorefront,
}) => {
  const [msg, setMsg] = useState('');
  const [copiedId, setCopiedId] = useState('');

  // Local editable state copies
  const [editingSection, setEditingSection] = useState<HomepageSection | null>(null);
  const [editingPage, setEditingPage] = useState<PageContent | null>(null);
  const [settingsForm, setSettingsForm] = useState<SiteSettings>(settings);
  const [newTestimonial, setNewTestimonial] = useState({
    customer_name: '',
    location: '',
    quote: '',
    rating: 5,
    avatar_url: '',
    is_approved: true,
    is_published: true,
  });
  const [newAdminUser, setNewAdminUser] = useState({
    full_name: '',
    email: '',
    password: '',
    role: 'store_manager' as AdminRole,
  });

  // Sync settings form when settings prop updates
  React.useEffect(() => {
    setSettingsForm(settings);
  }, [settings]);

  const handleUploadMedia = async (file: File, bucket = 'media-library') => {
    setMsg('');
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
      setMsg(data.error || 'Upload failed.');
    } else {
      await onRefresh();
      setMsg(`Uploaded ${data.asset.file_name}`);
    }
  };

  if (mode === 'homepage') {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="font-display text-2xl font-bold text-[#0E021E]">Homepage Editor</h2>
          <p className="text-xs text-[#0E021E]/65">
            Edit hero copy, imagery, benefits strip, brand story, wholesale callout, and enable or disable homepage sections.
          </p>
        </div>

        {msg && <div className="p-3 rounded-xl bg-[#F3F0FF] text-xs font-semibold text-[#39008B]">{msg}</div>}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sections.map((sec) => (
            <div
              key={sec.id}
              className="bg-white rounded-xl border border-[#AA87FF]/25 p-5 flex flex-col justify-between gap-3"
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-mono uppercase text-[#5000AF] font-bold">
                    {sec.section_key}
                  </span>
                  <span
                    className={`text-[11px] font-semibold ${
                      sec.is_enabled ? 'text-[#538710]' : 'text-[#0E021E]/45'
                    }`}
                  >
                    {sec.is_enabled ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
                <h3 className="font-display text-lg font-bold text-[#0E021E] mt-1">
                  {sec.title || sec.section_key}
                </h3>
                {sec.subtitle && (
                  <p className="text-xs text-[#0E021E]/70 line-clamp-2 mt-1">{sec.subtitle}</p>
                )}
              </div>

              <button
                type="button"
                onClick={() => setEditingSection(sec)}
                className="self-start px-4 py-1.5 rounded-full bg-[#F3F0FF] text-[#5000AF] text-xs font-semibold hover:bg-[#5000AF] hover:text-white transition-colors"
              >
                Edit Section
              </button>
            </div>
          ))}
        </div>

        {editingSection && (
          <div className="fixed inset-0 z-50 bg-[#0E021E]/55 flex items-center justify-center p-4 overflow-y-auto">
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const res = await fetch(`/api/admin/homepage/${editingSection.section_key}`, {
                  method: 'PUT',
                  headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                  },
                  body: JSON.stringify(editingSection),
                });
                if (res.ok) {
                  setEditingSection(null);
                  await Promise.all([onRefresh(), onRefreshStorefront()]);
                  setMsg('Homepage section updated live.');
                }
              }}
              className="bg-white rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-display text-xl font-bold capitalize">
                  Edit {editingSection.section_key.replace(/_/g, ' ')}
                </h3>
                <button type="button" onClick={() => setEditingSection(null)}>
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Heading / Title</label>
                <textarea
                  rows={2}
                  value={editingSection.title}
                  onChange={(e) => setEditingSection({ ...editingSection, title: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-[#AA87FF]/45 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Subtitle</label>
                <textarea
                  rows={2}
                  value={editingSection.subtitle}
                  onChange={(e) =>
                    setEditingSection({ ...editingSection, subtitle: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-[#AA87FF]/45 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Body Copy (Optional)</label>
                <textarea
                  rows={3}
                  value={editingSection.body || ''}
                  onChange={(e) =>
                    setEditingSection({ ...editingSection, body: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-[#AA87FF]/45 text-sm"
                />
              </div>

              {editingSection.section_key === 'benefits' && (
                <div className="space-y-2 border-t border-[#F3F0FF] pt-3">
                  <span className="block text-xs font-bold text-[#39008B]">Benefits Items</span>
                  {((editingSection.extra_json?.items as Array<{
                    icon: string;
                    title: string;
                    subtitle: string;
                  }>) || []).map((item, idx) => (
                    <div key={idx} className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={item.title}
                        onChange={(e) => {
                          const items = [
                            ...((editingSection.extra_json?.items as Array<{
                              icon: string;
                              title: string;
                              subtitle: string;
                            }>) || []),
                          ];
                          items[idx] = { ...items[idx], title: e.target.value };
                          setEditingSection({
                            ...editingSection,
                            extra_json: { ...editingSection.extra_json, items },
                          });
                        }}
                        className="px-3 py-1.5 rounded-lg border text-xs"
                      />
                      <input
                        type="text"
                        value={item.subtitle}
                        onChange={(e) => {
                          const items = [
                            ...((editingSection.extra_json?.items as Array<{
                              icon: string;
                              title: string;
                              subtitle: string;
                            }>) || []),
                          ];
                          items[idx] = { ...items[idx], subtitle: e.target.value };
                          setEditingSection({
                            ...editingSection,
                            extra_json: { ...editingSection.extra_json, items },
                          });
                        }}
                        className="px-3 py-1.5 rounded-lg border text-xs"
                      />
                    </div>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1">Primary CTA Label</label>
                  <input
                    type="text"
                    value={editingSection.cta_primary_label || ''}
                    onChange={(e) =>
                      setEditingSection({ ...editingSection, cta_primary_label: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-[#AA87FF]/45 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Primary CTA Link</label>
                  <input
                    type="text"
                    value={editingSection.cta_primary_href || ''}
                    onChange={(e) =>
                      setEditingSection({ ...editingSection, cta_primary_href: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-[#AA87FF]/45 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1">Secondary CTA Label</label>
                  <input
                    type="text"
                    value={editingSection.cta_secondary_label || ''}
                    onChange={(e) =>
                      setEditingSection({ ...editingSection, cta_secondary_label: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-[#AA87FF]/45 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Secondary CTA Link</label>
                  <input
                    type="text"
                    value={editingSection.cta_secondary_href || ''}
                    onChange={(e) =>
                      setEditingSection({ ...editingSection, cta_secondary_href: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-[#AA87FF]/45 text-xs"
                  />
                </div>
              </div>

              <MediaPickerInput
                label="Section Image (URL, Upload, or Media Library)"
                value={editingSection.image_url || ''}
                onChange={(url) =>
                  setEditingSection((prev) => (prev ? { ...prev, image_url: url } : prev))
                }
                token={token}
                media={media}
                onMediaUploaded={onRefresh}
                bucket="homepage-banners"
                previewContain={false}
              />

              <label className="flex items-center gap-2 text-xs font-semibold">
                <input
                  type="checkbox"
                  checked={editingSection.is_enabled}
                  onChange={(e) =>
                    setEditingSection({ ...editingSection, is_enabled: e.target.checked })
                  }
                />
                Section visible on homepage
              </label>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingSection(null)}
                  className="px-4 py-2 rounded-full border text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-full bg-[#5000AF] text-white text-xs font-semibold"
                >
                  Save Section
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    );
  }

  if (mode === 'media') {
    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-2xl font-bold text-[#0E021E]">Media Library</h2>
            <p className="text-xs text-[#0E021E]/65">
              Upload validated JPG, PNG, WebP, AVIF, or ICO images (max 5 MB) for logos, favicons, products, categories, and banners.
            </p>
          </div>
          <label className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#5000AF] text-white text-xs font-semibold cursor-pointer hover:bg-[#39008B]">
            <Upload className="w-4 h-4" />
            Upload Image
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif,.ico,image/x-icon,image/vnd.microsoft.icon"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleUploadMedia(f);
              }}
            />
          </label>
        </div>

        {msg && <div className="p-3 rounded-xl bg-[#F3F0FF] text-xs font-semibold text-[#39008B]">{msg}</div>}

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {media.map((m) => (
            <div
              key={m.id}
              className="bg-white rounded-xl border border-[#AA87FF]/25 overflow-hidden flex flex-col"
            >
              <div className="aspect-[4/3] bg-[#F3F0FF]">
                <ResilientImage
                  src={m.file_url}
                  alt={m.alt_text || m.file_name}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-3 text-xs space-y-2">
                <p className="font-semibold text-[#0E021E] truncate">{m.file_name}</p>
                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard?.writeText(m.file_url);
                      setCopiedId(m.id);
                      setTimeout(() => setCopiedId(''), 1500);
                    }}
                    className="inline-flex items-center gap-1 text-[#5000AF] font-semibold"
                  >
                    {copiedId === m.id ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedId === m.id ? 'Copied' : 'Copy URL'}
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      await fetch(`/api/admin/media/${m.id}`, {
                        method: 'DELETE',
                        headers: { Authorization: `Bearer ${token}` },
                      });
                      await onRefresh();
                    }}
                    className="text-[#B71C85] hover:opacity-80"
                    aria-label={`Delete ${m.file_name}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (mode === 'pages') {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="font-display text-2xl font-bold text-[#0E021E]">Pages &amp; Content</h2>
          <p className="text-xs text-[#0E021E]/65">
            Edit About Us, FAQ items, Contact details, and policy pages.
          </p>
        </div>

        {msg && <div className="p-3 rounded-xl bg-[#F3F0FF] text-xs font-semibold text-[#39008B]">{msg}</div>}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {pages.map((pg) => (
            <div
              key={pg.id}
              className="bg-white rounded-xl border border-[#AA87FF]/25 p-5 flex items-center justify-between gap-4"
            >
              <div>
                <span className="font-mono text-[11px] text-[#5000AF]">/{pg.slug}</span>
                <h3 className="font-display text-lg font-bold text-[#0E021E]">{pg.title}</h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingPage(pg)}
                className="px-4 py-1.5 rounded-full bg-[#F3F0FF] text-[#5000AF] text-xs font-semibold"
              >
                Edit Page
              </button>
            </div>
          ))}
        </div>

        {editingPage && (
          <div className="fixed inset-0 z-50 bg-[#0E021E]/55 flex items-center justify-center p-4 overflow-y-auto">
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const res = await fetch(`/api/admin/pages/${editingPage.slug}`, {
                  method: 'PUT',
                  headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                  },
                  body: JSON.stringify(editingPage),
                });
                if (res.ok) {
                  setEditingPage(null);
                  await onRefresh();
                  setMsg(`Saved /${editingPage.slug} content.`);
                }
              }}
              className="bg-white rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-display text-xl font-bold">Edit {editingPage.title}</h3>
                <button type="button" onClick={() => setEditingPage(null)}>
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Page Title</label>
                <input
                  type="text"
                  required
                  value={editingPage.title}
                  onChange={(e) => setEditingPage({ ...editingPage, title: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Subtitle</label>
                <input
                  type="text"
                  value={editingPage.subtitle}
                  onChange={(e) => setEditingPage({ ...editingPage, subtitle: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Body Content</label>
                <textarea
                  rows={8}
                  value={editingPage.content_markdown}
                  onChange={(e) =>
                    setEditingPage({ ...editingPage, content_markdown: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl border text-sm"
                />
              </div>

              {editingPage.slug === 'faq' && (
                <div className="space-y-2 border-t pt-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#39008B]">FAQ Items</span>
                    <button
                      type="button"
                      onClick={() => {
                        const faqs = [
                          ...((editingPage.extra_json?.faqs as Array<{ q: string; a: string }>) || []),
                          { q: '', a: '' },
                        ];
                        setEditingPage({
                          ...editingPage,
                          extra_json: { ...editingPage.extra_json, faqs },
                        });
                      }}
                      className="text-xs font-semibold text-[#5000AF]"
                    >
                      + Add Question
                    </button>
                  </div>
                  {((editingPage.extra_json?.faqs as Array<{ q: string; a: string }>) || []).map(
                    (f, idx) => (
                      <div key={idx} className="p-3 rounded-xl bg-[#F3F0FF]/50 space-y-2">
                        <input
                          type="text"
                          placeholder="Question"
                          value={f.q}
                          onChange={(e) => {
                            const faqs = [
                              ...((editingPage.extra_json?.faqs as Array<{ q: string; a: string }>) ||
                                []),
                            ];
                            faqs[idx] = { ...faqs[idx], q: e.target.value };
                            setEditingPage({
                              ...editingPage,
                              extra_json: { ...editingPage.extra_json, faqs },
                            });
                          }}
                          className="w-full px-3 py-1.5 rounded-lg border bg-white text-xs font-semibold"
                        />
                        <textarea
                          rows={2}
                          placeholder="Answer"
                          value={f.a}
                          onChange={(e) => {
                            const faqs = [
                              ...((editingPage.extra_json?.faqs as Array<{ q: string; a: string }>) ||
                                []),
                            ];
                            faqs[idx] = { ...faqs[idx], a: e.target.value };
                            setEditingPage({
                              ...editingPage,
                              extra_json: { ...editingPage.extra_json, faqs },
                            });
                          }}
                          className="w-full px-3 py-1.5 rounded-lg border bg-white text-xs"
                        />
                      </div>
                    )
                  )}
                </div>
              )}

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingPage(null)}
                  className="px-4 py-2 rounded-full border text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-full bg-[#5000AF] text-white text-xs font-semibold"
                >
                  Save Page
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    );
  }

  if (mode === 'testimonials') {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="font-display text-2xl font-bold text-[#0E021E]">Testimonials</h2>
          <p className="text-xs text-[#0E021E]/65">
            Only genuine, approved and published testimonials appear on the homepage. The homepage hides the testimonials section automatically when none are published.
          </p>
        </div>

        {msg && <div className="p-3 rounded-xl bg-[#F3F0FF] text-xs font-semibold text-[#39008B]">{msg}</div>}

        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const res = await fetch('/api/admin/testimonials', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify(newTestimonial),
            });
            if (res.ok) {
              setNewTestimonial({
                customer_name: '',
                location: '',
                quote: '',
                rating: 5,
                avatar_url: '',
                is_approved: true,
                is_published: true,
              });
              await Promise.all([onRefresh(), onRefreshStorefront()]);
              setMsg('Genuine testimonial added.');
            }
          }}
          className="bg-white rounded-xl border border-[#AA87FF]/25 p-5 space-y-3"
        >
          <h3 className="font-display text-lg font-bold">Add Genuine Customer Testimonial</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <input
              type="text"
              required
              placeholder="Customer Name *"
              value={newTestimonial.customer_name}
              onChange={(e) =>
                setNewTestimonial({ ...newTestimonial, customer_name: e.target.value })
              }
              className="px-3 py-2 rounded-xl border"
            />
            <input
              type="text"
              placeholder="Location (e.g. Calgary, Canada)"
              value={newTestimonial.location}
              onChange={(e) => setNewTestimonial({ ...newTestimonial, location: e.target.value })}
              className="px-3 py-2 rounded-xl border"
            />
            <select
              value={newTestimonial.rating}
              onChange={(e) =>
                setNewTestimonial({ ...newTestimonial, rating: Number(e.target.value) })
              }
              className="px-3 py-2 rounded-xl border bg-white"
            >
              {[5, 4, 3, 2, 1].map((r) => (
                <option key={r} value={r}>
                  {r} Stars
                </option>
              ))}
            </select>
          </div>
          <textarea
            rows={2}
            required
            placeholder="Verified customer quote *"
            value={newTestimonial.quote}
            onChange={(e) => setNewTestimonial({ ...newTestimonial, quote: e.target.value })}
            className="w-full px-3 py-2 rounded-xl border text-xs"
          />
          <MediaPickerInput
            label="Customer Avatar Photo (Optional)"
            value={newTestimonial.avatar_url}
            onChange={(url) => setNewTestimonial({ ...newTestimonial, avatar_url: url })}
            token={token}
            media={media}
            onMediaUploaded={onRefresh}
            bucket="testimonials"
            previewContain={false}
          />
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full bg-[#5000AF] text-white text-xs font-semibold"
          >
            <Plus className="w-3.5 h-3.5" />
            Save Testimonial
          </button>
        </form>

        <div className="space-y-3">
          {testimonials.length === 0 ? (
            <div className="bg-white rounded-xl border border-[#AA87FF]/25 p-8 text-center text-xs text-[#0E021E]/60">
              No testimonials stored yet. The homepage testimonial block stays hidden until you add and approve one.
            </div>
          ) : (
            testimonials.map((t) => (
              <div
                key={t.id}
                className="bg-white rounded-xl border border-[#AA87FF]/25 p-4 flex flex-wrap items-center justify-between gap-4 text-xs"
              >
                <div className="max-w-xl">
                  <p className="font-semibold text-[#0E021E]">
                    {t.customer_name} {t.location ? `· ${t.location}` : ''} ({t.rating}/5)
                  </p>
                  <p className="text-[#0E021E]/75 mt-1 italic">“{t.quote}”</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={async () => {
                      await fetch(`/api/admin/testimonials/${t.id}`, {
                        method: 'PATCH',
                        headers: {
                          'Content-Type': 'application/json',
                          Authorization: `Bearer ${token}`,
                        },
                        body: JSON.stringify({
                          is_approved: !t.is_approved,
                          is_published: !t.is_published,
                        }),
                      });
                      await Promise.all([onRefresh(), onRefreshStorefront()]);
                    }}
                    className={`px-3 py-1 rounded-full font-semibold ${
                      t.is_approved && t.is_published
                        ? 'bg-[#8ACE69]/25 text-[#538710]'
                        : 'bg-[#F3F0FF] text-[#5000AF]'
                    }`}
                  >
                    {t.is_approved && t.is_published ? 'Published' : 'Unpublished'}
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      await fetch(`/api/admin/testimonials/${t.id}`, {
                        method: 'DELETE',
                        headers: { Authorization: `Bearer ${token}` },
                      });
                      await Promise.all([onRefresh(), onRefreshStorefront()]);
                    }}
                    className="p-1.5 text-[#B71C85]"
                    aria-label="Delete testimonial"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  if (mode === 'settings') {
    return (
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          const res = await fetch('/api/admin/settings', {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(settingsForm),
          });
          if (res.ok) {
            await Promise.all([onRefresh(), onRefreshStorefront()]);
            setMsg('Store settings saved and applied to public website.');
          }
        }}
        className="space-y-6 max-w-3xl"
      >
        <div>
          <h2 className="font-display text-2xl font-bold text-[#0E021E]">Store Settings</h2>
          <p className="text-xs text-[#0E021E]/65">
            Manage business contact details, WhatsApp checkout number, announcements, social links, and SEO defaults.
          </p>
        </div>

        {msg && <div className="p-3 rounded-xl bg-[#F3F0FF] text-xs font-semibold text-[#39008B]">{msg}</div>}

        <div className="bg-white rounded-xl border border-[#AA87FF]/25 p-6 space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold mb-1">Business Name</label>
              <input
                type="text"
                value={settingsForm.business_name}
                onChange={(e) =>
                  setSettingsForm({ ...settingsForm, business_name: e.target.value })
                }
                className="w-full px-3 py-2 rounded-xl border"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Owner Name</label>
              <input
                type="text"
                value={settingsForm.owner_name}
                onChange={(e) => setSettingsForm({ ...settingsForm, owner_name: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Business Email</label>
              <input
                type="email"
                value={settingsForm.email}
                onChange={(e) => setSettingsForm({ ...settingsForm, email: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">
                WhatsApp Number (Checkout &amp; Floating Button)
              </label>
              <input
                type="text"
                value={settingsForm.whatsapp_number}
                onChange={(e) =>
                  setSettingsForm({ ...settingsForm, whatsapp_number: e.target.value })
                }
                className="w-full px-3 py-2 rounded-xl border font-mono"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Currency</label>
              <input
                type="text"
                value={settingsForm.currency}
                onChange={(e) => setSettingsForm({ ...settingsForm, currency: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Free Shipping Threshold (CAD)</label>
              <input
                type="number"
                value={settingsForm.free_shipping_threshold_cad}
                onChange={(e) =>
                  setSettingsForm({
                    ...settingsForm,
                    free_shipping_threshold_cad: Number(e.target.value),
                  })
                }
                className="w-full px-3 py-2 rounded-xl border tabular-nums"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Market / Region Label</label>
              <input
                type="text"
                value={settingsForm.region_label}
                onChange={(e) =>
                  setSettingsForm({ ...settingsForm, region_label: e.target.value })
                }
                className="w-full px-3 py-2 rounded-xl border"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-[#F3F0FF]">
            <div>
              <label className="block font-semibold mb-1">Top Bar Left Announcement</label>
              <input
                type="text"
                value={settingsForm.announcement_left}
                onChange={(e) =>
                  setSettingsForm({ ...settingsForm, announcement_left: e.target.value })
                }
                className="w-full px-3 py-2 rounded-xl border"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Top Bar Center Announcement</label>
              <input
                type="text"
                value={settingsForm.announcement_center}
                onChange={(e) =>
                  setSettingsForm({ ...settingsForm, announcement_center: e.target.value })
                }
                className="w-full px-3 py-2 rounded-xl border"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-[#F3F0FF]">
            <div>
              <label className="block font-semibold mb-1">Instagram URL (Optional)</label>
              <input
                type="text"
                value={settingsForm.social_instagram}
                onChange={(e) =>
                  setSettingsForm({ ...settingsForm, social_instagram: e.target.value })
                }
                placeholder="https://instagram.com/..."
                className="w-full px-3 py-2 rounded-xl border"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Facebook URL (Optional)</label>
              <input
                type="text"
                value={settingsForm.social_facebook}
                onChange={(e) =>
                  setSettingsForm({ ...settingsForm, social_facebook: e.target.value })
                }
                placeholder="https://facebook.com/..."
                className="w-full px-3 py-2 rounded-xl border"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">YouTube URL (Optional)</label>
              <input
                type="text"
                value={settingsForm.social_youtube}
                onChange={(e) =>
                  setSettingsForm({ ...settingsForm, social_youtube: e.target.value })
                }
                placeholder="https://youtube.com/..."
                className="w-full px-3 py-2 rounded-xl border"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Pinterest URL (Optional)</label>
              <input
                type="text"
                value={settingsForm.social_pinterest}
                onChange={(e) =>
                  setSettingsForm({ ...settingsForm, social_pinterest: e.target.value })
                }
                placeholder="https://pinterest.com/..."
                className="w-full px-3 py-2 rounded-xl border"
              />
            </div>
          </div>

          <div className="space-y-3 pt-2 border-t border-[#F3F0FF]">
            <div>
              <label className="block font-semibold mb-1">Default SEO Title</label>
              <input
                type="text"
                value={settingsForm.seo_title}
                onChange={(e) => setSettingsForm({ ...settingsForm, seo_title: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Default SEO Meta Description</label>
              <textarea
                rows={2}
                value={settingsForm.seo_description}
                onChange={(e) =>
                  setSettingsForm({ ...settingsForm, seo_description: e.target.value })
                }
                className="w-full px-3 py-2 rounded-xl border"
              />
            </div>
          </div>

          <button
            type="submit"
            className="px-6 py-2.5 rounded-full bg-[#5000AF] text-white font-semibold hover:bg-[#39008B]"
          >
            Save Store Settings
          </button>
        </div>
      </form>
    );
  }

  if (mode === 'users') {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="font-display text-2xl font-bold text-[#0E021E]">
            Admin Users &amp; Permissions
          </h2>
          <p className="text-xs text-[#0E021E]/65">
            Super Admins can assign role permissions across Store, Wholesale, and Content managers.
          </p>
        </div>

        {msg && <div className="p-3 rounded-xl bg-[#F3F0FF] text-xs font-semibold text-[#39008B]">{msg}</div>}

        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const res = await fetch('/api/admin/users', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify(newAdminUser),
            });
            const data = await res.json();
            if (!res.ok) {
              setMsg(data.error || 'Could not create admin user.');
            } else {
              setNewAdminUser({ full_name: '', email: '', password: '', role: 'store_manager' });
              await onRefresh();
              setMsg('Admin staff user created.');
            }
          }}
          className="bg-white rounded-xl border border-[#AA87FF]/25 p-5 grid grid-cols-1 sm:grid-cols-5 gap-3 text-xs items-end"
        >
          <div>
            <label className="block font-semibold mb-1">Full Name</label>
            <input
              type="text"
              required
              value={newAdminUser.full_name}
              onChange={(e) => setNewAdminUser({ ...newAdminUser, full_name: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border"
            />
          </div>
          <div>
            <label className="block font-semibold mb-1">Email</label>
            <input
              type="email"
              required
              value={newAdminUser.email}
              onChange={(e) => setNewAdminUser({ ...newAdminUser, email: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border"
            />
          </div>
          <div>
            <label className="block font-semibold mb-1">Password (8+ chars)</label>
            <input
              type="password"
              required
              minLength={8}
              value={newAdminUser.password}
              onChange={(e) => setNewAdminUser({ ...newAdminUser, password: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border"
            />
          </div>
          <div>
            <label className="block font-semibold mb-1">Role</label>
            <select
              value={newAdminUser.role}
              onChange={(e) =>
                setNewAdminUser({ ...newAdminUser, role: e.target.value as AdminRole })
              }
              className="w-full px-3 py-2 rounded-xl border bg-white"
            >
              <option value="super_admin">Super Admin</option>
              <option value="store_manager">Store Manager</option>
              <option value="wholesale_manager">Wholesale Manager</option>
              <option value="content_manager">Content Manager</option>
            </select>
          </div>
          <button
            type="submit"
            className="py-2 px-4 rounded-full bg-[#5000AF] text-white font-semibold"
          >
            Add Staff User
          </button>
        </form>

        <div className="bg-white rounded-xl border border-[#AA87FF]/25 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F3F0FF]/70 text-[#39008B] font-semibold">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Toggle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F3F0FF]">
              {adminUsers.map((u) => (
                <tr key={u.id}>
                  <td className="px-4 py-3 font-semibold">{u.full_name}</td>
                  <td className="px-4 py-3">{u.email}</td>
                  <td className="px-4 py-3 font-mono">{u.role}</td>
                  <td className="px-4 py-3">{u.is_active ? 'Active' : 'Disabled'}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={async () => {
                        await fetch(`/api/admin/users/${u.id}`, {
                          method: 'PATCH',
                          headers: {
                            'Content-Type': 'application/json',
                            Authorization: `Bearer ${token}`,
                          },
                          body: JSON.stringify({ is_active: !u.is_active }),
                        });
                        await onRefresh();
                      }}
                      className="px-3 py-1 rounded-full border border-[#5000AF] text-[#5000AF] font-semibold"
                    >
                      {u.is_active ? 'Disable' : 'Enable'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // Activity Logs
  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-bold text-[#0E021E]">Activity Logs</h2>
        <p className="text-xs text-[#0E021E]/65">
          Audit trail of product updates, order changes, wholesale approvals, and store edits.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-[#AA87FF]/25 overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-[#F3F0FF]/70 text-[#39008B] font-semibold">
            <tr>
              <th className="px-4 py-3">Timestamp</th>
              <th className="px-4 py-3">Actor</th>
              <th className="px-4 py-3">Action</th>
              <th className="px-4 py-3">Entity</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F3F0FF]">
            {logs.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-[#0E021E]/60">
                  No activity logged yet.
                </td>
              </tr>
            ) : (
              logs.map((l) => (
                <tr key={l.id}>
                  <td className="px-4 py-3 font-mono text-[#0E021E]/65 tabular-nums">
                    {new Date(l.created_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 font-medium">{l.actor_email}</td>
                  <td className="px-4 py-3 font-semibold text-[#0E021E]">{l.action}</td>
                  <td className="px-4 py-3 font-mono text-[#5000AF]">
                    {l.entity_type} {l.entity_id ? `· ${l.entity_id.slice(0, 8)}` : ''}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
