import {
  pgTable,
  text,
  integer,
  boolean,
  numeric,
  timestamp,
  jsonb,
  primaryKey,
  index,
} from 'drizzle-orm/pg-core';

// ----------------------------------------------------------------------------
// 1. USERS & ROLE-BASED PERMISSIONS
// ----------------------------------------------------------------------------
export const users = pgTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  full_name: text('full_name').notNull(),
  password_hash: text('password_hash').notNull(),
  role: text('role').notNull().default('customer'),
  is_active: boolean('is_active').notNull().default(true),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// ----------------------------------------------------------------------------
// 2. CATEGORIES & PRODUCT CATALOGUE (CAD RETAIL)
// ----------------------------------------------------------------------------
export const categories = pgTable('categories', {
  id: text('id').primaryKey(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  description: text('description').notNull().default(''),
  image_url: text('image_url').notNull().default(''),
  display_order: integer('display_order').notNull().default(0),
  is_visible: boolean('is_visible').notNull().default(true),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const products = pgTable(
  'products',
  {
    id: text('id').primaryKey(),
    slug: text('slug').notNull().unique(),
    name: text('name').notNull(),
    sku: text('sku').notNull().unique(),
    short_description: text('short_description').notNull().default(''),
    description: text('description').notNull().default(''),
    retail_price_cad: numeric('retail_price_cad', { precision: 10, scale: 2 }).notNull(),
    compare_at_price_cad: numeric('compare_at_price_cad', { precision: 10, scale: 2 }),
    stock_quantity: integer('stock_quantity').notNull().default(0),
    is_published: boolean('is_published').notNull().default(true),
    is_featured: boolean('is_featured').notNull().default(false),
    seo_title: text('seo_title').notNull().default(''),
    seo_description: text('seo_description').notNull().default(''),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index('idx_products_published').on(table.is_published, table.is_featured)]
);

export const productImages = pgTable('product_images', {
  id: text('id').primaryKey(),
  product_id: text('product_id')
    .notNull()
    .references(() => products.id, { onDelete: 'cascade' }),
  image_url: text('image_url').notNull(),
  alt_text: text('alt_text').notNull().default(''),
  display_order: integer('display_order').notNull().default(0),
  is_primary: boolean('is_primary').notNull().default(false),
});

export const productVariants = pgTable(
  'product_variants',
  {
    id: text('id').primaryKey(),
    product_id: text('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    sku: text('sku').notNull(),
    price_cad: numeric('price_cad', { precision: 10, scale: 2 }).notNull(),
    stock_quantity: integer('stock_quantity').notNull().default(0),
    is_available: boolean('is_available').notNull().default(true),
    display_order: integer('display_order').notNull().default(0),
  },
  (table) => [index('idx_product_variants_product').on(table.product_id)]
);

export const productCategories = pgTable(
  'product_categories',
  {
    product_id: text('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    category_id: text('category_id')
      .notNull()
      .references(() => categories.id, { onDelete: 'cascade' }),
  },
  (table) => [primaryKey({ columns: [table.product_id, table.category_id] })]
);

// ----------------------------------------------------------------------------
// 3. CUSTOMERS & RETAIL WHATSAPP ORDERS
// ----------------------------------------------------------------------------
export const customers = pgTable('customers', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  full_name: text('full_name').notNull(),
  phone: text('phone').notNull(),
  country: text('country').notNull(),
  city: text('city').notNull(),
  delivery_address: text('delivery_address').notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const retailOrders = pgTable(
  'retail_orders',
  {
    id: text('id').primaryKey(),
    order_reference: text('order_reference').notNull().unique(),
    customer_id: text('customer_id').references(() => customers.id, { onDelete: 'set null' }),
    customer_name: text('customer_name').notNull(),
    customer_email: text('customer_email').notNull(),
    customer_phone: text('customer_phone').notNull(),
    country: text('country').notNull(),
    city: text('city').notNull(),
    delivery_address: text('delivery_address').notNull(),
    order_notes: text('order_notes').notNull().default(''),
    internal_notes: text('internal_notes').notNull().default(''),
    subtotal_cad: numeric('subtotal_cad', { precision: 10, scale: 2 }).notNull(),
    total_cad: numeric('total_cad', { precision: 10, scale: 2 }).notNull(),
    currency: text('currency').notNull().default('CAD'),
    order_status: text('order_status').notNull().default('Awaiting WhatsApp Confirmation'),
    payment_status: text('payment_status').notNull().default('Unpaid'),
    whatsapp_message_payload: text('whatsapp_message_payload').notNull().default(''),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_retail_orders_ref').on(table.order_reference),
    index('idx_retail_orders_status').on(table.order_status, table.payment_status),
  ]
);

export const retailOrderItems = pgTable('retail_order_items', {
  id: text('id').primaryKey(),
  order_id: text('order_id')
    .notNull()
    .references(() => retailOrders.id, { onDelete: 'cascade' }),
  product_id: text('product_id').references(() => products.id, { onDelete: 'set null' }),
  variant_id: text('variant_id').references(() => productVariants.id, { onDelete: 'set null' }),
  product_name: text('product_name').notNull(),
  variant_name: text('variant_name').notNull().default(''),
  unit_price_cad: numeric('unit_price_cad', { precision: 10, scale: 2 }).notNull(),
  quantity: integer('quantity').notNull(),
  line_total_cad: numeric('line_total_cad', { precision: 10, scale: 2 }).notNull(),
});

// ----------------------------------------------------------------------------
// 4. WHOLESALE APPLICATIONS, PROFILES, PRICING TIERS & ENQUIRIES
// ----------------------------------------------------------------------------
export const wholesaleApplications = pgTable(
  'wholesale_applications',
  {
    id: text('id').primaryKey(),
    business_name: text('business_name').notNull(),
    applicant_name: text('applicant_name').notNull(),
    business_email: text('business_email').notNull().unique(),
    phone: text('phone').notNull(),
    country: text('country').notNull(),
    business_address: text('business_address').notNull(),
    business_type: text('business_type').notNull(),
    website_or_social: text('website_or_social').notNull().default(''),
    additional_info: text('additional_info').notNull().default(''),
    password_hash: text('password_hash').notNull(),
    status: text('status').notNull().default('pending'),
    rejection_reason: text('rejection_reason').notNull().default(''),
    reviewed_at: timestamp('reviewed_at', { withTimezone: true }),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index('idx_wholesale_apps_status').on(table.status)]
);

export const wholesaleProfiles = pgTable('wholesale_profiles', {
  id: text('id').primaryKey(),
  user_id: text('user_id')
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: 'cascade' }),
  application_id: text('application_id').references(() => wholesaleApplications.id, {
    onDelete: 'set null',
  }),
  business_name: text('business_name').notNull(),
  contact_name: text('contact_name').notNull(),
  business_email: text('business_email').notNull().unique(),
  phone: text('phone').notNull(),
  country: text('country').notNull(),
  business_address: text('business_address').notNull(),
  business_type: text('business_type').notNull(),
  status: text('status').notNull().default('approved'),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const wholesalePriceTiers = pgTable('wholesale_price_tiers', {
  id: text('id').primaryKey(),
  product_id: text('product_id')
    .notNull()
    .unique()
    .references(() => products.id, { onDelete: 'cascade' }),
  moq: integer('moq').notNull().default(10),
  base_wholesale_price_cad: numeric('base_wholesale_price_cad', { precision: 10, scale: 2 }).notNull(),
  tier_2_min_qty: integer('tier_2_min_qty'),
  tier_2_price_cad: numeric('tier_2_price_cad', { precision: 10, scale: 2 }),
  tier_3_min_qty: integer('tier_3_min_qty'),
  tier_3_price_cad: numeric('tier_3_price_cad', { precision: 10, scale: 2 }),
  is_wholesale_available: boolean('is_wholesale_available').notNull().default(true),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const wholesaleInquiries = pgTable(
  'wholesale_inquiries',
  {
    id: text('id').primaryKey(),
    inquiry_reference: text('inquiry_reference').notNull().unique(),
    wholesale_profile_id: text('wholesale_profile_id')
      .notNull()
      .references(() => wholesaleProfiles.id, { onDelete: 'cascade' }),
    notes: text('notes').notNull().default(''),
    estimated_total_cad: numeric('estimated_total_cad', { precision: 10, scale: 2 }).notNull().default('0'),
    status: text('status').notNull().default('Submitted'),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index('idx_wholesale_inquiries_profile').on(table.wholesale_profile_id)]
);

export const wholesaleInquiryItems = pgTable('wholesale_inquiry_items', {
  id: text('id').primaryKey(),
  inquiry_id: text('inquiry_id')
    .notNull()
    .references(() => wholesaleInquiries.id, { onDelete: 'cascade' }),
  product_id: text('product_id').references(() => products.id, { onDelete: 'set null' }),
  product_name: text('product_name').notNull(),
  quantity: integer('quantity').notNull(),
  quoted_unit_price_cad: numeric('quoted_unit_price_cad', { precision: 10, scale: 2 }).notNull(),
  line_total_cad: numeric('line_total_cad', { precision: 10, scale: 2 }).notNull(),
});

export const wholesaleQuotations = pgTable('wholesale_quotations', {
  id: text('id').primaryKey(),
  inquiry_id: text('inquiry_id')
    .notNull()
    .references(() => wholesaleInquiries.id, { onDelete: 'cascade' }),
  quoted_total_cad: numeric('quoted_total_cad', { precision: 10, scale: 2 }).notNull(),
  shipping_estimate_cad: numeric('shipping_estimate_cad', { precision: 10, scale: 2 }).notNull().default('0'),
  terms: text('terms').notNull().default(''),
  valid_until: text('valid_until'),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// ----------------------------------------------------------------------------
// 5. CMS, HOMEPAGE, MEDIA (VERCEL BLOB), TESTIMONIALS, SETTINGS & AUDIT LOGS
// ----------------------------------------------------------------------------
export const siteSettings = pgTable('site_settings', {
  id: integer('id').primaryKey(),
  business_name: text('business_name').notNull().default('Kytura Naturals'),
  owner_name: text('owner_name').notNull().default('Dr Ann Merah'),
  email: text('email').notNull().default('kyturanaturals@gmail.com'),
  whatsapp_number: text('whatsapp_number').notNull().default('+14033719687'),
  currency: text('currency').notNull().default('CAD'),
  region_label: text('region_label').notNull().default('Global / All Regions'),
  announcement_left: text('announcement_left').notNull().default('Discover Natural Wellness with Kytura Naturals'),
  announcement_center: text('announcement_center').notNull().default('Free Worldwide Shipping on Orders Over $100 CAD'),
  free_shipping_threshold_cad: numeric('free_shipping_threshold_cad', { precision: 10, scale: 2 }).notNull().default('100.00'),
  seo_title: text('seo_title').notNull().default('Kytura Naturals | Botanical Wellness, Diffuser Oils & Ultrasonic Diffusers'),
  seo_description: text('seo_description').notNull().default('Explore botanical diffuser oil blends, body and massage oils, and ultrasonic diffusers from Kytura Naturals.'),
  social_facebook: text('social_facebook').notNull().default(''),
  social_instagram: text('social_instagram').notNull().default(''),
  social_youtube: text('social_youtube').notNull().default(''),
  social_pinterest: text('social_pinterest').notNull().default(''),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const homepageSections = pgTable('homepage_sections', {
  id: text('id').primaryKey(),
  section_key: text('section_key').notNull().unique(),
  title: text('title').notNull().default(''),
  subtitle: text('subtitle').notNull().default(''),
  body: text('body').notNull().default(''),
  cta_primary_label: text('cta_primary_label').notNull().default(''),
  cta_primary_href: text('cta_primary_href').notNull().default(''),
  cta_secondary_label: text('cta_secondary_label').notNull().default(''),
  cta_secondary_href: text('cta_secondary_href').notNull().default(''),
  image_url: text('image_url').notNull().default(''),
  extra_json: jsonb('extra_json').$type<Record<string, unknown>>().notNull().default({}),
  is_enabled: boolean('is_enabled').notNull().default(true),
  display_order: integer('display_order').notNull().default(0),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const testimonials = pgTable('testimonials', {
  id: text('id').primaryKey(),
  customer_name: text('customer_name').notNull(),
  location: text('location').notNull().default(''),
  quote: text('quote').notNull(),
  rating: integer('rating').notNull().default(5),
  avatar_url: text('avatar_url').notNull().default(''),
  is_approved: boolean('is_approved').notNull().default(false),
  is_published: boolean('is_published').notNull().default(false),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const pages = pgTable('pages', {
  id: text('id').primaryKey(),
  slug: text('slug').notNull().unique(),
  title: text('title').notNull(),
  subtitle: text('subtitle').notNull().default(''),
  content_markdown: text('content_markdown').notNull().default(''),
  extra_json: jsonb('extra_json').$type<Record<string, unknown>>().notNull().default({}),
  seo_title: text('seo_title').notNull().default(''),
  seo_description: text('seo_description').notNull().default(''),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const mediaLibrary = pgTable('media_library', {
  id: text('id').primaryKey(),
  file_name: text('file_name').notNull(),
  bucket: text('bucket').notNull().default('media-library'),
  file_url: text('file_url').notNull(),
  mime_type: text('mime_type').notNull(),
  file_size_bytes: integer('file_size_bytes').notNull().default(0),
  alt_text: text('alt_text').notNull().default(''),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const activityLogs = pgTable(
  'activity_logs',
  {
    id: text('id').primaryKey(),
    actor_email: text('actor_email').notNull().default('system'),
    action: text('action').notNull(),
    entity_type: text('entity_type').notNull(),
    entity_id: text('entity_id').notNull().default(''),
    details: jsonb('details').$type<Record<string, unknown>>().notNull().default({}),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index('idx_activity_logs_created').on(table.created_at)]
);

export const newsletterSubscribers = pgTable('newsletter_subscribers', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const contactMessages = pgTable('contact_messages', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull(),
  phone: text('phone').notNull().default(''),
  subject: text('subject').notNull().default(''),
  message: text('message').notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
