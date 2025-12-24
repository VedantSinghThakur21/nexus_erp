"use client";

import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

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
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => setMounted(true), delay * 1000);
    return () => clearTimeout(timeout);
  }, [delay]);

  const variantStyles = {
    default: "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800",
    neon: "bg-gradient-to-br from-blue-50 to-purple-50 dark:from-slate-900 dark:to-slate-800 border border-blue-200 dark:border-blue-900/50",
    glass: "bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/50",
  };

  return (
    <div
      style={{
        animationDelay: `${delay}s`,
      }}
      className={cn(
        "rounded-xl p-6 shadow-sm transition-all duration-300",
        "animate-in fade-in slide-in-from-bottom-4",
        hover && "hover:-translate-y-1 hover:shadow-xl",
        variantStyles[variant],
        className
      )}
      {...props}
    >
      {children}
    </div>
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
    primary: "bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg",
    secondary: "bg-purple-600 hover:bg-purple-700 text-white shadow-md hover:shadow-lg",
    ghost: "bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-900 dark:text-white",
    neon: "bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white shadow-lg shadow-blue-500/50 hover:shadow-xl hover:shadow-purple-500/50",
  };

  const sizeStyles = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2 text-base",
    lg: "px-6 py-3 text-lg",
  };

  return (
    <button
      disabled={disabled || loading}
      className={cn(
        "relative inline-flex items-center justify-center gap-2 rounded-lg font-medium",
        "transition-all duration-200 active:scale-95",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        "focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500",
        hover && "hover:scale-105",
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
      {...props}
    >
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="h-5 w-5 rounded-full border-2 border-current border-t-transparent animate-spin" />
        </div>
      )}
      <span className={loading ? "invisible" : ""}>{children}</span>
    </button>
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
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
        "animate-in zoom-in-95 duration-300",
        pulse && "animate-pulse",
        variantStyles[variant],
        className
      )}
    >
      {pulse && (
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-current opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-current"></span>
        </span>
      )}
      {children}
    </span>
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

export function AnimatedStatCard({
  title,
  value,
  change,
  icon,
  variant = 'default',
  delay = 0,
}: AnimatedStatCardProps) {
  return (
    <AnimatedCard variant={variant} delay={delay}>
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
            {title}
          </p>
          <p className="text-3xl font-bold text-slate-900 dark:text-white animate-in fade-in slide-in-from-bottom-2 duration-500">
            {value}
          </p>
          {change && (
            <div
              className={cn(
                "inline-flex items-center gap-1 text-sm font-medium",
                "animate-in fade-in slide-in-from-left-2 duration-500",
                change.trend === 'up' ? "text-green-600" : "text-red-600"
              )}
            >
              {change.trend === 'up' ? '↑' : '↓'} {Math.abs(change.value)}%
            </div>
          )}
        </div>
        <div
          className={cn(
            "rounded-lg p-3 transition-transform duration-500 hover:rotate-[360deg] hover:scale-110",
            variant === 'neon' 
              ? "bg-gradient-to-br from-blue-500 to-purple-600 text-white shadow-lg shadow-blue-500/30"
              : "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
          )}
        >
          {icon}
        </div>
      </div>
    </AnimatedCard>
  );
}

interface AnimatedListProps {
  children: React.ReactNode;
  staggerDelay?: number;
}

export function AnimatedList({ children, staggerDelay = 0.1 }: AnimatedListProps) {
  return (
    <div className="space-y-4">
      {children}
    </div>
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
