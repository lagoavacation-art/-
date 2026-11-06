import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  CalendarDays,
  ClipboardCheck,
  GitFork,
  Calendar,
  Users,
  ShieldCheck,
  Settings,
  X,
  Building2,
  RefreshCw,
  CircleDollarSign,
  LineChart
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
  'realized-reservations': ClipboardCheck,
  financial: CircleDollarSign,
  'monthly-flow': CalendarDays,
  'monthly-flow-v2': LineChart,
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
              </Link>
            );
          })}
        </nav>

        {/* Discreet Executive Footer */}
        <div className="border-t border-slate-800 p-4">
          <div className="flex items-center justify-center gap-2 rounded-lg bg-slate-800/40 py-2.5 px-3 text-[11px] text-slate-400 font-medium">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            <span>Atualizado em tempo real</span>
          </div>
        </div>
      </aside>
    </>
  );
};
