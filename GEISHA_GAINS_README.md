# ☕ GEISHA GAINS
**Brutalist Crypto Trading Simulator**

> Built by **Coffee Driven Development** for BugsByte 2026 Hackathon  
> Powered by **Uphold** + **NVIDIA NIM (Llama-3)**

---

## 🎯 PROJECT OVERVIEW

Geisha Gains is a **high-stakes, Brutalist-themed crypto trading simulator** that combines real-time market data from Uphold with AI-powered trading analysis from NVIDIA NIM. The app features a unique "Caffeine Overdrive" mode that bypasses AI confidence checks and executes aggressive trades.

### The Brutalist Aesthetic

- **White backgrounds** with **pure black text**
- **#FF0000 (Red)** accents for urgency and danger
- **border-4 border-black** on everything
- **No rounded corners** (except where critically needed)
- **Monospace fonts** for numbers
- **Glitch effects** during Overdrive mode

---

## 🏗️ ARCHITECTURE

### Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript + JavaScript
- **Database**: PostgreSQL + Prisma ORM
- **AI**: NVIDIA NIM API (Llama-3 70B)
- **Market Data**: Uphold API
- **Styling**: Tailwind CSS (Brutalist theme)
- **State**: React Context API

### Core Systems

1. **NVIDIA NIM Integration** - AI market analysis with confidence scoring
2. **Uphold API** - Real-time crypto prices (BTC, ETH, XRP)
3. **Prisma Database** - User wallets, transactions, market snapshots
4. **Caffeine Overdrive** - Power-up system that bypasses AI checks
5. **SVG Charts** - Raw, superimposed price/signal visualization

---

## 🚀 QUICK START

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Database

Create a PostgreSQL database and configure the connection:

```bash
cp .env.example .env
```

Edit `.env` and add your `DATABASE_URL`:

```
DATABASE_URL="postgresql://user:password@localhost:5432/geisha_gains"
```

### 3. Run Prisma Migrations

```bash
npx prisma generate
npx prisma db push
```

### 4. Configure API Keys

Add your NVIDIA NIM credentials to `.env`:

```
NVIDIA_NIM_ENDPOINT="https://integrate.api.nvidia.com/v1/chat/completions"
NVIDIA_API_KEY="your-nvidia-api-key"
```

### 5. Start Development Server

```bash
npm run dev
```

Open [http://localhost:3000/dashboard](http://localhost:3000/dashboard)

---

## 📁 PROJECT STRUCTURE

```
bugsbyte2526/
├── prisma/
│   └── schema.prisma           # Database schema (User, Wallet, Transaction, MarketSnap)
├── lib/
│   ├── nvidia-nim.ts           # NVIDIA NIM API service
│   ├── uphold-api.ts           # Uphold market data service
│   └── prisma.ts               # Prisma client singleton
├── contexts/
│   └── UberChargeContext.tsx   # Caffeine Overdrive state management
├── components/
│   ├── CoffeePot.tsx           # Caffeine meter UI
│   ├── TradeLog.tsx            # Transaction history table
│   └── PriceChart.tsx          # SVG-based price chart
├── app/
│   ├── api/trade/analyze/
│   │   └── route.ts            # Main trading API endpoint
│   ├── dashboard/
│   │   └── page.tsx            # Main dashboard UI
│   ├── globals.css             # Brutalist theme + glitch effects
│   └── layout.js               # Root layout with UberChargeProvider
└── tailwind.config.js          # Tailwind customization
```

---

## ⚡ KEY FEATURES

### 1. NVIDIA NIM AI Analysis

The app calls the NVIDIA NIM API every 10 seconds to analyze market conditions:

```typescript
// lib/nvidia-nim.ts
analyzeMarketWithNIM(marketData) → {
  symbol: "BTC",
  action: "BUY" | "SELL" | "HOLD",
  confidence: 0-100,
  reasoning: "AI explanation"
}
```

**Normal Mode**: Trades execute only when `confidence > 75`

**Overdrive Mode**: Bypasses confidence check entirely

### 2. Caffeine Overdrive (The Gimmick)

A "Coffee Machine" meter that charges passively and from successful trades:

- **Charge Rate**: +1% every 5 seconds (passive) + 10% per successful trade
- **Activation**: Click button at 100% charge
- **Duration**: 5 minutes (300 seconds)
- **Effect**: 
  - Bypasses AI confidence checks
  - Executes trades on ANY positive signal
  - **Glitch visual effect** on entire dashboard
  - Trades marked with red `[GLITCH]` tag

### 3. Brutalist UI Components

All components follow strict Brutalist design:

```jsx
<div className="border-4 border-black bg-white p-4 hover:bg-red-500">
  <h2 className="text-2xl font-black uppercase">TITLE</h2>
</div>
```

### 4. SVG Superimposed Graphics

Instead of Chart.js, we use raw SVG for "Brutalist" aesthetics:

- **Price Line**: Thick black stroke
- **Buy Signals**: Black circles with heatmap
- **Sell Signals**: Red circles with heatmap
- **Grid**: Minimal black lines

### 5. Real-Time Market Data

Fetches prices from Uphold API:

```
GET https://api.uphold.com/v0/ticker/BTC-USD
```

Fallback to realistic mock data if API unavailable.

---

## 🎨 DESIGN SYSTEM

### Colors

| Element | Color | Hex |
|---------|-------|-----|
| Background | White | `#FFFFFF` |
| Text | Black | `#000000` |
| Borders | Black | `#000000` (4px) |
| Accent | Red | `#FF0000` |
| Glitch BG | Red | `#EF4444` |

### Typography

- **Headers**: Font-black, uppercase, tracking-tight
- **Numbers**: Monospace (Courier New)
- **Body**: Roboto 400/700

### Effects

- **Glitch Text** (Overdrive): CSS animation with RGB split
- **Glitch Background** (Overdrive): Pulsing red with jitter
- **Float Animation**: Subtle up/down for steam bubbles
- **Sharp Shadows**: `box-shadow: 4px 4px 0 #000000`

---

## 🔌 API ENDPOINTS

### POST `/api/trade/analyze`

Analyzes market and executes trades.

**Request Body**:
```json
{
  "userId": "demo-user-001",
  "isOverdrive": false
}
```

**Response**:
```json
{
  "success": true,
  "marketPrices": [...],
  "analyses": [...],
  "executedTrades": [...],
  "wallet": { ... }
}
```

### GET `/api/trade/analyze?userId=xxx`

Fetches transaction history and wallet state.

---

## 🧪 TESTING & DEMO

### Mock Mode (No API Keys)

The app works perfectly without NVIDIA NIM or Uphold API keys:

- **NVIDIA NIM**: Falls back to intelligent mock analysis
- **Uphold API**: Generates realistic price movements
- **Database**: Can use SQLite for quick testing

### Demo Workflow

1. Start app → Auto-analyzes market every 10s
2. Watch Caffeine meter charge passively
3. Execute trades when AI confidence > 75
4. Charge reaches 100% → Click "ACTIVATE CAFFEINE OVERDRIVE"
5. **Dashboard turns red** with glitch effects
6. Aggressive trades execute for 5 minutes
7. Check Trade Log for `[GLITCH]` tagged transactions

---

## 🏆 HACKATHON JUDGING TIPS

### What Judges Will Love

✅ **Unique Gimmick**: The "Caffeine Overdrive" power-up is memorable  
✅ **Real AI Integration**: Actually uses NVIDIA NIM (not just buzzwords)  
✅ **Brutalist Aesthetic**: Stands out from polished, rounded UIs  
✅ **Technical Depth**: Prisma + PostgreSQL + TypeScript + AI  
✅ **SVG Graphics**: Shows understanding of fundamentals vs. libraries  
✅ **Glitch Effects**: High-effort visual feedback for state changes  

### Live Demo Script

1. **Open Dashboard** - "Here's our Brutalist crypto trading simulator"
2. **Show Caffeine Meter** - "This charges from trades and time"
3. **Trigger Analysis** - "Watch the AI analyze BTC/ETH/XRP in real-time"
4. **Point Out Trade Log** - "Confidence scores from NVIDIA NIM"
5. **Activate Overdrive** - "And here's the magic..." (dashboard glitches)
6. **Show Glitch Trades** - "Notice the [GLITCH] tags in red"
7. **Emphasize Speed** - "Overdrive bypasses AI - pure aggression"

---

## 🛠️ TROUBLESHOOTING

### Prisma Errors

```bash
# Reset database
npx prisma migrate reset

# Regenerate client
npx prisma generate
```

### NVIDIA NIM Rate Limits

The app automatically falls back to mock analysis. For production:

```typescript
// Implement exponential backoff
// Cache results for 5 seconds
```

### Styling Issues

All Brutalist classes are in `globals.css`:

- `.glitch-text` - Text jitter effect
- `.glitch-bg` - Background pulse
- `.brutalist-hover` - Red hover state

---

## 📦 DEPLOYMENT

### Environment Variables

```bash
DATABASE_URL="postgresql://..."
NVIDIA_NIM_ENDPOINT="https://..."
NVIDIA_API_KEY="nvapi-..."
```

### Build

```bash
npm run build
npm start
```

### Docker (Optional)

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npx prisma generate
RUN npm run build
CMD ["npm", "start"]
```

---

## 👥 TEAM

**Coffee Driven Development**  
BugsByte 2026 Hackathon

**Stack**: Next.js + Prisma + NVIDIA NIM + Uphold  
**Theme**: Brutalism meets Fintech  
**Gimmick**: Caffeine-powered trading overdrive  

---

## 📝 LICENSE

MIT License - BugsByte 2026

---

## 🙏 ACKNOWLEDGMENTS

- **Uphold** - Real-time crypto market data API
- **NVIDIA** - NIM platform for Llama-3 inference
- **BugsByte** - Hackathon organization

**Built with ☕ and 💻 in 48 hours**
