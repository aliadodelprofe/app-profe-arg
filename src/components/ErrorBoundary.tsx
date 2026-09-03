import React, { Component, ErrorInfo, ReactNode } from 'react';
import { TALogo } from './TALogo';
import { RefreshCw, RotateCcw, AlertTriangle } from 'lucide-react';
import { safeClearCachePreservingSession } from '../utils/safeStorage';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('Uncaught error in application component tree:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReload = () => {
    try {
      safeClearCachePreservingSession();
    } catch (e) {
      console.warn('Could not clear cache:', e);
    }
    window.location.reload();
  };

  private handleResetLocalData = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch (e) {
      console.warn('Could not clear storage:', e);
    }
    window.location.href = window.location.pathname;
  };

  public render() {
    if (this.state.hasError) {
      const isQuotaError =
        this.state.error?.name === 'QuotaExceededError' ||
        this.state.error?.message?.toLowerCase().includes('quota') ||
        String(this.state.error).toLowerCase().includes('quota');

      return (
        <div className="min-h-screen bg-[#111111] text-[#eeede9] flex flex-col items-center justify-center p-6 text-center select-none font-sans">
          {/* Ambient Glow */}
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-[#e7d9cf]/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 max-w-md w-full bg-[#161615] border border-white/[0.08] rounded-3xl p-8 shadow-2xl shadow-black/80 space-y-6">
            <div className="flex justify-center">
              <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/[0.08] shadow-inner">
                <TALogo className="h-12 w-auto text-[#e7d9cf]" glow />
              </div>
            </div>

            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase tracking-wider">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>{isQuotaError ? 'Memoria del Navegador Llena' : 'Error de Carga'}</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white uppercase tracking-tight">
                TA Bachata Academy
              </h2>
              <p className="text-xs sm:text-sm text-[#eeede9]/70 leading-relaxed">
                {isQuotaError
                  ? 'El almacenamiento temporal de tu navegador se llenó con datos en caché. Tocá "Reintentar" o "Limpiar Datos" para restablecer el espacio y continuar normalmente.'
                  : 'Ocurrió un inconveniente temporal al renderizar la vista. Podés reintentar o restablecer los datos guardados en tu navegador.'}
              </p>
            </div>

            {this.state.error && (
              <div className="bg-[#0c0c0b] p-3 rounded-xl border border-white/[0.06] text-left overflow-hidden">
                <p className="text-[11px] font-mono text-rose-300/90 break-words leading-tight">
                  {this.state.error.message || String(this.state.error)}
                </p>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                type="button"
                onClick={this.handleReload}
                className="flex-1 py-3 px-4 rounded-full bg-[#e7d9cf] hover:bg-[#eeede9] text-[#111111] font-black text-xs transition-all duration-200 shadow-lg shadow-black/40 flex items-center justify-center gap-2 cursor-pointer uppercase tracking-wider"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Reintentar</span>
              </button>

              <button
                type="button"
                onClick={this.handleResetLocalData}
                className="flex-1 py-3 px-4 rounded-full bg-white/[0.08] hover:bg-white/[0.12] text-[#eeede9] font-bold text-xs transition-all duration-200 border border-white/[0.08] flex items-center justify-center gap-2 cursor-pointer uppercase tracking-wider"
              >
                <RotateCcw className="w-3.5 h-3.5 text-[#e7d9cf]" />
                <span>Limpiar Datos</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
