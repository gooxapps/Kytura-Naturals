import express, { type Request, type Response, type NextFunction } from 'express';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import multer from 'multer';
import dotenv from 'dotenv';
import { getStore } from './dataAdapter.ts';
import { hashPassword, verifyPassword, uid } from './crypto.ts';
import {
  isValidImageUpload,
  MAX_IMAGE_UPLOAD_BYTES,
  storeMediaFile,
  removeMediaFile,
  UPLOADS_DIR,
} from './storage.ts';
import { isNeonConfigured } from './neonDb.ts';

dotenv.config();

export const app = express();
app.set('trust proxy', 1);
app.use(express.json({ limit: '2mb' }));

// Derive session signing key from env secret (never hardcoded)
function getTokenSecret(): string {
  const configured = process.env.SESSION_SECRET?.trim();
  if (configured) return configured;
  const dbConn =
    process.env.DATABASE_URL?.trim() ||
    process.env.POSTGRES_URL?.trim() ||
    process.env.POSTGRES_URL_NON_POOLING?.trim();
  if (dbConn) {
    return crypto.createHmac('sha256', dbConn).update('kytura-naturals-session-v1').digest('hex');
  }
  return ephemeralSecret;
}
const ephemeralSecret = crypto.randomBytes(32).toString('hex');

interface AuthTokenPayload {
  sub: string;
  email: string;
  role: string;
  name: string;
  exp: number;
}

interface AuthenticatedRequest extends Request {
  user?: AuthTokenPayload;
}

function asyncHandler(
  fn: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void> | void
) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch((err) => {
      console.error('[API Error]', err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'An internal server error occurred. Please try again.' });
      }
    });
  };
}

// ============================================================================
// IN-MEMORY SLIDING WINDOW RATE LIMITER
// ============================================================================
const rateBuckets = new Map<string, number[]>();

function createRateLimiter(bucketName: string, maxRequests: number, windowMs: number) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const clientIp = (req.ip || req.headers['x-forwarded-for'] || 'unknown').toString().split(',')[0].trim();
    const key = `${bucketName}:${clientIp}`;
    const now = Date.now();
    const cutoff = now - windowMs;
    const timestamps = (rateBuckets.get(key) || []).filter((ts) => ts > cutoff);
    if (timestamps.length >= maxRequests) {
      res.status(429).json({ error: 'Too many requests. Please wait a moment before trying again.' });
      return;
    }
    timestamps.push(now);
    rateBuckets.set(key, timestamps);
    if (rateBuckets.size > 5000) {
      for (const [k, list] of rateBuckets.entries()) {
        const fresh = list.filter((ts) => ts > cutoff);
        if (fresh.length === 0) rateBuckets.delete(k);
        else rateBuckets.set(k, fresh);
      }
    }
    next();
  };
}

const authLimiter = createRateLimiter('auth', 20, 15 * 60 * 1000);
const checkoutLimiter = createRateLimiter('checkout', 15, 10 * 60 * 1000);
const publicFormLimiter = createRateLimiter('public-form', 12, 15 * 60 * 1000);

function signToken(payload: Omit<AuthTokenPayload, 'exp'>, ttlSeconds = 60 * 60 * 12): string {
  const fullPayload: AuthTokenPayload = {
    ...payload,
    exp: Math.floor(Date.now() / 1000) + ttlSeconds,
  };
  const encoded = Buffer.from(JSON.stringify(fullPayload)).toString('base64url');
  const sig = crypto.createHmac('sha256', getTokenSecret()).update(encoded).digest('base64url');
  return `${encoded}.${sig}`;
}

function verifyToken(token: string): AuthTokenPayload | null {
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [encoded, sig] = parts;
  const expectedSig = crypto.createHmac('sha256', getTokenSecret()).update(encoded).digest('base64url');
  const sigBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
    return null;
  }
  try {
    const parsed = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as AuthTokenPayload;
    if (parsed.exp < Math.floor(Date.now() / 1000)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function extractBearer(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return null;
  return header.slice(7).trim();
}

const ADMIN_ROLES = new Set(['super_admin', 'store_manager', 'wholesale_manager', 'content_manager']);

function requireAuth(allowedRoles?: string[]) {
  return asyncHandler(async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    const token = extractBearer(req);
    if (!token) {
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }
    const payload = verifyToken(token);
    if (!payload) {
      res.status(401).json({ error: 'Invalid or expired session.' });
      return;
    }
    if (allowedRoles && !allowedRoles.includes(payload.role)) {
      res.status(403).json({ error: 'Insufficient permissions for this action.' });
      return;
    }
    if (payload.sub !== 'env-super-admin') {
      const store = await getStore();
      const user = await store.getUserById(payload.sub);
      if (!user || !user.is_active) {
        res.status(401).json({ error: 'Account is inactive or unavailable.' });
        return;
      }
      if (allowedRoles && !allowedRoles.includes(user.role)) {
        res.status(403).json({ error: 'Insufficient permissions for this action.' });
        return;
      }
    }
    req.user = payload;
    next();
  });
}

function requireAdmin(roles = ['super_admin', 'store_manager', 'wholesale_manager', 'content_manager']) {
  return requireAuth(roles);
}

function slugify(text: string): string {
  return (
    text
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || `item-${Date.now()}`
  );
}

function getParam(val: string | string[] | undefined): string {
  return Array.isArray(val) ? val[0] : val || '';
}

// Serve local uploaded images in non-Vercel-Blob local preview environments
if (fs.existsSync(UPLOADS_DIR)) {
  app.use('/uploads', express.static(UPLOADS_DIR));
}

// Serve database-backed uploaded media assets cleanly in all environments (preview, Neon, Vercel)
app.get(
  '/api/media/:id',
  asyncHandler(async (req, res) => {
    const id = getParam(req.params.id);
    const store = await getStore();
    const asset = await store.getMediaContentById(id);
    if (!asset) {
      res.status(404).send('Image not found');
      return;
    }

    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.setHeader('X-Content-Type-Options', 'nosniff');

    if (asset.file_data) {
      const buf = Buffer.from(asset.file_data, 'base64');
      const contentType = asset.mime_type || 'application/octet-stream';
      res.setHeader('Content-Type', contentType);
      if (contentType.includes('svg')) {
        res.setHeader('Content-Security-Policy', 'sandbox');
      }
      res.send(buf);
      return;
    }

    if (asset.file_url && asset.file_url.startsWith('/uploads/')) {
      const filePath = path.resolve(UPLOADS_DIR, path.basename(asset.file_url));
      if (filePath.startsWith(UPLOADS_DIR + path.sep) && fs.existsSync(filePath)) {
        res.sendFile(filePath);
        return;
      }
    }

    if (asset.file_url && /^https?:\/\//i.test(asset.file_url)) {
      res.redirect(asset.file_url);
      return;
    }

    res.status(404).send('Image content unavailable');
  })
);

// Configure Multer with memory storage (Database + Vercel Blob compatible, 15 MB limit)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_IMAGE_UPLOAD_BYTES },
  fileFilter: (_req, file, cb) => {
    const check = isValidImageUpload(file.mimetype, 1024, file.originalname);
    if (!check.ok) {
      cb(new Error(check.error || 'Unsupported file type.'));
      return;
    }
    cb(null, true);
  },
});

// ============================================================================
// HEALTH CHECK (NON-SENSITIVE DIAGNOSTICS)
// ============================================================================
app.get(
  '/api/health',
  asyncHandler(async (_req, res) => {
    const store = await getStore();
    res.json({
      status: 'ok',
      database: store.mode,
      neonConfigured: isNeonConfigured(),
      storage: process.env.BLOB_READ_WRITE_TOKEN ? 'vercel-blob' : 'local-uploads',
      timestamp: new Date().toISOString(),
    });
  })
);

// ============================================================================
// AUTHENTICATION ENDPOINTS
// ============================================================================
app.get(
  '/api/auth/admin/status',
  asyncHandler(async (_req, res) => {
    const store = await getStore();
    const adminCount = await store.countAdminUsers();
    const hasPasscodeEnv = Boolean(process.env.ADMIN_PASSCODE && process.env.ADMIN_PASSCODE.trim().length > 0);
    res.json({
      needsSetup: adminCount === 0 && !hasPasscodeEnv,
      hasPasscodeEnv,
    });
  })
);

app.post(
  '/api/auth/admin/setup',
  authLimiter,
  asyncHandler(async (req, res) => {
    const store = await getStore();
    const hasPasscodeEnv = Boolean(process.env.ADMIN_PASSCODE && process.env.ADMIN_PASSCODE.trim().length > 0);
    const adminCount = await store.countAdminUsers();

    if (adminCount > 0 || hasPasscodeEnv) {
      res.status(403).json({ error: 'Admin setup is already completed.' });
      return;
    }

    const { full_name, email, password } = req.body ?? {};
    if (!full_name || !email || !password || String(password).length < 8) {
      res.status(400).json({ error: 'Provide full name, valid email, and a password of at least 8 characters.' });
      return;
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const id = uid();
    const hash = hashPassword(String(password));

    await store.createUser({
      id,
      email: normalizedEmail,
      full_name: String(full_name).trim(),
      password_hash: hash,
      role: 'super_admin',
    });

    await store.logActivity(normalizedEmail, 'Super Admin account initialized', 'user', id, {});

    const token = signToken({ sub: id, email: normalizedEmail, role: 'super_admin', name: String(full_name).trim() });
    res.json({
      token,
      user: { id, email: normalizedEmail, full_name: String(full_name).trim(), role: 'super_admin' },
    });
  })
);

app.post(
  '/api/auth/admin/login',
  authLimiter,
  asyncHandler(async (req, res) => {
    const { email, password } = req.body ?? {};
    if (!password) {
      res.status(400).json({ error: 'Password is required.' });
      return;
    }

    const envPasscode = process.env.ADMIN_PASSCODE?.trim();
    if (envPasscode && String(password) === envPasscode) {
      const adminEmail = email ? String(email).trim().toLowerCase() : 'kyturanaturals@gmail.com';
      const token = signToken({ sub: 'env-super-admin', email: adminEmail, role: 'super_admin', name: 'Administrator' });
      res.json({
        token,
        user: { id: 'env-super-admin', email: adminEmail, full_name: 'Administrator', role: 'super_admin' },
      });
      return;
    }

    if (!email) {
      res.status(400).json({ error: 'Email and password are required.' });
      return;
    }

    const store = await getStore();
    const normalizedEmail = String(email).trim().toLowerCase();
    const user = await store.getUserByEmail(normalizedEmail);

    if (!user || !ADMIN_ROLES.has(user.role) || !user.is_active || !verifyPassword(String(password), user.password_hash)) {
      res.status(401).json({ error: 'Invalid admin credentials.' });
      return;
    }

    const token = signToken({ sub: user.id, email: user.email, role: user.role, name: user.full_name });
    res.json({
      token,
      user: { id: user.id, email: user.email, full_name: user.full_name, role: user.role },
    });
  })
);

app.post(
  '/api/auth/wholesale/login',
  authLimiter,
  asyncHandler(async (req, res) => {
    const { email, password } = req.body ?? {};
    if (!email || !password) {
      res.status(400).json({ error: 'Business email and password are required.' });
      return;
    }

    const store = await getStore();
    const normalizedEmail = String(email).trim().toLowerCase();
    const appRecord = await store.getWholesaleApplicationByEmail(normalizedEmail);

    if (appRecord) {
      if (!verifyPassword(String(password), String(appRecord.password_hash))) {
        res.status(401).json({ error: 'Invalid business email or password.' });
        return;
      }
      if (appRecord.status === 'pending') {
        res.status(403).json({
          status: 'pending',
          error: 'Your wholesale application is pending administrator approval. Wholesale pricing remains restricted until approved.',
        });
        return;
      }
      if (appRecord.status === 'rejected') {
        res.status(403).json({
          status: 'rejected',
          error: appRecord.rejection_reason
            ? `Your wholesale application was not approved: ${appRecord.rejection_reason}`
            : 'Your wholesale application was not approved.',
        });
        return;
      }
    }

    const user = await store.getUserByEmail(normalizedEmail);
    if (!user || user.role !== 'wholesale_buyer' || !user.is_active || !verifyPassword(String(password), user.password_hash)) {
      res.status(401).json({ error: 'Invalid wholesale account credentials.' });
      return;
    }

    const profile = await store.getWholesaleProfileByUserId(user.id);
    if (!profile || profile.status !== 'approved') {
      res.status(403).json({ status: 'suspended', error: 'Your wholesale account is currently suspended.' });
      return;
    }

    const token = signToken({
      sub: user.id,
      email: user.email,
      role: 'wholesale_buyer',
      name: String(profile.business_name),
    });
    res.json({
      token,
      user: { id: user.id, email: user.email, full_name: user.full_name, role: 'wholesale_buyer' },
      profile,
    });
  })
);

app.get('/api/auth/me', requireAuth(), (req: AuthenticatedRequest, res) => {
  res.json({ user: req.user });
});

// ============================================================================
// PUBLIC STOREFRONT ENDPOINTS (WHOLESALE PRICING NEVER EXPOSED)
// ============================================================================
app.get(
  '/api/public/bootstrap',
  asyncHandler(async (_req, res) => {
    const store = await getStore();
    const [settings, categories, sections, testimonials] = await Promise.all([
      store.getSettings(),
      store.listCategories(true),
      store.listHomepageSections(),
      store.listTestimonials(true),
    ]);
    res.json({ settings, categories, sections, testimonials });
  })
);

app.get(
  '/api/public/products',
  asyncHandler(async (req, res) => {
    const store = await getStore();
    const categorySlug = typeof req.query.category === 'string' ? req.query.category : undefined;
    const search = typeof req.query.q === 'string' ? req.query.q : undefined;
    const featuredOnly = req.query.featured === '1';
    const products = await store.getHydratedProducts({
      publishedOnly: true,
      categorySlug,
      search,
      featuredOnly,
      includeWholesaleTiers: false,
    });
    res.json({ products });
  })
);

app.get(
  '/api/public/products/:slug',
  asyncHandler(async (req, res) => {
    const store = await getStore();
    const product = await store.getProductBySlug(getParam(req.params.slug));
    if (!product) {
      res.status(404).json({ error: 'Product not found.' });
      return;
    }
    res.json({ product });
  })
);

app.get(
  '/api/public/pages/:slug',
  asyncHandler(async (req, res) => {
    const store = await getStore();
    const page = await store.getPageBySlug(getParam(req.params.slug));
    if (!page) {
      res.status(404).json({ error: 'Page not found.' });
      return;
    }
    res.json({ page });
  })
);

app.post(
  '/api/public/newsletter',
  publicFormLimiter,
  asyncHandler(async (req, res) => {
    const email = String(req.body?.email || '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      res.status(400).json({ error: 'Please enter a valid email address.' });
      return;
    }
    const store = await getStore();
    await store.subscribeNewsletter(email);
    res.json({ success: true, message: 'Thank you for subscribing to Kytura Naturals updates.' });
  })
);

app.post(
  '/api/public/contact',
  publicFormLimiter,
  asyncHandler(async (req, res) => {
    const { name, email, phone = '', subject = '', message } = req.body ?? {};
    if (!name || !email || !message || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim())) {
      res.status(400).json({ error: 'Please provide your name, a valid email address, and your message.' });
      return;
    }
    const store = await getStore();
    await store.saveContactMessage({
      name: String(name).trim(),
      email: String(email).trim().toLowerCase(),
      phone: String(phone).trim(),
      subject: String(subject).trim(),
      message: String(message).trim(),
    });
    res.json({ success: true, message: 'Your enquiry has been received. Our team will respond shortly.' });
  })
);

app.post(
  '/api/public/orders/retail',
  checkoutLimiter,
  asyncHandler(async (req, res) => {
    const {
      customer_name,
      customer_email,
      customer_phone,
      country,
      city,
      delivery_address,
      order_notes = '',
      items = [],
    } = req.body ?? {};

    if (
      !customer_name?.trim() ||
      !customer_email?.trim() ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(customer_email).trim()) ||
      !customer_phone?.trim() ||
      !country?.trim() ||
      !city?.trim() ||
      !delivery_address?.trim() ||
      !Array.isArray(items) ||
      items.length === 0
    ) {
      res.status(400).json({ error: 'Please complete all required checkout fields and include at least one item.' });
      return;
    }

    const store = await getStore();
    let subtotalCad = 0;
    const resolvedItems: Array<{
      product_id: string;
      variant_id: string | null;
      product_name: string;
      variant_name: string;
      unit_price_cad: number;
      quantity: number;
      line_total_cad: number;
    }> = [];

    for (const item of items) {
      const qty = Math.floor(Number(item.quantity));
      if (!item.productId || !Number.isFinite(qty) || qty < 1) {
        res.status(400).json({ error: 'Invalid cart item quantity.' });
        return;
      }

      const checkoutProduct = await store.getProductForCheckout(
        String(item.productId),
        item.variantId ? String(item.variantId) : undefined
      );
      if (!checkoutProduct) {
        res.status(400).json({ error: 'One or more products or options in your cart are unavailable.' });
        return;
      }

      const lineTotal = Number((checkoutProduct.unitPriceCad * qty).toFixed(2));
      subtotalCad += lineTotal;
      resolvedItems.push({
        product_id: checkoutProduct.id,
        variant_id: checkoutProduct.variantId,
        product_name: checkoutProduct.name,
        variant_name: checkoutProduct.variantName,
        unit_price_cad: checkoutProduct.unitPriceCad,
        quantity: qty,
        line_total_cad: lineTotal,
      });
    }

    const totalCad = Number(subtotalCad.toFixed(2));
    const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const orderRef = `KN-${datePart}-${crypto.randomInt(1000, 9999)}`;

    const settings = await store.getSettings();
    const waDigits = String(settings?.whatsapp_number || '+14033719687').replace(/[^\d]/g, '');

    const itemsText = resolvedItems
      .map((it) => `- ${it.product_name}${it.variant_name ? ` (${it.variant_name})` : ''} x${it.quantity}: $${it.line_total_cad.toFixed(2)} CAD`)
      .join('\n');

    const whatsappMessage = [
      `Hello Kytura Naturals, I would like to confirm my retail order.`,
      ``,
      `Order Reference: ${orderRef}`,
      ``,
      `Ordered Items:`,
      itemsText,
      ``,
      `Order Total: $${totalCad.toFixed(2)} CAD`,
      ``,
      `Customer & Delivery Details:`,
      `Name: ${String(customer_name).trim()}`,
      `Email: ${String(customer_email).trim()}`,
      `WhatsApp/Phone: ${String(customer_phone).trim()}`,
      `Address: ${String(delivery_address).trim()}, ${String(city).trim()}, ${String(country).trim()}`,
      order_notes?.trim() ? `Notes: ${String(order_notes).trim()}` : '',
    ]
      .filter(Boolean)
      .join('\n');

    const orderId = uid();
    await store.createRetailOrder({
      orderId,
      orderRef,
      customer_name: String(customer_name).trim(),
      customer_email: String(customer_email).trim().toLowerCase(),
      customer_phone: String(customer_phone).trim(),
      country: String(country).trim(),
      city: String(city).trim(),
      delivery_address: String(delivery_address).trim(),
      order_notes: String(order_notes).trim(),
      subtotalCad: totalCad,
      totalCad,
      whatsappMessage,
      items: resolvedItems,
    });

    const whatsappUrl = `https://wa.me/${waDigits}?text=${encodeURIComponent(whatsappMessage)}`;

    res.status(201).json({
      order: {
        id: orderId,
        order_reference: orderRef,
        total_cad: totalCad,
        currency: 'CAD',
        order_status: 'Awaiting WhatsApp Confirmation',
        payment_status: 'Unpaid',
        whatsapp_url: whatsappUrl,
        whatsapp_message: whatsappMessage,
        items: resolvedItems,
      },
    });
  })
);

app.post(
  '/api/public/wholesale/apply',
  publicFormLimiter,
  asyncHandler(async (req, res) => {
    const {
      business_name,
      applicant_name,
      business_email,
      phone,
      country,
      business_address,
      business_type,
      website_or_social = '',
      additional_info = '',
      password,
    } = req.body ?? {};

    if (
      !business_name?.trim() ||
      !applicant_name?.trim() ||
      !business_email?.trim() ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(business_email).trim()) ||
      !phone?.trim() ||
      !country?.trim() ||
      !business_address?.trim() ||
      !business_type?.trim() ||
      !password ||
      String(password).length < 8
    ) {
      res.status(400).json({ error: 'All required wholesale application fields and a portal password (min 8 chars) must be provided.' });
      return;
    }

    const store = await getStore();
    const normEmail = String(business_email).trim().toLowerCase();
    const exists = await store.getWholesaleApplicationByEmail(normEmail);

    if (exists) {
      res.status(409).json({ error: `A wholesale application for ${normEmail} already exists (Status: ${exists.status}).` });
      return;
    }

    const appId = uid();
    await store.createWholesaleApplication({
      id: appId,
      business_name: String(business_name).trim(),
      applicant_name: String(applicant_name).trim(),
      business_email: normEmail,
      phone: String(phone).trim(),
      country: String(country).trim(),
      business_address: String(business_address).trim(),
      business_type: String(business_type).trim(),
      website_or_social: String(website_or_social).trim(),
      additional_info: String(additional_info).trim(),
      password_hash: hashPassword(String(password)),
    });

    await store.logActivity(normEmail, 'Submitted wholesale application', 'wholesale_application', appId, {
      business_name: String(business_name).trim(),
    });

    res.status(201).json({
      success: true,
      application: { id: appId, status: 'pending', business_email: normEmail },
      message: 'Your wholesale application has been submitted and is pending administrator review.',
    });
  })
);

// ============================================================================
// RESTRICTED WHOLESALE PORTAL APIs (APPROVED BUYERS ONLY)
// ============================================================================
function requireApprovedWholesale(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  requireAuth(['wholesale_buyer'])(req, res, async () => {
    try {
      const store = await getStore();
      const profile = await store.getWholesaleProfileByUserId(req.user!.sub);
      if (!profile || profile.status !== 'approved') {
        res.status(403).json({ error: 'Wholesale portal access is restricted to approved wholesale accounts.' });
        return;
      }
      next();
    } catch (err) {
      next(err);
    }
  });
}

app.get(
  '/api/wholesale/products',
  requireApprovedWholesale,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const store = await getStore();
    const [profile, catalogue] = await Promise.all([
      store.getWholesaleProfileByUserId(req.user!.sub),
      store.listWholesaleCatalogue(),
    ]);
    res.json({ profile, catalogue });
  })
);

app.get(
  '/api/wholesale/inquiries',
  requireApprovedWholesale,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const store = await getStore();
    const profile = await store.getWholesaleProfileByUserId(req.user!.sub);
    if (!profile) {
      res.status(403).json({ error: 'Wholesale profile unavailable.' });
      return;
    }
    const inquiries = await store.listWholesaleInquiriesForProfile(String(profile.id));
    res.json({ inquiries });
  })
);

app.post(
  '/api/wholesale/inquiries',
  requireApprovedWholesale,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const store = await getStore();
    const profile = await store.getWholesaleProfileByUserId(req.user!.sub);
    if (!profile) {
      res.status(403).json({ error: 'Wholesale profile unavailable.' });
      return;
    }

    const { items = [], notes = '' } = req.body ?? {};
    if (!Array.isArray(items) || items.length === 0) {
      res.status(400).json({ error: 'Please add at least one wholesale product to your enquiry.' });
      return;
    }

    const result = await store.createWholesaleInquiry({
      profileId: String(profile.id),
      notes: String(notes),
      items: items.map((it: { productId: string; quantity: number }) => ({
        productId: String(it.productId),
        quantity: Number(it.quantity),
      })),
    });

    if ('error' in result) {
      res.status(400).json({ error: result.error });
      return;
    }

    await store.logActivity(String(profile.business_email), 'Submitted wholesale inquiry', 'wholesale_inquiry', result.inquiry_reference, {
      ref: result.inquiry_reference,
      estimatedTotal: result.estimated_total_cad,
    });

    res.status(201).json({
      inquiry: {
        inquiry_reference: result.inquiry_reference,
        estimated_total_cad: result.estimated_total_cad,
        status: 'Submitted',
        items: result.items,
      },
    });
  })
);

// ============================================================================
// ADMIN DASHBOARD APIs
// ============================================================================
app.get(
  '/api/admin/overview',
  requireAdmin(),
  asyncHandler(async (_req, res) => {
    const store = await getStore();
    const [stats, recentLogs] = await Promise.all([store.getOverviewStats(), store.listActivityLogs(12)]);
    res.json({ stats, recentLogs });
  })
);

// Admin Products
app.get(
  '/api/admin/products',
  requireAdmin(['super_admin', 'store_manager', 'wholesale_manager']),
  asyncHandler(async (_req, res) => {
    const store = await getStore();
    const products = await store.getHydratedProducts({ publishedOnly: false, includeWholesaleTiers: true });
    res.json({ products });
  })
);

app.post(
  '/api/admin/products',
  requireAdmin(['super_admin', 'store_manager']),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const {
      name,
      sku,
      short_description = '',
      description = '',
      retail_price_cad,
      compare_at_price_cad = null,
      stock_quantity = 0,
      is_published = true,
      is_featured = false,
      seo_title = '',
      seo_description = '',
      category_ids = [],
      image_url = '',
      variants = [],
    } = req.body ?? {};

    if (!name?.trim() || retail_price_cad === undefined) {
      res.status(400).json({ error: 'Product name and retail price (CAD) are required.' });
      return;
    }

    const store = await getStore();
    const id = uid();
    const baseSlug = slugify(String(name));
    const slugTaken = await store.isProductSlugTaken(baseSlug);
    const slug = slugTaken ? `${baseSlug}-${crypto.randomInt(100, 999)}` : baseSlug;
    const finalSku = String(sku || `KN-${crypto.randomInt(10000, 99999)}`).trim();

    try {
      await store.createProduct({
        id,
        slug,
        name: String(name).trim(),
        sku: finalSku,
        short_description: String(short_description).trim(),
        description: String(description).trim(),
        retail_price_cad: Number(retail_price_cad),
        compare_at_price_cad,
        stock_quantity,
        is_published,
        is_featured,
        seo_title: String(seo_title || `${name} | Kytura Naturals`).trim(),
        seo_description: String(seo_description || short_description).trim(),
        category_ids,
        image_url,
        variants,
      });
    } catch (prodErr: unknown) {
      const msg = prodErr instanceof Error ? prodErr.message : '';
      if (/unique|duplicate/i.test(msg)) {
        res.status(400).json({ error: 'A product with that SKU or slug already exists. Please use a unique SKU.' });
        return;
      }
      throw prodErr;
    }

    await store.logActivity(req.user!.email, 'Created product', 'product', id, { name, retail_price_cad });
    res.status(201).json({ id, slug });
  })
);

app.put(
  '/api/admin/products/:id',
  requireAdmin(['super_admin', 'store_manager']),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const id = getParam(req.params.id);
    const {
      name,
      sku,
      short_description = '',
      description = '',
      retail_price_cad,
      compare_at_price_cad = null,
      stock_quantity = 0,
      is_published = true,
      is_featured = false,
      seo_title = '',
      seo_description = '',
      category_ids = [],
      image_url,
      variants = [],
    } = req.body ?? {};

    const store = await getStore();
    let updated = false;
    try {
      updated = await store.updateProduct(id, {
        name,
        sku,
        short_description,
        description,
        retail_price_cad,
        compare_at_price_cad,
        stock_quantity,
        is_published,
        is_featured,
        seo_title,
        seo_description,
        category_ids,
        image_url,
        variants,
      });
    } catch (prodErr: unknown) {
      const msg = prodErr instanceof Error ? prodErr.message : '';
      if (/unique|duplicate/i.test(msg)) {
        res.status(400).json({ error: 'Another product already uses that SKU. Please enter a unique SKU.' });
        return;
      }
      throw prodErr;
    }

    if (!updated) {
      res.status(404).json({ error: 'Product not found.' });
      return;
    }

    await store.logActivity(req.user!.email, 'Updated product', 'product', id, { name, retail_price_cad });
    res.json({ success: true });
  })
);

app.delete(
  '/api/admin/products/:id',
  requireAdmin(['super_admin', 'store_manager']),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const id = getParam(req.params.id);
    const store = await getStore();
    await store.deleteProduct(id);
    await store.logActivity(req.user!.email, 'Deleted product', 'product', id, {});
    res.json({ success: true });
  })
);

// Admin Categories
app.get(
  '/api/admin/categories',
  requireAdmin(),
  asyncHandler(async (_req, res) => {
    const store = await getStore();
    const categories = await store.listCategories(false);
    res.json({ categories });
  })
);

app.post(
  '/api/admin/categories',
  requireAdmin(['super_admin', 'store_manager', 'content_manager']),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { name, description = '', image_url = '', display_order = 0, is_visible = true } = req.body ?? {};
    if (!name?.trim()) {
      res.status(400).json({ error: 'Category name is required.' });
      return;
    }
    const store = await getStore();
    const id = uid();
    const slug = slugify(String(name));
    await store.createCategory({
      id,
      slug,
      name: String(name).trim(),
      description: String(description).trim(),
      image_url: String(image_url).trim(),
      display_order: Number(display_order) || 0,
      is_visible: Boolean(is_visible),
    });

    await store.logActivity(req.user!.email, 'Created category', 'category', id, { name });
    res.status(201).json({ id, slug });
  })
);

app.put(
  '/api/admin/categories/:id',
  requireAdmin(['super_admin', 'store_manager', 'content_manager']),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const id = getParam(req.params.id);
    const { name, description = '', image_url = '', display_order = 0, is_visible = true } = req.body ?? {};
    const store = await getStore();
    await store.updateCategory(id, { name, description, image_url, display_order, is_visible });
    await store.logActivity(req.user!.email, 'Updated category', 'category', id, { name });
    res.json({ success: true });
  })
);

app.delete(
  '/api/admin/categories/:id',
  requireAdmin(['super_admin', 'store_manager']),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const id = getParam(req.params.id);
    const store = await getStore();
    await store.deleteCategory(id);
    await store.logActivity(req.user!.email, 'Deleted category', 'category', id, {});
    res.json({ success: true });
  })
);

// Admin Retail Orders & Customers
app.get(
  '/api/admin/orders',
  requireAdmin(['super_admin', 'store_manager']),
  asyncHandler(async (_req, res) => {
    const store = await getStore();
    const orders = await store.listRetailOrders();
    res.json({ orders });
  })
);

app.patch(
  '/api/admin/orders/:id',
  requireAdmin(['super_admin', 'store_manager']),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const id = getParam(req.params.id);
    const { order_status, payment_status, internal_notes } = req.body ?? {};
    const store = await getStore();
    const updated = await store.updateRetailOrder(id, { order_status, payment_status, internal_notes });
    if (!updated) {
      res.status(404).json({ error: 'Order not found.' });
      return;
    }
    await store.logActivity(req.user!.email, 'Updated retail order', 'retail_order', id, {
      order_reference: updated.order_reference,
      order_status,
      payment_status,
    });
    res.json({ success: true });
  })
);

app.get(
  '/api/admin/customers',
  requireAdmin(['super_admin', 'store_manager']),
  asyncHandler(async (_req, res) => {
    const store = await getStore();
    const customers = await store.listCustomers();
    res.json({ customers });
  })
);

// Admin Wholesale Management
app.get(
  '/api/admin/wholesale',
  requireAdmin(['super_admin', 'wholesale_manager']),
  asyncHandler(async (_req, res) => {
    const store = await getStore();
    const data = await store.listAdminWholesaleData();
    res.json(data);
  })
);

app.patch(
  '/api/admin/wholesale/applications/:id',
  requireAdmin(['super_admin', 'wholesale_manager']),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const id = getParam(req.params.id);
    const { status, rejection_reason = '' } = req.body ?? {};
    if (!['approved', 'rejected', 'pending'].includes(status)) {
      res.status(400).json({ error: 'Invalid status.' });
      return;
    }
    const store = await getStore();
    const result = await store.decideWholesaleApplication(id, status, String(rejection_reason).trim());
    if (!result) {
      res.status(404).json({ error: 'Wholesale application not found.' });
      return;
    }
    await store.logActivity(req.user!.email, `Marked wholesale application as ${status}`, 'wholesale_application', id, {
      business_name: result.business_name,
    });
    res.json({ success: true });
  })
);

app.patch(
  '/api/admin/wholesale/profiles/:id',
  requireAdmin(['super_admin', 'wholesale_manager']),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const id = getParam(req.params.id);
    const { status } = req.body ?? {};
    if (!['approved', 'suspended'].includes(status)) {
      res.status(400).json({ error: 'Invalid profile status.' });
      return;
    }
    const store = await getStore();
    await store.updateWholesaleProfileStatus(id, status);
    await store.logActivity(req.user!.email, `Updated wholesale profile status to ${status}`, 'wholesale_profile', id, {});
    res.json({ success: true });
  })
);

app.put(
  '/api/admin/wholesale/tiers/:productId',
  requireAdmin(['super_admin', 'wholesale_manager']),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const productId = getParam(req.params.productId);
    const {
      moq = 10,
      base_wholesale_price_cad,
      tier_2_min_qty = null,
      tier_2_price_cad = null,
      tier_3_min_qty = null,
      tier_3_price_cad = null,
      is_wholesale_available = true,
    } = req.body ?? {};

    if (base_wholesale_price_cad === undefined || Number(base_wholesale_price_cad) < 0) {
      res.status(400).json({ error: 'Valid base wholesale price (CAD) is required.' });
      return;
    }

    const store = await getStore();
    await store.upsertWholesaleTier(productId, {
      moq,
      base_wholesale_price_cad,
      tier_2_min_qty,
      tier_2_price_cad,
      tier_3_min_qty,
      tier_3_price_cad,
      is_wholesale_available,
    });

    await store.logActivity(req.user!.email, 'Updated wholesale price tier', 'wholesale_price_tier', productId, {
      base_wholesale_price_cad,
      moq,
    });
    res.json({ success: true });
  })
);

app.patch(
  '/api/admin/wholesale/inquiries/:id',
  requireAdmin(['super_admin', 'wholesale_manager']),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const id = getParam(req.params.id);
    const { status } = req.body ?? {};
    const store = await getStore();
    await store.updateWholesaleInquiryStatus(id, String(status));
    await store.logActivity(req.user!.email, `Updated wholesale inquiry status to ${status}`, 'wholesale_inquiry', id, {});
    res.json({ success: true });
  })
);

app.post(
  '/api/admin/wholesale/inquiries/:id/quotation',
  requireAdmin(['super_admin', 'wholesale_manager']),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const id = getParam(req.params.id);
    const { quoted_total_cad, shipping_estimate_cad = 0, terms = '', valid_until = null } = req.body ?? {};
    if (quoted_total_cad === undefined) {
      res.status(400).json({ error: 'Quoted total (CAD) is required.' });
      return;
    }
    const store = await getStore();
    const qid = await store.createWholesaleQuotation(id, {
      quoted_total_cad,
      shipping_estimate_cad,
      terms,
      valid_until,
    });
    await store.logActivity(req.user!.email, 'Sent wholesale quotation', 'wholesale_quotation', qid, {
      inquiry_id: id,
      quoted_total_cad,
    });
    res.status(201).json({ id: qid });
  })
);

// Admin Homepage Editor
app.get(
  '/api/admin/homepage',
  requireAdmin(['super_admin', 'content_manager', 'store_manager']),
  asyncHandler(async (_req, res) => {
    const store = await getStore();
    const sections = await store.listHomepageSections();
    res.json({ sections });
  })
);

app.put(
  '/api/admin/homepage/:sectionKey',
  requireAdmin(['super_admin', 'content_manager', 'store_manager']),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const sectionKey = getParam(req.params.sectionKey);
    const store = await getStore();
    await store.updateHomepageSection(sectionKey, req.body ?? {});
    await store.logActivity(req.user!.email, 'Updated homepage section', 'homepage_section', sectionKey, {});
    res.json({ success: true });
  })
);

// Admin Media Library (Vercel Blob or local fallback)
app.get(
  '/api/admin/media',
  requireAdmin(),
  asyncHandler(async (_req, res) => {
    const store = await getStore();
    const media = await store.listMedia();
    res.json({ media });
  })
);

app.post('/api/admin/media', requireAdmin(), (req: AuthenticatedRequest, res) => {
  upload.single('file')(req, res, async (err) => {
    try {
      if (err) {
        const msg =
          err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE'
            ? 'Image file exceeds the 15 MB limit. Please try a smaller image.'
            : err.message || 'Upload failed.';
        res.status(400).json({ error: msg });
        return;
      }
      if (!req.file) {
        res.status(400).json({ error: 'No image file provided.' });
        return;
      }
      const validation = isValidImageUpload(req.file.mimetype, req.file.size, req.file.originalname);
      if (!validation.ok) {
        res.status(400).json({ error: validation.error });
        return;
      }

      const id = uid();
      const resolvedMime = validation.resolvedMime || req.file.mimetype || 'image/jpeg';
      const bucket = String(req.body?.bucket || 'media-library');
      const altText = String(req.body?.alt_text || req.file.originalname);
      const uploaded = await storeMediaFile({
        id,
        buffer: req.file.buffer,
        originalName: req.file.originalname,
        mimeType: resolvedMime,
        bucket,
      });

      const store = await getStore();
      await store.createMedia({
        id,
        file_name: req.file.originalname,
        bucket,
        file_url: uploaded.fileUrl,
        mime_type: resolvedMime,
        file_size_bytes: req.file.size,
        alt_text: altText,
        file_data: uploaded.fileData,
      });

      await store.logActivity(req.user!.email, 'Uploaded media asset', 'media', id, {
        file_name: req.file.originalname,
        bucket,
        provider: uploaded.provider,
      });

      res.status(201).json({
        asset: {
          id,
          file_name: req.file.originalname,
          bucket,
          file_url: uploaded.fileUrl,
          mime_type: resolvedMime,
          file_size_bytes: req.file.size,
          alt_text: altText,
          created_at: new Date().toISOString(),
        },
      });
    } catch (uploadErr) {
      console.error('[Media Upload Error]', uploadErr);
      res.status(500).json({ error: 'Failed to store uploaded media asset.' });
    }
  });
});

app.delete(
  '/api/admin/media/:id',
  requireAdmin(),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const id = getParam(req.params.id);
    const store = await getStore();
    const asset = await store.getMediaById(id);
    if (!asset) {
      res.status(404).json({ error: 'Media item not found.' });
      return;
    }

    await removeMediaFile(asset.file_url);
    await store.deleteMedia(asset.id);
    await store.logActivity(req.user!.email, 'Deleted media asset', 'media', asset.id, { file_name: asset.file_name });
    res.json({ success: true });
  })
);

// Admin Pages & Content
app.get(
  '/api/admin/pages',
  requireAdmin(['super_admin', 'content_manager']),
  asyncHandler(async (_req, res) => {
    const store = await getStore();
    const pages = await store.listPages();
    res.json({ pages });
  })
);

app.put(
  '/api/admin/pages/:slug',
  requireAdmin(['super_admin', 'content_manager']),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const slug = getParam(req.params.slug);
    const store = await getStore();
    await store.updatePage(slug, req.body ?? {});
    await store.logActivity(req.user!.email, 'Updated CMS page', 'page', slug, {});
    res.json({ success: true });
  })
);

// Admin Testimonials
app.get(
  '/api/admin/testimonials',
  requireAdmin(['super_admin', 'content_manager']),
  asyncHandler(async (_req, res) => {
    const store = await getStore();
    const testimonials = await store.listTestimonials(false);
    res.json({ testimonials });
  })
);

app.post(
  '/api/admin/testimonials',
  requireAdmin(['super_admin', 'content_manager']),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { customer_name, location = '', quote, rating = 5, avatar_url = '', is_approved = true, is_published = true } = req.body ?? {};
    if (!customer_name?.trim() || !quote?.trim()) {
      res.status(400).json({ error: 'Customer name and quote are required.' });
      return;
    }
    const store = await getStore();
    const id = uid();
    await store.createTestimonial({
      id,
      customer_name: String(customer_name).trim(),
      location: String(location).trim(),
      quote: String(quote).trim(),
      rating: Math.min(5, Math.max(1, Number(rating) || 5)),
      avatar_url: String(avatar_url).trim(),
      is_approved: Boolean(is_approved),
      is_published: Boolean(is_published),
    });
    await store.logActivity(req.user!.email, 'Added genuine testimonial', 'testimonial', id, { customer_name });
    res.status(201).json({ id });
  })
);

app.patch(
  '/api/admin/testimonials/:id',
  requireAdmin(['super_admin', 'content_manager']),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const id = getParam(req.params.id);
    const { is_approved, is_published } = req.body ?? {};
    const store = await getStore();
    const ok = await store.updateTestimonial(id, { is_approved, is_published });
    if (!ok) {
      res.status(404).json({ error: 'Testimonial not found.' });
      return;
    }
    await store.logActivity(req.user!.email, 'Updated testimonial status', 'testimonial', id, {});
    res.json({ success: true });
  })
);

app.delete(
  '/api/admin/testimonials/:id',
  requireAdmin(['super_admin', 'content_manager']),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const id = getParam(req.params.id);
    const store = await getStore();
    await store.deleteTestimonial(id);
    await store.logActivity(req.user!.email, 'Deleted testimonial', 'testimonial', id, {});
    res.json({ success: true });
  })
);

// Admin Store Settings
app.get(
  '/api/admin/settings',
  requireAdmin(),
  asyncHandler(async (_req, res) => {
    const store = await getStore();
    const settings = await store.getSettings();
    res.json({ settings });
  })
);

app.put(
  '/api/admin/settings',
  requireAdmin(['super_admin', 'store_manager', 'content_manager']),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const s = req.body ?? {};
    const store = await getStore();
    await store.updateSettings(s);
    await store.logActivity(req.user!.email, 'Updated store settings', 'site_settings', '1', {
      whatsapp_number: s.whatsapp_number,
    });
    res.json({ success: true });
  })
);

// Admin Users & Permissions (Super Admin only)
app.get(
  '/api/admin/users',
  requireAdmin(['super_admin']),
  asyncHandler(async (_req, res) => {
    const store = await getStore();
    const users = await store.listAdminUsers();
    res.json({ users });
  })
);

app.post(
  '/api/admin/users',
  requireAdmin(['super_admin']),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { email, full_name, password, role } = req.body ?? {};
    if (!email || !full_name || !password || String(password).length < 8 || !ADMIN_ROLES.has(role)) {
      res.status(400).json({ error: 'Valid name, email, role, and password (min 8 chars) are required.' });
      return;
    }
    const store = await getStore();
    const normEmail = String(email).trim().toLowerCase();
    const exists = await store.getUserByEmail(normEmail);
    if (exists) {
      res.status(409).json({ error: 'A user with this email already exists.' });
      return;
    }
    const id = uid();
    await store.createUser({
      id,
      email: normEmail,
      full_name: String(full_name).trim(),
      password_hash: hashPassword(String(password)),
      role,
    });
    await store.logActivity(req.user!.email, 'Created admin user', 'user', id, { email: normEmail, role });
    res.status(201).json({ id });
  })
);

app.patch(
  '/api/admin/users/:id',
  requireAdmin(['super_admin']),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const id = getParam(req.params.id);
    const { role, is_active } = req.body ?? {};
    if (role !== undefined && !ADMIN_ROLES.has(role)) {
      res.status(400).json({ error: 'Invalid admin role.' });
      return;
    }
    const store = await getStore();
    const ok = await store.updateAdminUser(id, {
      role,
      is_active: is_active !== undefined ? Boolean(is_active) : undefined,
    });
    if (!ok) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }
    await store.logActivity(req.user!.email, 'Updated admin user permissions', 'user', id, { role, is_active });
    res.json({ success: true });
  })
);

// Admin Activity Logs & Contact Messages
app.get(
  '/api/admin/activity-logs',
  requireAdmin(),
  asyncHandler(async (_req, res) => {
    const store = await getStore();
    const logs = await store.listActivityLogs(100);
    res.json({ logs });
  })
);

app.get(
  '/api/admin/contact-messages',
  requireAdmin(),
  asyncHandler(async (_req, res) => {
    const store = await getStore();
    const messages = await store.listContactMessages();
    res.json({ messages });
  })
);

// Dynamic Sitemap
app.get(
  '/sitemap.xml',
  asyncHandler(async (req, res) => {
    const store = await getStore();
    const { products, categories } = await store.listSitemapSlugs();
    const baseUrl =
      process.env.APP_URL && process.env.APP_URL !== 'MY_APP_URL'
        ? process.env.APP_URL
        : `${req.protocol}://${req.get('host')}`;
    const staticPaths = ['/', '/shop', '/about', '/wholesale', '/contact', '/faq', '/privacy-policy', '/terms-and-conditions', '/shipping-returns'];

    const urls = [
      ...staticPaths.map((p) => `${baseUrl}${p}`),
      ...categories.map((slug) => `${baseUrl}/collections/${slug}`),
      ...products.map((slug) => `${baseUrl}/product/${slug}`),
    ];

    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
      .map((u) => `  <url><loc>${u}</loc></url>`)
      .join('\n')}\n</urlset>`;

    res.header('Content-Type', 'application/xml').send(xml);
  })
);
