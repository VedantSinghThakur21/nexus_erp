"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface AnimatedCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  variant?: 'default' | 'neon' | 'glass';
  hover?: boolean;
  delay?: number;
}

export function AnimatedCard({
  children,
  className,
  variant = 'default',
  hover = true,
  delay = 0,
  ...props
}: AnimatedCardProps) {
  const variantStyles = {
    default: "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800",
    neon: "bg-gradient-to-br from-blue-50 to-purple-50 dark:from-slate-900 dark:to-slate-800 border border-blue-200 dark:border-blue-900/50",
    glass: "bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/50",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{
        duration: 0.4,
        delay,
        ease: [0.4, 0, 0.2, 1],
        type: "spring",
        stiffness: 300,
        damping: 30,
      }}
      whileHover={hover ? { y: -4, transition: { duration: 0.2 } } : undefined}
      className={cn(
        "rounded-xl p-6 shadow-sm",
        variantStyles[variant],
        className
      )}
      {...props}
    >
      {children}
    </motion.div>
  );
}

interface AnimatedButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost' | 'neon';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

export function AnimatedButton({
  children,
  className,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  ...props
}: AnimatedButtonProps) {
  const variantStyles = {
    primary: "bg-blue-600 text-white shadow-md",
    secondary: "bg-purple-600 text-white shadow-md",
    ghost: "bg-transparent text-slate-900 dark:text-white",
    neon: "bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg shadow-blue-500/50",
  };

  const sizeStyles = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2 text-base",
    lg: "px-6 py-3 text-lg",
  };

  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      transition={{ type: "spring", stiffness: 400, damping: 17 }}
      disabled={disabled || loading}
      className={cn(
        "relative inline-flex items-center justify-center gap-2 rounded-lg font-medium",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        "focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500",
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
      {...props}
    >
      {loading && (
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="absolute inset-0 flex items-center justify-center"
        >
          <div className="h-5 w-5 rounded-full border-2 border-current border-t-transparent" />
        </motion.div>
      )}
      <span className={loading ? "invisible" : ""}>{children}</span>
    </motion.button>
  );
}

interface AnimatedBadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'error' | 'neon';
  pulse?: boolean;
  className?: string;
}

export function AnimatedBadge({
  children,
  variant = 'default',
  pulse = false,
  className,
}: AnimatedBadgeProps) {
  const variantStyles = {
    default: "bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100",
    success: "bg-green-100 text-green-900 dark:bg-green-900/30 dark:text-green-400",
    warning: "bg-orange-100 text-orange-900 dark:bg-orange-900/30 dark:text-orange-400",
    error: "bg-red-100 text-red-900 dark:bg-red-900/30 dark:text-red-400",
    neon: "bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg shadow-blue-500/30",
  };

  return (
    <motion.span
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 500, damping: 25 }}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
        variantStyles[variant],
        className
      )}
    >
      {pulse && (
        <motion.span
          animate={{
            scale: [1, 1.2, 1],
            opacity: [1, 0.5, 1],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="relative flex h-2 w-2"
        >
          <span className="absolute inline-flex h-full w-full rounded-full bg-current opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-current"></span>
        </motion.span>
      )}
      {children}
    </motion.span>
  );
}

interface AnimatedStatCardProps {
  title: string;
  value: string | number;
  change?: {
    value: number;
    trend: 'up' | 'down';
  };
  icon: React.ReactNode;
  variant?: 'default' | 'neon';
  delay?: number;
}

export funcmotion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: delay + 0.1 }}
            className="text-sm font-medium text-slate-600 dark:text-slate-400"
          >
            {title}
          </motion.p>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ 
              delay: delay + 0.2,
              type: "spring",
              stiffness: 300,
              damping: 20,
            }}
            className="text-3xl font-bold text-slate-900 dark:text-white"
          >
            {value}
          </motion.p>
          {change && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: delay + 0.3 }}
              className={cn(
                "inline-flex items-center gap-1 text-sm font-medium",
                change.trend === 'up' ? "text-green-600" : "text-red-600"
              )}
            >
              {change.trend === 'up' ? '↑' : '↓'} {Math.abs(change.value)}%
            </motion.div>
          )}
        </div>
        <motion.div
          whileHover={{ 
            rotate: 360,
            scale: 1.1,
            transition: { duration: 0.6, ease: "easeInOut" }
          }}
          className={cn(
            "rounded-lg p-3",
            variant === 'neon' 
              ? "bg-gradient-to-br from-blue-500 to-purple-600 text-white shadow-lg shadow-blue-500/30"
              : "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
          )}
        >
          {icon}
        </motion.  </div>
          )}
        </div>
     motion.div
      initial="hidden"
      animate="visible"
      variants={{
        visible: {
          transition: {
            staggerChildren: staggerDelay,
          },
        },
      }}
      className="space-y-4"
    >
      {children}
    </motion.div>
  );
}

interface AnimatedListItemProps {
  children: React.ReactNode;
  className?: string;
  index?: number;
}

export function AnimatedListItem({ children, className, index = 0 }: AnimatedListItemProps) {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 20 },
        visible: { 
          opacity: 1, 
          y: 0,
          transition: {
            type: "spring",
            stiffness: 300,
            damping: 24,
          }
        },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

interface AnimatedListItemProps {
  children: React.ReactNode;
  className?: string;
  index?: number;
}

export function AnimatedListItem({ children, className, index = 0 }: AnimatedListItemProps) {
  return (
    <div
      style={{
        animationDelay: `${index * 0.1}s`,
      }}
      className={cn(
        "animate-in fade-in slide-in-from-bottom-4 duration-500",
        className
      )}
    >
      {children}
    </div>
  );
}
