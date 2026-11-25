export interface HeaderNavLink {
  label: string;
  href: string;
  type?: 'link' | 'shop_dropdown' | 'collections_dropdown';
  open_in_new_tab?: boolean;
}

export interface FooterLink {
  label: string;
  href: string;
  open_in_new_tab?: boolean;
}

export interface FooterConfig {
  description: string;
  badge_image_url: string;
  badge_alt: string;
  badge_href: string;
  quick_links_title: string;
  quick_links: FooterLink[];
  customer_care_title: string;
  customer_care_links: FooterLink[];
  contact_title: string;
  show_contact_phone: boolean;
  show_contact_email: boolean;
  show_contact_region: boolean;
  social_title: string;
  extra_links: FooterLink[];
  copyright_text: string;
}

export const DEFAULT_HEADER_LINKS: HeaderNavLink[] = [
  { label: 'Home', href: '/', type: 'link' },
  { label: 'Shop', href: '/shop', type: 'shop_dropdown' },
  { label: 'Collections', href: '/collections/diffuser-oil-blends', type: 'collections_dropdown' },
  { label: 'About Us', href: '/about', type: 'link' },
  { label: 'Wholesale', href: '/wholesale', type: 'link' },
  { label: 'FAQ', href: '/faq', type: 'link' },
  { label: 'Contact', href: '/contact', type: 'link' },
];

export const DEFAULT_FOOTER_CONFIG: FooterConfig = {
  description: 'Organic diffuser oil blends, body & massage oils, and ultrasonic diffusers. Founded by Dr Ann Merah.',
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
};

function parseJsonValue<T>(val: unknown, fallback: T): T {
  if (val === null || val === undefined || val === '') return fallback;
  if (typeof val === 'string') {
    try {
      const parsed = JSON.parse(val);
      return parsed ?? fallback;
    } catch {
      return fallback;
    }
  }
  return val as T;
}

export function normalizeFooterConfig(raw: unknown): FooterConfig {
  const obj = parseJsonValue<Partial<FooterConfig>>(raw, {});
  return {
    description: typeof obj.description === 'string' && obj.description.length > 0 ? obj.description : DEFAULT_FOOTER_CONFIG.description,
    badge_image_url: typeof obj.badge_image_url === 'string' ? obj.badge_image_url : '',
    badge_alt: typeof obj.badge_alt === 'string' ? obj.badge_alt : '',
    badge_href: typeof obj.badge_href === 'string' ? obj.badge_href : '',
    quick_links_title: obj.quick_links_title || DEFAULT_FOOTER_CONFIG.quick_links_title,
    quick_links: Array.isArray(obj.quick_links) && obj.quick_links.length > 0 ? obj.quick_links : DEFAULT_FOOTER_CONFIG.quick_links,
    customer_care_title: obj.customer_care_title || DEFAULT_FOOTER_CONFIG.customer_care_title,
    customer_care_links:
      Array.isArray(obj.customer_care_links) && obj.customer_care_links.length > 0
        ? obj.customer_care_links
        : DEFAULT_FOOTER_CONFIG.customer_care_links,
    contact_title: obj.contact_title || DEFAULT_FOOTER_CONFIG.contact_title,
    show_contact_phone: obj.show_contact_phone !== false,
    show_contact_email: obj.show_contact_email !== false,
    show_contact_region: obj.show_contact_region !== false,
    social_title: obj.social_title || DEFAULT_FOOTER_CONFIG.social_title,
    extra_links: Array.isArray(obj.extra_links) ? obj.extra_links : DEFAULT_FOOTER_CONFIG.extra_links,
    copyright_text: typeof obj.copyright_text === 'string' ? obj.copyright_text : '',
  };
}

export function normalizeHeaderLinks(raw: unknown): HeaderNavLink[] {
  const arr = parseJsonValue<HeaderNavLink[]>(raw, []);
  return Array.isArray(arr) && arr.length > 0 ? arr : DEFAULT_HEADER_LINKS;
}

export function normalizeSiteSettings(row: Record<string, unknown> | undefined): Record<string, unknown> {
  if (!row) return {};
  return {
    ...row,
    brand_tagline: String(row.brand_tagline ?? 'BOTANICAL WELLNESS · NATURAL LIVING'),
    logo_light_url: String(row.logo_light_url ?? ''),
    logo_dark_url: String(row.logo_dark_url ?? ''),
    brand_icon_url: String(row.brand_icon_url ?? ''),
    favicon_url: String(row.favicon_url ?? ''),
    free_shipping_threshold_cad: Number(row.free_shipping_threshold_cad ?? 100),
    header_links: normalizeHeaderLinks(row.header_links),
    footer_config: normalizeFooterConfig(row.footer_config),
  };
}
