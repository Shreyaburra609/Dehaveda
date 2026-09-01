# DEHA VEDA ECOSYSTEM — Deployment Guide

Stack: React (CRA) frontend · FastAPI backend · MongoDB.

## 1. Environment variables

Copy `/app/.env.example`. Backend needs:

| Variable | Purpose |
|---|---|
| `MONGO_URL` | MongoDB connection string |
| `DB_NAME` | Database name |
| `CORS_ORIGINS` | Comma-separated allowed origins (set to your real domain in production) |
| `JWT_SECRET` | 64-char random hex — `openssl rand -hex 32` |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | First admin, seeded on startup |
| `EMERGENT_LLM_KEY` | AI assistant key (or your own provider key) |
| `PAYMENT_UPI_ID` | Shown beside the QR code |

Frontend needs `REACT_APP_BACKEND_URL` pointing at the backend origin. All frontend
variables must be present at **build** time.

## 2. Database

MongoDB Atlas (managed) or self-hosted. Indexes are created automatically on backend
startup: unique `users.email`, unique `foods.name`, `scores(user_id, created_at)`,
`chat_messages(session_id, created_at)`, `payment_claims(status, created_at)`.

Seed data (foods, plans) loads automatically on first boot.

## 3. Deploy backend

```
pip install -r backend/requirements.txt
uvicorn server:app --host 0.0.0.0 --port 8001
```
Run behind a reverse proxy with TLS. Keep `/api` as the route prefix.

## 4. Deploy frontend

```
cd frontend && yarn install && yarn build
```
Serve `frontend/build` as a static site with SPA fallback (all unknown paths → `index.html`).

## 5. Custom domain, DNS and HTTPS

1. Buy the domain (this gives you DNS only — not hosting, database, email or payments).
2. Point an `A`/`ALIAS` record at the frontend host, and a `CNAME` such as `api.` at the backend host.
3. Enable TLS on both hosts (Let's Encrypt or the platform's managed certificate).
4. Set `CORS_ORIGINS` to `https://your-domain.com` and rebuild the frontend with the API URL.

## 6. First admin account

Set `ADMIN_EMAIL` and `ADMIN_PASSWORD`, then restart the backend. The account is created
if missing, and its password is re-synced if you change the env value. Log in and open `/admin`.

## 7. Your QR code

Replace `frontend/public/payment-qr.png` with your real QR image (square, at least 512×512),
set `PAYMENT_UPI_ID`, then rebuild the frontend. Premium activates only after an admin verifies
a submitted transaction reference in **Admin → Payments**.

## 8. Online payment provider (not enabled yet)

The membership flow is provider-agnostic. To add Stripe or Razorpay checkout, add the provider
keys to the backend environment, create a checkout-session endpoint, and verify the provider
webhook signature before marking a subscription active. Never store card data.

## 9. AI assistant

The key is read server-side only and is never exposed to the browser. Free accounts are limited
to 10 messages a day, premium to 100; adjust in `backend/server.py`.
