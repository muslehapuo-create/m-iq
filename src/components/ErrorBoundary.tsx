import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      message: error.message || 'Berlaku ralat luar jangkaan.',
    };
  }

  render() {
    if (this.state.hasError) {
      let friendlyMessage = this.state.message;
      try {
        const parsed = JSON.parse(this.state.message) as {
          error?: string;
          operationType?: string;
          path?: string;
        };
        if (parsed.error) {
          friendlyMessage = `${parsed.error} (${parsed.operationType || 'operasi'} pada ${parsed.path || 'pangkalan data'})`;
        }
      } catch {
        // Keep raw message
      }

      return (
        <div className="min-h-screen bg-[#F8F9FC] flex items-center justify-center p-6">
          <div className="max-w-lg w-full bg-white border border-slate-200 rounded-xl p-8 shadow-sm">
            <div className="w-11 h-11 rounded-lg bg-red-50 border border-red-200 flex items-center justify-center text-red-700 mb-5">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-semibold text-[#0F172A] mb-2">
              Gangguan Capaian Sistem M-IQ
            </h1>
            <p className="text-sm text-slate-600 text-justify leading-relaxed mb-6">
              Sistem mengesan ralat semasa memproses data. Sila muat semula halaman atau log masuk semula jika isu berterusan.
            </p>
            <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 text-xs font-mono text-slate-700 break-words mb-6">
              {friendlyMessage}
            </div>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#0F172A] text-white text-sm font-medium hover:bg-[#1E293B] transition-colors whitespace-nowrap"
            >
              <RotateCcw className="w-4 h-4" />
              Muat Semula Aplikasi
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
