import { useCallback, useEffect, useState } from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User,
} from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type Timestamp,
} from 'firebase/firestore';
import {
  auth,
  db,
  googleProvider,
  handleFirestoreError,
  OperationType,
  ROOT_ADMIN_EMAIL,
} from '../firebase';
import {
  DEFAULT_PRODUCTS,
  DEFAULT_STORE_CONFIG,
  isSafeMediaUrl,
  type OrderRecord,
  type OrderStatus,
  type PaymentMethodId,
  type Product,
  type StoreConfig,
} from '../data/products';

function toTimestampMs(val: unknown): number {
  if (val && typeof val === 'object' && 'toMillis' in val) {
    return (val as Timestamp).toMillis();
  }
  return Date.now();
}

export interface ProductInput {
  id?: string;
  name: string;
  category: Product['category'];
  price: number;
  compareAtPrice?: number;
  tag?: string;
  image: string;
  imageAlt: string;
  shortDescription: string;
  description: string;
  variants: string[];
  material: string;
  dimensions: string;
  weight: string;
  scaleOrPower: string;
  inStock: boolean;
  featured: boolean;
}

export interface NewOrderInput {
  customerName: string;
  phone: string;
  address: string;
  pincode: string;
  paymentMethod: PaymentMethodId;
  subtotal: number;
  discount: number;
  shippingFee: number;
  total: number;
  itemCount: number;
  itemsSummary: string[];
}

export function useStoreData() {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const [products, setProducts] = useState<Product[]>(DEFAULT_PRODUCTS);
  const [hasCloudProducts, setHasCloudProducts] = useState(false);
  const [productsLoaded, setProductsLoaded] = useState(false);

  const [storeConfig, setStoreConfig] = useState<StoreConfig>(DEFAULT_STORE_CONFIG);
  const [hasCloudConfig, setHasCloudConfig] = useState(false);

  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [ordersLoaded, setOrdersLoaded] = useState(false);

  // 1. Auth State & Admin Role Resolution
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (nextUser) => {
      setUser(nextUser);
      if (!nextUser || !nextUser.emailVerified) {
        setIsAdmin(false);
        setAuthReady(true);
        return;
      }

      if (nextUser.email === ROOT_ADMIN_EMAIL) {
        setIsAdmin(true);
        setAuthReady(true);
        return;
      }

      try {
        const adminDoc = await getDoc(doc(db, 'admins', nextUser.uid));
        setIsAdmin(adminDoc.exists());
      } catch {
        setIsAdmin(false);
      } finally {
        setAuthReady(true);
      }
    });

    return () => unsub();
  }, []);

  // 2. Public Products Real-Time Sync
  useEffect(() => {
    const q = query(collection(db, 'products'));
    const unsub = onSnapshot(
      q,
      (snapshot) => {
        if (snapshot.empty) {
          setHasCloudProducts(false);
          setProducts(DEFAULT_PRODUCTS);
        } else {
          setHasCloudProducts(true);
          const list: Product[] = snapshot.docs.map((d) => {
            const data = d.data();
            return {
              id: d.id,
              name: String(data.name ?? ''),
              category: data.category as Product['category'],
              price: Number(data.price ?? 0),
              compareAtPrice:
                typeof data.compareAtPrice === 'number' && data.compareAtPrice > 0
                  ? data.compareAtPrice
                  : undefined,
              tag: typeof data.tag === 'string' && data.tag ? data.tag : undefined,
              image: String(data.image ?? ''),
              imageAlt: String(data.imageAlt ?? ''),
              shortDescription: String(data.shortDescription ?? ''),
              description: String(data.description ?? ''),
              variants: Array.isArray(data.variants)
                ? data.variants.map((v) => String(v))
                : ['Standard'],
              specs: {
                material: String(data.material ?? ''),
                dimensions: String(data.dimensions ?? ''),
                weight: String(data.weight ?? ''),
                scaleOrPower: String(data.scaleOrPower ?? ''),
              },
              inStock: Boolean(data.inStock ?? true),
              featured: Boolean(data.featured ?? false),
            };
          });
          list.sort((a, b) => Number(Boolean(b.featured)) - Number(Boolean(a.featured)));
          setProducts(list);
        }
        setProductsLoaded(true);
      },
      (error) => {
        setProductsLoaded(true);
        handleFirestoreError(error, OperationType.LIST, 'products');
      }
    );

    return () => unsub();
  }, []);

  // 3. Public StoreConfig Real-Time Sync
  useEffect(() => {
    const configRef = doc(db, 'storeConfig', 'main');
    const unsub = onSnapshot(
      configRef,
      (snap) => {
        if (!snap.exists()) {
          setHasCloudConfig(false);
          setStoreConfig(DEFAULT_STORE_CONFIG);
        } else {
          setHasCloudConfig(true);
          const d = snap.data();
          setStoreConfig({
            brandName: String(d.brandName ?? DEFAULT_STORE_CONFIG.brandName),
            marqueeText: String(d.marqueeText ?? DEFAULT_STORE_CONFIG.marqueeText),
            heroEyebrow: String(d.heroEyebrow ?? DEFAULT_STORE_CONFIG.heroEyebrow),
            heroTitle: String(d.heroTitle ?? DEFAULT_STORE_CONFIG.heroTitle),
            heroSubtitle: String(d.heroSubtitle ?? DEFAULT_STORE_CONFIG.heroSubtitle),
            heroCtaLabel: String(d.heroCtaLabel ?? DEFAULT_STORE_CONFIG.heroCtaLabel),
            heroProductId: String(d.heroProductId ?? DEFAULT_STORE_CONFIG.heroProductId),
            heroImage: String(d.heroImage ?? DEFAULT_STORE_CONFIG.heroImage),
            freeShippingThreshold: Number(
              d.freeShippingThreshold ?? DEFAULT_STORE_CONFIG.freeShippingThreshold
            ),
            shippingFee: Number(d.shippingFee ?? DEFAULT_STORE_CONFIG.shippingFee),
            codEnabled: Boolean(d.codEnabled ?? true),
            upiEnabled: Boolean(d.upiEnabled ?? true),
            upiId: String(d.upiId ?? DEFAULT_STORE_CONFIG.upiId),
            upiDisplayName: String(
              d.upiDisplayName ?? DEFAULT_STORE_CONFIG.upiDisplayName
            ),
            razorpayEnabled: Boolean(d.razorpayEnabled ?? false),
            razorpayKeyId: String(d.razorpayKeyId ?? ''),
            stripeEnabled: Boolean(d.stripeEnabled ?? false),
            stripePublishableKey: String(d.stripePublishableKey ?? ''),
            supportEmail: String(d.supportEmail ?? DEFAULT_STORE_CONFIG.supportEmail),
            bundleDiscountAmount: Number(
              d.bundleDiscountAmount ?? DEFAULT_STORE_CONFIG.bundleDiscountAmount
            ),
          });
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, 'storeConfig/main');
      }
    );

    return () => unsub();
  }, []);

  // 4. Orders Subscription (Only when auth is ready & user verified)
  useEffect(() => {
    if (!authReady) return;
    if (!user || !user.emailVerified) {
      setOrders([]);
      setOrdersLoaded(true);
      return;
    }

    const ordersQuery = isAdmin
      ? query(collection(db, 'orders'), orderBy('createdAt', 'desc'))
      : query(
          collection(db, 'orders'),
          where('customerUid', '==', user.uid),
          orderBy('createdAt', 'desc')
        );

    const unsub = onSnapshot(
      ordersQuery,
      (snap) => {
        const list: OrderRecord[] = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            orderNumber: String(data.orderNumber ?? d.id),
            customerUid: String(data.customerUid ?? ''),
            customerEmail: String(data.customerEmail ?? ''),
            customerName: String(data.customerName ?? ''),
            phone: String(data.phone ?? ''),
            address: String(data.address ?? ''),
            pincode: String(data.pincode ?? ''),
            paymentMethod: (data.paymentMethod as PaymentMethodId) ?? 'COD',
            subtotal: Number(data.subtotal ?? 0),
            discount: Number(data.discount ?? 0),
            shippingFee: Number(data.shippingFee ?? 0),
            total: Number(data.total ?? 0),
            itemCount: Number(data.itemCount ?? 1),
            itemsSummary: Array.isArray(data.itemsSummary)
              ? data.itemsSummary.map((s) => String(s))
              : [],
            status: (data.status as OrderStatus) ?? 'Confirmed',
            createdAtMs: toTimestampMs(data.createdAt),
          };
        });
        setOrders(list);
        setOrdersLoaded(true);
      },
      (error) => {
        setOrdersLoaded(true);
        handleFirestoreError(error, OperationType.LIST, 'orders');
      }
    );

    return () => unsub();
  }, [authReady, user, isAdmin]);

  // Auth Actions
  const signInWithGoogle = useCallback(async () => {
    await signInWithPopup(auth, googleProvider);
  }, []);

  const signOutUser = useCallback(async () => {
    await signOut(auth);
  }, []);

  // Admin: Seed Initial Products & Config into Firestore
  const seedInitialStoreData = useCallback(async () => {
    const batch = writeBatch(db);

    if (!hasCloudConfig) {
      batch.set(doc(db, 'storeConfig', 'main'), {
        ...DEFAULT_STORE_CONFIG,
        updatedAt: serverTimestamp(),
      });
    }

    if (!hasCloudProducts) {
      for (const item of DEFAULT_PRODUCTS) {
        batch.set(doc(db, 'products', item.id), {
          name: item.name,
          category: item.category,
          price: item.price,
          ...(item.compareAtPrice ? { compareAtPrice: item.compareAtPrice } : {}),
          ...(item.tag ? { tag: item.tag } : {}),
          image: item.image,
          imageAlt: item.imageAlt,
          shortDescription: item.shortDescription,
          description: item.description,
          variants: item.variants,
          material: item.specs.material,
          dimensions: item.specs.dimensions,
          weight: item.specs.weight,
          scaleOrPower: item.specs.scaleOrPower,
          inStock: item.inStock,
          featured: Boolean(item.featured),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
    }

    try {
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'products/storeConfig');
    }
  }, [hasCloudConfig, hasCloudProducts]);

  // Admin: Save (Create or Update) Product
  const saveProduct = useCallback(
    async (input: ProductInput) => {
      const slugBase = input.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 60);
      const productId = input.id || `${slugBase || 'item'}-${Date.now().toString(36)}`;
      const safeImage = isSafeMediaUrl(input.image)
        ? input.image.trim()
        : DEFAULT_PRODUCTS[0].image;

      const variantsClean = input.variants
        .map((v) => v.trim().slice(0, 60))
        .filter(Boolean)
        .slice(0, 8);
      if (variantsClean.length === 0) variantsClean.push('Standard Edition');

      const docRef = doc(db, 'products', productId);
      const basePayload = {
        name: input.name.trim().slice(0, 120),
        category: input.category,
        price: Math.max(1, Math.min(10000000, Math.round(input.price))),
        ...(input.compareAtPrice && input.compareAtPrice > 0
          ? {
              compareAtPrice: Math.min(
                10000000,
                Math.round(input.compareAtPrice)
              ),
            }
          : {}),
        ...(input.tag && input.tag.trim()
          ? { tag: input.tag.trim().slice(0, 30) }
          : {}),
        image: safeImage,
        imageAlt: input.imageAlt.trim().slice(0, 300) || input.name.trim().slice(0, 120),
        shortDescription: input.shortDescription.trim().slice(0, 300),
        description: input.description.trim().slice(0, 1200),
        variants: variantsClean,
        material: input.material.trim().slice(0, 160),
        dimensions: input.dimensions.trim().slice(0, 120),
        weight: input.weight.trim().slice(0, 60),
        scaleOrPower: input.scaleOrPower.trim().slice(0, 120),
        inStock: Boolean(input.inStock),
        featured: Boolean(input.featured),
        updatedAt: serverTimestamp(),
      };

      try {
        const existingSnap = await getDoc(docRef);
        if (existingSnap.exists()) {
          await setDoc(
            docRef,
            {
              ...basePayload,
              createdAt: existingSnap.data().createdAt,
            },
            { merge: false }
          );
        } else {
          await setDoc(docRef, {
            ...basePayload,
            createdAt: serverTimestamp(),
          });
        }
      } catch (error) {
        handleFirestoreError(
          error,
          input.id ? OperationType.UPDATE : OperationType.CREATE,
          `products/${productId}`
        );
      }
    },
    []
  );

  // Admin: Delete Product
  const deleteProduct = useCallback(async (productId: string) => {
    try {
      await deleteDoc(doc(db, 'products', productId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `products/${productId}`);
    }
  }, []);

  // Admin: Save StoreConfig
  const saveStoreConfig = useCallback(async (nextConfig: StoreConfig) => {
    const safeHeroImg = isSafeMediaUrl(nextConfig.heroImage)
      ? nextConfig.heroImage.trim()
      : DEFAULT_STORE_CONFIG.heroImage;
    const heroProdId = /^[a-zA-Z0-9_-]+$/.test(nextConfig.heroProductId)
      ? nextConfig.heroProductId
      : DEFAULT_STORE_CONFIG.heroProductId;

    const payload = {
      brandName: nextConfig.brandName.trim().slice(0, 40) || 'TOY TRON',
      marqueeText: nextConfig.marqueeText.trim().slice(0, 260),
      heroEyebrow: nextConfig.heroEyebrow.trim().slice(0, 100),
      heroTitle: nextConfig.heroTitle.trim().slice(0, 140),
      heroSubtitle: nextConfig.heroSubtitle.trim().slice(0, 360),
      heroCtaLabel: nextConfig.heroCtaLabel.trim().slice(0, 50),
      heroProductId: heroProdId,
      heroImage: safeHeroImg,
      freeShippingThreshold: Math.max(
        0,
        Math.min(100000, Math.round(nextConfig.freeShippingThreshold))
      ),
      shippingFee: Math.max(0, Math.min(10000, Math.round(nextConfig.shippingFee))),
      codEnabled: Boolean(nextConfig.codEnabled),
      upiEnabled: Boolean(nextConfig.upiEnabled),
      upiId: nextConfig.upiId.trim().slice(0, 100),
      upiDisplayName: nextConfig.upiDisplayName.trim().slice(0, 80),
      razorpayEnabled: Boolean(nextConfig.razorpayEnabled),
      razorpayKeyId: nextConfig.razorpayKeyId.trim().slice(0, 80),
      stripeEnabled: Boolean(nextConfig.stripeEnabled),
      stripePublishableKey: nextConfig.stripePublishableKey.trim().slice(0, 120),
      supportEmail: nextConfig.supportEmail.trim().slice(0, 120),
      bundleDiscountAmount: Math.max(
        0,
        Math.min(50000, Math.round(nextConfig.bundleDiscountAmount))
      ),
      updatedAt: serverTimestamp(),
    };

    try {
      await setDoc(doc(db, 'storeConfig', 'main'), payload);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'storeConfig/main');
    }
  }, []);

  // Customer: Place Order in Firestore
  const placeOrder = useCallback(
    async (input: NewOrderInput): Promise<string> => {
      if (!auth.currentUser) {
        throw new Error('Please sign in with Google before placing your order.');
      }

      const orderNumber = `TT-${Math.floor(1000 + Math.random() * 9000)}-${Date.now()
        .toString(36)
        .slice(-3)
        .toUpperCase()}`;

      const safeItems = input.itemsSummary
        .map((s) => s.trim().slice(0, 160))
        .filter(Boolean)
        .slice(0, 25);

      const payload = {
        orderNumber,
        customerUid: auth.currentUser.uid,
        customerEmail: (auth.currentUser.email || 'customer@toytron.in').slice(0, 160),
        customerName: input.customerName.trim().slice(0, 100),
        phone: input.phone.trim().slice(0, 15),
        address: input.address.trim().slice(0, 300),
        pincode: input.pincode.trim().slice(0, 6),
        paymentMethod: input.paymentMethod,
        subtotal: Math.max(0, Math.round(input.subtotal)),
        discount: Math.max(0, Math.round(input.discount)),
        shippingFee: Math.max(0, Math.round(input.shippingFee)),
        total: Math.max(0, Math.round(input.total)),
        itemCount: Math.max(1, Math.min(100, Math.round(input.itemCount))),
        itemsSummary: safeItems.length > 0 ? safeItems : ['Toy Tron Order Item'],
        status: 'Confirmed',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      try {
        await setDoc(doc(db, 'orders', orderNumber), payload);
        return orderNumber;
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, `orders/${orderNumber}`);
      }
    },
    []
  );

  // Admin: Update Order Status
  const updateOrderStatus = useCallback(
    async (orderId: string, status: OrderStatus) => {
      try {
        await updateDoc(doc(db, 'orders', orderId), {
          status,
          updatedAt: serverTimestamp(),
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `orders/${orderId}`);
      }
    },
    []
  );

  return {
    user,
    authReady,
    isAdmin,
    products,
    hasCloudProducts,
    productsLoaded,
    storeConfig,
    hasCloudConfig,
    orders,
    ordersLoaded,
    signInWithGoogle,
    signOutUser,
    seedInitialStoreData,
    saveProduct,
    deleteProduct,
    saveStoreConfig,
    placeOrder,
    updateOrderStatus,
  };
}
