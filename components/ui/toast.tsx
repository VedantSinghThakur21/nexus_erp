"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { createContext, useContext, useState, ReactNode, useCallback } from "react";

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

interface ToastContextType {
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substring(7);
    const newToast = { ...toast, id };
    setToasts((prev) => [...prev, newToast]);

    // Auto remove after duration
    setTimeout(() => {
      removeToast(id);
    }, toast.duration || 5000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  );
}

function ToastContainer({ toasts, removeToast }: { toasts: Toast[]; removeToast: (id: string) => void }) {
  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
      <AnimatePresence>
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
        ))}
      </AnimatePresence>
    </div>
  );
}

function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: (id: string) => void }) {
  const icons = {
    success: <CheckCircle className="h-5 w-5" />,
    error: <AlertCircle className="h-5 w-5" />,
    info: <Info className="h-5 w-5" />,
    warning: <AlertTriangle className="h-5 w-5" />,
  };

  const styles = {
    success: "bg-green-50 border-green-200 text-green-900 dark:bg-green-900/20 dark:border-green-800 dark:text-green-400",
    error: "bg-red-50 border-red-200 text-red-900 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400",
    info: "bg-blue-50 border-blue-200 text-blue-900 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-400",
    warning: "bg-orange-50 border-orange-200 text-orange-900 dark:bg-orange-900/20 dark:border-orange-800 dark:text-orange-400",
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 300, scale: 0.8 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 300, scale: 0.8 }}
      transition={{ type: "spring", stiffness: 500, damping: 30 }}
      className={cn(
        "pointer-events-auto min-w-[300px] max-w-md rounded-lg border p-4 shadow-lg backdrop-blur-sm",
        styles[toast.type]
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          {icons[toast.type]}
        </div>
        <div className="flex-1">
          <h4 className="font-semibold text-sm">{toast.title}</h4>
          {toast.message && (
            <p className="mt-1 text-sm opacity-90">{toast.message}</p>
          )}
        </div>
        <button
          onClick={() => onRemove(toast.id)}
          className="flex-shrink-0 rounded-md p-1 hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      
      {/* Progress bar */}
      <motion.div
        className="mt-2 h-1 bg-current opacity-20 rounded-full overflow-hidden"
        initial={{ width: "100%" }}
        animate={{ width: "0%" }}
        transition={{ duration: (toast.duration || 5000) / 1000, ease: "linear" }}
      />
    </motion.div>
  );
}

// Helper hook for common toast patterns
export function useToastHelpers() {
  const { addToast } = useToast();

  return {
    success: (title: string, message?: string) => 
      addToast({ type: 'success', title, message }),
    
    error: (title: string, message?: string) => 
      addToast({ type: 'error', title, message }),
    
    info: (title: string, message?: string) => 
      addToast({ type: 'info', title, message }),
    
    warning: (title: string, message?: string) => 
      addToast({ type: 'warning', title, message }),
    
    promise: async <T,>(
      promise: Promise<T>,
      messages: {
        loading: string;
        success: string;
        error: string;
      }
    ) => {
      const loadingId = Math.random().toString(36);
      addToast({ type: 'info', title: messages.loading });

      try {
        const result = await promise;
        addToast({ type: 'success', title: messages.success });
        return result;
      } catch (error) {
        addToast({ 
          type: 'error', 
          title: messages.error,
          message: error instanceof Error ? error.message : 'An error occurred'
        });
        throw error;
      }
    },
  };
}
