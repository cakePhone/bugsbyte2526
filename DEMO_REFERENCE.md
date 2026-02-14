# ☕ GEISHA GAINS - QUICK REFERENCE CARD

**For Demo Day** • Keep this handy! 📋

---

## 🚨 EMERGENCY COMMANDS

```bash
# If app crashes
npm run dev

# If database is corrupted
npm run db:push

# If Prisma client missing
npm run db:generate

# Kill port 3000
lsof -ti:3000 | xargs kill -9

# View database
npm run db:studio
```

---

## 🎬 DEMO CHECKLIST

### Before Demo
- [ ] Run `npm run dev`
- [ ] Open [http://localhost:3000/dashboard](http://localhost:3000/dashboard)
- [ ] Verify market prices are updating
- [ ] Check Caffeine meter is charging
- [ ] Test "Analyze Market" button
- [ ] Confirm trade log is visible

### During Demo
- [ ] Explain Brutalist design (white/black/red)
- [ ] Show AI confidence scores
- [ ] Point out Caffeine meter
- [ ] **Activate Overdrive** (the wow moment!)
- [ ] Show `[GLITCH]` tags in trade log
- [ ] Highlight SVG charts

---

## 🎤 TALKING POINTS

### "What is it?"
> "A Brutalist crypto trading simulator that uses NVIDIA NIM AI to analyze markets and execute trades. We've added a unique 'Caffeine Overdrive' mode that bypasses AI safety checks for aggressive trading."

### "What makes it unique?"
> "The Caffeine Overdrive system - it's like an über charge in Team Fortress. When activated, the entire dashboard glitches red, and we execute trades without AI confirmation. It's high-risk, high-reward trading on pure signals."

### "What tech did you use?"
> "Next.js 14, PostgreSQL with Prisma, NVIDIA NIM for Llama-3 inference, and Uphold's API for real-time crypto prices. The UI is pure Brutalism - thick black borders, no rounded corners, SVG charts instead of Chart.js."

### "Why Brutalism?"
> "Brutalism represents raw, honest design. In finance, that's exactly what you need - no sugar-coating, just data and action. The aesthetic reinforces the app's aggressive trading philosophy."

---

## 🎮 DEMO FLOW (3 MINUTES)

**0:00-0:30** - Introduction
- "This is Geisha Gains, a Brutalist crypto trading simulator"
- "Built for BugsByte 2026 using Uphold + NVIDIA NIM"

**0:30-1:30** - Normal Trading
- Click "ANALYZE MARKET NOW"
- "NVIDIA's Llama-3 analyzes BTC, ETH, XRP"
- "See these confidence scores? We only trade when > 75%"
- "Every trade updates our wallet and P&L in real-time"

**1:30-2:30** - Caffeine Overdrive
- "Now the gimmick - Caffeine Overdrive"
- "This meter charges from trades and time"
- Click "ACTIVATE CAFFEINE OVERDRIVE"
- 🔴 **SCREEN GLITCHES RED** 🔴
- "Notice the glitch effect - this is our power-up state"
- "We're now executing ANY trade, no AI confirmation needed"
- "See the [GLITCH] tags? Those are overdrive trades"

**2:30-3:00** - Technical Wrap-up
- "Under the hood: Prisma + PostgreSQL + TypeScript"
- "Real-time AI with NVIDIA NIM streaming"
- "Pure SVG graphics for the Brutalist aesthetic"
- "Fully deployable, all the code is on GitHub"

---

## 🐛 TROUBLESHOOTING

### Problem: Dashboard won't load
**Fix**: Check console (F12), likely API route error
```bash
# Restart server
npm run dev
```

### Problem: No trades executing
**Fix**: Check if analysis is running
```bash
# Check terminal for "NVIDIA NIM analysis" logs
# If no logs, click "ANALYZE MARKET NOW" manually
```

### Problem: Overdrive button disabled
**Fix**: Meter must be at 100%
```bash
# For demo, you can manually update charge in browser console:
# Open React DevTools → Find UberChargeContext → Set charge to 100
```

### Problem: Glitch effects not showing
**Fix**: CSS may not be loaded
```bash
# Check if globals.css has glitch animations
# Refresh page with Ctrl+Shift+R (hard refresh)
```

### Problem: Database errors
**Fix**: Reinitialize database
```bash
npm run db:push
```

---

## 🎨 DESIGN PRINCIPLES

**Brutalism Checklist**:
- ✅ Thick black borders (4px) everywhere
- ✅ Pure black text on white background
- ✅ Red (#FF0000) for urgency/danger only
- ✅ No gradients, no shadows (except sharp brutalist shadows)
- ✅ Uppercase, bold typography
- ✅ Monospace for numbers
- ✅ Raw SVG, no fancy chart libraries
- ✅ Grid-based layouts with visible structure

---

## 📊 KEY METRICS TO MENTION

- **3 Crypto Assets**: BTC, ETH, XRP
- **10-Second Polling**: Auto-analysis every 10s
- **75% Confidence**: Threshold for normal trading
- **5-Minute Overdrive**: Duration of power-up mode
- **4 Database Tables**: User, Wallet, Transaction, MarketSnap
- **2 API Endpoints**: Analyze + History

---

## 🎯 JUDGE QUESTIONS (PREP)

### "Why did you choose this stack?"
> "Next.js for full-stack capability, Prisma for type-safe database access, NVIDIA NIM because we wanted real AI - not just buzzwords - and Uphold for reliable market data."

### "What's the hardest part you built?"
> "The SVG chart system. We didn't use Chart.js - we built raw SVG paths to fit the Brutalist aesthetic. Also, syncing the Overdrive state across all components in real-time was interesting."

### "Is this production-ready?"
> "Yes! We're using PostgreSQL, have proper error handling, fallbacks for API failures, and it's deployable to Vercel right now."

### "What would you add next?"
> "WebSocket connections for sub-second price updates, more trading pairs, historical backtesting, and maybe a mobile app with the same Brutalist design."

### "How does the AI actually work?"
> "We send current prices and 24h changes to NVIDIA NIM's Llama-3 model. It analyzes momentum, volatility, and market sentiment, then returns BUY/SELL/HOLD with a confidence score and reasoning."

---

## 💡 DEMO TIPS

✅ **Practice the Overdrive activation** - timing is everything  
✅ **Have backup .env** - in case variables get corrupted  
✅ **Pre-charge the meter** - so you can activate on demand  
✅ **Clear browser cache** - avoid stale CSS issues  
✅ **Test on actual demo machine** - not just your laptop  
✅ **Have Prisma Studio open** - show database if asked  
✅ **Know your numbers** - how much P&L, how many trades, etc.  

---

## 🔗 USEFUL LINKS

- **Dashboard**: http://localhost:3000/dashboard
- **Prisma Studio**: http://localhost:5555 (after `npm run db:studio`)
- **API Endpoint**: http://localhost:3000/api/trade/analyze
- **GitHub**: _(add your repo link)_

---

## 🏆 WINNING STRATEGY

1. **Lead with the gimmick** - Caffeine Overdrive is memorable
2. **Show technical depth** - Prisma schema, NVIDIA NIM, TypeScript
3. **Emphasize design** - Brutalism makes you stand out
4. **Live demo the glitch** - Visual effects impress judges
5. **Know your code** - Be ready to explain architecture

---

**YOU GOT THIS! ☕🏆**

Built by Coffee Driven Development  
BugsByte 2026

---

_Print this. Keep it at your demo station. Good luck!_
