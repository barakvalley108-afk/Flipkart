# QuickCart Food & Grocery

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/barakvalley108-afk/Flipkart)

> The included Render Blueprint uses Free instances for testing. Free Render Postgres databases expire after 30 days, so upgrade the database before using this for a real business.

A separate, repo-ready professional foundation for a food and grocery delivery platform.

This project does **not** modify or depend on the existing Sabka Delivery repository.

## Included

- Responsive customer storefront
- Food and grocery switching
- Search, category cards and product cards
- Local cart demo with quantity controls
- Mobile bottom navigation
- Partner login
- Role-protected routes:
  - `/admin`
  - `/restaurant`
  - `/grocery`
  - `/delivery`
- Signed HttpOnly session cookies
- PostgreSQL/Prisma data model
- Render Blueprint (`render.yaml`)
- PWA manifest
- Health endpoint at `/api/health`

## Important status

This repository is the **professional application foundation / Phase 1 UI**.

The storefront and private panel dashboards contain demo catalog/order data. Before production launch, database-backed CRUD APIs, customer login, checkout, payments, live notifications, order state transitions, image upload, maps and delivery tracking must be connected.

## Local setup

1. Install Node.js 22.
2. Copy environment variables:

```bash
cp .env.example .env
```

3. Install packages:

```bash
npm install
```

4. Generate a secure session secret:

```bash
openssl rand -base64 48
```

5. Generate a password hash for each partner role:

```bash
npm run password:hash -- "YourStrongPassword"
```

6. Add your PostgreSQL `DATABASE_URL` and generated hashes to `.env`.
7. Generate Prisma Client (Prisma 7 config is included):

```bash
npm run db:generate
```

8. Create the first migration:

```bash
npm run db:migrate -- --name initial
```

9. Start:

```bash
npm run dev
```

Open `http://localhost:3000`.

## Render deployment

1. Click the **Deploy to Render** button at the top of this README.
2. Sign in to Render and connect GitHub when requested.
3. Review the web service and PostgreSQL resources from `render.yaml`.
4. Add the four panel email and password-hash environment variables.
5. Deploy the Blueprint.

The Blueprint runs:

- Build: `npm install --include=dev && npm run build`
- Start: `npm run start`
- Health check: `/api/health`

## Recommended production build phases

### Phase 2
- Customer account and addresses
- Super Admin product/category CRUD
- Restaurant menu and order management
- Grocery inventory and expiry management
- Rider assignment and OTP completion
- Real order history and invoices

### Phase 3
- Razorpay/UPI
- Push and WhatsApp notifications
- Live GPS tracking
- Coupons and referral wallet
- Returns/refunds
- Analytics and settlement reports
- Image uploads through Cloudinary or S3-compatible storage

## Security notes

- Never commit `.env`.
- Use strong password hashes, not plain passwords.
- Keep all authorization checks server-side near the data mutation.
- Replace environment-based partner credentials with database users before production.
- Add rate limiting and login-attempt controls.
- Restrict Render database access and keep backups enabled.
