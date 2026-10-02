import { type ReactNode } from 'react';
import { AlertCircle, CheckCircle2, Info, XCircle } from 'lucide-react';

type AlertVariant = 'info' | 'success' | 'warning' | 'error';

interface AlertProps {
  variant?: AlertVariant;
  title?: string;
  children: ReactNode;
}

const variantConfig: Record<AlertVariant, { bg: string; border: string; text: string; icon: ReactNode }> = {
  info: { bg: 'bg-sky-50', border: 'border-sky-200', text: 'text-sky-800', icon: <Info className="h-5 w-5 text-sky-500" /> },
  success: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-800', icon: <CheckCircle2 className="h-5 w-5 text-emerald-500" /> },
  warning: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-800', icon: <AlertCircle className="h-5 w-5 text-amber-500" /> },
  error: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-800', icon: <XCircle className="h-5 w-5 text-red-500" /> },
};

export function Alert({ variant = 'info', title, children }: AlertProps) {
  const config = variantConfig[variant];
  return (
    <div className={`rounded-lg border p-4 ${config.bg} ${config.border}`}>
      <div className="flex gap-3">
        <div className="flex-shrink-0">{config.icon}</div>
        <div className="flex-1">
          {title && <p className={`font-medium text-sm ${config.text}`}>{title}</p>}
          <div className={`text-sm ${config.text} ${title ? 'mt-1' : ''}`}>{children}</div>
        </div>
      </div>
    </div>
  );
}
