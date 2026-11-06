import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Calendar,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  Download,
  Filter,
  BarChart3,
  LineChart,
  PieChart,
  HelpCircle,
  Clock,
  Sparkles,
  Search,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Eye,
  CheckCircle2,
  CalendarRange
} from 'lucide-react';
import { BIDataset, MonthlyFlowItem } from '../../types/bi';

interface MonthlyFlowV2ViewProps {
  dataset: BIDataset;
}

type PeriodPreset = '6m' | '12m' | '24m' | 'all' | 'custom';
type StatusFilter = 'all' | 'concluido' | 'em_andamento' | 'futuro';

export const MonthlyFlowV2View: React.FC<MonthlyFlowV2ViewProps> = ({ dataset }) => {
  const { monthlyFlow, currentDate } = dataset;

  // Filtros Superiores
  const [periodPreset, setPeriodPreset] = useState<PeriodPreset>('12m');
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [customStartMonth, setCustomStartMonth] = useState<string>('');
  const [customEndMonth, setCustomEndMonth] = useState<string>('');

  // Tabela Gerencial (Pesquisa, Paginação, Ordenação)
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [tableSortAsc, setTableSortAsc] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 10;

  // Tooltip / Hover nos gráficos
  const [hoveredItem, setHoveredItem] = useState<MonthlyFlowItem | null>(null);

  // Anos disponíveis na base
  const availableYears = useMemo(() => {
    const years = new Set<string>();
    monthlyFlow.forEach(item => {
      const y = item.mesAno.split('-')[0];
      if (y) years.add(y);
    });
    return Array.from(years).sort().reverse();
  }, [monthlyFlow]);

  // Lista ordenada cronologicamente (antigo -> recente) para filtros de períodos
  const chronologicalFlow = useMemo(() => {
    return [...monthlyFlow].sort((a, b) => a.mesAno.localeCompare(b.mesAno));
  }, [monthlyFlow]);

  // Aplicação dos Filtros Gerais sobre o dataset
  const filteredFlow = useMemo(() => {
    let list = [...chronologicalFlow];

    // Filtro por Preset ou Custom
    if (periodPreset === '6m') {
      // Últimos 6 meses até o mês atual + meses futuros se houver, ou últimos 6 cronológicos
      const currentIdx = list.findIndex(item => item.isCurrentMonth);
      if (currentIdx !== -1) {
        const start = Math.max(0, currentIdx - 5);
        list = list.slice(start, currentIdx + 1);
      } else {
        list = list.slice(-6);
      }
    } else if (periodPreset === '12m') {
      const currentIdx = list.findIndex(item => item.isCurrentMonth);
      if (currentIdx !== -1) {
        const start = Math.max(0, currentIdx - 11);
        list = list.slice(start, currentIdx + 1);
      } else {
        list = list.slice(-12);
      }
    } else if (periodPreset === '24m') {
      const currentIdx = list.findIndex(item => item.isCurrentMonth);
      if (currentIdx !== -1) {
        const start = Math.max(0, currentIdx - 23);
        list = list.slice(start, currentIdx + 1);
      } else {
        list = list.slice(-24);
      }
    } else if (periodPreset === 'custom') {
      if (customStartMonth) {
        list = list.filter(item => item.mesAno >= customStartMonth);
      }
      if (customEndMonth) {
        list = list.filter(item => item.mesAno <= customEndMonth);
      }
    }

    // Filtro por Ano específico
    if (selectedYear !== 'all') {
      list = list.filter(item => item.mesAno.startsWith(selectedYear));
    }

    // Filtro por Status
    if (statusFilter === 'concluido') {
      list = list.filter(item => item.isPastMonth);
    } else if (statusFilter === 'em_andamento') {
      list = list.filter(item => item.isCurrentMonth);
    } else if (statusFilter === 'futuro') {
      list = list.filter(item => item.isFutureMonth);
    }

    return list;
  }, [chronologicalFlow, periodPreset, selectedYear, statusFilter, customStartMonth, customEndMonth]);

  // ÁREA 1 — INDICADORES EXECUTIVOS (somatório e médias do período filtrado)
  const executiveKPIs = useMemo(() => {
    const totalAbertura = filteredFlow.reduce((acc, cur) => acc + cur.abertura, 0);
    const totalEntradas = filteredFlow.reduce((acc, cur) => acc + cur.entradas, 0);
    const totalProg = filteredFlow.reduce((acc, cur) => acc + cur.totalProgramado, 0);
    const totalRestante = filteredFlow.reduce((acc, cur) => acc + cur.agendaRestante, 0);

    const participacaoEntradasPct = totalProg > 0
      ? Math.round(((totalEntradas / totalProg) * 100) * 10) / 10
      : 0;

    return {
      totalAbertura,
      totalEntradas,
      totalProg,
      totalRestante,
      participacaoEntradasPct,
      countMonths: filteredFlow.length
    };
  }, [filteredFlow]);

  // ÁREA 3 — ANÁLISE GERENCIAL (Mês de pico, médias entre concluídos, variação MoM comparável)
  const executiveAnalysis = useMemo(() => {
    if (filteredFlow.length === 0) {
      return {
        mesPicoProgramado: null,
        mesPicoEntradas: null,
        mediaConcluidos: null,
        variacaoUltimoMoM: null,
        tendenciaGeral: 'Dados insuficientes'
      };
    }

    // Mês com maior Total Programado
    let picoProg = filteredFlow[0];
    let picoEntradas = filteredFlow[0];

    filteredFlow.forEach(item => {
      if (item.totalProgramado > picoProg.totalProgramado) picoProg = item;
      if (item.entradas > picoEntradas.entradas) picoEntradas = item;
    });

    // Média de Total Programado entre meses Concluídos
    const concluidos = filteredFlow.filter(item => item.isPastMonth);
    const mediaConcluidos = concluidos.length > 0
      ? Math.round((concluidos.reduce((acc, cur) => acc + cur.totalProgramado, 0) / concluidos.length) * 10) / 10
      : null;

    // Variação percentual entre os 2 últimos meses comparáveis no período
    let variacaoUltimoMoM: { val: number; rotulo: string } | null = null;
    if (filteredFlow.length >= 2) {
      const penultimo = filteredFlow[filteredFlow.length - 2];
      const ultimo = filteredFlow[filteredFlow.length - 1];
      if (penultimo.totalProgramado > 0) {
        const diff = ultimo.totalProgramado - penultimo.totalProgramado;
        const pct = Math.round(((diff / penultimo.totalProgramado) * 100) * 10) / 10;
        variacaoUltimoMoM = {
          val: pct,
          rotulo: `${ultimo.label} vs ${penultimo.label}`
        };
      }
    }

    // Tendência histórica (Primeiro terço vs Último terço do período)
    let tendenciaGeral = 'Estável';
    if (filteredFlow.length >= 3) {
      const split = Math.max(1, Math.floor(filteredFlow.length / 3));
      const iniSlice = filteredFlow.slice(0, split);
      const fimSlice = filteredFlow.slice(-split);
      const avgIni = iniSlice.reduce((acc, c) => acc + c.totalProgramado, 0) / iniSlice.length;
      const avgFim = fimSlice.reduce((acc, c) => acc + c.totalProgramado, 0) / fimSlice.length;

      if (avgFim > avgIni * 1.05) tendenciaGeral = 'Tendência de Alta';
      else if (avgFim < avgIni * 0.95) tendenciaGeral = 'Tendência de Redução';
      else tendenciaGeral = 'Comportamento Estável';
    }

    return {
      mesPicoProgramado: picoProg,
      mesPicoEntradas: picoEntradas,
      mediaConcluidos,
      variacaoUltimoMoM,
      tendenciaGeral
    };
  }, [filteredFlow]);

  // Escalas e limites para os gráficos
  const maxProg = Math.max(...filteredFlow.map(f => f.totalProgramado), 1);
  const maxRestante = Math.max(...filteredFlow.map(f => f.agendaRestante), 1);

  // ÁREA 4 — TABELA GERENCIAL COM PESQUISA, ORDENAÇÃO E PAGINAÇÃO
  const tableData = useMemo(() => {
    let list = [...filteredFlow];

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      list = list.filter(item => 
        item.label.toLowerCase().includes(term) ||
        item.mesAno.includes(term)
      );
    }

    list.sort((a, b) => {
      return tableSortAsc
        ? a.mesAno.localeCompare(b.mesAno)
        : b.mesAno.localeCompare(a.mesAno);
    });

    return list;
  }, [filteredFlow, searchTerm, tableSortAsc]);

  const totalPages = Math.ceil(tableData.length / itemsPerPage) || 1;
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return tableData.slice(start, start + itemsPerPage);
  }, [tableData, currentPage, itemsPerPage]);

  // Exportação CSV
  const handleExportCSV = () => {
    const headers = [
      'Mes_Apresentacao',
      'Rotulo',
      'Abertura',
      'Novas_Entradas',
      'Total_Programado',
      'Agenda_Restante',
      'Status_Calendario'
    ];

    const rows = tableData.map(item => [
      item.mesAno,
      `"${item.label}"`,
      item.abertura,
      item.entradas,
      item.totalProgramado,
      item.agendaRestante,
      `"${item.isCurrentMonth ? 'Em andamento' : item.isPastMonth ? 'Concluído' : 'Futuro'}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `LAGOA_BI_Evolucao_Mensal_Visao_II_${currentDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Top Header Executivo da Visão II */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5 shadow-2xs">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 rounded-md bg-blue-700 px-2.5 py-1 text-[11px] font-bold text-white tracking-wide uppercase shadow-xs">
                <BarChart3 className="h-3.5 w-3.5" />
                Evolução Mensal · Visão II
              </span>
              <span className="text-slate-300 font-bold">·</span>
              <span className="text-xs font-semibold text-slate-500">
                Dashboard Executivo de Programação
              </span>
            </div>
            <p className="mt-1.5 text-xs text-slate-500 leading-relaxed max-w-3xl">
              Análise gerencial aprofundada da programação de apresentações comerciais. Visualização histórica, movimentação de novas entradas e comportamento da agenda restante.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-700 px-3.5 py-2 text-xs font-bold text-white hover:bg-blue-800 shadow-2xs transition-colors"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Exportar Dados (CSV)</span>
            </button>
          </div>
        </div>

        {/* Barra de Filtros Integrados */}
        <div className="mt-5 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Seletor de Períodos Rápidos */}
          <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1 flex-wrap">
            <span className="text-[11px] font-bold text-slate-500 px-2 uppercase">Período:</span>
            {(['6m', '12m', '24m', 'all'] as PeriodPreset[]).map(preset => {
              const labels: Record<PeriodPreset, string> = {
                '6m': 'Últimos 6m',
                '12m': 'Últimos 12m',
                '24m': 'Últimos 24m',
                'all': 'Histórico Completo',
                'custom': 'Personalizado'
              };
              return (
                <button
                  key={preset}
                  type="button"
                  onClick={() => {
                    setPeriodPreset(preset);
                    setCurrentPage(1);
                  }}
                  className={`rounded-md px-2.5 py-1 font-semibold transition-all ${
                    periodPreset === preset
                      ? 'bg-white text-blue-900 shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {labels[preset]}
                </button>
              );
            })}
          </div>

          {/* Filtros Complementares: Ano e Status */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 font-medium">Ano:</span>
              <select
                value={selectedYear}
                onChange={e => {
                  setSelectedYear(e.target.value);
                  setCurrentPage(1);
                }}
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 shadow-2xs focus:border-blue-500 focus:outline-hidden"
              >
                <option value="all">Todos os Anos</option>
                {availableYears.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 font-medium">Status:</span>
              <select
                value={statusFilter}
                onChange={e => {
                  setStatusFilter(e.target.value as StatusFilter);
                  setCurrentPage(1);
                }}
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 shadow-2xs focus:border-blue-500 focus:outline-hidden"
              >
                <option value="all">Todos os Status</option>
                <option value="concluido">Concluídos</option>
                <option value="em_andamento">Em Andamento</option>
                <option value="futuro">Futuros</option>
              </select>
            </div>

            <div className="rounded-md bg-blue-50 px-2 py-1 text-[11px] font-bold text-blue-900">
              {filteredFlow.length} meses selecionados
            </div>
          </div>
        </div>
      </div>

      {/* ÁREA 1 — CARTÕES DE INDICADORES EXECUTIVOS */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {/* 1. Abertura */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold text-slate-600">Abertura</span>
            <div className="rounded-lg bg-blue-50 p-1.5 text-blue-600">
              <Calendar className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold tracking-tight text-blue-800 font-mono tabular-nums">
              {executiveKPIs.totalAbertura.toLocaleString('pt-BR')}
            </span>
            <span className="text-xs text-slate-500">apresentações</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500 truncate">
            Confirmados antes do 1º dia
          </div>
        </div>

        {/* 2. Novas Entradas */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold text-slate-600">Novas Entradas</span>
            <div className="rounded-lg bg-emerald-50 p-1.5 text-emerald-600">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold tracking-tight text-emerald-700 font-mono tabular-nums">
              {executiveKPIs.totalEntradas.toLocaleString('pt-BR')}
            </span>
            <span className="text-xs text-slate-500">apresentações</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500 truncate">
            Incorporados durante o próprio mês
          </div>
        </div>

        {/* 3. Total Programado */}
        <div className="rounded-xl border border-blue-300 bg-gradient-to-br from-blue-900 to-slate-900 text-white p-4 shadow-xs">
          <div className="flex items-center justify-between text-blue-200">
            <span className="text-xs font-semibold uppercase tracking-wider text-blue-100">
              Total Programado
            </span>
            <div className="rounded-lg bg-white/10 p-1.5 text-white">
              <Layers className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold tracking-tight text-white font-mono tabular-nums">
              {executiveKPIs.totalProg.toLocaleString('pt-BR')}
            </span>
            <span className="text-xs text-blue-200">apresentações</span>
          </div>
          <div className="mt-2 text-[11px] text-blue-200/90 truncate">
            Abertura + Novas Entradas
          </div>
        </div>

        {/* 4. Agenda Restante */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold text-slate-600">Agenda Restante</span>
            <div className="rounded-lg bg-indigo-50 p-1.5 text-indigo-600">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold tracking-tight text-indigo-700 font-mono tabular-nums">
              {executiveKPIs.totalRestante.toLocaleString('pt-BR')}
            </span>
            <span className="text-xs text-slate-500">pendentes</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500 truncate">
            Apresentações não vencidas na base
          </div>
        </div>

        {/* 5. Participação das Novas Entradas (%) */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold text-slate-600">Participação Entradas</span>
            <div className="rounded-lg bg-teal-50 p-1.5 text-teal-600">
              <Sparkles className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold tracking-tight text-teal-700 font-mono tabular-nums">
              {executiveKPIs.participacaoEntradasPct.toFixed(1).replace('.', ',')}%
            </span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500 truncate">
            Novas Entradas ÷ Total Programado
          </div>
        </div>
      </div>

      {/* ÁREA 2 — GRÁFICOS GERENCIAIS (Linha, Barras Empilhadas, Agenda Restante, Participação) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* GRÁFICO 1 — Evolução do Total Programado (Gráfico de Linha com SVG) */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                1. Evolução do Total Programado
              </h2>
              <p className="text-xs text-slate-500">
                Curva de apresentações programadas ao longo do período selecionado
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="flex items-center gap-1 text-[11px] text-slate-600">
                <span className="h-2.5 w-2.5 rounded-full bg-blue-600 inline-block" />
                <span>Total Programado</span>
              </span>
            </div>
          </div>

          {filteredFlow.length === 0 ? (
            <div className="py-16 text-center text-xs text-slate-400">
              Nenhum mês corresponde aos filtros selecionados.
            </div>
          ) : (
            <div className="flex-1 flex flex-col justify-end pt-4">
              {/* SVG Line Chart */}
              <div className="h-60 w-full relative">
                {(() => {
                  const width = 600;
                  const height = 220;
                  const padding = { top: 25, right: 25, bottom: 35, left: 45 };
                  const graphW = width - padding.left - padding.right;
                  const graphH = height - padding.top - padding.bottom;

                  const stepX = filteredFlow.length > 1 ? graphW / (filteredFlow.length - 1) : graphW / 2;
                  
                  const points = filteredFlow.map((item, idx) => {
                    const x = padding.left + (filteredFlow.length > 1 ? idx * stepX : graphW / 2);
                    const y = padding.top + graphH - (item.totalProgramado / maxProg) * graphH;
                    return { x, y, item };
                  });

                  const pathD = points.length === 1
                    ? `M ${points[0].x} ${points[0].y}`
                    : points.reduce((acc, pt, i) => i === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`, '');

                  return (
                    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
                      {/* Grid Horizontal */}
                      {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
                        const yVal = padding.top + graphH - pct * graphH;
                        const labelVal = Math.round(maxProg * pct);
                        return (
                          <g key={i}>
                            <line
                              x1={padding.left}
                              y1={yVal}
                              x2={width - padding.right}
                              y2={yVal}
                              stroke="#f1f5f9"
                              strokeWidth="1"
                            />
                            <text
                              x={padding.left - 8}
                              y={yVal + 3}
                              textAnchor="end"
                              className="text-[9px] fill-slate-400 font-mono"
                            >
                              {labelVal}
                            </text>
                          </g>
                        );
                      })}

                      {/* Linha do Gráfico */}
                      <path
                        d={pathD}
                        fill="none"
                        stroke="#2563eb"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />

                      {/* Pontos Interativos */}
                      {points.map((pt, idx) => {
                        const isCurrent = pt.item.isCurrentMonth;
                        const isPast = pt.item.isPastMonth;
                        const isFuture = pt.item.isFutureMonth;

                        let fillColor = '#2563eb';
                        if (isCurrent) fillColor = '#1d4ed8';
                        else if (isFuture) fillColor = '#6366f1';

                        return (
                          <g
                            key={idx}
                            className="cursor-pointer group"
                            onMouseEnter={() => setHoveredItem(pt.item)}
                            onMouseLeave={() => setHoveredItem(null)}
                          >
                            <circle
                              cx={pt.x}
                              cy={pt.y}
                              r={isCurrent ? 6 : 4}
                              fill={fillColor}
                              stroke="#ffffff"
                              strokeWidth="2"
                              className="transition-all hover:r-7"
                            />
                            {/* Label do Mês no Eixo X */}
                            <text
                              x={pt.x}
                              y={height - 8}
                              textAnchor="middle"
                              className={`text-[9px] ${isCurrent ? 'fill-blue-900 font-bold' : 'fill-slate-500 font-medium'}`}
                            >
                              {pt.item.label.split('/')[0].slice(0, 3)}
                            </text>
                          </g>
                        );
                      })}
                    </svg>
                  );
                })()}
              </div>

              {/* Legenda de Status */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[10px] text-slate-500">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-slate-400 inline-block" />
                    <span>Concluído</span>
                  </span>
                  <span className="flex items-center gap-1 font-semibold text-blue-900">
                    <span className="h-2 w-2 rounded-full bg-blue-700 inline-block ring-2 ring-blue-300" />
                    <span>Mês Atual</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-indigo-500 inline-block" />
                    <span>Futuro</span>
                  </span>
                </div>
                {hoveredItem && (
                  <span className="font-mono text-blue-900 font-bold">
                    {hoveredItem.label}: {hoveredItem.totalProgramado} apresentações
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* GRÁFICO 2 — Abertura x Novas Entradas (Barras Empilhadas) */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                2. Abertura × Novas Entradas
              </h2>
              <p className="text-xs text-slate-500">
                Composição do total programado entre estoque inicial e produção do mês
              </p>
            </div>
            <div className="flex items-center gap-2.5 text-xs">
              <span className="flex items-center gap-1 text-[11px] text-blue-800 font-medium">
                <span className="h-3 w-3 rounded-xs bg-blue-600 inline-block" />
                <span>Abertura</span>
              </span>
              <span className="flex items-center gap-1 text-[11px] text-emerald-800 font-medium">
                <span className="h-3 w-3 rounded-xs bg-emerald-500 inline-block" />
                <span>Novas Entradas</span>
              </span>
            </div>
          </div>

          <div className="flex-1 flex flex-col justify-end pt-4">
            <div className="h-60 w-full flex items-end gap-1.5 sm:gap-2 pb-2 border-b border-slate-200 overflow-x-auto">
              {filteredFlow.map(item => {
                const totalHeightPct = Math.max((item.totalProgramado / maxProg) * 100, 6);
                const aberturaHeightPct = item.totalProgramado > 0
                  ? (item.abertura / item.totalProgramado) * 100
                  : 0;
                const entradasHeightPct = item.totalProgramado > 0
                  ? (item.entradas / item.totalProgramado) * 100
                  : 0;

                const isCurrent = item.isCurrentMonth;

                return (
                  <div
                    key={item.mesAno}
                    onMouseEnter={() => setHoveredItem(item)}
                    onMouseLeave={() => setHoveredItem(null)}
                    className="flex flex-col items-center flex-1 min-w-[28px] group relative h-full justify-end cursor-pointer"
                  >
                    {/* Tooltip Hover */}
                    <div className="absolute -top-14 z-20 hidden group-hover:flex flex-col items-center bg-slate-900 text-white text-[10px] rounded-md py-1 px-2 pointer-events-none shadow-md whitespace-nowrap">
                      <span className="font-bold">{item.label}</span>
                      <span>Abertura: {item.abertura}</span>
                      <span>Entradas: +{item.entradas}</span>
                      <span className="text-slate-300 font-semibold">Total: {item.totalProgramado}</span>
                    </div>

                    <div className="text-[10px] font-mono tabular-nums text-slate-700 font-bold mb-1">
                      {item.totalProgramado}
                    </div>

                    {/* Barra Empilhada */}
                    <div
                      style={{ height: `${totalHeightPct}%` }}
                      className={`w-full rounded-t-sm overflow-hidden flex flex-col justify-end transition-all ${
                        isCurrent ? 'ring-2 ring-blue-500 ring-offset-1' : ''
                      }`}
                    >
                      {/* Novas Entradas (topo) */}
                      <div
                        style={{ height: `${entradasHeightPct}%` }}
                        className="w-full bg-emerald-500 hover:bg-emerald-600 transition-colors"
                        title={`Novas Entradas: ${item.entradas}`}
                      />
                      {/* Abertura (base) */}
                      <div
                        style={{ height: `${aberturaHeightPct}%` }}
                        className="w-full bg-blue-600 hover:bg-blue-700 transition-colors"
                        title={`Abertura: ${item.abertura}`}
                      />
                    </div>

                    <div className={`mt-2 text-[9px] truncate w-full text-center ${
                      isCurrent ? 'font-bold text-blue-900' : 'text-slate-500 font-medium'
                    }`}>
                      {item.label.split('/')[0].slice(0, 3)}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between items-center pt-2 text-[10px] text-slate-400 font-medium">
              <span>Período Selecionado</span>
              <span>Cronológico</span>
            </div>
          </div>
        </div>

        {/* GRÁFICO 3 — Comportamento da Agenda Restante */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                3. Comportamento da Agenda Restante
              </h2>
              <p className="text-xs text-slate-500">
                Volume de apresentações pendentes (meses passados = 0; em andamento e futuros mantêm saldo)
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-600">
              <span className="h-3 w-3 rounded-xs bg-indigo-600 inline-block" />
              <span>Saldo Pendente</span>
            </div>
          </div>

          <div className="flex-1 flex flex-col justify-end pt-4">
            <div className="h-56 w-full flex items-end gap-1.5 sm:gap-2 pb-2 border-b border-slate-200 overflow-x-auto">
              {filteredFlow.map(item => {
                const heightPct = maxRestante > 0 ? Math.max((item.agendaRestante / maxRestante) * 100, item.agendaRestante > 0 ? 6 : 0) : 0;
                const isCurrent = item.isCurrentMonth;
                const isFuture = item.isFutureMonth;

                return (
                  <div
                    key={item.mesAno}
                    className="flex flex-col items-center flex-1 min-w-[28px] group relative h-full justify-end"
                  >
                    <div className="absolute -top-12 z-20 hidden group-hover:flex flex-col items-center bg-slate-900 text-white text-[10px] rounded-md py-1 px-2 pointer-events-none shadow-md whitespace-nowrap">
                      <span className="font-bold">{item.label}</span>
                      <span>Restante: {item.agendaRestante}</span>
                      <span>Status: {isCurrent ? 'Em andamento' : isFuture ? 'Futuro' : 'Concluído'}</span>
                    </div>

                    <div className="text-[10px] font-mono tabular-nums text-indigo-900 font-bold mb-1">
                      {item.agendaRestante > 0 ? item.agendaRestante : '-'}
                    </div>

                    <div
                      style={{ height: `${heightPct}%` }}
                      className={`w-full rounded-t-sm transition-all ${
                        isCurrent
                          ? 'bg-blue-600 ring-2 ring-blue-300'
                          : isFuture
                          ? 'bg-indigo-500 hover:bg-indigo-600'
                          : 'bg-slate-200'
                      }`}
                    />

                    <div className={`mt-2 text-[9px] truncate w-full text-center ${
                      isCurrent ? 'font-bold text-blue-900' : 'text-slate-500 font-medium'
                    }`}>
                      {item.label.split('/')[0].slice(0, 3)}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between items-center pt-2 text-[10px] text-slate-400 font-medium">
              <span>Nota: Meses concluídos encerram com saldo zero</span>
              <span>Futuros Ativos</span>
            </div>
          </div>
        </div>

        {/* GRÁFICO 4 — Participação das Novas Entradas (%) */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                4. Participação das Novas Entradas (%)
              </h2>
              <p className="text-xs text-slate-500">
                Percentual das novas entradas sobre o total programado mês a mês
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-600">
              <span className="h-3 w-3 rounded-xs bg-teal-500 inline-block" />
              <span>% Novas Entradas</span>
            </div>
          </div>

          <div className="flex-1 flex flex-col justify-end pt-4">
            <div className="h-56 w-full flex items-end gap-1.5 sm:gap-2 pb-2 border-b border-slate-200 overflow-x-auto">
              {filteredFlow.map(item => {
                const pct = item.totalProgramado > 0
                  ? Math.round(((item.entradas / item.totalProgramado) * 100) * 10) / 10
                  : 0;
                const heightPct = Math.min(Math.max(pct, 4), 100);
                const isCurrent = item.isCurrentMonth;

                return (
                  <div
                    key={item.mesAno}
                    className="flex flex-col items-center flex-1 min-w-[28px] group relative h-full justify-end"
                  >
                    <div className="absolute -top-12 z-20 hidden group-hover:flex flex-col items-center bg-slate-900 text-white text-[10px] rounded-md py-1 px-2 pointer-events-none shadow-md whitespace-nowrap">
                      <span className="font-bold">{item.label}</span>
                      <span>Participação: {pct.toFixed(1)}%</span>
                      <span>{item.entradas} de {item.totalProgramado}</span>
                    </div>

                    <div className="text-[10px] font-mono tabular-nums text-teal-800 font-bold mb-1">
                      {pct > 0 ? `${pct.toFixed(0)}%` : '-'}
                    </div>

                    <div
                      style={{ height: `${heightPct}%` }}
                      className={`w-full rounded-t-sm transition-all ${
                        isCurrent
                          ? 'bg-teal-600 ring-2 ring-teal-300'
                          : 'bg-teal-400 hover:bg-teal-500'
                      }`}
                    />

                    <div className={`mt-2 text-[9px] truncate w-full text-center ${
                      isCurrent ? 'font-bold text-teal-900' : 'text-slate-500 font-medium'
                    }`}>
                      {item.label.split('/')[0].slice(0, 3)}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between items-center pt-2 text-[10px] text-slate-400 font-medium">
              <span>0%</span>
              <span>100% Programado</span>
            </div>
          </div>
        </div>
      </div>

      {/* ÁREA 3 — ANÁLISE GERENCIAL EXECUTIVA */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="h-4 w-4 text-blue-700" />
          <h2 className="text-sm font-bold text-slate-900">
            Síntese e Análise Gerencial do Período
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 text-xs">
          {/* Mês de Pico Total */}
          <div className="rounded-lg border border-slate-100 bg-slate-50/70 p-3.5">
            <span className="text-slate-500 font-semibold block text-[11px] uppercase">
              Mês com Maior Total
            </span>
            <div className="mt-1.5 flex items-baseline gap-2">
              <span className="text-base font-extrabold text-blue-900 font-sans">
                {executiveAnalysis.mesPicoProgramado ? executiveAnalysis.mesPicoProgramado.label : 'Não disponível'}
              </span>
            </div>
            <div className="mt-1 font-mono text-slate-600 font-bold tabular-nums">
              {executiveAnalysis.mesPicoProgramado
                ? `${executiveAnalysis.mesPicoProgramado.totalProgramado} apresentações`
                : '-'}
            </div>
          </div>

          {/* Mês de Maior Movimentação de Entradas */}
          <div className="rounded-lg border border-slate-100 bg-slate-50/70 p-3.5">
            <span className="text-slate-500 font-semibold block text-[11px] uppercase">
              Maior Volume de Novas Entradas
            </span>
            <div className="mt-1.5 flex items-baseline gap-2">
              <span className="text-base font-extrabold text-emerald-900 font-sans">
                {executiveAnalysis.mesPicoEntradas ? executiveAnalysis.mesPicoEntradas.label : 'Não disponível'}
              </span>
            </div>
            <div className="mt-1 font-mono text-emerald-700 font-bold tabular-nums">
              {executiveAnalysis.mesPicoEntradas
                ? `+${executiveAnalysis.mesPicoEntradas.entradas} entradas no mês`
                : '-'}
            </div>
          </div>

          {/* Média Mensal entre Meses Concluídos */}
          <div className="rounded-lg border border-slate-100 bg-slate-50/70 p-3.5">
            <span className="text-slate-500 font-semibold block text-[11px] uppercase">
              Média (Meses Concluídos)
            </span>
            <div className="mt-1.5 flex items-baseline gap-2">
              <span className="text-base font-extrabold text-slate-900 font-mono tabular-nums">
                {executiveAnalysis.mediaConcluidos !== null
                  ? `${executiveAnalysis.mediaConcluidos.toFixed(1).replace('.', ',')}`
                  : 'Não disponível'}
              </span>
              <span className="text-slate-500 text-[11px]">apres. / mês</span>
            </div>
            <div className="mt-1 text-slate-500 text-[11px]">
              Apenas meses fechados no filtro
            </div>
          </div>

          {/* Variação Recente & Tendência */}
          <div className="rounded-lg border border-slate-100 bg-slate-50/70 p-3.5">
            <span className="text-slate-500 font-semibold block text-[11px] uppercase">
              Tendência & Variação MoM
            </span>
            <div className="mt-1.5 flex items-center gap-1.5">
              <span className="font-bold text-slate-900 text-sm">
                {executiveAnalysis.tendenciaGeral}
              </span>
            </div>
            <div className="mt-1 text-xs">
              {executiveAnalysis.variacaoUltimoMoM !== null ? (
                <span className={`font-semibold ${executiveAnalysis.variacaoUltimoMoM.val >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                  {executiveAnalysis.variacaoUltimoMoM.val >= 0 ? '+' : ''}
                  {executiveAnalysis.variacaoUltimoMoM.val.toFixed(1).replace('.', ',')}% vs mês anterior
                </span>
              ) : (
                <span className="text-slate-400">Sem histórico comparável</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ÁREA 4 — TABELA GERENCIAL DETALHADA COM PESQUISA, FILTROS, ORDENAÇÃO E PAGINAÇÃO */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-2xs overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 px-5 py-4 gap-3 bg-slate-50/50">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Tabela Gerencial de Acompanhamento Mensal Detalhado
            </h3>
            <p className="text-xs text-slate-500">
              Registros auditáveis com paginação, filtros dinâmicos e exportação CSV ({tableData.length} meses listados)
            </p>
          </div>

          {/* Controles da Tabela: Pesquisa e Ordenação */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative">
              <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={e => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Pesquisar mês..."
                className="pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-700 placeholder-slate-400 focus:border-blue-500 focus:outline-hidden w-40"
              />
            </div>

            <button
              type="button"
              onClick={() => setTableSortAsc(!tableSortAsc)}
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs"
            >
              {tableSortAsc ? 'Mês: Antigos Primeiro' : 'Mês: Recentes Primeiro'}
            </button>
          </div>
        </div>

        {/* Tabela Responsiva */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-100/90 text-slate-700 font-bold uppercase tracking-wider text-[11px]">
                <th className="px-5 py-3">Mês de Apresentação</th>
                <th className="px-5 py-3 text-right">Abertura</th>
                <th className="px-5 py-3 text-right">Novas Entradas</th>
                <th className="px-5 py-3 text-right">Total Programado</th>
                <th className="px-5 py-3 text-right">Agenda Restante</th>
                <th className="px-5 py-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-800 font-mono tabular-nums">
              {paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-slate-400 font-sans text-xs">
                    Nenhum registro encontrado para os critérios de busca selecionados.
                  </td>
                </tr>
              ) : (
                paginatedData.map(item => {
                  const isCurrent = item.isCurrentMonth;
                  return (
                    <tr
                      key={item.mesAno}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isCurrent ? 'bg-blue-50/60 font-semibold' : ''
                      }`}
                    >
                      <td className="px-5 py-3 font-sans font-medium text-slate-900 flex items-center gap-2">
                        <span>{item.label}</span>
                        {isCurrent && (
                          <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-bold text-blue-800 font-sans">
                            Mês Atual
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-right font-medium text-blue-700">
                        {item.abertura.toLocaleString('pt-BR')}
                      </td>
                      <td className="px-5 py-3 text-right font-medium text-emerald-700">
                        {item.entradas.toLocaleString('pt-BR')}
                      </td>
                      <td className="px-5 py-3 text-right font-extrabold text-slate-900 text-sm">
                        {item.totalProgramado.toLocaleString('pt-BR')}
                      </td>
                      <td className="px-5 py-3 text-right font-bold text-slate-800">
                        {item.agendaRestante.toLocaleString('pt-BR')}
                      </td>
                      <td className="px-5 py-3 text-center font-sans">
                        {isCurrent ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-[11px] font-bold text-blue-800">
                            Em andamento
                          </span>
                        ) : item.isPastMonth ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                            Concluído
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-0.5 text-[11px] font-semibold text-indigo-700">
                            Futuro
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Paginação */}
        <div className="flex items-center justify-between border-t border-slate-200 px-5 py-3 bg-slate-50/50 text-xs text-slate-600">
          <span>
            Mostrando {paginatedData.length} de {tableData.length} meses (Página {currentPage} de {totalPages})
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs flex items-center gap-1"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              <span>Anterior</span>
            </button>
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs flex items-center gap-1"
            >
              <span>Próxima</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
