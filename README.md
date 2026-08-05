# QuickCart — Food + Grocery quick commerce

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/barakvalley108-afk/Flipkart)

QuickCart is an original, mobile-first food and grocery ordering platform. It combines a customer PWA with secure Super Admin, restaurant, grocery and delivery-rider workspaces. The project is built for PostgreSQL and includes an initial migration, idempotent production seed, Render Blueprint and role-protected server APIs.

This repository is independent from Sabka Delivery. It does not import, deploy or modify Sabka Delivery code or infrastructure.

## Main features

### Customer PWA

- Customer registration and login using phone or email
- Signed HttpOnly session cookie and database-backed account checks
- Multiple serviceable saved addresses and a default address
- Food/Grocery switch, store and category browsing, typo-tolerant search and diet filters
- Variants, food add-ons, stock and availability checks
- Database cart with quantity controls, Buy Now and strict one-store checkout
- Pincode delivery fees, minimum-order validation and limited coupons
- COD checkout plus a payment-provider-ready UPI data model
- Order confirmation, history, detail, timeline, cancellation cutoff, reorder and printable invoice
- Delivery OTP shown to the signed-in customer after rider assignment
- Responsive desktop navigation, mobile bottom navigation, skeletons, empty states and toasts
- Web app manifest and safe offline shell cache; API/order responses are never cached by the service worker

### Super Admin `/admin`

- Today/monthly order and sales metrics, delivery-charge collection and operational counts
- Seven-day sales and order-status charts
- Order management, rider assignment, cancellation and refund states
- Customer and panel-user activation, panel-user creation and password reset
- Restaurant/grocery store creation, approval and open/close control
- Category, product, variant, add-on, stock and expiry-date management
- Serviceable pincodes, pincode delivery fee and minimum-order controls
- Coupon and banner management
- Maintenance mode, rider earning and support settings
- CSV exports for orders, sales, payments and COD
- Admin activity records and printable invoices

### Restaurant `/restaurant`

- Live dashboard, store open/close, new-order polling badge and opt-in browser audio
- Accept/confirm/prepare/ready status progression and rejection before cutoff
- Menu category and item creation, images, pricing, diet, variants and add-ons
- Stock/availability control, daily/monthly sales, order history and invoices

### Grocery `/grocery`

- Live dashboard, store open/close, order acceptance, packing and pickup readiness
- Category/product creation, MRP/sale price, SKU, units and variants
- Stock, low-stock threshold, availability and expiry-date controls
- Daily/monthly sales, order history and invoices

### Delivery rider `/delivery`

- Assigned-order queue and assignment acceptance
- Pickup confirmation, Out for Delivery and four-digit OTP completion
- Customer phone visibility only during Out for Delivery/Delivered
- Google Maps pickup/customer links
- COD collection confirmation, today/monthly earnings and delivery history
- Minimum ₹20 withdrawal-request foundation

## Technology

- Next.js 16 App Router, React 19 and strict TypeScript
- Tailwind CSS 4, centralized design tokens and reusable feature components
- Lucide React icon components (no emoji UI icons)
- PostgreSQL and Prisma ORM
- Zod validation, bcryptjs password hashing and jose JWT signing
- Signed HttpOnly, `SameSite=Lax`, production-secure cookies
- Node.js 22 and Render Blueprint deployment

Brand name, logo text, colors and contact details are centralized in `src/config/brand.ts`.

## Local setup

Requirements: Node.js 22+, npm and PostgreSQL.

```bash
git clone https://github.com/barakvalley108-afk/Flipkart.git
cd Flipkart
git checkout professional-food-grocery-app
npm install
cp .env.example .env
```

Create a local PostgreSQL database and set `DATABASE_URL`. Generate a session secret:

```bash
openssl rand -base64 48
```

Generate a bcrypt hash for each panel password:

```bash
npm run password:hash -- "MyStrongPassword"
```

Paste only the generated hashes into the matching `*_PASSWORD_HASH` variables. Never store plaintext panel passwords or commit `.env`.

Initialize and run:

```bash
npm run db:generate
npm run db:deploy
npm run db:seed
npm run dev
```

Open `http://localhost:3000`.

## Required environment variables

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection URL |
| `SESSION_SECRET` | Random secret with at least 32 characters |
| `SUPER_ADMIN_EMAIL` | Seeded Super Admin login email |
| `SUPER_ADMIN_PASSWORD_HASH` | bcrypt hash for Super Admin |
| `RESTAURANT_EMAIL` | Seeded restaurant-panel login email |
| `RESTAURANT_PASSWORD_HASH` | bcrypt hash for restaurant panel |
| `GROCERY_EMAIL` | Seeded grocery-panel login email |
| `GROCERY_PASSWORD_HASH` | bcrypt hash for grocery panel |
| `DELIVERY_EMAIL` | Seeded rider-panel login email |
| `DELIVERY_PASSWORD_HASH` | bcrypt hash for rider panel |

`NEXT_PUBLIC_APP_URL` is optional for future absolute-link integrations. Do not prefix secrets with `NEXT_PUBLIC_`.

## Prisma and production seeding

```bash
npm run db:generate
npm run db:migrate -- --name describe_change
npm run db:deploy
npm run db:seed
```

The initial migration is in `prisma/migrations/20260805150000_initial`. The seed uses `upsert` and fixed seed identifiers, so repeated deploys add missing demo data without deleting orders, users or production records. Panel accounts are created or updated only when both their email and a valid bcrypt hash are supplied.

Seeded catalog data includes:

- Serviceable pincode `788163`
- One restaurant and one grocery store
- Food/grocery categories, products and variants
- One food add-on
- `WELCOME20` coupon
- Home banner and default commerce settings

## Render deployment

`render.yaml` creates:

- Node 22 web service
- Render PostgreSQL database
- Automatic private `DATABASE_URL`
- Generated `SESSION_SECRET`
- `/api/health` database health check

Build command:

```bash
npm ci --include=dev && npm run build
```

Start command:

```bash
npm run start
```

`npm run start` safely runs `prisma migrate deploy`, the idempotent seed and then the Next.js production server. It respects Render's `PORT`; the Blueprint sets `HOSTNAME=0.0.0.0`.

Deployment steps:

1. Merge the reviewed branch into `main`.
2. Open the Deploy to Render button above or create a Blueprint from this repository.
3. Enter all four panel email/hash pairs when Render requests the `sync: false` values.
4. Deploy and wait for `/api/health` to report `database: connected`.
5. Sign in at `/panel-login`, replace placeholder support contact information, review the seeded pincode and stores, then create real panel users/stores.

For real orders, use a paid Render Postgres plan with backups. The free database is suitable only for short testing.

## Routes

| Area | Route |
| --- | --- |
| Customer store | `/` |
| Customer login/register | `/login`, `/register` |
| Checkout | `/checkout` |
| Orders/profile/support | `/orders`, `/profile`, `/support` |
| Partner login | `/panel-login` |
| Super Admin | `/admin` |
| Restaurant | `/restaurant` |
| Grocery | `/grocery` |
| Delivery rider | `/delivery` |
| Health check | `/api/health` |

## Validation commands

```bash
npm install
npm run db:generate
npm run typecheck
npm run lint
npm test
npm run build
```

The included unit tests validate food/grocery order transitions and the cancellation cutoff. Full mutation smoke testing requires a disposable PostgreSQL database because it creates customers, carts and orders.

## Security notes

- Every protected mutation re-checks the signed session, active database user and role.
- Panel users cannot open another role's route.
- Password hashes are never returned by APIs.
- Login errors are generic and repeated failures are rate limited.
- Login rate limiting is per Node process; use a shared rate-limit store before horizontal scaling.
- Delivery OTPs are stored as bcrypt hashes. The customer receives the temporary OTP in their authenticated notification data.
- Money is stored as integer paise.
- Cart, checkout and stock changes are enforced server-side. Checkout uses a serializable database transaction.
- Cross-store carts are rejected; each order belongs to exactly one store.

## Known limitations

- Razorpay/UPI collection is intentionally not enabled; the schema and payment lifecycle are ready for a provider adapter.
- Browser audio works only while the panel is open and after the user enables sound. Background push is not claimed or implemented.
- Images initially use URLs/local placeholders. `src/lib/image-upload.ts` defines the adapter boundary for Cloudinary.
- Live rider GPS, route optimization, Web Push, WhatsApp and automatic payment refunds are future integrations.
- The initial rate limiter is process-local and should be moved to Render Key Value/another shared store before multi-instance scaling.
- Production e2e testing needs a separate disposable PostgreSQL database and test accounts.

## Roadmap

- Razorpay order creation, webhooks and verified UPI refunds
- Cloudinary upload adapter and signed transformations
- Standards-based Web Push subscriptions
- Rider GPS and customer live map
- Shared distributed rate limiting and background job queue
- Automated PostgreSQL end-to-end workflow tests
- Store settlements, GST configuration and richer financial reconciliation
