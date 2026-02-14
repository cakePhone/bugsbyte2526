# Geisha Gains

Geisha Gains is a hackathon-built crypto intelligence and arbitrage simulation platform with a real-time dashboard, AI-assisted analysis, and simulated execution workflows.

## Team

We are **Coffee Driven Development**:

- Rodrigo Silva — [@rrodrickk](https://github.com/rrodrickk)
- Miguel Santos — [@cakephone](https://github.com/cakephone)
- Diogo Duarte — [@dfrduarte-png](https://github.com/dfrduarte-png)
- Beatriz Campinho — [@bvcc24](https://github.com/bvcc24)

## What this project includes

- Multi-panel dashboard for market/news/risk context
- Arbitrage monitoring across multiple exchanges
- Net spread engine (fees, slippage, transfer cost)
- Simulated synchronized buy/sell execution
- Opportunity history, simulated orders, and cumulative P&L tracking
- User auth, wallet state, and transaction history via Prisma

## Tech stack

- Next.js 14 + React 18
- TypeScript
- Prisma + PostgreSQL
- Tailwind CSS + Framer Motion

## Quick start

```bash
npm install
cp .env.example .env
npm run db:generate
npm run db:push
npm run dev
```

Open `http://localhost:3000`.

## Documentation

For repository architecture, API map, data model, and operational notes, see [CLAUDE.md](./CLAUDE.md).
