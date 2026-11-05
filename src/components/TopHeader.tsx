import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Menu, RefreshCw, Database, ShieldAlert, Share2, Check } from 'lucide-react';
import { getRouteByPathname } from '../routes';

interface TopHeaderProps {
  onOpenMobile: () => void;
  onRefresh: () => void;
  isRefreshing: boolean;
  lastSyncTime: string | null;
  currentDateStr: string;
  auditIssuesCount: number;
  sourceType?: 'apps_script' | 'google_sheet_direct';
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  onOpenMobile,
  onRefresh,
  isRefreshing,
  lastSyncTime,
  currentDateStr,
  auditIssuesCount,
  sourceType
}) => {
  const location = useLocation();
  const currentRoute = getRouteByPathname(location.pathname);
  const [copied, setCopied] = useState(false);

  const handleCopyLink = async () => {
    try {
      const fullUrl = window.location.origin + location.pathname + location.search;
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error('Falha ao copiar link:', err);
    }
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur-xs sm:px-6 lg:px-8">
      {/* Left zone: Mobile trigger + Breadcrumb / Title */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onOpenMobile}
          className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800 lg:hidden"
          aria-label="Abrir menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-blue-700 uppercase tracking-wider">
              LAGOA BI
            </span>
            <span className="text-xs text-slate-300 font-bold">/</span>
            <h1 className="text-sm sm:text-base font-bold text-slate-900 truncate">
              {currentRoute.title}
            </h1>
          </div>
          <p className="hidden text-xs text-slate-500 sm:block truncate max-w-xl">
            {currentRoute.subtitle}
          </p>
        </div>
      </div>

      {/* Right zone: Contextual info, Copy Link, Refresh CTA */}
      <div className="flex items-center gap-2.5 sm:gap-3.5 shrink-0">
        <div className="hidden md:flex flex-col items-end text-xs">
          <div className="flex items-center gap-1.5 text-slate-600 font-medium">
            <Database className="h-3.5 w-3.5 text-blue-600" />
            <span>Base: {sourceType === 'apps_script' ? 'Apps Script (/exec)' : 'Planilha Oficial'}</span>
          </div>
          <span className="text-[11px] text-slate-400">
            Corte: {currentDateStr || 'Hoje'}
          </span>
        </div>

        {auditIssuesCount > 0 && (
          <div className="hidden lg:flex items-center gap-1 rounded-md bg-amber-50 px-2 py-1 text-xs font-medium text-amber-800 border border-amber-200">
            <ShieldAlert className="h-3.5 w-3.5 text-amber-600" />
            <span className="tabular-nums">{auditIssuesCount} pendências</span>
          </div>
        )}

        {/* Botão Copiar link desta página */}
        <button
          type="button"
          onClick={handleCopyLink}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-colors shadow-2xs whitespace-nowrap ${
            copied
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
          }`}
          title="Copiar endereço compartilhável desta aba com os filtros atuais"
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5 text-emerald-600" />
              <span>Link copiado!</span>
            </>
          ) : (
            <>
              <Share2 className="h-3.5 w-3.5 text-slate-600" />
              <span className="hidden sm:inline">Copiar link</span>
            </>
          )}
        </button>

        {/* Botão Atualizar agora */}
        <button
          type="button"
          onClick={onRefresh}
          disabled={isRefreshing}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 transition-colors disabled:opacity-60 whitespace-nowrap"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">{isRefreshing ? 'Atualizando...' : 'Atualizar agora'}</span>
          <span className="sm:hidden">{isRefreshing ? '...' : 'Atualizar'}</span>
        </button>
      </div>
    </header>
  );
};
