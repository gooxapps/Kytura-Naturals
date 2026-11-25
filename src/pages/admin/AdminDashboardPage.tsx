import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  Building2,
  FileText,
  FolderTree,
  Image as ImageIcon,
  LayoutDashboard,
  LayoutTemplate,
  Lock,
  LogOut,
  MessageSquareQuote,
  Package,
  PanelBottom,
  Settings,
  Shield,
  ShoppingBag,
  Users,
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { BrandLogo } from '../../components/BrandLogo';
import { SEOHead } from '../../components/SEOHead';
import { AdminCatalogSection } from './AdminCatalogSection';
import { AdminOrdersCustomersSection } from './AdminOrdersCustomersSection';
import { AdminWholesaleSection } from './AdminWholesaleSection';
import { AdminContentSettingsSection } from './AdminContentSettingsSection';
import { AdminFooterBrandingSection } from './AdminFooterBrandingSection';
import type {
  ActivityLog,
  AdminUser,
  Category,
  HomepageSection,
  MediaAsset,
  PageContent,
  Product,
  RetailOrder,
  SiteSettings,
  Testimonial,
  WholesaleApplication,
  WholesaleInquiry,
  WholesalePriceTier,
  WholesaleProfile,
} from '../../types';

type AdminTab =
  | 'overview'
  | 'products'
  | 'categories'
  | 'orders'
  | 'wholesale'
  | 'customers'
  | 'branding'
  | 'homepage'
  | 'media'
  | 'pages'
  | 'testimonials'
  | 'settings'
  | 'users'
  | 'logs';

export const AdminDashboardPage: React.FC = () => {
  const { adminToken, adminUser, setAdminSession, clearAdminSession, refreshBootstrap, settings } =
    useStore();

  const [needsSetup, setNeedsSetup] = useState<boolean | null>(null);
  const [authForm, setAuthForm] = useState({ full_name: 'Dr Ann Merah', email: 'kyturanaturals@gmail.com', password: '' });
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [loadingData, setLoadingData] = useState(false);

  const [overviewStats, setOverviewStats] = useState({
    totalProducts: 0,
    totalOrders: 0,
    pendingOrders: 0,
    totalCustomers: 0,
    pendingWholesaleApps: 0,
    totalWholesaleApps: 0,
    wholesaleInquiries: 0,
    newsletterCount: 0,
  });
  const [recentLogs, setRecentLogs] = useState<ActivityLog[]>([]);
  const [products, setProducts] = useState<Array<Product & { wholesale_tier?: WholesalePriceTier | null }>>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [orders, setOrders] = useState<RetailOrder[]>([]);
  const [customers, setCustomers] = useState([]);
  const [wholesaleApps, setWholesaleApps] = useState<WholesaleApplication[]>([]);
  const [wholesaleProfiles, setWholesaleProfiles] = useState<WholesaleProfile[]>([]);
  const [wholesaleInquiries, setWholesaleInquiries] = useState<WholesaleInquiry[]>([]);
  const [homepageSections, setHomepageSections] = useState<HomepageSection[]>([]);
  const [media, setMedia] = useState<MediaAsset[]>([]);
  const [pages, setPages] = useState<PageContent[]>([]);
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [adminSettings, setAdminSettings] = useState<SiteSettings>(settings);
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [allLogs, setAllLogs] = useState<ActivityLog[]>([]);

  useEffect(() => {
    fetch('/api/auth/admin/status')
      .then((r) => r.json())
      .then((d) => setNeedsSetup(Boolean(d.needsSetup)))
      .catch(() => setNeedsSetup(false));
  }, []);

  const fetchAdminData = useCallback(async () => {
    if (!adminToken) return;
    setLoadingData(true);
    const headers = { Authorization: `Bearer ${adminToken}` };

    try {
      const safeJson = async (url: string) => {
        const res = await fetch(url, { headers });
        return res.ok ? res.json() : null;
      };

      const [
        ov,
        prod,
        cat,
        ord,
        cust,
        wh,
        hp,
        med,
        pg,
        testi,
        sett,
        usrs,
        logsData,
      ] = await Promise.all([
        safeJson('/api/admin/overview'),
        safeJson('/api/admin/products'),
        safeJson('/api/admin/categories'),
        safeJson('/api/admin/orders'),
        safeJson('/api/admin/customers'),
        safeJson('/api/admin/wholesale'),
        safeJson('/api/admin/homepage'),
        safeJson('/api/admin/media'),
        safeJson('/api/admin/pages'),
        safeJson('/api/admin/testimonials'),
        safeJson('/api/admin/settings'),
        safeJson('/api/admin/users'),
        safeJson('/api/admin/activity-logs'),
      ]);

      if (ov) {
        setOverviewStats(ov.stats);
        setRecentLogs(ov.recentLogs || []);
      }
      if (prod) setProducts(prod.products || []);
      if (cat) setCategories(cat.categories || []);
      if (ord) setOrders(ord.orders || []);
      if (cust) setCustomers(cust.customers || []);
      if (wh) {
        setWholesaleApps(wh.applications || []);
        setWholesaleProfiles(wh.profiles || []);
        setWholesaleInquiries(wh.inquiries || []);
      }
      if (hp) setHomepageSections(hp.sections || []);
      if (med) setMedia(med.media || []);
      if (pg) setPages(pg.pages || []);
      if (testi) setTestimonials(testi.testimonials || []);
      if (sett?.settings) setAdminSettings(sett.settings);
      if (usrs) setAdminUsers(usrs.users || []);
      if (logsData) setAllLogs(logsData.logs || []);
    } finally {
      setLoadingData(false);
    }
  }, [adminToken]);

  useEffect(() => {
    if (adminToken) {
      fetchAdminData();
    }
  }, [adminToken, fetchAdminData]);

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthLoading(true);
    try {
      const endpoint = needsSetup ? '/api/auth/admin/setup' : '/api/auth/admin/login';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(authForm),
      });
      const data = await res.json();
      if (!res.ok) {
        setAuthError(data.error || 'Authentication failed.');
      } else {
        setNeedsSetup(false);
        setAdminSession(data.token, data.user);
      }
    } catch {
      setAuthError('Network error during authentication.');
    } finally {
      setAuthLoading(false);
    }
  };

  if (!adminToken || !adminUser) {
    return (
      <>
        <SEOHead
          title={`Admin Dashboard | ${settings.business_name}`}
          description="Protected Kytura Naturals store administration portal."
        />
        <div className="min-h-screen bg-[#0E021E] flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-2xl p-8 shadow-2xl">
            <div className="mb-6">
              <BrandLogo variant="dark" compact />
            </div>

            <div className="flex items-center gap-2 text-[#5000AF] mb-2">
              <Lock className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-wider">
                {needsSetup ? 'Initial Owner Setup' : 'Protected Admin Portal'}
              </span>
            </div>

            <h1 className="font-display text-2xl font-bold text-[#0E021E]">
              {needsSetup ? 'Claim Super Admin Account' : 'Admin Sign In'}
            </h1>
            <p className="mt-1.5 text-xs text-[#0E021E]/70 leading-relaxed">
              {needsSetup
                ? 'Create the first Super Admin account for Kytura Naturals. Once claimed, public setup locks automatically.'
                : 'Sign in with an authorized administrator account.'}
            </p>

            {authError && (
              <div className="mt-4 p-3 rounded-xl bg-[#B71C85]/10 text-xs font-semibold text-[#B71C85]">
                {authError}
              </div>
            )}

            <form onSubmit={handleAuthSubmit} className="mt-5 space-y-4">
              {needsSetup && (
                <div>
                  <label className="block text-xs font-semibold mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={authForm.full_name}
                    onChange={(e) => setAuthForm({ ...authForm, full_name: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-[#AA87FF]/45 text-sm"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold mb-1">Admin Email</label>
                <input
                  type="email"
                  required
                  value={authForm.email}
                  onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-[#AA87FF]/45 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">
                  Password {needsSetup ? '(Min 8 characters)' : ''}
                </label>
                <input
                  type="password"
                  required
                  minLength={needsSetup ? 8 : 1}
                  value={authForm.password}
                  onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-[#AA87FF]/45 text-sm"
                />
              </div>

              <button
                type="submit"
                disabled={authLoading}
                className="w-full py-3 rounded-full bg-[#5000AF] text-white text-sm font-semibold hover:bg-[#39008B] disabled:opacity-60"
              >
                {authLoading
                  ? 'Verifying...'
                  : needsSetup
                  ? 'Initialize Super Admin'
                  : 'Sign In to Dashboard'}
              </button>
            </form>

            <div className="mt-6 pt-4 border-t border-[#F3F0FF] text-center">
              <Link to="/" className="text-xs font-semibold text-[#5000AF] hover:underline">
                ← Return to Storefront
              </Link>
            </div>
          </div>
        </div>
      </>
    );
  }

  const navItems: Array<{ id: AdminTab; label: string; icon: React.ReactNode; roles?: string[] }> = [
    { id: 'overview', label: 'Overview', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'products', label: 'Products', icon: <Package className="w-4 h-4" />, roles: ['super_admin', 'store_manager'] },
    { id: 'categories', label: 'Categories', icon: <FolderTree className="w-4 h-4" />, roles: ['super_admin', 'store_manager', 'content_manager'] },
    { id: 'orders', label: 'Retail Orders', icon: <ShoppingBag className="w-4 h-4" />, roles: ['super_admin', 'store_manager'] },
    { id: 'wholesale', label: 'Wholesale', icon: <Building2 className="w-4 h-4" />, roles: ['super_admin', 'wholesale_manager'] },
    { id: 'customers', label: 'Customers', icon: <Users className="w-4 h-4" />, roles: ['super_admin', 'store_manager'] },
    { id: 'branding', label: 'Brand, Header & Footer', icon: <PanelBottom className="w-4 h-4" />, roles: ['super_admin', 'store_manager', 'content_manager'] },
    { id: 'homepage', label: 'Homepage Editor', icon: <LayoutTemplate className="w-4 h-4" />, roles: ['super_admin', 'content_manager', 'store_manager'] },
    { id: 'media', label: 'Media Library', icon: <ImageIcon className="w-4 h-4" /> },
    { id: 'pages', label: 'Pages & Content', icon: <FileText className="w-4 h-4" />, roles: ['super_admin', 'content_manager'] },
    { id: 'testimonials', label: 'Testimonials', icon: <MessageSquareQuote className="w-4 h-4" />, roles: ['super_admin', 'content_manager'] },
    { id: 'settings', label: 'Store Settings', icon: <Settings className="w-4 h-4" />, roles: ['super_admin', 'store_manager', 'content_manager'] },
    { id: 'users', label: 'Admin Users', icon: <Shield className="w-4 h-4" />, roles: ['super_admin'] },
    { id: 'logs', label: 'Activity Logs', icon: <Activity className="w-4 h-4" /> },
  ];

  const visibleNav = navItems.filter((n) => !n.roles || n.roles.includes(adminUser.role));

  return (
    <>
      <SEOHead title={`Admin Dashboard | ${settings.business_name}`} description="Store management console." />
      <div className="min-h-screen bg-[#F3F0FF]/45 flex flex-col lg:flex-row">
        {/* Sidebar */}
        <aside className="w-full lg:w-64 bg-[#0E021E] text-white shrink-0 flex flex-col">
          <div className="p-5 border-b border-white/10 flex items-center justify-between">
            <Link to="/">
              <BrandLogo variant="light" showTagline={false} compact />
            </Link>
          </div>

          <nav className="p-3 flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible flex-1">
            {visibleNav.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap ${
                  activeTab === item.id
                    ? 'bg-[#5000AF] text-white'
                    : 'text-white/75 hover:bg-white/10 hover:text-white'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            ))}
          </nav>

          <div className="p-4 border-t border-white/10 text-xs space-y-2">
            <div>
              <p className="font-semibold text-white truncate">{adminUser.full_name}</p>
              <p className="text-white/55 font-mono text-[11px]">{adminUser.role}</p>
            </div>
            <div className="flex items-center gap-2">
              <Link
                to="/"
                className="flex-1 py-1.5 px-3 rounded-lg bg-white/10 text-center text-white/90 hover:bg-white/20"
              >
                View Store
              </Link>
              <button
                type="button"
                onClick={clearAdminSession}
                className="p-1.5 rounded-lg bg-white/10 text-white/80 hover:bg-[#B71C85]"
                aria-label="Sign out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </aside>

        {/* Main Viewport */}
        <div className="flex-1 min-w-0 p-5 sm:p-8">
          {loadingData && activeTab === 'overview' && (
            <div className="mb-4 text-xs text-[#5000AF] font-semibold">Syncing store data...</div>
          )}

          {activeTab === 'overview' && (
            <div className="space-y-8">
              <div>
                <h1 className="font-display text-3xl font-bold text-[#0E021E]">
                  Dashboard Overview
                </h1>
                <p className="text-xs text-[#0E021E]/65 mt-1">
                  Live store metrics and recent administrative activity for {settings.business_name}.
                </p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'Total Products', value: overviewStats.totalProducts, tab: 'products' as AdminTab },
                  { label: 'Total Retail Orders', value: overviewStats.totalOrders, tab: 'orders' as AdminTab },
                  { label: 'Pending Orders', value: overviewStats.pendingOrders, tab: 'orders' as AdminTab },
                  { label: 'Total Customers', value: overviewStats.totalCustomers, tab: 'customers' as AdminTab },
                  { label: 'Wholesale Applications', value: overviewStats.totalWholesaleApps, tab: 'wholesale' as AdminTab },
                  { label: 'Pending Approvals', value: overviewStats.pendingWholesaleApps, tab: 'wholesale' as AdminTab },
                  { label: 'Wholesale Enquiries', value: overviewStats.wholesaleInquiries, tab: 'wholesale' as AdminTab },
                  { label: 'Newsletter Subscribers', value: overviewStats.newsletterCount, tab: 'overview' as AdminTab },
                ].map((kpi) => (
                  <button
                    key={kpi.label}
                    type="button"
                    onClick={() => setActiveTab(kpi.tab)}
                    className="bg-white rounded-xl border border-[#AA87FF]/25 p-5 text-left hover:border-[#5000AF] transition-colors"
                  >
                    <span className="text-xs font-medium text-[#0E021E]/65 block">{kpi.label}</span>
                    <span className="mt-2 block text-3xl font-bold text-[#39008B] tabular-nums">
                      {kpi.value}
                    </span>
                  </button>
                ))}
              </div>

              <div className="bg-white rounded-xl border border-[#AA87FF]/25 p-6">
                <h2 className="font-display text-xl font-bold text-[#0E021E] mb-4">
                  Recent Activity
                </h2>
                {recentLogs.length === 0 ? (
                  <p className="text-xs text-[#0E021E]/60">No recent activities recorded yet.</p>
                ) : (
                  <div className="divide-y divide-[#F3F0FF] text-xs">
                    {recentLogs.map((l) => (
                      <div key={l.id} className="py-2.5 flex flex-wrap justify-between gap-2">
                        <span>
                          <strong className="text-[#39008B]">{l.actor_email}</strong> — {l.action}
                        </span>
                        <span className="font-mono text-[#0E021E]/55 tabular-nums">
                          {new Date(l.created_at).toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {(activeTab === 'products' || activeTab === 'categories') && (
            <AdminCatalogSection
              token={adminToken}
              mode={activeTab}
              products={products}
              categories={categories}
              media={media}
              onRefresh={async () => {
                await Promise.all([fetchAdminData(), refreshBootstrap()]);
              }}
            />
          )}

          {(activeTab === 'orders' || activeTab === 'customers') && (
            <AdminOrdersCustomersSection
              token={adminToken}
              mode={activeTab}
              orders={orders}
              customers={customers}
              onRefresh={fetchAdminData}
            />
          )}

          {activeTab === 'wholesale' && (
            <AdminWholesaleSection
              token={adminToken}
              applications={wholesaleApps}
              profiles={wholesaleProfiles}
              inquiries={wholesaleInquiries}
              products={products}
              onRefresh={fetchAdminData}
            />
          )}

          {activeTab === 'branding' && (
            <AdminFooterBrandingSection
              token={adminToken}
              settings={adminSettings}
              media={media}
              onRefresh={fetchAdminData}
              onRefreshStorefront={refreshBootstrap}
            />
          )}

          {(activeTab === 'homepage' ||
            activeTab === 'media' ||
            activeTab === 'pages' ||
            activeTab === 'testimonials' ||
            activeTab === 'settings' ||
            activeTab === 'users' ||
            activeTab === 'logs') && (
            <AdminContentSettingsSection
              token={adminToken}
              mode={activeTab}
              sections={homepageSections}
              media={media}
              pages={pages}
              testimonials={testimonials}
              settings={adminSettings}
              adminUsers={adminUsers}
              logs={allLogs}
              onRefresh={fetchAdminData}
              onRefreshStorefront={refreshBootstrap}
            />
          )}
        </div>
      </div>
    </>
  );
};
