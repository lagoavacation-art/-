/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Sidebar } from './components/Sidebar';
import { TopHeader } from './components/TopHeader';
import { FilterBar } from './components/FilterBar';
import { DisconnectedState } from './components/DisconnectedState';

import { OverviewView } from './components/views/OverviewView';
import { RealizedReservationsView } from './components/views/RealizedReservationsView';
import { MonthlyFlowView } from './components/views/MonthlyFlowView';
import { MonthlyFlowV2View } from './components/views/MonthlyFlowV2View';
import { ConfirmationFlowView } from './components/views/ConfirmationFlowView';
import { OperationalAgendaView } from './components/views/OperationalAgendaView';
import { CommercialTeamView } from './components/views/CommercialTeamView';
import { FinancialView } from './components/views/FinancialView';
import { AuditView } from './components/views/AuditView';
import { SettingsView } from './components/views/SettingsView';

import { BIDataset, FilterState } from './types/bi';
import { filterDataset } from './shared/biEngine';
import { RefreshCw, Building2 } from 'lucide-react';

export default function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [dataset, setDataset] = useState<BIDataset | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isOpenMobile, setIsOpenMobile] = useState<boolean>(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);

  // Filtros Globais sincronizados com Parâmetros de URL (mes, hotel, consultor, sdr)
  const filters: FilterState = useMemo(() => ({
    mesAno: searchParams.get('mes') || 'all',
    hotel: searchParams.get('hotel') || 'all',
    consultor: searchParams.get('consultor') || 'all',
    sdr: searchParams.get('sdr') || 'all'
  }), [searchParams]);

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

  // Manipuladores de Filtro que sincronizam com a URL do navegador
  const handleFilterChange = <K extends keyof FilterState>(key: K, value: FilterState[K]) => {
    const newParams = new URLSearchParams(searchParams);
    const paramKey = key === 'mesAno' ? 'mes' : key;
    if (value === 'all' || !value) {
      newParams.delete(paramKey);
    } else {
      newParams.set(paramKey, String(value));
    }
    setSearchParams(newParams, { replace: true });
  };

  const handleResetFilters = () => {
    const newParams = new URLSearchParams(searchParams);
    newParams.delete('mes');
    newParams.delete('hotel');
    newParams.delete('consultor');
    newParams.delete('sdr');
    setSearchParams(newParams, { replace: true });
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
          Atualizando dados comerciais
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
  const isSettingsPage = location.pathname.toLowerCase().startsWith('/configuracoes');

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar Lateral com Links do React Router */}
      <Sidebar
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
        {/* Top Header com Botão de Copiar Link Compartilhável */}
        <TopHeader
          onOpenMobile={() => setIsOpenMobile(true)}
          onRefresh={() => fetchBIApiData(true)}
          isRefreshing={isRefreshing}
          lastSyncTime={lastSyncTime}
          currentDateStr={dataset.currentDate}
          auditIssuesCount={auditIssuesCount}
          sourceType={dataset.sourceType}
        />

        {/* Global Filter Bar (Presente nas abas analíticas, oculta em configurações) */}
        {!isSettingsPage && (
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

        {/* Main View Port com Rotas Reais do React Router */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <Routes>
            <Route path="/" element={<Navigate to={`/dashboard${location.search}`} replace />} />
            <Route path="/dashboard" element={<OverviewView dataset={filteredDataset} />} />
            <Route path="/reservas-realizadas" element={<RealizedReservationsView dataset={filteredDataset} />} />
            <Route path="/carteira-futura" element={<Navigate to={`/dashboard${location.search}`} replace />} />
            <Route path="/evolucao-mensal" element={<MonthlyFlowView dataset={filteredDataset} />} />
            <Route path="/evolucao-mensal-v2" element={<MonthlyFlowV2View dataset={filteredDataset} />} />
            <Route path="/fluxo-confirmacoes" element={<ConfirmationFlowView dataset={filteredDataset} />} />
            <Route path="/agenda" element={<OperationalAgendaView dataset={filteredDataset} />} />
            <Route path="/equipe" element={<CommercialTeamView dataset={filteredDataset} />} />
            <Route path="/vendas-valores" element={<FinancialView dataset={filteredDataset} />} />
            <Route path="/auditoria" element={<AuditView dataset={dataset} />} />
            <Route
              path="/configuracoes"
              element={
                <SettingsView
                  dataset={dataset}
                  onRefreshData={() => fetchBIApiData(true)}
                />
              }
            />
            {/* Fallback de rotas desconhecidas redireciona para /dashboard preservando filtros */}
            <Route path="*" element={<Navigate to={`/dashboard${location.search}`} replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
