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

````bash
# 1️⃣ Clone the repository
git clone https://github.com/YOUR_USERNAME/geisha-gains.git

# 2️⃣ Navigate to the project directory
cd geisha-gains

# 3️⃣ Install dependencies
npm install

# 4️⃣ Set up environment variables
cp .env.example .env
# Geisha Gains — War Room

Lightweight project README focused on Docker usage and stack versions.

## Stack (actual versions in this repo)

- Next.js: 16.1.6
- React: 18.3.1
- TypeScript: 5.9.3
- Prisma: 6.19.2
- @prisma/client: 6.19.2
- Tailwind CSS: 3.4.4
- Node.js: recommended 20.x (development images use node:20-bookworm-slim)
- PostgreSQL: 16 (docker image: postgres:16-alpine)
- Docker & Docker Compose: used for local development and production container builds

## Docker-first Quick Start

This repository supports a Dockerized development flow via `docker compose` and a multi-stage production build using the included `Dockerfile`.

1) Build & start services (development):

```bash
docker compose up --build
````

This will start the `postgres` database and the `web` service (Next dev server). The `web` service depends on `postgres` being healthy.

2. Open the app in your browser:

http://localhost:3000

3. Production image (build & run locally):

```bash
# Build production image
docker build -t geisha-gains:prod .

# Run the container (ensure you provide a proper .env with DATABASE_URL)
docker run --env-file .env -p 3000:3000 geisha-gains:prod
```

Notes:

- The production image uses a multi-stage build to install dependencies, run the Next build, and serve via `next start` on port 3000.
- If you rely on Prisma migrations in production, run migrations outside of the container or ensure your CI/CD runs them with the correct `DATABASE_URL`.

## Useful commands

- Install locally: `npm install`
- Generate Prisma client: `npx prisma generate`
- Open Prisma Studio: `npm run db:studio`
- Start dev server (local): `npm run dev`
- Build & start production (local): `npm run build && npm start`

## Docker files

- `Dockerfile.dev` — development image used by `docker compose` (already present)
- `Dockerfile` — production multi-stage Dockerfile (created in this change)

## Where to look next

- App code: `app/`
- API routes: `app/api/`
- Prisma schema: `prisma/schema.prisma`

---

If you'd like, I can also:

- add a `.dockerignore` tuned for Next builds
- add a small `Makefile` with common tasks (`dev`, `build`, `docker-build`)

---

© Geisha Gains
├── 📁 public/
