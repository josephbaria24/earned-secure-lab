export type ToastType = 'default' | 'success' | 'error' | 'warning' | 'info';

export type ToastPosition = 'top' | 'bottom';

export interface ToastOptions {
  duration?: number;
  type?: ToastType;
  position?: ToastPosition;
  onClose?: () => void;
  action?: {
    label: string;
    onPress: () => void;
  } | null;
}

export interface ToastItem {
  id: string;
  content: React.ReactNode | string;
  options: Required<ToastOptions>;
}

export interface ToastContextValue {
  toasts: ToastItem[];
  show: (content: React.ReactNode | string, options?: ToastOptions) => string;
  update: (id: string, content: React.ReactNode | string, options?: ToastOptions) => void;
  dismiss: (id: string) => void;
  dismissAll: () => void;
}
