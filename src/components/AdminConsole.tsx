import { useEffect, useMemo, useState, type FormEvent } from 'react';
import type { User } from 'firebase/auth';
import {
  ArrowLeft,
  CheckCircle2,
  CreditCard,
  LayoutDashboard,
  LogOut,
  Package,
  Plus,
  Search,
  Settings,
  ShieldAlert,
  ShoppingCart,
  Trash2,
  X,
} from 'lucide-react';
import {
  isSafeMediaUrl,
  STUDIO_IMAGE_PRESETS,
  type OrderRecord,
  type OrderStatus,
  type Product,
  type ProductCategory,
  type StoreConfig,
} from '../data/products';
import type { ProductInput } from '../hooks/useStoreData';
import { ROOT_ADMIN_EMAIL } from '../firebase';
import { ResilientImage } from './ResilientImage';

type AdminTab = 'overview' | 'products' | 'payments' | 'storefront' | 'orders';

interface AdminConsoleProps {
  user: User | null;
  isAdmin: boolean;
  products: Product[];
  hasCloudProducts: boolean;
  hasCloudConfig: boolean;
  storeConfig: StoreConfig;
  orders: OrderRecord[];
  onBackToStore: () => void;
  onSignIn: () => Promise<void>;
  onSignOut: () => Promise<void>;
  onSeedCloud: () => Promise<void>;
  onSaveProduct: (input: ProductInput) => Promise<void>;
  onDeleteProduct: (productId: string) => Promise<void>;
  onSaveConfig: (config: StoreConfig) => Promise<void>;
  onUpdateOrderStatus: (orderId: string, status: OrderStatus) => Promise<void>;
}

const EMPTY_PRODUCT_FORM: ProductInput = {
  name: '',
  category: 'Car Showpieces',
  price: 1999,
  compareAtPrice: undefined,
  tag: 'New Drop',
  image: STUDIO_IMAGE_PRESETS[0].url,
  imageAlt: '',
  shortDescription: '',
  description: '',
  variants: ['Standard Edition'],
  material: 'Die-Cast Metal & ABS',
  dimensions: '18.0 × 8.5 × 5.5 cm',
  weight: '450 g',
  scaleOrPower: '1:24 Collector Scale',
  inStock: true,
  featured: false,
};

const ORDER_STATUSES: OrderStatus[] = [
  'Confirmed',
  'Packed',
  'Shipped',
  'Delivered',
  'Cancelled',
];

function getStatusBadgeClasses(status: OrderStatus): string {
  switch (status) {
    case 'Delivered':
      return 'text-green-700 bg-green-50 border-green-200';
    case 'Shipped':
    case 'Packed':
      return 'text-amber-700 bg-amber-50 border-amber-200';
    case 'Cancelled':
      return 'text-red-700 bg-red-50 border-red-200';
    default:
      return 'text-zinc-900 bg-zinc-100 border-zinc-300';
  }
}

export function AdminConsole({
  user,
  isAdmin,
  products,
  hasCloudProducts,
  hasCloudConfig,
  storeConfig,
  orders,
  onBackToStore,
  onSignIn,
  onSignOut,
  onSeedCloud,
  onSaveProduct,
  onDeleteProduct,
  onSaveConfig,
  onUpdateOrderStatus,
}: AdminConsoleProps) {
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [productSearch, setProductSearch] = useState('');
  const [orderFilter, setOrderFilter] = useState<'All' | OrderStatus>('All');

  // Product Editor Modal State
  const [editingProduct, setEditingProduct] = useState<ProductInput | null>(null);
  const [variantsText, setVariantsText] = useState('Standard Edition');
  const [productSaving, setProductSaving] = useState(false);
  const [productError, setProductError] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // StoreConfig & Payments Draft State
  const [configDraft, setConfigDraft] = useState<StoreConfig>(storeConfig);
  const [configSaving, setConfigSaving] = useState(false);
  const [configSavedNotice, setConfigSavedNotice] = useState('');
  const [seeding, setSeeding] = useState(false);
  const [authError, setAuthError] = useState('');

  useEffect(() => {
    setConfigDraft(storeConfig);
  }, [storeConfig]);

  const filteredProducts = useMemo(() => {
    const q = productSearch.trim().toLowerCase();
    if (!q) return products;
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
    );
  }, [products, productSearch]);

  const filteredOrders = useMemo(() => {
    if (orderFilter === 'All') return orders;
    return orders.filter((o) => o.status === orderFilter);
  }, [orders, orderFilter]);

  const totalRevenue = useMemo(
    () =>
      orders
        .filter((o) => o.status !== 'Cancelled')
        .reduce((sum, o) => sum + o.total, 0),
    [orders]
  );

  const enabledGatewayCount = useMemo(() => {
    let count = 0;
    if (storeConfig.codEnabled) count += 1;
    if (storeConfig.upiEnabled) count += 1;
    if (storeConfig.razorpayEnabled) count += 1;
    if (storeConfig.stripeEnabled) count += 1;
    return count;
  }, [storeConfig]);

  const handleOpenNewProduct = () => {
    setProductError('');
    setVariantsText('Standard Edition');
    setEditingProduct({ ...EMPTY_PRODUCT_FORM });
  };

  const handleOpenEditProduct = (p: Product) => {
    setProductError('');
    setVariantsText(p.variants.join(', '));
    setEditingProduct({
      id: p.id,
      name: p.name,
      category: p.category,
      price: p.price,
      compareAtPrice: p.compareAtPrice,
      tag: p.tag ?? '',
      image: p.image,
      imageAlt: p.imageAlt,
      shortDescription: p.shortDescription,
      description: p.description,
      variants: p.variants,
      material: p.specs.material,
      dimensions: p.specs.dimensions,
      weight: p.specs.weight,
      scaleOrPower: p.specs.scaleOrPower,
      inStock: p.inStock,
      featured: Boolean(p.featured),
    });
  };

  const handleSaveProductSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    setProductError('');

    if (editingProduct.name.trim().length < 2) {
      setProductError('Product name must be at least 2 characters.');
      return;
    }
    if (!isSafeMediaUrl(editingProduct.image)) {
      setProductError(
        'Image URL must start with https://, http://, or /src/assets/.'
      );
      return;
    }
    if (editingProduct.shortDescription.trim().length < 4) {
      setProductError('Short description must be at least 4 characters.');
      return;
    }
    if (editingProduct.description.trim().length < 4) {
      setProductError('Full description must be at least 4 characters.');
      return;
    }

    const parsedVariants = variantsText
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    setProductSaving(true);
    try {
      if (!hasCloudProducts || !hasCloudConfig) {
        await onSeedCloud();
      }
      await onSaveProduct({
        ...editingProduct,
        variants: parsedVariants.length > 0 ? parsedVariants : ['Standard Edition'],
      });
      setEditingProduct(null);
    } catch (err) {
      setProductError(
        err instanceof Error ? err.message : 'Unable to save product.'
      );
    } finally {
      setProductSaving(false);
    }
  };

  const handleSaveConfigSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setConfigSaving(true);
    setConfigSavedNotice('');
    try {
      await onSaveConfig(configDraft);
      setConfigSavedNotice('Saved live to storefront.');
      window.setTimeout(() => setConfigSavedNotice(''), 3500);
    } finally {
      setConfigSaving(false);
    }
  };

  const handleSeed = async () => {
    setSeeding(true);
    try {
      await onSeedCloud();
    } finally {
      setSeeding(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setAuthError('');
    try {
      await onSignIn();
    } catch (err) {
      setAuthError(
        err instanceof Error ? err.message : 'Google sign-in was cancelled.'
      );
    }
  };

  // Gate 1: Not Signed In
  if (!user) {
    return (
      <div className="min-h-screen bg-zinc-50 flex flex-col">
        <header className="bg-white border-b border-zinc-200 px-6 h-16 flex items-center justify-between">
          <span className="font-display text-xl font-extrabold uppercase tracking-[0.06em] text-zinc-950">
            TOY TRON · Admin
          </span>
          <button
            type="button"
            onClick={onBackToStore}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-zinc-800 border border-zinc-200 hover:bg-zinc-100 rounded-lg cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Storefront</span>
          </button>
        </header>

        <div className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white border border-zinc-200 rounded-2xl p-8">
            <p className="font-mono text-xs uppercase tracking-wider text-zinc-500">
              Protected Workspace
            </p>
            <h1 className="mt-2 font-display text-3xl font-bold uppercase text-zinc-950">
              Sign in to Toy Tron Admin
            </h1>
            <p className="mt-3 text-sm text-zinc-600 leading-relaxed">
              Manage your product catalog, payment gateway credentials, running
              header promotion, and customer orders. Sign in with your verified
              admin Google account (<span className="font-mono text-zinc-900">{ROOT_ADMIN_EMAIL}</span>).
            </p>

            {authError && (
              <p className="mt-4 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
                {authError}
              </p>
            )}

            <button
              type="button"
              onClick={handleGoogleSignIn}
              className="mt-6 w-full py-3 px-4 min-h-[44px] text-sm font-semibold text-zinc-950 bg-[#EBFC68] hover:bg-[#e1f645] border border-zinc-950/15 rounded-lg transition-colors cursor-pointer"
            >
              Sign in with Google
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Gate 2: Signed In, Not Admin
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-zinc-50 flex flex-col">
        <header className="bg-white border-b border-zinc-200 px-6 h-16 flex items-center justify-between">
          <span className="font-display text-xl font-extrabold uppercase tracking-[0.06em] text-zinc-950">
            TOY TRON · Admin
          </span>
          <button
            type="button"
            onClick={onBackToStore}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-zinc-800 border border-zinc-200 hover:bg-zinc-100 rounded-lg cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Storefront</span>
          </button>
        </header>

        <div className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white border border-zinc-200 rounded-2xl p-8">
            <div className="w-10 h-10 rounded-lg bg-red-50 text-red-700 flex items-center justify-center mb-4">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <h1 className="font-display text-2xl font-bold uppercase text-zinc-950">
              Admin Access Required
            </h1>
            <p className="mt-3 text-sm text-zinc-600 leading-relaxed">
              You are currently signed in as{' '}
              <span className="font-mono text-zinc-950">{user.email}</span>.
              Only the authorized store owner (<span className="font-mono text-zinc-950">{ROOT_ADMIN_EMAIL}</span>)
              can edit products and payment gateways.
            </p>
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={onSignOut}
                className="flex-1 py-2.5 px-4 text-sm font-semibold text-white bg-zinc-950 hover:bg-zinc-800 rounded-lg cursor-pointer"
              >
                Switch Account
              </button>
              <button
                type="button"
                onClick={onBackToStore}
                className="flex-1 py-2.5 px-4 text-sm font-medium text-zinc-800 bg-zinc-100 hover:bg-zinc-200 rounded-lg cursor-pointer"
              >
                Return to Shop
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const navItems: { id: AdminTab; label: string; icon: typeof LayoutDashboard }[] = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'products', label: 'Products', icon: Package },
    { id: 'payments', label: 'Payment Gateways', icon: CreditCard },
    { id: 'storefront', label: 'Storefront & Marquee', icon: Settings },
    { id: 'orders', label: 'Orders', icon: ShoppingCart },
  ];

  const activeTabLabel =
    navItems.find((item) => item.id === activeTab)?.label ?? 'Overview';

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-950 flex flex-col lg:flex-row">
      {/* Sidebar (256px Desktop) */}
      <aside className="w-full lg:w-64 bg-zinc-950 text-white border-b lg:border-b-0 lg:border-r border-zinc-800 shrink-0 flex flex-col justify-between">
        <div>
          <div className="h-16 px-6 flex items-center justify-between border-b border-zinc-800">
            <span className="font-display text-xl font-extrabold uppercase tracking-[0.06em] text-[#EBFC68]">
              TOY TRON
            </span>
            <button
              type="button"
              onClick={onBackToStore}
              className="lg:hidden text-xs font-medium text-zinc-300 hover:text-white cursor-pointer"
            >
              Storefront
            </button>
          </div>

          <nav
            aria-label="Admin sections"
            className="p-3 flex lg:flex-col gap-1 overflow-x-auto"
          >
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    active
                      ? 'bg-[#EBFC68] text-zinc-950 font-semibold'
                      : 'text-zinc-300 hover:bg-zinc-900 hover:text-white'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="hidden lg:block p-4 border-t border-zinc-800 space-y-3">
          <div className="text-xs">
            <p className="text-zinc-400">Signed in as</p>
            <p className="font-mono text-zinc-200 truncate mt-0.5">{user.email}</p>
          </div>
          <button
            type="button"
            onClick={onSignOut}
            className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-zinc-300 hover:text-white bg-zinc-900 hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Workspace */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar Contract: Breadcrumb left, 1-2 actions right */}
        <header className="h-16 bg-white border-b border-zinc-200 px-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm min-w-0">
            <span className="text-zinc-400 hidden sm:inline">Toy Tron</span>
            <span className="text-zinc-300 hidden sm:inline">/</span>
            <span className="text-zinc-500">Admin Console</span>
            <span className="text-zinc-300">/</span>
            <span className="font-semibold text-zinc-950 truncate">
              {activeTabLabel}
            </span>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {activeTab === 'products' && (
              <button
                type="button"
                onClick={handleOpenNewProduct}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[40px] text-xs font-semibold text-zinc-950 bg-[#EBFC68] hover:bg-[#e1f645] border border-zinc-950/15 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Plus className="w-4 h-4" aria-hidden="true" />
                <span>Add Product</span>
              </button>
            )}
            <button
              type="button"
              onClick={onBackToStore}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[40px] text-xs font-semibold text-white bg-zinc-950 hover:bg-zinc-800 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
              <span>View Storefront</span>
            </button>
          </div>
        </header>

        <div className="flex-1 p-6 sm:p-8 max-w-6xl w-full mx-auto space-y-8">
          {/* Cloud Sync Banner if starter data isn't persisted to Firestore yet */}
          {(!hasCloudProducts || !hasCloudConfig) && (
            <div className="rounded-xl border border-amber-300 bg-amber-50 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-amber-950">
                  Initialize Cloud Storefront Database
                </p>
                <p className="text-xs text-amber-800 mt-1">
                  Your starter Toy Tron products and settings are currently using
                  local defaults. Sync them to Firestore once so all edits persist
                  live for every visitor.
                </p>
              </div>
              <button
                type="button"
                disabled={seeding}
                onClick={handleSeed}
                className="px-4 py-2.5 min-h-[40px] text-xs font-semibold text-white bg-zinc-950 hover:bg-zinc-800 rounded-lg whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50"
              >
                {seeding ? 'Syncing...' : 'Sync Starter Data to Cloud'}
              </button>
            </div>
          )}

          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                <div className="rounded-xl border border-zinc-200 bg-white p-5">
                  <p className="text-xs text-zinc-500">Gross Revenue</p>
                  <p className="mt-2 font-mono text-2xl font-bold text-zinc-950 tabular-nums">
                    ₹{totalRevenue.toLocaleString('en-IN')}
                  </p>
                </div>
                <div className="rounded-xl border border-zinc-200 bg-white p-5">
                  <p className="text-xs text-zinc-500">Total Orders</p>
                  <p className="mt-2 font-mono text-2xl font-bold text-zinc-950 tabular-nums">
                    {orders.length}
                  </p>
                </div>
                <div className="rounded-xl border border-zinc-200 bg-white p-5">
                  <p className="text-xs text-zinc-500">Catalog Products</p>
                  <p className="mt-2 font-mono text-2xl font-bold text-zinc-950 tabular-nums">
                    {products.length}
                  </p>
                </div>
                <div className="rounded-xl border border-zinc-200 bg-white p-5">
                  <p className="text-xs text-zinc-500">Active Payment Methods</p>
                  <p className="mt-2 font-mono text-2xl font-bold text-zinc-950 tabular-nums">
                    {enabledGatewayCount} / 4
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <button
                  type="button"
                  onClick={() => setActiveTab('products')}
                  className="text-left rounded-xl border border-zinc-200 bg-white p-6 hover:border-zinc-400 transition-colors cursor-pointer"
                >
                  <p className="font-display text-lg font-bold uppercase text-zinc-950">
                    Manage Products &amp; Cars
                  </p>
                  <p className="mt-1.5 text-sm text-zinc-600">
                    Add new Hot Wheels drops, edit car showpiece prices, stock,
                    or variants.
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('payments')}
                  className="text-left rounded-xl border border-zinc-200 bg-white p-6 hover:border-zinc-400 transition-colors cursor-pointer"
                >
                  <p className="font-display text-lg font-bold uppercase text-zinc-950">
                    Payment Gateways
                  </p>
                  <p className="mt-1.5 text-sm text-zinc-600">
                    Configure COD, UPI ID, Razorpay Key ID, Stripe Publishable
                    Key &amp; shipping fees.
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('storefront')}
                  className="text-left rounded-xl border border-zinc-200 bg-white p-6 hover:border-zinc-400 transition-colors cursor-pointer"
                >
                  <p className="font-display text-lg font-bold uppercase text-zinc-950">
                    Storefront &amp; Marquee
                  </p>
                  <p className="mt-1.5 text-sm text-zinc-600">
                    Edit running top header announcement, Hero headline, and
                    featured promo item.
                  </p>
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: PRODUCTS MANAGER */}
          {activeTab === 'products' && (
            <div className="space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="relative max-w-sm w-full">
                  <Search
                    className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2"
                    aria-hidden="true"
                  />
                  <input
                    type="search"
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    placeholder="Filter products by name or category..."
                    className="w-full pl-9 pr-3 py-2 min-h-[40px] text-sm rounded-lg border border-zinc-200 bg-white"
                  />
                </div>
                <p className="text-xs font-mono text-zinc-500 tabular-nums">
                  Showing {filteredProducts.length} of {products.length} items
                </p>
              </div>

              <div className="rounded-xl border border-zinc-200 bg-white overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-zinc-200 text-xs font-medium text-zinc-500 bg-zinc-50">
                      <th className="py-3 px-4">Product</th>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4 text-right">Price</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 text-sm">
                    {filteredProducts.map((p) => (
                      <tr key={p.id} className="hover:bg-zinc-50/80">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-11 h-9 rounded-md overflow-hidden border border-zinc-200 bg-zinc-100 shrink-0">
                              <ResilientImage
                                src={p.image}
                                alt={p.imageAlt}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-zinc-950 truncate max-w-[260px]">
                                {p.name}
                              </p>
                              <p className="text-xs text-zinc-500 truncate max-w-[260px]">
                                {p.variants.join(' · ')}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-zinc-600 whitespace-nowrap">
                          {p.category}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-semibold tabular-nums whitespace-nowrap">
                          ₹{p.price.toLocaleString('en-IN')}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span
                            className={`inline-block text-xs font-medium px-2 py-0.5 rounded border ${
                              p.inStock
                                ? 'text-green-700 bg-green-50 border-green-200'
                                : 'text-red-700 bg-red-50 border-red-200'
                            }`}
                          >
                            {p.inStock ? 'In Stock' : 'Out of Stock'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleOpenEditProduct(p)}
                              className="px-3 py-1.5 text-xs font-semibold text-zinc-900 bg-zinc-100 hover:bg-zinc-200 rounded-md cursor-pointer"
                            >
                              Edit
                            </button>
                            {confirmDeleteId === p.id ? (
                              <button
                                type="button"
                                onClick={async () => {
                                  await onDeleteProduct(p.id);
                                  setConfirmDeleteId(null);
                                }}
                                className="px-2.5 py-1.5 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-md cursor-pointer"
                              >
                                Confirm
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteId(p.id)}
                                aria-label={`Delete ${p.name}`}
                                className="p-1.5 text-zinc-400 hover:text-red-600 rounded-md cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: PAYMENT GATEWAYS & SHIPPING */}
          {activeTab === 'payments' && (
            <form onSubmit={handleSaveConfigSubmit} className="space-y-6">
              <div className="rounded-xl border border-zinc-200 bg-white p-6 space-y-6">
                <div>
                  <h2 className="font-display text-xl font-bold uppercase text-zinc-950">
                    Checkout Payment Gateways
                  </h2>
                  <p className="mt-1 text-xs text-zinc-500">
                    Enable or configure payment methods shown to customers in
                    Express Checkout. Keep private secret keys only in server
                    Secrets—store only public Key IDs and UPI VPA here.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* COD */}
                  <div className="p-4 rounded-xl border border-zinc-200 bg-zinc-50 flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-zinc-950">
                        Cash on Delivery (COD)
                      </p>
                      <p className="text-xs text-zinc-500 mt-0.5">
                        Pay by cash or UPI upon doorstep delivery
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={configDraft.codEnabled}
                      onChange={(e) =>
                        setConfigDraft((prev) => ({
                          ...prev,
                          codEnabled: e.target.checked,
                        }))
                      }
                      aria-label="Enable Cash on Delivery"
                      className="w-5 h-5 accent-zinc-950 cursor-pointer"
                    />
                  </div>

                  {/* Direct UPI */}
                  <div className="p-4 rounded-xl border border-zinc-200 bg-zinc-50 space-y-3">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold text-zinc-950">
                          Direct UPI Transfer
                        </p>
                        <p className="text-xs text-zinc-500 mt-0.5">
                          Show Merchant UPI VPA during checkout
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={configDraft.upiEnabled}
                        onChange={(e) =>
                          setConfigDraft((prev) => ({
                            ...prev,
                            upiEnabled: e.target.checked,
                          }))
                        }
                        aria-label="Enable Direct UPI"
                        className="w-5 h-5 accent-zinc-950 cursor-pointer"
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-zinc-200">
                      <div>
                        <label className="block text-xs font-medium text-zinc-700 mb-1">
                          Merchant UPI ID
                        </label>
                        <input
                          type="text"
                          value={configDraft.upiId}
                          onChange={(e) =>
                            setConfigDraft((prev) => ({
                              ...prev,
                              upiId: e.target.value,
                            }))
                          }
                          placeholder="toytron@upi"
                          className="w-full px-3 py-2 rounded-lg border border-zinc-300 bg-white text-xs font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-zinc-700 mb-1">
                          Payee Name
                        </label>
                        <input
                          type="text"
                          value={configDraft.upiDisplayName}
                          onChange={(e) =>
                            setConfigDraft((prev) => ({
                              ...prev,
                              upiDisplayName: e.target.value,
                            }))
                          }
                          placeholder="Toy Tron Collectibles"
                          className="w-full px-3 py-2 rounded-lg border border-zinc-300 bg-white text-xs"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Razorpay */}
                  <div className="p-4 rounded-xl border border-zinc-200 bg-zinc-50 space-y-3">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold text-zinc-950">
                          Razorpay Checkout
                        </p>
                        <p className="text-xs text-zinc-500 mt-0.5">
                          Cards, NetBanking, Wallets &amp; UPI Intent
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={configDraft.razorpayEnabled}
                        onChange={(e) =>
                          setConfigDraft((prev) => ({
                            ...prev,
                            razorpayEnabled: e.target.checked,
                          }))
                        }
                        aria-label="Enable Razorpay"
                        className="w-5 h-5 accent-zinc-950 cursor-pointer"
                      />
                    </div>
                    <div className="pt-2 border-t border-zinc-200">
                      <label className="block text-xs font-medium text-zinc-700 mb-1">
                        Razorpay Public Key ID
                      </label>
                      <input
                        type="text"
                        value={configDraft.razorpayKeyId}
                        onChange={(e) =>
                          setConfigDraft((prev) => ({
                            ...prev,
                            razorpayKeyId: e.target.value,
                          }))
                        }
                        placeholder="rzp_live_..."
                        className="w-full px-3 py-2 rounded-lg border border-zinc-300 bg-white text-xs font-mono"
                      />
                    </div>
                  </div>

                  {/* Stripe */}
                  <div className="p-4 rounded-xl border border-zinc-200 bg-zinc-50 space-y-3">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold text-zinc-950">
                          Stripe International Cards
                        </p>
                        <p className="text-xs text-zinc-500 mt-0.5">
                          Visa, Mastercard &amp; Apple Pay
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={configDraft.stripeEnabled}
                        onChange={(e) =>
                          setConfigDraft((prev) => ({
                            ...prev,
                            stripeEnabled: e.target.checked,
                          }))
                        }
                        aria-label="Enable Stripe"
                        className="w-5 h-5 accent-zinc-950 cursor-pointer"
                      />
                    </div>
                    <div className="pt-2 border-t border-zinc-200">
                      <label className="block text-xs font-medium text-zinc-700 mb-1">
                        Stripe Publishable Key
                      </label>
                      <input
                        type="text"
                        value={configDraft.stripePublishableKey}
                        onChange={(e) =>
                          setConfigDraft((prev) => ({
                            ...prev,
                            stripePublishableKey: e.target.value,
                          }))
                        }
                        placeholder="pk_live_..."
                        className="w-full px-3 py-2 rounded-lg border border-zinc-300 bg-white text-xs font-mono"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-zinc-200 bg-white p-6 space-y-5">
                <h2 className="font-display text-xl font-bold uppercase text-zinc-950">
                  Shipping &amp; Bundle Pricing Rules
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-zinc-700 mb-1.5">
                      Free Shipping Threshold (₹)
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={configDraft.freeShippingThreshold}
                      onChange={(e) =>
                        setConfigDraft((prev) => ({
                          ...prev,
                          freeShippingThreshold: Number(e.target.value) || 0,
                        }))
                      }
                      className="w-full px-3 py-2 rounded-lg border border-zinc-300 text-sm font-mono tabular-nums"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-700 mb-1.5">
                      Standard Shipping Fee (₹)
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={configDraft.shippingFee}
                      onChange={(e) =>
                        setConfigDraft((prev) => ({
                          ...prev,
                          shippingFee: Number(e.target.value) || 0,
                        }))
                      }
                      className="w-full px-3 py-2 rounded-lg border border-zinc-300 text-sm font-mono tabular-nums"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-700 mb-1.5">
                      Trio Bundle Savings (₹)
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={configDraft.bundleDiscountAmount}
                      onChange={(e) =>
                        setConfigDraft((prev) => ({
                          ...prev,
                          bundleDiscountAmount: Number(e.target.value) || 0,
                        }))
                      }
                      className="w-full px-3 py-2 rounded-lg border border-zinc-300 text-sm font-mono tabular-nums"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-4">
                {configSavedNotice && (
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-green-700">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{configSavedNotice}</span>
                  </span>
                )}
                <button
                  type="submit"
                  disabled={configSaving}
                  className="px-6 py-2.5 min-h-[44px] text-sm font-semibold text-zinc-950 bg-[#EBFC68] hover:bg-[#e1f645] border border-zinc-950/15 rounded-lg cursor-pointer disabled:opacity-50"
                >
                  {configSaving ? 'Saving...' : 'Save Payment & Shipping Settings'}
                </button>
              </div>
            </form>
          )}

          {/* TAB 4: STOREFRONT & MARQUEE */}
          {activeTab === 'storefront' && (
            <form onSubmit={handleSaveConfigSubmit} className="space-y-6">
              <div className="rounded-xl border border-zinc-200 bg-white p-6 space-y-5">
                <h2 className="font-display text-xl font-bold uppercase text-zinc-950">
                  Brand, Running Marquee &amp; Hero Promotion
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-zinc-700 mb-1.5">
                      Brand Wordmark
                    </label>
                    <input
                      type="text"
                      value={configDraft.brandName}
                      onChange={(e) =>
                        setConfigDraft((prev) => ({
                          ...prev,
                          brandName: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2.5 rounded-lg border border-zinc-300 text-sm font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-700 mb-1.5">
                      Support Email
                    </label>
                    <input
                      type="email"
                      value={configDraft.supportEmail}
                      onChange={(e) =>
                        setConfigDraft((prev) => ({
                          ...prev,
                          supportEmail: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2.5 rounded-lg border border-zinc-300 text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-700 mb-1.5">
                    Top Running Marquee Strip Text
                  </label>
                  <input
                    type="text"
                    value={configDraft.marqueeText}
                    onChange={(e) =>
                      setConfigDraft((prev) => ({
                        ...prev,
                        marqueeText: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2.5 rounded-lg border border-zinc-300 text-sm font-mono"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-zinc-700 mb-1.5">
                      Hero Eyebrow Kicker
                    </label>
                    <input
                      type="text"
                      value={configDraft.heroEyebrow}
                      onChange={(e) =>
                        setConfigDraft((prev) => ({
                          ...prev,
                          heroEyebrow: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2.5 rounded-lg border border-zinc-300 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-700 mb-1.5">
                      Hero Promotion Linked Product
                    </label>
                    <select
                      value={configDraft.heroProductId}
                      onChange={(e) =>
                        setConfigDraft((prev) => ({
                          ...prev,
                          heroProductId: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2.5 rounded-lg border border-zinc-300 text-sm bg-white"
                    >
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} (₹{p.price.toLocaleString('en-IN')})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-700 mb-1.5">
                    Hero Headline
                  </label>
                  <input
                    type="text"
                    value={configDraft.heroTitle}
                    onChange={(e) =>
                      setConfigDraft((prev) => ({
                        ...prev,
                        heroTitle: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2.5 rounded-lg border border-zinc-300 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-700 mb-1.5">
                    Hero Subtitle
                  </label>
                  <textarea
                    rows={3}
                    value={configDraft.heroSubtitle}
                    onChange={(e) =>
                      setConfigDraft((prev) => ({
                        ...prev,
                        heroSubtitle: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2.5 rounded-lg border border-zinc-300 text-sm"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-zinc-700 mb-1.5">
                      Hero Primary CTA Label
                    </label>
                    <input
                      type="text"
                      value={configDraft.heroCtaLabel}
                      onChange={(e) =>
                        setConfigDraft((prev) => ({
                          ...prev,
                          heroCtaLabel: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2.5 rounded-lg border border-zinc-300 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-700 mb-1.5">
                      Hero Promotion Image URL
                    </label>
                    <input
                      type="text"
                      value={configDraft.heroImage}
                      onChange={(e) =>
                        setConfigDraft((prev) => ({
                          ...prev,
                          heroImage: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2.5 rounded-lg border border-zinc-300 text-sm font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-4">
                {configSavedNotice && (
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-green-700">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{configSavedNotice}</span>
                  </span>
                )}
                <button
                  type="submit"
                  disabled={configSaving}
                  className="px-6 py-2.5 min-h-[44px] text-sm font-semibold text-zinc-950 bg-[#EBFC68] hover:bg-[#e1f645] border border-zinc-950/15 rounded-lg cursor-pointer disabled:opacity-50"
                >
                  {configSaving ? 'Saving...' : 'Publish Storefront Changes'}
                </button>
              </div>
            </form>
          )}

          {/* TAB 5: ORDERS MANAGER */}
          {activeTab === 'orders' && (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-1 p-1 bg-zinc-200/70 rounded-lg">
                  {(['All', ...ORDER_STATUSES] as const).map((status) => (
                    <button
                      key={status}
                      type="button"
                      onClick={() => setOrderFilter(status)}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                        orderFilter === status
                          ? 'bg-zinc-950 text-[#EBFC68]'
                          : 'text-zinc-600 hover:text-zinc-950'
                      }`}
                    >
                      {status}
                    </button>
                  ))}
                </div>
                <p className="font-mono text-xs text-zinc-500 tabular-nums">
                  {filteredOrders.length} orders
                </p>
              </div>

              {filteredOrders.length === 0 ? (
                <div className="rounded-xl border border-zinc-200 bg-white p-12 text-center">
                  <p className="font-display text-xl font-bold uppercase text-zinc-950">
                    No customer orders yet
                  </p>
                  <p className="mt-1.5 text-sm text-zinc-500">
                    Orders placed through Toy Tron Express Checkout will appear
                    here automatically.
                  </p>
                </div>
              ) : (
                <div className="rounded-xl border border-zinc-200 bg-white overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-zinc-200 text-xs font-medium text-zinc-500 bg-zinc-50">
                        <th className="py-3 px-4">Order</th>
                        <th className="py-3 px-4">Customer</th>
                        <th className="py-3 px-4">Items</th>
                        <th className="py-3 px-4">Payment</th>
                        <th className="py-3 px-4 text-right">Total</th>
                        <th className="py-3 px-4">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200 text-sm">
                      {filteredOrders.map((order) => (
                        <tr key={order.id} className="hover:bg-zinc-50/80">
                          <td className="py-3.5 px-4 font-mono text-xs font-semibold text-zinc-950 whitespace-nowrap">
                            #{order.orderNumber}
                          </td>
                          <td className="py-3.5 px-4">
                            <p className="font-medium text-zinc-950">
                              {order.customerName}
                            </p>
                            <p className="text-xs text-zinc-500 font-mono">
                              {order.phone} · {order.pincode}
                            </p>
                          </td>
                          <td className="py-3.5 px-4 text-xs text-zinc-600 max-w-[240px]">
                            <p className="truncate">{order.itemsSummary.join(', ')}</p>
                          </td>
                          <td className="py-3.5 px-4 font-mono text-xs text-zinc-700 whitespace-nowrap">
                            {order.paymentMethod}
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono font-semibold tabular-nums whitespace-nowrap">
                            ₹{order.total.toLocaleString('en-IN')}
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <select
                              value={order.status}
                              onChange={(e) =>
                                onUpdateOrderStatus(
                                  order.id,
                                  e.target.value as OrderStatus
                                )
                              }
                              aria-label={`Update status for order ${order.orderNumber}`}
                              className={`px-2.5 py-1 text-xs font-semibold rounded border cursor-pointer ${getStatusBadgeClasses(
                                order.status
                              )}`}
                            >
                              {ORDER_STATUSES.map((st) => (
                                <option key={st} value={st}>
                                  {st}
                                </option>
                              ))}
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Product Create / Edit Modal */}
      {editingProduct && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/60 p-4 overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-label="Edit Product"
          onClick={() => setEditingProduct(null)}
        >
          <div
            className="w-full max-w-2xl bg-white rounded-2xl border border-zinc-200 p-6 sm:p-8 my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-4 pb-4 border-b border-zinc-200">
              <h2 className="font-display text-2xl font-bold uppercase text-zinc-950">
                {editingProduct.id ? 'Edit Product' : 'Add New Product'}
              </h2>
              <button
                type="button"
                onClick={() => setEditingProduct(null)}
                aria-label="Close product editor"
                className="w-9 h-9 inline-flex items-center justify-center rounded-lg border border-zinc-200 text-zinc-700 hover:bg-zinc-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveProductSubmit} className="mt-5 space-y-4">
              {productError && (
                <p className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
                  {productError}
                </p>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-zinc-700 mb-1">
                    Product Name
                  </label>
                  <input
                    type="text"
                    required
                    value={editingProduct.name}
                    onChange={(e) =>
                      setEditingProduct((p) =>
                        p ? { ...p, name: e.target.value } : p
                      )
                    }
                    placeholder="Hot Wheels Skyline R34"
                    className="w-full px-3 py-2 rounded-lg border border-zinc-300 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-700 mb-1">
                    Category
                  </label>
                  <select
                    value={editingProduct.category}
                    onChange={(e) =>
                      setEditingProduct((p) =>
                        p
                          ? { ...p, category: e.target.value as ProductCategory }
                          : p
                      )
                    }
                    className="w-full px-3 py-2 rounded-lg border border-zinc-300 text-sm bg-white"
                  >
                    <option value="Car Showpieces">Car Showpieces</option>
                    <option value="Desk Gadgets">Desk Gadgets</option>
                    <option value="Collectibles">Collectibles</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-zinc-700 mb-1">
                    Sale Price (₹)
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={editingProduct.price}
                    onChange={(e) =>
                      setEditingProduct((p) =>
                        p ? { ...p, price: Number(e.target.value) || 0 } : p
                      )
                    }
                    className="w-full px-3 py-2 rounded-lg border border-zinc-300 text-sm font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-700 mb-1">
                    MRP / Compare Price (₹)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={editingProduct.compareAtPrice ?? ''}
                    onChange={(e) =>
                      setEditingProduct((p) =>
                        p
                          ? {
                              ...p,
                              compareAtPrice: e.target.value
                                ? Number(e.target.value)
                                : undefined,
                            }
                          : p
                      )
                    }
                    placeholder="Optional"
                    className="w-full px-3 py-2 rounded-lg border border-zinc-300 text-sm font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-700 mb-1">
                    Tag Label
                  </label>
                  <input
                    type="text"
                    value={editingProduct.tag ?? ''}
                    onChange={(e) =>
                      setEditingProduct((p) =>
                        p ? { ...p, tag: e.target.value } : p
                      )
                    }
                    placeholder="Hot Promo / Best Seller"
                    className="w-full px-3 py-2 rounded-lg border border-zinc-300 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-zinc-700 mb-1">
                    Image URL
                  </label>
                  <input
                    type="text"
                    required
                    value={editingProduct.image}
                    onChange={(e) =>
                      setEditingProduct((p) =>
                        p ? { ...p, image: e.target.value } : p
                      )
                    }
                    className="w-full px-3 py-2 rounded-lg border border-zinc-300 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-700 mb-1">
                    Quick Pick Studio Photo
                  </label>
                  <select
                    value=""
                    onChange={(e) => {
                      if (!e.target.value) return;
                      setEditingProduct((p) =>
                        p ? { ...p, image: e.target.value } : p
                      );
                    }}
                    className="w-full px-3 py-2 rounded-lg border border-zinc-300 text-xs bg-white"
                  >
                    <option value="">Choose built-in studio photo...</option>
                    {STUDIO_IMAGE_PRESETS.map((preset) => (
                      <option key={preset.url} value={preset.url}>
                        {preset.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1">
                  Editions / Variants (comma separated)
                </label>
                <input
                  type="text"
                  value={variantsText}
                  onChange={(e) => setVariantsText(e.target.value)}
                  placeholder="Matte Obsidian, Titanium Silver"
                  className="w-full px-3 py-2 rounded-lg border border-zinc-300 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1">
                  Short Card Description
                </label>
                <input
                  type="text"
                  required
                  value={editingProduct.shortDescription}
                  onChange={(e) =>
                    setEditingProduct((p) =>
                      p ? { ...p, shortDescription: e.target.value } : p
                    )
                  }
                  className="w-full px-3 py-2 rounded-lg border border-zinc-300 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1">
                  Full Product Description
                </label>
                <textarea
                  rows={2}
                  required
                  value={editingProduct.description}
                  onChange={(e) =>
                    setEditingProduct((p) =>
                      p ? { ...p, description: e.target.value } : p
                    )
                  }
                  className="w-full px-3 py-2 rounded-lg border border-zinc-300 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-700 mb-1">
                    Material
                  </label>
                  <input
                    type="text"
                    required
                    value={editingProduct.material}
                    onChange={(e) =>
                      setEditingProduct((p) =>
                        p ? { ...p, material: e.target.value } : p
                      )
                    }
                    className="w-full px-2.5 py-1.5 rounded-lg border border-zinc-300 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-700 mb-1">
                    Scale / Spec
                  </label>
                  <input
                    type="text"
                    required
                    value={editingProduct.scaleOrPower}
                    onChange={(e) =>
                      setEditingProduct((p) =>
                        p ? { ...p, scaleOrPower: e.target.value } : p
                      )
                    }
                    className="w-full px-2.5 py-1.5 rounded-lg border border-zinc-300 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-700 mb-1">
                    Dimensions
                  </label>
                  <input
                    type="text"
                    required
                    value={editingProduct.dimensions}
                    onChange={(e) =>
                      setEditingProduct((p) =>
                        p ? { ...p, dimensions: e.target.value } : p
                      )
                    }
                    className="w-full px-2.5 py-1.5 rounded-lg border border-zinc-300 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-700 mb-1">
                    Weight
                  </label>
                  <input
                    type="text"
                    required
                    value={editingProduct.weight}
                    onChange={(e) =>
                      setEditingProduct((p) =>
                        p ? { ...p, weight: e.target.value } : p
                      )
                    }
                    className="w-full px-2.5 py-1.5 rounded-lg border border-zinc-300 text-xs"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-6 pt-2">
                <label className="inline-flex items-center gap-2 text-xs font-medium text-zinc-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingProduct.inStock}
                    onChange={(e) =>
                      setEditingProduct((p) =>
                        p ? { ...p, inStock: e.target.checked } : p
                      )
                    }
                    className="w-4 h-4 accent-zinc-950"
                  />
                  <span>In Stock (Available to Buy)</span>
                </label>

                <label className="inline-flex items-center gap-2 text-xs font-medium text-zinc-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingProduct.featured}
                    onChange={(e) =>
                      setEditingProduct((p) =>
                        p ? { ...p, featured: e.target.checked } : p
                      )
                    }
                    className="w-4 h-4 accent-zinc-950"
                  />
                  <span>Feature at Top of Catalog</span>
                </label>
              </div>

              <div className="pt-4 border-t border-zinc-200 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="px-4 py-2.5 text-sm font-medium text-zinc-700 bg-zinc-100 hover:bg-zinc-200 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={productSaving}
                  className="px-5 py-2.5 text-sm font-semibold text-zinc-950 bg-[#EBFC68] hover:bg-[#e1f645] border border-zinc-950/15 rounded-lg cursor-pointer disabled:opacity-50"
                >
                  {productSaving ? 'Saving...' : 'Save Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
