import { useEffect, useMemo, useState, type FormEvent } from 'react';
import type { User } from 'firebase/auth';
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  Copy,
  CreditCard,
  Download,
  Eye,
  KeyRound,
  LayoutDashboard,
  Lock,
  LogOut,
  Package,
  Plus,
  Printer,
  Search,
  Settings,
  ShieldAlert,
  ShieldCheck,
  ShoppingCart,
  Tag,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import {
  isSafeMediaUrl,
  STUDIO_IMAGE_PRESETS,
  type AdminMember,
  type Coupon,
  type CouponDiscountType,
  type OrderRecord,
  type OrderStatus,
  type Product,
  type ProductCategory,
  type StoreConfig,
} from '../data/products';
import type { ProductInput } from '../hooks/useStoreData';
import { ROOT_ADMIN_EMAIL } from '../firebase';
import { ResilientImage } from './ResilientImage';

type AdminTab =
  | 'overview'
  | 'products'
  | 'orders'
  | 'coupons'
  | 'payments'
  | 'storefront'
  | 'team';

interface AdminConsoleProps {
  user: User | null;
  isAdmin: boolean;
  isRootAdmin: boolean;
  products: Product[];
  hasCloudProducts: boolean;
  hasCloudConfig: boolean;
  hasCloudCoupons: boolean;
  storeConfig: StoreConfig;
  coupons: Coupon[];
  orders: OrderRecord[];
  adminMembers: AdminMember[];
  onBackToStore: () => void;
  onSignIn: () => Promise<void>;
  onEmailSignIn: (emailOrId: string, password: string) => Promise<void>;
  onLinkPassword: (password: string) => Promise<void>;
  onResendVerification: () => Promise<void>;
  onSignOut: () => Promise<void>;
  onSeedCloud: () => Promise<void>;
  onSaveProduct: (input: ProductInput) => Promise<void>;
  onToggleProductStock: (product: Product) => Promise<void>;
  onDeleteProduct: (productId: string) => Promise<void>;
  onSaveConfig: (config: StoreConfig) => Promise<void>;
  onSaveCoupon: (coupon: Coupon) => Promise<void>;
  onToggleCouponActive: (coupon: Coupon) => Promise<void>;
  onDeleteCoupon: (code: string) => Promise<void>;
  onUpdateOrderStatus: (orderId: string, status: OrderStatus) => Promise<void>;
  onAddAdmin: (uid: string, email: string) => Promise<void>;
  onRemoveAdmin: (uid: string) => Promise<void>;
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

const EMPTY_COUPON_FORM: Coupon = {
  code: '',
  discountType: 'percent',
  discountValue: 10,
  minOrderAmount: 999,
  description: '',
  active: true,
};

const ORDER_STATUSES: OrderStatus[] = [
  'Confirmed',
  'Packed',
  'Shipped',
  'Delivered',
  'Cancelled',
];

const STOREFRONT_PRESETS = [
  {
    label: 'Hot Wheels Drop (Default)',
    marqueeText:
      'HOT WHEELS TRACK LEGENDS DROP LIVE — CLICK TO BUY NOW  ·  FREE EXPRESS SHIPPING ABOVE ₹1,499  ·  CASH ON DELIVERY AVAILABLE',
    heroEyebrow: 'Hot Wheels Track Legends Drop · Limited Stock',
    heroTitle: 'Hot Wheels Collector Trio. Built for Track & Desk.',
    heroCtaLabel: 'Buy Hot Wheels Drop',
  },
  {
    label: 'Weekend Flash Sale',
    marqueeText:
      'WEEKEND FLASH SALE LIVE — USE CODE TOYTRON10 FOR 10% OFF  ·  24-HOUR EXPRESS DISPATCH  ·  COD AVAILABLE',
    heroEyebrow: 'Weekend Flash Sale · Extra 10% Off Above ₹1,499',
    heroTitle: 'Heavy Alloy Die-Cast & Desk Tech On Sale.',
    heroCtaLabel: 'Grab Flash Drop',
  },
  {
    label: 'New Desk Tech Arrival',
    marqueeText:
      'NEW CNC DESK GADGETS & 1:18 HYPERCARS IN STOCK  ·  FREE PAN-INDIA DELIVERY ABOVE ₹1,499',
    heroEyebrow: 'Fresh Studio Drop · Precision Metal',
    heroTitle: 'Machined Metal Gadgets & Collector Cars.',
    heroCtaLabel: 'Shop New Drop',
  },
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

function downloadCsv(filename: string, rows: string[][]) {
  const csv = rows
    .map((row) =>
      row
        .map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`)
        .join(',')
    )
    .join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function AdminConsole({
  user,
  isAdmin,
  isRootAdmin,
  products,
  hasCloudProducts,
  hasCloudConfig,
  hasCloudCoupons,
  storeConfig,
  coupons,
  orders,
  adminMembers,
  onBackToStore,
  onSignIn,
  onEmailSignIn,
  onLinkPassword,
  onResendVerification,
  onSignOut,
  onSeedCloud,
  onSaveProduct,
  onToggleProductStock,
  onDeleteProduct,
  onSaveConfig,
  onSaveCoupon,
  onToggleCouponActive,
  onDeleteCoupon,
  onUpdateOrderStatus,
  onAddAdmin,
  onRemoveAdmin,
}: AdminConsoleProps) {
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');

  // Auth Form State (Firebase Google or Email/ID + Password — never hardcoded)
  const [authIdInput, setAuthIdInput] = useState('');
  const [authPasswordInput, setAuthPasswordInput] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const [verificationSent, setVerificationSent] = useState(false);

  // Products State
  const [productSearch, setProductSearch] = useState('');
  const [productCategoryFilter, setProductCategoryFilter] = useState<
    'All' | ProductCategory | 'Out of Stock'
  >('All');
  const [editingProduct, setEditingProduct] = useState<ProductInput | null>(null);
  const [variantsText, setVariantsText] = useState('Standard Edition');
  const [productSaving, setProductSaving] = useState(false);
  const [productError, setProductError] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Orders State
  const [orderFilter, setOrderFilter] = useState<'All' | OrderStatus>('All');
  const [orderSearch, setOrderSearch] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<OrderRecord | null>(null);

  // Coupons State
  const [couponDraft, setCouponDraft] = useState<Coupon>(EMPTY_COUPON_FORM);
  const [couponSaving, setCouponSaving] = useState(false);
  const [couponError, setCouponError] = useState('');

  // StoreConfig & Payments Draft State
  const [configDraft, setConfigDraft] = useState<StoreConfig>(storeConfig);
  const [configSaving, setConfigSaving] = useState(false);
  const [configSavedNotice, setConfigSavedNotice] = useState('');
  const [seeding, setSeeding] = useState(false);

  // Team & Security State
  const [newPassword, setNewPassword] = useState('');
  const [passwordStatus, setPasswordStatus] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [newAdminUid, setNewAdminUid] = useState('');
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [teamError, setTeamError] = useState('');
  const [copiedUid, setCopiedUid] = useState(false);

  useEffect(() => {
    setConfigDraft(storeConfig);
  }, [storeConfig]);

  const filteredProducts = useMemo(() => {
    const q = productSearch.trim().toLowerCase();
    return products.filter((p) => {
      const matchesCat =
        productCategoryFilter === 'All'
          ? true
          : productCategoryFilter === 'Out of Stock'
          ? !p.inStock
          : p.category === productCategoryFilter;
      const matchesQuery =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        (p.tag ?? '').toLowerCase().includes(q);
      return matchesCat && matchesQuery;
    });
  }, [products, productSearch, productCategoryFilter]);

  const filteredOrders = useMemo(() => {
    const q = orderSearch.trim().toLowerCase();
    return orders.filter((o) => {
      const matchesStatus = orderFilter === 'All' || o.status === orderFilter;
      const matchesQuery =
        !q ||
        o.orderNumber.toLowerCase().includes(q) ||
        o.customerName.toLowerCase().includes(q) ||
        o.phone.toLowerCase().includes(q) ||
        o.pincode.toLowerCase().includes(q);
      return matchesStatus && matchesQuery;
    });
  }, [orders, orderFilter, orderSearch]);

  const analytics = useMemo(() => {
    const nonCancelled = orders.filter((o) => o.status !== 'Cancelled');
    const grossRevenue = nonCancelled.reduce((sum, o) => sum + o.total, 0);
    const avgOrderValue =
      nonCancelled.length > 0 ? Math.round(grossRevenue / nonCancelled.length) : 0;
    const pendingDispatch = orders.filter(
      (o) => o.status === 'Confirmed' || o.status === 'Packed'
    ).length;

    const paymentBreakdown = (['COD', 'UPI', 'RAZORPAY', 'STRIPE'] as const).map(
      (method) => {
        const subset = nonCancelled.filter((o) => o.paymentMethod === method);
        const amount = subset.reduce((s, o) => s + o.total, 0);
        const pct =
          grossRevenue > 0 ? Math.round((amount / grossRevenue) * 100) : 0;
        return { method, count: subset.length, amount, pct };
      }
    );

    const categoryBreakdown = (
      ['Car Showpieces', 'Desk Gadgets', 'Collectibles'] as const
    ).map((cat) => {
      const items = products.filter((p) => p.category === cat);
      return {
        category: cat,
        total: items.length,
        inStock: items.filter((p) => p.inStock).length,
      };
    });

    return {
      grossRevenue,
      avgOrderValue,
      pendingDispatch,
      paymentBreakdown,
      categoryBreakdown,
    };
  }, [orders, products]);

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

  const handleDuplicateProduct = (p: Product) => {
    setProductError('');
    setVariantsText(p.variants.join(', '));
    setEditingProduct({
      name: `${p.name} (Copy)`,
      category: p.category,
      price: p.price,
      compareAtPrice: p.compareAtPrice,
      tag: p.tag ?? 'New Drop',
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
      featured: false,
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

  const handleCreateCouponSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setCouponError('');
    setCouponSaving(true);
    try {
      if (!hasCloudCoupons) {
        await onSeedCloud();
      }
      await onSaveCoupon(couponDraft);
      setCouponDraft(EMPTY_COUPON_FORM);
    } catch (err) {
      setCouponError(
        err instanceof Error ? err.message : 'Unable to save coupon.'
      );
    } finally {
      setCouponSaving(false);
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
    setAuthLoading(true);
    try {
      await onSignIn();
    } catch (err) {
      setAuthError(
        err instanceof Error ? err.message : 'Google sign-in was cancelled.'
      );
    } finally {
      setAuthLoading(false);
    }
  };

  const handleEmailLoginSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setAuthError('');
    if (!authIdInput.trim() || !authPasswordInput) {
      setAuthError('Enter your Admin Email / ID and Password.');
      return;
    }
    setAuthLoading(true);
    try {
      await onEmailSignIn(authIdInput, authPasswordInput);
      setAuthPasswordInput('');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Sign-in failed.';
      if (msg.includes('operation-not-allowed')) {
        setAuthError(
          'Email/Password login is not enabled yet in Firebase Console → Authentication → Sign-in method. Enable Email/Password there or sign in with Google below.'
        );
      } else if (
        msg.includes('invalid-credential') ||
        msg.includes('user-not-found') ||
        msg.includes('wrong-password')
      ) {
        setAuthError(
          'Invalid Admin ID/Email or Password. Sign in with Google first and link a password in Team & Security, or create this user in Firebase Console.'
        );
      } else {
        setAuthError(msg);
      }
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLinkPasswordSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordStatus('');
    if (newPassword.length < 6) {
      setPasswordError('Firebase requires at least 6 characters for a password.');
      return;
    }
    try {
      await onLinkPassword(newPassword);
      setNewPassword('');
      setPasswordStatus(
        'Backup password linked! You can now log in with Email + Password too.'
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unable to link password.';
      if (msg.includes('operation-not-allowed')) {
        setPasswordError(
          'Enable "Email/Password" in Firebase Console → Build → Authentication → Sign-in method first.'
        );
      } else if (msg.includes('provider-already-linked')) {
        setPasswordStatus('Email/Password login is already linked to this account.');
      } else {
        setPasswordError(msg);
      }
    }
  };

  const handleAddAdminSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setTeamError('');
    try {
      await onAddAdmin(newAdminUid, newAdminEmail);
      setNewAdminUid('');
      setNewAdminEmail('');
    } catch (err) {
      setTeamError(
        err instanceof Error ? err.message : 'Unable to add team admin.'
      );
    }
  };

  const handleExportProducts = () => {
    downloadCsv('toytron-products.csv', [
      ['ID', 'Name', 'Category', 'Price', 'CompareAtPrice', 'Tag', 'InStock', 'Variants'],
      ...products.map((p) => [
        p.id,
        p.name,
        p.category,
        String(p.price),
        String(p.compareAtPrice ?? ''),
        p.tag ?? '',
        p.inStock ? 'Yes' : 'No',
        p.variants.join(' | '),
      ]),
    ]);
  };

  const handleExportOrders = () => {
    downloadCsv('toytron-orders.csv', [
      [
        'OrderNumber',
        'CustomerName',
        'Phone',
        'Email',
        'Pincode',
        'Address',
        'PaymentMethod',
        'PromoCode',
        'Subtotal',
        'Discount',
        'Shipping',
        'Total',
        'Status',
        'Items',
      ],
      ...filteredOrders.map((o) => [
        o.orderNumber,
        o.customerName,
        o.phone,
        o.customerEmail,
        o.pincode,
        o.address,
        o.paymentMethod,
        o.promoCode ?? '',
        String(o.subtotal),
        String(o.discount),
        String(o.shippingFee),
        String(o.total),
        o.status,
        o.itemsSummary.join(' | '),
      ]),
    ]);
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
          <div className="max-w-md w-full bg-white border border-zinc-200 rounded-2xl p-8 space-y-6">
            <div>
              <p className="font-mono text-xs uppercase tracking-wider text-zinc-500">
                Protected Command Center
              </p>
              <h1 className="mt-2 font-display text-3xl font-bold uppercase text-zinc-950">
                Sign in to Toy Tron Admin
              </h1>
              <p className="mt-2 text-sm text-zinc-600 leading-relaxed">
                Sign in via Google (<span className="font-mono text-zinc-900">{ROOT_ADMIN_EMAIL}</span>)
                or your Firebase Admin Email / ID &amp; Password.
              </p>
            </div>

            {authError && (
              <p className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 leading-relaxed">
                {authError}
              </p>
            )}

            <button
              type="button"
              disabled={authLoading}
              onClick={handleGoogleSignIn}
              className="w-full py-3 px-4 min-h-[44px] text-sm font-semibold text-zinc-950 bg-[#EBFC68] hover:bg-[#e1f645] border border-zinc-950/15 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
            >
              {authLoading ? 'Signing in...' : 'Continue with Google (Recommended)'}
            </button>

            <div className="relative flex items-center">
              <div className="flex-grow border-t border-zinc-200" />
              <span className="mx-3 text-[11px] font-mono uppercase tracking-wider text-zinc-400">
                Or Admin ID / Email Login
              </span>
              <div className="flex-grow border-t border-zinc-200" />
            </div>

            <form onSubmit={handleEmailLoginSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1">
                  Admin Email or ID
                </label>
                <input
                  type="text"
                  value={authIdInput}
                  onChange={(e) => setAuthIdInput(e.target.value)}
                  placeholder="skillify07@gmail.com or admin-id"
                  autoComplete="username"
                  className="w-full px-3 py-2.5 rounded-lg border border-zinc-300 text-sm focus:outline-none focus:border-zinc-950"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1">
                  Password
                </label>
                <input
                  type="password"
                  value={authPasswordInput}
                  onChange={(e) => setAuthPasswordInput(e.target.value)}
                  placeholder="Enter Firebase account password"
                  autoComplete="current-password"
                  className="w-full px-3 py-2.5 rounded-lg border border-zinc-300 text-sm focus:outline-none focus:border-zinc-950"
                />
              </div>
              <button
                type="submit"
                disabled={authLoading}
                className="w-full py-2.5 px-4 min-h-[42px] inline-flex items-center justify-center gap-2 text-sm font-semibold text-white bg-zinc-950 hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
              >
                <Lock className="w-4 h-4" aria-hidden="true" />
                <span>Sign in with ID &amp; Password</span>
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // Gate 2: Signed In, Email Not Verified OR Not Admin
  if (!user.emailVerified || !isAdmin) {
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
          <div className="max-w-md w-full bg-white border border-zinc-200 rounded-2xl p-8 space-y-4">
            <div className="w-10 h-10 rounded-lg bg-red-50 text-red-700 flex items-center justify-center">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <h1 className="font-display text-2xl font-bold uppercase text-zinc-950">
              {!user.emailVerified
                ? 'Email Verification Required'
                : 'Admin Access Required'}
            </h1>
            <p className="text-sm text-zinc-600 leading-relaxed">
              Signed in as <span className="font-mono text-zinc-950">{user.email}</span>.{' '}
              {!user.emailVerified
                ? 'Please verify your email address first so database security rules allow write access, or sign in with your verified Google account.'
                : `Only the store owner (${ROOT_ADMIN_EMAIL}) or an added team admin can access the dashboard.`}
            </p>

            <div className="p-3 rounded-lg bg-zinc-50 border border-zinc-200 text-xs">
              <p className="text-zinc-500">Your Firebase Auth UID</p>
              <p className="font-mono text-zinc-950 break-all mt-0.5">{user.uid}</p>
            </div>

            {!user.emailVerified && (
              <button
                type="button"
                onClick={async () => {
                  await onResendVerification();
                  setVerificationSent(true);
                }}
                className="w-full py-2.5 px-4 text-xs font-semibold text-zinc-950 bg-[#EBFC68] hover:bg-[#e1f645] rounded-lg cursor-pointer"
              >
                {verificationSent
                  ? 'Verification Email Sent — Check Inbox'
                  : 'Send Email Verification Link'}
              </button>
            )}

            <div className="flex gap-3 pt-1">
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
    { id: 'overview', label: 'Overview & Analytics', icon: LayoutDashboard },
    { id: 'products', label: 'Products & Stock', icon: Package },
    { id: 'orders', label: 'Orders & Invoices', icon: ShoppingCart },
    { id: 'coupons', label: 'Coupons & Promos', icon: Tag },
    { id: 'payments', label: 'Payments & Shipping', icon: CreditCard },
    { id: 'storefront', label: 'Storefront & Marquee', icon: Settings },
    { id: 'team', label: 'Team & Security', icon: Users },
  ];

  const activeTabLabel =
    navItems.find((item) => item.id === activeTab)?.label ?? 'Overview';

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-950 flex flex-col lg:flex-row">
      {/* Sidebar (256px Desktop) */}
      <aside className="w-full lg:w-64 bg-zinc-950 text-white border-b lg:border-b-0 lg:border-r border-zinc-800 shrink-0 flex flex-col justify-between print:hidden">
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
            <p className="text-zinc-400">
              {isRootAdmin ? 'Root Owner' : 'Team Admin'}
            </p>
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
        {/* Top Bar */}
        <header className="h-16 bg-white border-b border-zinc-200 px-6 flex items-center justify-between gap-4 print:hidden">
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

        <div className="flex-1 p-6 sm:p-8 max-w-6xl w-full mx-auto space-y-8 print:p-0">
          {/* Cloud Sync Banner */}
          {(!hasCloudProducts || !hasCloudConfig || !hasCloudCoupons) && (
            <div className="rounded-xl border border-amber-300 bg-amber-50 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
              <div>
                <p className="text-sm font-semibold text-amber-950">
                  Initialize Cloud Storefront Database
                </p>
                <p className="text-xs text-amber-800 mt-1">
                  Sync starter Toy Tron products, coupons, and settings to
                  Firestore once so every visitor sees your live updates.
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

          {/* TAB 1: OVERVIEW & ANALYTICS */}
          {activeTab === 'overview' && (
            <div className="space-y-8">
              {analytics.pendingDispatch > 0 && (
                <div className="rounded-xl border border-zinc-900 bg-zinc-950 text-white p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <p className="font-mono text-xs uppercase tracking-wider text-[#EBFC68]">
                      Dispatch Queue Attention
                    </p>
                    <p className="text-sm font-semibold mt-1">
                      {analytics.pendingDispatch}{' '}
                      {analytics.pendingDispatch === 1 ? 'order is' : 'orders are'}{' '}
                      waiting to be packed or shipped.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('orders')}
                    className="px-4 py-2 text-xs font-semibold text-zinc-950 bg-[#EBFC68] hover:bg-[#e1f645] rounded-lg whitespace-nowrap cursor-pointer"
                  >
                    Open Orders Queue
                  </button>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                <div className="rounded-xl border border-zinc-200 bg-white p-5">
                  <p className="text-xs text-zinc-500">Gross Revenue</p>
                  <p className="mt-2 font-mono text-2xl font-bold text-zinc-950 tabular-nums">
                    ₹{analytics.grossRevenue.toLocaleString('en-IN')}
                  </p>
                  <p className="mt-1 text-[11px] text-zinc-500">
                    Excludes cancelled orders
                  </p>
                </div>
                <div className="rounded-xl border border-zinc-200 bg-white p-5">
                  <p className="text-xs text-zinc-500">Total Orders</p>
                  <p className="mt-2 font-mono text-2xl font-bold text-zinc-950 tabular-nums">
                    {orders.length}
                  </p>
                  <p className="mt-1 text-[11px] text-zinc-500">
                    {analytics.pendingDispatch} awaiting dispatch
                  </p>
                </div>
                <div className="rounded-xl border border-zinc-200 bg-white p-5">
                  <p className="text-xs text-zinc-500">Avg. Order Value</p>
                  <p className="mt-2 font-mono text-2xl font-bold text-zinc-950 tabular-nums">
                    ₹{analytics.avgOrderValue.toLocaleString('en-IN')}
                  </p>
                  <p className="mt-1 text-[11px] text-zinc-500">
                    {enabledGatewayCount}/4 gateways enabled
                  </p>
                </div>
                <div className="rounded-xl border border-zinc-200 bg-white p-5">
                  <p className="text-xs text-zinc-500">Catalog &amp; Promos</p>
                  <p className="mt-2 font-mono text-2xl font-bold text-zinc-950 tabular-nums">
                    {products.length} Items
                  </p>
                  <p className="mt-1 text-[11px] text-zinc-500">
                    {coupons.filter((c) => c.active).length} active coupons
                  </p>
                </div>
              </div>

              {/* Analytics Split */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="rounded-xl border border-zinc-200 bg-white p-6 space-y-4">
                  <h2 className="font-display text-lg font-bold uppercase text-zinc-950">
                    Revenue by Payment Method
                  </h2>
                  <div className="space-y-3">
                    {analytics.paymentBreakdown.map((pm) => (
                      <div key={pm.method} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-mono font-semibold text-zinc-900">
                            {pm.method} ({pm.count})
                          </span>
                          <span className="font-mono text-zinc-600 tabular-nums">
                            ₹{pm.amount.toLocaleString('en-IN')} · {pm.pct}%
                          </span>
                        </div>
                        <div className="h-2 rounded-full bg-zinc-100 overflow-hidden">
                          <div
                            className="h-full bg-zinc-950 transition-all"
                            style={{ width: `${pm.pct}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl border border-zinc-200 bg-white p-6 space-y-4">
                  <h2 className="font-display text-lg font-bold uppercase text-zinc-950">
                    Catalog Inventory Status
                  </h2>
                  <div className="space-y-3">
                    {analytics.categoryBreakdown.map((cb) => (
                      <div
                        key={cb.category}
                        className="p-3.5 rounded-lg border border-zinc-200 bg-zinc-50 flex items-center justify-between"
                      >
                        <div>
                          <p className="text-sm font-semibold text-zinc-950">
                            {cb.category}
                          </p>
                          <p className="text-xs text-zinc-500">
                            {cb.inStock} in stock · {cb.total - cb.inStock} sold out
                          </p>
                        </div>
                        <span className="font-mono text-sm font-bold text-zinc-950 tabular-nums">
                          {cb.total} SKUs
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Recent Orders Quick Feed */}
              <div className="rounded-xl border border-zinc-200 bg-white p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="font-display text-lg font-bold uppercase text-zinc-950">
                    Recent Orders
                  </h2>
                  <button
                    type="button"
                    onClick={() => setActiveTab('orders')}
                    className="text-xs font-semibold text-[#334FB4] hover:underline cursor-pointer"
                  >
                    Manage All Orders →
                  </button>
                </div>
                {orders.length === 0 ? (
                  <p className="text-sm text-zinc-500">
                    No customer orders placed yet.
                  </p>
                ) : (
                  <div className="divide-y divide-zinc-200">
                    {orders.slice(0, 5).map((o) => (
                      <div
                        key={o.id}
                        className="py-3 flex flex-wrap items-center justify-between gap-3 text-sm"
                      >
                        <div>
                          <span className="font-mono text-xs font-semibold text-zinc-950">
                            #{o.orderNumber}
                          </span>
                          <span className="mx-2 text-zinc-300">·</span>
                          <span className="font-medium text-zinc-800">
                            {o.customerName}
                          </span>
                          <span className="ml-2 text-xs text-zinc-500">
                            ({o.paymentMethod})
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span
                            className={`px-2.5 py-0.5 text-xs font-semibold rounded border ${getStatusBadgeClasses(
                              o.status
                            )}`}
                          >
                            {o.status}
                          </span>
                          <span className="font-mono font-semibold tabular-nums">
                            ₹{o.total.toLocaleString('en-IN')}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: PRODUCTS & QUICK STOCK MANAGER */}
          {activeTab === 'products' && (
            <div className="space-y-5">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="relative max-w-sm w-full">
                  <Search
                    className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2"
                    aria-hidden="true"
                  />
                  <input
                    type="search"
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    placeholder="Filter products by name, tag, category..."
                    className="w-full pl-9 pr-3 py-2 min-h-[40px] text-sm rounded-lg border border-zinc-200 bg-white"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={handleExportProducts}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-zinc-800 bg-white border border-zinc-300 hover:bg-zinc-100 rounded-lg cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Export CSV</span>
                  </button>
                  <p className="text-xs font-mono text-zinc-500 tabular-nums">
                    {filteredProducts.length} / {products.length} items
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-1.5 p-1 bg-zinc-200/70 rounded-lg w-fit">
                {(
                  [
                    'All',
                    'Car Showpieces',
                    'Desk Gadgets',
                    'Collectibles',
                    'Out of Stock',
                  ] as const
                ).map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setProductCategoryFilter(cat)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                      productCategoryFilter === cat
                        ? 'bg-zinc-950 text-[#EBFC68]'
                        : 'text-zinc-600 hover:text-zinc-950'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              <div className="rounded-xl border border-zinc-200 bg-white overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-zinc-200 text-xs font-medium text-zinc-500 bg-zinc-50">
                      <th className="py-3 px-4">Product</th>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4 text-right">Price</th>
                      <th className="py-3 px-4">Quick Stock</th>
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
                              <p className="font-semibold text-zinc-950 truncate max-w-[250px]">
                                {p.name}
                              </p>
                              <p className="text-xs text-zinc-500 truncate max-w-[250px]">
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
                          <button
                            type="button"
                            onClick={() => onToggleProductStock(p)}
                            title="Click to toggle stock status"
                            className={`inline-block text-xs font-semibold px-2.5 py-1 rounded border cursor-pointer transition-colors ${
                              p.inStock
                                ? 'text-green-700 bg-green-50 border-green-200 hover:bg-green-100'
                                : 'text-red-700 bg-red-50 border-red-200 hover:bg-red-100'
                            }`}
                          >
                            {p.inStock ? 'In Stock' : 'Sold Out'}
                          </button>
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenEditProduct(p)}
                              className="px-2.5 py-1.5 text-xs font-semibold text-zinc-900 bg-zinc-100 hover:bg-zinc-200 rounded-md cursor-pointer"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDuplicateProduct(p)}
                              title="Duplicate product"
                              className="p-1.5 text-zinc-500 hover:text-zinc-950 rounded-md cursor-pointer"
                            >
                              <Copy className="w-4 h-4" />
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

          {/* TAB 3: ORDERS & PACKING SLIPS */}
          {activeTab === 'orders' && (
            <div className="space-y-5">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
                <div className="relative max-w-sm w-full">
                  <Search
                    className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2"
                    aria-hidden="true"
                  />
                  <input
                    type="search"
                    value={orderSearch}
                    onChange={(e) => setOrderSearch(e.target.value)}
                    placeholder="Search Order #, Customer, Phone, PIN..."
                    className="w-full pl-9 pr-3 py-2 min-h-[40px] text-sm rounded-lg border border-zinc-200 bg-white"
                  />
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleExportOrders}
                    disabled={filteredOrders.length === 0}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-zinc-800 bg-white border border-zinc-300 hover:bg-zinc-100 rounded-lg cursor-pointer disabled:opacity-40"
                  >
                    <Download className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Export CSV</span>
                  </button>
                  <p className="font-mono text-xs text-zinc-500 tabular-nums">
                    {filteredOrders.length} orders
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-1 p-1 bg-zinc-200/70 rounded-lg w-fit print:hidden">
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

              {filteredOrders.length === 0 ? (
                <div className="rounded-xl border border-zinc-200 bg-white p-12 text-center">
                  <p className="font-display text-xl font-bold uppercase text-zinc-950">
                    No matching orders
                  </p>
                  <p className="mt-1.5 text-sm text-zinc-500">
                    Customer orders placed via Express Checkout appear here
                    instantly.
                  </p>
                </div>
              ) : (
                <div className="rounded-xl border border-zinc-200 bg-white overflow-x-auto print:hidden">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-zinc-200 text-xs font-medium text-zinc-500 bg-zinc-50">
                        <th className="py-3 px-4">Order</th>
                        <th className="py-3 px-4">Customer</th>
                        <th className="py-3 px-4">Items</th>
                        <th className="py-3 px-4">Payment</th>
                        <th className="py-3 px-4 text-right">Total</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-right">Slip</th>
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
                          <td className="py-3.5 px-4 text-xs text-zinc-600 max-w-[220px]">
                            <p className="truncate">{order.itemsSummary.join(', ')}</p>
                            {order.promoCode && (
                              <span className="inline-block mt-0.5 font-mono text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                                {order.promoCode}
                              </span>
                            )}
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
                          <td className="py-3.5 px-4 text-right whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => setSelectedOrder(order)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-zinc-900 bg-zinc-100 hover:bg-zinc-200 rounded-md cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5" aria-hidden="true" />
                              <span>View</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: COUPONS & PROMO CODES */}
          {activeTab === 'coupons' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <form
                onSubmit={handleCreateCouponSubmit}
                className="lg:col-span-5 rounded-xl border border-zinc-200 bg-white p-6 space-y-4 h-fit"
              >
                <h2 className="font-display text-xl font-bold uppercase text-zinc-950">
                  Create Promo Coupon
                </h2>
                <p className="text-xs text-zinc-500">
                  Active coupons can be applied live by customers in the Shopping
                  Bag &amp; Checkout drawer.
                </p>

                {couponError && (
                  <p className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
                    {couponError}
                  </p>
                )}

                <div>
                  <label className="block text-xs font-medium text-zinc-700 mb-1">
                    Coupon Code
                  </label>
                  <input
                    type="text"
                    required
                    value={couponDraft.code}
                    onChange={(e) =>
                      setCouponDraft((c) => ({
                        ...c,
                        code: e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ''),
                      }))
                    }
                    placeholder="FESTIVE15"
                    className="w-full px-3 py-2 rounded-lg border border-zinc-300 text-sm font-mono uppercase"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-zinc-700 mb-1">
                      Discount Type
                    </label>
                    <select
                      value={couponDraft.discountType}
                      onChange={(e) =>
                        setCouponDraft((c) => ({
                          ...c,
                          discountType: e.target.value as CouponDiscountType,
                        }))
                      }
                      className="w-full px-3 py-2 rounded-lg border border-zinc-300 text-sm bg-white"
                    >
                      <option value="percent">Percentage (%)</option>
                      <option value="flat">Flat Amount (₹)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-700 mb-1">
                      {couponDraft.discountType === 'percent'
                        ? 'Discount (%)'
                        : 'Discount (₹)'}
                    </label>
                    <input
                      type="number"
                      required
                      min={1}
                      max={couponDraft.discountType === 'percent' ? 90 : 50000}
                      value={couponDraft.discountValue}
                      onChange={(e) =>
                        setCouponDraft((c) => ({
                          ...c,
                          discountValue: Number(e.target.value) || 1,
                        }))
                      }
                      className="w-full px-3 py-2 rounded-lg border border-zinc-300 text-sm font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-700 mb-1">
                    Minimum Cart Value (₹)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={couponDraft.minOrderAmount}
                    onChange={(e) =>
                      setCouponDraft((c) => ({
                        ...c,
                        minOrderAmount: Number(e.target.value) || 0,
                      }))
                    }
                    className="w-full px-3 py-2 rounded-lg border border-zinc-300 text-sm font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-700 mb-1">
                    Note / Description
                  </label>
                  <input
                    type="text"
                    value={couponDraft.description}
                    onChange={(e) =>
                      setCouponDraft((c) => ({
                        ...c,
                        description: e.target.value,
                      }))
                    }
                    placeholder="15% off weekend collector orders"
                    className="w-full px-3 py-2 rounded-lg border border-zinc-300 text-sm"
                  />
                </div>

                <button
                  type="submit"
                  disabled={couponSaving}
                  className="w-full py-2.5 px-4 min-h-[42px] text-sm font-semibold text-zinc-950 bg-[#EBFC68] hover:bg-[#e1f645] border border-zinc-950/15 rounded-lg cursor-pointer disabled:opacity-50"
                >
                  {couponSaving ? 'Saving Coupon...' : 'Save Coupon Code'}
                </button>
              </form>

              <div className="lg:col-span-7 space-y-4">
                <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
                  <div className="px-6 py-4 border-b border-zinc-200 bg-zinc-50 flex items-center justify-between">
                    <h3 className="font-display text-lg font-bold uppercase text-zinc-950">
                      Store Coupons ({coupons.length})
                    </h3>
                    <span className="text-xs font-mono text-zinc-500">
                      {coupons.filter((c) => c.active).length} active
                    </span>
                  </div>
                  <div className="divide-y divide-zinc-200">
                    {coupons.map((c) => (
                      <div
                        key={c.code}
                        className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                      >
                        <div>
                          <div className="flex items-center gap-2.5">
                            <span className="font-mono text-sm font-bold px-2.5 py-0.5 rounded bg-zinc-950 text-[#EBFC68]">
                              {c.code}
                            </span>
                            <span className="text-sm font-semibold text-zinc-950">
                              {c.discountType === 'percent'
                                ? `${c.discountValue}% OFF`
                                : `₹${c.discountValue} OFF`}
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-zinc-600">
                            {c.description || 'Promotional store discount'} · Min
                            order ₹{c.minOrderAmount.toLocaleString('en-IN')}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => onToggleCouponActive(c)}
                            className={`px-3 py-1.5 text-xs font-semibold rounded border cursor-pointer ${
                              c.active
                                ? 'text-green-700 bg-green-50 border-green-200'
                                : 'text-zinc-600 bg-zinc-100 border-zinc-300'
                            }`}
                          >
                            {c.active ? 'Active' : 'Paused'}
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteCoupon(c.code)}
                            aria-label={`Delete coupon ${c.code}`}
                            className="p-1.5 text-zinc-400 hover:text-red-600 rounded cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: PAYMENT GATEWAYS & SHIPPING */}
          {activeTab === 'payments' && (
            <form onSubmit={handleSaveConfigSubmit} className="space-y-6">
              <div className="rounded-xl border border-zinc-200 bg-white p-6 space-y-6">
                <div>
                  <h2 className="font-display text-xl font-bold uppercase text-zinc-950">
                    Checkout Payment Gateways
                  </h2>
                  <p className="mt-1 text-xs text-zinc-500">
                    Enable or configure payment methods shown in Express Checkout.
                    Store only public Key IDs and UPI VPA here.
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

          {/* TAB 6: STOREFRONT & MARQUEE */}
          {activeTab === 'storefront' && (
            <form onSubmit={handleSaveConfigSubmit} className="space-y-6">
              <div className="rounded-xl border border-zinc-200 bg-white p-6 space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="font-display text-xl font-bold uppercase text-zinc-950">
                    Quick Campaign Templates
                  </h2>
                  <div className="flex flex-wrap gap-2">
                    {STOREFRONT_PRESETS.map((preset) => (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() =>
                          setConfigDraft((prev) => ({
                            ...prev,
                            marqueeText: preset.marqueeText,
                            heroEyebrow: preset.heroEyebrow,
                            heroTitle: preset.heroTitle,
                            heroCtaLabel: preset.heroCtaLabel,
                          }))
                        }
                        className="px-3 py-1.5 text-xs font-semibold text-zinc-800 bg-zinc-100 hover:bg-[#EBFC68] rounded-md border border-zinc-200 cursor-pointer transition-colors"
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Live Marquee Preview */}
                <div className="rounded-lg overflow-hidden border border-zinc-200">
                  <div className="bg-zinc-950 text-[#EBFC68] py-2 px-4 text-xs font-mono tracking-wider uppercase truncate">
                    LIVE PREVIEW: {configDraft.marqueeText}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
                  <div>
                    <label className="block text-xs font-medium text-zinc-700 mb-1.5">
                      WhatsApp Support (Optional)
                    </label>
                    <input
                      type="text"
                      value={configDraft.whatsappNumber ?? ''}
                      onChange={(e) =>
                        setConfigDraft((prev) => ({
                          ...prev,
                          whatsappNumber: e.target.value,
                        }))
                      }
                      placeholder="+91 9876543210"
                      className="w-full px-3 py-2.5 rounded-lg border border-zinc-300 text-sm font-mono"
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

          {/* TAB 7: TEAM & SECURITY */}
          {activeTab === 'team' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Admin Credentials & Backup Password */}
                <div className="rounded-xl border border-zinc-200 bg-white p-6 space-y-5">
                  <div className="flex items-center gap-2.5">
                    <KeyRound className="w-5 h-5 text-zinc-950" aria-hidden="true" />
                    <h2 className="font-display text-xl font-bold uppercase text-zinc-950">
                      Admin Password &amp; Session
                    </h2>
                  </div>

                  <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200 space-y-2 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-zinc-500">Current Email</span>
                      <span className="font-mono font-semibold text-zinc-950">
                        {user.email}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-zinc-500">Firebase UID</span>
                      <button
                        type="button"
                        onClick={() => {
                          void navigator.clipboard.writeText(user.uid);
                          setCopiedUid(true);
                          window.setTimeout(() => setCopiedUid(false), 2000);
                        }}
                        className="inline-flex items-center gap-1 font-mono text-zinc-900 hover:text-[#334FB4] cursor-pointer"
                      >
                        <span>{user.uid.slice(0, 14)}...</span>
                        {copiedUid ? (
                          <Check className="w-3.5 h-3.5 text-green-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>

                  <form onSubmit={handleLinkPasswordSubmit} className="space-y-3">
                    <p className="text-xs text-zinc-600 leading-relaxed">
                      Link a password (minimum 6 characters) to your verified
                      admin email so you can sign in using either Google or
                      Email + Password. Enable{' '}
                      <strong>Email/Password</strong> inside Firebase Console →
                      Authentication → Sign-in method first.
                    </p>
                    {passwordError && (
                      <p className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
                        {passwordError}
                      </p>
                    )}
                    {passwordStatus && (
                      <p className="p-2.5 rounded-lg bg-green-50 border border-green-200 text-xs text-green-700">
                        {passwordStatus}
                      </p>
                    )}
                    <div className="flex gap-2">
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="New password (min 6 chars)"
                        className="flex-1 px-3 py-2 rounded-lg border border-zinc-300 text-sm"
                      />
                      <button
                        type="submit"
                        className="px-4 py-2 text-xs font-semibold text-zinc-950 bg-[#EBFC68] hover:bg-[#e1f645] rounded-lg border border-zinc-950/15 cursor-pointer"
                      >
                        Link Password
                      </button>
                    </div>
                  </form>
                </div>

                {/* Cloud Sync Status */}
                <div className="rounded-xl border border-zinc-200 bg-white p-6 space-y-4">
                  <div className="flex items-center gap-2.5">
                    <ShieldCheck className="w-5 h-5 text-zinc-950" aria-hidden="true" />
                    <h2 className="font-display text-xl font-bold uppercase text-zinc-950">
                      Cloud Database Status
                    </h2>
                  </div>
                  <div className="space-y-2.5 text-sm">
                    <div className="p-3 rounded-lg bg-zinc-50 border border-zinc-200 flex items-center justify-between">
                      <span>Catalog Products ({products.length})</span>
                      <span
                        className={`text-xs font-semibold px-2 py-0.5 rounded ${
                          hasCloudProducts
                            ? 'bg-green-50 text-green-700'
                            : 'bg-amber-50 text-amber-700'
                        }`}
                      >
                        {hasCloudProducts ? 'Synced' : 'Local Default'}
                      </span>
                    </div>
                    <div className="p-3 rounded-lg bg-zinc-50 border border-zinc-200 flex items-center justify-between">
                      <span>Storefront &amp; Gateways Config</span>
                      <span
                        className={`text-xs font-semibold px-2 py-0.5 rounded ${
                          hasCloudConfig
                            ? 'bg-green-50 text-green-700'
                            : 'bg-amber-50 text-amber-700'
                        }`}
                      >
                        {hasCloudConfig ? 'Synced' : 'Local Default'}
                      </span>
                    </div>
                    <div className="p-3 rounded-lg bg-zinc-50 border border-zinc-200 flex items-center justify-between">
                      <span>Coupons &amp; Promos ({coupons.length})</span>
                      <span
                        className={`text-xs font-semibold px-2 py-0.5 rounded ${
                          hasCloudCoupons
                            ? 'bg-green-50 text-green-700'
                            : 'bg-amber-50 text-amber-700'
                        }`}
                      >
                        {hasCloudCoupons ? 'Synced' : 'Local Default'}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={seeding}
                    onClick={handleSeed}
                    className="w-full py-2.5 px-4 text-xs font-semibold text-white bg-zinc-950 hover:bg-zinc-800 rounded-lg cursor-pointer disabled:opacity-50"
                  >
                    {seeding ? 'Syncing...' : 'Sync Missing Defaults to Cloud'}
                  </button>
                </div>
              </div>

              {/* Co-Admin Registry (Root Owner Only) */}
              {isRootAdmin && (
                <div className="rounded-xl border border-zinc-200 bg-white p-6 space-y-5">
                  <div>
                    <h2 className="font-display text-xl font-bold uppercase text-zinc-950">
                      Staff &amp; Co-Admin Access Registry
                    </h2>
                    <p className="mt-1 text-xs text-zinc-500">
                      Grant catalog &amp; storefront access to verified team
                      members using their Firebase Auth UID.
                    </p>
                  </div>

                  {teamError && (
                    <p className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
                      {teamError}
                    </p>
                  )}

                  <form
                    onSubmit={handleAddAdminSubmit}
                    className="grid grid-cols-1 sm:grid-cols-3 gap-3"
                  >
                    <input
                      type="text"
                      required
                      value={newAdminUid}
                      onChange={(e) => setNewAdminUid(e.target.value)}
                      placeholder="Staff Firebase UID"
                      className="px-3 py-2 rounded-lg border border-zinc-300 text-xs font-mono"
                    />
                    <input
                      type="email"
                      required
                      value={newAdminEmail}
                      onChange={(e) => setNewAdminEmail(e.target.value)}
                      placeholder="staff@gmail.com"
                      className="px-3 py-2 rounded-lg border border-zinc-300 text-xs"
                    />
                    <button
                      type="submit"
                      className="px-4 py-2 text-xs font-semibold text-zinc-950 bg-[#EBFC68] hover:bg-[#e1f645] rounded-lg border border-zinc-950/15 cursor-pointer"
                    >
                      Add Co-Admin
                    </button>
                  </form>

                  {adminMembers.length > 0 && (
                    <div className="divide-y divide-zinc-200 border-t border-zinc-200 pt-2">
                      {adminMembers.map((member) => (
                        <div
                          key={member.uid}
                          className="py-3 flex items-center justify-between gap-4 text-xs"
                        >
                          <div>
                            <p className="font-semibold text-zinc-950">
                              {member.email}
                            </p>
                            <p className="font-mono text-zinc-500">{member.uid}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => onRemoveAdmin(member.uid)}
                            className="px-2.5 py-1 text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 rounded cursor-pointer"
                          >
                            Revoke
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Order Detail & Printable Packing Slip Modal */}
      {selectedOrder && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/60 p-4 overflow-y-auto print:static print:bg-white print:p-0"
          role="dialog"
          aria-modal="true"
          aria-label="Order Details and Packing Slip"
          onClick={() => setSelectedOrder(null)}
        >
          <div
            className="w-full max-w-xl bg-white rounded-2xl border border-zinc-200 p-6 sm:p-8 my-auto space-y-5 print:border-0 print:rounded-none print:max-w-none"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 pb-4 border-b border-zinc-200">
              <div>
                <p className="font-mono text-xs text-zinc-500">
                  {storeConfig.brandName} · Packing Slip &amp; Order Receipt
                </p>
                <h2 className="mt-1 font-display text-2xl font-bold uppercase text-zinc-950">
                  Order #{selectedOrder.orderNumber}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                aria-label="Close order details"
                className="w-9 h-9 inline-flex items-center justify-center rounded-lg border border-zinc-200 text-zinc-700 hover:bg-zinc-100 cursor-pointer print:hidden"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200 space-y-1">
                <p className="text-xs font-semibold uppercase text-zinc-500">
                  Ship To
                </p>
                <p className="font-semibold text-zinc-950">
                  {selectedOrder.customerName}
                </p>
                <p className="text-xs text-zinc-700 leading-relaxed">
                  {selectedOrder.address}
                </p>
                <p className="font-mono text-xs text-zinc-900">
                  PIN: {selectedOrder.pincode} · Ph: {selectedOrder.phone}
                </p>
              </div>
              <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200 space-y-1.5">
                <p className="text-xs font-semibold uppercase text-zinc-500">
                  Order Info
                </p>
                <p className="text-xs text-zinc-700">
                  Email:{' '}
                  <span className="font-mono">{selectedOrder.customerEmail}</span>
                </p>
                <p className="text-xs text-zinc-700">
                  Payment:{' '}
                  <span className="font-mono font-semibold">
                    {selectedOrder.paymentMethod}
                  </span>
                </p>
                <p className="text-xs text-zinc-700">
                  Status:{' '}
                  <span className="font-semibold">{selectedOrder.status}</span>
                </p>
                {selectedOrder.promoCode && (
                  <p className="text-xs text-emerald-700 font-mono">
                    Promo: {selectedOrder.promoCode}
                  </p>
                )}
              </div>
            </div>

            <div className="border border-zinc-200 rounded-xl overflow-hidden">
              <div className="px-4 py-2.5 bg-zinc-50 border-b border-zinc-200 text-xs font-semibold uppercase text-zinc-500">
                Items ({selectedOrder.itemCount})
              </div>
              <ul className="divide-y divide-zinc-200 text-sm">
                {selectedOrder.itemsSummary.map((line, idx) => (
                  <li key={idx} className="px-4 py-2.5 text-zinc-800">
                    {line}
                  </li>
                ))}
              </ul>
              <div className="px-4 py-3 bg-zinc-50 border-t border-zinc-200 space-y-1 text-xs">
                <div className="flex justify-between text-zinc-600">
                  <span>Subtotal</span>
                  <span className="font-mono">
                    ₹{selectedOrder.subtotal.toLocaleString('en-IN')}
                  </span>
                </div>
                {selectedOrder.discount > 0 && (
                  <div className="flex justify-between text-emerald-700">
                    <span>Discount</span>
                    <span className="font-mono">
                      −₹{selectedOrder.discount.toLocaleString('en-IN')}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-zinc-600">
                  <span>Shipping</span>
                  <span className="font-mono">
                    {selectedOrder.shippingFee === 0
                      ? 'Free'
                      : `₹${selectedOrder.shippingFee}`}
                  </span>
                </div>
                <div className="flex justify-between pt-1.5 border-t border-zinc-200 text-sm font-bold text-zinc-950">
                  <span>Total</span>
                  <span className="font-mono">
                    ₹{selectedOrder.total.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 print:hidden">
              <div className="flex flex-wrap gap-1.5">
                {ORDER_STATUSES.map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={async () => {
                      await onUpdateOrderStatus(selectedOrder.id, st);
                      setSelectedOrder({ ...selectedOrder, status: st });
                    }}
                    className={`px-2.5 py-1.5 text-xs font-semibold rounded border cursor-pointer ${
                      selectedOrder.status === st
                        ? 'bg-zinc-950 text-[#EBFC68] border-zinc-950'
                        : 'bg-white text-zinc-700 border-zinc-300 hover:bg-zinc-100'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-zinc-950 bg-[#EBFC68] hover:bg-[#e1f645] rounded-lg border border-zinc-950/15 cursor-pointer"
              >
                <Printer className="w-4 h-4" aria-hidden="true" />
                <span>Print Packing Slip</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Product Create / Edit Modal */}
      {editingProduct && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/60 p-4 overflow-y-auto print:hidden"
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
