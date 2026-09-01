# DEHA VEDA ECOSYSTEM — PRD

## Original problem statement
Build a complete, production-ready, responsive full-stack web application called **DEHA VEDA ECOSYSTEM** —
an interactive knowledge and wellness platform built on five pillars: AHARA (food & nutrition), JALA (water),
SWARA (sound & swaras), MANAS (mind + interactive 3D brain) and GAMES (original cognitive games).
Requires: five-pillar dashboard, food database + calorie calculator, water journey/quality/contamination
education, swara explorer with audio, 3D brain, five original mind games with dashboard, site-wide AI chatbot,
authentication, free vs 1-month premium membership, secure payment architecture + owner's QR payment scanner
with manual verification, dynamic member counts from the database, protected admin dashboard with charts,
About/Contact/legal pages, SEO, responsive mobile layouts, loading/error/empty states, deployment guide.

Tagline: **Explore. Understand. Improve.**

## Architecture
- **Frontend**: React (CRA + craco), react-router-dom, Tailwind + shadcn/ui, lucide-react, recharts,
  three + @react-three/fiber (3D brain), Web Audio API (swara tones), sonner toasts.
  Code-split pages via `React.lazy`.
- **Backend**: FastAPI, all routes under `/api`, motor (async MongoDB), PyJWT + bcrypt, SSE streaming for AI chat.
- **Database**: MongoDB. Collections: `users`, `foods`, `plans`, `scores`, `chat_messages`, `payment_claims`,
  `contact_messages`, `page_views`, `login_attempts`, `editable_content`. Indexes created on startup.
  UUID string `id` fields (no raw ObjectId ever leaves the API).
- **AI**: OpenAI `gpt-5.5` via `emergentintegrations` + `EMERGENT_LLM_KEY`, server-side only, streamed over SSE.
  System prompt restricts scope to the five pillars and forbids medical claims/diagnosis.
- **Content**: `backend/content.py` seeds 64 foods (USDA/IFCT), 12 water types, 9-stage water journey,
  10 water-quality parameters (WHO + BIS IS 10500:2012), 7 contamination categories, 8 sound topics,
  7 swaras + 3 variants, 12 manas topics, 8 brain regions, 9 peaceful-mind factors, 5 games, 2 plans.

## User personas
1. **Curious learner** — wants clear, sourced explanations about food, water and the mind.
2. **Self-improver** — uses the calorie calculator and plays games to track personal bests.
3. **Premium member** — pays for the full database, all games and saved history.
4. **Admin/owner** — verifies QR payments, edits plan pricing and food content, monitors growth.

## Core requirements (static)
- Five-pillar dashboard as the homepage centre.
- Member counts must be computed from the database, never hardcoded.
- Premium must only activate after explicit admin verification of a payment reference.
- No secrets in frontend code; all config from environment variables.
- Traditional/cultural claims kept separate from scientific evidence; no medical claims anywhere.

## Implemented (2026-06)
- Homepage: hero, five pillar cards, interactive highlights, live community counters (animated, from
  `/api/stats/community`), DB-driven membership plans, AI assistant section, auto-rotating gallery
  (autoplay + manual prev/next + pause + reduced-motion respect).
- Ahara: searchable/filterable 64-item food database with premium gating, calorie calculator
  (Mifflin-St Jeor, BMR/maintenance/goal range/BMI/protein guide + disclaimer).
- Jala: 12 water types, 9-step interactive journey with per-stage contamination risk, 10-parameter
  explorer (meaning/why/measurement/high/low/reference values), 7 contamination sections, image carousel.
- Swara: 8 sound-physics topics, interactive 7-swara selector with Web Audio sine tones at just-intonation
  ratios, shuddha/komal/tivra explanations, explicit tradition-vs-science note.
- Manas: 12 topics, interactive 3D brain (drag rotate, wheel/button zoom, reset, 8 clickable glowing regions,
  WebGL fallback), 9 peaceful-mind factors with responsible wording.
- Games: 5 original games (Reaction Time, Memory Sequence, Number Memory, Visual Memory, Pattern Recognition),
  premium gating on two, score dashboard (server for logged-in users, localStorage for guests, live refresh),
  Play Again / Try Another Game / View My Scores.
- AI Assistant: floating site-wide widget, SSE streaming, suggestions, daily limits (10 free / 100 premium),
  IP rate limiting, persisted history.
- Auth: JWT (Bearer + httpOnly cookies), bcrypt, per-email brute-force lockout, seeded idempotent admin.
- Membership: DB-stored plans, QR "Scan to Subscribe" with placeholder at `public/payment-qr.png`,
  transaction-reference claim flow → pending → admin verify/reject → premium window extended.
- Admin: protected dashboard with KPIs, 3 recharts (registrations line, game activity bar, member pie),
  payment verification table, users table, plan price editing, food content creation, contact inbox.
- About, Contact (client + server validation), Privacy / Terms / Subscription Policy, 404 page.
- SEO: per-page titles/descriptions/OG/canonical, semantic headings, alt text, robots.txt, sitemap.xml.
- `/app/DEPLOYMENT.md` and `/app/.env.example` for domain, DNS, HTTPS, keys, QR and first admin.

## Backlog
### P0
- Online recurring checkout (Stripe or Razorpay) with webhook signature verification.
- Move rate limiting and login lockout to MongoDB/Redis so they survive restarts and multiple replicas.
### P1
- Split `server.py` into routers (auth, content, games, admin, payments).
- Admin editing for Jala/Swara/Manas content (endpoints exist via `editable_content`, no UI yet).
- Email delivery for contact replies and subscription receipts (Resend/SendGrid).
- Password reset flow.
### P2
- Higher-fidelity brain model (GLTF asset) with lazy download.
- Real swara audio samples instead of synthesised sine tones.
- Leaderboards and streaks for games.
- Replace native `<select>` elements with shadcn Select for theme consistency.

## Next tasks
1. Owner replaces `frontend/public/payment-qr.png` and sets `PAYMENT_UPI_ID`.
2. Decide payment provider, then add checkout + webhook.
3. Add password reset and transactional email.
