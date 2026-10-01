import React, { createContext, useCallback, useContext, useState } from 'react';
import type { ToastContextValue, ToastItem, ToastOptions } from '@/components/toast/types';

const DEFAULT_TOAST_OPTIONS: Required<ToastOptions> = {
  duration: 3200,
  type: 'default',
  position: 'top',
  onClose: () => {},
  action: null,
};

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProviderWithViewport');
  }
  return context;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const show = useCallback((content: React.ReactNode | string, options?: ToastOptions) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [
      ...prev,
      { id, content, options: { ...DEFAULT_TOAST_OPTIONS, ...options } },
    ]);
    return id;
  }, []);

  const update = useCallback((id: string, content: React.ReactNode | string, options?: ToastOptions) => {
    setToasts((prev) =>
      prev.map((toast) =>
        toast.id === id
          ? { ...toast, content, options: { ...toast.options, ...options } }
          : toast,
      ),
    );
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const dismissAll = useCallback(() => {
    setToasts([]);
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, show, update, dismiss, dismissAll }}>
      {children}
    </ToastContext.Provider>
  );
}
