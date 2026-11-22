# Security Specification — Toy Tron Storefront & Admin Console

## 1. Data Invariants
1. **Public Catalog Integrity**: `products` and `storeConfig` are publicly readable for storefront browsing, while all mutations (`create`, `update`, `delete`) require a verified administrator (`isAdmin()`).
2. **No Private Payment Secrets in Client/Firestore**: `storeConfig` stores strictly public gateway identifiers (`razorpayKeyId`, `stripePublishableKey`, `upiId`) and boolean toggles; secret keys (`sk_live_*`, Razorpay Key Secret) are never persisted in Firestore or exposed in client bundles.
3. **Order Ownership & PII Isolation**: Every `order` document includes PII (`phone`, `address`, `pincode`, `customerEmail`). Reads (`get` and `list`) are strictly restricted to the owning `customerUid` or `isAdmin()`.
4. **Order Immutability & Status Governance**: Customers can only create orders with `customerUid == request.auth.uid`, initial status `'Confirmed'`, and server timestamps (`request.time`). Customers cannot mutate order status, totals, or ownership after placement; only admins can advance `status` or edit order state.
5. **Privilege Escalation Prevention**: Only verified admins (`skillify07@gmail.com` with `email_verified == true` or existing `/admins/{uid}` entries) can write to `/admins`, `/products`, or `/storeConfig`. Standard user profiles in `/users/{userId}` have no role or privilege fields.
6. **Bounded Payloads & Safe URLs**: All strings enforce explicit `.size()` bounds, document IDs match `^[a-zA-Z0-9_\-]+$`, arrays (`variants`, `itemsSummary`) are bounded (`<= 8` / `<= 25`), and image URLs reject `javascript:` / `data:` schemes.

## 2. Red Team "Dirty Dozen" Payloads (Expected: `PERMISSION_DENIED`)
1. **Unauthenticated Product Write**: Anonymous `create` on `/products/fake-car` -> Denied (`isAdmin()` fails).
2. **Non-Admin StoreConfig Hijack**: Signed-in shopper attempts `update` on `/storeConfig/main` changing `upiId` -> Denied (`isAdmin()` fails).
3. **Unverified Admin Email Spoof**: Token with `email: 'skillify07@gmail.com'` and `email_verified: false` attempts write on `/products/new` -> Denied (`isVerifiedUser()` requires `email_verified == true`).
4. **Order Cross-Tenant Read (`get`)**: Shopper A requests `get(/orders/order-belonging-to-B)` -> Denied (`customerUid != request.auth.uid`).
5. **Order Blanket Scrape (`list`)**: Shopper A runs `getDocs(collection(db, 'orders'))` without matching `where('customerUid', '==', uid)` -> Denied by `allow list` rule evaluating `resource.data.customerUid`.
6. **Order Identity Spoofing**: Shopper A creates an order with `customerUid: 'victim-uid'` -> Denied (`incoming().customerUid == request.auth.uid`).
7. **Order Status Shortcutting**: Shopper A creates an order with `status: 'Delivered'` -> Denied (`incoming().status == 'Confirmed'`).
8. **Shadow Field Injection on Order**: Shopper A includes `isPaid: true` ghost field in `create` payload -> Denied (`data.keys().hasOnly(...)`).
9. **Client Timestamp Forgery**: Shopper A submits `createdAt` set to past date instead of `serverTimestamp()` -> Denied (`incoming().createdAt == request.time`).
10. **ID Poisoning**: Admin/user attempts write with 200-char or slash-injected document ID -> Denied (`isValidId()` fails).
11. **XSS Scheme in Product Image**: Admin or attacker submits `image: "javascript:alert(1)"` -> Denied (`isSafeMediaUrl()` rejects).
12. **Self-Admin Escalation**: Regular signed-in user attempts `setDoc(/admins/{myUid})` -> Denied (`isAdmin()` required).
