export type AdminRole = 'super_admin' | 'store_manager' | 'wholesale_manager' | 'content_manager';

export type OrderStatus =
  | 'Awaiting WhatsApp Confirmation'
  | 'Pending Business Confirmation'
  | 'Confirmed'
  | 'Processing'
  | 'Shipped'
  | 'Delivered'
  | 'Cancelled';

export type PaymentStatus =
  | 'Unpaid'
  | 'Pending Verification'
  | 'Paid'
  | 'Refunded'
  | 'Partially Refunded';

export type WholesaleApplicationStatus = 'pending' | 'approved' | 'rejected';

export type WholesaleInquiryStatus =
  | 'Submitted'
  | 'Under Review'
  | 'Quoted'
  | 'Approved'
  | 'Fulfilled'
  | 'Closed';

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

export interface SiteSettings {
  id: number;
  business_name: string;
  brand_tagline: string;
  owner_name: string;
  email: string;
  whatsapp_number: string;
  currency: string;
  region_label: string;
  announcement_left: string;
  announcement_center: string;
  free_shipping_threshold_cad: number;
  seo_title: string;
  seo_description: string;
  social_facebook: string;
  social_instagram: string;
  social_youtube: string;
  social_pinterest: string;
  logo_light_url: string;
  logo_dark_url: string;
  brand_icon_url: string;
  favicon_url: string;
  header_links: HeaderNavLink[];
  footer_config: FooterConfig;
}

export interface Category {
  id: string;
  slug: string;
  name: string;
  description: string;
  image_url: string;
  display_order: number;
  is_visible: boolean;
}

export interface ProductVariant {
  id: string;
  product_id: string;
  name: string;
  sku: string;
  price_cad: number;
  stock_quantity: number;
  is_available: boolean;
  display_order: number;
}

export interface ProductImage {
  id: string;
  product_id: string;
  image_url: string;
  alt_text: string;
  display_order: number;
  is_primary: boolean;
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  sku: string;
  short_description: string;
  description: string;
  retail_price_cad: number;
  compare_at_price_cad: number | null;
  stock_quantity: number;
  is_published: boolean;
  is_featured: boolean;
  seo_title: string;
  seo_description: string;
  category_ids: string[];
  category_names?: string[];
  images: ProductImage[];
  variants: ProductVariant[];
}

export interface WholesalePriceTier {
  id: string;
  product_id: string;
  moq: number;
  base_wholesale_price_cad: number;
  tier_2_min_qty: number | null;
  tier_2_price_cad: number | null;
  tier_3_min_qty: number | null;
  tier_3_price_cad: number | null;
  is_wholesale_available: boolean;
}

export interface WholesaleProduct extends Product {
  wholesale_tier: WholesalePriceTier;
}

export interface HomepageSection {
  id: string;
  section_key: string;
  title: string;
  subtitle: string;
  body: string;
  cta_primary_label: string;
  cta_primary_href: string;
  cta_secondary_label: string;
  cta_secondary_href: string;
  image_url: string;
  extra_json: Record<string, unknown>;
  is_enabled: boolean;
  display_order: number;
}

export interface Testimonial {
  id: string;
  customer_name: string;
  location: string;
  quote: string;
  rating: number;
  avatar_url: string;
  is_approved: boolean;
  is_published: boolean;
  created_at: string;
}

export interface PageContent {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  content_markdown: string;
  extra_json: Record<string, unknown>;
  seo_title: string;
  seo_description: string;
  updated_at: string;
}

export interface CartItem {
  productId: string;
  variantId?: string;
  slug: string;
  name: string;
  variantName: string;
  priceCad: number;
  quantity: number;
  imageUrl: string;
  maxStock: number;
}

export interface RetailOrderItem {
  id: string;
  product_id: string | null;
  variant_id: string | null;
  product_name: string;
  variant_name: string;
  unit_price_cad: number;
  quantity: number;
  line_total_cad: number;
}

export interface RetailOrder {
  id: string;
  order_reference: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  country: string;
  city: string;
  delivery_address: string;
  order_notes: string;
  internal_notes: string;
  subtotal_cad: number;
  total_cad: number;
  currency: string;
  order_status: OrderStatus;
  payment_status: PaymentStatus;
  whatsapp_message_payload: string;
  created_at: string;
  updated_at: string;
  items?: RetailOrderItem[];
}

export interface WholesaleApplication {
  id: string;
  business_name: string;
  applicant_name: string;
  business_email: string;
  phone: string;
  country: string;
  business_address: string;
  business_type: string;
  website_or_social: string;
  additional_info: string;
  status: WholesaleApplicationStatus;
  rejection_reason: string;
  created_at: string;
}

export interface WholesaleProfile {
  id: string;
  business_name: string;
  contact_name: string;
  business_email: string;
  phone: string;
  country: string;
  business_address: string;
  business_type: string;
  status: 'approved' | 'suspended';
  created_at: string;
}

export interface WholesaleQuotation {
  id: string;
  inquiry_id: string;
  quoted_total_cad: number;
  shipping_estimate_cad: number;
  terms: string;
  valid_until: string | null;
  created_at: string;
}

export interface WholesaleInquiry {
  id: string;
  inquiry_reference: string;
  wholesale_profile_id: string;
  business_name?: string;
  contact_name?: string;
  business_email?: string;
  notes: string;
  estimated_total_cad: number;
  status: WholesaleInquiryStatus;
  created_at: string;
  items: {
    id: string;
    product_id: string;
    product_name: string;
    quantity: number;
    quoted_unit_price_cad: number;
    line_total_cad: number;
  }[];
  quotations: WholesaleQuotation[];
}

export interface MediaAsset {
  id: string;
  file_name: string;
  bucket: string;
  file_url: string;
  mime_type: string;
  file_size_bytes: number;
  alt_text: string;
  created_at: string;
}

export interface ActivityLog {
  id: string;
  actor_email: string;
  action: string;
  entity_type: string;
  entity_id: string;
  details: Record<string, unknown>;
  created_at: string;
}

export interface AdminUser {
  id: string;
  email: string;
  full_name: string;
  role: AdminRole;
  is_active: boolean;
  created_at: string;
}
