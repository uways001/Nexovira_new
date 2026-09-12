import React, { useState, useEffect } from 'react';
import { 
  Product, 
  Category,
  CategoryId, 
  UserRole, 
  CartItem, 
  Order, 
  HomepageSection,
  ActiveEcosystemView,
  CurrencyCode 
} from './types';
import { 
  PRODUCTS, 
  CATEGORIES, 
  STORES, 
  DEFAULT_HOMEPAGE_SECTIONS,
  INITIAL_BRAND_SETTINGS 
} from './data/mockData';
import { Header } from './components/Header';
import { HeroAISearch } from './components/HeroAISearch';
import { EcosystemCards } from './components/EcosystemCards';
import { TechServicesView } from './components/TechServicesView';
import { AcademyView } from './components/AcademyView';
import { DigitalLibraryView } from './components/DigitalLibraryView';
import { NexoAIWorkspace } from './components/NexoAIWorkspace';
import { AffiliatePortalView } from './components/AffiliatePortalView';
import { ProductCard } from './components/ProductCard';
import { AIAssistantModal } from './components/AIAssistantModal';
import { ProductDetailModal } from './components/ProductDetailModal';
import { ProductCompareModal } from './components/ProductCompareModal';
import { SellerDashboardView } from './components/SellerDashboardView';
import { AdminDashboardView } from './components/AdminDashboardView';
import { CustomerAccountView } from './components/CustomerAccountView';
import { VerifiedExpertDashboardView } from './components/VerifiedExpertDashboardView';
import { SignInView } from './components/SignInView';
import { SignUpView } from './components/SignUpView';
import { 
  getProductsFromFirestore, 
  getCategoriesFromFirestore,
  getUserWishlistFromFirestore, 
  toggleWishlistInFirestore,
  recordAffiliateClickInFirestore,
  subscribeToProducts,
  subscribeToCategories,
  subscribeToUserWishlist
} from './lib/firestoreService';
import { isAllowedDestinationPath } from './lib/domainConfig';
import { AboutView } from './components/AboutView';
import { PrivacyView } from './components/PrivacyView';
import { TermsView } from './components/TermsView';
import { ContactView } from './components/ContactView';
import { EcosystemPresentationView } from './components/EcosystemPresentationView';
import { NotFoundView } from './components/NotFoundView';
import { SEOHead } from './components/SEOHead';
import { AuthDebugDiagnostics } from './components/AuthDebugDiagnostics';
import { CartDrawer } from './components/CartDrawer';
import { CheckoutModal } from './components/CheckoutModal';
import { WhatsAppSupportButton } from './components/WhatsAppSupportButton';
import { Footer } from './components/Footer';
import { formatCurrency } from './lib/currency';
import { 
  detectUserRegionAndCurrencySync, 
  detectUserRegionAndCurrencyAsync, 
  getSavedCurrencyPreference, 
  saveCurrencyPreference, 
  GeoDetectionResult 
} from './lib/geoCurrency';
import { SetPriceAlertModal } from './components/SetPriceAlertModal';
import { GeoCurrencyBanner } from './components/GeoCurrencyBanner';
import { evaluatePriceAlertsAgainstProducts } from './lib/priceAlertService';
import { useAuth } from './context/AuthContext';
import { safeJsonParse } from './lib/safeFetch';
import { 
  Sparkles, 
  ShieldCheck, 
  Zap, 
  ArrowRight, 
  Clock,
  Flame,
  ShieldAlert,
  Lock
} from 'lucide-react';

interface ForbiddenDashboardViewProps {
  requiredRoleName: string;
  onNavigate: (path: string) => void;
}

const ForbiddenDashboardView: React.FC<ForbiddenDashboardViewProps> = ({ requiredRoleName, onNavigate }) => {
  const { user, userProfile, getRoleDashboard, getRoleDashboardTitle } = useAuth();
  const currentRole = userProfile?.role || 'Guest';
  const myDashboardRoute = getRoleDashboard ? getRoleDashboard(userProfile?.role) : '/dashboard/customer';
  const myDashboardTitle = getRoleDashboardTitle ? getRoleDashboardTitle(userProfile?.role) : 'My Dashboard';

  return (
    <div className="min-h-[75vh] flex items-center justify-center p-6 bg-slate-50 dark:bg-[#0B0F17]">
      <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-red-500/30 dark:border-red-500/40 rounded-3xl p-8 text-center space-y-5 shadow-2xl">
        <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 flex items-center justify-center mx-auto">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 text-[11px] font-mono font-bold tracking-wide uppercase">
            HTTP 403 Forbidden Access
          </div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Role Restricted Dashboard
          </h2>
        </div>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
          The <span className="font-bold text-slate-900 dark:text-slate-200">{requiredRoleName}</span> is strictly reserved for authorized {requiredRoleName.toLowerCase()} accounts. 
          {user ? (
            <>
              {' '}Your currently authenticated role is <span className="text-cyan-600 dark:text-cyan-400 font-bold uppercase">{currentRole}</span>.
            </>
          ) : (
            ' You must sign in with an authorized account to access this dashboard.'
          )}
        </p>

        <div className="pt-2 flex flex-col gap-2.5">
          {user ? (
            <button
              onClick={() => onNavigate(myDashboardRoute)}
              className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md cursor-pointer flex items-center justify-center gap-2"
            >
              <span>Go to {myDashboardTitle}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={() => onNavigate('/signin')}
              className="w-full py-3 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md cursor-pointer"
            >
              Sign In to Your Account
            </button>
          )}

          <button
            onClick={() => onNavigate('/')}
            className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
          >
            Return to Marketplace
          </button>
        </div>
      </div>
    </div>
  );
};

function parseRoute(pathname: string): { 
  view: ActiveEcosystemView; 
  categoryId?: CategoryId; 
  productId?: string; 
} {
  const clean = pathname.toLowerCase().split('?')[0].split('#')[0];
  if (clean === '' || clean === '/') return { view: 'home' };
  if (clean === '/marketplace') return { view: 'marketplace' };
  if (clean.startsWith('/category/')) {
    const cat = clean.replace('/category/', '') as CategoryId;
    return { view: 'marketplace', categoryId: cat };
  }
  if (clean.startsWith('/product/')) {
    const pId = pathname.split('/product/')[1]?.split('?')[0]?.split('#')[0];
    return { view: 'marketplace', productId: pId };
  }
  if (clean === '/book-service' || clean === '/services/nigeria' || clean === '/services-nigeria') return { view: 'book-service' };
  if (clean === '/services' || clean.startsWith('/service/')) return { view: 'services' };
  if (
    clean === '/academy' || 
    clean.startsWith('/course/') || 
    clean === '/scholarship' || 
    clean === '/scholarships' || 
    clean === '/payment/callback' || 
    clean === '/callback' ||
    clean === '/payment-callback'
  ) return { view: 'academy' };
  if (clean === '/library' || clean.startsWith('/ebook/')) return { view: 'library' };
  if (clean === '/ai') return { view: 'ai' };
  if (clean === '/dashboard/customer' || clean === '/account') return { view: 'dashboard-customer' };
  if (clean === '/dashboard/seller' || clean === '/seller') return { view: 'dashboard-seller' };
  if (clean === '/dashboard/affiliate' || clean === '/affiliate') return { view: 'dashboard-affiliate' };
  if (clean === '/dashboard/verified-expert' || clean === '/expert') return { view: 'dashboard-verified-expert' };
  if (clean === '/admin') return { view: 'admin' };
  if (clean === '/signin') return { view: 'signin' };
  if (clean === '/signup') return { view: 'signup' };
  if (clean === '/about') return { view: 'about' };
  if (clean === '/privacy') return { view: 'privacy' };
  if (clean === '/terms') return { view: 'terms' };
  if (clean === '/contact') return { view: 'contact' };
  if (clean === '/presentation' || clean === '/deck' || clean === '/vision' || clean === '/ecosystem') return { view: 'presentation' };
  return { view: '404' };
}

export default function App() {
  const { user, userProfile, isAdmin, isSeller } = useAuth();

  // Navigation & Ecosystem State
  const [activeView, setActiveView] = useState<ActiveEcosystemView>(() => {
    if (typeof window !== 'undefined') {
      return parseRoute(window.location.pathname).view;
    }
    return 'home';
  });

  useEffect(() => {
    const handlePopState = () => {
      const parsed = parseRoute(window.location.pathname);
      if (parsed.categoryId) {
        setSelectedCategory(parsed.categoryId);
      }
      if (parsed.productId) {
        const found = allProducts.find(p => p.id === parsed.productId);
        if (found) setSelectedProduct(found);
      }
      setActiveView(parsed.view);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  
  // Geolocation & Multi-Currency State
  const [currentCurrency, setCurrentCurrency] = useState<CurrencyCode>(() => {
    const saved = getSavedCurrencyPreference();
    if (saved) return saved;
    const syncGeo = detectUserRegionAndCurrencySync();
    return syncGeo.detectedCurrency;
  });
  const [geoInfo, setGeoInfo] = useState<GeoDetectionResult | null>(null);

  // Price Alert Modal State
  const [priceAlertModalProduct, setPriceAlertModalProduct] = useState<Product | null>(null);

  // Auto-Detect User Region and Currency on Mount
  useEffect(() => {
    detectUserRegionAndCurrencyAsync().then((result) => {
      setGeoInfo(result);
      if (result.isAutoApplied && !getSavedCurrencyPreference()) {
        setCurrentCurrency(result.detectedCurrency);
      }
    });
  }, []);

  const handleCurrencyChange = (newCurrency: CurrencyCode) => {
    setCurrentCurrency(newCurrency);
    saveCurrencyPreference(newCurrency);
  };

  const currentRole = userProfile?.role || 'customer';

  // Products Data State
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<CategoryId | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals & Prompts
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const [aiInitialQuery, setAiInitialQuery] = useState('');

  // Wishlist State & Sync
  const [wishlist, setWishlist] = useState<string[]>([]);

  // Capture Affiliate Ref Code & Deep Links from URL with 30-Day Expiration & Security Validation
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    let ref = urlParams.get('ref') || urlParams.get('aff');
    const linkId = urlParams.get('linkId') || undefined;
    const target = urlParams.get('target');
    const pathname = window.location.pathname;

    if (pathname.startsWith('/ref/')) {
      const parts = pathname.replace('/ref/', '').split('/');
      ref = parts[0].split('?')[0];
    }

    if (ref) {
      const cleanRef = ref.trim().toUpperCase();
      const now = Date.now();
      const expiresAt = now + 30 * 24 * 60 * 60 * 1000; // 30 Days

      sessionStorage.setItem('nexovira_ref_code', cleanRef);
      localStorage.setItem('nexovira_ref_code', cleanRef);
      localStorage.setItem('nexovira_ref_expires_at', expiresAt.toString());
      if (linkId) {
        sessionStorage.setItem('nexovira_ref_link_id', linkId);
        localStorage.setItem('nexovira_ref_link_id', linkId);
      }
      document.cookie = `nexovira_ref_code=${cleanRef}; path=/; max-age=${30 * 24 * 3600}; SameSite=Lax`;

      recordAffiliateClickInFirestore(cleanRef, undefined, target || pathname, linkId).catch(console.error);

      // Validate target path before redirecting (prevent open redirect attacks)
      if (target && isAllowedDestinationPath(target)) {
        handleNavigate(target);
      }
    }
  }, []);

  // Load Wishlist from localStorage and Firestore
  useEffect(() => {
    const savedWishlist = localStorage.getItem('nexovira_wishlist');
    if (savedWishlist) {
      try {
        const parsed = safeJsonParse<string[]>(savedWishlist, []);
        setWishlist(parsed);
      } catch (e) {}
    }
  }, []);

  useEffect(() => {
    if (user?.uid) {
      // Subscribe to user's remote wishlist in real-time
      const unsubscribe = subscribeToUserWishlist(user.uid, (remoteWishlist) => {
        if (remoteWishlist) {
          setWishlist(remoteWishlist);
          localStorage.setItem('nexovira_wishlist', JSON.stringify(remoteWishlist));
        }
      });
      return () => {
        unsubscribe();
      };
    }
  }, [user]);

  const handleToggleWishlist = async (product: Product, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const exists = wishlist.includes(product.id);
    const updated = exists 
      ? wishlist.filter(id => id !== product.id)
      : [...wishlist, product.id];
    
    setWishlist(updated);
    localStorage.setItem('nexovira_wishlist', JSON.stringify(updated));

    if (user?.uid) {
      try {
        await toggleWishlistInFirestore(user.uid, product.id, wishlist);
      } catch (err) {
        console.error('Wishlist sync error:', err);
      }
    }
  };

  // Product Comparison Matrix
  const [comparedProducts, setComparedProducts] = useState<Product[]>([]);
  const [isCompareModalOpen, setIsCompareModalOpen] = useState(false);

  // Cart & Checkout
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

  // Homepage Builder Layout
  const [homepageSections, setHomepageSections] = useState<HomepageSection[]>(DEFAULT_HOMEPAGE_SECTIONS);

  // Real-time synchronization across all domains, sites, and accounts
  useEffect(() => {
    // 1. Subscribe to Firestore products in real-time
    const unsubProducts = subscribeToProducts((liveProds) => {
      if (liveProds) {
        setAllProducts(liveProds);
        evaluatePriceAlertsAgainstProducts(liveProds).catch(console.error);
      }
    });

    // 2. Subscribe to Firestore categories in real-time
    const unsubCategories = subscribeToCategories((liveCats) => {
      if (liveCats) {
        setCategories(liveCats);
      }
    });

    // 3. Fallback/Optimistic event listener for fast local actions
    const handleProductsChanged = async () => {
      try {
        const [liveProds, liveCats] = await Promise.all([
          getProductsFromFirestore(),
          getCategoriesFromFirestore()
        ]);
        if (liveProds) setAllProducts(liveProds);
        if (liveCats) setCategories(liveCats);
      } catch (err) {
        console.error('Sync refresh error:', err);
      }
    };
    window.addEventListener('nexovira:products-changed', handleProductsChanged);

    // 4. Cross-tab & Multi-domain Storage Synchronization (cart, wishlist, currencies)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'nexovira_cart' && e.newValue) {
        try {
          const parsed = safeJsonParse<CartItem[]>(e.newValue, []);
          setCartItems(parsed);
        } catch (err) {}
      }
      if (e.key === 'nexovira_wishlist' && e.newValue) {
        try {
          const parsed = safeJsonParse<string[]>(e.newValue, []);
          setWishlist(parsed);
        } catch (err) {}
      }
    };
    window.addEventListener('storage', handleStorageChange);

    const savedCart = localStorage.getItem('nexovira_cart');
    if (savedCart) {
      try {
        const parsed = safeJsonParse<CartItem[]>(savedCart, []);
        setCartItems(parsed);
      } catch (e) {}
    }

    return () => {
      unsubProducts();
      unsubCategories();
      window.removeEventListener('nexovira:products-changed', handleProductsChanged);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // Save Cart to localStorage
  useEffect(() => {
    localStorage.setItem('nexovira_cart', JSON.stringify(cartItems));
  }, [cartItems]);

  // Theme Syncing
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  // Remove handleRoleChange as portal switcher is removed

  // Route Navigation Handler
  const handleNavigate = (path: string) => {
    window.history.pushState({}, '', path);
    const parsed = parseRoute(path);
    if (parsed.categoryId) {
      setSelectedCategory(parsed.categoryId);
    }
    if (parsed.productId) {
      const found = allProducts.find(p => p.id === parsed.productId);
      if (found) setSelectedProduct(found);
    }
    setActiveView(parsed.view);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Cart Actions
  const handleAddToCart = (product: Product, quantity: number = 1, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setCartItems((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + quantity } : item
        );
      }
      return [...prev, { product, quantity }];
    });
    setIsCartOpen(true);
  };

  const handleUpdateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      handleRemoveFromCart(productId);
      return;
    }
    setCartItems((prev) =>
      prev.map((item) => (item.product.id === productId ? { ...item, quantity } : item))
    );
  };

  const handleRemoveFromCart = (productId: string) => {
    setCartItems((prev) => prev.filter((item) => item.product.id !== productId));
  };

  // Compare Actions
  const handleToggleCompare = (product: Product, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setComparedProducts((prev) => {
      const exists = prev.some((p) => p.id === product.id);
      if (exists) {
        return prev.filter((p) => p.id !== product.id);
      }
      if (prev.length >= 3) {
        alert('You can compare up to 3 products at a time.');
        return prev;
      }
      return [...prev, product];
    });
  };

  const handleOpenAIWithQuery = (queryText?: string) => {
    if (queryText) {
      setAiInitialQuery(queryText);
      setActiveView('ai');
    } else {
      setIsAIModalOpen(true);
    }
  };

  const flashDeals = allProducts.filter((p) => p.isFlashDeal);

  return (
    <div className={`min-h-screen flex flex-col font-sans transition-colors duration-200 ${theme === 'dark' ? 'bg-[#0B0F17] text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      
      {/* Dynamic SEO Meta & Schema Head */}
      <SEOHead 
        currentPath={typeof window !== 'undefined' ? window.location.pathname : '/'} 
        selectedProduct={selectedProduct} 
        products={allProducts} 
      />

      {/* Global Header */}
      <Header
        activeView={activeView}
        setActiveView={setActiveView}
        onNavigate={handleNavigate}
        cartCount={cartItems.reduce((acc, item) => acc + item.quantity, 0)}
        wishlistCount={0}
        onOpenCart={() => setIsCartOpen(true)}
        onOpenAI={handleOpenAIWithQuery}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        selectedCategory={selectedCategory}
        setSelectedCategory={setSelectedCategory}
        categories={categories}
        theme={theme}
        setTheme={setTheme}
        currentCurrency={currentCurrency}
        onCurrencyChange={handleCurrencyChange}
        whatsappPhone={INITIAL_BRAND_SETTINGS.whatsappPhone}
      />

      {/* Main Content View Switcher across 6 Ecosystems */}
      <main className="flex-1">
        {activeView === 'book-service' ? (
          <TechServicesView 
            currentCurrency={currentCurrency} 
            initialTab="book-service"
            onNavigateToNigeriaHub={() => handleNavigate('/book-service')}
            onNavigateToAdminDashboard={() => handleNavigate('/admin')}
            onNavigateHome={() => handleNavigate('/')}
          />
        ) : activeView === 'services' ? (
          <TechServicesView 
            currentCurrency={currentCurrency} 
            initialTab="overview"
            onNavigateToNigeriaHub={() => handleNavigate('/book-service')}
            onNavigateToAdminDashboard={() => handleNavigate('/admin')}
            onNavigateHome={() => handleNavigate('/')}
          />
        ) : activeView === 'academy' ? (
          <AcademyView currentCurrency={currentCurrency} />
        ) : activeView === 'library' ? (
          <DigitalLibraryView currentCurrency={currentCurrency} />
        ) : activeView === 'ai' ? (
          <NexoAIWorkspace
            initialPrompt={aiInitialQuery}
            currentCurrency={currentCurrency}
            onAddToCart={handleAddToCart}
            onNavigateToView={(v: any) => setActiveView(v)}
          />
        ) : (activeView === 'dashboard-affiliate' || activeView === 'affiliate') ? (
          /* Role Protected Affiliate Dashboard */
          (userProfile?.role === 'affiliate' || userProfile?.isAffiliate || isAdmin) ? (
            <AffiliatePortalView currentCurrency={currentCurrency} onNavigate={handleNavigate} />
          ) : (
            <ForbiddenDashboardView requiredRoleName="Affiliate Dashboard" onNavigate={handleNavigate} />
          )
        ) : (activeView === 'dashboard-seller' || activeView === 'seller') ? (
          /* Role Protected Seller Dashboard */
          (userProfile?.role === 'seller' || isAdmin || isSeller) ? (
            <SellerDashboardView
              onAddProduct={(newProd) => setAllProducts([newProd, ...allProducts])}
              sellerId={userProfile?.uid || user?.uid}
              sellerName={userProfile?.displayName || (userProfile as any)?.storeName || user?.displayName}
              onNavigate={handleNavigate}
            />
          ) : (
            <ForbiddenDashboardView requiredRoleName="Seller Dashboard" onNavigate={handleNavigate} />
          )
        ) : activeView === 'dashboard-verified-expert' ? (
          /* Role Protected Verified Expert Dashboard */
          (userProfile?.role === 'verified_expert_pending' || 
           userProfile?.role === 'verified_expert_approved' || 
           userProfile?.role === 'verified_expert_rejected' || 
           userProfile?.role === 'expert' || 
           isAdmin) ? (
            <VerifiedExpertDashboardView currentCurrency={currentCurrency} onNavigate={handleNavigate} />
          ) : (
            <ForbiddenDashboardView requiredRoleName="Verified Expert Dashboard" onNavigate={handleNavigate} />
          )
        ) : activeView === 'admin' ? (
          /* Role Protected Admin Center */
          (userProfile?.role === 'admin' || userProfile?.role === 'super_admin' || userProfile?.role === 'management' || isAdmin) ? (
            <AdminDashboardView
              homepageSections={homepageSections}
              setHomepageSections={setHomepageSections}
            />
          ) : (
            <ForbiddenDashboardView requiredRoleName="Admin Command Center" onNavigate={handleNavigate} />
          )
        ) : (activeView === 'dashboard-customer' || activeView === 'account') ? (
          <CustomerAccountView onNavigate={handleNavigate} currentCurrency={currentCurrency} />
        ) : activeView === 'signin' ? (
          <SignInView onNavigate={handleNavigate} />
        ) : activeView === 'signup' ? (
          <SignUpView onNavigate={handleNavigate} />
        ) : activeView === 'about' ? (
          <AboutView onNavigate={handleNavigate} />
        ) : activeView === 'privacy' ? (
          <PrivacyView />
        ) : activeView === 'terms' ? (
          <TermsView />
        ) : activeView === 'contact' ? (
          <ContactView />
        ) : activeView === '404' ? (
          <NotFoundView onNavigate={handleNavigate} />
        ) : activeView === 'presentation' ? (
          <EcosystemPresentationView onNavigate={handleNavigate} onOpenMarketplace={() => handleNavigate('/marketplace')} />
        ) : (
          /* Home & Marketplace Ecosystem View */
          <div className="space-y-8 pb-16">
            
            {/* Hero AI Search Section */}
            {homepageSections.find((s) => s.type === 'hero')?.enabled && (
              <HeroAISearch
                onOpenAI={handleOpenAIWithQuery}
                onNavigate={setActiveView}
                currentCurrency={currentCurrency}
                whatsappPhone={INITIAL_BRAND_SETTINGS.whatsappPhone}
              />
            )}

            {/* Six Ecosystem Visual Cards */}
            {homepageSections.find((s) => s.type === 'ecosystem-cards')?.enabled && (
              <EcosystemCards onNavigate={setActiveView} productCount={allProducts.length} />
            )}

            {/* Category Grid */}
            {homepageSections.find((s) => s.type === 'categories')?.enabled && (
              <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-left">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                      Appliance & Electronics Categories
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Direct manufacturer inventory categorized for smart homes
                    </p>
                  </div>

                  <button
                    onClick={() => { setSelectedCategory('all'); }}
                    className="text-xs font-bold text-cyan-500 hover:underline flex items-center gap-1"
                  >
                    <span>View All Categories</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  {(categories.length > 0 ? categories : CATEGORIES).map((cat) => {
                    const count = allProducts.filter((p) => p.categoryId === cat.id).length;
                    return (
                      <button
                        key={cat.id}
                        onClick={() => {
                          setSelectedCategory(cat.id);
                          setActiveView('marketplace');
                        }}
                        className={`p-4 rounded-2xl border text-left transition-all duration-200 group ${
                          selectedCategory === cat.id
                            ? 'bg-cyan-500/10 border-cyan-500 shadow-md ring-2 ring-cyan-500/30'
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-cyan-500/50'
                        }`}
                      >
                        <div className="text-xs font-bold text-slate-900 dark:text-slate-100 group-hover:text-cyan-500 transition-colors">
                          {cat.name}
                        </div>
                        <span className="text-[10px] text-slate-500 mt-1 block font-mono">
                          {count} {count === 1 ? 'Product' : 'Products'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Flash Deals Carousel */}
            {homepageSections.find((s) => s.type === 'flash-deals')?.enabled && flashDeals.length > 0 && (
              <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-left">
                <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-red-950 via-slate-900 to-slate-950 border border-red-900/50 shadow-2xl relative overflow-hidden">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-red-600 rounded-2xl text-white shadow-lg">
                        <Flame className="w-6 h-6 fill-current animate-bounce" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="text-xl sm:text-2xl font-black text-white">NEXOVIRA Flash Deals</h2>
                          <span className="bg-red-500/20 text-red-400 border border-red-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                            Limited Stock
                          </span>
                        </div>
                        <p className="text-xs text-slate-400">Up to 25% off inverter air conditioners & 4K OLED displays</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-xs font-mono font-bold bg-slate-900/80 px-4 py-2 rounded-xl border border-red-900/40 text-red-400 shrink-0">
                      <Clock className="w-4 h-4 text-red-500 animate-spin-slow" />
                      <span>Ends in 08h : 42m : 19s</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {flashDeals.map((prod) => (
                      <ProductCard
                        key={prod.id}
                        product={prod}
                        onSelectProduct={(p) => setSelectedProduct(p)}
                        onAddToCart={(p, e) => handleAddToCart(p, 1, e)}
                        onAskAI={(p, e) => {
                          e.stopPropagation();
                          handleOpenAIWithQuery(`Explain specifications for ${p.title}`);
                        }}
                        onToggleCompare={handleToggleCompare}
                        onToggleWishlist={handleToggleWishlist}
                        isCompared={comparedProducts.some((cp) => cp.id === prod.id)}
                        isInWishlist={wishlist.includes(prod.id)}
                      />
                    ))}
                  </div>
                </div>
              </section>
            )}

          </div>
        )}
      </main>

      {/* Floating WhatsApp Support Widget */}
      <WhatsAppSupportButton whatsappNumber={INITIAL_BRAND_SETTINGS.whatsappPhone} variant="floating" />

      {/* Geolocation Auto-Detection Currency Toast / Banner */}
      <GeoCurrencyBanner
        currentCurrency={currentCurrency}
        geoInfo={geoInfo}
        onCurrencyChange={handleCurrencyChange}
      />

      {/* Global Footer */}
      <Footer
        onSelectCategory={(cat) => {
          setSelectedCategory(cat);
          setActiveView('marketplace');
        }}
        onOpenAI={() => handleOpenAIWithQuery()}
        onNavigate={handleNavigate}
        currentCurrency={currentCurrency}
      />

      {/* Modals & Drawers */}
      <AIAssistantModal
        isOpen={isAIModalOpen}
        onClose={() => setIsAIModalOpen(false)}
        initialQuery={aiInitialQuery}
        onSelectProduct={(p) => setSelectedProduct(p)}
        onAddToCart={(p) => handleAddToCart(p, 1)}
        onCompareProduct={(p) => handleToggleCompare(p)}
      />

      <ProductDetailModal
        product={selectedProduct}
        onClose={() => setSelectedProduct(null)}
        onAddToCart={(p, qty) => handleAddToCart(p, qty)}
        onAskAI={(q) => handleOpenAIWithQuery(q)}
        onCompare={(p) => handleToggleCompare(p)}
        onToggleWishlist={handleToggleWishlist}
        onSetPriceAlert={(p) => setPriceAlertModalProduct(p)}
        onProductUpdated={(updatedProd) => {
          setAllProducts((prev) =>
            prev.map((p) => (p.id === updatedProd.id ? { ...p, rating: updatedProd.rating, reviewCount: updatedProd.reviewCount } : p))
          );
          if (selectedProduct?.id === updatedProd.id) {
            setSelectedProduct((prev) => (prev ? { ...prev, rating: updatedProd.rating, reviewCount: updatedProd.reviewCount } : null));
          }
        }}
        onSignInRequested={() => {
          setSelectedProduct(null);
          handleNavigate('/signin');
        }}
        currentCurrency={currentCurrency}
        isInWishlist={selectedProduct ? wishlist.includes(selectedProduct.id) : false}
      />

      {/* Target Price Alert Setup Modal */}
      {priceAlertModalProduct && (
        <SetPriceAlertModal
          isOpen={Boolean(priceAlertModalProduct)}
          onClose={() => setPriceAlertModalProduct(null)}
          product={priceAlertModalProduct}
          currentCurrency={currentCurrency}
          onSignInRequired={() => {
            setPriceAlertModalProduct(null);
            handleNavigate('/signin');
          }}
        />
      )}

      <ProductCompareModal
        products={comparedProducts}
        onClose={() => setIsCompareModalOpen(false)}
        onRemoveProduct={(id) => setComparedProducts((prev) => prev.filter((p) => p.id !== id))}
        onAddToCart={(p) => handleAddToCart(p, 1)}
        onAskAI={(q) => handleOpenAIWithQuery(q)}
      />

      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cartItems={cartItems}
        onUpdateQuantity={handleUpdateQuantity}
        onRemoveItem={handleRemoveFromCart}
        onProceedToCheckout={() => {
          setIsCartOpen(false);
          setIsCheckoutOpen(true);
        }}
        currentCurrency={currentCurrency}
      />

      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        cartItems={cartItems}
        currentCurrency={currentCurrency}
        onOrderSuccess={(ord) => {
          setCartItems([]);
          setActiveView('account');
        }}
      />

      {/* Live Auth State Inspector Diagnostics (Dev Only) */}
      {import.meta.env.DEV && <AuthDebugDiagnostics activeView={activeView} />}

    </div>
  );
}
