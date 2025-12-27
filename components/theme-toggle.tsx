"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div suppressHydrationWarning className="h-9 w-9 rounded-lg bg-slate-200 dark:bg-slate-800 animate-pulse" />
    );
  }

  const isDark = theme === "dark";

  return (
    <div suppressHydrationWarning>
    <motion.button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className={cn(
        "relative h-9 w-16 rounded-full p-1 transition-colors duration-300",
        "bg-gradient-to-r",
        isDark 
          ? "from-slate-700 to-slate-900" 
          : "from-blue-400 to-blue-600"
      )}
      aria-label="Toggle theme"
    >
      <motion.div
        className={cn(
          "absolute top-1 h-7 w-7 rounded-full",
          "flex items-center justify-center",
          "shadow-lg",
          isDark 
            ? "bg-slate-950" 
            : "bg-white"
        )}
        initial={false}
        animate={{
          x: isDark ? 28 : 0,
        }}
        transition={{
          type: "spring",
          stiffness: 500,
          damping: 30,
        }}
      >
        {isDark ? (
          <Moon className="h-4 w-4 text-blue-400" />
        ) : (
          <Sun className="h-4 w-4 text-yellow-500" />
        )}
      </motion.div>
    </motion.button>
    </div>
  );
}
