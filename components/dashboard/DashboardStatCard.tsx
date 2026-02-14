"use client";

import { motion } from "framer-motion";

export default function DashboardStatCard({
  label,
  value,
  alert = false,
}: {
  label: string;
  value: string;
  alert?: boolean;
}) {
  return (
    <motion.div
      className={`border-4 bg-black p-4 ${alert ? "border-[#DD0000]" : "border-gray-300"}`}
      animate={alert ? { borderColor: ["#DD0000", "#CC0000", "#DD0000"] } : {}}
      transition={alert ? { repeat: Infinity, duration: 0.8 } : {}}
    >
      <div className="text-[10px] text-gray-300 font-bold tracking-widest mb-1">
        {label}
      </div>
      <div
        className={`text-lg font-bold ${alert ? "text-[#DD0000]" : "text-white"}`}
      >
        {value}
      </div>
    </motion.div>
  );
}
