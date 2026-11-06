import React, { useState, useMemo } from 'react';
import {
  ClipboardCheck,
  CalendarCheck,
  TrendingUp,
  TrendingDown,
  Calendar,
  Building,
  Users,
  UserCheck,
  Download,
  CalendarDays,
  BarChart3,
  Flame,
  Clock,
  Sparkles,
  Layers,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { BIDataset, RealizedReservationMonthlyItem } from '../../types/bi';

interface RealizedReservationsViewProps {
  dataset: BIDataset;
}

export const RealizedReservationsView: React.FC<RealizedReservationsViewProps> = ({ dataset }) => {
  const rel = dataset.realizedReservations;

  const [selectedDimension, setSelectedDimension] = useState<'hotel' | 'consultor' | 'sdr'>('consultor');
  const [tableSortOrder, setTableSortOrder] = useState<'desc' | 'asc'>('desc');
  const [hoveredMonth, setHoveredMonth] = useState<RealizedReservationMonthlyItem | null>(null);

  if (!rel) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-700">
        <ClipboardCheck className="mx-auto h-8 w-8 text-blue-600 mb-2 animate-pulse" />
        <h3 className="font-bold text-sm text-slate-900">Reservas Realizadas em Processamento</h3>
        <p className="text-xs text-slate-500 mt-1">
          Aguarde a apuração dos dados de confirmações da planilha.
        </p>
      </div>
    );
  }

  const { summary, monthlyFlow, dailyFlow, porConsultor, porSdr, porHotel } = rel;

  // Ordenação da Tabela Gerencial
  const sortedTableData = useMemo(() => {
    const list = [...monthlyFlow];
    if (tableSortOrder === 'desc') {
      return list.reverse();
    }
    return list;
  }, [monthlyFlow, tableSortOrder]);

  // Download da Tabela em CSV
  const handleExportCSV = () => {
    const headers = [
      'Mês / Ano',
      'Rótulo',
      'Reservas Realizadas',
      'Média Diária',
      'Mês Anterior',
      'Variação MoM (%)'
    ];

    const rows = sortedTableData.map(m => [
      m.mesAno,
      `"${m.label}"`,
      m.quantidade,
      m.mediaDiaria.toFixed(1).replace('.', ','),
      m.mesAnterior !== null ? m.mesAnterior : '-',
      m.variacaoPct !== null ? `${m.variacaoPct.toFixed(1).replace('.', ',')}%` : '-'
    ]);

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `LAGOA_BI_Reservas_Realizadas_${summary.mesReferencia}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Máximos para gráficos escalados
  const maxMonthlyCount = Math.max(...monthlyFlow.map(m => m.quantidade), 1);
  const maxDailyCount = Math.max(...dailyFlow.map(d => d.quantidade), 1);
  const maxDailyAcumulado = Math.max(...dailyFlow.map(d => d.acumulado), 1);

  return (
    <div className="space-y-6">
      {/* Top Banner Executivo */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 rounded-md bg-blue-700 px-2.5 py-1 text-[11px] font-bold text-white tracking-wide uppercase shadow-xs">
                <ClipboardCheck className="h-3.5 w-3.5" />
                Reservas Realizadas
              </span>
              <span className="text-slate-300 font-bold">·</span>
              <span className="text-xs font-semibold text-slate-500">
                Mês de Referência:
              </span>
              <span className="text-sm font-extrabold text-slate-900">
                {summary.mesReferenciaLabel}
              </span>
            </div>
            <p className="mt-1.5 text-xs text-slate-500 leading-relaxed max-w-3xl">
              Quantitativo de reservas confirmadas apurado exclusivamente por data de realização (Data da Confirmação). Apenas registros classificados como Reserva Normal.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 text-xs">
            <div className="rounded-lg bg-slate-50 px-3 py-2 border border-slate-200 text-slate-700 shadow-2xs">
              <span className="text-slate-500 block text-[10px] uppercase font-semibold">Exercício</span>
              <span className="font-bold text-slate-900 tabular-nums">
                {summary.totalAnualLabel}
              </span>
            </div>
            <div className="rounded-lg bg-blue-50 px-3 py-2 border border-blue-200 text-blue-950 shadow-2xs">
              <span className="text-blue-700 block text-[10px] uppercase font-bold">Total Anual</span>
              <span className="font-extrabold text-blue-900 text-sm font-mono tabular-nums">
                {summary.totalAnual.toLocaleString('pt-BR')} reservas
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Grid de 8 Cartões de Indicadores Executivos */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* 1. Total de reservas no mês */}
        <div className="rounded-xl border border-blue-300 bg-gradient-to-br from-blue-900 to-slate-900 text-white p-5 shadow-xs">
          <div className="flex items-center justify-between text-blue-200">
            <span className="text-xs font-semibold uppercase tracking-wider text-blue-100">
              Total no Mês
            </span>
            <div className="rounded-lg bg-white/10 p-2 text-white">
              <ClipboardCheck className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold tracking-tight text-white font-mono tabular-nums">
              {summary.totalMes.toLocaleString('pt-BR')}
            </span>
            <span className="text-xs text-blue-200 font-medium">reservas</span>
          </div>
          <div className="mt-2 text-xs text-blue-200/90 truncate">
            {summary.mesReferenciaLabel}
          </div>
        </div>

        {/* 2. Reservas hoje */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold text-slate-600">Realizadas Hoje</span>
            <div className="rounded-lg bg-amber-50 p-2 text-amber-600">
              <Flame className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold tracking-tight text-slate-900 font-mono tabular-nums">
              {summary.hoje.toLocaleString('pt-BR')}
            </span>
            <span className="text-xs text-slate-500">reservas</span>
          </div>
          <div className="mt-2 text-xs text-slate-500 truncate">
            Confirmadas na data de hoje
          </div>
        </div>

        {/* 3. Reservas na semana */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold text-slate-600">Na Semana Atual</span>
            <div className="rounded-lg bg-indigo-50 p-2 text-indigo-600">
              <Calendar className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold tracking-tight text-slate-900 font-mono tabular-nums">
              {summary.naSemana.toLocaleString('pt-BR')}
            </span>
            <span className="text-xs text-slate-500">reservas</span>
          </div>
          <div className="mt-2 text-xs text-slate-500 truncate">
            Segunda-feira até a data atual
          </div>
        </div>

        {/* 4. Média diária de reservas no mês */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold text-slate-600">Média Diária</span>
            <div className="rounded-lg bg-emerald-50 p-2 text-emerald-600">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold tracking-tight text-emerald-700 font-mono tabular-nums">
              {summary.mediaDiaria.toFixed(1).replace('.', ',')}
            </span>
            <span className="text-xs text-slate-500">reservas / dia</span>
          </div>
          <div className="mt-2 text-xs text-slate-500 truncate">
            Produção diária apurada no mês
          </div>
        </div>

        {/* 5. Quantidade de reservas no mês anterior */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold text-slate-600">Mês Anterior</span>
            <div className="rounded-lg bg-slate-100 p-2 text-slate-600">
              <CalendarDays className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold tracking-tight text-slate-900 font-mono tabular-nums">
              {summary.mesAnterior.toLocaleString('pt-BR')}
            </span>
            <span className="text-xs text-slate-500">reservas</span>
          </div>
          <div className="mt-2 text-xs text-slate-500 truncate">
            Produção total do mês fechado anterior
          </div>
        </div>

        {/* 6. Variação percentual em relação ao mês anterior (MoM) */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold text-slate-600">Variação MoM (%)</span>
            <div className={`rounded-lg p-2 ${summary.variacaoMoMPct >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
              {summary.variacaoMoMPct >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className={`text-2xl font-extrabold tracking-tight font-mono tabular-nums ${summary.variacaoMoMPct >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
              {summary.variacaoMoMPct >= 0 ? `+${summary.variacaoMoMPct.toFixed(1).replace('.', ',')}%` : `${summary.variacaoMoMPct.toFixed(1).replace('.', ',')}%`}
            </span>
          </div>
          <div className="mt-2 flex items-center gap-1 text-xs text-slate-500">
            {summary.variacaoMoMPct >= 0 ? (
              <span className="flex items-center font-semibold text-emerald-700">
                <ArrowUpRight className="h-3.5 w-3.5 mr-0.5" />
                Crescimento
              </span>
            ) : (
              <span className="flex items-center font-semibold text-rose-700">
                <ArrowDownRight className="h-3.5 w-3.5 mr-0.5" />
                Redução
              </span>
            )}
            <span className="text-slate-400">vs mês anterior</span>
          </div>
        </div>

        {/* 7. Acumulado mensal até a data atual */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold text-slate-600">Acumulado até Hoje</span>
            <div className="rounded-lg bg-blue-50 p-2 text-blue-600">
              <Layers className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold tracking-tight text-blue-900 font-mono tabular-nums">
              {summary.acumuladoMes.toLocaleString('pt-BR')}
            </span>
            <span className="text-xs text-slate-500">reservas</span>
          </div>
          <div className="mt-2 text-xs text-slate-500 truncate">
            No mês de referência até hoje
          </div>
        </div>

        {/* 8. Total anual de reservas realizadas */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold text-slate-600">Total Anual Realizado</span>
            <div className="rounded-lg bg-purple-50 p-2 text-purple-600">
              <Sparkles className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold tracking-tight text-purple-900 font-mono tabular-nums">
              {summary.totalAnual.toLocaleString('pt-BR')}
            </span>
            <span className="text-xs text-slate-500">reservas no ano</span>
          </div>
          <div className="mt-2 text-xs text-slate-500 truncate">
            Soma de todos os meses do exercício
          </div>
        </div>
      </div>

      {/* Seção 1 de Gráficos: 1. Evolução Diária & 2. Comparativo Mensal */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Gráfico 1: Evolução Diária */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                1. Evolução Diária no Mês
              </h2>
              <p className="text-xs text-slate-500">
                Quantidade de reservas confirmadas por dia ({summary.mesReferenciaLabel})
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-600">
              <span className="h-3 w-3 rounded-xs bg-blue-600 inline-block" />
              <span>Reservas / dia</span>
            </div>
          </div>

          {dailyFlow.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              Nenhuma reserva registrada no mês selecionado.
            </div>
          ) : (
            <div className="flex-1 flex flex-col justify-end pt-4">
              <div className="h-56 w-full flex items-end gap-1.5 sm:gap-2 pb-2 border-b border-slate-200 overflow-x-auto">
                {dailyFlow.map(d => {
                  const barHeightPct = Math.max((d.quantidade / maxDailyCount) * 100, 4);
                  const isWeekend = d.diaSemana === 'Sáb' || d.diaSemana === 'Dom';

                  return (
                    <div
                      key={d.dataIso}
                      className="flex flex-col items-center flex-1 min-w-[24px] group relative h-full justify-end"
                    >
                      {/* Tooltip Hover */}
                      <div className="absolute -top-12 z-20 hidden group-hover:flex flex-col items-center bg-slate-900 text-white text-[10px] rounded-md py-1 px-2 pointer-events-none shadow-md whitespace-nowrap">
                        <span className="font-bold">{d.dataStr} ({d.diaSemana})</span>
                        <span>{d.quantidade} reservas</span>
                      </div>

                      <div className="text-[10px] font-mono tabular-nums text-slate-600 mb-1 opacity-80 group-hover:opacity-100 group-hover:font-bold">
                        {d.quantidade > 0 ? d.quantidade : ''}
                      </div>

                      <div
                        style={{ height: `${barHeightPct}%` }}
                        className={`w-full rounded-t-sm transition-all duration-150 ${
                          isWeekend ? 'bg-indigo-400 group-hover:bg-indigo-600' : 'bg-blue-600 group-hover:bg-blue-700'
                        }`}
                      />

                      <div className="mt-2 text-[9px] text-slate-500 font-medium truncate w-full text-center">
                        {d.dataIso.split('-')[2]}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-between items-center pt-2 text-[10px] text-slate-400 font-medium">
                <span>Início do Mês</span>
                <span>Fim do Mês</span>
              </div>
            </div>
          )}
        </div>

        {/* Gráfico 2: Comparativo Mensal */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                2. Comparativo Mensal de Reservas
              </h2>
              <p className="text-xs text-slate-500">
                Histórico mês a mês com destaque para o mês ativo
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="inline-flex items-center gap-1 text-[11px] text-slate-600">
                <span className="h-3 w-3 rounded-xs bg-blue-600 inline-block" />
                <span>Histórico</span>
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] text-blue-900 font-semibold">
                <span className="h-3 w-3 rounded-xs bg-blue-900 inline-block ring-2 ring-blue-300" />
                <span>Mês Ativo</span>
              </span>
            </div>
          </div>

          <div className="flex-1 flex flex-col justify-end pt-4">
            <div className="h-56 w-full flex items-end gap-2 pb-2 border-b border-slate-200 overflow-x-auto">
              {monthlyFlow.map(m => {
                const heightPct = Math.max((m.quantidade / maxMonthlyCount) * 100, 6);
                const isSelected = m.mesAno === summary.mesReferencia;

                return (
                  <div
                    key={m.mesAno}
                    onMouseEnter={() => setHoveredMonth(m)}
                    onMouseLeave={() => setHoveredMonth(null)}
                    className="flex flex-col items-center flex-1 min-w-[36px] group relative h-full justify-end cursor-pointer"
                  >
                    {/* Tooltip */}
                    <div className="absolute -top-14 z-20 hidden group-hover:flex flex-col items-center bg-slate-900 text-white text-[10px] rounded-md py-1 px-2 pointer-events-none shadow-md whitespace-nowrap">
                      <span className="font-bold">{m.label}</span>
                      <span>{m.quantidade} reservas</span>
                      <span>Média: {m.mediaDiaria}/dia</span>
                    </div>

                    <div className={`text-[10px] font-mono tabular-nums mb-1 font-bold ${
                      isSelected ? 'text-blue-900' : 'text-slate-600'
                    }`}>
                      {m.quantidade}
                    </div>

                    <div
                      style={{ height: `${heightPct}%` }}
                      className={`w-full rounded-t-sm transition-all duration-200 ${
                        isSelected
                          ? 'bg-blue-900 ring-2 ring-blue-400 shadow-xs'
                          : 'bg-blue-600 hover:bg-blue-700'
                      }`}
                    />

                    <div className={`mt-2 text-[10px] truncate w-full text-center ${
                      isSelected ? 'font-bold text-blue-900' : 'text-slate-600 font-medium'
                    }`}>
                      {m.label.split('/')[0].slice(0, 3)}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between items-center pt-2 text-[10px] text-slate-400 font-medium">
              <span>Meses Anteriores</span>
              <span>Cronológico</span>
            </div>
          </div>
        </div>
      </div>

      {/* Seção 2 de Gráficos: 3. Acumulado Diário & Distribuição por Consultor / SDR / Hotel */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Gráfico 3: Acumulado Diário */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                3. Acumulado Diário no Mês
              </h2>
              <p className="text-xs text-slate-500">
                Curva de produção acumulada de reservas ao longo de {summary.mesReferenciaLabel}
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-600">
              <span className="h-3 w-3 rounded-xs bg-emerald-600 inline-block" />
              <span>Acumulado</span>
            </div>
          </div>

          {dailyFlow.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              Sem dados diários no mês selecionado.
            </div>
          ) : (
            <div className="flex-1 flex flex-col justify-end pt-4">
              <div className="h-56 w-full flex items-end gap-1.5 sm:gap-2 pb-2 border-b border-slate-200 overflow-x-auto">
                {dailyFlow.map(d => {
                  const heightPct = Math.max((d.acumulado / maxDailyAcumulado) * 100, 4);

                  return (
                    <div
                      key={d.dataIso}
                      className="flex flex-col items-center flex-1 min-w-[24px] group relative h-full justify-end"
                    >
                      <div className="absolute -top-12 z-20 hidden group-hover:flex flex-col items-center bg-slate-900 text-white text-[10px] rounded-md py-1 px-2 pointer-events-none shadow-md whitespace-nowrap">
                        <span className="font-bold">{d.dataStr}</span>
                        <span>Acumulado: {d.acumulado}</span>
                        <span>No dia: +{d.quantidade}</span>
                      </div>

                      <div className="text-[10px] font-mono tabular-nums text-emerald-800 mb-1 opacity-80 group-hover:opacity-100 group-hover:font-bold">
                        {d.acumulado}
                      </div>

                      <div
                        style={{ height: `${heightPct}%` }}
                        className="w-full rounded-t-sm bg-gradient-to-t from-emerald-600 to-teal-500 hover:from-emerald-700 hover:to-teal-600 transition-all duration-150"
                      />

                      <div className="mt-2 text-[9px] text-slate-500 font-medium truncate w-full text-center">
                        {d.dataIso.split('-')[2]}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-between items-center pt-2 text-[10px] text-slate-400 font-medium">
                <span>Dia 1</span>
                <span>Último Registro</span>
              </div>
            </div>
          )}
        </div>

        {/* Gráficos 4, 5 e 6: Distribuição por Consultor, SDR e Hotel com Seletor de Aba */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs flex flex-col">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Distribuição da Produção de Reservas
              </h2>
              <p className="text-xs text-slate-500">
                Concentração de vendas confirmadas por dimensão comercial
              </p>
            </div>

            {/* Abas Dimensões */}
            <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => setSelectedDimension('consultor')}
                className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
                  selectedDimension === 'consultor'
                    ? 'bg-white text-blue-900 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <UserCheck className="h-3.5 w-3.5" />
                <span>4. Consultor</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedDimension('sdr')}
                className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
                  selectedDimension === 'sdr'
                    ? 'bg-white text-blue-900 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Users className="h-3.5 w-3.5" />
                <span>5. SDR</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedDimension('hotel')}
                className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
                  selectedDimension === 'hotel'
                    ? 'bg-white text-blue-900 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Building className="h-3.5 w-3.5" />
                <span>6. Hotel</span>
              </button>
            </div>
          </div>

          {/* Lista de Ranking da Dimensão Selecionada */}
          <div className="flex-1 space-y-3 overflow-y-auto max-h-[320px] pr-1">
            {selectedDimension === 'consultor' &&
              porConsultor.map((c, idx) => (
                <div key={c.nome} className="rounded-lg border border-slate-100 p-2.5 hover:bg-slate-50/80 transition-colors">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-700">
                        {idx + 1}
                      </span>
                      <span className="font-semibold text-slate-800">{c.nome}</span>
                    </div>
                    <div className="flex items-center gap-2 font-mono tabular-nums">
                      <span className="font-bold text-slate-900">{c.quantidade} reservas</span>
                      <span className="text-slate-400 text-[11px]">({c.percentual.toFixed(1)}%)</span>
                    </div>
                  </div>
                  <div className="mt-2 h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                    <div
                      style={{ width: `${Math.min(c.percentual, 100)}%` }}
                      className="h-full rounded-full bg-blue-600"
                    />
                  </div>
                </div>
              ))}

            {selectedDimension === 'sdr' &&
              porSdr.map((s, idx) => (
                <div key={s.nome} className="rounded-lg border border-slate-100 p-2.5 hover:bg-slate-50/80 transition-colors">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-700">
                        {idx + 1}
                      </span>
                      <span className="font-semibold text-slate-800">{s.nome}</span>
                    </div>
                    <div className="flex items-center gap-2 font-mono tabular-nums">
                      <span className="font-bold text-slate-900">{s.quantidade} reservas</span>
                      <span className="text-slate-400 text-[11px]">({s.percentual.toFixed(1)}%)</span>
                    </div>
                  </div>
                  <div className="mt-2 h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                    <div
                      style={{ width: `${Math.min(s.percentual, 100)}%` }}
                      className="h-full rounded-full bg-indigo-600"
                    />
                  </div>
                </div>
              ))}

            {selectedDimension === 'hotel' &&
              porHotel.map((h, idx) => (
                <div key={h.nome} className="rounded-lg border border-slate-100 p-2.5 hover:bg-slate-50/80 transition-colors">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-700">
                        {idx + 1}
                      </span>
                      <span className="font-semibold text-slate-800">{h.nome}</span>
                    </div>
                    <div className="flex items-center gap-2 font-mono tabular-nums">
                      <span className="font-bold text-slate-900">{h.quantidade} reservas</span>
                      <span className="text-slate-400 text-[11px]">({h.percentual.toFixed(1)}%)</span>
                    </div>
                  </div>
                  <div className="mt-2 h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                    <div
                      style={{ width: `${Math.min(h.percentual, 100)}%` }}
                      className="h-full rounded-full bg-teal-600"
                    />
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* Tabela Gerencial Executiva com Ordenação e Download CSV */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              Tabela Gerencial de Reservas Realizadas
            </h2>
            <p className="text-xs text-slate-500">
              Demonstrativo quantitativo mês a mês com média diária e evolução MoM
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setTableSortOrder(prev => (prev === 'desc' ? 'asc' : 'desc'))}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs"
            >
              <BarChart3 className="h-3.5 w-3.5 text-slate-500" />
              <span>Ordem: {tableSortOrder === 'desc' ? 'Mais Recentes Primeiro' : 'Cronológica'}</span>
            </button>

            <button
              type="button"
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-700 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-800 shadow-2xs transition-colors"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Exportar CSV</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="border-b border-slate-200 bg-slate-50/75 text-[11px] font-bold text-slate-700 uppercase">
              <tr>
                <th className="py-3 px-4">Mês</th>
                <th className="py-3 px-4 text-right">Reservas Realizadas</th>
                <th className="py-3 px-4 text-right">Média Diária</th>
                <th className="py-3 px-4 text-right">Mês Anterior</th>
                <th className="py-3 px-4 text-right">Variação (%)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedTableData.map(m => {
                const isSelected = m.mesAno === summary.mesReferencia;
                return (
                  <tr
                    key={m.mesAno}
                    className={`hover:bg-slate-50/80 transition-colors ${
                      isSelected ? 'bg-blue-50/50 font-semibold' : ''
                    }`}
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className={`font-semibold ${isSelected ? 'text-blue-900 font-bold' : 'text-slate-900'}`}>
                          {m.label}
                        </span>
                        {isSelected && (
                          <span className="rounded-xs bg-blue-100 px-1.5 py-0.5 text-[9px] font-bold text-blue-800">
                            Selecionado
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums font-bold text-slate-900">
                      {m.quantidade.toLocaleString('pt-BR')}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-700">
                      {m.mediaDiaria.toFixed(1).replace('.', ',')} / dia
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-500">
                      {m.mesAnterior !== null ? m.mesAnterior.toLocaleString('pt-BR') : '-'}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums font-bold">
                      {m.variacaoPct === null ? (
                        <span className="text-slate-400">-</span>
                      ) : m.variacaoPct >= 0 ? (
                        <span className="text-emerald-700">+{m.variacaoPct.toFixed(1).replace('.', ',')}%</span>
                      ) : (
                        <span className="text-rose-700">{m.variacaoPct.toFixed(1).replace('.', ',')}%</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
