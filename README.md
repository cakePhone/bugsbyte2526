<div align="center">

# � Geisha Gains — War Room

### _Brutalist Intelligence-Driven Crypto Trading Simulator_

[![Next.js](https://img.shields.io/badge/Next.js-14.2.5-black?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-18.3.1-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6.3-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Prisma](https://img.shields.io/badge/Prisma-5.22.0-2D3748?style=for-the-badge&logo=prisma&logoColor=white)](https://www.prisma.io/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-3.4.4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Framer Motion](https://img.shields.io/badge/Framer_Motion-12.23-FF0055?style=for-the-badge&logo=framer&logoColor=white)](https://www.framer.com/motion/)
[![NVIDIA NIM](https://img.shields.io/badge/NVIDIA_NIM-76B900?style=for-the-badge&logo=nvidia&logoColor=white)](https://build.nvidia.com/)
[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)

<br/>

**🎯 A production-ready AI-powered crypto trading simulator that successfully demonstrated NVIDIA NIM integration at BugsByte 2026!**

[🌐 View Live Demo](https://geisha-gains.vercel.app/) • [🐛 Report Bug](https://github.com/YOUR_USERNAME/geisha-gains/issues) • [✨ Request Feature](https://github.com/YOUR_USERNAME/geisha-gains/issues)

</div>

---

<div align="center">

<img width="1270" height="669" alt="geisha gains war room" src="https://github.com/user-attachments/assets/geisha-gains-dashboard.png" />

_🏯 Geisha Gains — War Room Dashboard_

</div>

---

## 👨‍💻 About the Developer

<div align="center">

**Hi, I'm a Full-Stack Developer** specializing in AI-powered applications and real-time systems.

This crypto trading simulator was built for **BugsByte 2026 Hackathon**, featuring a complete intelligence loop with NVIDIA NIM AI integration, demonstrating advanced news analysis and risk profiling capabilities.

If you're a recruiter or collaborator, feel free to reach out:

[![Portfolio](https://img.shields.io/badge/Portfolio-Coming_Soon-000000?style=for-the-badge&logo=github&logoColor=white)](https://github.com)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-Coming_Soon-0077B5?style=for-the-badge&logo=linkedin&logoColor=white)](https://linkedin.com)
[![GitHub](https://img.shields.io/badge/GitHub-Coming_Soon-181717?style=for-the-badge&logo=github&logoColor=white)](https://github.com)

</div>

---

## 🧠 Features

- 🏯 **Brutalist Design** — Dark theme with red accents and monospace fonts
- 🤖 **NVIDIA NIM Integration** — Llama-3 70B AI for news analysis
- 📰 **Real-time News Analysis** — Live crypto news API with intelligent filtering
- 👤 **User Profiling** — Terminal-style onboarding capturing trading psychology
- 📊 **War Room Dashboard** — Multi-panel intelligence display
- 🎯 **Threat Radar** — 4-axis visualization of market risks
- ⚡ **Action Overlays** — Lethal alerts with QUICK SELL functionality
- ☕ **Coffee Driven Development** — Built with passion and caffeine
- 🔄 **Intelligence Loop** — Continuous news analysis against user profile

---

## 📦 Tech Stack

<div align="center">

![Next.js](https://img.shields.io/badge/Next.js_14-000000?style=for-the-badge&logo=next.js&logoColor=white)
![React](https://img.shields.io/badge/React_18-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-2D3748?style=for-the-badge&logo=prisma&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Framer Motion](https://img.shields.io/badge/Framer_Motion-FF0055?style=for-the-badge&logo=framer&logoColor=white)
![NVIDIA NIM](https://img.shields.io/badge/NVIDIA_NIM-76B900?style=for-the-badge&logo=nvidia&logoColor=white)
![Vercel](https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)

</div>

---

## 🛠 Installation & Setup

### Prerequisites

Make sure you have the following installed:

- **Node.js** (v18.0.0 or higher)
- **npm** or **yarn** package manager
- **Git**
- **PostgreSQL** (optional, SQLite works for demos)

### Quick Start

```bash
# 1️⃣ Clone the repository
git clone https://github.com/YOUR_USERNAME/geisha-gains.git

# 2️⃣ Navigate to the project directory
cd geisha-gains

# 3️⃣ Install dependencies
npm install

# 4️⃣ Set up environment variables
cp .env.example .env
# Edit .env with your NVIDIA API key and database URL

# 5️⃣ Initialize database
npm run db:generate
npm run db:push

# 6️⃣ Start the development server
npm run dev
```

🎉 **That's it!** Open [http://localhost:3000](http://localhost:3000) to begin The Interrogation!

### Environment Variables

Create a `.env` file with:

```env
# Database (SQLite for quick start, PostgreSQL for production)
DATABASE_URL="file:./dev.db"

# NVIDIA NIM API (required for AI analysis)
NVIDIA_NIM_ENDPOINT="https://integrate.api.nvidia.com/v1/chat/completions"
NVIDIA_API_KEY="nvapi-YOUR-KEY-HERE"
```

### Build for Production

```bash
# Create optimized production build
npm run build

# Start production server
npm start
```

### Database Management

```bash
# View database in browser
npm run db:studio

# Reset database (WARNING: Deletes all data)
npx prisma migrate reset
```

---

## 🧗‍♂️ Project Structure

```
geisha-gains/
├── 📁 app/
│   ├── 📁 api/
│   │   └── 📁 news/
│   │       └── 📁 analyze/
│   │           └── route.ts          # NVIDIA NIM news analysis endpoint
│   ├── 📁 components/
│   │   ├── 📁 dashboard/
│   │   │   ├── ActionOverlay.tsx     # Lethal alert overlays
│   │   │   ├── TheBulletin.tsx       # News feed with threat colors
│   │   │   └── ThreatRadar.tsx       # 4-axis risk visualization
│   │   └── 📁 onboarding/
│   │       └── TheInterrogation.tsx  # Terminal-style profiling
│   ├── 📁 dashboard/
│   │   └── page.tsx                  # War Room dashboard
│   ├── error.tsx                     # Error boundary component
│   ├── global-error.tsx              # Global error handler
│   ├── globals.css                   # Brutalist styling
│   ├── layout.tsx                    # Root layout
│   └── page.tsx                      # Home (onboarding flow)
├── 📁 lib/
│   └── newsService.ts                # Live news API integration
├── 📁 prisma/
│   └── schema.prisma                 # Database schema
├── 📁 public/
│   └── 📁 assets/
│       └── 📁 logo1.ico              # App favicon
├── components.json                   # shadcn/ui config
├── jsconfig.json                     # JavaScript configuration
├── next.config.js                    # Next.js configuration
├── package.json                      # Dependencies & scripts
├── postcss.config.js                 # PostCSS configuration
├── tailwind.config.js                # Tailwind CSS configuration
├── SETUP_GUIDE.md                    # Detailed setup instructions
└── README.md                         # You are here! 📍
```

---

## 🎯 How It Works

### The Intelligence Loop

1. **The Interrogation** — Terminal-style onboarding captures trading psychology
2. **Risk Profiling** — Stores profile in localStorage with 4 key dimensions:
   - Risk Tolerance (CONSERVATIVE/MODERATE/AGGRESSIVE)
   - Investment Horizon (SCALP/SWING/POSITION)
   - Focus Sectors (CRYPTO/STOCKS/FOREX/COMMODITIES)
   - Geopolitical Sensitivity (IGNORE/AWARE/PARANOID)

3. **News Intelligence** — Fetches crypto news from live news API
4. **AI Analysis** — NVIDIA NIM Llama-3 70B analyzes news against user profile
5. **War Room Dashboard** — Real-time threat assessment and action alerts

### Key Components

- **TheBulletin**: Vertical news feed with threat-colored borders
- **ThreatRadar**: 4-axis SVG radar (Volatility, Geopolitics, Sentiment, Exposure)
- **ActionOverlay**: Fixed-position lethal alerts with QUICK SELL buttons
- **News Analysis API**: Returns global_score, portfolio_threat, sentiment, action, reasoning

---

## 🛣 Roadmap

- [x] � Brutalist dark theme with red accents
- [x] 👤 Terminal-style user profiling (The Interrogation)
- [x] 🤖 NVIDIA NIM Llama-3 70B integration
- [x] 📰 Live news API ingestion
- [x] 📊 War Room dashboard with multi-panel display
- [x] 🎯 Threat Radar 4-axis visualization
- [x] ⚡ Action Overlay lethal alerts
- [x] ☕ Coffee Driven Development branding
- [x] 🔄 Intelligence loop with continuous analysis
- [x] 📱 Fully responsive design
- [x] 🎨 Framer Motion animations
- [x] 🗄️ Prisma ORM with PostgreSQL/SQLite
- [ ] 🌙 Dark/Light mode toggle
- [ ] 📈 Real trading integration (Uphold API)
- [ ] 🔄 WebSocket real-time updates
- [ ] 📊 Advanced analytics dashboard
- [ ] 🎫 Portfolio export functionality

---

## 🤝 Contributing

Contributions are what make the open-source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**!

### How to Contribute

1. **Fork the Project**

   ```bash
   # Click the 'Fork' button at the top right of this page
   ```

2. **Clone your Fork**

   ```bash
   git clone https://github.com/YOUR_USERNAME/geisha-gains.git
   ```

3. **Create a Feature Branch**

   ```bash
   git checkout -b feature/AmazingFeature
   ```

4. **Make your Changes**

   ```bash
   # Code your amazing feature
   ```

5. **Commit your Changes**

   ```bash
   git commit -m "Add: AmazingFeature"
   ```

6. **Push to the Branch**

   ```bash
   git push origin feature/AmazingFeature
   ```

7. **Open a Pull Request**
   ```bash
   # Go to your fork on GitHub and click 'New Pull Request'
   ```

### Contribution Guidelines

- 📝 Write clear, concise commit messages
- 🧪 Test your changes thoroughly
- 📖 Update documentation if needed
- 🎨 Follow the existing brutalist code style

---

## ⭐ Support This Project

<div align="center">

If you found this project helpful or inspiring, please consider giving it a ⭐!

Your support helps the project grow and motivates continued development.

[![Star this repo](https://img.shields.io/badge/⭐_Star_This_Repo-yellow?style=for-the-badge&logo=github)](https://github.com/YOUR_USERNAME/geisha-gains)
[![Fork this repo](https://img.shields.io/badge/🍴_Fork_This_Repo-blue?style=for-the-badge&logo=github)](https://github.com/YOUR_USERNAME/geisha-gains/fork)

**Every star counts! Thank you for your support! 🙏**

</div>

---

## 📝 License

Distributed under the **MIT License**. See `LICENSE` for more information.

```
MIT License

Copyright (c) 2026 Geisha Gains

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software...
```

---

<div align="center">

### 🏯 Built with ☕ by Coffee Driven Development

**Geisha Gains** — Where Intelligence Meets the Markets 🏯💹

[![Made with Next.js](https://img.shields.io/badge/Made_with-Next.js-000000?style=flat-square&logo=next.js)](https://nextjs.org/)
[![Powered by NVIDIA NIM](https://img.shields.io/badge/Powered_by-NVIDIA_NIM-76B900?style=flat-square&logo=nvidia)](https://build.nvidia.com/)
[![Deployed on Vercel](https://img.shields.io/badge/Deployed_on-Vercel-000000?style=flat-square&logo=vercel)](https://vercel.com/)

</div>
