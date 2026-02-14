import { ReactNode } from "react";
import { motion } from "framer-motion";

interface DashboardPanelProps {
  title?: string;
  children: ReactNode;
  className?: string;
  headerActions?: ReactNode;
  compact?: boolean;
}

export default function DashboardPanel({
  title,
  children,
  className = "",
  headerActions,
  compact = false
}: DashboardPanelProps) {
  return (
    <motion.div
      layout
      className={`border-4 border-white bg-black h-full overflow-hidden flex flex-col ${className}`}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
    >
      {title && (
        <div className={`border-b-4 border-white px-4 flex items-center justify-between ${compact ? 'py-1' : 'py-2'}`}>
          <h3 className={`font-bold uppercase tracking-widest text-white ${compact ? 'text-[10px]' : 'text-xs'}`}>
            {title}
          </h3>
          {headerActions && (
            <div className="flex items-center gap-2">
              {headerActions}
            </div>
          )}
        </div>
      )}
      <div className="flex-1 overflow-auto">
        {children}
      </div>
    </motion.div>
  );
}