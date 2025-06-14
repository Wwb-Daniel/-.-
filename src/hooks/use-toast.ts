import { useState, useCallback } from 'react';

interface Toast {
  id: string;
  title: string;
  description?: string;
  variant?: 'default' | 'destructive';
  type?: 'success' | 'error';
}

interface UseToastReturn {
  toasts: Toast[];
  toast: (props: Omit<Toast, 'id'>) => void;
  dismissToast: (id: string) => void;
}

export function useToast(): UseToastReturn {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback(({ title, description, variant = 'default', type }: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substring(7);
    setToasts((prevToasts) => [...prevToasts, { id, title, description, variant, type }]);

    // Auto dismiss after 5 seconds
    setTimeout(() => {
      setToasts((prevToasts) => prevToasts.filter((t) => t.id !== id));
    }, 5000);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prevToasts) => prevToasts.filter((t) => t.id !== id));
  }, []);

  return { toasts, toast, dismissToast };
} 