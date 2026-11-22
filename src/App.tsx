import { useMemo, useState } from 'react';
import { ArrowUpRight, Check, Search, ShieldCheck, Truck } from 'lucide-react';
import {
  BUNDLE_ITEMS,
  type Product,
  type ProductCategory,
} from './data/products';
import { useStoreData } from './hooks/useStoreData';
import { Navbar } from './components/Navbar';
import { ResilientImage } from './components/ResilientImage';
import { ProductDetailModal } from './components/ProductDetailModal';
import { CartDrawer, type CartItem } from './components/CartDrawer';
import { AdminConsole } from './components/AdminConsole';
import { MyOrdersModal } from './components/MyOrdersModal';

type CategoryFilter = 'All' | ProductCategory;
type SortOption = 'featured' | 'price-asc' | 'price-desc';

const CATEGORY_TABS: CategoryFilter[] = [
  'All',
  'Car Showpieces',
  'Desk Gadgets',
  'Collectibles',
];

export default function App() {
  const {
    user,
    isAdmin,
    products,
    hasCloudProducts,
    storeConfig,
    hasCloudConfig,
    orders,
    signInWithGoogle,
    signOutUser,
    seedInitialStoreData,
    saveProduct,
    deleteProduct,
    saveStoreConfig,
    placeOrder,
    updateOrderStatus,
  } = useStoreData();

  const [viewMode, setViewMode] = useState<'storefront' | 'admin'>('storefront');
  const [ordersModalOpen, setOrdersModalOpen] = useState(false);

  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('featured');
  const [activeProduct, setActiveProduct] = useState<Product | null>(null);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [cartInitialStep, setCartInitialStep] = useState<'bag' | 'checkout'>('bag');
  const [recentlyAddedId, setRecentlyAddedId] = useState<string | null>(null);

  const totalBagCount = useMemo(
    () => cartItems.reduce((sum, item) => sum + item.quantity, 0),
    [cartItems]
  );

  const heroFeaturedProduct = useMemo(() => {
    return (
      products.find((p) => p.id === storeConfig.heroProductId) ?? products[0]
    );
  }, [products, storeConfig.heroProductId]);

  const filteredProducts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const filtered = products.filter((product) => {
      const matchesCategory =
        selectedCategory === 'All' || product.category === selectedCategory;
      const matchesSearch =
        !query ||
        product.name.toLowerCase().includes(query) ||
        product.shortDescription.toLowerCase().includes(query) ||
        product.category.toLowerCase().includes(query);
      return matchesCategory && matchesSearch;
    });

    if (sortBy === 'price-asc') {
      return [...filtered].sort((a, b) => a.price - b.price);
    }
    if (sortBy === 'price-desc') {
      return [...filtered].sort((a, b) => b.price - a.price);
    }
    return filtered;
  }, [products, selectedCategory, searchQuery, sortBy]);

  const bundleProducts = useMemo(() => {
    return products.filter((p) =>
      BUNDLE_ITEMS.includes(p.id as (typeof BUNDLE_ITEMS)[number])
    );
  }, [products]);

  const bundleOriginalSum = useMemo(
    () => bundleProducts.reduce((sum, p) => sum + p.price, 0),
    [bundleProducts]
  );
  const bundleFinalPrice = Math.max(
    0,
    bundleOriginalSum - storeConfig.bundleDiscountAmount
  );

  const handleAddToCart = (
    product: Product,
    variant: string,
    quantity: number = 1
  ) => {
    setCartItems((prev) => {
      const existingIndex = prev.findIndex(
        (item) => item.product.id === product.id && item.variant === variant
      );
      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: updated[existingIndex].quantity + quantity,
        };
        return updated;
      }
      return [...prev, { product, variant, quantity }];
    });

    setRecentlyAddedId(product.id);
    window.setTimeout(() => {
      setRecentlyAddedId((current) => (current === product.id ? null : current));
    }, 1200);
  };

  const handleBuyNow = (
    product: Product,
    variant: string,
    quantity: number = 1
  ) => {
    handleAddToCart(product, variant, quantity);
    setCartInitialStep('checkout');
    setCartOpen(true);
  };

  const handleOpenHeroPromo = () => {
    if (heroFeaturedProduct) {
      setActiveProduct(heroFeaturedProduct);
    }
  };

  const handleAddTrioBundle = () => {
    bundleProducts.forEach((product) => {
      handleAddToCart(product, product.variants[0], 1);
    });
    setCartInitialStep('bag');
    setCartOpen(true);
  };

  const handleUpdateQuantity = (
    productId: string,
    variant: string,
    delta: number
  ) => {
    setCartItems((prev) =>
      prev
        .map((item) => {
          if (item.product.id === productId && item.variant === variant) {
            return { ...item, quantity: item.quantity + delta };
          }
          return item;
        })
        .filter((item) => item.quantity > 0)
    );
  };

  const handleRemoveItem = (productId: string, variant: string) => {
    setCartItems((prev) =>
      prev.filter(
        (item) => !(item.product.id === productId && item.variant === variant)
      )
    );
  };

  const scrollToCatalog = () => {
    const el = document.getElementById('catalog');
    el?.scrollIntoView({ behavior: 'smooth' });
  };

  if (viewMode === 'admin') {
    return (
      <AdminConsole
        user={user}
        isAdmin={isAdmin}
        products={products}
        hasCloudProducts={hasCloudProducts}
        hasCloudConfig={hasCloudConfig}
        storeConfig={storeConfig}
        orders={orders}
        onBackToStore={() => setViewMode('storefront')}
        onSignIn={signInWithGoogle}
        onSignOut={signOutUser}
        onSeedCloud={seedInitialStoreData}
        onSaveProduct={saveProduct}
        onDeleteProduct={deleteProduct}
        onSaveConfig={saveStoreConfig}
        onUpdateOrderStatus={updateOrderStatus}
      />
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-zinc-50 text-zinc-950">
      <Navbar
        brandName={storeConfig.brandName}
        marqueeText={storeConfig.marqueeText}
        cartCount={totalBagCount}
        onOpenCart={() => {
          setCartInitialStep('bag');
          setCartOpen(true);
        }}
        onSelectCategory={setSelectedCategory}
        onBuyHotWheels={handleOpenHeroPromo}
        onOpenAdmin={() => setViewMode('admin')}
      />

      <main className="flex-1">
        {/* Section 1: First-Page Featured Promotion Hero Showcase */}
        <section className="bg-zinc-950 text-white border-b border-zinc-800">
          <div className="max-w-[1200px] mx-auto px-6 py-12 sm:py-16 lg:py-20">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-stretch">
              <div className="lg:col-span-6 flex flex-col justify-between py-1">
                <div>
                  <p className="text-xs font-mono font-medium uppercase tracking-wider text-[#EBFC68] mb-4">
                    {storeConfig.heroEyebrow}
                  </p>
                  <h1 className="font-display text-[clamp(2.5rem,4.4vw,4.1rem)] font-extrabold uppercase tracking-tight leading-[0.98] text-white [text-wrap:balance]">
                    {storeConfig.heroTitle}
                  </h1>
                  <p className="mt-5 text-base sm:text-lg text-zinc-300 leading-relaxed max-w-xl">
                    {storeConfig.heroSubtitle}
                  </p>
                </div>

                <div className="mt-9 flex flex-wrap items-center gap-4">
                  <button
                    type="button"
                    onClick={handleOpenHeroPromo}
                    className="inline-flex items-center justify-center gap-2 px-6 py-3.5 min-h-[44px] text-sm font-semibold text-zinc-950 bg-[#EBFC68] hover:bg-[#e1f645] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <span>
                      {storeConfig.heroCtaLabel}
                      {heroFeaturedProduct
                        ? ` · ₹${heroFeaturedProduct.price.toLocaleString('en-IN')}`
                        : ''}
                    </span>
                    <ArrowUpRight className="w-4 h-4" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={scrollToCatalog}
                    className="inline-flex items-center justify-center px-5 py-3.5 min-h-[44px] text-sm font-medium text-white border border-zinc-700 hover:border-zinc-500 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    Explore All Cars &amp; Gadgets
                  </button>
                </div>

                <div className="mt-10 pt-6 border-t border-zinc-800 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-zinc-400">
                  <span className="inline-flex items-center gap-1.5">
                    <Truck className="w-3.5 h-3.5 text-[#EBFC68]" aria-hidden="true" />
                    <span>
                      Free Shipping above ₹
                      {storeConfig.freeShippingThreshold.toLocaleString('en-IN')}
                    </span>
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#EBFC68]" aria-hidden="true" />
                    <span>
                      {storeConfig.codEnabled ? 'COD & ' : ''}Verified Instant Checkout
                    </span>
                  </span>
                </div>
              </div>

              {/* Clickable Hot Wheels Promotion Visual Hook */}
              <div className="lg:col-span-6">
                <button
                  type="button"
                  onClick={handleOpenHeroPromo}
                  aria-label="Open featured promotion item to buy"
                  className="group relative w-full h-full min-h-[300px] lg:min-h-[430px] rounded-2xl overflow-hidden border border-[#EBFC68]/45 bg-zinc-900 text-left cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#EBFC68]"
                >
                  <ResilientImage
                    src={storeConfig.heroImage}
                    alt={
                      heroFeaturedProduct?.imageAlt ||
                      'Featured die-cast car collection promotion'
                    }
                    fallbackTitle={heroFeaturedProduct?.name || 'Featured Drop'}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-6 flex items-end justify-between gap-4">
                    <div>
                      <p className="font-mono text-xs uppercase tracking-wider text-[#EBFC68]">
                        Featured Promotion · {heroFeaturedProduct?.category}
                      </p>
                      <p className="font-display text-2xl sm:text-3xl font-bold uppercase tracking-tight text-white mt-1">
                        {heroFeaturedProduct?.name}
                      </p>
                      {heroFeaturedProduct && (
                        <p className="font-mono text-sm text-zinc-200 mt-1 tabular-nums">
                          ₹{heroFeaturedProduct.price.toLocaleString('en-IN')}
                          {heroFeaturedProduct.compareAtPrice && (
                            <span className="text-zinc-400 line-through ml-2">
                              ₹
                              {heroFeaturedProduct.compareAtPrice.toLocaleString(
                                'en-IN'
                              )}
                            </span>
                          )}
                        </p>
                      )}
                    </div>
                    <span className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-zinc-950 bg-[#EBFC68] group-hover:bg-[#e1f645] rounded-lg transition-colors whitespace-nowrap shrink-0">
                      <span>Quick Buy</span>
                      <ArrowUpRight className="w-4 h-4" aria-hidden="true" />
                    </span>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Section 2: Featured Product Catalog */}
        <section id="catalog" className="py-16 sm:py-20 bg-white">
          <div className="max-w-[1200px] mx-auto px-6">
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-10">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-[#334FB4] mb-2">
                  Curated Drops
                </p>
                <h2 className="font-display text-3xl sm:text-4xl font-extrabold uppercase tracking-tight text-zinc-950">
                  Shop {storeConfig.brandName} Originals
                </h2>
              </div>

              {/* Search & Sort */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <div className="relative">
                  <Search
                    className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                    aria-hidden="true"
                  />
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search Hot Wheels, cars, gadgets..."
                    aria-label="Search products"
                    className="w-full sm:w-60 pl-9 pr-3 py-2 min-h-[40px] text-sm rounded-lg border border-zinc-200 bg-zinc-50 text-zinc-950 placeholder:text-zinc-400 focus:outline-none focus:border-zinc-950"
                  />
                </div>

                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                  aria-label="Sort products"
                  className="px-3 py-2 min-h-[40px] text-sm font-medium rounded-lg border border-zinc-200 bg-zinc-50 text-zinc-900 focus:outline-none focus:border-zinc-950"
                >
                  <option value="featured">Sort: Featured</option>
                  <option value="price-asc">Price: Low to High</option>
                  <option value="price-desc">Price: High to Low</option>
                </select>
              </div>
            </div>

            {/* Category Filter Segmented Control */}
            <div
              className="inline-flex flex-wrap items-center gap-1 p-1 bg-zinc-100 rounded-lg border border-zinc-200 mb-10"
              role="tablist"
              aria-label="Filter products by category"
            >
              {CATEGORY_TABS.map((category) => {
                const isActive = selectedCategory === category;
                return (
                  <button
                    key={category}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => setSelectedCategory(category)}
                    className={`px-3.5 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      isActive
                        ? 'bg-zinc-950 text-[#EBFC68]'
                        : 'text-zinc-600 hover:text-zinc-950'
                    }`}
                  >
                    {category}
                  </button>
                );
              })}
            </div>

            {/* 3-Column Product Grid */}
            {filteredProducts.length === 0 ? (
              <div className="py-16 text-center rounded-2xl border border-zinc-200 bg-zinc-50">
                <p className="font-display text-xl font-bold uppercase text-zinc-950">
                  No matching items found
                </p>
                <p className="mt-1 text-sm text-zinc-500">
                  Try clearing your search or switching back to all categories.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedCategory('All');
                  }}
                  className="mt-5 px-4 py-2 text-sm font-semibold text-zinc-950 bg-[#EBFC68] rounded-lg cursor-pointer"
                >
                  Reset Filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
                {filteredProducts.map((product) => {
                  const isJustAdded = recentlyAddedId === product.id;
                  return (
                    <article
                      key={product.id}
                      className="group flex flex-col justify-between rounded-2xl border border-zinc-200 bg-zinc-50/70 overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
                    >
                      <div>
                        <button
                          type="button"
                          onClick={() => setActiveProduct(product)}
                          className="w-full block aspect-[4/3] bg-zinc-100 overflow-hidden border-b border-zinc-200 cursor-pointer focus-visible:outline-2 focus-visible:outline-zinc-950"
                        >
                          <ResilientImage
                            src={product.image}
                            alt={product.imageAlt}
                            fallbackTitle={product.name}
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                          />
                        </button>

                        <div className="p-5 sm:p-6">
                          <div className="flex items-center justify-between gap-2 text-xs uppercase tracking-wider text-zinc-500">
                            <span>{product.category}</span>
                            {product.tag && (
                              <span className="font-semibold text-zinc-950">
                                {product.tag}
                              </span>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={() => setActiveProduct(product)}
                            className="mt-2 text-left block w-full cursor-pointer"
                          >
                            <h3 className="font-display text-xl font-bold uppercase tracking-tight text-zinc-950 group-hover:text-[#334FB4] transition-colors">
                              {product.name}
                            </h3>
                          </button>

                          <p className="mt-2 text-sm text-zinc-600 line-clamp-2 leading-relaxed">
                            {product.shortDescription}
                          </p>
                        </div>
                      </div>

                      <div className="px-5 sm:px-6 pb-5 sm:pb-6 pt-1 flex items-center justify-between gap-4">
                        <div className="flex items-baseline gap-2">
                          <span className="font-mono text-[15px] font-bold text-zinc-950 tabular-nums">
                            ₹{product.price.toLocaleString('en-IN')}
                          </span>
                          {product.compareAtPrice && (
                            <span className="font-mono text-xs text-zinc-400 line-through tabular-nums">
                              ₹{product.compareAtPrice.toLocaleString('en-IN')}
                            </span>
                          )}
                        </div>

                        <button
                          type="button"
                          disabled={!product.inStock}
                          onClick={() =>
                            handleAddToCart(product, product.variants[0], 1)
                          }
                          className={`inline-flex items-center justify-center gap-1.5 px-4 py-2 min-h-[40px] text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                            !product.inStock
                              ? 'bg-zinc-200 text-zinc-500 cursor-not-allowed'
                              : isJustAdded
                              ? 'bg-[#EBFC68] text-zinc-950 border border-zinc-950/20 cursor-pointer'
                              : 'bg-zinc-950 text-white hover:bg-zinc-800 cursor-pointer'
                          }`}
                        >
                          {!product.inStock ? (
                            <span>Sold Out</span>
                          ) : isJustAdded ? (
                            <>
                              <Check className="w-3.5 h-3.5" aria-hidden="true" />
                              <span>Added</span>
                            </>
                          ) : (
                            <span>Add to Bag</span>
                          )}
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* Section 3: Craftsmanship Story & Collector's Desk Bundle */}
        <section
          id="craftsmanship"
          className="py-16 sm:py-24 bg-zinc-950 text-white border-t border-zinc-800"
        >
          <div className="max-w-[1200px] mx-auto px-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
              <div className="lg:col-span-6">
                <p className="text-xs font-semibold uppercase tracking-wider text-[#EBFC68] mb-3">
                  Material &amp; Build Standard
                </p>
                <h2 className="font-display text-3xl sm:text-4xl font-extrabold uppercase tracking-tight text-white [text-wrap:balance]">
                  Heavy alloy castings. Zero hollow plastic gimmicks.
                </h2>
                <p className="mt-4 text-base text-zinc-300 leading-relaxed max-w-xl">
                  Every {storeConfig.brandName} showpiece is weight-calibrated
                  with zinc-alloy bodywork, anodized aluminum housings, and
                  sealed stainless bearings—crafted to sit proudly on studio
                  desks and car dashboards for years.
                </p>

                <dl className="mt-8 grid grid-cols-3 gap-6 pt-8 border-t border-zinc-800">
                  <div>
                    <dt className="text-xs text-zinc-400">Die-Cast Alloy</dt>
                    <dd className="mt-1 font-mono text-xl font-bold text-[#EBFC68] tabular-nums">
                      1:18 / 1:64
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-zinc-400">Machined Metal</dt>
                    <dd className="mt-1 font-mono text-xl font-bold text-white tabular-nums">
                      6061-T6
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-zinc-400">Dispatch Time</dt>
                    <dd className="mt-1 font-mono text-xl font-bold text-white tabular-nums">
                      24 Hours
                    </dd>
                  </div>
                </dl>
              </div>

              {bundleProducts.length === 3 && (
                <div className="lg:col-span-6 rounded-2xl border border-zinc-800 bg-zinc-900 p-6 sm:p-8">
                  <div className="flex items-center justify-between gap-4 mb-4">
                    <span className="text-xs font-semibold uppercase tracking-wider text-[#EBFC68]">
                      Curated Desk Trio Bundle
                    </span>
                    <span className="font-mono text-xs text-zinc-400 tabular-nums">
                      Save ₹{storeConfig.bundleDiscountAmount.toLocaleString('en-IN')}
                    </span>
                  </div>

                  <h3 className="font-display text-2xl sm:text-3xl font-bold uppercase tracking-tight text-white">
                    The Complete Collector’s Setup
                  </h3>
                  <p className="mt-2 text-sm text-zinc-300 leading-relaxed">
                    Pair our flagship 1:18 Car Showpiece, Kinetic Balance, and
                    Articulated Mecha Figure in one box.
                  </p>

                  <ul className="mt-6 space-y-2.5 text-sm text-zinc-200 border-t border-zinc-800 pt-5">
                    {bundleProducts.map((bp) => (
                      <li
                        key={bp.id}
                        className="flex items-center justify-between"
                      >
                        <span>{bp.name}</span>
                        <span className="font-mono text-xs text-zinc-400 tabular-nums">
                          ₹{bp.price.toLocaleString('en-IN')}
                        </span>
                      </li>
                    ))}
                  </ul>

                  <div className="mt-6 pt-5 border-t border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <p className="text-xs text-zinc-400">Complete Trio Price</p>
                      <div className="flex items-baseline gap-2.5">
                        <span className="font-mono text-2xl font-bold text-[#EBFC68] tabular-nums">
                          ₹{bundleFinalPrice.toLocaleString('en-IN')}
                        </span>
                        <span className="font-mono text-sm text-zinc-500 line-through tabular-nums">
                          ₹{bundleOriginalSum.toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleAddTrioBundle}
                      className="inline-flex items-center justify-center gap-2 px-5 py-3 min-h-[44px] text-sm font-semibold text-zinc-950 bg-[#EBFC68] hover:bg-[#e1f645] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      <span>Add Trio to Bag</span>
                      <ArrowUpRight className="w-4 h-4" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      </main>

      {/* Section 4: Quiet Storefront Footer */}
      <footer className="bg-white border-t border-zinc-200 py-10">
        <div className="max-w-[1200px] mx-auto px-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div>
            <p className="font-display text-xl font-extrabold uppercase tracking-[0.06em] text-zinc-950">
              {storeConfig.brandName}
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              © 2026 {storeConfig.brandName} Collectibles &amp; Gadgets ·{' '}
              {storeConfig.supportEmail}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-6 text-xs font-medium text-zinc-600">
            <button
              type="button"
              onClick={handleOpenHeroPromo}
              className="hover:text-zinc-950 transition-colors cursor-pointer"
            >
              Featured Drop
            </button>
            <button
              type="button"
              onClick={() => setOrdersModalOpen(true)}
              className="hover:text-zinc-950 transition-colors cursor-pointer"
            >
              {user ? 'My Orders' : 'Sign In / Orders'}
            </button>
            <button
              type="button"
              onClick={() => setViewMode('admin')}
              className="hover:text-zinc-950 transition-colors cursor-pointer"
            >
              Admin Console
            </button>
            <button
              type="button"
              onClick={() => {
                setCartInitialStep('bag');
                setCartOpen(true);
              }}
              className="hover:text-zinc-950 transition-colors cursor-pointer"
            >
              Shopping Bag ({totalBagCount})
            </button>
          </div>
        </div>
      </footer>

      <ProductDetailModal
        product={activeProduct}
        onClose={() => setActiveProduct(null)}
        onAddToCart={handleAddToCart}
        onBuyNow={handleBuyNow}
      />

      <CartDrawer
        isOpen={cartOpen}
        initialStep={cartInitialStep}
        items={cartItems}
        storeConfig={storeConfig}
        user={user}
        onSignIn={signInWithGoogle}
        onPlaceOrder={placeOrder}
        onClose={() => setCartOpen(false)}
        onUpdateQuantity={handleUpdateQuantity}
        onRemoveItem={handleRemoveItem}
        onClearCart={() => setCartItems([])}
      />

      <MyOrdersModal
        isOpen={ordersModalOpen}
        user={user}
        orders={orders}
        onClose={() => setOrdersModalOpen(false)}
        onSignIn={signInWithGoogle}
        onSignOut={signOutUser}
      />
    </div>
  );
}
