import { useEffect, useMemo, useState, type FormEvent } from 'react';
import type { User } from 'firebase/auth';
import {
  AlertCircle,
  CheckCircle2,
  Minus,
  Plus,
  ShoppingBag,
  Tag,
  Trash2,
  X,
} from 'lucide-react';
import {
  BUNDLE_ITEMS,
  type Coupon,
  type PaymentMethodId,
  type Product,
  type StoreConfig,
} from '../data/products';
import type { NewOrderInput } from '../hooks/useStoreData';
import { ResilientImage } from './ResilientImage';

export interface CartItem {
  product: Product;
  variant: string;
  quantity: number;
}

interface CartDrawerProps {
  isOpen: boolean;
  initialStep?: 'bag' | 'checkout';
  items: CartItem[];
  storeConfig: StoreConfig;
  coupons: Coupon[];
  user: User | null;
  onSignIn: () => Promise<void>;
  onPlaceOrder: (input: NewOrderInput) => Promise<string>;
  onClose: () => void;
  onUpdateQuantity: (productId: string, variant: string, delta: number) => void;
  onRemoveItem: (productId: string, variant: string) => void;
  onClearCart: () => void;
}

interface CheckoutErrors {
  fullName?: string;
  phone?: string;
  address?: string;
  pincode?: string;
  general?: string;
}

interface OrderConfirmation {
  orderNumber: string;
  customerName: string;
  paymentMethod: PaymentMethodId;
  total: number;
  itemCount: number;
}

export function CartDrawer({
  isOpen,
  initialStep = 'bag',
  items,
  storeConfig,
  coupons,
  user,
  onSignIn,
  onPlaceOrder,
  onClose,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
}: CartDrawerProps) {
  const availableMethods = useMemo(() => {
    const methods: { id: PaymentMethodId; label: string; note: string }[] = [];
    if (storeConfig.codEnabled) {
      methods.push({
        id: 'COD',
        label: 'Cash on Delivery',
        note: 'Pay via cash or UPI at your doorstep',
      });
    }
    if (storeConfig.upiEnabled) {
      methods.push({
        id: 'UPI',
        label: 'Direct UPI',
        note: `Pay to ${storeConfig.upiId || 'merchant@upi'} (${storeConfig.upiDisplayName})`,
      });
    }
    if (storeConfig.razorpayEnabled) {
      methods.push({
        id: 'RAZORPAY',
        label: 'Razorpay',
        note: storeConfig.razorpayKeyId
          ? `Cards, NetBanking & UPI (${storeConfig.razorpayKeyId.slice(0, 12)}...)`
          : 'Cards, NetBanking & UPI',
      });
    }
    if (storeConfig.stripeEnabled) {
      methods.push({
        id: 'STRIPE',
        label: 'Stripe Cards',
        note: 'Visa, Mastercard & Global Cards',
      });
    }
    if (methods.length === 0) {
      methods.push({
        id: 'COD',
        label: 'Cash on Delivery',
        note: 'Default doorstep payment',
      });
    }
    return methods;
  }, [storeConfig]);

  const [step, setStep] = useState<'bag' | 'checkout' | 'confirmed'>(initialStep);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodId>(
    availableMethods[0].id
  );
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [pincode, setPincode] = useState('');
  const [errors, setErrors] = useState<CheckoutErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [promoInput, setPromoInput] = useState('');
  const [appliedPromoCode, setAppliedPromoCode] = useState<string>('');
  const [promoError, setPromoError] = useState('');
  const [orderConfirmation, setOrderConfirmation] =
    useState<OrderConfirmation | null>(null);

  useEffect(() => {
    if (!availableMethods.some((m) => m.id === paymentMethod)) {
      setPaymentMethod(availableMethods[0].id);
    }
  }, [availableMethods, paymentMethod]);

  useEffect(() => {
    if (user?.displayName && !fullName) {
      setFullName(user.displayName);
    }
  }, [user, fullName]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen && items.length > 0) {
      setStep(initialStep);
    }
  }, [isOpen, initialStep, items.length]);

  if (!isOpen) return null;

  const subtotal = items.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  );
  const hasCompleteTrioBundle = BUNDLE_ITEMS.every((bundleId) =>
    items.some((item) => item.product.id === bundleId && item.quantity > 0)
  );
  const bundleDiscount = hasCompleteTrioBundle
    ? storeConfig.bundleDiscountAmount
    : 0;
  const afterBundleSubtotal = Math.max(0, subtotal - bundleDiscount);

  const activeCoupon = useMemo(
    () =>
      appliedPromoCode
        ? coupons.find(
            (c) => c.active && c.code.toUpperCase() === appliedPromoCode.toUpperCase()
          ) ?? null
        : null,
    [appliedPromoCode, coupons]
  );

  const couponDiscount = useMemo(() => {
    if (!activeCoupon || afterBundleSubtotal < activeCoupon.minOrderAmount) {
      return 0;
    }
    if (activeCoupon.discountType === 'percent') {
      return Math.min(
        afterBundleSubtotal,
        Math.round((afterBundleSubtotal * activeCoupon.discountValue) / 100)
      );
    }
    return Math.min(afterBundleSubtotal, Math.round(activeCoupon.discountValue));
  }, [activeCoupon, afterBundleSubtotal]);

  const totalDiscount = bundleDiscount + couponDiscount;
  const discountedSubtotal = Math.max(0, subtotal - totalDiscount);
  const totalCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const freeThreshold = storeConfig.freeShippingThreshold;
  const qualifiesFreeShipping = discountedSubtotal >= freeThreshold;
  const shippingFee =
    discountedSubtotal === 0 || qualifiesFreeShipping ? 0 : storeConfig.shippingFee;
  const grandTotal = discountedSubtotal + shippingFee;
  const remainingForFreeShipping = Math.max(0, freeThreshold - discountedSubtotal);
  const shippingProgress =
    freeThreshold <= 0
      ? 100
      : Math.min(100, Math.round((discountedSubtotal / freeThreshold) * 100));

  const handleApplyPromo = () => {
    const code = promoInput.trim().toUpperCase();
    setPromoError('');
    if (!code) {
      setPromoError('Enter a promo code first.');
      return;
    }
    const found = coupons.find((c) => c.code.toUpperCase() === code && c.active);
    if (!found) {
      setPromoError('Invalid or expired promo code.');
      return;
    }
    if (afterBundleSubtotal < found.minOrderAmount) {
      setPromoError(
        `Minimum order ₹${found.minOrderAmount.toLocaleString('en-IN')} required for ${found.code}.`
      );
      return;
    }
    setAppliedPromoCode(found.code);
    setPromoInput('');
  };

  const selectedMethodMeta =
    availableMethods.find((m) => m.id === paymentMethod) ?? availableMethods[0];

  const validateCheckout = (): CheckoutErrors => {
    const next: CheckoutErrors = {};
    if (fullName.trim().length < 2) {
      next.fullName = 'Enter recipient full name.';
    }
    if (!/^[6-9]\d{9}$/.test(phone.trim())) {
      next.phone = 'Enter a valid 10-digit Indian mobile number.';
    }
    if (address.trim().length < 8) {
      next.address = 'Enter complete street address & landmark.';
    }
    if (!/^\d{6}$/.test(pincode.trim())) {
      next.pincode = 'Enter a valid 6-digit PIN code.';
    }
    return next;
  };

  const handlePlaceOrder = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) {
      setErrors({ general: 'Please sign in with Google above to place your order.' });
      return;
    }

    const validationErrors = validateCheckout();
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    setSubmitting(true);
    try {
      const itemsSummary = items.map(
        (i) => `${i.product.name} (${i.variant}) × ${i.quantity}`
      );
      const orderNumber = await onPlaceOrder({
        customerName: fullName.trim(),
        phone: phone.trim(),
        address: address.trim(),
        pincode: pincode.trim(),
        paymentMethod,
        subtotal,
        discount: totalDiscount,
        shippingFee,
        total: grandTotal,
        itemCount: totalCount,
        itemsSummary,
        promoCode: couponDiscount > 0 && activeCoupon ? activeCoupon.code : undefined,
      });

      setOrderConfirmation({
        orderNumber,
        customerName: fullName.trim(),
        paymentMethod,
        total: grandTotal,
        itemCount: totalCount,
      });
      setAppliedPromoCode('');
      setPromoInput('');
      onClearCart();
      setStep('confirmed');
    } catch (err) {
      setErrors({
        general:
          err instanceof Error
            ? err.message
            : 'Unable to save order right now. Please try again.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCloseDrawer = () => {
    if (step === 'confirmed') {
      setStep('bag');
      setPhone('');
      setAddress('');
      setPincode('');
      setErrors({});
    }
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-zinc-950/55 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-label="Shopping Bag and Checkout"
      onClick={handleCloseDrawer}
    >
      <div
        className="w-full max-w-md bg-white h-full flex flex-col border-l border-zinc-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-zinc-200 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <ShoppingBag className="w-5 h-5 text-zinc-950" aria-hidden="true" />
            <h2 className="font-display text-lg font-bold uppercase text-zinc-950">
              {step === 'bag' && `Your Bag (${totalCount})`}
              {step === 'checkout' && 'Express Checkout'}
              {step === 'confirmed' && 'Order Confirmed'}
            </h2>
          </div>
          <button
            type="button"
            onClick={handleCloseDrawer}
            aria-label="Close shopping bag"
            className="w-9 h-9 inline-flex items-center justify-center rounded-lg border border-zinc-200 text-zinc-700 hover:bg-zinc-100 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {step === 'confirmed' && orderConfirmation ? (
            <div className="py-8">
              <div className="w-12 h-12 rounded-xl bg-[#EBFC68] text-zinc-950 flex items-center justify-center mb-5">
                <CheckCircle2 className="w-6 h-6" aria-hidden="true" />
              </div>
              <p className="font-mono text-xs font-medium text-zinc-500">
                Order #{orderConfirmation.orderNumber} Confirmed — Preparing Shipment
              </p>
              <h3 className="mt-2 font-display text-2xl font-bold uppercase text-zinc-950">
                Thank you, {orderConfirmation.customerName}
              </h3>
              <p className="mt-3 text-sm text-zinc-600 leading-relaxed">
                Your {orderConfirmation.itemCount}{' '}
                {orderConfirmation.itemCount === 1 ? 'item is' : 'items are'} saved
                to your account and scheduled for dispatch within 24 hours.
              </p>

              <div className="mt-6 p-4 rounded-xl bg-zinc-50 border border-zinc-200 space-y-2.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-zinc-500">Order Reference</span>
                  <span className="font-mono font-semibold text-zinc-950">
                    #{orderConfirmation.orderNumber}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Payment Mode</span>
                  <span className="font-medium text-zinc-950">
                    {orderConfirmation.paymentMethod}
                  </span>
                </div>
                <div className="flex justify-between pt-2 border-t border-zinc-200">
                  <span className="font-semibold text-zinc-950">Total Payable</span>
                  <span className="font-mono font-bold text-zinc-950 tabular-nums">
                    ₹{orderConfirmation.total.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleCloseDrawer}
                className="mt-8 w-full py-3 min-h-[44px] text-sm font-semibold text-white bg-zinc-950 hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
              >
                Continue Browsing
              </button>
            </div>
          ) : items.length === 0 ? (
            <div className="py-16 text-center">
              <p className="font-display text-xl font-bold uppercase text-zinc-950">
                Your bag is empty
              </p>
              <p className="mt-2 text-sm text-zinc-500 max-w-xs mx-auto">
                Add a Hot Wheels pack, die-cast car showpiece, or kinetic desk
                gadget to get started.
              </p>
              <button
                type="button"
                onClick={handleCloseDrawer}
                className="mt-6 px-5 py-2.5 min-h-[40px] text-sm font-semibold text-zinc-950 bg-[#EBFC68] hover:bg-[#e1f645] rounded-lg transition-colors cursor-pointer"
              >
                Explore Products
              </button>
            </div>
          ) : step === 'bag' ? (
            <div className="space-y-5">
              {/* Shipping threshold progress */}
              <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200">
                <p className="text-xs font-medium text-zinc-800 mb-2">
                  {qualifiesFreeShipping
                    ? 'Unlocked Free Express Pan-India Shipping'
                    : `Add ₹${remainingForFreeShipping.toLocaleString('en-IN')} more for Free Express Shipping`}
                </p>
                <div className="h-1.5 w-full rounded-full bg-zinc-200 overflow-hidden">
                  <div
                    className="h-full bg-zinc-950 transition-all duration-300"
                    style={{ width: `${shippingProgress}%` }}
                  />
                </div>
              </div>

              {/* Cart Items */}
              <ul className="divide-y divide-zinc-200">
                {items.map((item) => (
                  <li
                    key={`${item.product.id}-${item.variant}`}
                    className="py-4 flex gap-4"
                  >
                    <div className="w-20 h-20 rounded-lg overflow-hidden bg-zinc-100 border border-zinc-200 shrink-0">
                      <ResilientImage
                        src={item.product.image}
                        alt={item.product.imageAlt}
                        fallbackTitle={item.product.name}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h3 className="text-sm font-semibold text-zinc-950 truncate">
                            {item.product.name}
                          </h3>
                          <p className="text-xs text-zinc-500 mt-0.5">
                            {item.variant}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            onRemoveItem(item.product.id, item.variant)
                          }
                          aria-label={`Remove ${item.product.name}`}
                          className="p-1 text-zinc-400 hover:text-red-600 transition-colors cursor-pointer shrink-0"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="mt-3 flex items-center justify-between gap-2">
                        <div className="inline-flex items-center border border-zinc-200 rounded-md bg-white h-8">
                          <button
                            type="button"
                            onClick={() =>
                              onUpdateQuantity(item.product.id, item.variant, -1)
                            }
                            aria-label="Decrease quantity"
                            className="w-7 h-full inline-flex items-center justify-center text-zinc-700 hover:text-zinc-950 cursor-pointer"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="w-7 text-center font-mono text-xs font-semibold tabular-nums">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              onUpdateQuantity(item.product.id, item.variant, 1)
                            }
                            aria-label="Increase quantity"
                            className="w-7 h-full inline-flex items-center justify-center text-zinc-700 hover:text-zinc-950 cursor-pointer"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>

                        <span className="font-mono text-sm font-semibold text-zinc-950 tabular-nums">
                          ₹
                          {(item.product.price * item.quantity).toLocaleString(
                            'en-IN'
                          )}
                        </span>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <form
              id="checkout-form"
              onSubmit={handlePlaceOrder}
              noValidate
              className="space-y-4"
            >
              {!user ? (
                <div className="p-4 rounded-xl bg-zinc-950 text-white space-y-3">
                  <p className="text-xs font-mono uppercase tracking-wider text-[#EBFC68]">
                    Step 1 · Verify Account
                  </p>
                  <p className="text-xs text-zinc-300 leading-relaxed">
                    Sign in with Google so your order receipt and tracking status
                    are saved securely to your account.
                  </p>
                  <button
                    type="button"
                    onClick={onSignIn}
                    className="w-full py-2.5 px-4 text-xs font-semibold text-zinc-950 bg-[#EBFC68] hover:bg-[#e1f645] rounded-lg cursor-pointer"
                  >
                    Sign in with Google
                  </button>
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-200 flex items-center justify-between text-xs">
                  <span className="text-zinc-600 truncate">
                    Ordering as <strong className="text-zinc-950">{user.email}</strong>
                  </span>
                  <span className="font-mono font-bold text-zinc-950 tabular-nums shrink-0 ml-2">
                    ₹{grandTotal.toLocaleString('en-IN')}
                  </span>
                </div>
              )}

              {errors.general && (
                <p className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
                  {errors.general}
                </p>
              )}

              <div>
                <p className="text-xs font-semibold text-zinc-900 mb-2">
                  Payment Method
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {availableMethods.map((method) => (
                    <button
                      key={method.id}
                      type="button"
                      onClick={() => setPaymentMethod(method.id)}
                      className={`py-2.5 px-3 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
                        paymentMethod === method.id
                          ? 'bg-zinc-950 text-[#EBFC68] border-zinc-950'
                          : 'bg-white text-zinc-700 border-zinc-300 hover:border-zinc-500'
                      }`}
                    >
                      {method.label}
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-xs text-zinc-500 font-mono">
                  {selectedMethodMeta.note}
                </p>
              </div>

              <div>
                <label
                  htmlFor="co-name"
                  className="block text-xs font-medium text-zinc-800 mb-1.5"
                >
                  Full Name
                </label>
                <input
                  id="co-name"
                  type="text"
                  value={fullName}
                  onChange={(e) => {
                    setFullName(e.target.value);
                    if (errors.fullName) setErrors((p) => ({ ...p, fullName: undefined }));
                  }}
                  placeholder="Kabir Verma"
                  className={`w-full px-3 py-2.5 rounded-lg border text-sm ${
                    errors.fullName ? 'border-red-600' : 'border-zinc-300'
                  }`}
                />
                {errors.fullName && (
                  <p className="mt-1 flex items-center gap-1 text-xs text-red-700">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>{errors.fullName}</span>
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="co-phone"
                    className="block text-xs font-medium text-zinc-800 mb-1.5"
                  >
                    Mobile Number
                  </label>
                  <input
                    id="co-phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => {
                      setPhone(e.target.value);
                      if (errors.phone) setErrors((p) => ({ ...p, phone: undefined }));
                    }}
                    placeholder="9876543210"
                    className={`w-full px-3 py-2.5 rounded-lg border text-sm font-mono ${
                      errors.phone ? 'border-red-600' : 'border-zinc-300'
                    }`}
                  />
                  {errors.phone && (
                    <p className="mt-1 text-xs text-red-700">{errors.phone}</p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="co-pin"
                    className="block text-xs font-medium text-zinc-800 mb-1.5"
                  >
                    PIN Code
                  </label>
                  <input
                    id="co-pin"
                    type="text"
                    value={pincode}
                    onChange={(e) => {
                      setPincode(e.target.value);
                      if (errors.pincode) setErrors((p) => ({ ...p, pincode: undefined }));
                    }}
                    placeholder="400001"
                    className={`w-full px-3 py-2.5 rounded-lg border text-sm font-mono ${
                      errors.pincode ? 'border-red-600' : 'border-zinc-300'
                    }`}
                  />
                  {errors.pincode && (
                    <p className="mt-1 text-xs text-red-700">{errors.pincode}</p>
                  )}
                </div>
              </div>

              <div>
                <label
                  htmlFor="co-address"
                  className="block text-xs font-medium text-zinc-800 mb-1.5"
                >
                  Delivery Address
                </label>
                <textarea
                  id="co-address"
                  rows={3}
                  value={address}
                  onChange={(e) => {
                    setAddress(e.target.value);
                    if (errors.address) setErrors((p) => ({ ...p, address: undefined }));
                  }}
                  placeholder="Flat / House No., Building, Street, City"
                  className={`w-full px-3 py-2.5 rounded-lg border text-sm ${
                    errors.address ? 'border-red-600' : 'border-zinc-300'
                  }`}
                />
                {errors.address && (
                  <p className="mt-1 flex items-center gap-1 text-xs text-red-700">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>{errors.address}</span>
                  </p>
                )}
              </div>
            </form>
          )}
        </div>

        {/* Footer Actions */}
        {items.length > 0 && step !== 'confirmed' && (
          <div className="px-6 py-5 border-t border-zinc-200 bg-zinc-50 space-y-3">
            {/* Promo Code Box */}
            {coupons.some((c) => c.active) && (
              <div className="pb-2 border-b border-zinc-200">
                {activeCoupon && couponDiscount > 0 ? (
                  <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-200 text-xs">
                    <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-800">
                      <Tag className="w-3.5 h-3.5" aria-hidden="true" />
                      <span className="font-mono">{activeCoupon.code}</span>
                      <span>applied</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setAppliedPromoCode('')}
                      className="text-emerald-800 hover:text-zinc-950 font-semibold cursor-pointer"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={promoInput}
                        onChange={(e) => {
                          setPromoInput(e.target.value.toUpperCase());
                          if (promoError) setPromoError('');
                        }}
                        placeholder="Promo code (e.g. TOYTRON10)"
                        aria-label="Promo code"
                        className="flex-1 px-3 py-1.5 text-xs font-mono uppercase rounded-lg border border-zinc-300 bg-white focus:outline-none focus:border-zinc-950"
                      />
                      <button
                        type="button"
                        onClick={handleApplyPromo}
                        className="px-3.5 py-1.5 text-xs font-semibold text-white bg-zinc-950 hover:bg-zinc-800 rounded-lg cursor-pointer"
                      >
                        Apply
                      </button>
                    </div>
                    {promoError && (
                      <p className="mt-1 text-[11px] text-red-700">{promoError}</p>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between text-zinc-600">
                <span>Subtotal</span>
                <span className="font-mono tabular-nums">
                  ₹{subtotal.toLocaleString('en-IN')}
                </span>
              </div>
              {bundleDiscount > 0 && (
                <div className="flex justify-between text-emerald-700 font-medium">
                  <span>Collector’s Trio Bundle Savings</span>
                  <span className="font-mono tabular-nums">
                    −₹{bundleDiscount.toLocaleString('en-IN')}
                  </span>
                </div>
              )}
              {couponDiscount > 0 && activeCoupon && (
                <div className="flex justify-between text-emerald-700 font-medium">
                  <span>Promo ({activeCoupon.code})</span>
                  <span className="font-mono tabular-nums">
                    −₹{couponDiscount.toLocaleString('en-IN')}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-zinc-600">
                <span>Express Shipping</span>
                <span className="font-mono tabular-nums">
                  {shippingFee === 0 ? 'Free' : `₹${shippingFee}`}
                </span>
              </div>
              <div className="flex justify-between pt-2 border-t border-zinc-200 font-semibold text-zinc-950">
                <span>Total</span>
                <span className="font-mono tabular-nums">
                  ₹{grandTotal.toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            {step === 'bag' ? (
              <button
                type="button"
                onClick={() => setStep('checkout')}
                className="w-full py-3 min-h-[44px] text-sm font-semibold text-zinc-950 bg-[#EBFC68] hover:bg-[#e1f645] border border-zinc-950/15 rounded-lg transition-colors cursor-pointer"
              >
                Proceed to Checkout
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setStep('bag')}
                  className="px-4 py-3 min-h-[44px] text-sm font-medium text-zinc-800 bg-white border border-zinc-300 hover:bg-zinc-100 rounded-lg transition-colors cursor-pointer"
                >
                  Back
                </button>
                <button
                  type="submit"
                  form="checkout-form"
                  disabled={submitting}
                  className="flex-1 py-3 min-h-[44px] text-sm font-semibold text-zinc-950 bg-[#EBFC68] hover:bg-[#e1f645] border border-zinc-950/15 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                >
                  {submitting
                    ? 'Saving Order...'
                    : `Confirm Order · ₹${grandTotal.toLocaleString('en-IN')}`}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
