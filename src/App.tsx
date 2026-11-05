/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Sidebar, NavViewId } from './components/Sidebar';
import { TopHeader } from './components/TopHeader';
import { FilterBar } from './components/FilterBar';
import { DisconnectedState } from './components/DisconnectedState';

import { OverviewView } from './components/views/OverviewView';
import { MonthlyFlowView } from './components/views/MonthlyFlowView';
import { FuturePortfolioView } from './components/views/FuturePortfolioView';
import { ConfirmationFlowView } from './components/views/ConfirmationFlowView';
import { OperationalAgendaView } from './components/views/OperationalAgendaView';
import { CommercialTeamView } from './components/views/CommercialTeamView';
import { AuditView } from './components/views/AuditView';
import { SettingsView } from './components/views/SettingsView';

import { BIDataset, FilterState } from './types/bi';
import { filterDataset } from './shared/biEngine';
import { RefreshCw, Building2 } from 'lucide-react';

export default function App() {
  const [currentView, setCurrentView] = useState<NavViewId>('overview');
  const [dataset, setDataset] = useState<BIDataset | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isOpenMobile, setIsOpenMobile] = useState<boolean>(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);

  // Filtros Globais
  const [filters, setFilters] = useState<FilterState>({
    mesAno: 'all',
    hotel: 'all',
    consultor: 'all',
    sdr: 'all'
  });

  // Função para buscar dados da API
  const fetchBIApiData = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) setIsRefreshing(true);
    try {
      const url = `/api/data${isManualRefresh ? '?refresh=1' : ''}`;
      const res = await fetch(url);
      const text = await res.text();

      let data: any;
      try {
        data = JSON.parse(text);
      } catch (jsonErr) {
        throw new Error(
          `A API retornou uma resposta não-JSON (status ${res.status}): ${text.slice(0, 150)}...`
        );
      }

      if (!data || data.success === false) {
        throw new Error(data?.error || 'Não foi possível carregar os dados da fonte.');
      }

      setDataset(data);
      setErrorMessage(null);
      const now = new Date();
      setLastSyncTime(now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
    } catch (err: any) {
      console.error('Erro na sincronização:', err.message);
      if (!dataset) {
        setErrorMessage(err.message);
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [dataset]);

  // Carregamento inicial e timer de atualização a cada 5 minutos
  useEffect(() => {
    fetchBIApiData(false);

    const interval = setInterval(() => {
      fetchBIApiData(false);
    }, 5 * 60 * 1000); // 5 minutos

    return () => clearInterval(interval);
  }, [fetchBIApiData]);

  // Manipuladores de Filtro
  const handleFilterChange = <K extends keyof FilterState>(key: K, value: FilterState[K]) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleResetFilters = () => {
    setFilters({
      mesAno: 'all',
      hotel: 'all',
      consultor: 'all',
      sdr: 'all'
    });
  };

  // Aplica filtros dinâmicos aos dados mantendo consistência estrita
  const filteredDataset = useMemo(() => {
    if (!dataset) return null;
    return filterDataset(dataset, filters);
  }, [dataset, filters]);

  // Estado de Carregamento Inicial
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-900 text-white shadow-md mb-4">
          <Building2 className="h-6 w-6" />
        </div>
        <div className="flex items-center gap-2 text-slate-800 text-sm font-semibold">
          <RefreshCw className="h-4 w-4 animate-spin text-blue-600" />
          <span>Carregando indicadores do LAGOA BI...</span>
        </div>
        <p className="mt-2 text-xs text-slate-500">
          Processando registros e regras de auditoria de casais
        </p>
      </div>
    );
  }

  // Estado Desconectado (Sem dados e com erro)
  if (!dataset && errorMessage) {
    return (
      <DisconnectedState
        errorMessage={errorMessage}
        onRetry={() => {
          setIsLoading(true);
          fetchBIApiData(true);
        }}
        isRetrying={isLoading || isRefreshing}
        onConfigSaved={() => {
          setIsLoading(true);
          fetchBIApiData(true);
        }}
      />
    );
  }

  if (!dataset || !filteredDataset) {
    return null;
  }

  const auditIssuesCount = dataset.audit.pendenciasAuditadas;

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar Lateral */}
      <Sidebar
        currentView={currentView}
        onSelectView={setCurrentView}
        isOpenMobile={isOpenMobile}
        onCloseMobile={() => setIsOpenMobile(false)}
        auditIssuesCount={auditIssuesCount}
        lastSyncTime={lastSyncTime}
        onRefresh={() => fetchBIApiData(true)}
        isRefreshing={isRefreshing}
        sourceType={dataset.sourceType}
      />

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col min-w-0 overflow-y-auto h-screen">
        {/* Top Header */}
        <TopHeader
          currentView={currentView}
          onOpenMobile={() => setIsOpenMobile(true)}
          onRefresh={() => fetchBIApiData(true)}
          isRefreshing={isRefreshing}
          lastSyncTime={lastSyncTime}
          currentDateStr={dataset.currentDate}
          auditIssuesCount={auditIssuesCount}
          sourceType={dataset.sourceType}
        />

        {/* Global Filter Bar (Present in analytics views) */}
        {currentView !== 'settings' && (
          <FilterBar
            filters={filters}
            onChangeFilter={handleFilterChange}
            onResetFilters={handleResetFilters}
            availableMonths={dataset.availableFilters.months}
            availableHotels={dataset.availableFilters.hotels}
            availableConsultores={dataset.availableFilters.consultores}
            availableSdrs={dataset.availableFilters.sdrs}
            totalFilteredCouples={filteredDataset.audit.casaisValidosContabilizados}
            totalAllCouples={dataset.audit.casaisValidosContabilizados}
          />
        )}

        {/* Banner de Aviso de Conexão Apps Script se houver */}
        {dataset.warning && (
          <div className="border-b border-amber-200 bg-amber-50 px-4 py-2.5 sm:px-6 lg:px-8 text-xs text-amber-900 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="font-bold text-amber-950 uppercase text-[10px] tracking-wider rounded bg-amber-200/80 px-1.5 py-0.5">
                Aviso de Conexão
              </span>
              <span>
                {dataset.warning}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setCurrentView('settings')}
              className="font-semibold text-blue-700 hover:text-blue-900 underline whitespace-nowrap text-xs shrink-0"
            >
              Ver instruções
            </button>
          </div>
        )}

        {/* Main View Port */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {currentView === 'overview' && (
            <OverviewView dataset={filteredDataset} />
          )}

          {currentView === 'monthly-flow' && (
            <MonthlyFlowView dataset={filteredDataset} />
          )}

          {currentView === 'future-portfolio' && (
            <FuturePortfolioView dataset={filteredDataset} />
          )}

          {currentView === 'confirmation-flow' && (
            <ConfirmationFlowView dataset={filteredDataset} />
          )}

          {currentView === 'agenda' && (
            <OperationalAgendaView dataset={filteredDataset} />
          )}

          {currentView === 'team' && (
            <CommercialTeamView dataset={filteredDataset} />
          )}

          {currentView === 'audit' && (
            <AuditView dataset={dataset} />
          )}

          {currentView === 'settings' && (
            <SettingsView
              dataset={dataset}
              onRefreshData={() => fetchBIApiData(true)}
            />
          )}
        </main>
      </div>
    </div>
  );
}
