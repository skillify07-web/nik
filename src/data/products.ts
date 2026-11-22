export type ProductCategory = 'Car Showpieces' | 'Desk Gadgets' | 'Collectibles';

export type PaymentMethodId = 'COD' | 'UPI' | 'RAZORPAY' | 'STRIPE';

export type OrderStatus =
  | 'Confirmed'
  | 'Packed'
  | 'Shipped'
  | 'Delivered'
  | 'Cancelled';

export interface Product {
  id: string;
  name: string;
  category: ProductCategory;
  price: number;
  compareAtPrice?: number;
  tag?: string;
  image: string;
  imageAlt: string;
  shortDescription: string;
  description: string;
  variants: string[];
  specs: {
    material: string;
    dimensions: string;
    weight: string;
    scaleOrPower: string;
  };
  inStock: boolean;
  featured?: boolean;
}

export interface StoreConfig {
  brandName: string;
  marqueeText: string;
  heroEyebrow: string;
  heroTitle: string;
  heroSubtitle: string;
  heroCtaLabel: string;
  heroProductId: string;
  heroImage: string;
  freeShippingThreshold: number;
  shippingFee: number;
  codEnabled: boolean;
  upiEnabled: boolean;
  upiId: string;
  upiDisplayName: string;
  razorpayEnabled: boolean;
  razorpayKeyId: string;
  stripeEnabled: boolean;
  stripePublishableKey: string;
  supportEmail: string;
  whatsappNumber?: string;
  bundleDiscountAmount: number;
}

export type CouponDiscountType = 'percent' | 'flat';

export interface Coupon {
  code: string;
  discountType: CouponDiscountType;
  discountValue: number;
  minOrderAmount: number;
  description: string;
  active: boolean;
}

export interface AdminMember {
  uid: string;
  email: string;
  addedAtMs: number;
}

export interface OrderRecord {
  id: string;
  orderNumber: string;
  customerUid: string;
  customerEmail: string;
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
  status: OrderStatus;
  promoCode?: string;
  createdAtMs: number;
}

export const STUDIO_IMAGE_PRESETS = [
  {
    label: 'Hot Wheels Track Hero',
    url: '/src/assets/images/hotwheels_hero_promo_1795300472581.jpg',
  },
  {
    label: 'Hot Wheels Collector Trio',
    url: '/src/assets/images/hotwheels_collector_pack_1795300473125.jpg',
  },
  {
    label: 'Apex GT Obsidian 1:18',
    url: '/src/assets/images/car_gt_obsidian_1795299836966.jpg',
  },
  {
    label: 'Heritage 1968 Coupe 1:24',
    url: '/src/assets/images/car_vintage_coupe_1795299837122.jpg',
  },
  {
    label: 'F1 Cockpit Steering Showpiece',
    url: '/src/assets/images/gadget_dashboard_drift_1795299838923.jpg',
  },
  {
    label: 'Gyro-Axis Kinetic Balance',
    url: '/src/assets/images/gadget_kinetic_pendulum_1795299837617.jpg',
  },
  {
    label: 'Spark 2.0 Matrix Speaker',
    url: '/src/assets/images/gadget_synth_speaker_1795299838278.jpg',
  },
  {
    label: 'Unit-01 Mecha Figure',
    url: '/src/assets/images/toy_mecha_bot_1795299838706.jpg',
  },
  {
    label: 'Toy Tron Studio Trio',
    url: '/src/assets/images/toytron_hero_showcase_1795299836583.jpg',
  },
];

export const DEFAULT_STORE_CONFIG: StoreConfig = {
  brandName: 'TOY TRON',
  marqueeText:
    'HOT WHEELS TRACK LEGENDS DROP LIVE — CLICK TO BUY NOW  ·  FREE EXPRESS SHIPPING ABOVE ₹1,499  ·  CASH ON DELIVERY AVAILABLE',
  heroEyebrow: 'Hot Wheels Track Legends Drop · Limited Stock',
  heroTitle: 'Hot Wheels Collector Trio. Built for Track & Desk.',
  heroSubtitle:
    'Grab Toy Tron’s featured 1:64 Hot Wheels die-cast collector drop alongside heavy 1:18 car showpieces, CNC desk gadgets, and articulated collectibles.',
  heroCtaLabel: 'Buy Hot Wheels Drop',
  heroProductId: 'hot-wheels-track-legends',
  heroImage: '/src/assets/images/hotwheels_hero_promo_1795300472581.jpg',
  freeShippingThreshold: 1499,
  shippingFee: 99,
  codEnabled: true,
  upiEnabled: true,
  upiId: 'toytron@upi',
  upiDisplayName: 'Toy Tron Collectibles',
  razorpayEnabled: false,
  razorpayKeyId: '',
  stripeEnabled: false,
  stripePublishableKey: '',
  supportEmail: 'support@toytron.in',
  whatsappNumber: '',
  bundleDiscountAmount: 2000,
};

export const DEFAULT_COUPONS: Coupon[] = [
  {
    code: 'TOYTRON10',
    discountType: 'percent',
    discountValue: 10,
    minOrderAmount: 1499,
    description: '10% off orders ₹1,499 and above',
    active: true,
  },
  {
    code: 'WHEELS200',
    discountType: 'flat',
    discountValue: 200,
    minOrderAmount: 999,
    description: 'Flat ₹200 off Hot Wheels & Car Showpieces above ₹999',
    active: true,
  },
];

export const HOTWHEELS_PROMO_PRODUCT: Product = {
  id: 'hot-wheels-track-legends',
  name: 'Hot Wheels Track Legends 3-Car Collector Set',
  category: 'Car Showpieces',
  price: 1299,
  compareAtPrice: 1699,
  tag: 'Hot Promo',
  image: '/src/assets/images/hotwheels_collector_pack_1795300473125.jpg',
  imageAlt:
    'Three metallic 1:64 scale Hot Wheels die-cast racing cars in crimson, cobalt blue, and matte obsidian on concrete plinth',
  shortDescription:
    'Official 1:64 die-cast racing trio featuring metallic spectra-finish paint, racing decals, and Real Riders rubber tread.',
  description:
    'Curated Hot Wheels Track Legends drop built with full die-cast metal chassis, glossy metallic liveries, and precision low-friction axles. Ready to race on orange tracks or display in an acrylic collector sleeve.',
  variants: ['3-Car Collector Pack', '5-Car Pro Garage Pack', 'Single Chase Edition'],
  specs: {
    material: 'Die-Cast Metal Chassis & Rubber Tires',
    dimensions: '7.5 × 3.2 × 2.4 cm (Per Car)',
    weight: '210 g (Set of 3)',
    scaleOrPower: '1:64 Official Track Scale',
  },
  inStock: true,
  featured: true,
};

export const DEFAULT_PRODUCTS: Product[] = [
  HOTWHEELS_PROMO_PRODUCT,
  {
    id: 'apex-gt-obsidian',
    name: 'Apex GT Obsidian 1:18 Die-Cast',
    category: 'Car Showpieces',
    price: 4999,
    compareAtPrice: 5799,
    tag: 'Best Seller',
    image: '/src/assets/images/car_gt_obsidian_1795299836966.jpg',
    imageAlt:
      'Matte obsidian black 1:18 scale die-cast hypercar showpiece with copper brake calipers on stone plinth',
    shortDescription:
      'Full zinc-alloy body with opening gullwing doors, steerable front axle, and copper-finish calipers.',
    description:
      'Precision-cast at 1:18 collector scale with a satin matte obsidian finish, perforated carbon-look splitter, and rubberized performance tires. Built as an heirloom centerpiece for executive desks and display shelves.',
    variants: ['Matte Obsidian', 'Graphite Carbon'],
    specs: {
      material: 'Heavy Zinc-Alloy & ABS Interior',
      dimensions: '26.5 × 11.4 × 6.8 cm',
      weight: '1,140 g',
      scaleOrPower: '1:18 Collector Scale',
    },
    inStock: true,
    featured: true,
  },
  {
    id: 'gyro-axis-pendulum',
    name: 'Gyro-Axis Kinetic Balance',
    category: 'Desk Gadgets',
    price: 3499,
    tag: 'New Drop',
    image: '/src/assets/images/gadget_kinetic_pendulum_1795299837617.jpg',
    imageAlt:
      'CNC-machined anodized silver and black aluminum kinetic balance desk gadget on travertine surface',
    shortDescription:
      'CNC-machined aluminum orbital sculpture engineered with precision sealed bearings for silent desk motion.',
    description:
      'Set the dual-ring gimbal in motion with one gentle flick and watch it oscillate smoothly for minutes at a time. Balanced on Japanese ABEC-7 stainless bearings for whisper-quiet focus during deep work.',
    variants: ['Anodized Silver / Black', 'Raw Titanium'],
    specs: {
      material: '6061-T6 Machined Aluminum',
      dimensions: '18.0 × 16.5 × 7.5 cm',
      weight: '680 g',
      scaleOrPower: 'Manual Kinetic · Zero Battery',
    },
    inStock: true,
    featured: true,
  },
  {
    id: 'monolith-f1-cockpit',
    name: 'Monolith F1 Steering Showpiece',
    category: 'Car Showpieces',
    price: 4299,
    compareAtPrice: 4899,
    tag: 'Limited Run',
    image: '/src/assets/images/gadget_dashboard_drift_1795299838923.jpg',
    imageAlt:
      'Miniature metallic Formula race car steering wheel dashboard showpiece on weighted black magnetic base',
    shortDescription:
      'Half-scale Formula cockpit wheel with tactile rotary dials and weighted magnetic pivot base.',
    description:
      'Inspired by grand prix telemetry wheels, featuring tactile knurled rotary encoders, carbon-weave faceplates, and an angled anodized aluminum desk stand with a magnetic quick-release mount.',
    variants: ['Carbon / Obsidian Stand', 'Silver Alloy Stand'],
    specs: {
      material: 'Die-Cast Alloy & Woven Composite',
      dimensions: '16.0 × 12.0 × 14.5 cm',
      weight: '890 g',
      scaleOrPower: '1:2 Cockpit Display Scale',
    },
    inStock: true,
    featured: false,
  },
  {
    id: 'spark-matrix-speaker',
    name: 'Spark 2.0 Matrix Audio Cube',
    category: 'Desk Gadgets',
    price: 5499,
    tag: 'Best Seller',
    image: '/src/assets/images/gadget_synth_speaker_1795299838278.jpg',
    imageAlt:
      'Compact brushed aluminum and smoked acrylic wireless desk speaker with amber LED dot-matrix clock display',
    shortDescription:
      'Brushed aluminum Bluetooth 5.3 desk speaker with warm amber dot-matrix clock and tactile volume dial.',
    description:
      'Combines retro hi-fi craftsmanship with crisp acoustic tuning. Features a machined aluminum rotary volume knob, smoked acrylic front plate, warm amber pixel clock, and 18-hour USB-C battery life.',
    variants: ['Brushed Silver / Amber', 'Matte Slate / Amber'],
    specs: {
      material: 'Brushed Aluminum & Smoked Acrylic',
      dimensions: '11.8 × 10.2 × 10.4 cm',
      weight: '720 g',
      scaleOrPower: 'USB-C · 18h Playtime · BT 5.3',
    },
    inStock: true,
    featured: false,
  },
  {
    id: 'unit-01-mecha-toy',
    name: 'Unit-01 Articulated Mecha Figure',
    category: 'Collectibles',
    price: 4999,
    tag: 'Limited Run',
    image: '/src/assets/images/toy_mecha_bot_1795299838706.jpg',
    imageAlt:
      'Articulated designer collectible mecha robot figure in charcoal, cobalt blue, and lime accents on concrete podium',
    shortDescription:
      '28-point articulated collectible action figure with cobalt armor plates, neon-lime vents, and magnetic shield.',
    description:
      'Built around a die-cast inner frame for rock-solid posing without joint sag. Includes interchangeable hand gestures, tactical shield, modular rifle, and a weighted concrete-texture display plinth.',
    variants: ['Cobalt & Acid Lime', 'Stealth Charcoal'],
    specs: {
      material: 'Die-Cast Inner Frame & Matte ABS',
      dimensions: '22.0 × 12.5 × 7.0 cm',
      weight: '540 g',
      scaleOrPower: '28 Articulation Joints',
    },
    inStock: true,
    featured: true,
  },
  {
    id: 'heritage-e-coupe',
    name: 'Heritage 1968 Coupe 1:24 Showpiece',
    category: 'Car Showpieces',
    price: 2899,
    image: '/src/assets/images/car_vintage_coupe_1795299837122.jpg',
    imageAlt:
      'Classic British racing green 1:24 scale vintage sports coupe car showpiece with chrome wire wheels',
    shortDescription:
      'Classic British racing green coupe featuring chrome spoked wheels, tan leather-tone cabin, and hood louvers.',
    description:
      'A timeless automotive silhouette finished in deep gloss racing green with hand-fitted chrome trim, wire-spoke rims, and clear acrylic display cover—ideal for bookshelves, car dashboards, or gifting.',
    variants: ['British Racing Green', 'Silver Birch'],
    specs: {
      material: 'Die-Cast Metal & Chrome Trim',
      dimensions: '19.2 × 7.8 × 5.4 cm',
      weight: '510 g',
      scaleOrPower: '1:24 Collector Scale',
    },
    inStock: true,
    featured: false,
  },
];

export const BUNDLE_ITEMS = [
  'apex-gt-obsidian',
  'gyro-axis-pendulum',
  'unit-01-mecha-toy',
] as const;

export function isSafeMediaUrl(url: string): boolean {
  const trimmed = url.trim();
  if (!trimmed || trimmed.length > 500) return false;
  return /^https?:\/\/.+/.test(trimmed) || /^\/src\/assets\/.+/.test(trimmed);
}
