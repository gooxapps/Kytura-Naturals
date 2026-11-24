/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter, Link, Route, Routes, useLocation } from 'react-router-dom';
import { MotionConfig } from 'motion/react';
import { StoreProvider } from './context/StoreContext';
import { Layout } from './components/Layout';
import { HomePage } from './pages/HomePage';
import { ShopPage } from './pages/ShopPage';
import { ProductDetailPage } from './pages/ProductDetailPage';
import { CartPage } from './pages/CartPage';
import { CheckoutPage } from './pages/CheckoutPage';
import { WholesalePage } from './pages/WholesalePage';
import { WholesalePortalPage } from './pages/WholesalePortalPage';
import { ContactPage } from './pages/ContactPage';
import { CmsPage } from './pages/CmsPage';
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage';

const ScrollToTop: React.FC = () => {
  const { pathname } = useLocation();
  React.useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
};

const NotFoundPage: React.FC = () => (
  <div className="max-w-3xl mx-auto px-4 py-20 text-center">
    <h1 className="font-display text-4xl font-bold text-[#0E021E]">Page Not Found</h1>
    <p className="mt-3 text-sm text-[#0E021E]/70">
      The page you are looking for could not be found.
    </p>
    <Link
      to="/"
      className="inline-block mt-6 px-6 py-2.5 rounded-full bg-[#5000AF] text-white text-sm font-semibold"
    >
      Return Home
    </Link>
  </div>
);

const AppRoutes: React.FC = () => {
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin');

  if (isAdminRoute) {
    return (
      <Routes>
        <Route path="/admin/*" element={<AdminDashboardPage />} />
      </Routes>
    );
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/shop" element={<ShopPage />} />
        <Route path="/collections/:slug" element={<ShopPage />} />
        <Route path="/diffuser-oil-blends" element={<ShopPage forcedCategorySlug="diffuser-oil-blends" />} />
        <Route path="/body-massage-oils" element={<ShopPage forcedCategorySlug="body-massage-oils" />} />
        <Route path="/ultrasonic-diffusers" element={<ShopPage forcedCategorySlug="ultrasonic-diffusers" />} />
        <Route path="/wellness-collections" element={<ShopPage forcedCategorySlug="wellness-collections" />} />
        <Route path="/product/:slug" element={<ProductDetailPage />} />
        <Route path="/about" element={<CmsPage slug="about" />} />
        <Route path="/wholesale" element={<WholesalePage />} />
        <Route path="/wholesale/portal" element={<WholesalePortalPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/faq" element={<CmsPage slug="faq" />} />
        <Route path="/cart" element={<CartPage />} />
        <Route path="/checkout" element={<CheckoutPage />} />
        <Route path="/privacy-policy" element={<CmsPage slug="privacy-policy" />} />
        <Route path="/terms-and-conditions" element={<CmsPage slug="terms-and-conditions" />} />
        <Route path="/shipping-returns" element={<CmsPage slug="shipping-returns" />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Layout>
  );
};

export default function App() {
  return (
    <MotionConfig reducedMotion="user">
      <StoreProvider>
        <BrowserRouter>
          <ScrollToTop />
          <AppRoutes />
        </BrowserRouter>
      </StoreProvider>
    </MotionConfig>
  );
}
