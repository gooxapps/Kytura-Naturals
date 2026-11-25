import React, { useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  ChevronDown,
  Facebook,
  Instagram,
  Leaf,
  Mail,
  MapPin,
  Menu,
  MessageCircle,
  Phone,
  Search,
  ShoppingCart,
  Truck,
  User,
  X,
  Youtube,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { BrandLogo } from './BrandLogo';
import { CartDrawer } from './CartDrawer';
import { formatPhoneDisplay, formatWhatsappHref, useStore } from '../context/StoreContext';

const WhatsAppGlyph: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg viewBox="0 0 32 32" fill="currentColor" className={className} aria-hidden="true">
    <path d="M16 3C8.82 3 3 8.82 3 16c0 2.3.6 4.55 1.74 6.53L3 29l6.63-1.74A12.94 12.94 0 0016 29c7.18 0 13-5.82 13-13S23.18 3 16 3zm7.58 18.23c-.32.9-1.85 1.72-2.58 1.83-.67.1-1.52.14-2.46-.16-.57-.18-1.3-.42-2.23-.82-3.92-1.7-6.48-5.66-6.68-5.92-.2-.26-1.6-2.12-1.6-4.05 0-1.92 1.01-2.87 1.37-3.26.36-.39.78-.49 1.04-.49.26 0 .52 0 .75.01.24.01.56-.09.88.67.32.78 1.1 2.7 1.2 2.9.1.2.16.43.03.69-.13.26-.2.42-.39.65-.2.23-.41.51-.59.69-.2.2-.4.41-.17.8.23.39 1.02 1.68 2.2 2.72 1.51 1.35 2.78 1.77 3.17 1.97.39.2.62.17.85-.1.23-.26.98-1.14 1.24-1.53.26-.39.52-.33.88-.2.36.13 2.28 1.08 2.67 1.27.39.2.65.3.75.46.1.16.1.94-.22 1.84z" />
  </svg>
);

function isExternalHref(href: string): boolean {
  return /^(https?:\/\/|mailto:|tel:)/i.test((href || '').trim());
}

const SmartLink: React.FC<{
  href: string;
  openInNewTab?: boolean;
  className?: string;
  onClick?: () => void;
  children: React.ReactNode;
}> = ({ href, openInNewTab, className, onClick, children }) => {
  const cleanHref = (href || '/').trim() || '/';
  const external = isExternalHref(cleanHref) || Boolean(openInNewTab);

  if (external) {
    return (
      <a
        href={cleanHref}
        target={openInNewTab || /^https?:\/\//i.test(cleanHref) ? '_blank' : undefined}
        rel={openInNewTab || /^https?:\/\//i.test(cleanHref) ? 'noopener noreferrer' : undefined}
        className={className}
        onClick={onClick}
      >
        {children}
      </a>
    );
  }

  return (
    <Link to={cleanHref} className={className} onClick={onClick}>
      {children}
    </Link>
  );
};

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { settings, categories, cartCount, setIsCartOpen } = useStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openDropdownIndex, setOpenDropdownIndex] = useState<number | null>(null);
  const [accountDropdownOpen, setAccountDropdownOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = searchQuery.trim();
    navigate(trimmed ? `/shop?q=${encodeURIComponent(trimmed)}` : '/shop');
    setMobileMenuOpen(false);
  };

  const whatsappInquiryUrl = formatWhatsappHref(
    settings.whatsapp_number,
    `Hello ${settings.business_name}, I would like to make an enquiry about your products.`
  );

  const hasSocialLinks = Boolean(
    settings.social_facebook ||
      settings.social_instagram ||
      settings.social_youtube ||
      settings.social_pinterest
  );

  const headerLinks = settings.header_links?.length
    ? settings.header_links
    : [
        { label: 'Home', href: '/', type: 'link' as const },
        { label: 'Shop', href: '/shop', type: 'shop_dropdown' as const },
        {
          label: 'Collections',
          href: '/collections/diffuser-oil-blends',
          type: 'collections_dropdown' as const,
        },
        { label: 'About Us', href: '/about', type: 'link' as const },
        { label: 'Wholesale', href: '/wholesale', type: 'link' as const },
        { label: 'FAQ', href: '/faq', type: 'link' as const },
        { label: 'Contact', href: '/contact', type: 'link' as const },
      ];

  const footer = settings.footer_config;
  const isCheckoutPage = location.pathname === '/checkout';

  return (
    <div className="min-h-screen flex flex-col bg-white text-[#0E021E] overflow-x-hidden">
      {/* A. Top Announcement Bar matching reference design */}
      <div className="bg-gradient-to-r from-[#39008B] via-[#5000AF] to-[#39008B] text-white text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2 flex flex-wrap items-center justify-between gap-2">
          <div className="hidden md:flex items-center gap-2 text-white/95">
            <Leaf className="w-3.5 h-3.5 text-[#8ACE69] shrink-0" />
            <span>{settings.announcement_left}</span>
          </div>

          <span className="hidden lg:block text-white/30" aria-hidden="true">
            |
          </span>

          <div className="flex items-center gap-2 text-white font-medium mx-auto md:mx-0">
            <Truck className="w-3.5 h-3.5 text-[#8ACE69] shrink-0" />
            <span className="truncate">{settings.announcement_center}</span>
          </div>

          <span className="hidden lg:block text-white/30" aria-hidden="true">
            |
          </span>

          <a
            href={whatsappInquiryUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:inline-flex items-center gap-1.5 font-semibold text-white hover:text-[#8ACE69] transition-colors whitespace-nowrap"
          >
            <span className="w-4 h-4 rounded-full bg-[#25D366] text-white flex items-center justify-center">
              <WhatsAppGlyph className="w-2.5 h-2.5" />
            </span>
            <span className="tabular-nums">{formatPhoneDisplay(settings.whatsapp_number)}</span>
          </a>
        </div>
      </div>

      {/* B. Main Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#F3F0FF] shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-20 flex items-center justify-between gap-4">
          <Link to="/" className="shrink-0" aria-label={`${settings.business_name} Home`}>
            <BrandLogo variant="dark" />
          </Link>

          {/* Desktop Navigation (Admin-Managed) */}
          <nav className="hidden xl:flex items-center gap-5 text-sm font-medium text-[#0E021E]">
            {headerLinks.map((item, idx) => {
              const linkType = item.type || 'link';
              const cleanHref = (item.href || '/').trim() || '/';

              if (linkType === 'shop_dropdown') {
                return (
                  <div
                    key={`${item.label}-${idx}`}
                    className="relative"
                    onMouseEnter={() => setOpenDropdownIndex(idx)}
                    onMouseLeave={() => setOpenDropdownIndex(null)}
                  >
                    <button
                      type="button"
                      onClick={() => navigate(cleanHref)}
                      className={`inline-flex items-center gap-1 py-1.5 whitespace-nowrap transition-colors ${
                        location.pathname.startsWith('/shop')
                          ? 'text-[#5000AF] font-semibold'
                          : 'hover:text-[#5000AF]'
                      }`}
                    >
                      {item.label}
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>
                    {openDropdownIndex === idx && (
                      <div className="absolute left-0 top-full pt-2 w-60 z-50">
                        <div className="bg-white rounded-xl border border-[#AA87FF]/25 shadow-xl py-2">
                          <Link
                            to={cleanHref}
                            onClick={() => setOpenDropdownIndex(null)}
                            className="block px-4 py-2 text-sm font-semibold text-[#39008B] hover:bg-[#F3F0FF]"
                          >
                            Shop All Products
                          </Link>
                          <div className="my-1 border-t border-[#F3F0FF]" />
                          {categories.map((cat) => (
                            <Link
                              key={cat.id}
                              to={`/collections/${cat.slug}`}
                              onClick={() => setOpenDropdownIndex(null)}
                              className="block px-4 py-2 text-sm text-[#0E021E]/85 hover:bg-[#F3F0FF] hover:text-[#5000AF]"
                            >
                              {cat.name}
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              }

              if (linkType === 'collections_dropdown') {
                return (
                  <div
                    key={`${item.label}-${idx}`}
                    className="relative"
                    onMouseEnter={() => setOpenDropdownIndex(idx)}
                    onMouseLeave={() => setOpenDropdownIndex(null)}
                  >
                    <button
                      type="button"
                      onClick={() => setOpenDropdownIndex((prev) => (prev === idx ? null : idx))}
                      className={`inline-flex items-center gap-1 py-1.5 whitespace-nowrap transition-colors ${
                        location.pathname.startsWith('/collections')
                          ? 'text-[#5000AF] font-semibold'
                          : 'hover:text-[#5000AF]'
                      }`}
                    >
                      {item.label}
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>
                    {openDropdownIndex === idx && (
                      <div className="absolute left-0 top-full pt-2 w-60 z-50">
                        <div className="bg-white rounded-xl border border-[#AA87FF]/25 shadow-xl py-2">
                          {categories.map((cat) => (
                            <Link
                              key={cat.id}
                              to={`/collections/${cat.slug}`}
                              onClick={() => setOpenDropdownIndex(null)}
                              className="block px-4 py-2 text-sm text-[#0E021E]/85 hover:bg-[#F3F0FF] hover:text-[#5000AF]"
                            >
                              {cat.name}
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              }

              if (isExternalHref(cleanHref) || item.open_in_new_tab) {
                return (
                  <SmartLink
                    key={`${item.label}-${idx}`}
                    href={cleanHref}
                    openInNewTab={item.open_in_new_tab}
                    className="whitespace-nowrap transition-colors hover:text-[#5000AF]"
                  >
                    {item.label}
                  </SmartLink>
                );
              }

              return (
                <NavLink
                  key={`${item.label}-${idx}`}
                  to={cleanHref}
                  end={cleanHref === '/'}
                  className={({ isActive }) =>
                    cleanHref === '/'
                      ? `px-4 py-1.5 rounded-full transition-colors whitespace-nowrap ${
                          isActive
                            ? 'bg-[#5000AF] text-white font-semibold'
                            : 'text-[#0E021E] hover:text-[#5000AF]'
                        }`
                      : `whitespace-nowrap transition-colors ${
                          isActive ? 'text-[#5000AF] font-semibold' : 'hover:text-[#5000AF]'
                        }`
                  }
                >
                  {item.label}
                </NavLink>
              );
            })}
          </nav>

          {/* Right Controls: Search + Account/Portals + Cart + Mobile Hamburger */}
          <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
            <form onSubmit={handleSearch} className="hidden md:flex items-center relative">
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search products..."
                aria-label="Search products"
                className="w-44 lg:w-52 pl-4 pr-9 py-2 rounded-full bg-[#F3F0FF]/80 border border-[#AA87FF]/35 text-xs text-[#0E021E] placeholder:text-[#0E021E]/45 focus:outline-none focus:border-[#5000AF] focus:bg-white transition-colors"
              />
              <button
                type="submit"
                aria-label="Submit product search"
                className="absolute right-3 text-[#39008B] hover:text-[#5000AF]"
              >
                <Search className="w-4 h-4" />
              </button>
            </form>

            {/* Account / Portals Menu */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setAccountDropdownOpen((v) => !v)}
                aria-label="Wholesale and Admin Portals"
                className="w-10 h-10 rounded-full flex items-center justify-center text-[#39008B] hover:bg-[#F3F0FF] transition-colors"
              >
                <User className="w-5 h-5" />
              </button>
              {accountDropdownOpen && (
                <div
                  className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl border border-[#AA87FF]/25 shadow-xl py-2 z-50"
                  onMouseLeave={() => setAccountDropdownOpen(false)}
                >
                  <Link
                    to="/wholesale/portal"
                    onClick={() => setAccountDropdownOpen(false)}
                    className="block px-4 py-2.5 text-sm font-medium text-[#0E021E] hover:bg-[#F3F0FF] hover:text-[#5000AF]"
                  >
                    Wholesale Buyer Portal
                  </Link>
                  <Link
                    to="/wholesale"
                    onClick={() => setAccountDropdownOpen(false)}
                    className="block px-4 py-2 text-xs text-[#0E021E]/70 hover:bg-[#F3F0FF]"
                  >
                    Apply for Wholesale Account
                  </Link>
                  <div className="my-1 border-t border-[#F3F0FF]" />
                  <Link
                    to="/admin"
                    onClick={() => setAccountDropdownOpen(false)}
                    className="block px-4 py-2.5 text-sm font-medium text-[#39008B] hover:bg-[#F3F0FF]"
                  >
                    Admin Dashboard
                  </Link>
                </div>
              )}
            </div>

            {/* Cart Button with Live Badge */}
            <button
              type="button"
              onClick={() => setIsCartOpen(true)}
              aria-label={`Shopping cart with ${cartCount} items`}
              className="relative w-10 h-10 rounded-full flex items-center justify-center text-[#39008B] hover:bg-[#F3F0FF] transition-colors"
            >
              <ShoppingCart className="w-5 h-5" />
              <span className="absolute -top-0.5 -right-0.5 min-w-5 h-5 px-1 rounded-full bg-[#5000AF] text-white text-[11px] font-bold flex items-center justify-center tabular-nums">
                {cartCount}
              </span>
            </button>

            {/* Mobile Hamburger */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen((v) => !v)}
              aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
              className="xl:hidden w-10 h-10 rounded-full flex items-center justify-center text-[#39008B] hover:bg-[#F3F0FF] transition-colors"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Drawer Navigation */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="xl:hidden border-t border-[#F3F0FF] bg-white overflow-hidden"
            >
              <div className="px-4 py-4 space-y-3">
                <form onSubmit={handleSearch} className="relative">
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search products..."
                    className="w-full pl-4 pr-10 py-2.5 rounded-full bg-[#F3F0FF] text-sm text-[#0E021E] focus:outline-none"
                  />
                  <button
                    type="submit"
                    aria-label="Search"
                    className="absolute right-3.5 top-3 text-[#5000AF]"
                  >
                    <Search className="w-4 h-4" />
                  </button>
                </form>

                <div className="grid grid-cols-1 gap-1 text-sm font-medium">
                  {headerLinks.map((item, idx) => (
                    <SmartLink
                      key={`mob-${item.label}-${idx}`}
                      href={item.href || '/'}
                      openInNewTab={item.open_in_new_tab}
                      onClick={() => setMobileMenuOpen(false)}
                      className="px-3 py-2.5 rounded-xl hover:bg-[#F3F0FF] text-[#0E021E] hover:text-[#5000AF]"
                    >
                      {item.label}
                    </SmartLink>
                  ))}
                  {categories.map((c) => (
                    <Link
                      key={`mob-cat-${c.id}`}
                      to={`/collections/${c.slug}`}
                      onClick={() => setMobileMenuOpen(false)}
                      className="px-5 py-2 rounded-xl hover:bg-[#F3F0FF] text-xs text-[#0E021E]/75 hover:text-[#5000AF]"
                    >
                      · {c.name}
                    </Link>
                  ))}
                  <Link
                    to="/wholesale/portal"
                    onClick={() => setMobileMenuOpen(false)}
                    className="px-3 py-2.5 rounded-xl hover:bg-[#F3F0FF] text-[#0E021E] hover:text-[#5000AF]"
                  >
                    Wholesale Buyer Portal
                  </Link>
                  <Link
                    to="/cart"
                    onClick={() => setMobileMenuOpen(false)}
                    className="px-3 py-2.5 rounded-xl hover:bg-[#F3F0FF] text-[#0E021E] hover:text-[#5000AF]"
                  >
                    Shopping Cart ({cartCount})
                  </Link>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Page Body */}
      <main className="flex-1">{children}</main>

      {/* K. Dynamic Admin-Editable Footer matching reference image */}
      <footer className="bg-gradient-to-b from-[#2A0062] to-[#0E021E] text-white mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-8 items-start">
            {/* Brand Column */}
            <div className="lg:col-span-3">
              <Link to="/" className="inline-block">
                <BrandLogo variant="light" compact />
              </Link>
              {footer.description && (
                <p className="mt-4 text-xs text-white/70 leading-relaxed max-w-xs">
                  {footer.description}
                </p>
              )}
              {footer.badge_image_url && (
                <div className="mt-4">
                  {footer.badge_href ? (
                    <SmartLink
                      href={footer.badge_href}
                      className="inline-block rounded-xl overflow-hidden border border-white/15 hover:border-[#8ACE69] transition-colors"
                    >
                      <img
                        src={footer.badge_image_url}
                        alt={footer.badge_alt || settings.business_name}
                        className="max-h-20 w-auto object-contain"
                      />
                    </SmartLink>
                  ) : (
                    <img
                      src={footer.badge_image_url}
                      alt={footer.badge_alt || settings.business_name}
                      className="max-h-20 w-auto rounded-xl object-contain"
                    />
                  )}
                </div>
              )}
            </div>

            {/* Quick Links */}
            <div className="lg:col-span-2">
              <h3 className="font-display text-base font-semibold text-white mb-3">
                {footer.quick_links_title || 'Quick Links'}
              </h3>
              <ul className="space-y-2 text-xs text-white/80">
                {(footer.quick_links || []).map((link, idx) => (
                  <li key={`ql-${idx}`}>
                    <SmartLink
                      href={link.href}
                      openInNewTab={link.open_in_new_tab}
                      className="hover:text-[#8ACE69] transition-colors"
                    >
                      {link.label}
                    </SmartLink>
                  </li>
                ))}
              </ul>
            </div>

            {/* Customer Care */}
            <div className="lg:col-span-2">
              <h3 className="font-display text-base font-semibold text-white mb-3">
                {footer.customer_care_title || 'Customer Care'}
              </h3>
              <ul className="space-y-2 text-xs text-white/80">
                {(footer.customer_care_links || []).map((link, idx) => (
                  <li key={`cc-${idx}`}>
                    <SmartLink
                      href={link.href}
                      openInNewTab={link.open_in_new_tab}
                      className="hover:text-[#8ACE69] transition-colors"
                    >
                      {link.label}
                    </SmartLink>
                  </li>
                ))}
              </ul>
            </div>

            {/* Contact Us */}
            <div className="lg:col-span-3">
              <h3 className="font-display text-base font-semibold text-white mb-3">
                {footer.contact_title || 'Contact Us'}
              </h3>
              <ul className="space-y-2.5 text-xs text-white/85">
                {footer.show_contact_phone !== false && (
                  <li>
                    <a
                      href={whatsappInquiryUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 hover:text-[#8ACE69] transition-colors tabular-nums"
                    >
                      <Phone className="w-3.5 h-3.5 text-[#AA87FF] shrink-0" />
                      <span>{formatPhoneDisplay(settings.whatsapp_number)}</span>
                    </a>
                  </li>
                )}
                {footer.show_contact_email !== false && (
                  <li>
                    <a
                      href={`mailto:${settings.email}`}
                      className="inline-flex items-center gap-2 hover:text-[#8ACE69] transition-colors"
                    >
                      <Mail className="w-3.5 h-3.5 text-[#AA87FF] shrink-0" />
                      <span>{settings.email}</span>
                    </a>
                  </li>
                )}
                {footer.show_contact_region !== false && (
                  <li className="inline-flex items-center gap-2 text-white/80">
                    <MapPin className="w-3.5 h-3.5 text-[#AA87FF] shrink-0" />
                    <span>{settings.region_label}</span>
                  </li>
                )}
              </ul>
            </div>

            {/* Stay Connected + Extra Footer Links */}
            <div className="lg:col-span-2 flex flex-col justify-between h-full">
              <div>
                <h3 className="font-display text-base font-semibold text-white mb-3">
                  {footer.social_title || 'Stay Connected'}
                </h3>
                {hasSocialLinks ? (
                  <div className="flex items-center gap-2.5 mb-3">
                    {settings.social_facebook && (
                      <a
                        href={settings.social_facebook}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label="Facebook"
                        className="w-8 h-8 rounded-full bg-[#5000AF] hover:bg-[#AA87FF] hover:text-[#0E021E] flex items-center justify-center transition-colors"
                      >
                        <Facebook className="w-4 h-4" />
                      </a>
                    )}
                    {settings.social_instagram && (
                      <a
                        href={settings.social_instagram}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label="Instagram"
                        className="w-8 h-8 rounded-full bg-[#5000AF] hover:bg-[#AA87FF] hover:text-[#0E021E] flex items-center justify-center transition-colors"
                      >
                        <Instagram className="w-4 h-4" />
                      </a>
                    )}
                    {settings.social_youtube && (
                      <a
                        href={settings.social_youtube}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label="YouTube"
                        className="w-8 h-8 rounded-full bg-[#5000AF] hover:bg-[#AA87FF] hover:text-[#0E021E] flex items-center justify-center transition-colors"
                      >
                        <Youtube className="w-4 h-4" />
                      </a>
                    )}
                    {settings.social_pinterest && (
                      <a
                        href={settings.social_pinterest}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label="Pinterest"
                        className="w-8 h-8 rounded-full bg-[#5000AF] hover:bg-[#AA87FF] hover:text-[#0E021E] flex items-center justify-center transition-colors"
                      >
                        <MessageCircle className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                ) : null}
                <div className="space-y-1.5 text-xs text-white/75">
                  {(footer.extra_links || []).map((link, idx) => (
                    <SmartLink
                      key={`extra-${idx}`}
                      href={link.href}
                      openInNewTab={link.open_in_new_tab}
                      className="block hover:text-[#8ACE69] transition-colors"
                    >
                      {link.label}
                    </SmartLink>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-10 pt-5 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-white/55">
            <p>
              {footer.copyright_text?.trim() ||
                `© ${new Date().getFullYear()} ${settings.business_name}. All rights reserved. Prices in ${settings.currency}.`}
            </p>
            <p className="text-white/50 tracking-wide">
              Developed by Emmanuel Kenny | StaySafelite
            </p>
          </div>
        </div>
      </footer>

      {/* Slide-out Cart Drawer */}
      <CartDrawer />

      {/* 6. Floating WhatsApp Button (Bottom-Right) */}
      <a
        href={whatsappInquiryUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Chat with ${settings.business_name} on WhatsApp`}
        className={`fixed right-4 sm:right-6 z-40 group flex items-center gap-2.5 ${
          isCheckoutPage ? 'bottom-20 sm:bottom-6' : 'bottom-5 sm:bottom-6'
        }`}
      >
        <span className="hidden md:inline-block px-3 py-1.5 rounded-full bg-[#0E021E] text-white text-xs font-medium shadow-lg opacity-0 translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all pointer-events-none">
          Chat on WhatsApp
        </span>
        <span className="relative flex items-center justify-center w-13 h-13 sm:w-14 sm:h-14 rounded-full bg-[#25D366] text-white shadow-xl shadow-[#25D366]/35 hover:scale-105 transition-transform">
          <span className="absolute inset-0 rounded-full bg-[#25D366] animate-ping opacity-25 motion-reduce:hidden" />
          <WhatsAppGlyph className="w-7 h-7 relative z-10" />
        </span>
      </a>
    </div>
  );
};
