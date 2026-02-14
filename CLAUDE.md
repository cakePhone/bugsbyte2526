# CLAUDE.md

Canonical repository documentation for this project.

This file replaces and supersedes prior top-level markdown docs.

## Repository Identity

- Name: `geisha-gains`
- Purpose: hackathon crypto intelligence/trading simulator with AI analysis, portfolio tracking, and arbitrage simulation
- Primary app type: Next.js App Router full-stack app (UI + API routes)
- Database: Prisma + PostgreSQL (schema uses PostgreSQL provider)

## Current Product Scope

The project includes multiple feature tracks:

1. War Room dashboard (news/risk/portfolio workflow)
2. Trade analysis and simulation endpoints
3. Market aggregation + arbitrage detection/simulation
4. Auth/session-based user data and preferences

Recent implementation state includes an arbitrage MVP flow aligned with challenge requirements:

- Multi-exchange monitoring
- Net spread calculation (fees/slippage/transfer costs)
- Simulated synchronized buy/sell execution (atomic DB transaction)
- Real-time dashboard panels for opportunities, orders, and cumulative P&L

## Tech Stack

- Framework: Next.js `14.2.5`
- Runtime UI: React `18.3.1`
- Language: TypeScript + some JavaScript files
- Styling: Tailwind CSS + custom CSS
- Animations/graphics: Framer Motion, Three.js, postprocessing
- ORM: Prisma `5.22.0`
- Auth/session primitives: `jose`

## Project Layout (high signal)

- `app/` — Next.js routes and pages
  - `app/page.tsx` — entry/onboarding/auth landing
  - `app/dashboard/page.tsx` — main operator dashboard
  - `app/strategy/page.tsx`, `app/fund/page.tsx`, `app/settings/page.tsx`
  - `app/api/**` — backend endpoints
- `components/` — reusable UI components (dashboard + trading/arbitrage panels)
- `contexts/` — shared React contexts (prices, overdrive)
- `lib/` — service/domain logic (auth, AI analysis, market data, valuations)
  - `lib/market-aggregator/` — spread + net-profit helpers/fetchers
- `prisma/schema.prisma` — DB schema

## Database Model Summary

Main entities:

- `User` (auth + risk/preferences)
- `Wallet` (USDT balance, holdings JSON, totalPnL)
- `CoinWallet` (symbol-specific coin balances)
- `Transaction` (BUY/SELL/TOPUP/WITHDRAWAL/TRANSFER/ADJUSTMENT + linked legs)
- `MarketSnap` (historical market snapshots)

Notes:

- `Transaction.linkedTxId` is used for paired simultaneous arbitrage legs.
- `Wallet.assets` and user preference/risk profile use JSON fields.

## Key API Routes (selected)

- Auth/session
  - `GET /api/auth/me`
  - `POST /api/auth/login`
  - `POST /api/auth/register`
  - `POST /api/auth/logout`
  - `PUT /api/auth/strategy`

- Market and analysis
  - `GET /api/coins`
  - `GET /api/market/ticker`
  - `GET /api/market/history`
  - `GET /api/news/analyze`
  - `GET /api/strategy-analysis`

- Trading and arbitrage
  - `POST /api/trade/analyze`
  - `GET /api/trade/analyze`
  - `GET /api/arbitrage`
  - `GET /api/market-aggregator`

- User portfolio operations
  - `GET /api/user/data`
  - `GET /api/user/best-buy`
  - `POST /api/user/fund`
  - `GET/POST /api/user/wallets`
  - `POST /api/user/wallets/sell`
  - coin-wallet endpoints under `app/api/user/coin-wallets/**`

## Arbitrage Flow (Current)

`GET /api/arbitrage` now:

1. Runs cross-exchange quote analysis
2. Computes net opportunity from gross spread minus:
   - per-leg trading fees
   - slippage buffer
   - transfer cost
3. Filters executable opportunities
4. Simulates synchronized buy/sell in one Prisma transaction
5. Stores paired order legs in `transactions`
6. Returns opportunities, recent simulated orders, and cumulative P&L

Dashboard integration:

- Polls arbitrage endpoint every 5s via `app/dashboard/hooks/useArbitrageMonitor.ts`
- Renders:
  - exchange spread table
  - opportunity history
  - trade log
  - cumulative arbitrage P&L card

## Scripts

- `npm run dev` — local development
- `npm run build` — production build
- `npm start` — run production server
- `npm run lint` — Next lint (may prompt setup if ESLint config missing)
- `npm run db:generate` — Prisma client generation
- `npm run db:push` — sync schema to DB
- `npm run db:studio` — open Prisma Studio
- `npm run db:seed` — run seed script

## Environment Variables

See `.env.example` for baseline values.

Commonly used keys:

- `DATABASE_URL`
- `NVIDIA_NIM_ENDPOINT`
- `NVIDIA_API_KEY`
- `JWT_SECRET` (recommended in local/prod; code has fallback default if missing)

## Setup (Practical)

1. Install deps: `npm install`
2. Create env file from `.env.example`
3. Configure `DATABASE_URL`
4. Generate/sync Prisma:
   - `npm run db:generate`
   - `npm run db:push`
5. Start app: `npm run dev`

## Operational Notes

- Several API routes intentionally force dynamic behavior due to request/cookie usage.
- Build currently succeeds after dynamic route and Prisma JSON typing fixes.
- Lint may require explicit Next ESLint initialization if not already configured.

## Asset Note

The app references static files under `public/assets/`. If expected images are missing, place them there and load via `/assets/<name>` paths.

## Documentation Policy

This repository should keep only this file as the canonical markdown documentation unless a new doc is explicitly required for a dedicated subsystem.
