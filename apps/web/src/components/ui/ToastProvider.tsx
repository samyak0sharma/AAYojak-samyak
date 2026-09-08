import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { CheckCircle2, X } from 'lucide-react';

interface Toast { id: number; message: string; tone: 'success' | 'error' | 'info' }
interface ToastContextValue { showToast: (message: string, tone?: Toast['tone']) => void }
const ToastContext = createContext<ToastContextValue | undefined>(undefined);
let toastSequence = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const showToast = useCallback((message: string, tone: Toast['tone'] = 'info') => {
    const id = ++toastSequence;
    setToasts((current) => [...current, { id, message, tone }]);
  }, []);
  const dismiss = (id: number) => setToasts((current) => current.filter((toast) => toast.id !== id));
  const value = useMemo(() => ({ showToast }), [showToast]);
  return <ToastContext.Provider value={value}>{children}<div className="toast-region" aria-live="polite">{toasts.map((toast) => <div className={`toast toast-${toast.tone}`} key={toast.id}><CheckCircle2 size={16} /><span>{toast.message}</span><button className="icon-button" aria-label="Dismiss notification" onClick={() => dismiss(toast.id)}><X size={14} /></button></div>)}</div></ToastContext.Provider>;
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within ToastProvider.');
  return context;
}
