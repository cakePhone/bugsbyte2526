/**
 * HomePage — Brutalist Landing Page
 * Geisha Gains • Coffee Driven Development
 *
 * 16:9 full-screen, high-impact entry point.
 * Minimalistic Brutalist aesthetic before entering the War Room.
 */

"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import ClientBackground from "@/app/components/ClientBackground";

interface HomePageProps {
  onAccountClick: () => void;
  onDashboardClick: () => void;
  onBulletinClick?: () => void;
}

// News ticker content
const TICKER_ITEMS = [
  "NEWS TICKER: GLOBAL MARKETS VOLATILE",
  "NVIDIA NIM ANALYSIS: SENTIMENT SHIFTING",
  "THREAT LEVEL: MODERATE",
  "BTC DOMINANCE: 52.4%",
  "FEDERAL RESERVE MEETING: RATES UNCHANGED",
  "GEOPOLITICAL ALERT: MONITOR POSITIONS",
  "AI CONFIDENCE: 87%",
  "COFFEE LEVELS: CRITICAL",
];

export default function HomePage({
  onAccountClick,
  onDashboardClick,
  onBulletinClick,
}: HomePageProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Animation variants for system boot-up effect
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.2,
      },
    },
  };

  const borderDrawVariants = {
    hidden: { pathLength: 0, opacity: 0 },
    visible: {
      pathLength: 1,
      opacity: 1,
      transition: { duration: 1, ease: [0.42, 0, 0.58, 1] as const },
    },
  };

  const textVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, ease: [0, 0, 0.2, 1] as const },
    },
  };

  const flickerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: [0, 1, 0.8, 1],
      transition: { duration: 0.3, times: [0, 0.5, 0.7, 1] },
    },
  };

  if (!mounted) return null;

  return (
    <motion.div
      className="fixed inset-0 w-screen h-screen bg-[#121212] overflow-hidden font-mono"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      {/* Interactive PixelBlast Background */}
      <ClientBackground />

      {/* Background Grid Pattern */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(to right, #FFFFFF 1px, transparent 1px),
            linear-gradient(to bottom, #FFFFFF 1px, transparent 1px)
          `,
          backgroundSize: "40px 40px",
        }}
      />

      {/* Circuitry Lines */}
      <svg
        className="absolute inset-0 w-full h-full opacity-[0.05] pointer-events-none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <pattern id="circuit" width="100" height="100" patternUnits="userSpaceOnUse">
            <path
              d="M0 50 H40 M60 50 H100 M50 0 V40 M50 60 V100"
              stroke="#FFFFFF"
              strokeWidth="1"
              fill="none"
            />
            <rect x="45" y="45" width="10" height="10" fill="none" stroke="#FFFFFF" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#circuit)" />
      </svg>

      {/* Main Border Frame */}
      <motion.div
        className="absolute inset-4 border-4 border-white pointer-events-none"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
      />

      {/* ═══════════════════════════════════════════════════════════
          CENTER ANCHOR - THE SLOGAN
          ═══════════════════════════════════════════════════════════ */}
      <motion.main
        className="absolute inset-0 flex flex-col items-center justify-center px-8"
        variants={containerVariants}
      >
        {/* Main Title */}
        <motion.h1
          className="text-[4rem] md:text-[5rem] lg:text-[6rem] font-black text-white tracking-tight text-center leading-none"
          variants={flickerVariants}
        >
          GEISHA GAINS
        </motion.h1>

        <motion.div
          className="flex items-center gap-4 mt-2"
          variants={textVariants}
        >
          <span className="text-[2.5rem] md:text-[3rem] lg:text-[3.5rem] font-bold text-white tracking-widest">
            -
          </span>
          <span className="text-[2.5rem] md:text-[3rem] lg:text-[3.5rem] font-bold text-white tracking-widest">
            WAR ROOM
          </span>
          <span className="text-[2.5rem] md:text-[3rem] lg:text-[3.5rem] font-bold text-white tracking-widest">
            -
          </span>
        </motion.div>

        {/* Red Accent Line */}
        <motion.div
          className="w-full max-w-4xl h-1 bg-[#FF0000] mt-6"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.8, delay: 0.5, ease: "easeOut" }}
        />

        {/* Sub-slogan */}
        <motion.p
          className="text-base md:text-lg lg:text-xl text-white font-medium tracking-[0.2em] mt-6 text-center max-w-4xl"
          variants={textVariants}
        >
          BRUTALIST INTELLIGENCE-DRIVEN CRYPTO TRADING SIMULATOR
        </motion.p>

        {/* Tech Stack Tags */}
        <motion.div
          className="flex flex-wrap items-center justify-center gap-4 mt-8"
          variants={textVariants}
        >
          {["NVIDIA NIM", "NEWS ANALYSIS", "THREAT RADAR", "☕ COFFEE DRIVEN"].map((tag) => (
            <span
              key={tag}
              className="border-2 border-gray-600 text-gray-400 px-3 py-1 text-xs tracking-widest"
            >
              {tag}
            </span>
          ))}
        </motion.div>

        {/* CTA Button */}
        <motion.button
          onClick={onAccountClick}
          className="mt-12 border-4 border-[#FF0000] bg-[#121212] text-[#FF0000] px-12 py-4 font-bold text-lg tracking-widest
                     hover:bg-[#FF0000] hover:text-white transition-all duration-100
                     focus:outline-none"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          variants={textVariants}
        >
          [ INITIATE PROTOCOL ]
        </motion.button>
      </motion.main>

      {/* ═══════════════════════════════════════════════════════════
          BOTTOM - INTELLIGENCE TICKER
          ═══════════════════════════════════════════════════════════ */}
      <motion.footer
        className="absolute bottom-4 left-4 right-4 border-t-4 border-white bg-[#121212]"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1, duration: 0.5 }}
      >
        <div className="overflow-hidden py-3">
          <div className="marquee-container">
            <div className="marquee-content">
              {[...TICKER_ITEMS, ...TICKER_ITEMS].map((item, index) => (
                <span key={index} className="mx-8 text-sm tracking-widest text-gray-400">
                  {item}
                  <span className="mx-4 text-[#FF0000]">•</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      </motion.footer>

      {/* Corner Accents */}
      <motion.div
        className="absolute top-4 left-4 w-8 h-8 border-l-4 border-t-4 border-[#FF0000]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
      />
      <motion.div
        className="absolute top-4 right-4 w-8 h-8 border-r-4 border-t-4 border-[#FF0000]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.3 }}
      />
      <motion.div
        className="absolute bottom-4 left-4 w-8 h-8 border-l-4 border-b-4 border-[#FF0000]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.4 }}
      />
      <motion.div
        className="absolute bottom-4 right-4 w-8 h-8 border-r-4 border-b-4 border-[#FF0000]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
      />
    </motion.div>
  );
}
