import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  CalendarDays,
  Briefcase,
  GitFork,
  Calendar,
  Users,
  ShieldCheck,
  Settings,
  X,
  Building2,
  RefreshCw
} from 'lucide-react';
import { ROUTES, NavViewId } from '../routes';

interface SidebarProps {
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  auditIssuesCount: number;
  lastSyncTime: string | null;
  onRefresh: () => void;
  isRefreshing: boolean;
  sourceType?: 'apps_script' | 'google_sheet_direct';
}

const NAV_ICONS: Record<NavViewId, React.ComponentType<{ className?: string }>> = {
  overview: LayoutDashboard,
  'monthly-flow': CalendarDays,
  'future-portfolio': Briefcase,
  'confirmation-flow': GitFork,
  agenda: Calendar,
  team: Users,
  audit: ShieldCheck,
  settings: Settings
};

export const Sidebar: React.FC<SidebarProps> = ({
  isOpenMobile,
  onCloseMobile,
  auditIssuesCount,
  lastSyncTime,
  onRefresh,
  isRefreshing,
  sourceType
}) => {
  const location = useLocation();
  const currentPath = location.pathname.toLowerCase().replace(/\/$/, '') || '/dashboard';

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-xs lg:hidden"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-slate-200 bg-slate-900 text-slate-100 transition-transform duration-200 ease-in-out lg:static lg:translate-x-0 ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-slate-800 px-5">
          <Link
            to={{ pathname: '/dashboard', search: location.search }}
            className="flex items-center gap-3 hover:opacity-90 transition-opacity"
            onClick={onCloseMobile}
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600 text-white font-bold tracking-tight shadow-xs">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm font-bold tracking-tight text-white leading-tight">
                LAGOA BI
              </div>
              <div className="text-xs text-slate-400 font-medium">
                Controle Comercial · Mini-Vac
              </div>
            </div>
          </Link>
          <button
            type="button"
            onClick={onCloseMobile}
            className="rounded-md p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white lg:hidden"
            aria-label="Fechar navegação"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation Links with Real React Router Links */}
        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          <div className="px-3 py-2 text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
            Coordenação Comercial
          </div>
          {ROUTES.map((route) => {
            const Icon = NAV_ICONS[route.id];
            const isActive = currentPath === route.path || (currentPath === '/' && route.path === '/dashboard');
            return (
              <Link
                key={route.id}
                to={{ pathname: route.path, search: location.search }}
                onClick={onCloseMobile}
                className={`group flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white font-semibold shadow-xs'
                    : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`h-4 w-4 shrink-0 transition-colors ${
                      isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'
                    }`}
                  />
                  <span>{route.label}</span>
                </div>
                {route.id === 'audit' && auditIssuesCount > 0 && (
                  <span
                    className={`rounded px-1.5 py-0.5 text-[10px] font-semibold tabular-nums ${
                      isActive
                        ? 'bg-white/20 text-white'
                        : 'bg-rose-500/20 text-rose-300'
                    }`}
                  >
                    {auditIssuesCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Bottom Connection Status & Quick Action */}
        <div className="border-t border-slate-800 p-4">
          <div className="rounded-lg bg-slate-800/70 p-3 text-xs">
            <div className="flex items-center justify-between text-slate-300 mb-1.5">
              <span className="text-[11px] font-medium text-slate-400">Fonte Conectada</span>
              <span className="text-[10px] font-semibold text-emerald-400">
                {sourceType === 'apps_script' ? 'Apps Script' : 'Planilha Oficial'}
              </span>
            </div>
            <div className="text-[11px] text-slate-400 truncate">
              {lastSyncTime ? `Atualizado: ${lastSyncTime}` : 'Sincronizando...'}
            </div>
            <button
              type="button"
              onClick={onRefresh}
              disabled={isRefreshing}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-md bg-slate-700/80 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700 hover:text-white transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>{isRefreshing ? 'Atualizando...' : 'Atualizar agora'}</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
