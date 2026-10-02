import { type ReactNode } from 'react';
import { ClipboardCheck } from 'lucide-react';

interface AuthLayoutProps {
  title: string;
  subtitle: string;
  children: ReactNode;
}

export function AuthLayout({ title, subtitle, children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen flex">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-slate-900 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-teal-900 via-slate-900 to-slate-900" />
        <div className="relative z-10 flex flex-col justify-between p-12 text-white w-full">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-500">
              <ClipboardCheck className="h-6 w-6" />
            </div>
            <div>
              <p className="text-lg font-bold leading-tight">MetriCheck</p>
              <p className="text-xs text-teal-300 leading-tight">Inspector Portal</p>
            </div>
          </div>

          <div className="space-y-6">
            <h1 className="text-4xl font-bold leading-tight">
              Professional metrology inspection, verified and documented.
            </h1>
            <p className="text-lg text-slate-300 leading-relaxed">
              Conduct dimensional, visual, and safety inspections. Upload product evidence,
              record measurement results, and generate compliance-ready reports.
            </p>
            <div className="space-y-3 pt-4">
              {[
                'Structured measurement recording with pass/fail tracking',
                'Product image uploads with secure storage',
                'Inspector verification workflow',
                'Inspection history and downloadable reports',
              ].map((feature) => (
                <div key={feature} className="flex items-center gap-3 text-slate-300">
                  <div className="h-1.5 w-1.5 rounded-full bg-teal-400" />
                  <span className="text-sm">{feature}</span>
                </div>
              ))}
            </div>
          </div>

          <p className="text-xs text-slate-400">SIH26034 · MetriCheck Inspector</p>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 bg-slate-50">
        <div className="w-full max-w-md py-8">
          <div className="lg:hidden flex items-center gap-2.5 mb-8 justify-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-600 text-white">
              <ClipboardCheck className="h-6 w-6" />
            </div>
            <div>
              <p className="text-lg font-bold text-slate-900 leading-tight">MetriCheck</p>
              <p className="text-xs text-teal-600 leading-tight">Inspector Portal</p>
            </div>
          </div>

          <h2 className="text-2xl font-bold text-slate-900">{title}</h2>
          <p className="mt-2 text-sm text-slate-500">{subtitle}</p>
          <div className="mt-8">{children}</div>
        </div>
      </div>
    </div>
  );
}
