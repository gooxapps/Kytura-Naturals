import crypto from 'node:crypto';
import { asc, count, desc, eq, inArray, sql } from 'drizzle-orm';
import * as schema from '../src/db/schema.ts';
import { getNeonDb, isNeonConfigured } from './neonDb.ts';
import { ensureNeonSchemaAndSeed } from './migrate.ts';
import { getSqliteDb, initDatabase as initSqlite } from './db.ts';
import { uid, hashPassword } from './crypto.ts';
import { normalizeFooterConfig, normalizeHeaderLinks, normalizeSiteSettings } from './siteDefaults.ts';

export interface DbUser {
  id: string;
  email: string;
  full_name: string;
  password_hash: string;
  role: string;
  is_active: boolean;
  created_at: string;
}

export interface DataStore {
  mode: 'neon-postgresql' | 'local-sqlite-preview';
  ensureReady(): Promise<void>;

  // Auth & Users
  countAdminUsers(): Promise<number>;
  getUserByEmail(email: string): Promise<DbUser | null>;
  getUserById(id: string): Promise<DbUser | null>;
  createUser(input: { id: string; email: string; full_name: string; password_hash: string; role: string }): Promise<void>;
  listAdminUsers(): Promise<Array<Omit<DbUser, 'password_hash'>>>;
  updateAdminUser(id: string, patch: { role?: string; is_active?: boolean }): Promise<boolean>;

  // Public Bootstrap & Content
  getSettings(): Promise<Record<string, unknown>>;
  updateSettings(patch: Record<string, unknown>): Promise<void>;
  listCategories(visibleOnly: boolean): Promise<Array<Record<string, unknown>>>;
  createCategory(input: Record<string, unknown>): Promise<void>;
  updateCategory(id: string, patch: Record<string, unknown>): Promise<void>;
  deleteCategory(id: string): Promise<void>;

  listHomepageSections(): Promise<Array<Record<string, unknown>>>;
  updateHomepageSection(sectionKey: string, patch: Record<string, unknown>): Promise<void>;

  listTestimonials(publicOnly: boolean): Promise<Array<Record<string, unknown>>>;
  createTestimonial(input: Record<string, unknown>): Promise<void>;
  updateTestimonial(id: string, patch: { is_approved?: boolean; is_published?: boolean }): Promise<boolean>;
  deleteTestimonial(id: string): Promise<void>;

  listPages(): Promise<Array<Record<string, unknown>>>;
  getPageBySlug(slug: string): Promise<Record<string, unknown> | null>;
  updatePage(slug: string, patch: Record<string, unknown>): Promise<void>;

  // Products
  getHydratedProducts(opts: {
    publishedOnly?: boolean;
    categorySlug?: string;
    search?: string;
    featuredOnly?: boolean;
    includeWholesaleTiers?: boolean;
  }): Promise<Array<Record<string, unknown>>>;
  getProductBySlug(slug: string): Promise<Record<string, unknown> | null>;
  getProductForCheckout(productId: string, variantId?: string): Promise<{
    id: string;
    name: string;
    is_published: boolean;
    unitPriceCad: number;
    variantName: string;
    variantId: string | null;
  } | null>;
  createProduct(input: Record<string, unknown>): Promise<string>;
  updateProduct(id: string, input: Record<string, unknown>): Promise<boolean>;
  deleteProduct(id: string): Promise<void>;
  isProductSlugTaken(slug: string): Promise<boolean>;
  listSitemapSlugs(): Promise<{ products: string[]; categories: string[] }>;

  // Retail Orders & Customers
  createRetailOrder(input: {
    orderId: string;
    orderRef: string;
    customer_name: string;
    customer_email: string;
    customer_phone: string;
    country: string;
    city: string;
    delivery_address: string;
    order_notes: string;
    subtotalCad: number;
    totalCad: number;
    whatsappMessage: string;
    items: Array<{
      product_id: string;
      variant_id: string | null;
      product_name: string;
      variant_name: string;
      unit_price_cad: number;
      quantity: number;
      line_total_cad: number;
    }>;
  }): Promise<void>;
  listRetailOrders(): Promise<Array<Record<string, unknown>>>;
  updateRetailOrder(id: string, patch: { order_status?: string; payment_status?: string; internal_notes?: string }): Promise<{ order_reference: string } | null>;
  listCustomers(): Promise<Array<Record<string, unknown>>>;

  // Wholesale
  getWholesaleApplicationByEmail(email: string): Promise<Record<string, unknown> | null>;
  createWholesaleApplication(input: Record<string, unknown>): Promise<void>;
  getWholesaleProfileByUserId(userId: string): Promise<Record<string, unknown> | null>;
  listWholesaleCatalogue(): Promise<Array<Record<string, unknown>>>;
  listWholesaleInquiriesForProfile(profileId: string): Promise<Array<Record<string, unknown>>>;
  createWholesaleInquiry(input: {
    profileId: string;
    notes: string;
    items: Array<{ productId: string; quantity: number }>;
  }): Promise<{ inquiry_reference: string; estimated_total_cad: number; items: Array<Record<string, unknown>> } | { error: string }>;
  listAdminWholesaleData(): Promise<{
    applications: Array<Record<string, unknown>>;
    profiles: Array<Record<string, unknown>>;
    inquiries: Array<Record<string, unknown>>;
  }>;
  decideWholesaleApplication(id: string, status: 'approved' | 'rejected' | 'pending', rejectionReason: string): Promise<{ business_name: string } | null>;
  updateWholesaleProfileStatus(id: string, status: 'approved' | 'suspended'): Promise<void>;
  upsertWholesaleTier(productId: string, input: Record<string, unknown>): Promise<void>;
  updateWholesaleInquiryStatus(id: string, status: string): Promise<void>;
  createWholesaleQuotation(inquiryId: string, input: Record<string, unknown>): Promise<string>;

  // Media, Newsletter, Contact, Overview & Logs
  listMedia(): Promise<Array<Record<string, unknown>>>;
  createMedia(input: Record<string, unknown>): Promise<void>;
  getMediaById(id: string): Promise<{ id: string; file_url: string; file_name: string } | null>;
  getMediaContentById(id: string): Promise<{ id: string; file_url: string; file_name: string; mime_type: string; file_data: string } | null>;
  deleteMedia(id: string): Promise<void>;

  subscribeNewsletter(email: string): Promise<void>;
  saveContactMessage(input: { name: string; email: string; phone: string; subject: string; message: string }): Promise<void>;
  listContactMessages(): Promise<Array<Record<string, unknown>>>;
  logActivity(actorEmail: string, action: string, entityType: string, entityId: string, details: Record<string, unknown>): Promise<void>;
  listActivityLogs(limit?: number): Promise<Array<Record<string, unknown>>>;
  getOverviewStats(): Promise<Record<string, number>>;
}

const ADMIN_ROLE_LIST = ['super_admin', 'store_manager', 'wholesale_manager', 'content_manager'];

// ============================================================================
// 1. NEON POSTGRESQL + DRIZZLE ORM ADAPTER
// ============================================================================
class NeonDrizzleStore implements DataStore {
  mode = 'neon-postgresql' as const;

  async ensureReady(): Promise<void> {
    await ensureNeonSchemaAndSeed();
  }

  private get db() {
    return getNeonDb();
  }

  async countAdminUsers(): Promise<number> {
    const [{ value }] = await this.db
      .select({ value: count() })
      .from(schema.users)
      .where(inArray(schema.users.role, ADMIN_ROLE_LIST));
    return Number(value);
  }

  async getUserByEmail(email: string): Promise<DbUser | null> {
    const [row] = await this.db.select().from(schema.users).where(eq(schema.users.email, email)).limit(1);
    if (!row) return null;
    return { ...row, created_at: row.created_at.toISOString() };
  }

  async getUserById(id: string): Promise<DbUser | null> {
    const [row] = await this.db.select().from(schema.users).where(eq(schema.users.id, id)).limit(1);
    if (!row) return null;
    return { ...row, created_at: row.created_at.toISOString() };
  }

  async createUser(input: { id: string; email: string; full_name: string; password_hash: string; role: string }): Promise<void> {
    await this.db.insert(schema.users).values({
      id: input.id,
      email: input.email,
      full_name: input.full_name,
      password_hash: input.password_hash,
      role: input.role,
      is_active: true,
    });
  }

  async listAdminUsers(): Promise<Array<Omit<DbUser, 'password_hash'>>> {
    const rows = await this.db
      .select({
        id: schema.users.id,
        email: schema.users.email,
        full_name: schema.users.full_name,
        role: schema.users.role,
        is_active: schema.users.is_active,
        created_at: schema.users.created_at,
      })
      .from(schema.users)
      .where(inArray(schema.users.role, ADMIN_ROLE_LIST))
      .orderBy(desc(schema.users.created_at));
    return rows.map((r) => ({ ...r, created_at: r.created_at.toISOString() }));
  }

  async updateAdminUser(id: string, patch: { role?: string; is_active?: boolean }): Promise<boolean> {
    const [existing] = await this.db.select().from(schema.users).where(eq(schema.users.id, id)).limit(1);
    if (!existing) return false;
    await this.db
      .update(schema.users)
      .set({
        role: patch.role ?? existing.role,
        is_active: patch.is_active !== undefined ? patch.is_active : existing.is_active,
      })
      .where(eq(schema.users.id, id));
    return true;
  }

  async getSettings(): Promise<Record<string, unknown>> {
    const [row] = await this.db.select().from(schema.siteSettings).where(eq(schema.siteSettings.id, 1)).limit(1);
    return normalizeSiteSettings(row as unknown as Record<string, unknown> | undefined);
  }

  async updateSettings(s: Record<string, unknown>): Promise<void> {
    const current = await this.getSettings();
    const merged = { ...current, ...s };
    await this.db
      .update(schema.siteSettings)
      .set({
        business_name: String(merged.business_name || 'Kytura Naturals').trim(),
        brand_tagline: String(merged.brand_tagline ?? 'BOTANICAL WELLNESS · NATURAL LIVING').trim(),
        owner_name: String(merged.owner_name || 'Dr Ann Merah').trim(),
        email: String(merged.email || 'kyturanaturals@gmail.com').trim(),
        whatsapp_number: String(merged.whatsapp_number || '+14033719687').trim(),
        currency: String(merged.currency || 'CAD').trim(),
        region_label: String(merged.region_label || 'Global / All Regions').trim(),
        announcement_left: String(merged.announcement_left || '').trim(),
        announcement_center: String(merged.announcement_center || '').trim(),
        free_shipping_threshold_cad: String(Number(merged.free_shipping_threshold_cad ?? 100).toFixed(2)),
        seo_title: String(merged.seo_title || '').trim(),
        seo_description: String(merged.seo_description || '').trim(),
        social_facebook: String(merged.social_facebook || '').trim(),
        social_instagram: String(merged.social_instagram || '').trim(),
        social_youtube: String(merged.social_youtube || '').trim(),
        social_pinterest: String(merged.social_pinterest || '').trim(),
        logo_light_url: String(merged.logo_light_url || '').trim(),
        logo_dark_url: String(merged.logo_dark_url || '').trim(),
        brand_icon_url: String(merged.brand_icon_url || '').trim(),
        favicon_url: String(merged.favicon_url || '').trim(),
        header_links: normalizeHeaderLinks(merged.header_links) as unknown as Array<Record<string, unknown>>,
        footer_config: normalizeFooterConfig(merged.footer_config) as unknown as Record<string, unknown>,
        updated_at: new Date(),
      })
      .where(eq(schema.siteSettings.id, 1));
  }

  async listCategories(visibleOnly: boolean): Promise<Array<Record<string, unknown>>> {
    const rows = visibleOnly
      ? await this.db.select().from(schema.categories).where(eq(schema.categories.is_visible, true)).orderBy(asc(schema.categories.display_order))
      : await this.db.select().from(schema.categories).orderBy(asc(schema.categories.display_order));
    return rows;
  }

  async createCategory(input: Record<string, unknown>): Promise<void> {
    await this.db.insert(schema.categories).values({
      id: String(input.id),
      slug: String(input.slug),
      name: String(input.name),
      description: String(input.description || ''),
      image_url: String(input.image_url || ''),
      display_order: Number(input.display_order || 0),
      is_visible: Boolean(input.is_visible ?? true),
    });
  }

  async updateCategory(id: string, patch: Record<string, unknown>): Promise<void> {
    await this.db
      .update(schema.categories)
      .set({
        name: String(patch.name || '').trim(),
        description: String(patch.description || '').trim(),
        image_url: String(patch.image_url || '').trim(),
        display_order: Number(patch.display_order || 0),
        is_visible: Boolean(patch.is_visible ?? true),
        updated_at: new Date(),
      })
      .where(eq(schema.categories.id, id));
  }

  async deleteCategory(id: string): Promise<void> {
    await this.db.delete(schema.categories).where(eq(schema.categories.id, id));
  }

  async listHomepageSections(): Promise<Array<Record<string, unknown>>> {
    return this.db.select().from(schema.homepageSections).orderBy(asc(schema.homepageSections.display_order));
  }

  async updateHomepageSection(sectionKey: string, patch: Record<string, unknown>): Promise<void> {
    await this.db
      .update(schema.homepageSections)
      .set({
        title: String(patch.title || ''),
        subtitle: String(patch.subtitle || ''),
        body: String(patch.body || ''),
        cta_primary_label: String(patch.cta_primary_label || ''),
        cta_primary_href: String(patch.cta_primary_href || ''),
        cta_secondary_label: String(patch.cta_secondary_label || ''),
        cta_secondary_href: String(patch.cta_secondary_href || ''),
        image_url: String(patch.image_url || ''),
        extra_json: (patch.extra_json as Record<string, unknown>) || {},
        is_enabled: Boolean(patch.is_enabled ?? true),
        updated_at: new Date(),
      })
      .where(eq(schema.homepageSections.section_key, sectionKey));
  }

  async listTestimonials(publicOnly: boolean): Promise<Array<Record<string, unknown>>> {
    if (publicOnly) {
      return this.db
        .select()
        .from(schema.testimonials)
        .where(sql`${schema.testimonials.is_approved} = true AND ${schema.testimonials.is_published} = true`)
        .orderBy(desc(schema.testimonials.created_at));
    }
    return this.db.select().from(schema.testimonials).orderBy(desc(schema.testimonials.created_at));
  }

  async createTestimonial(input: Record<string, unknown>): Promise<void> {
    await this.db.insert(schema.testimonials).values({
      id: String(input.id),
      customer_name: String(input.customer_name),
      location: String(input.location || ''),
      quote: String(input.quote),
      rating: Number(input.rating || 5),
      avatar_url: String(input.avatar_url || ''),
      is_approved: Boolean(input.is_approved ?? true),
      is_published: Boolean(input.is_published ?? true),
    });
  }

  async updateTestimonial(id: string, patch: { is_approved?: boolean; is_published?: boolean }): Promise<boolean> {
    const [existing] = await this.db.select().from(schema.testimonials).where(eq(schema.testimonials.id, id)).limit(1);
    if (!existing) return false;
    await this.db
      .update(schema.testimonials)
      .set({
        is_approved: patch.is_approved ?? existing.is_approved,
        is_published: patch.is_published ?? existing.is_published,
      })
      .where(eq(schema.testimonials.id, id));
    return true;
  }

  async deleteTestimonial(id: string): Promise<void> {
    await this.db.delete(schema.testimonials).where(eq(schema.testimonials.id, id));
  }

  async listPages(): Promise<Array<Record<string, unknown>>> {
    return this.db.select().from(schema.pages).orderBy(asc(schema.pages.slug));
  }

  async getPageBySlug(slug: string): Promise<Record<string, unknown> | null> {
    const [page] = await this.db.select().from(schema.pages).where(eq(schema.pages.slug, slug)).limit(1);
    return page || null;
  }

  async updatePage(slug: string, patch: Record<string, unknown>): Promise<void> {
    await this.db
      .update(schema.pages)
      .set({
        title: String(patch.title || ''),
        subtitle: String(patch.subtitle || ''),
        content_markdown: String(patch.content_markdown || ''),
        extra_json: (patch.extra_json as Record<string, unknown>) || {},
        seo_title: String(patch.seo_title || ''),
        seo_description: String(patch.seo_description || ''),
        updated_at: new Date(),
      })
      .where(eq(schema.pages.slug, slug));
  }

  async getHydratedProducts(opts: {
    publishedOnly?: boolean;
    categorySlug?: string;
    search?: string;
    featuredOnly?: boolean;
    includeWholesaleTiers?: boolean;
  }): Promise<Array<Record<string, unknown>>> {
    const allProducts = await this.db
      .select()
      .from(schema.products)
      .orderBy(desc(schema.products.is_featured), desc(schema.products.created_at));

    const allImages = await this.db.select().from(schema.productImages).orderBy(desc(schema.productImages.is_primary), asc(schema.productImages.display_order));
    const allVariants = await this.db.select().from(schema.productVariants).orderBy(asc(schema.productVariants.display_order));
    const allCats = await this.db.select().from(schema.categories);
    const allProdCats = await this.db.select().from(schema.productCategories);
    const allTiers = opts.includeWholesaleTiers ? await this.db.select().from(schema.wholesalePriceTiers) : [];

    const catById = new Map(allCats.map((c) => [c.id, c]));
    const tierByProd = new Map(allTiers.map((t) => [t.product_id, t]));

    let result = allProducts.map((p) => {
      const catIds = allProdCats.filter((pc) => pc.product_id === p.id).map((pc) => pc.category_id);
      const cats = catIds.map((cid) => catById.get(cid)).filter(Boolean);
      const base: Record<string, unknown> = {
        id: p.id,
        slug: p.slug,
        name: p.name,
        sku: p.sku,
        short_description: p.short_description,
        description: p.description,
        retail_price_cad: Number(p.retail_price_cad),
        compare_at_price_cad: p.compare_at_price_cad !== null ? Number(p.compare_at_price_cad) : null,
        stock_quantity: p.stock_quantity,
        is_published: p.is_published,
        is_featured: p.is_featured,
        seo_title: p.seo_title,
        seo_description: p.seo_description,
        category_ids: catIds,
        category_names: cats.map((c) => c!.name),
        category_slugs: cats.map((c) => c!.slug),
        images: allImages.filter((i) => i.product_id === p.id),
        variants: allVariants
          .filter((v) => v.product_id === p.id)
          .map((v) => ({ ...v, price_cad: Number(v.price_cad) })),
      };
      if (opts.includeWholesaleTiers) {
        const t = tierByProd.get(p.id);
        base.wholesale_tier = t
          ? {
              ...t,
              base_wholesale_price_cad: Number(t.base_wholesale_price_cad),
              tier_2_price_cad: t.tier_2_price_cad !== null ? Number(t.tier_2_price_cad) : null,
              tier_3_price_cad: t.tier_3_price_cad !== null ? Number(t.tier_3_price_cad) : null,
            }
          : null;
      }
      return base;
    });

    if (opts.publishedOnly) result = result.filter((p) => p.is_published);
    if (opts.featuredOnly) result = result.filter((p) => p.is_featured);
    if (opts.categorySlug) {
      result = result.filter((p) => (p.category_slugs as string[]).includes(opts.categorySlug!));
    }
    if (opts.search?.trim()) {
      const q = opts.search.trim().toLowerCase();
      result = result.filter(
        (p) =>
          String(p.name).toLowerCase().includes(q) ||
          String(p.short_description).toLowerCase().includes(q) ||
          String(p.description).toLowerCase().includes(q) ||
          String(p.sku).toLowerCase().includes(q)
      );
    }

    return result.map(({ category_slugs: _omit, ...rest }) => rest);
  }

  async getProductBySlug(slug: string): Promise<Record<string, unknown> | null> {
    const prods = await this.getHydratedProducts({ publishedOnly: true });
    return prods.find((p) => p.slug === slug) || null;
  }

  async getProductForCheckout(productId: string, variantId?: string) {
    const [p] = await this.db.select().from(schema.products).where(eq(schema.products.id, productId)).limit(1);
    if (!p || !p.is_published) return null;
    let unitPriceCad = Number(p.retail_price_cad);
    let variantName = '';
    let resolvedVariantId: string | null = null;
    if (variantId) {
      const [v] = await this.db
        .select()
        .from(schema.productVariants)
        .where(sql`${schema.productVariants.id} = ${variantId} AND ${schema.productVariants.product_id} = ${p.id}`)
        .limit(1);
      if (!v || !v.is_available) return null;
      unitPriceCad = Number(v.price_cad);
      variantName = v.name;
      resolvedVariantId = v.id;
    }
    return { id: p.id, name: p.name, is_published: p.is_published, unitPriceCad, variantName, variantId: resolvedVariantId };
  }

  async createProduct(input: Record<string, unknown>): Promise<string> {
    const id = String(input.id);
    await this.db.insert(schema.products).values({
      id,
      slug: String(input.slug),
      name: String(input.name),
      sku: String(input.sku),
      short_description: String(input.short_description || ''),
      description: String(input.description || ''),
      retail_price_cad: String(Number(input.retail_price_cad).toFixed(2)),
      compare_at_price_cad:
        input.compare_at_price_cad !== null && input.compare_at_price_cad !== undefined && input.compare_at_price_cad !== ''
          ? String(Number(input.compare_at_price_cad).toFixed(2))
          : null,
      stock_quantity: Math.max(0, Math.floor(Number(input.stock_quantity) || 0)),
      is_published: Boolean(input.is_published ?? true),
      is_featured: Boolean(input.is_featured ?? false),
      seo_title: String(input.seo_title || ''),
      seo_description: String(input.seo_description || ''),
    });

    if (String(input.image_url || '').trim()) {
      await this.db.insert(schema.productImages).values({
        id: uid(),
        product_id: id,
        image_url: String(input.image_url).trim(),
        alt_text: String(input.name),
        display_order: 0,
        is_primary: true,
      });
    }

    const catIds = (input.category_ids as string[]) || [];
    for (const cid of catIds) {
      await this.db.insert(schema.productCategories).values({ product_id: id, category_id: cid }).onConflictDoNothing();
    }

    const variants = (input.variants as Array<Record<string, unknown>>) || [];
    for (let i = 0; i < variants.length; i++) {
      const v = variants[i];
      if (String(v.name || '').trim()) {
        await this.db.insert(schema.productVariants).values({
          id: uid(),
          product_id: id,
          name: String(v.name).trim(),
          sku: String(v.sku || `${input.sku}-V${i + 1}`).trim(),
          price_cad: String(Number(v.price_cad ?? input.retail_price_cad).toFixed(2)),
          stock_quantity: Math.max(0, Math.floor(Number(v.stock_quantity ?? input.stock_quantity) || 0)),
          is_available: v.is_available !== false,
          display_order: i,
        });
      }
    }
    return id;
  }

  async updateProduct(id: string, input: Record<string, unknown>): Promise<boolean> {
    const [existing] = await this.db.select().from(schema.products).where(eq(schema.products.id, id)).limit(1);
    if (!existing) return false;

    const resolvedSku = String(input.sku || existing.sku || `KN-${crypto.randomInt(10000, 99999)}`).trim();

    await this.db
      .update(schema.products)
      .set({
        name: String(input.name || existing.name).trim(),
        sku: resolvedSku,
        short_description: String(input.short_description || '').trim(),
        description: String(input.description || '').trim(),
        retail_price_cad: String(Number(input.retail_price_cad ?? existing.retail_price_cad).toFixed(2)),
        compare_at_price_cad:
          input.compare_at_price_cad !== null && input.compare_at_price_cad !== undefined && input.compare_at_price_cad !== ''
            ? String(Number(input.compare_at_price_cad).toFixed(2))
            : null,
        stock_quantity: Math.max(0, Math.floor(Number(input.stock_quantity ?? existing.stock_quantity) || 0)),
        is_published: Boolean(input.is_published ?? true),
        is_featured: Boolean(input.is_featured ?? false),
        seo_title: String(input.seo_title || '').trim(),
        seo_description: String(input.seo_description || '').trim(),
        updated_at: new Date(),
      })
      .where(eq(schema.products.id, id));

    if (input.image_url !== undefined) {
      await this.db.delete(schema.productImages).where(eq(schema.productImages.product_id, id));
      if (String(input.image_url || '').trim()) {
        await this.db.insert(schema.productImages).values({
          id: uid(),
          product_id: id,
          image_url: String(input.image_url).trim(),
          alt_text: String(input.name || existing.name).trim(),
          display_order: 0,
          is_primary: true,
        });
      }
    }

    if (Array.isArray(input.category_ids)) {
      await this.db.delete(schema.productCategories).where(eq(schema.productCategories.product_id, id));
      for (const cid of input.category_ids as string[]) {
        await this.db.insert(schema.productCategories).values({ product_id: id, category_id: cid }).onConflictDoNothing();
      }
    }

    if (Array.isArray(input.variants)) {
      await this.db.delete(schema.productVariants).where(eq(schema.productVariants.product_id, id));
      const variants = input.variants as Array<Record<string, unknown>>;
      for (let i = 0; i < variants.length; i++) {
        const v = variants[i];
        if (String(v.name || '').trim()) {
          await this.db.insert(schema.productVariants).values({
            id: uid(),
            product_id: id,
            name: String(v.name).trim(),
            sku: String(v.sku || `${input.sku}-V${i + 1}`).trim(),
            price_cad: String(Number(v.price_cad ?? input.retail_price_cad).toFixed(2)),
            stock_quantity: Math.max(0, Math.floor(Number(v.stock_quantity ?? input.stock_quantity) || 0)),
            is_available: v.is_available !== false,
            display_order: i,
          });
        }
      }
    }
    return true;
  }

  async deleteProduct(id: string): Promise<void> {
    await this.db.delete(schema.products).where(eq(schema.products.id, id));
  }

  async isProductSlugTaken(slug: string): Promise<boolean> {
    const [row] = await this.db.select({ id: schema.products.id }).from(schema.products).where(eq(schema.products.slug, slug)).limit(1);
    return Boolean(row);
  }

  async listSitemapSlugs(): Promise<{ products: string[]; categories: string[] }> {
    const prods = await this.db
      .select({ slug: schema.products.slug })
      .from(schema.products)
      .where(eq(schema.products.is_published, true));
    const cats = await this.db
      .select({ slug: schema.categories.slug })
      .from(schema.categories)
      .where(eq(schema.categories.is_visible, true));
    return {
      products: prods.map((p) => p.slug),
      categories: cats.map((c) => c.slug),
    };
  }

  async createRetailOrder(input: Parameters<DataStore['createRetailOrder']>[0]): Promise<void> {
    const [existingCustomer] = await this.db
      .select()
      .from(schema.customers)
      .where(eq(schema.customers.email, input.customer_email))
      .limit(1);

    let customerId = existingCustomer?.id;
    if (!customerId) {
      customerId = uid();
      await this.db.insert(schema.customers).values({
        id: customerId,
        email: input.customer_email,
        full_name: input.customer_name,
        phone: input.customer_phone,
        country: input.country,
        city: input.city,
        delivery_address: input.delivery_address,
      });
    } else {
      await this.db
        .update(schema.customers)
        .set({
          full_name: input.customer_name,
          phone: input.customer_phone,
          country: input.country,
          city: input.city,
          delivery_address: input.delivery_address,
          updated_at: new Date(),
        })
        .where(eq(schema.customers.id, customerId));
    }

    await this.db.insert(schema.retailOrders).values({
      id: input.orderId,
      order_reference: input.orderRef,
      customer_id: customerId,
      customer_name: input.customer_name,
      customer_email: input.customer_email,
      customer_phone: input.customer_phone,
      country: input.country,
      city: input.city,
      delivery_address: input.delivery_address,
      order_notes: input.order_notes,
      subtotal_cad: input.subtotalCad.toFixed(2),
      total_cad: input.totalCad.toFixed(2),
      currency: 'CAD',
      order_status: 'Awaiting WhatsApp Confirmation',
      payment_status: 'Unpaid',
      whatsapp_message_payload: input.whatsappMessage,
    });

    for (const it of input.items) {
      await this.db.insert(schema.retailOrderItems).values({
        id: uid(),
        order_id: input.orderId,
        product_id: it.product_id,
        variant_id: it.variant_id,
        product_name: it.product_name,
        variant_name: it.variant_name,
        unit_price_cad: it.unit_price_cad.toFixed(2),
        quantity: it.quantity,
        line_total_cad: it.line_total_cad.toFixed(2),
      });
    }
  }

  async listRetailOrders(): Promise<Array<Record<string, unknown>>> {
    const orders = await this.db.select().from(schema.retailOrders).orderBy(desc(schema.retailOrders.created_at));
    const items = await this.db.select().from(schema.retailOrderItems);
    return orders.map((o) => ({
      ...o,
      subtotal_cad: Number(o.subtotal_cad),
      total_cad: Number(o.total_cad),
      items: items
        .filter((it) => it.order_id === o.id)
        .map((it) => ({
          ...it,
          unit_price_cad: Number(it.unit_price_cad),
          line_total_cad: Number(it.line_total_cad),
        })),
    }));
  }

  async updateRetailOrder(
    id: string,
    patch: { order_status?: string; payment_status?: string; internal_notes?: string }
  ): Promise<{ order_reference: string } | null> {
    const [existing] = await this.db.select().from(schema.retailOrders).where(eq(schema.retailOrders.id, id)).limit(1);
    if (!existing) return null;
    await this.db
      .update(schema.retailOrders)
      .set({
        order_status: patch.order_status ?? existing.order_status,
        payment_status: patch.payment_status ?? existing.payment_status,
        internal_notes: patch.internal_notes !== undefined ? patch.internal_notes : existing.internal_notes,
        updated_at: new Date(),
      })
      .where(eq(schema.retailOrders.id, id));
    return { order_reference: existing.order_reference };
  }

  async listCustomers(): Promise<Array<Record<string, unknown>>> {
    const custs = await this.db.select().from(schema.customers).orderBy(desc(schema.customers.created_at));
    const orders = await this.db.select().from(schema.retailOrders);
    return custs.map((c) => {
      const myOrders = orders.filter((o) => o.customer_id === c.id);
      return {
        ...c,
        order_count: myOrders.length,
        total_spent_cad: Number(myOrders.reduce((acc, o) => acc + Number(o.total_cad), 0).toFixed(2)),
      };
    });
  }

  async getWholesaleApplicationByEmail(email: string): Promise<Record<string, unknown> | null> {
    const [row] = await this.db
      .select()
      .from(schema.wholesaleApplications)
      .where(eq(schema.wholesaleApplications.business_email, email))
      .limit(1);
    return row || null;
  }

  async createWholesaleApplication(input: Record<string, unknown>): Promise<void> {
    await this.db.insert(schema.wholesaleApplications).values({
      id: String(input.id),
      business_name: String(input.business_name),
      applicant_name: String(input.applicant_name),
      business_email: String(input.business_email),
      phone: String(input.phone),
      country: String(input.country),
      business_address: String(input.business_address),
      business_type: String(input.business_type),
      website_or_social: String(input.website_or_social || ''),
      additional_info: String(input.additional_info || ''),
      password_hash: String(input.password_hash),
      status: 'pending',
    });
  }

  async getWholesaleProfileByUserId(userId: string): Promise<Record<string, unknown> | null> {
    const [row] = await this.db
      .select()
      .from(schema.wholesaleProfiles)
      .where(eq(schema.wholesaleProfiles.user_id, userId))
      .limit(1);
    return row || null;
  }

  async listWholesaleCatalogue(): Promise<Array<Record<string, unknown>>> {
    const products = await this.getHydratedProducts({ publishedOnly: true, includeWholesaleTiers: true });
    return products.filter(
      (p) => p.wholesale_tier && (p.wholesale_tier as Record<string, unknown>).is_wholesale_available
    );
  }

  async listWholesaleInquiriesForProfile(profileId: string): Promise<Array<Record<string, unknown>>> {
    const inqs = await this.db
      .select()
      .from(schema.wholesaleInquiries)
      .where(eq(schema.wholesaleInquiries.wholesale_profile_id, profileId))
      .orderBy(desc(schema.wholesaleInquiries.created_at));
    const items = await this.db.select().from(schema.wholesaleInquiryItems);
    const quotes = await this.db.select().from(schema.wholesaleQuotations).orderBy(desc(schema.wholesaleQuotations.created_at));

    return inqs.map((inq) => ({
      ...inq,
      estimated_total_cad: Number(inq.estimated_total_cad),
      items: items
        .filter((it) => it.inquiry_id === inq.id)
        .map((it) => ({
          ...it,
          quoted_unit_price_cad: Number(it.quoted_unit_price_cad),
          line_total_cad: Number(it.line_total_cad),
        })),
      quotations: quotes
        .filter((q) => q.inquiry_id === inq.id)
        .map((q) => ({
          ...q,
          quoted_total_cad: Number(q.quoted_total_cad),
          shipping_estimate_cad: Number(q.shipping_estimate_cad),
        })),
    }));
  }

  async createWholesaleInquiry(input: {
    profileId: string;
    notes: string;
    items: Array<{ productId: string; quantity: number }>;
  }) {
    let estimatedTotal = 0;
    const resolvedItems: Array<{ product_id: string; product_name: string; quantity: number; quoted_unit_price_cad: number; line_total_cad: number }> = [];

    for (const item of input.items) {
      const qty = Math.floor(Number(item.quantity));
      const [prod] = await this.db.select().from(schema.products).where(eq(schema.products.id, item.productId)).limit(1);
      const [tier] = await this.db
        .select()
        .from(schema.wholesalePriceTiers)
        .where(eq(schema.wholesalePriceTiers.product_id, item.productId))
        .limit(1);

      if (!prod || !prod.is_published || !tier || !tier.is_wholesale_available) {
        return { error: 'One or more requested items are unavailable for wholesale.' };
      }
      if (!Number.isFinite(qty) || qty < tier.moq) {
        return { error: `Minimum order quantity for ${prod.name} is ${tier.moq} units.` };
      }

      let unitPrice = Number(tier.base_wholesale_price_cad);
      if (tier.tier_3_min_qty && tier.tier_3_price_cad !== null && qty >= tier.tier_3_min_qty) {
        unitPrice = Number(tier.tier_3_price_cad);
      } else if (tier.tier_2_min_qty && tier.tier_2_price_cad !== null && qty >= tier.tier_2_min_qty) {
        unitPrice = Number(tier.tier_2_price_cad);
      }

      const lineTotal = Number((unitPrice * qty).toFixed(2));
      estimatedTotal += lineTotal;
      resolvedItems.push({
        product_id: prod.id,
        product_name: prod.name,
        quantity: qty,
        quoted_unit_price_cad: unitPrice,
        line_total_cad: lineTotal,
      });
    }

    const inquiryId = uid();
    const ref = `KN-WH-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${crypto.randomInt(1000, 9999)}`;
    await this.db.insert(schema.wholesaleInquiries).values({
      id: inquiryId,
      inquiry_reference: ref,
      wholesale_profile_id: input.profileId,
      notes: input.notes.trim(),
      estimated_total_cad: estimatedTotal.toFixed(2),
      status: 'Submitted',
    });

    for (const it of resolvedItems) {
      await this.db.insert(schema.wholesaleInquiryItems).values({
        id: uid(),
        inquiry_id: inquiryId,
        product_id: it.product_id,
        product_name: it.product_name,
        quantity: it.quantity,
        quoted_unit_price_cad: it.quoted_unit_price_cad.toFixed(2),
        line_total_cad: it.line_total_cad.toFixed(2),
      });
    }

    return { inquiry_reference: ref, estimated_total_cad: Number(estimatedTotal.toFixed(2)), items: resolvedItems };
  }

  async listAdminWholesaleData() {
    const applications = await this.db
      .select({
        id: schema.wholesaleApplications.id,
        business_name: schema.wholesaleApplications.business_name,
        applicant_name: schema.wholesaleApplications.applicant_name,
        business_email: schema.wholesaleApplications.business_email,
        phone: schema.wholesaleApplications.phone,
        country: schema.wholesaleApplications.country,
        business_address: schema.wholesaleApplications.business_address,
        business_type: schema.wholesaleApplications.business_type,
        website_or_social: schema.wholesaleApplications.website_or_social,
        additional_info: schema.wholesaleApplications.additional_info,
        status: schema.wholesaleApplications.status,
        rejection_reason: schema.wholesaleApplications.rejection_reason,
        reviewed_at: schema.wholesaleApplications.reviewed_at,
        created_at: schema.wholesaleApplications.created_at,
      })
      .from(schema.wholesaleApplications)
      .orderBy(desc(schema.wholesaleApplications.created_at));

    const profiles = await this.db.select().from(schema.wholesaleProfiles).orderBy(desc(schema.wholesaleProfiles.created_at));
    const profileMap = new Map(profiles.map((p) => [p.id, p]));
    const inqs = await this.db.select().from(schema.wholesaleInquiries).orderBy(desc(schema.wholesaleInquiries.created_at));
    const items = await this.db.select().from(schema.wholesaleInquiryItems);
    const quotes = await this.db.select().from(schema.wholesaleQuotations);

    return {
      applications,
      profiles,
      inquiries: inqs.map((inq) => {
        const prof = profileMap.get(inq.wholesale_profile_id);
        return {
          ...inq,
          business_name: prof?.business_name || '',
          contact_name: prof?.contact_name || '',
          business_email: prof?.business_email || '',
          estimated_total_cad: Number(inq.estimated_total_cad),
          items: items
            .filter((it) => it.inquiry_id === inq.id)
            .map((it) => ({
              ...it,
              quoted_unit_price_cad: Number(it.quoted_unit_price_cad),
              line_total_cad: Number(it.line_total_cad),
            })),
          quotations: quotes
            .filter((q) => q.inquiry_id === inq.id)
            .map((q) => ({
              ...q,
              quoted_total_cad: Number(q.quoted_total_cad),
              shipping_estimate_cad: Number(q.shipping_estimate_cad),
            })),
        };
      }),
    };
  }

  async decideWholesaleApplication(id: string, status: 'approved' | 'rejected' | 'pending', rejectionReason: string) {
    const [appRecord] = await this.db
      .select()
      .from(schema.wholesaleApplications)
      .where(eq(schema.wholesaleApplications.id, id))
      .limit(1);
    if (!appRecord) return null;

    await this.db
      .update(schema.wholesaleApplications)
      .set({ status, rejection_reason: rejectionReason, reviewed_at: new Date(), updated_at: new Date() })
      .where(eq(schema.wholesaleApplications.id, id));

    if (status === 'approved') {
      const [existingUser] = await this.db
        .select()
        .from(schema.users)
        .where(eq(schema.users.email, appRecord.business_email))
        .limit(1);

      let userId = existingUser?.id;
      if (!userId) {
        userId = uid();
        await this.db.insert(schema.users).values({
          id: userId,
          email: appRecord.business_email,
          full_name: appRecord.applicant_name,
          password_hash: appRecord.password_hash,
          role: 'wholesale_buyer',
          is_active: true,
        });
      }

      const [existingProf] = await this.db
        .select()
        .from(schema.wholesaleProfiles)
        .where(eq(schema.wholesaleProfiles.user_id, userId))
        .limit(1);

      if (!existingProf) {
        await this.db.insert(schema.wholesaleProfiles).values({
          id: uid(),
          user_id: userId,
          application_id: appRecord.id,
          business_name: appRecord.business_name,
          contact_name: appRecord.applicant_name,
          business_email: appRecord.business_email,
          phone: appRecord.phone,
          country: appRecord.country,
          business_address: appRecord.business_address,
          business_type: appRecord.business_type,
          status: 'approved',
        });
      } else {
        await this.db
          .update(schema.wholesaleProfiles)
          .set({ status: 'approved', updated_at: new Date() })
          .where(eq(schema.wholesaleProfiles.user_id, userId));
      }
    }

    return { business_name: appRecord.business_name };
  }

  async updateWholesaleProfileStatus(id: string, status: 'approved' | 'suspended'): Promise<void> {
    await this.db
      .update(schema.wholesaleProfiles)
      .set({ status, updated_at: new Date() })
      .where(eq(schema.wholesaleProfiles.id, id));
  }

  async upsertWholesaleTier(productId: string, input: Record<string, unknown>): Promise<void> {
    const [existing] = await this.db
      .select()
      .from(schema.wholesalePriceTiers)
      .where(eq(schema.wholesalePriceTiers.product_id, productId))
      .limit(1);

    const payload = {
      moq: Math.max(1, Math.floor(Number(input.moq || 10))),
      base_wholesale_price_cad: String(Number(input.base_wholesale_price_cad).toFixed(2)),
      tier_2_min_qty: input.tier_2_min_qty ? Number(input.tier_2_min_qty) : null,
      tier_2_price_cad: input.tier_2_price_cad !== null && input.tier_2_price_cad !== '' ? String(Number(input.tier_2_price_cad).toFixed(2)) : null,
      tier_3_min_qty: input.tier_3_min_qty ? Number(input.tier_3_min_qty) : null,
      tier_3_price_cad: input.tier_3_price_cad !== null && input.tier_3_price_cad !== '' ? String(Number(input.tier_3_price_cad).toFixed(2)) : null,
      is_wholesale_available: Boolean(input.is_wholesale_available ?? true),
      updated_at: new Date(),
    };

    if (existing) {
      await this.db.update(schema.wholesalePriceTiers).set(payload).where(eq(schema.wholesalePriceTiers.product_id, productId));
    } else {
      await this.db.insert(schema.wholesalePriceTiers).values({ id: uid(), product_id: productId, ...payload });
    }
  }

  async updateWholesaleInquiryStatus(id: string, status: string): Promise<void> {
    await this.db
      .update(schema.wholesaleInquiries)
      .set({ status, updated_at: new Date() })
      .where(eq(schema.wholesaleInquiries.id, id));
  }

  async createWholesaleQuotation(inquiryId: string, input: Record<string, unknown>): Promise<string> {
    const qid = uid();
    await this.db.insert(schema.wholesaleQuotations).values({
      id: qid,
      inquiry_id: inquiryId,
      quoted_total_cad: String(Number(input.quoted_total_cad).toFixed(2)),
      shipping_estimate_cad: String(Number(input.shipping_estimate_cad || 0).toFixed(2)),
      terms: String(input.terms || '').trim(),
      valid_until: input.valid_until ? String(input.valid_until) : null,
    });
    await this.db
      .update(schema.wholesaleInquiries)
      .set({ status: 'Quoted', updated_at: new Date() })
      .where(eq(schema.wholesaleInquiries.id, inquiryId));
    return qid;
  }

  async listMedia(): Promise<Array<Record<string, unknown>>> {
    return this.db
      .select({
        id: schema.mediaLibrary.id,
        file_name: schema.mediaLibrary.file_name,
        bucket: schema.mediaLibrary.bucket,
        file_url: schema.mediaLibrary.file_url,
        mime_type: schema.mediaLibrary.mime_type,
        file_size_bytes: schema.mediaLibrary.file_size_bytes,
        alt_text: schema.mediaLibrary.alt_text,
        created_at: schema.mediaLibrary.created_at,
      })
      .from(schema.mediaLibrary)
      .orderBy(desc(schema.mediaLibrary.created_at));
  }

  async createMedia(input: Record<string, unknown>): Promise<void> {
    await this.db.insert(schema.mediaLibrary).values({
      id: String(input.id),
      file_name: String(input.file_name),
      bucket: String(input.bucket || 'media-library'),
      file_url: String(input.file_url),
      mime_type: String(input.mime_type),
      file_size_bytes: Number(input.file_size_bytes || 0),
      alt_text: String(input.alt_text || ''),
      file_data: String(input.file_data || ''),
    });
  }

  async getMediaById(id: string) {
    const [row] = await this.db
      .select({ id: schema.mediaLibrary.id, file_url: schema.mediaLibrary.file_url, file_name: schema.mediaLibrary.file_name })
      .from(schema.mediaLibrary)
      .where(eq(schema.mediaLibrary.id, id))
      .limit(1);
    return row || null;
  }

  async getMediaContentById(id: string) {
    const [row] = await this.db
      .select({
        id: schema.mediaLibrary.id,
        file_url: schema.mediaLibrary.file_url,
        file_name: schema.mediaLibrary.file_name,
        mime_type: schema.mediaLibrary.mime_type,
        file_data: schema.mediaLibrary.file_data,
      })
      .from(schema.mediaLibrary)
      .where(eq(schema.mediaLibrary.id, id))
      .limit(1);
    return row || null;
  }

  async deleteMedia(id: string): Promise<void> {
    await this.db.delete(schema.mediaLibrary).where(eq(schema.mediaLibrary.id, id));
  }

  async subscribeNewsletter(email: string): Promise<void> {
    await this.db.insert(schema.newsletterSubscribers).values({ id: uid(), email }).onConflictDoNothing();
  }

  async saveContactMessage(input: { name: string; email: string; phone: string; subject: string; message: string }): Promise<void> {
    await this.db.insert(schema.contactMessages).values({ id: uid(), ...input });
  }

  async listContactMessages(): Promise<Array<Record<string, unknown>>> {
    return this.db.select().from(schema.contactMessages).orderBy(desc(schema.contactMessages.created_at));
  }

  async logActivity(actorEmail: string, action: string, entityType: string, entityId: string, details: Record<string, unknown>): Promise<void> {
    await this.db.insert(schema.activityLogs).values({
      id: uid(),
      actor_email: actorEmail,
      action,
      entity_type: entityType,
      entity_id: entityId,
      details,
    });
  }

  async listActivityLogs(limit = 100): Promise<Array<Record<string, unknown>>> {
    return this.db.select().from(schema.activityLogs).orderBy(desc(schema.activityLogs.created_at)).limit(limit);
  }

  async getOverviewStats(): Promise<Record<string, number>> {
    const [p] = await this.db.select({ c: count() }).from(schema.products);
    const [o] = await this.db.select({ c: count() }).from(schema.retailOrders);
    const [po] = await this.db
      .select({ c: count() })
      .from(schema.retailOrders)
      .where(inArray(schema.retailOrders.order_status, ['Awaiting WhatsApp Confirmation', 'Pending Business Confirmation']));
    const [cu] = await this.db.select({ c: count() }).from(schema.customers);
    const [pwa] = await this.db
      .select({ c: count() })
      .from(schema.wholesaleApplications)
      .where(eq(schema.wholesaleApplications.status, 'pending'));
    const [twa] = await this.db.select({ c: count() }).from(schema.wholesaleApplications);
    const [wi] = await this.db.select({ c: count() }).from(schema.wholesaleInquiries);
    const [ns] = await this.db.select({ c: count() }).from(schema.newsletterSubscribers);

    return {
      totalProducts: Number(p.c),
      totalOrders: Number(o.c),
      pendingOrders: Number(po.c),
      totalCustomers: Number(cu.c),
      pendingWholesaleApps: Number(pwa.c),
      totalWholesaleApps: Number(twa.c),
      wholesaleInquiries: Number(wi.c),
      newsletterCount: Number(ns.c),
    };
  }
}

// ============================================================================
// 2. LOCAL SQLITE FALLBACK (ONLY WHEN NO NEON ENV VARS ARE PRESENT IN PREVIEW)
// ============================================================================
class LocalSqliteStore implements DataStore {
  mode = 'local-sqlite-preview' as const;
  private initialized = false;

  private get sqliteDb() {
    return getSqliteDb();
  }

  async ensureReady(): Promise<void> {
    if (!this.initialized) {
      initSqlite();
      this.initialized = true;
    }
  }

  async countAdminUsers(): Promise<number> {
    return (
      this.sqliteDb.prepare("SELECT COUNT(*) as cnt FROM users WHERE role IN ('super_admin','store_manager','wholesale_manager','content_manager')").get() as {
        cnt: number;
      }
    ).cnt;
  }

  async getUserByEmail(email: string): Promise<DbUser | null> {
    const row = this.sqliteDb.prepare('SELECT * FROM users WHERE email = ?').get(email) as Record<string, unknown> | undefined;
    return row ? { ...(row as unknown as DbUser), is_active: Boolean(row.is_active) } : null;
  }

  async getUserById(id: string): Promise<DbUser | null> {
    const row = this.sqliteDb.prepare('SELECT * FROM users WHERE id = ?').get(id) as Record<string, unknown> | undefined;
    return row ? { ...(row as unknown as DbUser), is_active: Boolean(row.is_active) } : null;
  }

  async createUser(input: { id: string; email: string; full_name: string; password_hash: string; role: string }): Promise<void> {
    this.sqliteDb
      .prepare('INSERT INTO users (id, email, full_name, password_hash, role, is_active) VALUES (?, ?, ?, ?, ?, 1)')
      .run(input.id, input.email, input.full_name, input.password_hash, input.role);
  }

  async listAdminUsers() {
    return (
      this.sqliteDb
        .prepare("SELECT id, email, full_name, role, is_active, created_at FROM users WHERE role != 'wholesale_buyer' ORDER BY created_at DESC")
        .all() as Array<Record<string, unknown>>
    ).map((u) => ({ ...(u as unknown as Omit<DbUser, 'password_hash'>), is_active: Boolean(u.is_active) }));
  }

  async updateAdminUser(id: string, patch: { role?: string; is_active?: boolean }): Promise<boolean> {
    const existing = this.sqliteDb.prepare('SELECT role, is_active FROM users WHERE id = ?').get(id) as
      | { role: string; is_active: number }
      | undefined;
    if (!existing) return false;
    this.sqliteDb
      .prepare('UPDATE users SET role = ?, is_active = ? WHERE id = ?')
      .run(patch.role ?? existing.role, patch.is_active !== undefined ? (patch.is_active ? 1 : 0) : existing.is_active, id);
    return true;
  }

  async getSettings() {
    const row = this.sqliteDb.prepare('SELECT * FROM site_settings WHERE id = 1').get() as Record<string, unknown> | undefined;
    return normalizeSiteSettings(row);
  }

  async updateSettings(s: Record<string, unknown>) {
    const current = await this.getSettings();
    const merged = { ...current, ...s };
    this.sqliteDb
      .prepare(`
        UPDATE site_settings SET
          business_name = ?, brand_tagline = ?, owner_name = ?, email = ?, whatsapp_number = ?,
          currency = ?, region_label = ?, announcement_left = ?, announcement_center = ?,
          free_shipping_threshold_cad = ?, seo_title = ?, seo_description = ?,
          social_facebook = ?, social_instagram = ?, social_youtube = ?, social_pinterest = ?,
          logo_light_url = ?, logo_dark_url = ?, brand_icon_url = ?, favicon_url = ?,
          header_links = ?, footer_config = ?,
          updated_at = datetime('now')
        WHERE id = 1
      `)
      .run(
        String(merged.business_name || 'Kytura Naturals').trim(),
        String(merged.brand_tagline ?? 'BOTANICAL WELLNESS · NATURAL LIVING').trim(),
        String(merged.owner_name || 'Dr Ann Merah').trim(),
        String(merged.email || 'kyturanaturals@gmail.com').trim(),
        String(merged.whatsapp_number || '+14033719687').trim(),
        String(merged.currency || 'CAD').trim(),
        String(merged.region_label || 'Global / All Regions').trim(),
        String(merged.announcement_left || '').trim(),
        String(merged.announcement_center || '').trim(),
        Number(merged.free_shipping_threshold_cad ?? 100),
        String(merged.seo_title || '').trim(),
        String(merged.seo_description || '').trim(),
        String(merged.social_facebook || '').trim(),
        String(merged.social_instagram || '').trim(),
        String(merged.social_youtube || '').trim(),
        String(merged.social_pinterest || '').trim(),
        String(merged.logo_light_url || '').trim(),
        String(merged.logo_dark_url || '').trim(),
        String(merged.brand_icon_url || '').trim(),
        String(merged.favicon_url || '').trim(),
        JSON.stringify(normalizeHeaderLinks(merged.header_links)),
        JSON.stringify(normalizeFooterConfig(merged.footer_config))
      );
  }

  async listCategories(visibleOnly: boolean) {
    const sqlStr = visibleOnly
      ? 'SELECT * FROM categories WHERE is_visible = 1 ORDER BY display_order ASC'
      : 'SELECT * FROM categories ORDER BY display_order ASC';
    return (this.sqliteDb.prepare(sqlStr).all() as Array<Record<string, unknown>>).map((c) => ({ ...c, is_visible: Boolean(c.is_visible) }));
  }

  async createCategory(input: Record<string, unknown>) {
    this.sqliteDb
      .prepare('INSERT INTO categories (id, slug, name, description, image_url, display_order, is_visible) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(
        String(input.id),
        String(input.slug),
        String(input.name),
        String(input.description || ''),
        String(input.image_url || ''),
        Number(input.display_order || 0),
        input.is_visible ? 1 : 0
      );
  }

  async updateCategory(id: string, patch: Record<string, unknown>) {
    this.sqliteDb
      .prepare("UPDATE categories SET name = ?, description = ?, image_url = ?, display_order = ?, is_visible = ?, updated_at = datetime('now') WHERE id = ?")
      .run(
        String(patch.name || '').trim(),
        String(patch.description || '').trim(),
        String(patch.image_url || '').trim(),
        Number(patch.display_order || 0),
        patch.is_visible ? 1 : 0,
        id
      );
  }

  async deleteCategory(id: string) {
    this.sqliteDb.prepare('DELETE FROM categories WHERE id = ?').run(id);
  }

  async listHomepageSections() {
    return (this.sqliteDb.prepare('SELECT * FROM homepage_sections ORDER BY display_order ASC').all() as Array<Record<string, unknown>>).map((s) => ({
      ...s,
      is_enabled: Boolean(s.is_enabled),
      extra_json: JSON.parse(String(s.extra_json || '{}')),
    }));
  }

  async updateHomepageSection(sectionKey: string, patch: Record<string, unknown>) {
    this.sqliteDb
      .prepare(`
        UPDATE homepage_sections SET
          title = ?, subtitle = ?, body = ?,
          cta_primary_label = ?, cta_primary_href = ?,
          cta_secondary_label = ?, cta_secondary_href = ?,
          image_url = ?, extra_json = ?, is_enabled = ?,
          updated_at = datetime('now')
        WHERE section_key = ?
      `)
      .run(
        String(patch.title || ''),
        String(patch.subtitle || ''),
        String(patch.body || ''),
        String(patch.cta_primary_label || ''),
        String(patch.cta_primary_href || ''),
        String(patch.cta_secondary_label || ''),
        String(patch.cta_secondary_href || ''),
        String(patch.image_url || ''),
        JSON.stringify(patch.extra_json || {}),
        patch.is_enabled ? 1 : 0,
        sectionKey
      );
  }

  async listTestimonials(publicOnly: boolean) {
    const sqlStr = publicOnly
      ? 'SELECT * FROM testimonials WHERE is_approved = 1 AND is_published = 1 ORDER BY created_at DESC'
      : 'SELECT * FROM testimonials ORDER BY created_at DESC';
    return (this.sqliteDb.prepare(sqlStr).all() as Array<Record<string, unknown>>).map((t) => ({
      ...t,
      is_approved: Boolean(t.is_approved),
      is_published: Boolean(t.is_published),
    }));
  }

  async createTestimonial(input: Record<string, unknown>) {
    this.sqliteDb
      .prepare('INSERT INTO testimonials (id, customer_name, location, quote, rating, avatar_url, is_approved, is_published) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      .run(
        String(input.id),
        String(input.customer_name),
        String(input.location || ''),
        String(input.quote),
        Number(input.rating || 5),
        String(input.avatar_url || ''),
        input.is_approved ? 1 : 0,
        input.is_published ? 1 : 0
      );
  }

  async updateTestimonial(id: string, patch: { is_approved?: boolean; is_published?: boolean }) {
    const existing = this.sqliteDb.prepare('SELECT is_approved, is_published FROM testimonials WHERE id = ?').get(id) as
      | { is_approved: number; is_published: number }
      | undefined;
    if (!existing) return false;
    this.sqliteDb
      .prepare('UPDATE testimonials SET is_approved = ?, is_published = ? WHERE id = ?')
      .run(
        patch.is_approved !== undefined ? (patch.is_approved ? 1 : 0) : existing.is_approved,
        patch.is_published !== undefined ? (patch.is_published ? 1 : 0) : existing.is_published,
        id
      );
    return true;
  }

  async deleteTestimonial(id: string) {
    this.sqliteDb.prepare('DELETE FROM testimonials WHERE id = ?').run(id);
  }

  async listPages() {
    return (this.sqliteDb.prepare('SELECT * FROM pages ORDER BY slug ASC').all() as Array<Record<string, unknown>>).map((p) => ({
      ...p,
      extra_json: JSON.parse(String(p.extra_json || '{}')),
    }));
  }

  async getPageBySlug(slug: string) {
    const p = this.sqliteDb.prepare('SELECT * FROM pages WHERE slug = ?').get(slug) as Record<string, unknown> | undefined;
    return p ? { ...p, extra_json: JSON.parse(String(p.extra_json || '{}')) } : null;
  }

  async updatePage(slug: string, patch: Record<string, unknown>) {
    this.sqliteDb
      .prepare("UPDATE pages SET title = ?, subtitle = ?, content_markdown = ?, extra_json = ?, seo_title = ?, seo_description = ?, updated_at = datetime('now') WHERE slug = ?")
      .run(
        String(patch.title || ''),
        String(patch.subtitle || ''),
        String(patch.content_markdown || ''),
        JSON.stringify(patch.extra_json || {}),
        String(patch.seo_title || ''),
        String(patch.seo_description || ''),
        slug
      );
  }

  async getHydratedProducts(opts: {
    publishedOnly?: boolean;
    categorySlug?: string;
    search?: string;
    featuredOnly?: boolean;
    includeWholesaleTiers?: boolean;
  }) {
    const where: string[] = [];
    const params: (string | number)[] = [];
    if (opts.publishedOnly) where.push('p.is_published = 1');
    if (opts.featuredOnly) where.push('p.is_featured = 1');
    if (opts.search?.trim()) {
      const q = `%${opts.search.trim()}%`;
      where.push('(p.name LIKE ? OR p.short_description LIKE ? OR p.description LIKE ? OR p.sku LIKE ?)');
      params.push(q, q, q, q);
    }
    if (opts.categorySlug) {
      where.push('EXISTS (SELECT 1 FROM product_categories pc JOIN categories c ON c.id = pc.category_id WHERE pc.product_id = p.id AND c.slug = ?)');
      params.push(opts.categorySlug);
    }

    const rows = this.sqliteDb
      .prepare(`SELECT p.* FROM products p ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY p.is_featured DESC, p.created_at DESC`)
      .all(...params) as Array<Record<string, unknown>>;

    const tiers = opts.includeWholesaleTiers ? (this.sqliteDb.prepare('SELECT * FROM wholesale_price_tiers').all() as Array<Record<string, unknown>>) : [];
    const tierMap = new Map(tiers.map((t) => [String(t.product_id), t]));

    return rows.map((p) => {
      const images = this.sqliteDb
        .prepare('SELECT id, product_id, image_url, alt_text, display_order, is_primary FROM product_images WHERE product_id = ? ORDER BY is_primary DESC, display_order ASC')
        .all(String(p.id))
        .map((img: Record<string, unknown>) => ({ ...img, is_primary: Boolean(img.is_primary) }));
      const variants = this.sqliteDb
        .prepare('SELECT id, product_id, name, sku, price_cad, stock_quantity, is_available, display_order FROM product_variants WHERE product_id = ? ORDER BY display_order ASC')
        .all(String(p.id))
        .map((v: Record<string, unknown>) => ({ ...v, is_available: Boolean(v.is_available) }));
      const cats = this.sqliteDb
        .prepare('SELECT c.id, c.name FROM categories c JOIN product_categories pc ON pc.category_id = c.id WHERE pc.product_id = ?')
        .all(String(p.id)) as Array<{ id: string; name: string }>;

      const base: Record<string, unknown> = {
        id: p.id,
        slug: p.slug,
        name: p.name,
        sku: p.sku,
        short_description: p.short_description,
        description: p.description,
        retail_price_cad: Number(p.retail_price_cad),
        compare_at_price_cad: p.compare_at_price_cad !== null ? Number(p.compare_at_price_cad) : null,
        stock_quantity: Number(p.stock_quantity),
        is_published: Boolean(p.is_published),
        is_featured: Boolean(p.is_featured),
        seo_title: p.seo_title,
        seo_description: p.seo_description,
        category_ids: cats.map((c) => c.id),
        category_names: cats.map((c) => c.name),
        images,
        variants,
      };
      if (opts.includeWholesaleTiers) {
        const t = tierMap.get(String(p.id));
        base.wholesale_tier = t
          ? {
              ...t,
              moq: Number(t.moq),
              base_wholesale_price_cad: Number(t.base_wholesale_price_cad),
              tier_2_min_qty: t.tier_2_min_qty !== null ? Number(t.tier_2_min_qty) : null,
              tier_2_price_cad: t.tier_2_price_cad !== null ? Number(t.tier_2_price_cad) : null,
              tier_3_min_qty: t.tier_3_min_qty !== null ? Number(t.tier_3_min_qty) : null,
              tier_3_price_cad: t.tier_3_price_cad !== null ? Number(t.tier_3_price_cad) : null,
              is_wholesale_available: Boolean(t.is_wholesale_available),
            }
          : null;
      }
      return base;
    });
  }

  async getProductBySlug(slug: string) {
    const prods = await this.getHydratedProducts({ publishedOnly: true });
    return prods.find((p) => p.slug === slug) || null;
  }

  async getProductForCheckout(productId: string, variantId?: string) {
    const product = this.sqliteDb
      .prepare('SELECT id, name, retail_price_cad, is_published FROM products WHERE id = ?')
      .get(productId) as { id: string; name: string; retail_price_cad: number; is_published: number } | undefined;
    if (!product || !product.is_published) return null;
    let unitPriceCad = Number(product.retail_price_cad);
    let variantName = '';
    let resolvedVariantId: string | null = null;
    if (variantId) {
      const variant = this.sqliteDb
        .prepare('SELECT id, name, price_cad, is_available FROM product_variants WHERE id = ? AND product_id = ?')
        .get(variantId, product.id) as { id: string; name: string; price_cad: number; is_available: number } | undefined;
      if (!variant || !variant.is_available) return null;
      unitPriceCad = Number(variant.price_cad);
      variantName = variant.name;
      resolvedVariantId = variant.id;
    }
    return { id: product.id, name: product.name, is_published: Boolean(product.is_published), unitPriceCad, variantName, variantId: resolvedVariantId };
  }

  async createProduct(input: Record<string, unknown>) {
    const id = String(input.id);
    this.sqliteDb
      .prepare(`
        INSERT INTO products (id, slug, name, sku, short_description, description, retail_price_cad, compare_at_price_cad, stock_quantity, is_published, is_featured, seo_title, seo_description)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .run(
        id,
        String(input.slug),
        String(input.name),
        String(input.sku),
        String(input.short_description || ''),
        String(input.description || ''),
        Number(input.retail_price_cad),
        input.compare_at_price_cad !== null && input.compare_at_price_cad !== '' ? Number(input.compare_at_price_cad) : null,
        Math.max(0, Math.floor(Number(input.stock_quantity) || 0)),
        input.is_published ? 1 : 0,
        input.is_featured ? 1 : 0,
        String(input.seo_title || ''),
        String(input.seo_description || '')
      );
    if (String(input.image_url || '').trim()) {
      this.sqliteDb
        .prepare('INSERT INTO product_images (id, product_id, image_url, alt_text, display_order, is_primary) VALUES (?, ?, ?, ?, 0, 1)')
        .run(uid(), id, String(input.image_url).trim(), String(input.name));
    }
    for (const cid of (input.category_ids as string[]) || []) {
      this.sqliteDb.prepare('INSERT OR IGNORE INTO product_categories (product_id, category_id) VALUES (?, ?)').run(id, cid);
    }
    const variants = (input.variants as Array<Record<string, unknown>>) || [];
    variants.forEach((v, idx) => {
      if (String(v.name || '').trim()) {
        this.sqliteDb
          .prepare('INSERT INTO product_variants (id, product_id, name, sku, price_cad, stock_quantity, is_available, display_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
          .run(
            uid(),
            id,
            String(v.name).trim(),
            String(v.sku || `${input.sku}-V${idx + 1}`).trim(),
            Number(v.price_cad ?? input.retail_price_cad),
            Math.max(0, Math.floor(Number(v.stock_quantity ?? input.stock_quantity) || 0)),
            v.is_available === false ? 0 : 1,
            idx
          );
      }
    });
    return id;
  }

  async updateProduct(id: string, input: Record<string, unknown>) {
    const existing = this.sqliteDb.prepare('SELECT id FROM products WHERE id = ?').get(id);
    const existingRow = existing as { id: string; name?: string; sku?: string };
    const resolvedSku = String(input.sku || existingRow.sku || `KN-${crypto.randomInt(10000, 99999)}`).trim();
    this.sqliteDb
      .prepare(`
        UPDATE products SET
          name = ?, sku = ?, short_description = ?, description = ?,
          retail_price_cad = ?, compare_at_price_cad = ?, stock_quantity = ?,
          is_published = ?, is_featured = ?, seo_title = ?, seo_description = ?,
          updated_at = datetime('now')
        WHERE id = ?
      `)
      .run(
        String(input.name || existingRow.name || '').trim(),
        resolvedSku,
        String(input.short_description || '').trim(),
        String(input.description || '').trim(),
        Number(input.retail_price_cad ?? 0),
        input.compare_at_price_cad !== null && input.compare_at_price_cad !== '' ? Number(input.compare_at_price_cad) : null,
        Math.max(0, Math.floor(Number(input.stock_quantity) || 0)),
        input.is_published ? 1 : 0,
        input.is_featured ? 1 : 0,
        String(input.seo_title || '').trim(),
        String(input.seo_description || '').trim(),
        id
      );
    if (input.image_url !== undefined) {
      this.sqliteDb.prepare('DELETE FROM product_images WHERE product_id = ?').run(id);
      if (String(input.image_url || '').trim()) {
        this.sqliteDb
          .prepare('INSERT INTO product_images (id, product_id, image_url, alt_text, display_order, is_primary) VALUES (?, ?, ?, ?, 0, 1)')
          .run(uid(), id, String(input.image_url).trim(), String(input.name || existingRow.name || '').trim());
      }
    }
    if (Array.isArray(input.category_ids)) {
      this.sqliteDb.prepare('DELETE FROM product_categories WHERE product_id = ?').run(id);
      for (const cid of input.category_ids as string[]) {
        this.sqliteDb.prepare('INSERT OR IGNORE INTO product_categories (product_id, category_id) VALUES (?, ?)').run(id, cid);
      }
    }
    if (Array.isArray(input.variants)) {
      this.sqliteDb.prepare('DELETE FROM product_variants WHERE product_id = ?').run(id);
      (input.variants as Array<Record<string, unknown>>).forEach((v, idx) => {
        if (String(v.name || '').trim()) {
          this.sqliteDb
            .prepare('INSERT INTO product_variants (id, product_id, name, sku, price_cad, stock_quantity, is_available, display_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
            .run(
              uid(),
              id,
              String(v.name).trim(),
              String(v.sku || `${input.sku}-V${idx + 1}`).trim(),
              Number(v.price_cad ?? input.retail_price_cad),
              Math.max(0, Math.floor(Number(v.stock_quantity ?? input.stock_quantity) || 0)),
              v.is_available === false ? 0 : 1,
              idx
            );
        }
      });
    }
    return true;
  }

  async deleteProduct(id: string) {
    this.sqliteDb.prepare('DELETE FROM products WHERE id = ?').run(id);
  }

  async isProductSlugTaken(slug: string): Promise<boolean> {
    return Boolean(this.sqliteDb.prepare('SELECT id FROM products WHERE slug = ?').get(slug));
  }

  async listSitemapSlugs(): Promise<{ products: string[]; categories: string[] }> {
    const prods = this.sqliteDb.prepare('SELECT slug FROM products WHERE is_published = 1').all() as Array<{ slug: string }>;
    const cats = this.sqliteDb.prepare('SELECT slug FROM categories WHERE is_visible = 1').all() as Array<{ slug: string }>;
    return {
      products: prods.map((p) => p.slug),
      categories: cats.map((c) => c.slug),
    };
  }

  async createRetailOrder(input: Parameters<DataStore['createRetailOrder']>[0]) {
    const existingCustomer = this.sqliteDb.prepare('SELECT id FROM customers WHERE email = ?').get(input.customer_email) as { id: string } | undefined;
    let customerId = existingCustomer?.id;
    if (!customerId) {
      customerId = uid();
      this.sqliteDb
        .prepare('INSERT INTO customers (id, email, full_name, phone, country, city, delivery_address) VALUES (?, ?, ?, ?, ?, ?, ?)')
        .run(customerId, input.customer_email, input.customer_name, input.customer_phone, input.country, input.city, input.delivery_address);
    } else {
      this.sqliteDb
        .prepare("UPDATE customers SET full_name = ?, phone = ?, country = ?, city = ?, delivery_address = ?, updated_at = datetime('now') WHERE id = ?")
        .run(input.customer_name, input.customer_phone, input.country, input.city, input.delivery_address, customerId);
    }

    this.sqliteDb
      .prepare(`
        INSERT INTO retail_orders (
          id, order_reference, customer_id, customer_name, customer_email, customer_phone,
          country, city, delivery_address, order_notes, subtotal_cad, total_cad, currency,
          order_status, payment_status, whatsapp_message_payload
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'CAD', 'Awaiting WhatsApp Confirmation', 'Unpaid', ?)
      `)
      .run(
        input.orderId,
        input.orderRef,
        customerId,
        input.customer_name,
        input.customer_email,
        input.customer_phone,
        input.country,
        input.city,
        input.delivery_address,
        input.order_notes,
        input.subtotalCad,
        input.totalCad,
        input.whatsappMessage
      );

    const insItem = this.sqliteDb.prepare(
      'INSERT INTO retail_order_items (id, order_id, product_id, variant_id, product_name, variant_name, unit_price_cad, quantity, line_total_cad) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    );
    for (const it of input.items) {
      insItem.run(uid(), input.orderId, it.product_id, it.variant_id, it.product_name, it.variant_name, it.unit_price_cad, it.quantity, it.line_total_cad);
    }
  }

  async listRetailOrders() {
    const orders = this.sqliteDb.prepare('SELECT * FROM retail_orders ORDER BY created_at DESC').all() as Array<Record<string, unknown>>;
    return orders.map((o) => ({
      ...o,
      subtotal_cad: Number(o.subtotal_cad),
      total_cad: Number(o.total_cad),
      items: this.sqliteDb.prepare('SELECT * FROM retail_order_items WHERE order_id = ?').all(String(o.id)),
    }));
  }

  async updateRetailOrder(id: string, patch: { order_status?: string; payment_status?: string; internal_notes?: string }) {
    const existing = this.sqliteDb.prepare('SELECT * FROM retail_orders WHERE id = ?').get(id) as Record<string, unknown> | undefined;
    if (!existing) return null;
    this.sqliteDb
      .prepare("UPDATE retail_orders SET order_status = ?, payment_status = ?, internal_notes = ?, updated_at = datetime('now') WHERE id = ?")
      .run(
        String(patch.order_status || existing.order_status),
        String(patch.payment_status || existing.payment_status),
        patch.internal_notes !== undefined ? String(patch.internal_notes) : String(existing.internal_notes || ''),
        id
      );
    return { order_reference: String(existing.order_reference) };
  }

  async listCustomers() {
    return this.sqliteDb
      .prepare(`
        SELECT c.*,
          (SELECT COUNT(*) FROM retail_orders o WHERE o.customer_id = c.id) as order_count,
          (SELECT COALESCE(SUM(o.total_cad), 0) FROM retail_orders o WHERE o.customer_id = c.id) as total_spent_cad
        FROM customers c ORDER BY c.created_at DESC
      `)
      .all() as Array<Record<string, unknown>>;
  }

  async getWholesaleApplicationByEmail(email: string) {
    return (this.sqliteDb.prepare('SELECT * FROM wholesale_applications WHERE business_email = ?').get(email) as Record<string, unknown>) || null;
  }

  async createWholesaleApplication(input: Record<string, unknown>) {
    this.sqliteDb
      .prepare(`
        INSERT INTO wholesale_applications (
          id, business_name, applicant_name, business_email, phone, country,
          business_address, business_type, website_or_social, additional_info, password_hash, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
      `)
      .run(
        String(input.id),
        String(input.business_name),
        String(input.applicant_name),
        String(input.business_email),
        String(input.phone),
        String(input.country),
        String(input.business_address),
        String(input.business_type),
        String(input.website_or_social || ''),
        String(input.additional_info || ''),
        String(input.password_hash)
      );
  }

  async getWholesaleProfileByUserId(userId: string) {
    return (this.sqliteDb.prepare('SELECT * FROM wholesale_profiles WHERE user_id = ?').get(userId) as Record<string, unknown>) || null;
  }

  async listWholesaleCatalogue() {
    const products = await this.getHydratedProducts({ publishedOnly: true, includeWholesaleTiers: true });
    return products
      .filter((p) => {
        const t = p.wholesale_tier as Record<string, unknown> | null;
        return t && Boolean(t.is_wholesale_available);
      })
      .map((p) => {
        const t = p.wholesale_tier as Record<string, unknown>;
        return {
          ...p,
          wholesale_tier: {
            ...t,
            moq: Number(t.moq),
            base_wholesale_price_cad: Number(t.base_wholesale_price_cad),
            tier_2_min_qty: t.tier_2_min_qty !== null ? Number(t.tier_2_min_qty) : null,
            tier_2_price_cad: t.tier_2_price_cad !== null ? Number(t.tier_2_price_cad) : null,
            tier_3_min_qty: t.tier_3_min_qty !== null ? Number(t.tier_3_min_qty) : null,
            tier_3_price_cad: t.tier_3_price_cad !== null ? Number(t.tier_3_price_cad) : null,
            is_wholesale_available: Boolean(t.is_wholesale_available),
          },
        };
      });
  }

  async listWholesaleInquiriesForProfile(profileId: string) {
    const inqs = this.sqliteDb
      .prepare('SELECT * FROM wholesale_inquiries WHERE wholesale_profile_id = ? ORDER BY created_at DESC')
      .all(profileId) as Array<Record<string, unknown>>;
    return inqs.map((inq) => ({
      ...inq,
      estimated_total_cad: Number(inq.estimated_total_cad),
      items: this.sqliteDb.prepare('SELECT * FROM wholesale_inquiry_items WHERE inquiry_id = ?').all(String(inq.id)),
      quotations: this.sqliteDb.prepare('SELECT * FROM wholesale_quotations WHERE inquiry_id = ? ORDER BY created_at DESC').all(String(inq.id)),
    }));
  }

  async createWholesaleInquiry(input: { profileId: string; notes: string; items: Array<{ productId: string; quantity: number }> }) {
    let estimatedTotal = 0;
    const resolvedItems: Array<{ product_id: string; product_name: string; quantity: number; quoted_unit_price_cad: number; line_total_cad: number }> = [];

    for (const item of input.items) {
      const qty = Math.floor(Number(item.quantity));
      const prod = this.sqliteDb.prepare('SELECT id, name, is_published FROM products WHERE id = ?').get(item.productId) as
        | { id: string; name: string; is_published: number }
        | undefined;
      const tier = this.sqliteDb
        .prepare('SELECT * FROM wholesale_price_tiers WHERE product_id = ? AND is_wholesale_available = 1')
        .get(item.productId) as
        | { moq: number; base_wholesale_price_cad: number; tier_2_min_qty: number | null; tier_2_price_cad: number | null; tier_3_min_qty: number | null; tier_3_price_cad: number | null }
        | undefined;

      if (!prod || !prod.is_published || !tier) return { error: 'One or more requested items are unavailable for wholesale.' };
      if (!Number.isFinite(qty) || qty < tier.moq) return { error: `Minimum order quantity for ${prod.name} is ${tier.moq} units.` };

      let unitPrice = Number(tier.base_wholesale_price_cad);
      if (tier.tier_3_min_qty && tier.tier_3_price_cad !== null && qty >= tier.tier_3_min_qty) {
        unitPrice = Number(tier.tier_3_price_cad);
      } else if (tier.tier_2_min_qty && tier.tier_2_price_cad !== null && qty >= tier.tier_2_min_qty) {
        unitPrice = Number(tier.tier_2_price_cad);
      }

      const lineTotal = Number((unitPrice * qty).toFixed(2));
      estimatedTotal += lineTotal;
      resolvedItems.push({ product_id: prod.id, product_name: prod.name, quantity: qty, quoted_unit_price_cad: unitPrice, line_total_cad: lineTotal });
    }

    const inquiryId = uid();
    const ref = `KN-WH-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${crypto.randomInt(1000, 9999)}`;
    this.sqliteDb
      .prepare('INSERT INTO wholesale_inquiries (id, inquiry_reference, wholesale_profile_id, notes, estimated_total_cad, status) VALUES (?, ?, ?, ?, ?, ?)')
      .run(inquiryId, ref, input.profileId, input.notes.trim(), Number(estimatedTotal.toFixed(2)), 'Submitted');

    const insItem = this.sqliteDb.prepare(
      'INSERT INTO wholesale_inquiry_items (id, inquiry_id, product_id, product_name, quantity, quoted_unit_price_cad, line_total_cad) VALUES (?, ?, ?, ?, ?, ?, ?)'
    );
    for (const it of resolvedItems) {
      insItem.run(uid(), inquiryId, it.product_id, it.product_name, it.quantity, it.quoted_unit_price_cad, it.line_total_cad);
    }
    return { inquiry_reference: ref, estimated_total_cad: Number(estimatedTotal.toFixed(2)), items: resolvedItems };
  }

  async listAdminWholesaleData() {
    const applications = this.sqliteDb
      .prepare('SELECT id, business_name, applicant_name, business_email, phone, country, business_address, business_type, website_or_social, additional_info, status, rejection_reason, reviewed_at, created_at FROM wholesale_applications ORDER BY created_at DESC')
      .all() as Array<Record<string, unknown>>;
    const profiles = this.sqliteDb.prepare('SELECT * FROM wholesale_profiles ORDER BY created_at DESC').all() as Array<Record<string, unknown>>;
    const inquiries = (
      this.sqliteDb
        .prepare(`
          SELECT wi.*, wp.business_name, wp.contact_name, wp.business_email
          FROM wholesale_inquiries wi
          JOIN wholesale_profiles wp ON wp.id = wi.wholesale_profile_id
          ORDER BY wi.created_at DESC
        `)
        .all() as Array<Record<string, unknown>>
    ).map((inq) => ({
      ...inq,
      estimated_total_cad: Number(inq.estimated_total_cad),
      items: this.sqliteDb.prepare('SELECT * FROM wholesale_inquiry_items WHERE inquiry_id = ?').all(String(inq.id)),
      quotations: this.sqliteDb.prepare('SELECT * FROM wholesale_quotations WHERE inquiry_id = ? ORDER BY created_at DESC').all(String(inq.id)),
    }));
    return { applications, profiles, inquiries };
  }

  async decideWholesaleApplication(id: string, status: 'approved' | 'rejected' | 'pending', rejectionReason: string) {
    const appRecord = this.sqliteDb.prepare('SELECT * FROM wholesale_applications WHERE id = ?').get(id) as Record<string, unknown> | undefined;
    if (!appRecord) return null;

    this.sqliteDb
      .prepare("UPDATE wholesale_applications SET status = ?, rejection_reason = ?, reviewed_at = datetime('now'), updated_at = datetime('now') WHERE id = ?")
      .run(status, rejectionReason, id);

    if (status === 'approved') {
      const existingUser = this.sqliteDb.prepare('SELECT id FROM users WHERE email = ?').get(String(appRecord.business_email)) as { id: string } | undefined;
      let userId = existingUser?.id;
      if (!userId) {
        userId = uid();
        this.sqliteDb
          .prepare('INSERT INTO users (id, email, full_name, password_hash, role, is_active) VALUES (?, ?, ?, ?, ?, 1)')
          .run(userId, String(appRecord.business_email), String(appRecord.applicant_name), String(appRecord.password_hash), 'wholesale_buyer');
      }
      const existingProf = this.sqliteDb.prepare('SELECT id FROM wholesale_profiles WHERE user_id = ?').get(userId);
      if (!existingProf) {
        this.sqliteDb
          .prepare(`
            INSERT INTO wholesale_profiles (id, user_id, application_id, business_name, contact_name, business_email, phone, country, business_address, business_type, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'approved')
          `)
          .run(
            uid(),
            userId,
            String(appRecord.id),
            String(appRecord.business_name),
            String(appRecord.applicant_name),
            String(appRecord.business_email),
            String(appRecord.phone),
            String(appRecord.country),
            String(appRecord.business_address),
            String(appRecord.business_type)
          );
      } else {
        this.sqliteDb.prepare("UPDATE wholesale_profiles SET status = 'approved', updated_at = datetime('now') WHERE user_id = ?").run(userId);
      }
    }
    return { business_name: String(appRecord.business_name) };
  }

  async updateWholesaleProfileStatus(id: string, status: 'approved' | 'suspended') {
    this.sqliteDb.prepare("UPDATE wholesale_profiles SET status = ?, updated_at = datetime('now') WHERE id = ?").run(status, id);
  }

  async upsertWholesaleTier(productId: string, input: Record<string, unknown>) {
    const existing = this.sqliteDb.prepare('SELECT id FROM wholesale_price_tiers WHERE product_id = ?').get(productId);
    if (existing) {
      this.sqliteDb
        .prepare(`
          UPDATE wholesale_price_tiers SET
            moq = ?, base_wholesale_price_cad = ?, tier_2_min_qty = ?, tier_2_price_cad = ?,
            tier_3_min_qty = ?, tier_3_price_cad = ?, is_wholesale_available = ?, updated_at = datetime('now')
          WHERE product_id = ?
        `)
        .run(
          Math.max(1, Math.floor(Number(input.moq || 10))),
          Number(input.base_wholesale_price_cad),
          input.tier_2_min_qty ? Number(input.tier_2_min_qty) : null,
          input.tier_2_price_cad !== null && input.tier_2_price_cad !== '' ? Number(input.tier_2_price_cad) : null,
          input.tier_3_min_qty ? Number(input.tier_3_min_qty) : null,
          input.tier_3_price_cad !== null && input.tier_3_price_cad !== '' ? Number(input.tier_3_price_cad) : null,
          input.is_wholesale_available ? 1 : 0,
          productId
        );
    } else {
      this.sqliteDb
        .prepare(`
          INSERT INTO wholesale_price_tiers (id, product_id, moq, base_wholesale_price_cad, tier_2_min_qty, tier_2_price_cad, tier_3_min_qty, tier_3_price_cad, is_wholesale_available)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `)
        .run(
          uid(),
          productId,
          Math.max(1, Math.floor(Number(input.moq || 10))),
          Number(input.base_wholesale_price_cad),
          input.tier_2_min_qty ? Number(input.tier_2_min_qty) : null,
          input.tier_2_price_cad !== null && input.tier_2_price_cad !== '' ? Number(input.tier_2_price_cad) : null,
          input.tier_3_min_qty ? Number(input.tier_3_min_qty) : null,
          input.tier_3_price_cad !== null && input.tier_3_price_cad !== '' ? Number(input.tier_3_price_cad) : null,
          input.is_wholesale_available ? 1 : 0
        );
    }
  }

  async updateWholesaleInquiryStatus(id: string, status: string) {
    this.sqliteDb.prepare("UPDATE wholesale_inquiries SET status = ?, updated_at = datetime('now') WHERE id = ?").run(status, id);
  }

  async createWholesaleQuotation(inquiryId: string, input: Record<string, unknown>) {
    const qid = uid();
    this.sqliteDb
      .prepare('INSERT INTO wholesale_quotations (id, inquiry_id, quoted_total_cad, shipping_estimate_cad, terms, valid_until) VALUES (?, ?, ?, ?, ?, ?)')
      .run(
        qid,
        inquiryId,
        Number(input.quoted_total_cad),
        Number(input.shipping_estimate_cad || 0),
        String(input.terms || '').trim(),
        input.valid_until ? String(input.valid_until) : null
      );
    this.sqliteDb.prepare("UPDATE wholesale_inquiries SET status = 'Quoted', updated_at = datetime('now') WHERE id = ?").run(inquiryId);
    return qid;
  }

  async listMedia() {
    return this.sqliteDb
      .prepare('SELECT id, file_name, bucket, file_url, mime_type, file_size_bytes, alt_text, created_at FROM media_library ORDER BY created_at DESC')
      .all() as Array<Record<string, unknown>>;
  }

  async createMedia(input: Record<string, unknown>) {
    this.sqliteDb
      .prepare('INSERT INTO media_library (id, file_name, bucket, file_url, mime_type, file_size_bytes, alt_text, file_data) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      .run(
        String(input.id),
        String(input.file_name),
        String(input.bucket || 'media-library'),
        String(input.file_url),
        String(input.mime_type),
        Number(input.file_size_bytes || 0),
        String(input.alt_text || ''),
        String(input.file_data || '')
      );
  }

  async getMediaById(id: string) {
    return (this.sqliteDb.prepare('SELECT id, file_url, file_name FROM media_library WHERE id = ?').get(id) as { id: string; file_url: string; file_name: string }) || null;
  }

  async getMediaContentById(id: string) {
    return (
      (this.sqliteDb
        .prepare('SELECT id, file_url, file_name, mime_type, file_data FROM media_library WHERE id = ?')
        .get(id) as { id: string; file_url: string; file_name: string; mime_type: string; file_data: string }) || null
    );
  }

  async deleteMedia(id: string) {
    this.sqliteDb.prepare('DELETE FROM media_library WHERE id = ?').run(id);
  }

  async subscribeNewsletter(email: string) {
    const exists = this.sqliteDb.prepare('SELECT id FROM newsletter_subscribers WHERE email = ?').get(email);
    if (!exists) this.sqliteDb.prepare('INSERT INTO newsletter_subscribers (id, email) VALUES (?, ?)').run(uid(), email);
  }

  async saveContactMessage(input: { name: string; email: string; phone: string; subject: string; message: string }) {
    this.sqliteDb
      .prepare('INSERT INTO contact_messages (id, name, email, phone, subject, message) VALUES (?, ?, ?, ?, ?, ?)')
      .run(uid(), input.name, input.email, input.phone, input.subject, input.message);
  }

  async listContactMessages() {
    return this.sqliteDb.prepare('SELECT * FROM contact_messages ORDER BY created_at DESC').all() as Array<Record<string, unknown>>;
  }

  async logActivity(actorEmail: string, action: string, entityType: string, entityId: string, details: Record<string, unknown>) {
    this.sqliteDb
      .prepare('INSERT INTO activity_logs (id, actor_email, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?, ?)')
      .run(uid(), actorEmail, action, entityType, entityId, JSON.stringify(details));
  }

  async listActivityLogs(limit = 100) {
    return (this.sqliteDb.prepare('SELECT * FROM activity_logs ORDER BY created_at DESC LIMIT ?').all(limit) as Array<Record<string, unknown>>).map((l) => ({
      ...l,
      details: JSON.parse(String(l.details || '{}')),
    }));
  }

  async getOverviewStats() {
    return {
      totalProducts: (this.sqliteDb.prepare('SELECT COUNT(*) as c FROM products').get() as { c: number }).c,
      totalOrders: (this.sqliteDb.prepare('SELECT COUNT(*) as c FROM retail_orders').get() as { c: number }).c,
      pendingOrders: (
        this.sqliteDb
          .prepare("SELECT COUNT(*) as c FROM retail_orders WHERE order_status IN ('Awaiting WhatsApp Confirmation', 'Pending Business Confirmation')")
          .get() as { c: number }
      ).c,
      totalCustomers: (this.sqliteDb.prepare('SELECT COUNT(*) as c FROM customers').get() as { c: number }).c,
      pendingWholesaleApps: (this.sqliteDb.prepare("SELECT COUNT(*) as c FROM wholesale_applications WHERE status = 'pending'").get() as { c: number }).c,
      totalWholesaleApps: (this.sqliteDb.prepare('SELECT COUNT(*) as c FROM wholesale_applications').get() as { c: number }).c,
      wholesaleInquiries: (this.sqliteDb.prepare('SELECT COUNT(*) as c FROM wholesale_inquiries').get() as { c: number }).c,
      newsletterCount: (this.sqliteDb.prepare('SELECT COUNT(*) as c FROM newsletter_subscribers').get() as { c: number }).c,
    };
  }
}

export { hashPassword };

let activeStore: DataStore | null = null;
export async function getStore(): Promise<DataStore> {
  if (!activeStore) {
    activeStore = isNeonConfigured() ? new NeonDrizzleStore() : new LocalSqliteStore();
  }
  await activeStore.ensureReady();
  return activeStore;
}
