import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Briefcase, Home, Menu, ShoppingBag, ShoppingCart, X } from 'lucide-react';
import { useStore } from '../context/StoreContext';

interface BottomNavProps {
  mobileMenuOpen: boolean;
  onToggleMobileMenu: () => void;
  onCloseMobileMenu: () => void;
}

const SHOP_ROUTES = new Set([
  '/diffuser-oil-blends',
  '/body-massage-oils',
  '/ultrasonic-diffusers',
  '/wellness-collections',
]);

export const BottomNav: React.FC<BottomNavProps> = ({
  mobileMenuOpen,
  onToggleMobileMenu,
  onCloseMobileMenu,
}) => {
  const { cartCount, isCartOpen, setIsCartOpen } = useStore();
  const { pathname } = useLocation();

  const isHome = pathname === '/' && !mobileMenuOpen && !isCartOpen;
  const isShop =
    !mobileMenuOpen &&
    !isCartOpen &&
    (pathname.startsWith('/shop') ||
      pathname.startsWith('/collections') ||
      pathname.startsWith('/product') ||
      SHOP_ROUTES.has(pathname));
  const isWholesale = !mobileMenuOpen && !isCartOpen && pathname.startsWith('/wholesale');
  const isCartActive = isCartOpen || pathname === '/cart' || pathname === '/checkout';

  return (
    <nav
      aria-label="Mobile bottom navigation"
      className="xl:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-[#AA87FF]/25 shadow-[0_-4px_20px_rgba(14,2,30,0.06)] pb-[env(safe-area-inset-bottom)]"
    >
      <div className="max-w-2xl mx-auto grid grid-cols-5 items-center h-16">
        <Link
          to="/"
          onClick={onCloseMobileMenu}
          className={`relative h-full min-h-[44px] flex flex-col items-center justify-center gap-0.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#5000AF] ${
            isHome ? 'text-[#5000AF]' : 'text-[#0E021E]/65 hover:text-[#5000AF]'
          }`}
        >
          {isHome && (
            <span
              aria-hidden="true"
              className="absolute top-0 w-7 h-0.5 rounded-full bg-[#5000AF]"
            />
          )}
          <Home className="w-5 h-5 shrink-0" strokeWidth={isHome ? 2.4 : 1.9} />
          <span className="text-[11px] font-medium tracking-tight whitespace-nowrap leading-none">
            Home
          </span>
        </Link>

        <Link
          to="/shop"
          onClick={onCloseMobileMenu}
          className={`relative h-full min-h-[44px] flex flex-col items-center justify-center gap-0.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#5000AF] ${
            isShop ? 'text-[#5000AF]' : 'text-[#0E021E]/65 hover:text-[#5000AF]'
          }`}
        >
          {isShop && (
            <span
              aria-hidden="true"
              className="absolute top-0 w-7 h-0.5 rounded-full bg-[#5000AF]"
            />
          )}
          <ShoppingBag className="w-5 h-5 shrink-0" strokeWidth={isShop ? 2.4 : 1.9} />
          <span className="text-[11px] font-medium tracking-tight whitespace-nowrap leading-none">
            Shop
          </span>
        </Link>

        <Link
          to="/wholesale"
          onClick={onCloseMobileMenu}
          className={`relative h-full min-h-[44px] flex flex-col items-center justify-center gap-0.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#5000AF] ${
            isWholesale ? 'text-[#5000AF]' : 'text-[#0E021E]/65 hover:text-[#5000AF]'
          }`}
        >
          {isWholesale && (
            <span
              aria-hidden="true"
              className="absolute top-0 w-7 h-0.5 rounded-full bg-[#5000AF]"
            />
          )}
          <Briefcase className="w-5 h-5 shrink-0" strokeWidth={isWholesale ? 2.4 : 1.9} />
          <span className="text-[11px] font-medium tracking-tight whitespace-nowrap leading-none">
            Wholesale
          </span>
        </Link>

        <button
          type="button"
          onClick={() => {
            onCloseMobileMenu();
            setIsCartOpen(true);
          }}
          aria-label={`Shopping cart with ${cartCount} items`}
          className={`relative h-full min-h-[44px] flex flex-col items-center justify-center gap-0.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#5000AF] ${
            isCartActive ? 'text-[#5000AF]' : 'text-[#0E021E]/65 hover:text-[#5000AF]'
          }`}
        >
          {isCartActive && (
            <span
              aria-hidden="true"
              className="absolute top-0 w-7 h-0.5 rounded-full bg-[#5000AF]"
            />
          )}
          <span className="relative">
            <ShoppingCart className="w-5 h-5 shrink-0" strokeWidth={isCartActive ? 2.4 : 1.9} />
            {cartCount > 0 && (
              <span className="absolute -top-1.5 -right-2.5 min-w-4 h-4 px-1 rounded-full bg-[#5000AF] text-white text-[10px] font-bold flex items-center justify-center tabular-nums leading-none">
                {cartCount}
              </span>
            )}
          </span>
          <span className="text-[11px] font-medium tracking-tight whitespace-nowrap leading-none">
            Cart
          </span>
        </button>

        <button
          type="button"
          onClick={onToggleMobileMenu}
          aria-expanded={mobileMenuOpen}
          aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
          className={`relative h-full min-h-[44px] flex flex-col items-center justify-center gap-0.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#5000AF] ${
            mobileMenuOpen ? 'text-[#5000AF]' : 'text-[#0E021E]/65 hover:text-[#5000AF]'
          }`}
        >
          {mobileMenuOpen && (
            <span
              aria-hidden="true"
              className="absolute top-0 w-7 h-0.5 rounded-full bg-[#5000AF]"
            />
          )}
          {mobileMenuOpen ? (
            <X className="w-5 h-5 shrink-0" strokeWidth={2.4} />
          ) : (
            <Menu className="w-5 h-5 shrink-0" strokeWidth={1.9} />
          )}
          <span className="text-[11px] font-medium tracking-tight whitespace-nowrap leading-none">
            {mobileMenuOpen ? 'Close' : 'Menu'}
          </span>
        </button>
      </div>
    </nav>
  );
};
