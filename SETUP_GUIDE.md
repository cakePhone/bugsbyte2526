# 🚀 Geisha Gains - Setup Guide

Complete installation and configuration guide for BugsByte 2026 Hackathon.

---

## ⚡ QUICK START (5 MINUTES)

### Step 1: Install Dependencies

```bash
cd bugsbyte2526
npm install
```

This will install all dependencies including Prisma, Next.js, and React.

### Step 2: Set Up Environment Variables

```bash
cp .env.example .env
```

Edit `.env` and configure:

**For Quick Testing (No external services):**
```env
DATABASE_URL="file:./dev.db"
# Leave NVIDIA keys commented out - will use mock
```

**For Full Production:**
```env
DATABASE_URL="postgresql://user:password@localhost:5432/geisha_gains"
NVIDIA_NIM_ENDPOINT="https://integrate.api.nvidia.com/v1/chat/completions"
NVIDIA_API_KEY="nvapi-YOUR-KEY-HERE"
```

### Step 3: Initialize Database

```bash
# Generate Prisma client
npm run db:generate

# Push schema to database (creates tables)
npm run db:push
```

### Step 4: Start Development Server

```bash
npm run dev
```

🎉 **Open [http://localhost:3000/dashboard](http://localhost:3000/dashboard)**

---

## 📋 DETAILED SETUP

### Option A: PostgreSQL (Production-Ready)

#### 1. Install PostgreSQL

**macOS:**
```bash
brew install postgresql@15
brew services start postgresql@15
```

**Ubuntu/Linux:**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
```

**Windows:**
Download from [postgresql.org](https://www.postgresql.org/download/windows/)

#### 2. Create Database

```bash
# Connect to PostgreSQL
psql postgres

# Create database and user
CREATE DATABASE geisha_gains;
CREATE USER geisha_user WITH PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE geisha_gains TO geisha_user;

# Exit
\q
```

#### 3. Configure .env

```env
DATABASE_URL="postgresql://geisha_user:secure_password@localhost:5432/geisha_gains"
```

#### 4. Run Migrations

```bash
npm run db:push
```

### Option B: SQLite (Quick Testing)

#### 1. Configure .env

```env
DATABASE_URL="file:./dev.db"
```

#### 2. Initialize Database

```bash
npm run db:push
```

That's it! SQLite requires no installation.

---

## 🔑 API KEYS SETUP

### NVIDIA NIM API

#### 1. Get API Key

1. Go to [https://build.nvidia.com/](https://build.nvidia.com/)
2. Sign in with your NVIDIA account
3. Navigate to "API Keys"
4. Create a new API key
5. Copy the key (starts with `nvapi-`)

#### 2. Add to .env

```env
NVIDIA_NIM_ENDPOINT="https://integrate.api.nvidia.com/v1/chat/completions"
NVIDIA_API_KEY="nvapi-YOUR-ACTUAL-KEY-HERE"
```

#### 3. Test the Integration

```bash
# The app will automatically use NVIDIA NIM
# Check terminal logs for "NVIDIA NIM analysis" messages
```

**Note:** Without API keys, the app uses intelligent mock analysis (fully functional for demos).

---

## 🛠️ NPM SCRIPTS

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server (port 3000) |
| `npm run build` | Build for production |
| `npm start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run db:generate` | Generate Prisma client |
| `npm run db:push` | Push schema changes to database |
| `npm run db:studio` | Open Prisma Studio (database GUI) |

---

## 🧪 TESTING THE APP

### 1. Database Check

Open Prisma Studio to view database:

```bash
npm run db:studio
```

This opens [http://localhost:5555](http://localhost:5555)

### 2. Check API Endpoint

Test the analysis endpoint:

```bash
curl -X POST http://localhost:3000/api/trade/analyze \
  -H "Content-Type: application/json" \
  -d '{"userId":"test-user","isOverdrive":false}'
```

### 3. Monitor Logs

Watch the terminal for:

```
✓ Compiling /api/trade/analyze ...
✓ Fetching prices from Uphold...
✓ NVIDIA NIM analysis complete
✓ Executed 2 trades
```

---

## 🎭 DEMO MODE (No Dependencies)

For hackathon demos without internet/API access:

### 1. Use Mock Everything

```env
# .env
DATABASE_URL="file:./dev.db"
# Don't set NVIDIA_API_KEY - will auto-fallback to mock
```

### 2. The App Will:

- ✅ Generate realistic market prices
- ✅ Simulate AI analysis with confidence scores
- ✅ Execute trades normally
- ✅ All features work (including Overdrive)

**Perfect for live demos!**

---

## 🐛 TROUBLESHOOTING

### Error: "Prisma Client not generated"

```bash
npm run db:generate
```

### Error: "Can't reach database server"

Check your PostgreSQL is running:

```bash
# macOS
brew services list

# Linux
sudo systemctl status postgresql

# Restart if needed
brew services restart postgresql@15
```

### Error: "NVIDIA NIM API failed"

The app automatically falls back to mock mode. Check:

1. Is `NVIDIA_API_KEY` correct?
2. Is the endpoint reachable? (`ping integrate.api.nvidia.com`)
3. Check rate limits (free tier has limits)

### Port 3000 Already in Use

```bash
# Kill the process
lsof -ti:3000 | xargs kill -9

# Or use a different port
PORT=3001 npm run dev
```

### Prisma Schema Changes Not Reflecting

```bash
# Reset database (WARNING: Deletes all data)
npx prisma migrate reset

# Or just push changes
npm run db:push
```

---

## 🚀 DEPLOYMENT

### Vercel (Recommended)

1. Push code to GitHub
2. Connect repo to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy!

**Environment Variables needed:**
```
DATABASE_URL
NVIDIA_NIM_ENDPOINT
NVIDIA_API_KEY
```

### Docker

```bash
# Build image
docker build -t geisha-gains .

# Run container
docker run -p 3000:3000 \
  -e DATABASE_URL="postgresql://..." \
  -e NVIDIA_API_KEY="nvapi-..." \
  geisha-gains
```

---

## 📊 DATABASE SCHEMA

### Tables Created

```
users
├── id (String)
├── email (String)
├── preferences (JSON)
└── timestamps

wallets
├── id (String)
├── userId (String)
├── balanceUsdt (Float)
├── assets (JSON)
├── totalPnL (Float)
└── timestamps

transactions
├── id (String)
├── userId (String)
├── symbol (String)
├── type (BUY/SELL)
├── amount (Float)
├── price (Float)
├── totalValue (Float)
├── pnl (Float)
├── isOverdrive (Boolean)
├── confidence (Int)
├── reasoning (String)
└── timestamp

market_snaps
├── id (String)
├── symbol (String)
├── price (Float)
├── volume24h (Float)
├── change24h (Float)
├── source (String)
└── timestamp
```

---

## 💡 TIPS FOR HACKATHON

### Before the Demo

1. ✅ Test with `npm run dev`
2. ✅ Verify database has data (use Prisma Studio)
3. ✅ Check Caffeine meter charges correctly
4. ✅ Activate Overdrive once to test glitch effects
5. ✅ Clear old transaction data if needed

### During the Demo

1. Start at `/dashboard` page
2. Click "ANALYZE MARKET NOW" to trigger AI
3. Point out the confidence scores
4. Show the Caffeine meter charging
5. **Activate Overdrive** for the "wow" moment
6. Highlight the `[GLITCH]` tags in trade log

### If Something Breaks

- ✅ Refresh the page (React state resets)
- ✅ Check browser console for errors
- ✅ Fall back to mock mode (no API keys needed)
- ✅ Use Prisma Studio to manually fix database

---

## 📞 SUPPORT

For issues during the hackathon:

1. Check this guide
2. Read [GEISHA_GAINS_README.md](./GEISHA_GAINS_README.md)
3. Check browser console for errors
4. Verify `.env` configuration
5. Test with mock mode (no API keys)

---

**Built with ☕ by Coffee Driven Development**  
BugsByte 2026 Hackathon
