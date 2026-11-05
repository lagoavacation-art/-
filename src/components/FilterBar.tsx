import React from 'react';
import { Filter, RotateCcw } from 'lucide-react';
import { FilterState } from '../types/bi';

interface FilterBarProps {
  filters: FilterState;
  onChangeFilter: <K extends keyof FilterState>(key: K, value: FilterState[K]) => void;
  onResetFilters: () => void;
  availableMonths: Array<{ value: string; label: string }>;
  availableHotels: string[];
  availableConsultores: string[];
  availableSdrs: string[];
  totalFilteredCouples: number;
  totalAllCouples: number;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  filters,
  onChangeFilter,
  onResetFilters,
  availableMonths,
  availableHotels,
  availableConsultores,
  availableSdrs,
  totalFilteredCouples,
  totalAllCouples
}) => {
  const isFiltered = 
    filters.mesAno !== 'all' || 
    filters.hotel !== 'all' || 
    filters.consultor !== 'all' || 
    filters.sdr !== 'all';

  return (
    <div className="border-b border-slate-200 bg-white px-4 py-3 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        {/* Filter Title & Count */}
        <div className="flex items-center gap-2 text-xs font-medium text-slate-700">
          <Filter className="h-4 w-4 text-blue-600" />
          <span className="font-semibold text-slate-900">Filtros Ativos:</span>
          <span className="tabular-nums font-semibold text-blue-700">
            {totalFilteredCouples.toLocaleString('pt-BR')}
          </span>
          <span className="text-slate-500">
            de {totalAllCouples.toLocaleString('pt-BR')} casais válidos
          </span>
        </div>

        {/* Dropdowns */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:flex lg:items-center lg:gap-3">
          {/* Período */}
          <div className="w-full lg:w-48">
            <label htmlFor="filter-period" className="sr-only">Período</label>
            <select
              id="filter-period"
              value={filters.mesAno}
              onChange={(e) => onChangeFilter('mesAno', e.target.value)}
              className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 shadow-2xs focus:border-blue-500 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
            >
              <option value="all">Todos os Meses</option>
              {availableMonths.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          {/* Hotel */}
          <div className="w-full lg:w-44">
            <label htmlFor="filter-hotel" className="sr-only">Hotel</label>
            <select
              id="filter-hotel"
              value={filters.hotel}
              onChange={(e) => onChangeFilter('hotel', e.target.value)}
              className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 shadow-2xs focus:border-blue-500 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
            >
              <option value="all">Todos os Hotéis</option>
              {availableHotels.map((h) => (
                <option key={h} value={h}>
                  {h}
                </option>
              ))}
            </select>
          </div>

          {/* SDR */}
          <div className="w-full lg:w-44">
            <label htmlFor="filter-sdr" className="sr-only">SDR</label>
            <select
              id="filter-sdr"
              value={filters.sdr}
              onChange={(e) => onChangeFilter('sdr', e.target.value)}
              className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 shadow-2xs focus:border-blue-500 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
            >
              <option value="all">Todos os SDRs</option>
              {availableSdrs.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {/* Consultor */}
          <div className="w-full lg:w-44">
            <label htmlFor="filter-consultor" className="sr-only">Consultor</label>
            <select
              id="filter-consultor"
              value={filters.consultor}
              onChange={(e) => onChangeFilter('consultor', e.target.value)}
              className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 shadow-2xs focus:border-blue-500 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
            >
              <option value="all">Todos os Consultores</option>
              {availableConsultores.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Botão Limpar Filtros */}
          {isFiltered && (
            <button
              type="button"
              onClick={onResetFilters}
              className="flex items-center justify-center gap-1 rounded-md bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-200 hover:text-slate-900 transition-colors col-span-2 sm:col-span-1"
            >
              <RotateCcw className="h-3 w-3" />
              <span>Limpar</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
