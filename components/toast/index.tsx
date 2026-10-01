import { ToastProvider, useToast } from '@/components/toast/ToastContext';
import { ToastViewport } from '@/components/toast/Viewport';
import type { ToastOptions, ToastType } from '@/components/toast/types';
import React from 'react';

type ToastRef = {
  show?: (content: React.ReactNode | string, options?: ToastOptions) => string;
  update?: (id: string, content: React.ReactNode | string, options?: ToastOptions) => void;
  dismiss?: (id: string) => void;
  dismissAll?: () => void;
};

const toastRef: ToastRef = {};

function ToastController() {
  const toast = useToast();
  toastRef.show = toast.show;
  toastRef.update = toast.update;
  toastRef.dismiss = toast.dismiss;
  toastRef.dismissAll = toast.dismissAll;
  return null;
}

export function ToastProviderWithViewport({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <ToastController />
      {children}
      <ToastViewport />
    </ToastProvider>
  );
}

function callShow(content: React.ReactNode | string, options?: ToastOptions) {
  if (!toastRef.show) return '';
  return toastRef.show(content, options);
}

export const toast = {
  show: callShow,
  success: (message: string, options?: Omit<ToastOptions, 'type'>) => callShow(message, { ...options, type: 'success' }),
  error: (message: string, options?: Omit<ToastOptions, 'type'>) => callShow(message, { ...options, type: 'error' }),
  warning: (message: string, options?: Omit<ToastOptions, 'type'>) => callShow(message, { ...options, type: 'warning' }),
  info: (message: string, options?: Omit<ToastOptions, 'type'>) => callShow(message, { ...options, type: 'info' }),
  dismiss: (id: string) => toastRef.dismiss?.(id),
  dismissAll: () => toastRef.dismissAll?.(),
  update: (id: string, content: React.ReactNode | string, options?: ToastOptions) => toastRef.update?.(id, content, options),
};

export { useToast };
export type { ToastOptions, ToastType };
