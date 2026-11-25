import React, { useEffect, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Check,
  Globe,
  Plus,
  RotateCcw,
  Save,
  Trash2,
} from 'lucide-react';
import { BrandLogo } from '../../components/BrandLogo';
import { MediaPickerInput } from '../../components/admin/MediaPickerInput';
import type {
  FooterConfig,
  FooterLink,
  HeaderNavLink,
  MediaAsset,
  SiteSettings,
} from '../../types';

interface AdminFooterBrandingSectionProps {
  token: string;
  settings: SiteSettings;
  media: MediaAsset[];
  onRefresh: () => Promise<void>;
  onRefreshStorefront: () => Promise<void>;
}

const LinkColumnEditor: React.FC<{
  titleLabel: string;
  columnTitle: string;
  onTitleChange: (val: string) => void;
  links: FooterLink[];
  onChangeLinks: (links: FooterLink[]) => void;
}> = ({ titleLabel, columnTitle, onTitleChange, links, onChangeLinks }) => {
  const move = (idx: number, dir: -1 | 1) => {
    const target = idx + dir;
    if (target < 0 || target >= links.length) return;
    const next = [...links];
    const [item] = next.splice(idx, 1);
    next.splice(target, 0, item);
    onChangeLinks(next);
  };

  return (
    <div className="bg-white rounded-xl border border-[#AA87FF]/25 p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-[11px] font-bold uppercase tracking-wider text-[#5000AF] mb-1">
            {titleLabel} Heading
          </label>
          <input
            type="text"
            value={columnTitle}
            onChange={(e) => onTitleChange(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-[#AA87FF]/45 text-xs font-semibold text-[#0E021E]"
          />
        </div>
        <button
          type="button"
          onClick={() =>
            onChangeLinks([...links, { label: 'New Link', href: '/shop', open_in_new_tab: false }])
          }
          className="inline-flex items-center gap-1 px-3.5 py-2 rounded-full bg-[#F3F0FF] text-[#5000AF] text-xs font-semibold hover:bg-[#5000AF] hover:text-white transition-colors mt-4 sm:mt-0"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Link
        </button>
      </div>

      <div className="space-y-2">
        {links.length === 0 ? (
          <p className="text-xs text-[#0E021E]/50 italic py-2">
            No links in this column yet. Click &ldquo;Add Link&rdquo; above to add one.
          </p>
        ) : (
          links.map((link, idx) => (
            <div
              key={`fl-${idx}`}
              className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center p-2.5 rounded-xl bg-[#F3F0FF]/45 border border-[#AA87FF]/20"
            >
              <input
                type="text"
                value={link.label}
                placeholder="Link label"
                onChange={(e) => {
                  const next = [...links];
                  next[idx] = { ...next[idx], label: e.target.value };
                  onChangeLinks(next);
                }}
                className="sm:col-span-4 px-2.5 py-1.5 rounded-lg border border-[#AA87FF]/35 bg-white text-xs font-medium"
              />
              <input
                type="text"
                value={link.href}
                placeholder="/path or https://..."
                onChange={(e) => {
                  const next = [...links];
                  next[idx] = { ...next[idx], href: e.target.value };
                  onChangeLinks(next);
                }}
                className="sm:col-span-4 px-2.5 py-1.5 rounded-lg border border-[#AA87FF]/35 bg-white text-xs font-mono"
              />
              <label className="sm:col-span-2 flex items-center gap-1.5 text-[11px] font-medium text-[#0E021E]/80 whitespace-nowrap">
                <input
                  type="checkbox"
                  checked={Boolean(link.open_in_new_tab)}
                  onChange={(e) => {
                    const next = [...links];
                    next[idx] = { ...next[idx], open_in_new_tab: e.target.checked };
                    onChangeLinks(next);
                  }}
                />
                New tab
              </label>
              <div className="sm:col-span-2 flex items-center justify-end gap-1">
                <button
                  type="button"
                  onClick={() => move(idx, -1)}
                  disabled={idx === 0}
                  className="p-1.5 rounded-lg hover:bg-white text-[#39008B] disabled:opacity-30"
                  aria-label="Move link up"
                >
                  <ArrowUp className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => move(idx, 1)}
                  disabled={idx === links.length - 1}
                  className="p-1.5 rounded-lg hover:bg-white text-[#39008B] disabled:opacity-30"
                  aria-label="Move link down"
                >
                  <ArrowDown className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const next = [...links];
                    next.splice(idx, 1);
                    onChangeLinks(next);
                  }}
                  className="p-1.5 rounded-lg hover:bg-[#B71C85]/10 text-[#B71C85]"
                  aria-label="Remove link"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export const AdminFooterBrandingSection: React.FC<AdminFooterBrandingSectionProps> = ({
  token,
  settings,
  media,
  onRefresh,
  onRefreshStorefront,
}) => {
  const [form, setForm] = useState<SiteSettings>(settings);
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    setForm(settings);
  }, [settings]);

  const updateFooter = (patch: Partial<FooterConfig>) => {
    setForm((prev) => ({
      ...prev,
      footer_config: {
        ...prev.footer_config,
        ...patch,
      },
    }));
  };

  const moveHeaderLink = (idx: number, dir: -1 | 1) => {
    const links = [...(form.header_links || [])];
    const target = idx + dir;
    if (target < 0 || target >= links.length) return;
    const [item] = links.splice(idx, 1);
    links.splice(target, 0, item);
    setForm((prev) => ({ ...prev, header_links: links }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setStatusMsg('');
    setErrorMsg('');
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErrorMsg(data.error || 'Could not save branding & footer changes.');
      } else {
        await Promise.all([onRefresh(), onRefreshStorefront()]);
        setStatusMsg('Site logos, favicon, header navigation, and footer saved live.');
      }
    } catch {
      setErrorMsg('Network error while saving settings.');
    } finally {
      setSaving(false);
    }
  };

  const handleResetDefaults = () => {
    setForm((prev) => ({
      ...prev,
      brand_tagline: 'BOTANICAL WELLNESS · NATURAL LIVING',
      logo_light_url: '',
      logo_dark_url: '',
      brand_icon_url: '',
      favicon_url: '',
      header_links: [
        { label: 'Home', href: '/', type: 'link' },
        { label: 'Shop', href: '/shop', type: 'shop_dropdown' },
        {
          label: 'Collections',
          href: '/collections/diffuser-oil-blends',
          type: 'collections_dropdown',
        },
        { label: 'About Us', href: '/about', type: 'link' },
        { label: 'Wholesale', href: '/wholesale', type: 'link' },
        { label: 'FAQ', href: '/faq', type: 'link' },
        { label: 'Contact', href: '/contact', type: 'link' },
      ],
      footer_config: {
        description: `Organic diffuser oil blends, body & massage oils, and ultrasonic diffusers. Founded by ${prev.owner_name}.`,
        badge_image_url: '',
        badge_alt: '',
        badge_href: '',
        quick_links_title: 'Quick Links',
        quick_links: [
          { label: 'Home', href: '/' },
          { label: 'Shop', href: '/shop' },
          { label: 'Collections', href: '/collections/diffuser-oil-blends' },
          { label: 'About Us', href: '/about' },
          { label: 'Wholesale', href: '/wholesale' },
        ],
        customer_care_title: 'Customer Care',
        customer_care_links: [
          { label: 'FAQ', href: '/faq' },
          { label: 'Shipping & Returns', href: '/shipping-returns' },
          { label: 'Privacy Policy', href: '/privacy-policy' },
          { label: 'Terms & Conditions', href: '/terms-and-conditions' },
          { label: 'Contact Us', href: '/contact' },
        ],
        contact_title: 'Contact Us',
        show_contact_phone: true,
        show_contact_email: true,
        show_contact_region: true,
        social_title: 'Stay Connected',
        extra_links: [
          { label: 'Newsletter Sign-up', href: '/#newsletter' },
          { label: 'Wholesale Portal', href: '/wholesale/portal' },
          { label: 'Admin Dashboard', href: '/admin' },
        ],
        copyright_text: '',
      },
    }));
    setStatusMsg('Default branding & footer layout loaded into editor. Click "Save All Changes" to publish.');
  };

  const footer = form.footer_config;
  const activeFaviconPreview = form.favicon_url || form.brand_icon_url;

  return (
    <form onSubmit={handleSave} className="space-y-8 max-w-5xl">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-bold text-[#0E021E]">
            Site Logo, Icon, Favicon, Header &amp; Footer Editor
          </h2>
          <p className="text-xs text-[#0E021E]/65 mt-0.5">
            Upload or pick logos, brand icons, and the browser favicon, customize top header links, and edit every column, image, and link in the footer.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full border border-[#AA87FF]/45 bg-white text-xs font-semibold text-[#39008B] hover:bg-[#F3F0FF]"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset Defaults
          </button>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-full bg-[#5000AF] text-white text-xs font-semibold hover:bg-[#39008B] disabled:opacity-60 shadow-sm"
          >
            <Save className="w-3.5 h-3.5" />
            {saving ? 'Saving...' : 'Save All Changes'}
          </button>
        </div>
      </div>

      {statusMsg && (
        <div className="p-3.5 rounded-xl bg-[#8ACE69]/20 border border-[#8ACE69]/50 text-xs font-semibold text-[#3B6308] flex items-center gap-2">
          <Check className="w-4 h-4 shrink-0" />
          <span>{statusMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-[#B71C85]/10 border border-[#B71C85]/30 text-xs font-semibold text-[#B71C85]">
          {errorMsg}
        </div>
      )}

      {/* 1. Live Brand Preview */}
      <div className="bg-white rounded-2xl border border-[#AA87FF]/25 p-5 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-display text-lg font-bold text-[#0E021E]">Live Brand Preview</h3>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#F3F0FF] border border-[#AA87FF]/30 text-xs">
            {activeFaviconPreview ? (
              <img
                src={activeFaviconPreview}
                alt="Favicon preview"
                className="w-4 h-4 rounded-xs object-contain"
              />
            ) : (
              <Globe className="w-3.5 h-3.5 text-[#5000AF]" />
            )}
            <span className="font-medium text-[#39008B] truncate max-w-[200px]">
              {form.business_name || 'Kytura Naturals'} — Browser Tab
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-xl border border-[#AA87FF]/25 bg-white p-5">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-[#0E021E]/45 mb-3">
              Header (Light Background)
            </span>
            <BrandLogo variant="dark" overrideSettings={form} />
          </div>
          <div className="rounded-xl bg-gradient-to-b from-[#2A0062] to-[#0E021E] p-5">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-white/55 mb-3">
              Footer (Dark Background)
            </span>
            <BrandLogo variant="light" compact overrideSettings={form} />
          </div>
        </div>
      </div>

      {/* 2. Site Identity, Logo, Icon & Favicon */}
      <div className="bg-white rounded-2xl border border-[#AA87FF]/25 p-6 space-y-5">
        <div>
          <h3 className="font-display text-lg font-bold text-[#0E021E]">
            Site Logo, Brand Icon &amp; Favicon
          </h3>
          <p className="text-xs text-[#0E021E]/60 mt-0.5">
            Upload a full custom logo image (replaces the emblem + wordmark) or upload a custom icon to replace the botanical lotus icon while keeping your editable brand name &amp; tagline.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold mb-1">Business Name</label>
            <input
              type="text"
              value={form.business_name}
              onChange={(e) => setForm({ ...form, business_name: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-[#AA87FF]/45 text-xs"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1">Brand Tagline</label>
            <input
              type="text"
              value={form.brand_tagline}
              onChange={(e) => setForm({ ...form, brand_tagline: e.target.value })}
              placeholder="BOTANICAL WELLNESS · NATURAL LIVING"
              className="w-full px-3 py-2 rounded-xl border border-[#AA87FF]/45 text-xs"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2 border-t border-[#F3F0FF]">
          <MediaPickerInput
            label="Header Logo (Light Background)"
            value={form.logo_light_url || ''}
            onChange={(url) => setForm({ ...form, logo_light_url: url })}
            token={token}
            media={media}
            onMediaUploaded={onRefresh}
            bucket="site-branding"
            hint="Optional full horizontal logo image shown in the white top header."
          />

          <MediaPickerInput
            label="Footer Logo (Dark Background)"
            value={form.logo_dark_url || ''}
            onChange={(url) => setForm({ ...form, logo_dark_url: url })}
            token={token}
            media={media}
            onMediaUploaded={onRefresh}
            bucket="site-branding"
            previewDark
            hint="Optional white/light logo shown in the dark purple footer & admin sidebar."
          />

          <MediaPickerInput
            label="Brand Icon / Emblem"
            value={form.brand_icon_url || ''}
            onChange={(url) => setForm({ ...form, brand_icon_url: url })}
            token={token}
            media={media}
            onMediaUploaded={onRefresh}
            bucket="site-branding"
            accept="image/png,image/webp,image/jpeg,image/avif,.ico"
            hint="Square emblem shown beside the business name when full wordmark logos are empty."
          />

          <MediaPickerInput
            label="Site Favicon (.ico, .png, .webp)"
            value={form.favicon_url || ''}
            onChange={(url) => setForm({ ...form, favicon_url: url })}
            token={token}
            media={media}
            onMediaUploaded={onRefresh}
            bucket="site-favicons"
            accept=".ico,image/x-icon,image/vnd.microsoft.icon,image/png,image/webp,image/jpeg"
            hint="Displayed in browser tabs & bookmarks. Falls back to Brand Icon if empty."
          />
        </div>
      </div>

      {/* 3. Header Navigation Links */}
      <div className="bg-white rounded-2xl border border-[#AA87FF]/25 p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-display text-lg font-bold text-[#0E021E]">
              Header Navigation Links
            </h3>
            <p className="text-xs text-[#0E021E]/60 mt-0.5">
              Add, edit, reorder, or remove links in the top storefront navigation bar and mobile menu.
            </p>
          </div>
          <button
            type="button"
            onClick={() =>
              setForm((prev) => ({
                ...prev,
                header_links: [
                  ...(prev.header_links || []),
                  { label: 'New Link', href: '/shop', type: 'link', open_in_new_tab: false },
                ],
              }))
            }
            className="inline-flex items-center gap-1 px-4 py-2 rounded-full bg-[#F3F0FF] text-[#5000AF] text-xs font-semibold hover:bg-[#5000AF] hover:text-white transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Header Link
          </button>
        </div>

        <div className="space-y-2">
          {(form.header_links || []).map((item: HeaderNavLink, idx: number) => (
            <div
              key={`hl-${idx}`}
              className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center p-2.5 rounded-xl bg-[#F3F0FF]/45 border border-[#AA87FF]/20"
            >
              <input
                type="text"
                value={item.label}
                placeholder="Label"
                onChange={(e) => {
                  const next = [...form.header_links];
                  next[idx] = { ...next[idx], label: e.target.value };
                  setForm({ ...form, header_links: next });
                }}
                className="sm:col-span-3 px-2.5 py-1.5 rounded-lg border border-[#AA87FF]/35 bg-white text-xs font-medium"
              />
              <input
                type="text"
                value={item.href}
                placeholder="/path or https://..."
                onChange={(e) => {
                  const next = [...form.header_links];
                  next[idx] = { ...next[idx], href: e.target.value };
                  setForm({ ...form, header_links: next });
                }}
                className="sm:col-span-3 px-2.5 py-1.5 rounded-lg border border-[#AA87FF]/35 bg-white text-xs font-mono"
              />
              <select
                value={item.type || 'link'}
                onChange={(e) => {
                  const next = [...form.header_links];
                  next[idx] = {
                    ...next[idx],
                    type: e.target.value as HeaderNavLink['type'],
                  };
                  setForm({ ...form, header_links: next });
                }}
                className="sm:col-span-3 px-2.5 py-1.5 rounded-lg border border-[#AA87FF]/35 bg-white text-xs"
              >
                <option value="link">Standard Link</option>
                <option value="shop_dropdown">Shop Dropdown (Categories)</option>
                <option value="collections_dropdown">Collections Dropdown</option>
              </select>
              <label className="sm:col-span-1 flex items-center gap-1 text-[11px] font-medium whitespace-nowrap">
                <input
                  type="checkbox"
                  checked={Boolean(item.open_in_new_tab)}
                  onChange={(e) => {
                    const next = [...form.header_links];
                    next[idx] = { ...next[idx], open_in_new_tab: e.target.checked };
                    setForm({ ...form, header_links: next });
                  }}
                />
                Tab
              </label>
              <div className="sm:col-span-2 flex items-center justify-end gap-1">
                <button
                  type="button"
                  onClick={() => moveHeaderLink(idx, -1)}
                  disabled={idx === 0}
                  className="p-1.5 rounded-lg hover:bg-white text-[#39008B] disabled:opacity-30"
                  aria-label="Move header link up"
                >
                  <ArrowUp className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => moveHeaderLink(idx, 1)}
                  disabled={idx === form.header_links.length - 1}
                  className="p-1.5 rounded-lg hover:bg-white text-[#39008B] disabled:opacity-30"
                  aria-label="Move header link down"
                >
                  <ArrowDown className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const next = [...form.header_links];
                    next.splice(idx, 1);
                    setForm({ ...form, header_links: next });
                  }}
                  className="p-1.5 rounded-lg hover:bg-[#B71C85]/10 text-[#B71C85]"
                  aria-label="Remove header link"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 4. Footer Brand Description, Badge Image & Copyright */}
      <div className="bg-white rounded-2xl border border-[#AA87FF]/25 p-6 space-y-5">
        <div>
          <h3 className="font-display text-lg font-bold text-[#0E021E]">
            Footer Brand Column, Image &amp; Bottom Bar
          </h3>
          <p className="text-xs text-[#0E021E]/60 mt-0.5">
            Edit the footer intro copy, upload an optional footer badge/seal image with clickable link, and customize the copyright line.
          </p>
        </div>

        <div>
          <label className="block text-xs font-semibold mb-1">Footer About / Description Text</label>
          <textarea
            rows={2}
            value={footer.description}
            onChange={(e) => updateFooter({ description: e.target.value })}
            className="w-full px-3 py-2 rounded-xl border border-[#AA87FF]/45 text-xs"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-[#F3F0FF]">
          <MediaPickerInput
            label="Footer Badge / Seal / Promo Image (Optional)"
            value={footer.badge_image_url || ''}
            onChange={(url) => updateFooter({ badge_image_url: url })}
            token={token}
            media={media}
            onMediaUploaded={onRefresh}
            bucket="footer-assets"
            previewDark
            hint="Optional image shown beneath the footer brand description."
          />

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold mb-1">Footer Image Link URL (Optional)</label>
              <input
                type="text"
                value={footer.badge_href || ''}
                onChange={(e) => updateFooter({ badge_href: e.target.value })}
                placeholder="/wholesale or https://..."
                className="w-full px-3 py-2 rounded-xl border border-[#AA87FF]/45 text-xs font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Footer Image Alt Text</label>
              <input
                type="text"
                value={footer.badge_alt || ''}
                onChange={(e) => updateFooter({ badge_alt: e.target.value })}
                placeholder="e.g. Botanical Wellness Certification"
                className="w-full px-3 py-2 rounded-xl border border-[#AA87FF]/45 text-xs"
              />
            </div>
          </div>
        </div>

        <div className="pt-2 border-t border-[#F3F0FF]">
          <label className="block text-xs font-semibold mb-1">
            Custom Copyright Text (Optional — leave blank for automatic year &amp; currency text)
          </label>
          <input
            type="text"
            value={footer.copyright_text || ''}
            onChange={(e) => updateFooter({ copyright_text: e.target.value })}
            placeholder={`© ${new Date().getFullYear()} ${form.business_name}. All rights reserved. Prices in ${form.currency}.`}
            className="w-full px-3 py-2 rounded-xl border border-[#AA87FF]/45 text-xs"
          />
          <p className="text-[11px] text-[#0E021E]/55 mt-1">
            Developer attribution (&ldquo;Developed by Emmanuel Kenny | StaySafelite&rdquo;) remains preserved on the bottom-right footer bar.
          </p>
        </div>
      </div>

      {/* 5. Footer Link Columns */}
      <div className="space-y-5">
        <LinkColumnEditor
          titleLabel="Column 2 (Quick Links)"
          columnTitle={footer.quick_links_title}
          onTitleChange={(val) => updateFooter({ quick_links_title: val })}
          links={footer.quick_links || []}
          onChangeLinks={(links) => updateFooter({ quick_links: links })}
        />

        <LinkColumnEditor
          titleLabel="Column 3 (Customer Care)"
          columnTitle={footer.customer_care_title}
          onTitleChange={(val) => updateFooter({ customer_care_title: val })}
          links={footer.customer_care_links || []}
          onChangeLinks={(links) => updateFooter({ customer_care_links: links })}
        />

        {/* Column 4: Contact Column */}
        <div className="bg-white rounded-xl border border-[#AA87FF]/25 p-5 space-y-4">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-[#5000AF] mb-1">
              Column 4 (Contact Us) Heading
            </label>
            <input
              type="text"
              value={footer.contact_title}
              onChange={(e) => updateFooter({ contact_title: e.target.value })}
              className="w-full max-w-sm px-3 py-2 rounded-xl border border-[#AA87FF]/45 text-xs font-semibold"
            />
          </div>
          <div className="flex flex-wrap gap-6 text-xs font-medium text-[#0E021E]">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={footer.show_contact_phone !== false}
                onChange={(e) => updateFooter({ show_contact_phone: e.target.checked })}
              />
              Show WhatsApp / Phone Number
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={footer.show_contact_email !== false}
                onChange={(e) => updateFooter({ show_contact_email: e.target.checked })}
              />
              Show Business Email
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={footer.show_contact_region !== false}
                onChange={(e) => updateFooter({ show_contact_region: e.target.checked })}
              />
              Show Market / Region Label
            </label>
          </div>
        </div>

        {/* Column 5: Stay Connected Social Icons + Extra Links */}
        <div className="bg-white rounded-xl border border-[#AA87FF]/25 p-5 space-y-4">
          <h4 className="font-display text-base font-bold text-[#0E021E]">
            Social Media Links (Shown in Footer &ldquo;Stay Connected&rdquo;)
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block font-semibold mb-1">Facebook URL</label>
              <input
                type="text"
                value={form.social_facebook || ''}
                onChange={(e) => setForm({ ...form, social_facebook: e.target.value })}
                placeholder="https://facebook.com/..."
                className="w-full px-3 py-2 rounded-xl border border-[#AA87FF]/45"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Instagram URL</label>
              <input
                type="text"
                value={form.social_instagram || ''}
                onChange={(e) => setForm({ ...form, social_instagram: e.target.value })}
                placeholder="https://instagram.com/..."
                className="w-full px-3 py-2 rounded-xl border border-[#AA87FF]/45"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">YouTube URL</label>
              <input
                type="text"
                value={form.social_youtube || ''}
                onChange={(e) => setForm({ ...form, social_youtube: e.target.value })}
                placeholder="https://youtube.com/..."
                className="w-full px-3 py-2 rounded-xl border border-[#AA87FF]/45"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Pinterest URL</label>
              <input
                type="text"
                value={form.social_pinterest || ''}
                onChange={(e) => setForm({ ...form, social_pinterest: e.target.value })}
                placeholder="https://pinterest.com/..."
                className="w-full px-3 py-2 rounded-xl border border-[#AA87FF]/45"
              />
            </div>
          </div>
        </div>

        <LinkColumnEditor
          titleLabel="Column 5 (Stay Connected Extra Links)"
          columnTitle={footer.social_title}
          onTitleChange={(val) => updateFooter({ social_title: val })}
          links={footer.extra_links || []}
          onChangeLinks={(links) => updateFooter({ extra_links: links })}
        />
      </div>

      <div className="flex justify-end pt-2">
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 px-7 py-3 rounded-full bg-[#5000AF] text-white text-sm font-semibold hover:bg-[#39008B] disabled:opacity-60 shadow-md"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Saving Changes...' : 'Save Branding, Header & Footer'}
        </button>
      </div>
    </form>
  );
};
