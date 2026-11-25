import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { uid, hashPassword, verifyPassword } from './crypto.ts';
import { DEFAULT_FOOTER_CONFIG, DEFAULT_HEADER_LINKS } from './siteDefaults.ts';

export { uid, hashPassword, verifyPassword };
export const UPLOADS_DIR = path.resolve(process.cwd(), 'uploads');

let sqliteInstance: DatabaseSync | null = null;

export function getSqliteDb(): DatabaseSync {
  if (!sqliteInstance) {
    const dataDir = path.resolve(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    if (!fs.existsSync(UPLOADS_DIR)) {
      fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    }
    const dbPath = path.join(dataDir, 'kytura.db');
    sqliteInstance = new DatabaseSync(dbPath);
    sqliteInstance.exec('PRAGMA journal_mode = WAL;');
    sqliteInstance.exec('PRAGMA foreign_keys = ON;');
  }
  return sqliteInstance;
}

export function initDatabase(): void {
  const db = getSqliteDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      full_name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('super_admin', 'store_manager', 'wholesale_manager', 'content_manager', 'wholesale_buyer')),
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      slug TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      image_url TEXT NOT NULL DEFAULT '',
      display_order INTEGER NOT NULL DEFAULT 0,
      is_visible INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      slug TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      sku TEXT UNIQUE NOT NULL,
      short_description TEXT NOT NULL DEFAULT '',
      description TEXT NOT NULL DEFAULT '',
      retail_price_cad REAL NOT NULL DEFAULT 0,
      compare_at_price_cad REAL,
      stock_quantity INTEGER NOT NULL DEFAULT 0,
      is_published INTEGER NOT NULL DEFAULT 1,
      is_featured INTEGER NOT NULL DEFAULT 0,
      seo_title TEXT NOT NULL DEFAULT '',
      seo_description TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS product_images (
      id TEXT PRIMARY KEY,
      product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      image_url TEXT NOT NULL,
      alt_text TEXT NOT NULL DEFAULT '',
      display_order INTEGER NOT NULL DEFAULT 0,
      is_primary INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS product_variants (
      id TEXT PRIMARY KEY,
      product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      sku TEXT NOT NULL,
      price_cad REAL NOT NULL DEFAULT 0,
      stock_quantity INTEGER NOT NULL DEFAULT 0,
      is_available INTEGER NOT NULL DEFAULT 1,
      display_order INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS product_categories (
      product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      category_id TEXT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
      PRIMARY KEY (product_id, category_id)
    );

    CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      full_name TEXT NOT NULL,
      phone TEXT NOT NULL,
      country TEXT NOT NULL,
      city TEXT NOT NULL,
      delivery_address TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS retail_orders (
      id TEXT PRIMARY KEY,
      order_reference TEXT UNIQUE NOT NULL,
      customer_id TEXT REFERENCES customers(id) ON DELETE SET NULL,
      customer_name TEXT NOT NULL,
      customer_email TEXT NOT NULL,
      customer_phone TEXT NOT NULL,
      country TEXT NOT NULL,
      city TEXT NOT NULL,
      delivery_address TEXT NOT NULL,
      order_notes TEXT NOT NULL DEFAULT '',
      internal_notes TEXT NOT NULL DEFAULT '',
      subtotal_cad REAL NOT NULL DEFAULT 0,
      total_cad REAL NOT NULL DEFAULT 0,
      currency TEXT NOT NULL DEFAULT 'CAD',
      order_status TEXT NOT NULL DEFAULT 'Awaiting WhatsApp Confirmation',
      payment_status TEXT NOT NULL DEFAULT 'Unpaid',
      whatsapp_message_payload TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS retail_order_items (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL REFERENCES retail_orders(id) ON DELETE CASCADE,
      product_id TEXT REFERENCES products(id) ON DELETE SET NULL,
      variant_id TEXT REFERENCES product_variants(id) ON DELETE SET NULL,
      product_name TEXT NOT NULL,
      variant_name TEXT NOT NULL DEFAULT '',
      unit_price_cad REAL NOT NULL,
      quantity INTEGER NOT NULL,
      line_total_cad REAL NOT NULL
    );

    CREATE TABLE IF NOT EXISTS wholesale_applications (
      id TEXT PRIMARY KEY,
      business_name TEXT NOT NULL,
      applicant_name TEXT NOT NULL,
      business_email TEXT UNIQUE NOT NULL,
      phone TEXT NOT NULL,
      country TEXT NOT NULL,
      business_address TEXT NOT NULL,
      business_type TEXT NOT NULL,
      website_or_social TEXT NOT NULL DEFAULT '',
      additional_info TEXT NOT NULL DEFAULT '',
      password_hash TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
      rejection_reason TEXT NOT NULL DEFAULT '',
      reviewed_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS wholesale_profiles (
      id TEXT PRIMARY KEY,
      user_id TEXT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      application_id TEXT REFERENCES wholesale_applications(id) ON DELETE SET NULL,
      business_name TEXT NOT NULL,
      contact_name TEXT NOT NULL,
      business_email TEXT UNIQUE NOT NULL,
      phone TEXT NOT NULL,
      country TEXT NOT NULL,
      business_address TEXT NOT NULL,
      business_type TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'approved' CHECK (status IN ('approved', 'suspended')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS wholesale_price_tiers (
      id TEXT PRIMARY KEY,
      product_id TEXT UNIQUE NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      moq INTEGER NOT NULL DEFAULT 10,
      base_wholesale_price_cad REAL NOT NULL DEFAULT 0,
      tier_2_min_qty INTEGER,
      tier_2_price_cad REAL,
      tier_3_min_qty INTEGER,
      tier_3_price_cad REAL,
      is_wholesale_available INTEGER NOT NULL DEFAULT 1,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS wholesale_inquiries (
      id TEXT PRIMARY KEY,
      inquiry_reference TEXT UNIQUE NOT NULL,
      wholesale_profile_id TEXT NOT NULL REFERENCES wholesale_profiles(id) ON DELETE CASCADE,
      notes TEXT NOT NULL DEFAULT '',
      estimated_total_cad REAL NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'Submitted',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS wholesale_inquiry_items (
      id TEXT PRIMARY KEY,
      inquiry_id TEXT NOT NULL REFERENCES wholesale_inquiries(id) ON DELETE CASCADE,
      product_id TEXT REFERENCES products(id) ON DELETE SET NULL,
      product_name TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      quoted_unit_price_cad REAL NOT NULL,
      line_total_cad REAL NOT NULL
    );

    CREATE TABLE IF NOT EXISTS wholesale_quotations (
      id TEXT PRIMARY KEY,
      inquiry_id TEXT NOT NULL REFERENCES wholesale_inquiries(id) ON DELETE CASCADE,
      quoted_total_cad REAL NOT NULL,
      shipping_estimate_cad REAL NOT NULL DEFAULT 0,
      terms TEXT NOT NULL DEFAULT '',
      valid_until TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS site_settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      business_name TEXT NOT NULL DEFAULT 'Kytura Naturals',
      brand_tagline TEXT NOT NULL DEFAULT 'BOTANICAL WELLNESS · NATURAL LIVING',
      owner_name TEXT NOT NULL DEFAULT 'Dr Ann Merah',
      email TEXT NOT NULL DEFAULT 'kyturanaturals@gmail.com',
      whatsapp_number TEXT NOT NULL DEFAULT '+14033719687',
      currency TEXT NOT NULL DEFAULT 'CAD',
      region_label TEXT NOT NULL DEFAULT 'Global / All Regions',
      announcement_left TEXT NOT NULL DEFAULT 'Discover Natural Wellness with Kytura Naturals',
      announcement_center TEXT NOT NULL DEFAULT 'Free Worldwide Shipping on Orders Over $100 CAD',
      free_shipping_threshold_cad REAL NOT NULL DEFAULT 100,
      seo_title TEXT NOT NULL DEFAULT 'Kytura Naturals | Botanical Wellness, Diffuser Oils & Ultrasonic Diffusers',
      seo_description TEXT NOT NULL DEFAULT 'Explore organic diffuser oil blends, body and massage oils, and ultrasonic diffusers from Kytura Naturals.',
      social_facebook TEXT NOT NULL DEFAULT '',
      social_instagram TEXT NOT NULL DEFAULT '',
      social_youtube TEXT NOT NULL DEFAULT '',
      social_pinterest TEXT NOT NULL DEFAULT '',
      logo_light_url TEXT NOT NULL DEFAULT '',
      logo_dark_url TEXT NOT NULL DEFAULT '',
      brand_icon_url TEXT NOT NULL DEFAULT '',
      favicon_url TEXT NOT NULL DEFAULT '',
      header_links TEXT NOT NULL DEFAULT '[]',
      footer_config TEXT NOT NULL DEFAULT '{}',
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS homepage_sections (
      id TEXT PRIMARY KEY,
      section_key TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL DEFAULT '',
      subtitle TEXT NOT NULL DEFAULT '',
      body TEXT NOT NULL DEFAULT '',
      cta_primary_label TEXT NOT NULL DEFAULT '',
      cta_primary_href TEXT NOT NULL DEFAULT '',
      cta_secondary_label TEXT NOT NULL DEFAULT '',
      cta_secondary_href TEXT NOT NULL DEFAULT '',
      image_url TEXT NOT NULL DEFAULT '',
      extra_json TEXT NOT NULL DEFAULT '{}',
      is_enabled INTEGER NOT NULL DEFAULT 1,
      display_order INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS testimonials (
      id TEXT PRIMARY KEY,
      customer_name TEXT NOT NULL,
      location TEXT NOT NULL DEFAULT '',
      quote TEXT NOT NULL,
      rating INTEGER NOT NULL DEFAULT 5,
      avatar_url TEXT NOT NULL DEFAULT '',
      is_approved INTEGER NOT NULL DEFAULT 0,
      is_published INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS pages (
      id TEXT PRIMARY KEY,
      slug TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      subtitle TEXT NOT NULL DEFAULT '',
      content_markdown TEXT NOT NULL DEFAULT '',
      extra_json TEXT NOT NULL DEFAULT '{}',
      seo_title TEXT NOT NULL DEFAULT '',
      seo_description TEXT NOT NULL DEFAULT '',
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS media_library (
      id TEXT PRIMARY KEY,
      file_name TEXT NOT NULL,
      bucket TEXT NOT NULL DEFAULT 'media-library',
      file_url TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      file_size_bytes INTEGER NOT NULL DEFAULT 0,
      alt_text TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS activity_logs (
      id TEXT PRIMARY KEY,
      actor_email TEXT NOT NULL DEFAULT 'system',
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL DEFAULT '',
      details TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS newsletter_subscribers (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS contact_messages (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT NOT NULL DEFAULT '',
      subject TEXT NOT NULL DEFAULT '',
      message TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // Additive migration for existing SQLite databases
  const existingCols = new Set(
    (db.prepare('PRAGMA table_info(site_settings)').all() as Array<{ name: string }>).map((c) => c.name)
  );
  const additiveCols: Array<[string, string]> = [
    ['brand_tagline', "TEXT NOT NULL DEFAULT 'BOTANICAL WELLNESS · NATURAL LIVING'"],
    ['logo_light_url', "TEXT NOT NULL DEFAULT ''"],
    ['logo_dark_url', "TEXT NOT NULL DEFAULT ''"],
    ['brand_icon_url', "TEXT NOT NULL DEFAULT ''"],
    ['favicon_url', "TEXT NOT NULL DEFAULT ''"],
    ['header_links', "TEXT NOT NULL DEFAULT '[]'"],
    ['footer_config', "TEXT NOT NULL DEFAULT '{}'"],
  ];
  for (const [col, def] of additiveCols) {
    if (!existingCols.has(col)) {
      db.exec(`ALTER TABLE site_settings ADD COLUMN ${col} ${def};`);
    }
  }

  seedInitialData(db);
}

function seedInitialData(db: DatabaseSync): void {
  const settingsExists = db.prepare('SELECT id FROM site_settings WHERE id = 1').get();
  if (!settingsExists) {
    db.prepare(`
      INSERT INTO site_settings (
        id, business_name, brand_tagline, owner_name, email, whatsapp_number, currency, region_label,
        announcement_left, announcement_center, free_shipping_threshold_cad,
        seo_title, seo_description, social_facebook, social_instagram, social_youtube, social_pinterest,
        logo_light_url, logo_dark_url, brand_icon_url, favicon_url, header_links, footer_config
      ) VALUES (1, ?, ?, ?, ?, ?, 'CAD', 'Global / All Regions', ?, ?, 100, ?, ?, '', '', '', '', '', '', '', '', ?, ?)
    `).run(
      'Kytura Naturals',
      'BOTANICAL WELLNESS · NATURAL LIVING',
      'Dr Ann Merah',
      'kyturanaturals@gmail.com',
      '+14033719687',
      'Discover Natural Wellness with Kytura Naturals',
      'Free Worldwide Shipping on Orders Over $100 CAD',
      'Kytura Naturals | Botanical Wellness, Diffuser Oils & Ultrasonic Diffusers',
      'Explore botanical diffuser oil blends, body and massage oils, and ultrasonic diffusers from Kytura Naturals.',
      JSON.stringify(DEFAULT_HEADER_LINKS),
      JSON.stringify(DEFAULT_FOOTER_CONFIG)
    );
  }

  const catCount = (db.prepare('SELECT COUNT(*) as cnt FROM categories').get() as { cnt: number }).cnt;
  if (catCount === 0) {
    const cats = [
      {
        id: 'cat-diffuser-oils',
        slug: 'diffuser-oil-blends',
        name: 'Diffuser Oil Blends',
        description: 'Organic botanical diffuser oil blends crafted for calm, welcoming living spaces.',
        image_url: '/src/assets/images/diffuser_oil_lavender_1795486733710.jpg',
        display_order: 1,
      },
      {
        id: 'cat-body-oils',
        slug: 'body-massage-oils',
        name: 'Body & Massage Oils',
        description: 'Silky botanical body and massage oils designed for daily skin nourishment and relaxation.',
        image_url: '/src/assets/images/body_oil_rose_golden_1795486734558.jpg',
        display_order: 2,
      },
      {
        id: 'cat-diffusers',
        slug: 'ultrasonic-diffusers',
        name: 'Ultrasonic Diffusers',
        description: 'Thoughtfully selected ultrasonic mist diffusers blending warm natural textures with quiet operation.',
        image_url: '/src/assets/images/ultrasonic_wood_diffuser_1795486734881.jpg',
        display_order: 3,
      },
      {
        id: 'cat-wellness-sets',
        slug: 'wellness-collections',
        name: 'Wellness Collections',
        description: 'Curated pairings of diffuser blends, body oils, and ultrasonic diffusers for home rituals and gifting.',
        image_url: '/src/assets/images/wellness_spa_collection_1795486735845.jpg',
        display_order: 4,
      },
    ];

    const insertCat = db.prepare(
      'INSERT INTO categories (id, slug, name, description, image_url, display_order, is_visible) VALUES (?, ?, ?, ?, ?, ?, 1)'
    );
    for (const c of cats) {
      insertCat.run(c.id, c.slug, c.name, c.description, c.image_url, c.display_order);
    }
  }

  const prodCount = (db.prepare('SELECT COUNT(*) as cnt FROM products').get() as { cnt: number }).cnt;
  if (prodCount === 0) {
    const starterProducts = [
      {
        id: 'prod-calm-evening-blend',
        slug: 'calm-evening-diffuser-oil-blend',
        name: 'Calm Evening Diffuser Oil Blend',
        sku: 'KN-DOB-001',
        short_description: 'Organic diffuser oil blend crafted for serene evening spaces.',
        description: 'Formulated for ultrasonic diffusers, this organic botanical diffuser oil blend brings a calm, grounding atmosphere to bedrooms, lounges, and wellness studios. Manage full product notes and bottle sizes from the admin catalogue.',
        retail_price_cad: 28.0,
        compare_at_price_cad: null,
        stock_quantity: 45,
        is_featured: 1,
        category_id: 'cat-diffuser-oils',
        image_url: '/src/assets/images/diffuser_oil_lavender_1795486733710.jpg',
        variants: [
          { name: '15 mL Amber Dropper', sku: 'KN-DOB-001-15', price_cad: 28.0, stock_quantity: 30 },
          { name: '30 mL Amber Dropper', sku: 'KN-DOB-001-30', price_cad: 46.0, stock_quantity: 15 },
        ],
        wholesale: { moq: 12, base: 16.5, t2qty: 24, t2price: 14.5, t3qty: 48, t3price: 12.75 },
      },
      {
        id: 'prod-botanical-sanctuary-oil',
        slug: 'botanical-sanctuary-diffuser-oil',
        name: 'Botanical Sanctuary Diffuser Oil',
        sku: 'KN-DOB-002',
        short_description: 'Aromatic botanical blend suited for daily home diffusion.',
        description: 'An everyday organic diffuser oil blend packaged in UV-protective glass to preserve aromatic freshness. Designed for ultrasonic diffusers in living and workspaces.',
        retail_price_cad: 30.0,
        compare_at_price_cad: null,
        stock_quantity: 38,
        is_featured: 1,
        category_id: 'cat-diffuser-oils',
        image_url: '/src/assets/images/wholesale_amber_lavender_1795486736444.jpg',
        variants: [
          { name: '15 mL Glass Bottle', sku: 'KN-DOB-002-15', price_cad: 30.0, stock_quantity: 25 },
          { name: '30 mL Glass Bottle', sku: 'KN-DOB-002-30', price_cad: 49.0, stock_quantity: 13 },
        ],
        wholesale: { moq: 12, base: 17.5, t2qty: 24, t2price: 15.5, t3qty: 48, t3price: 13.75 },
      },
      {
        id: 'prod-velvet-rose-body-oil',
        slug: 'velvet-rose-body-massage-oil',
        name: 'Velvet Rose Body & Massage Oil',
        sku: 'KN-BMO-001',
        short_description: 'Lightweight botanical body and massage oil with a silky finish.',
        description: 'A luxurious body and massage oil designed for smooth glide and soft skin feel after bathing or during quiet massage rituals.',
        retail_price_cad: 42.0,
        compare_at_price_cad: null,
        stock_quantity: 32,
        is_featured: 1,
        category_id: 'cat-body-oils',
        image_url: '/src/assets/images/body_oil_rose_golden_1795486734558.jpg',
        variants: [
          { name: '100 mL Dropper Bottle', sku: 'KN-BMO-001-100', price_cad: 42.0, stock_quantity: 20 },
          { name: '200 mL Studio Bottle', sku: 'KN-BMO-001-200', price_cad: 72.0, stock_quantity: 12 },
        ],
        wholesale: { moq: 10, base: 24.0, t2qty: 25, t2price: 21.5, t3qty: 50, t3price: 19.0 },
      },
      {
        id: 'prod-golden-botanical-massage',
        slug: 'golden-botanical-massage-oil',
        name: 'Golden Botanical Massage Oil',
        sku: 'KN-BMO-002',
        short_description: 'Nourishing golden oil blend for spa and personal body care.',
        description: 'Crafted for unhurried massage and daily moisturizing routines, housed in a clear glass apothecary bottle.',
        retail_price_cad: 38.0,
        compare_at_price_cad: null,
        stock_quantity: 28,
        is_featured: 0,
        category_id: 'cat-body-oils',
        image_url: '/src/assets/images/body_oil_rose_golden_1795486734558.jpg',
        variants: [
          { name: '100 mL Glass Bottle', sku: 'KN-BMO-002-100', price_cad: 38.0, stock_quantity: 18 },
          { name: '200 mL Glass Bottle', sku: 'KN-BMO-002-200', price_cad: 65.0, stock_quantity: 10 },
        ],
        wholesale: { moq: 10, base: 22.0, t2qty: 25, t2price: 19.5, t3qty: 50, t3price: 17.5 },
      },
      {
        id: 'prod-woodgrain-ultrasonic-diffuser',
        slug: 'woodgrain-ultrasonic-mist-diffuser',
        name: 'Woodgrain Ultrasonic Mist Diffuser',
        sku: 'KN-USD-001',
        short_description: 'Quiet dome-shaped ultrasonic aromatherapy diffuser with warm ambient ring.',
        description: 'Thoughtfully selected ultrasonic mist diffuser featuring a natural woodgrain finish, soft ambient light ring, and whisper-quiet fine cool mist output for home or studio spaces.',
        retail_price_cad: 78.0,
        compare_at_price_cad: null,
        stock_quantity: 20,
        is_featured: 1,
        category_id: 'cat-diffusers',
        image_url: '/src/assets/images/ultrasonic_wood_diffuser_1795486734881.jpg',
        variants: [
          { name: 'Warm Oak · 300 mL Reservoir', sku: 'KN-USD-001-OAK', price_cad: 78.0, stock_quantity: 20 },
        ],
        wholesale: { moq: 6, base: 46.0, t2qty: 15, t2price: 41.0, t3qty: 30, t3price: 37.5 },
      },
      {
        id: 'prod-evening-sanctuary-set',
        slug: 'evening-sanctuary-wellness-collection',
        name: 'Evening Sanctuary Wellness Set',
        sku: 'KN-WLC-001',
        short_description: 'Curated wellness pairing combining an ultrasonic diffuser and diffuser oil blend.',
        description: 'A cohesive wellness collection pairing our Woodgrain Ultrasonic Mist Diffuser with a 15 mL Calm Evening Diffuser Oil Blend for an effortless home ritual or thoughtful gift.',
        retail_price_cad: 98.0,
        compare_at_price_cad: 106.0,
        stock_quantity: 15,
        is_featured: 0,
        category_id: 'cat-wellness-sets',
        image_url: '/src/assets/images/wellness_spa_collection_1795486735845.jpg',
        variants: [
          { name: 'Diffuser + 15 mL Oil Set', sku: 'KN-WLC-001-SET', price_cad: 98.0, stock_quantity: 15 },
        ],
        wholesale: { moq: 6, base: 59.0, t2qty: 12, t2price: 54.0, t3qty: 24, t3price: 49.0 },
      },
    ];

    const insProd = db.prepare(`
      INSERT INTO products (id, slug, name, sku, short_description, description, retail_price_cad, compare_at_price_cad, stock_quantity, is_published, is_featured, seo_title, seo_description)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)
    `);
    const insImg = db.prepare(
      'INSERT INTO product_images (id, product_id, image_url, alt_text, display_order, is_primary) VALUES (?, ?, ?, ?, 0, 1)'
    );
    const insVar = db.prepare(
      'INSERT INTO product_variants (id, product_id, name, sku, price_cad, stock_quantity, is_available, display_order) VALUES (?, ?, ?, ?, ?, ?, 1, ?)'
    );
    const insCat = db.prepare('INSERT INTO product_categories (product_id, category_id) VALUES (?, ?)');
    const insTier = db.prepare(`
      INSERT INTO wholesale_price_tiers (id, product_id, moq, base_wholesale_price_cad, tier_2_min_qty, tier_2_price_cad, tier_3_min_qty, tier_3_price_cad, is_wholesale_available)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
    `);

    for (const p of starterProducts) {
      insProd.run(
        p.id,
        p.slug,
        p.name,
        p.sku,
        p.short_description,
        p.description,
        p.retail_price_cad,
        p.compare_at_price_cad,
        p.stock_quantity,
        p.is_featured,
        `${p.name} | Kytura Naturals`,
        p.short_description
      );
      insImg.run(uid(), p.id, p.image_url, p.name);
      p.variants.forEach((v, idx) => {
        insVar.run(uid(), p.id, v.name, v.sku, v.price_cad, v.stock_quantity, idx);
      });
      insCat.run(p.id, p.category_id);
      insTier.run(
        uid(),
        p.id,
        p.wholesale.moq,
        p.wholesale.base,
        p.wholesale.t2qty,
        p.wholesale.t2price,
        p.wholesale.t3qty,
        p.wholesale.t3price
      );
    }
  }

  const sectionCount = (db.prepare('SELECT COUNT(*) as cnt FROM homepage_sections').get() as { cnt: number }).cnt;
  if (sectionCount === 0) {
    const sections = [
      {
        id: 'sec-hero',
        section_key: 'hero',
        title: 'Reconnect With Nature.\nRediscover Wellness.',
        subtitle: 'Explore botanical oil blends, luxurious body and massage oils, and thoughtfully selected aromatherapy diffusers.',
        body: '',
        cta_primary_label: 'Explore Collection',
        cta_primary_href: '/shop',
        cta_secondary_label: 'Discover Our Products',
        cta_secondary_href: '/collections/diffuser-oil-blends',
        image_url: '/src/assets/images/hero_botanical_wellness_1795486732844.jpg',
        extra_json: JSON.stringify({}),
        is_enabled: 1,
        display_order: 1,
      },
      {
        id: 'sec-benefits',
        section_key: 'benefits',
        title: 'Why Kytura Naturals',
        subtitle: '',
        body: '',
        cta_primary_label: '',
        cta_primary_href: '',
        cta_secondary_label: '',
        cta_secondary_href: '',
        image_url: '',
        extra_json: JSON.stringify({
          items: [
            { icon: 'gem', title: 'Botanical Focus', subtitle: 'Thoughtfully Curated Oils' },
            { icon: 'globe', title: 'Worldwide Delivery', subtitle: 'Shipping Across Regions' },
            { icon: 'headphones', title: 'Dedicated Support', subtitle: 'Direct WhatsApp Assistance' },
            { icon: 'shield', title: 'Personal Confirmation', subtitle: 'Direct Order Review' },
          ],
        }),
        is_enabled: 1,
        display_order: 2,
      },
      {
        id: 'sec-collections',
        section_key: 'collections',
        title: 'Shop Our Collections',
        subtitle: '',
        body: '',
        cta_primary_label: 'Shop Now',
        cta_primary_href: '/shop',
        cta_secondary_label: '',
        cta_secondary_href: '',
        image_url: '',
        extra_json: JSON.stringify({}),
        is_enabled: 1,
        display_order: 3,
      },
      {
        id: 'sec-featured',
        section_key: 'featured_products',
        title: 'Featured Products',
        subtitle: 'Botanical essentials priced in Canadian Dollars (CAD).',
        body: '',
        cta_primary_label: 'View All Products',
        cta_primary_href: '/shop',
        cta_secondary_label: '',
        cta_secondary_href: '',
        image_url: '',
        extra_json: JSON.stringify({}),
        is_enabled: 1,
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
        cta_secondary_label: '',
        cta_secondary_href: '',
        image_url: '/src/assets/images/wellness_spa_collection_1795486735845.jpg',
        extra_json: JSON.stringify({}),
        is_enabled: 1,
        display_order: 5,
      },
      {
        id: 'sec-wholesale',
        section_key: 'wholesale_promo',
        title: 'Wholesale & Business Partnerships',
        subtitle: 'Grow your business with Kytura Naturals. Exclusive wholesale pricing and bulk options.',
        body: '',
        cta_primary_label: 'Apply for Wholesale',
        cta_primary_href: '/wholesale',
        cta_secondary_label: 'Partner Login',
        cta_secondary_href: '/wholesale/portal',
        image_url: '/src/assets/images/wholesale_amber_lavender_1795486736444.jpg',
        extra_json: JSON.stringify({}),
        is_enabled: 1,
        display_order: 6,
      },
      {
        id: 'sec-testimonials',
        section_key: 'testimonials',
        title: 'Our Happy Customers',
        subtitle: '',
        body: '',
        cta_primary_label: '',
        cta_primary_href: '',
        cta_secondary_label: '',
        cta_secondary_href: '',
        image_url: '',
        extra_json: JSON.stringify({}),
        is_enabled: 1,
        display_order: 7,
      },
      {
        id: 'sec-newsletter',
        section_key: 'newsletter',
        title: 'Join Our Botanical Journal',
        subtitle: 'Receive seasonal product updates and restock announcements from Kytura Naturals.',
        body: '',
        cta_primary_label: 'Subscribe',
        cta_primary_href: '',
        cta_secondary_label: '',
        cta_secondary_href: '',
        image_url: '',
        extra_json: JSON.stringify({}),
        is_enabled: 1,
        display_order: 8,
      },
    ];

    const insSec = db.prepare(`
      INSERT INTO homepage_sections (id, section_key, title, subtitle, body, cta_primary_label, cta_primary_href, cta_secondary_label, cta_secondary_href, image_url, extra_json, is_enabled, display_order)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const s of sections) {
      insSec.run(
        s.id,
        s.section_key,
        s.title,
        s.subtitle,
        s.body,
        s.cta_primary_label,
        s.cta_primary_href,
        s.cta_secondary_label,
        s.cta_secondary_href,
        s.image_url,
        s.extra_json,
        s.is_enabled,
        s.display_order
      );
    }
  }

  const pageCount = (db.prepare('SELECT COUNT(*) as cnt FROM pages').get() as { cnt: number }).cnt;
  if (pageCount === 0) {
    const pages = [
      {
        slug: 'about',
        title: 'About Kytura Naturals',
        subtitle: 'Botanical wellness and natural living, led by Dr Ann Merah.',
        content_markdown: `Kytura Naturals was established by Dr Ann Merah with a focus on thoughtful botanical essentials for everyday spaces and personal care routines.\n\nOur product range centres on three core pillars:\n- Organic diffuser oil blends for calm home and studio atmospheres\n- Body and massage oils crafted for nourishing daily care\n- Ultrasonic diffusers selected for quiet, reliable misting\n\nBased in Canada and serving customers globally, we maintain personal care in every order by confirming retail orders directly via WhatsApp and supporting retail boutiques, spas, and wellness practitioners through our dedicated wholesale portal.`,
        extra_json: JSON.stringify({ founder: 'Dr Ann Merah', email: 'kyturanaturals@gmail.com', region: 'Global / All Regions' }),
        seo_title: 'About Us | Kytura Naturals',
        seo_description: 'Learn about Kytura Naturals, founded by Dr Ann Merah, offering diffuser oil blends, body and massage oils, and ultrasonic diffusers.',
      },
      {
        slug: 'faq',
        title: 'Frequently Asked Questions',
        subtitle: 'Clear answers regarding retail orders, WhatsApp confirmation, shipping, and wholesale accounts.',
        content_markdown: 'Browse common questions below or reach out to our team directly on WhatsApp.',
        extra_json: JSON.stringify({
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
        }),
        seo_title: 'FAQ | Kytura Naturals',
        seo_description: 'Frequently asked questions about Kytura Naturals ordering, CAD pricing, global delivery, and wholesale accounts.',
      },
      {
        slug: 'contact',
        title: 'Contact Kytura Naturals',
        subtitle: 'We welcome retail product questions, order follow-ups, and wholesale enquiries.',
        content_markdown: 'Reach us directly by WhatsApp, email, or the contact form below.',
        extra_json: JSON.stringify({ hours: 'Monday – Saturday, Direct WhatsApp & Email Response' }),
        seo_title: 'Contact Us | Kytura Naturals',
        seo_description: 'Contact Kytura Naturals by email at kyturanaturals@gmail.com or WhatsApp at +1 (403) 371-9687.',
      },
      {
        slug: 'privacy-policy',
        title: 'Privacy Policy',
        subtitle: 'How Kytura Naturals collects, uses, and protects your order and enquiry information.',
        content_markdown: `Kytura Naturals respects your privacy. Information submitted during retail checkout, wholesale applications, newsletter sign-up, or contact enquiries—such as your name, email address, phone/WhatsApp number, and delivery address—is used solely to process your orders, respond to your requests, and manage approved wholesale partnerships.\n\nWe do not sell or rent customer personal information to third parties. For privacy requests or data updates, please contact kyturanaturals@gmail.com.`,
        extra_json: JSON.stringify({}),
        seo_title: 'Privacy Policy | Kytura Naturals',
        seo_description: 'Privacy Policy for Kytura Naturals.',
      },
      {
        slug: 'terms-and-conditions',
        title: 'Terms and Conditions',
        subtitle: 'Terms governing retail orders, wholesale partnerships, and website use.',
        content_markdown: `All product prices on Kytura Naturals are stated in Canadian Dollars (CAD). Submitting a retail checkout request generates an order reference awaiting confirmation via WhatsApp. Orders are confirmed and fulfilled only after direct business confirmation and agreed payment arrangement.\n\nWholesale pricing and minimum order quantities are restricted exclusively to approved wholesale account holders.`,
        extra_json: JSON.stringify({}),
        seo_title: 'Terms and Conditions | Kytura Naturals',
        seo_description: 'Terms and Conditions for Kytura Naturals.',
      },
      {
        slug: 'shipping-returns',
        title: 'Shipping & Returns Policy',
        subtitle: 'Information on worldwide order dispatch, delivery coordination, and returns.',
        content_markdown: `Kytura Naturals ships globally across regions. Applicable shipping timelines and rates are confirmed transparently with each customer during WhatsApp order confirmation.\n\nIf an item arrives damaged or incorrect, please contact us via WhatsApp at +1 (403) 371-9687 or email kyturanaturals@gmail.com with your order reference within 7 days of delivery so our team can assist promptly.`,
        extra_json: JSON.stringify({}),
        seo_title: 'Shipping & Returns Policy | Kytura Naturals',
        seo_description: 'Shipping and Returns Policy for Kytura Naturals.',
      },
    ];

    const insPage = db.prepare(`
      INSERT INTO pages (id, slug, title, subtitle, content_markdown, extra_json, seo_title, seo_description)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const pg of pages) {
      insPage.run(uid(), pg.slug, pg.title, pg.subtitle, pg.content_markdown, pg.extra_json, pg.seo_title, pg.seo_description);
    }
  }

  const mediaCount = (db.prepare('SELECT COUNT(*) as cnt FROM media_library').get() as { cnt: number }).cnt;
  if (mediaCount === 0) {
    const initialMedia = [
      { file_name: 'hero_botanical_wellness.jpg', bucket: 'homepage-banners', file_url: '/src/assets/images/hero_botanical_wellness_1795486732844.jpg', alt_text: 'Kytura Naturals Botanical Wellness Hero' },
      { file_name: 'diffuser_oil_lavender.jpg', bucket: 'product-images', file_url: '/src/assets/images/diffuser_oil_lavender_1795486733710.jpg', alt_text: 'Organic Diffuser Oil Blend' },
      { file_name: 'body_oil_rose_golden.jpg', bucket: 'product-images', file_url: '/src/assets/images/body_oil_rose_golden_1795486734558.jpg', alt_text: 'Botanical Body and Massage Oil' },
      { file_name: 'ultrasonic_wood_diffuser.jpg', bucket: 'product-images', file_url: '/src/assets/images/ultrasonic_wood_diffuser_1795486734881.jpg', alt_text: 'Woodgrain Ultrasonic Diffuser' },
      { file_name: 'wellness_spa_collection.jpg', bucket: 'category-images', file_url: '/src/assets/images/wellness_spa_collection_1795486735845.jpg', alt_text: 'Wellness Spa Collection' },
      { file_name: 'wholesale_amber_lavender.jpg', bucket: 'brand-assets', file_url: '/src/assets/images/wholesale_amber_lavender_1795486736444.jpg', alt_text: 'Wholesale Botanical Oil Showcase' },
    ];
    const insMedia = db.prepare(
      'INSERT INTO media_library (id, file_name, bucket, file_url, mime_type, file_size_bytes, alt_text) VALUES (?, ?, ?, ?, ?, ?, ?)'
    );
    for (const m of initialMedia) {
      insMedia.run(uid(), m.file_name, m.bucket, m.file_url, 'image/jpeg', 0, m.alt_text);
    }
  }
}
