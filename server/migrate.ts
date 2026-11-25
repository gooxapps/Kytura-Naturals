import 'dotenv/config';
import crypto from 'node:crypto';
import { count } from 'drizzle-orm';
import { getNeonDb, getNeonSqlClient, isNeonConfigured } from './neonDb.ts';
import * as schema from '../src/db/schema.ts';
import { DEFAULT_FOOTER_CONFIG, DEFAULT_HEADER_LINKS } from './siteDefaults.ts';

const PG_DDL_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'customer',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );`,
  `CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY,
    slug TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    image_url TEXT NOT NULL DEFAULT '',
    display_order INTEGER NOT NULL DEFAULT 0,
    is_visible BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );`,
  `CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    slug TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    sku TEXT NOT NULL UNIQUE,
    short_description TEXT NOT NULL DEFAULT '',
    description TEXT NOT NULL DEFAULT '',
    retail_price_cad NUMERIC(10, 2) NOT NULL,
    compare_at_price_cad NUMERIC(10, 2),
    stock_quantity INTEGER NOT NULL DEFAULT 0,
    is_published BOOLEAN NOT NULL DEFAULT TRUE,
    is_featured BOOLEAN NOT NULL DEFAULT FALSE,
    seo_title TEXT NOT NULL DEFAULT '',
    seo_description TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );`,
  `CREATE INDEX IF NOT EXISTS idx_products_published ON products (is_published, is_featured);`,
  `CREATE TABLE IF NOT EXISTS product_images (
    id TEXT PRIMARY KEY,
    product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    alt_text TEXT NOT NULL DEFAULT '',
    display_order INTEGER NOT NULL DEFAULT 0,
    is_primary BOOLEAN NOT NULL DEFAULT FALSE
  );`,
  `CREATE TABLE IF NOT EXISTS product_variants (
    id TEXT PRIMARY KEY,
    product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    sku TEXT NOT NULL,
    price_cad NUMERIC(10, 2) NOT NULL,
    stock_quantity INTEGER NOT NULL DEFAULT 0,
    is_available BOOLEAN NOT NULL DEFAULT TRUE,
    display_order INTEGER NOT NULL DEFAULT 0
  );`,
  `CREATE INDEX IF NOT EXISTS idx_product_variants_product ON product_variants (product_id);`,
  `CREATE TABLE IF NOT EXISTS product_categories (
    product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    category_id TEXT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    PRIMARY KEY (product_id, category_id)
  );`,
  `CREATE TABLE IF NOT EXISTS customers (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    country TEXT NOT NULL,
    city TEXT NOT NULL,
    delivery_address TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );`,
  `CREATE TABLE IF NOT EXISTS retail_orders (
    id TEXT PRIMARY KEY,
    order_reference TEXT NOT NULL UNIQUE,
    customer_id TEXT REFERENCES customers(id) ON DELETE SET NULL,
    customer_name TEXT NOT NULL,
    customer_email TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    country TEXT NOT NULL,
    city TEXT NOT NULL,
    delivery_address TEXT NOT NULL,
    order_notes TEXT NOT NULL DEFAULT '',
    internal_notes TEXT NOT NULL DEFAULT '',
    subtotal_cad NUMERIC(10, 2) NOT NULL,
    total_cad NUMERIC(10, 2) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'CAD',
    order_status TEXT NOT NULL DEFAULT 'Awaiting WhatsApp Confirmation',
    payment_status TEXT NOT NULL DEFAULT 'Unpaid',
    whatsapp_message_payload TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );`,
  `CREATE INDEX IF NOT EXISTS idx_retail_orders_ref ON retail_orders (order_reference);`,
  `CREATE INDEX IF NOT EXISTS idx_retail_orders_status ON retail_orders (order_status, payment_status);`,
  `CREATE TABLE IF NOT EXISTS retail_order_items (
    id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL REFERENCES retail_orders(id) ON DELETE CASCADE,
    product_id TEXT REFERENCES products(id) ON DELETE SET NULL,
    variant_id TEXT REFERENCES product_variants(id) ON DELETE SET NULL,
    product_name TEXT NOT NULL,
    variant_name TEXT NOT NULL DEFAULT '',
    unit_price_cad NUMERIC(10, 2) NOT NULL,
    quantity INTEGER NOT NULL,
    line_total_cad NUMERIC(10, 2) NOT NULL
  );`,
  `CREATE TABLE IF NOT EXISTS wholesale_applications (
    id TEXT PRIMARY KEY,
    business_name TEXT NOT NULL,
    applicant_name TEXT NOT NULL,
    business_email TEXT NOT NULL UNIQUE,
    phone TEXT NOT NULL,
    country TEXT NOT NULL,
    business_address TEXT NOT NULL,
    business_type TEXT NOT NULL,
    website_or_social TEXT NOT NULL DEFAULT '',
    additional_info TEXT NOT NULL DEFAULT '',
    password_hash TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    rejection_reason TEXT NOT NULL DEFAULT '',
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );`,
  `CREATE INDEX IF NOT EXISTS idx_wholesale_apps_status ON wholesale_applications (status);`,
  `CREATE TABLE IF NOT EXISTS wholesale_profiles (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    application_id TEXT REFERENCES wholesale_applications(id) ON DELETE SET NULL,
    business_name TEXT NOT NULL,
    contact_name TEXT NOT NULL,
    business_email TEXT NOT NULL UNIQUE,
    phone TEXT NOT NULL,
    country TEXT NOT NULL,
    business_address TEXT NOT NULL,
    business_type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'approved',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );`,
  `CREATE TABLE IF NOT EXISTS wholesale_price_tiers (
    id TEXT PRIMARY KEY,
    product_id TEXT NOT NULL UNIQUE REFERENCES products(id) ON DELETE CASCADE,
    moq INTEGER NOT NULL DEFAULT 10,
    base_wholesale_price_cad NUMERIC(10, 2) NOT NULL,
    tier_2_min_qty INTEGER,
    tier_2_price_cad NUMERIC(10, 2),
    tier_3_min_qty INTEGER,
    tier_3_price_cad NUMERIC(10, 2),
    is_wholesale_available BOOLEAN NOT NULL DEFAULT TRUE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );`,
  `CREATE TABLE IF NOT EXISTS wholesale_inquiries (
    id TEXT PRIMARY KEY,
    inquiry_reference TEXT NOT NULL UNIQUE,
    wholesale_profile_id TEXT NOT NULL REFERENCES wholesale_profiles(id) ON DELETE CASCADE,
    notes TEXT NOT NULL DEFAULT '',
    estimated_total_cad NUMERIC(10, 2) NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'Submitted',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );`,
  `CREATE INDEX IF NOT EXISTS idx_wholesale_inquiries_profile ON wholesale_inquiries (wholesale_profile_id);`,
  `CREATE TABLE IF NOT EXISTS wholesale_inquiry_items (
    id TEXT PRIMARY KEY,
    inquiry_id TEXT NOT NULL REFERENCES wholesale_inquiries(id) ON DELETE CASCADE,
    product_id TEXT REFERENCES products(id) ON DELETE SET NULL,
    product_name TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    quoted_unit_price_cad NUMERIC(10, 2) NOT NULL,
    line_total_cad NUMERIC(10, 2) NOT NULL
  );`,
  `CREATE TABLE IF NOT EXISTS wholesale_quotations (
    id TEXT PRIMARY KEY,
    inquiry_id TEXT NOT NULL REFERENCES wholesale_inquiries(id) ON DELETE CASCADE,
    quoted_total_cad NUMERIC(10, 2) NOT NULL,
    shipping_estimate_cad NUMERIC(10, 2) NOT NULL DEFAULT 0,
    terms TEXT NOT NULL DEFAULT '',
    valid_until TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );`,
  `CREATE TABLE IF NOT EXISTS site_settings (
    id INTEGER PRIMARY KEY,
    business_name TEXT NOT NULL DEFAULT 'Kytura Naturals',
    brand_tagline TEXT NOT NULL DEFAULT 'BOTANICAL WELLNESS · NATURAL LIVING',
    owner_name TEXT NOT NULL DEFAULT 'Dr Ann Merah',
    email TEXT NOT NULL DEFAULT 'kyturanaturals@gmail.com',
    whatsapp_number TEXT NOT NULL DEFAULT '+14033719687',
    currency TEXT NOT NULL DEFAULT 'CAD',
    region_label TEXT NOT NULL DEFAULT 'Global / All Regions',
    announcement_left TEXT NOT NULL DEFAULT 'Discover Natural Wellness with Kytura Naturals',
    announcement_center TEXT NOT NULL DEFAULT 'Free Worldwide Shipping on Orders Over $100 CAD',
    free_shipping_threshold_cad NUMERIC(10, 2) NOT NULL DEFAULT 100.00,
    seo_title TEXT NOT NULL DEFAULT 'Kytura Naturals | Botanical Wellness, Diffuser Oils & Ultrasonic Diffusers',
    seo_description TEXT NOT NULL DEFAULT 'Explore botanical diffuser oil blends, body and massage oils, and ultrasonic diffusers from Kytura Naturals.',
    social_facebook TEXT NOT NULL DEFAULT '',
    social_instagram TEXT NOT NULL DEFAULT '',
    social_youtube TEXT NOT NULL DEFAULT '',
    social_pinterest TEXT NOT NULL DEFAULT '',
    logo_light_url TEXT NOT NULL DEFAULT '',
    logo_dark_url TEXT NOT NULL DEFAULT '',
    brand_icon_url TEXT NOT NULL DEFAULT '',
    favicon_url TEXT NOT NULL DEFAULT '',
    header_links JSONB NOT NULL DEFAULT '[]'::jsonb,
    footer_config JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );`,
  `ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS brand_tagline TEXT NOT NULL DEFAULT 'BOTANICAL WELLNESS · NATURAL LIVING';`,
  `ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS logo_light_url TEXT NOT NULL DEFAULT '';`,
  `ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS logo_dark_url TEXT NOT NULL DEFAULT '';`,
  `ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS brand_icon_url TEXT NOT NULL DEFAULT '';`,
  `ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS favicon_url TEXT NOT NULL DEFAULT '';`,
  `ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS header_links JSONB NOT NULL DEFAULT '[]'::jsonb;`,
  `ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS footer_config JSONB NOT NULL DEFAULT '{}'::jsonb;`,
  `CREATE TABLE IF NOT EXISTS homepage_sections (
    id TEXT PRIMARY KEY,
    section_key TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL DEFAULT '',
    subtitle TEXT NOT NULL DEFAULT '',
    body TEXT NOT NULL DEFAULT '',
    cta_primary_label TEXT NOT NULL DEFAULT '',
    cta_primary_href TEXT NOT NULL DEFAULT '',
    cta_secondary_label TEXT NOT NULL DEFAULT '',
    cta_secondary_href TEXT NOT NULL DEFAULT '',
    image_url TEXT NOT NULL DEFAULT '',
    extra_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    display_order INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );`,
  `CREATE TABLE IF NOT EXISTS testimonials (
    id TEXT PRIMARY KEY,
    customer_name TEXT NOT NULL,
    location TEXT NOT NULL DEFAULT '',
    quote TEXT NOT NULL,
    rating INTEGER NOT NULL DEFAULT 5,
    avatar_url TEXT NOT NULL DEFAULT '',
    is_approved BOOLEAN NOT NULL DEFAULT FALSE,
    is_published BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );`,
  `CREATE TABLE IF NOT EXISTS pages (
    id TEXT PRIMARY KEY,
    slug TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    subtitle TEXT NOT NULL DEFAULT '',
    content_markdown TEXT NOT NULL DEFAULT '',
    extra_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    seo_title TEXT NOT NULL DEFAULT '',
    seo_description TEXT NOT NULL DEFAULT '',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );`,
  `CREATE TABLE IF NOT EXISTS media_library (
    id TEXT PRIMARY KEY,
    file_name TEXT NOT NULL,
    bucket TEXT NOT NULL DEFAULT 'media-library',
    file_url TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    file_size_bytes INTEGER NOT NULL DEFAULT 0,
    alt_text TEXT NOT NULL DEFAULT '',
    file_data TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );`,
  `ALTER TABLE media_library ADD COLUMN IF NOT EXISTS file_data TEXT NOT NULL DEFAULT '';`,
  `CREATE TABLE IF NOT EXISTS activity_logs (
    id TEXT PRIMARY KEY,
    actor_email TEXT NOT NULL DEFAULT 'system',
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL DEFAULT '',
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );`,
  `CREATE INDEX IF NOT EXISTS idx_activity_logs_created ON activity_logs (created_at);`,
  `CREATE TABLE IF NOT EXISTS newsletter_subscribers (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );`,
  `CREATE TABLE IF NOT EXISTS contact_messages (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL DEFAULT '',
    subject TEXT NOT NULL DEFAULT '',
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );`,
];

let neonBootstrapped = false;

export async function ensureNeonSchemaAndSeed(): Promise<void> {
  if (!isNeonConfigured() || neonBootstrapped) return;

  const sqlClient = getNeonSqlClient();
  const db = getNeonDb();

  // Safe idempotent DDL creation — never drops or overwrites existing tables
  for (const stmt of PG_DDL_STATEMENTS) {
    await sqlClient.query(stmt);
  }

  // Non-destructive initial seeding (only inserts missing baseline records)
  await db
    .insert(schema.siteSettings)
    .values({
      id: 1,
      business_name: 'Kytura Naturals',
      owner_name: 'Dr Ann Merah',
      email: 'kyturanaturals@gmail.com',
      whatsapp_number: '+14033719687',
      currency: 'CAD',
      region_label: 'Global / All Regions',
      announcement_left: 'Discover Natural Wellness with Kytura Naturals',
      announcement_center: 'Free Worldwide Shipping on Orders Over $100 CAD',
      free_shipping_threshold_cad: '100.00',
      header_links: DEFAULT_HEADER_LINKS as unknown as Array<Record<string, unknown>>,
      footer_config: DEFAULT_FOOTER_CONFIG as unknown as Record<string, unknown>,
    })
    .onConflictDoNothing();

  const [{ value: catCount }] = await db.select({ value: count() }).from(schema.categories);
  if (Number(catCount) === 0) {
    await db.insert(schema.categories).values([
      {
        id: 'cat-diffuser-oils',
        slug: 'diffuser-oil-blends',
        name: 'Diffuser Oil Blends',
        description: 'Organic botanical diffuser oil blends crafted for calm, welcoming living spaces.',
        image_url: '/src/assets/images/diffuser_oil_lavender_1795486733710.jpg',
        display_order: 1,
        is_visible: true,
      },
      {
        id: 'cat-body-oils',
        slug: 'body-massage-oils',
        name: 'Body & Massage Oils',
        description: 'Silky botanical body and massage oils designed for daily skin nourishment and relaxation.',
        image_url: '/src/assets/images/body_oil_rose_golden_1795486734558.jpg',
        display_order: 2,
        is_visible: true,
      },
      {
        id: 'cat-diffusers',
        slug: 'ultrasonic-diffusers',
        name: 'Ultrasonic Diffusers',
        description: 'Thoughtfully selected ultrasonic mist diffusers blending warm natural textures with quiet operation.',
        image_url: '/src/assets/images/ultrasonic_wood_diffuser_1795486734881.jpg',
        display_order: 3,
        is_visible: true,
      },
      {
        id: 'cat-wellness-sets',
        slug: 'wellness-collections',
        name: 'Wellness Collections',
        description: 'Curated pairings of diffuser blends, body oils, and ultrasonic diffusers for home rituals and gifting.',
        image_url: '/src/assets/images/wellness_spa_collection_1795486735845.jpg',
        display_order: 4,
        is_visible: true,
      },
    ]);
  }

  const [{ value: prodCount }] = await db.select({ value: count() }).from(schema.products);
  if (Number(prodCount) === 0) {
    const starterProducts = [
      {
        id: 'prod-calm-evening-blend',
        slug: 'calm-evening-diffuser-oil-blend',
        name: 'Calm Evening Diffuser Oil Blend',
        sku: 'KN-DOB-001',
        short_description: 'Organic diffuser oil blend crafted for serene evening spaces.',
        description: 'Formulated for ultrasonic diffusers, this organic botanical diffuser oil blend brings a calm, grounding atmosphere to bedrooms, lounges, and wellness studios.',
        retail_price_cad: '28.00',
        compare_at_price_cad: null,
        stock_quantity: 45,
        is_featured: true,
        category_id: 'cat-diffuser-oils',
        image_url: '/src/assets/images/diffuser_oil_lavender_1795486733710.jpg',
        variants: [
          { name: '15 mL Amber Dropper', sku: 'KN-DOB-001-15', price_cad: '28.00', stock_quantity: 30 },
          { name: '30 mL Amber Dropper', sku: 'KN-DOB-001-30', price_cad: '46.00', stock_quantity: 15 },
        ],
        wholesale: { moq: 12, base: '16.50', t2qty: 24, t2price: '14.50', t3qty: 48, t3price: '12.75' },
      },
      {
        id: 'prod-botanical-sanctuary-oil',
        slug: 'botanical-sanctuary-diffuser-oil',
        name: 'Botanical Sanctuary Diffuser Oil',
        sku: 'KN-DOB-002',
        short_description: 'Aromatic botanical blend suited for daily home diffusion.',
        description: 'An everyday organic diffuser oil blend packaged in UV-protective glass to preserve aromatic freshness.',
        retail_price_cad: '30.00',
        compare_at_price_cad: null,
        stock_quantity: 38,
        is_featured: true,
        category_id: 'cat-diffuser-oils',
        image_url: '/src/assets/images/wholesale_amber_lavender_1795486736444.jpg',
        variants: [
          { name: '15 mL Glass Bottle', sku: 'KN-DOB-002-15', price_cad: '30.00', stock_quantity: 25 },
          { name: '30 mL Glass Bottle', sku: 'KN-DOB-002-30', price_cad: '49.00', stock_quantity: 13 },
        ],
        wholesale: { moq: 12, base: '17.50', t2qty: 24, t2price: '15.50', t3qty: 48, t3price: '13.75' },
      },
      {
        id: 'prod-velvet-rose-body-oil',
        slug: 'velvet-rose-body-massage-oil',
        name: 'Velvet Rose Body & Massage Oil',
        sku: 'KN-BMO-001',
        short_description: 'Lightweight botanical body and massage oil with a silky finish.',
        description: 'A luxurious body and massage oil designed for smooth glide and soft skin feel after bathing or during quiet massage rituals.',
        retail_price_cad: '42.00',
        compare_at_price_cad: null,
        stock_quantity: 32,
        is_featured: true,
        category_id: 'cat-body-oils',
        image_url: '/src/assets/images/body_oil_rose_golden_1795486734558.jpg',
        variants: [
          { name: '100 mL Dropper Bottle', sku: 'KN-BMO-001-100', price_cad: '42.00', stock_quantity: 20 },
          { name: '200 mL Studio Bottle', sku: 'KN-BMO-001-200', price_cad: '72.00', stock_quantity: 12 },
        ],
        wholesale: { moq: 10, base: '24.00', t2qty: 25, t2price: '21.50', t3qty: 50, t3price: '19.00' },
      },
      {
        id: 'prod-golden-botanical-massage',
        slug: 'golden-botanical-massage-oil',
        name: 'Golden Botanical Massage Oil',
        sku: 'KN-BMO-002',
        short_description: 'Nourishing golden oil blend for spa and personal body care.',
        description: 'Crafted for unhurried massage and daily moisturizing routines, housed in a clear glass apothecary bottle.',
        retail_price_cad: '38.00',
        compare_at_price_cad: null,
        stock_quantity: 28,
        is_featured: false,
        category_id: 'cat-body-oils',
        image_url: '/src/assets/images/body_oil_rose_golden_1795486734558.jpg',
        variants: [
          { name: '100 mL Glass Bottle', sku: 'KN-BMO-002-100', price_cad: '38.00', stock_quantity: 18 },
          { name: '200 mL Glass Bottle', sku: 'KN-BMO-002-200', price_cad: '65.00', stock_quantity: 10 },
        ],
        wholesale: { moq: 10, base: '22.00', t2qty: 25, t2price: '19.50', t3qty: 50, t3price: '17.50' },
      },
      {
        id: 'prod-woodgrain-ultrasonic-diffuser',
        slug: 'woodgrain-ultrasonic-mist-diffuser',
        name: 'Woodgrain Ultrasonic Mist Diffuser',
        sku: 'KN-USD-001',
        short_description: 'Quiet dome-shaped ultrasonic aromatherapy diffuser with warm ambient ring.',
        description: 'Thoughtfully selected ultrasonic mist diffuser featuring a natural woodgrain finish, soft ambient light ring, and whisper-quiet fine cool mist output.',
        retail_price_cad: '78.00',
        compare_at_price_cad: null,
        stock_quantity: 20,
        is_featured: true,
        category_id: 'cat-diffusers',
        image_url: '/src/assets/images/ultrasonic_wood_diffuser_1795486734881.jpg',
        variants: [
          { name: 'Warm Oak · 300 mL Reservoir', sku: 'KN-USD-001-OAK', price_cad: '78.00', stock_quantity: 20 },
        ],
        wholesale: { moq: 6, base: '46.00', t2qty: 15, t2price: '41.00', t3qty: 30, t3price: '37.50' },
      },
      {
        id: 'prod-evening-sanctuary-set',
        slug: 'evening-sanctuary-wellness-collection',
        name: 'Evening Sanctuary Wellness Set',
        sku: 'KN-WLC-001',
        short_description: 'Curated wellness pairing combining an ultrasonic diffuser and diffuser oil blend.',
        description: 'A cohesive wellness collection pairing our Woodgrain Ultrasonic Mist Diffuser with a 15 mL Calm Evening Diffuser Oil Blend.',
        retail_price_cad: '98.00',
        compare_at_price_cad: '106.00',
        stock_quantity: 15,
        is_featured: false,
        category_id: 'cat-wellness-sets',
        image_url: '/src/assets/images/wellness_spa_collection_1795486735845.jpg',
        variants: [
          { name: 'Diffuser + 15 mL Oil Set', sku: 'KN-WLC-001-SET', price_cad: '98.00', stock_quantity: 15 },
        ],
        wholesale: { moq: 6, base: '59.00', t2qty: 12, t2price: '54.00', t3qty: 24, t3price: '49.00' },
      },
    ];

    for (const p of starterProducts) {
      await db.insert(schema.products).values({
        id: p.id,
        slug: p.slug,
        name: p.name,
        sku: p.sku,
        short_description: p.short_description,
        description: p.description,
        retail_price_cad: p.retail_price_cad,
        compare_at_price_cad: p.compare_at_price_cad,
        stock_quantity: p.stock_quantity,
        is_published: true,
        is_featured: p.is_featured,
        seo_title: `${p.name} | Kytura Naturals`,
        seo_description: p.short_description,
      });
      await db.insert(schema.productImages).values({
        id: crypto.randomUUID(),
        product_id: p.id,
        image_url: p.image_url,
        alt_text: p.name,
        display_order: 0,
        is_primary: true,
      });
      for (let i = 0; i < p.variants.length; i++) {
        const v = p.variants[i];
        await db.insert(schema.productVariants).values({
          id: crypto.randomUUID(),
          product_id: p.id,
          name: v.name,
          sku: v.sku,
          price_cad: v.price_cad,
          stock_quantity: v.stock_quantity,
          is_available: true,
          display_order: i,
        });
      }
      await db.insert(schema.productCategories).values({
        product_id: p.id,
        category_id: p.category_id,
      });
      await db.insert(schema.wholesalePriceTiers).values({
        id: crypto.randomUUID(),
        product_id: p.id,
        moq: p.wholesale.moq,
        base_wholesale_price_cad: p.wholesale.base,
        tier_2_min_qty: p.wholesale.t2qty,
        tier_2_price_cad: p.wholesale.t2price,
        tier_3_min_qty: p.wholesale.t3qty,
        tier_3_price_cad: p.wholesale.t3price,
        is_wholesale_available: true,
      });
    }
  }

  const [{ value: secCount }] = await db.select({ value: count() }).from(schema.homepageSections);
  if (Number(secCount) === 0) {
    await db.insert(schema.homepageSections).values([
      {
        id: 'sec-hero',
        section_key: 'hero',
        title: 'Reconnect With Nature.\nRediscover Wellness.',
        subtitle: 'Explore botanical oil blends, luxurious body and massage oils, and thoughtfully selected aromatherapy diffusers.',
        cta_primary_label: 'Explore Collection',
        cta_primary_href: '/shop',
        cta_secondary_label: 'Discover Our Products',
        cta_secondary_href: '/collections/diffuser-oil-blends',
        image_url: '/src/assets/images/hero_botanical_wellness_1795486732844.jpg',
        extra_json: {},
        is_enabled: true,
        display_order: 1,
      },
      {
        id: 'sec-benefits',
        section_key: 'benefits',
        title: 'Why Kytura Naturals',
        extra_json: {
          items: [
            { icon: 'gem', title: 'Botanical Focus', subtitle: 'Thoughtfully Curated Oils' },
            { icon: 'globe', title: 'Worldwide Delivery', subtitle: 'Shipping Across Regions' },
            { icon: 'headphones', title: 'Dedicated Support', subtitle: 'Direct WhatsApp Assistance' },
            { icon: 'shield', title: 'Personal Confirmation', subtitle: 'Direct Order Review' },
          ],
        },
        is_enabled: true,
        display_order: 2,
      },
      {
        id: 'sec-collections',
        section_key: 'collections',
        title: 'Shop Our Collections',
        cta_primary_label: 'Shop Now',
        cta_primary_href: '/shop',
        is_enabled: true,
        display_order: 3,
      },
      {
        id: 'sec-featured',
        section_key: 'featured_products',
        title: 'Featured Products',
        subtitle: 'Botanical essentials priced in Canadian Dollars (CAD).',
        cta_primary_label: 'View All Products',
        cta_primary_href: '/shop',
        is_enabled: true,
        display_order: 4,
      },
      {
        id: 'sec-story',
        section_key: 'brand_story',
        title: 'Rooted in Botanical Wellness',
        subtitle: 'Founded by Dr Ann Merah',
        body: 'Kytura Naturals offers organic diffuser oil blends, body and massage oils, and ultrasonic diffusers for peaceful daily living. Every retail order is personally confirmed via WhatsApp, and business partners receive dedicated wholesale support.',
        cta_primary_label: 'About Kytura Naturals',
        cta_primary_href: '/about',
        image_url: '/src/assets/images/wellness_spa_collection_1795486735845.jpg',
        is_enabled: true,
        display_order: 5,
      },
      {
        id: 'sec-wholesale',
        section_key: 'wholesale_promo',
        title: 'Wholesale & Business Partnerships',
        subtitle: 'Grow your business with Kytura Naturals. Exclusive wholesale pricing and bulk options.',
        cta_primary_label: 'Apply for Wholesale',
        cta_primary_href: '/wholesale',
        cta_secondary_label: 'Partner Login',
        cta_secondary_href: '/wholesale/portal',
        image_url: '/src/assets/images/wholesale_amber_lavender_1795486736444.jpg',
        is_enabled: true,
        display_order: 6,
      },
      {
        id: 'sec-testimonials',
        section_key: 'testimonials',
        title: 'Our Happy Customers',
        is_enabled: true,
        display_order: 7,
      },
      {
        id: 'sec-newsletter',
        section_key: 'newsletter',
        title: 'Join Our Botanical Journal',
        subtitle: 'Receive seasonal product updates and restock announcements from Kytura Naturals.',
        cta_primary_label: 'Subscribe',
        is_enabled: true,
        display_order: 8,
      },
    ]);
  }

  const [{ value: pageCount }] = await db.select({ value: count() }).from(schema.pages);
  if (Number(pageCount) === 0) {
    await db.insert(schema.pages).values([
      {
        id: crypto.randomUUID(),
        slug: 'about',
        title: 'About Kytura Naturals',
        subtitle: 'Botanical wellness and natural living, led by Dr Ann Merah.',
        content_markdown:
          'Kytura Naturals was established by Dr Ann Merah with a focus on thoughtful botanical essentials for everyday spaces and personal care routines.\n\nOur product range centres on three core pillars:\n- Organic diffuser oil blends for calm home and studio atmospheres\n- Body and massage oils crafted for nourishing daily care\n- Ultrasonic diffusers selected for quiet, reliable misting\n\nServing customers globally in Canadian Dollars (CAD), we maintain personal care in every order by confirming retail orders directly via WhatsApp and supporting retail boutiques, spas, and wellness practitioners through our dedicated wholesale portal.',
        extra_json: { founder: 'Dr Ann Merah', email: 'kyturanaturals@gmail.com', region: 'Global / All Regions' },
        seo_title: 'About Us | Kytura Naturals',
        seo_description: 'Learn about Kytura Naturals, founded by Dr Ann Merah.',
      },
      {
        id: crypto.randomUUID(),
        slug: 'faq',
        title: 'Frequently Asked Questions',
        subtitle: 'Clear answers regarding retail orders, WhatsApp confirmation, shipping, and wholesale accounts.',
        content_markdown: 'Browse common questions below or reach out to our team directly on WhatsApp.',
        extra_json: {
          faqs: [
            {
              q: 'How does WhatsApp checkout work?',
              a: 'After reviewing your cart and entering your delivery details at checkout, your order is saved with a unique reference number and your prefilled order summary opens in WhatsApp. Send that message to +1 (403) 371-9687 so our team can personally confirm availability, shipping, and payment details.',
            },
            {
              q: 'What currency are prices listed in?',
              a: 'All retail and wholesale prices on Kytura Naturals are listed in Canadian Dollars (CAD).',
            },
            {
              q: 'Do you ship internationally?',
              a: 'Yes, Kytura Naturals serves customers across global regions. Delivery details and shipping quotes are confirmed directly with you during order confirmation.',
            },
            {
              q: 'How do I apply for a wholesale account?',
              a: 'Visit our Wholesale page and submit the business application form. Once an administrator reviews and approves your application, you can sign in to the Wholesale Portal to view wholesale pricing, minimum order quantities, and submit bulk enquiries.',
            },
          ],
        },
        seo_title: 'FAQ | Kytura Naturals',
        seo_description: 'Frequently asked questions about Kytura Naturals.',
      },
      {
        id: crypto.randomUUID(),
        slug: 'contact',
        title: 'Contact Kytura Naturals',
        subtitle: 'We welcome retail product questions, order follow-ups, and wholesale enquiries.',
        content_markdown: 'Reach us directly by WhatsApp, email, or the contact form.',
        extra_json: {},
        seo_title: 'Contact Us | Kytura Naturals',
        seo_description: 'Contact Kytura Naturals.',
      },
      {
        id: crypto.randomUUID(),
        slug: 'privacy-policy',
        title: 'Privacy Policy',
        subtitle: 'How Kytura Naturals collects, uses, and protects your order and enquiry information.',
        content_markdown:
          'Kytura Naturals respects your privacy. Information submitted during retail checkout, wholesale applications, newsletter sign-up, or contact enquiries is used solely to process your orders, respond to your requests, and manage approved wholesale partnerships.',
        extra_json: {},
        seo_title: 'Privacy Policy | Kytura Naturals',
        seo_description: 'Privacy Policy for Kytura Naturals.',
      },
      {
        id: crypto.randomUUID(),
        slug: 'terms-and-conditions',
        title: 'Terms and Conditions',
        subtitle: 'Terms governing retail orders, wholesale partnerships, and website use.',
        content_markdown:
          'All product prices on Kytura Naturals are stated in Canadian Dollars (CAD). Submitting a retail checkout request generates an order reference awaiting confirmation via WhatsApp. Wholesale pricing is restricted exclusively to approved wholesale account holders.',
        extra_json: {},
        seo_title: 'Terms and Conditions | Kytura Naturals',
        seo_description: 'Terms and Conditions for Kytura Naturals.',
      },
      {
        id: crypto.randomUUID(),
        slug: 'shipping-returns',
        title: 'Shipping & Returns Policy',
        subtitle: 'Information on worldwide order dispatch, delivery coordination, and returns.',
        content_markdown:
          'Kytura Naturals ships globally across regions. Applicable shipping timelines and rates are confirmed transparently with each customer during WhatsApp order confirmation.',
        extra_json: {},
        seo_title: 'Shipping & Returns Policy | Kytura Naturals',
        seo_description: 'Shipping and Returns Policy for Kytura Naturals.',
      },
    ]);
  }

  const [{ value: mediaCount }] = await db.select({ value: count() }).from(schema.mediaLibrary);
  if (Number(mediaCount) === 0) {
    await db.insert(schema.mediaLibrary).values([
      {
        id: crypto.randomUUID(),
        file_name: 'hero_botanical_wellness.jpg',
        bucket: 'homepage-banners',
        file_url: '/src/assets/images/hero_botanical_wellness_1795486732844.jpg',
        mime_type: 'image/jpeg',
        file_size_bytes: 0,
        alt_text: 'Kytura Naturals Botanical Wellness Hero',
      },
      {
        id: crypto.randomUUID(),
        file_name: 'diffuser_oil_lavender.jpg',
        bucket: 'product-images',
        file_url: '/src/assets/images/diffuser_oil_lavender_1795486733710.jpg',
        mime_type: 'image/jpeg',
        file_size_bytes: 0,
        alt_text: 'Organic Diffuser Oil Blend',
      },
      {
        id: crypto.randomUUID(),
        file_name: 'body_oil_rose_golden.jpg',
        bucket: 'product-images',
        file_url: '/src/assets/images/body_oil_rose_golden_1795486734558.jpg',
        mime_type: 'image/jpeg',
        file_size_bytes: 0,
        alt_text: 'Botanical Body and Massage Oil',
      },
      {
        id: crypto.randomUUID(),
        file_name: 'ultrasonic_wood_diffuser.jpg',
        bucket: 'product-images',
        file_url: '/src/assets/images/ultrasonic_wood_diffuser_1795486734881.jpg',
        mime_type: 'image/jpeg',
        file_size_bytes: 0,
        alt_text: 'Woodgrain Ultrasonic Diffuser',
      },
      {
        id: crypto.randomUUID(),
        file_name: 'wellness_spa_collection.jpg',
        bucket: 'category-images',
        file_url: '/src/assets/images/wellness_spa_collection_1795486735845.jpg',
        mime_type: 'image/jpeg',
        file_size_bytes: 0,
        alt_text: 'Wellness Spa Collection',
      },
      {
        id: crypto.randomUUID(),
        file_name: 'wholesale_amber_lavender.jpg',
        bucket: 'brand-assets',
        file_url: '/src/assets/images/wholesale_amber_lavender_1795486736444.jpg',
        mime_type: 'image/jpeg',
        file_size_bytes: 0,
        alt_text: 'Wholesale Botanical Oil Showcase',
      },
    ]);
  }

  neonBootstrapped = true;
}

// CLI execution: npm run db:migrate
if (import.meta.url === `file://${process.argv[1]}`) {
  if (!isNeonConfigured()) {
    console.error('Missing Neon PostgreSQL connection string (DATABASE_URL, POSTGRES_URL, or POSTGRES_URL_NON_POOLING).');
    process.exit(1);
  }
  ensureNeonSchemaAndSeed()
    .then(() => {
      console.log('Neon PostgreSQL schema migration & baseline seed complete.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Migration failed:', err);
      process.exit(1);
    });
}
