import React, { useState, useMemo } from 'react';
import {
  CircleDollarSign,
  TrendingUp,
  TrendingDown,
  Calendar,
  Layers,
  Building,
  Users,
  UserCheck,
  ShieldAlert,
  Download,
  Info,
  CalendarDays,
  Sparkles,
  BarChart3,
  Percent
} from 'lucide-react';
import { BIDataset, FinancialMonthlyItem } from '../../types/bi';

interface FinancialViewProps {
  dataset: BIDataset;
}

export const FinancialView: React.FC<FinancialViewProps> = ({ dataset }) => {
  const fin = dataset.financialData;

  const [selectedDimension, setSelectedDimension] = useState<'hotel' | 'consultor' | 'sdr'>('hotel');
  const [tableSortOrder, setTableSortOrder] = useState<'desc' | 'asc'>('desc');
  const [hoveredMonth, setHoveredMonth] = useState<FinancialMonthlyItem | null>(null);

  const formatBRL = (val: number): string => {
    return (val || 0).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  const formatBRLCompact = (val: number): string => {
    if (val >= 1_000_000) return `R$ ${(val / 1_000_000).toFixed(2).replace('.', ',')}M`;
    if (val >= 1_000) return `R$ ${(val / 1_000).toFixed(1).replace('.', ',')}k`;
    return formatBRL(val);
  };

  if (!fin) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-center text-amber-900">
        <ShieldAlert className="mx-auto h-8 w-8 text-amber-600 mb-2" />
        <h3 className="font-bold text-sm">Dados Financeiros em Processamento</h3>
        <p className="text-xs text-amber-700 mt-1">
          Aguarde a conclusão da sincronização dos valores da planilha.
        </p>
      </div>
    );
  }

  const { summary, monthlyFlow, dailyFlow, porHotel, porConsultor, porSdr, auditFinanceiro } = fin;

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
      'Valor Reserva Normal (R$)',
      'Valor Adicional (R$)',
      'Valor Total (R$)',
      'Participação Adicionais (%)',
      'Variação Mensal MoM (%)'
    ];

    const rows = sortedTableData.map(m => [
      m.mesAno,
      `"${m.label}"`,
      m.valorNormal.toFixed(2).replace('.', ','),
      m.valorAdicional.toFixed(2).replace('.', ','),
      m.valorTotal.toFixed(2).replace('.', ','),
      `${m.percentualAdicional.toFixed(1).replace('.', ',')}%`,
      m.variacaoMensalPct !== null ? `${m.variacaoMensalPct.toFixed(1).replace('.', ',')}%` : '-'
    ]);

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `LAGOA_BI_Vendas_Valores_${summary.mesReferencia}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Máximo para o gráfico de barras empilhadas
  const maxMonthlyTotal = Math.max(...monthlyFlow.map(m => m.valorTotal), 1);

  // Máximo para gráfico diário
  const maxDailyTotal = Math.max(...dailyFlow.map(d => d.valorTotal), 1);

  return (
    <div className="space-y-6">
      {/* Top Banner Executivo */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-2.5 py-1 text-[11px] font-bold text-white tracking-wide uppercase shadow-xs">
                <CircleDollarSign className="h-3.5 w-3.5" />
                Vendas em Valores (R$)
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
              Faturamento consolidado das reservas confirmadas e complementos adicionais registrados no período.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 text-xs">
            <div className="rounded-lg bg-slate-50 px-3 py-2 border border-slate-200 text-slate-700 shadow-2xs">
              <span className="text-slate-500 block text-[10px] uppercase font-semibold">Exercício</span>
              <span className="font-bold text-slate-900 tabular-nums">
                {summary.acumuladoAnoLabel}
              </span>
            </div>
            <div className="rounded-lg bg-emerald-50 px-3 py-2 border border-emerald-200 text-emerald-950 shadow-2xs">
              <span className="text-emerald-700 block text-[10px] uppercase font-semibold">Total Acumulado</span>
              <span className="font-bold text-emerald-800 tabular-nums font-mono">
                {formatBRLCompact(summary.acumuladoAno)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Grid de 5 Cards KPIs Principais */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {/* 1. Faturamento Total do Mês */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs relative overflow-hidden">
          <div className="absolute top-0 right-0 left-0 h-1 bg-blue-600" />
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold text-slate-600">Total do Mês (R$)</span>
            <div className="rounded-lg bg-blue-50 p-2 text-blue-600">
              <CircleDollarSign className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900 font-mono tabular-nums">
              {formatBRL(summary.valorTotalMes)}
            </div>
            <div className="mt-2 flex items-center gap-1.5 text-xs">
              {summary.variacaoMesAnteriorPct >= 0 ? (
                <div className="flex items-center gap-0.5 text-emerald-700 font-bold tabular-nums">
                  <TrendingUp className="h-3.5 w-3.5" />
                  <span>+{summary.variacaoMesAnteriorPct.toFixed(1)}%</span>
                </div>
              ) : (
                <div className="flex items-center gap-0.5 text-rose-700 font-bold tabular-nums">
                  <TrendingDown className="h-3.5 w-3.5" />
                  <span>{summary.variacaoMesAnteriorPct.toFixed(1)}%</span>
                </div>
              )}
              <span className="text-slate-500">vs mês anterior</span>
            </div>
          </div>
        </div>

        {/* 2. Reserva Normal (R$) */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs relative overflow-hidden">
          <div className="absolute top-0 right-0 left-0 h-1 bg-indigo-600" />
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold text-slate-600">Reserva Normal (R$)</span>
            <div className="rounded-lg bg-indigo-50 p-2 text-indigo-600">
              <Building className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl sm:text-2xl font-extrabold tracking-tight text-indigo-950 font-mono tabular-nums">
              {formatBRL(summary.valorNormalMes)}
            </div>
            <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
              <span className="font-semibold text-slate-700">
                {summary.valorTotalMes > 0 
                  ? `${((summary.valorNormalMes / summary.valorTotalMes) * 100).toFixed(1)}%` 
                  : '0%'}
              </span>
              <span>do total mensal</span>
            </div>
          </div>
        </div>

        {/* 3. Adicional (R$) */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs relative overflow-hidden">
          <div className="absolute top-0 right-0 left-0 h-1 bg-amber-500" />
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold text-slate-600">Adicional (R$)</span>
            <div className="rounded-lg bg-amber-50 p-2 text-amber-600">
              <Sparkles className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl sm:text-2xl font-extrabold tracking-tight text-amber-900 font-mono tabular-nums">
              {formatBRL(summary.valorAdicionalMes)}
            </div>
            <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
              <span className="font-semibold text-amber-700">Complementos</span>
              <span>sem novos casais</span>
            </div>
          </div>
        </div>

        {/* 4. Participação de Adicionais (%) */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs relative overflow-hidden">
          <div className="absolute top-0 right-0 left-0 h-1 bg-violet-600" />
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold text-slate-600">Part. Adicionais (%)</span>
            <div className="rounded-lg bg-violet-50 p-2 text-violet-600">
              <Percent className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl sm:text-2xl font-extrabold tracking-tight text-violet-950 font-mono tabular-nums">
              {summary.participacaoAdicionalMes.toFixed(1)}%
            </div>
            <div className="mt-2 text-xs text-slate-500">
              Impacto sobre o faturamento
            </div>
          </div>
        </div>

        {/* 5. Acumulado do Ano (R$) */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs relative overflow-hidden">
          <div className="absolute top-0 right-0 left-0 h-1 bg-emerald-600" />
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold text-slate-600">Acumulado do Ano</span>
            <div className="rounded-lg bg-emerald-50 p-2 text-emerald-600">
              <Layers className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl sm:text-2xl font-extrabold tracking-tight text-emerald-950 font-mono tabular-nums">
              {formatBRL(summary.acumuladoAno)}
            </div>
            <div className="mt-2 text-xs text-slate-500">
              {summary.acumuladoAnoLabel}
            </div>
          </div>
        </div>
      </div>

      {/* Gráfico 1: Evolução Mensal Empilhada (Normal vs Adicional) */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-blue-600" />
              <h3 className="text-sm font-bold text-slate-900">
                Evolução Mensal do Faturamento Registrado (Reserva Normal vs Adicional)
              </h3>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Composição empilhada por data de confirmação (Coluna A). Passe o mouse nas barras para detalhamento.
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs font-medium">
            <div className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-xs bg-indigo-600" />
              <span className="text-slate-700">Reserva Normal</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-xs bg-amber-400" />
              <span className="text-slate-700">Adicional</span>
            </div>
          </div>
        </div>

        {/* Visual Stacked Bar Chart */}
        <div className="mt-6">
          <div className="flex items-end gap-2 overflow-x-auto pb-4 pt-6 min-h-[220px]">
            {monthlyFlow.map((m) => {
              const heightPct = Math.max((m.valorTotal / maxMonthlyTotal) * 100, 2);
              const normalShare = m.valorTotal > 0 ? (m.valorNormal / m.valorTotal) * 100 : 100;
              const adicionalShare = m.valorTotal > 0 ? (m.valorAdicional / m.valorTotal) * 100 : 0;
              const isSelected = m.mesAno === summary.mesReferencia;

              return (
                <div
                  key={m.mesAno}
                  className="group relative flex flex-col items-center flex-1 min-w-[54px] max-w-[80px]"
                  onMouseEnter={() => setHoveredMonth(m)}
                  onMouseLeave={() => setHoveredMonth(null)}
                >
                  {/* Tooltip Hover */}
                  <div className="absolute -top-16 z-20 hidden group-hover:flex flex-col items-center pointer-events-none whitespace-nowrap rounded-md bg-slate-900 px-2.5 py-1.5 text-[11px] text-white shadow-lg">
                    <span className="font-bold text-slate-200">{m.label}</span>
                    <span className="font-mono text-emerald-300 font-extrabold">{formatBRL(m.valorTotal)}</span>
                    <span className="text-[10px] text-slate-300">
                      Normal: {formatBRL(m.valorNormal)} | Adic: {formatBRL(m.valorAdicional)} ({m.percentualAdicional.toFixed(1)}%)
                    </span>
                  </div>

                  {/* Stacked Bar */}
                  <div
                    className={`w-full flex flex-col justify-end rounded-t-sm overflow-hidden transition-all duration-200 ${
                      isSelected ? 'ring-2 ring-blue-500 ring-offset-2' : 'hover:opacity-90'
                    }`}
                    style={{ height: `${heightPct}%`, minHeight: '8px' }}
                  >
                    {/* Top: Adicional */}
                    {adicionalShare > 0 && (
                      <div
                        className="bg-amber-400 w-full transition-all"
                        style={{ height: `${adicionalShare}%` }}
                        title={`Adicional: ${formatBRL(m.valorAdicional)}`}
                      />
                    )}
                    {/* Bottom: Reserva Normal */}
                    <div
                      className="bg-indigo-600 w-full transition-all"
                      style={{ height: `${normalShare}%` }}
                      title={`Normal: ${formatBRL(m.valorNormal)}`}
                    />
                  </div>

                  {/* Label Mês */}
                  <div className="mt-2 text-center">
                    <span
                      className={`block text-[10px] font-semibold tabular-nums leading-none ${
                        isSelected ? 'text-blue-700 font-extrabold' : 'text-slate-600'
                      }`}
                    >
                      {m.label.split('/')[0].slice(0, 3)}
                    </span>
                    <span className="block text-[9px] text-slate-400 leading-tight">
                      /{m.mesAno.split('-')[0].slice(2)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected / Hovered Month Info Card */}
        {hoveredMonth && (
          <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900">{hoveredMonth.label}:</span>
              <span className="font-extrabold font-mono text-slate-900">{formatBRL(hoveredMonth.valorTotal)}</span>
            </div>
            <div className="flex items-center gap-4 text-slate-600">
              <span>
                Normal: <strong className="font-mono text-indigo-700">{formatBRL(hoveredMonth.valorNormal)}</strong>
              </span>
              <span>
                Adicional: <strong className="font-mono text-amber-700">{formatBRL(hoveredMonth.valorAdicional)}</strong> ({hoveredMonth.percentualAdicional.toFixed(1)}%)
              </span>
              {hoveredMonth.variacaoMensalPct !== null && (
                <span>
                  MoM:{' '}
                  <strong className={hoveredMonth.variacaoMensalPct >= 0 ? 'text-emerald-700' : 'text-rose-700'}>
                    {hoveredMonth.variacaoMensalPct >= 0 ? '+' : ''}{hoveredMonth.variacaoMensalPct.toFixed(1)}%
                  </strong>
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Gráfico 2: Evolução Diária no Mês Selecionado */}
      {dailyFlow.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <CalendarDays className="h-5 w-5 text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  Evolução Diária de Confirmações em {summary.mesReferenciaLabel}
                </h3>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                Faturamento registrado dia a dia com identificação do dia da semana.
              </p>
            </div>
            <div className="text-xs font-semibold text-slate-700">
              Total Dias com Confirmação: <span className="font-mono text-indigo-700 font-bold">{dailyFlow.length}</span>
            </div>
          </div>

          <div className="mt-6 flex items-end gap-1.5 overflow-x-auto pb-4 pt-6 min-h-[160px]">
            {dailyFlow.map((d) => {
              const heightPct = Math.max((d.valorTotal / maxDailyTotal) * 100, 4);
              const dayNum = d.dataIso.split('-')[2];

              return (
                <div
                  key={d.dataIso}
                  className="group relative flex flex-col items-center flex-1 min-w-[28px] max-w-[42px]"
                >
                  {/* Tooltip */}
                  <div className="absolute -top-14 z-20 hidden group-hover:flex flex-col items-center pointer-events-none whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-[10px] text-white shadow-lg">
                    <span className="font-bold text-slate-200">{d.dataStr} ({d.diaSemana})</span>
                    <span className="font-mono text-emerald-300 font-bold">{formatBRL(d.valorTotal)}</span>
                    <span className="text-[9px] text-slate-300">
                      Normal: {formatBRL(d.valorNormal)} | Adic: {formatBRL(d.valorAdicional)}
                    </span>
                  </div>

                  <div
                    className="w-full rounded-t-xs bg-indigo-500 group-hover:bg-indigo-600 transition-all cursor-pointer"
                    style={{ height: `${heightPct}%`, minHeight: '6px' }}
                  />

                  <div className="mt-2 text-center">
                    <span className="block text-[10px] font-semibold text-slate-700 tabular-nums">
                      {dayNum}
                    </span>
                    <span className="block text-[8px] text-slate-400 font-medium">
                      {d.diaSemana}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Seção 3: Detalhamento por Dimensão (Hotel, Consultor, SDR) */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Detalhamento de Faturamento por Dimensão
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              Contribuição de cada Hotel, Consultor e SDR no faturamento acumulado.
            </p>
          </div>

          {/* Dimension Selector Tabs */}
          <div className="flex items-center rounded-lg bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => setSelectedDimension('hotel')}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
                selectedDimension === 'hotel'
                  ? 'bg-white text-blue-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <Building className="h-3.5 w-3.5" />
                <span>Por Hotel</span>
              </div>
            </button>
            <button
              type="button"
              onClick={() => setSelectedDimension('consultor')}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
                selectedDimension === 'consultor'
                  ? 'bg-white text-blue-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5" />
                <span>Por Consultor</span>
              </div>
            </button>
            <button
              type="button"
              onClick={() => setSelectedDimension('sdr')}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
                selectedDimension === 'sdr'
                  ? 'bg-white text-blue-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <UserCheck className="h-3.5 w-3.5" />
                <span>Por SDR</span>
              </div>
            </button>
          </div>
        </div>

        {/* Dimension Table */}
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/60 text-slate-600 font-semibold">
                <th className="py-2.5 px-3">Nome / Identificação</th>
                <th className="py-2.5 px-3 text-right">Reserva Normal (R$)</th>
                <th className="py-2.5 px-3 text-right">Adicional (R$)</th>
                <th className="py-2.5 px-3 text-right">Total Faturamento (R$)</th>
                <th className="py-2.5 px-3 text-right">Part. (%)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(selectedDimension === 'hotel' ? porHotel : selectedDimension === 'consultor' ? porConsultor : porSdr).map((item) => (
                <tr key={item.nome} className="hover:bg-slate-50 transition-colors">
                  <td className="py-2.5 px-3 font-medium text-slate-900">
                    {item.nome}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-indigo-700 font-semibold tabular-nums">
                    {formatBRL(item.valorNormal)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-amber-700 font-semibold tabular-nums">
                    {formatBRL(item.valorAdicional)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-slate-950 font-bold tabular-nums">
                    {formatBRL(item.valorTotal)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-semibold text-slate-700 tabular-nums">
                    {item.percentual.toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Seção 4: Tabela Gerencial Financeira com Exportação CSV */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Tabela Gerencial Financeira — Histórico Mensal
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              Auditoria consolidada: Reserva Normal + Adicional = Total do Mês.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setTableSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
            >
              Ordem: {tableSortOrder === 'desc' ? 'Mais Recente Primeiro' : 'Cronológica'}
            </button>
            <button
              type="button"
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors shadow-2xs"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Exportar CSV</span>
            </button>
          </div>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-600 font-semibold">
                <th className="py-2.5 px-3">Mês / Ano</th>
                <th className="py-2.5 px-3 text-right">Valor Reserva Normal</th>
                <th className="py-2.5 px-3 text-right">Valor Adicional</th>
                <th className="py-2.5 px-3 text-right">Valor Total (R$)</th>
                <th className="py-2.5 px-3 text-right">Part. Adicionais</th>
                <th className="py-2.5 px-3 text-right">Variação Mensal (%)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedTableData.map((m) => {
                const isCurrent = m.mesAno === summary.mesReferencia;
                return (
                  <tr
                    key={m.mesAno}
                    className={`hover:bg-slate-50 transition-colors ${
                      isCurrent ? 'bg-blue-50/60 font-semibold' : ''
                    }`}
                  >
                    <td className="py-2.5 px-3 font-medium text-slate-900">
                      <div className="flex items-center gap-2">
                        <span>{m.label}</span>
                        {isCurrent && (
                          <span className="rounded bg-blue-600 px-1.5 py-0.5 text-[9px] font-bold text-white uppercase tracking-wider">
                            Ativo
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-indigo-700 tabular-nums">
                      {formatBRL(m.valorNormal)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-amber-700 tabular-nums">
                      {formatBRL(m.valorAdicional)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-950 font-bold tabular-nums">
                      {formatBRL(m.valorTotal)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-700 tabular-nums">
                      {m.percentualAdicional.toFixed(1)}%
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums">
                      {m.variacaoMensalPct !== null ? (
                        <span
                          className={`font-semibold ${
                            m.variacaoMensalPct >= 0 ? 'text-emerald-700' : 'text-rose-700'
                          }`}
                        >
                          {m.variacaoMensalPct >= 0 ? '+' : ''}{m.variacaoMensalPct.toFixed(1)}%
                        </span>
                      ) : (
                        <span className="text-slate-400">-</span>
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
