import React from 'react';
import {
  CalendarCheck2,
  CalendarClock,
  DoorOpen,
  UserPlus,
  ClockAlert,
  CalendarRange,
  BriefcaseBusiness,
  CalendarFold,
  TrendingUp,
  TrendingDown,
  Building,
  Info
} from 'lucide-react';
import { BIDataset } from '../../types/bi';

interface OverviewViewProps {
  dataset: BIDataset;
}

export const OverviewView: React.FC<OverviewViewProps> = ({ dataset }) => {
  const { executiveSummary, monthlyFlow, operationalAgenda } = dataset;

  // 6 meses mais recentes para gráfico rápido de evolução
  const recentFlow = monthlyFlow.slice(-8);
  const maxTotalProgramado = Math.max(...recentFlow.map(f => f.totalProgramado), 1);

  return (
    <div className="space-y-6">
      {/* Context Banner */}
      <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-blue-800 uppercase tracking-wider">
                Mês de Referência Analisado
              </span>
              <span className="text-slate-400 font-bold">·</span>
              <span className="text-sm font-extrabold text-blue-950">
                {executiveSummary.mesReferenciaLabel}
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-600">
              Controle quantitativo de casais programados para apresentações comerciais no Grupo Lagoa Quente. Regra estrita: apenas <strong className="text-slate-900 font-semibold">RESERVA NORMAL</strong> contabilizada.
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0 text-xs">
            <div className="rounded-lg bg-white px-3 py-2 border border-blue-200 text-slate-700 shadow-2xs">
              <span className="text-slate-500 block text-[10px] uppercase font-semibold">Corte Atual</span>
              <span className="font-bold text-slate-900 tabular-nums">
                {executiveSummary.dataConsulta}
              </span>
            </div>
            <div className="rounded-lg bg-white px-3 py-2 border border-blue-200 text-slate-700 shadow-2xs">
              <span className="text-slate-500 block text-[10px] uppercase font-semibold">Conformidade Base</span>
              <span className="font-bold text-emerald-700 tabular-nums">
                {executiveSummary.taxaConformidade}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Grid de 8 Indicadores Principais com MoM */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* 1. Confirmações no Mês */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold text-slate-600">Confirmações no Mês</span>
            <div className="rounded-lg bg-blue-50 p-2 text-blue-600">
              <CalendarCheck2 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold tracking-tight text-slate-900 font-mono tabular-nums">
              {executiveSummary.confirmacoesMes.toLocaleString('pt-BR')}
            </span>
            <span className="text-xs text-slate-500">casais</span>
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-xs">
            {executiveSummary.confirmacoesDiff >= 0 ? (
              <span className="flex items-center font-semibold text-emerald-600">
                <TrendingUp className="mr-0.5 h-3.5 w-3.5" />
                +{executiveSummary.confirmacoesDiff} ({executiveSummary.confirmacoesDiffPct}%)
              </span>
            ) : (
              <span className="flex items-center font-semibold text-rose-600">
                <TrendingDown className="mr-0.5 h-3.5 w-3.5" />
                {executiveSummary.confirmacoesDiff} ({executiveSummary.confirmacoesDiffPct}%)
              </span>
            )}
            <span className="text-slate-400">vs mês anterior</span>
          </div>
        </div>

        {/* 2. Agenda de Apresentações do Mês */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold text-slate-600">Agenda do Mês</span>
            <div className="rounded-lg bg-indigo-50 p-2 text-indigo-600">
              <CalendarClock className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold tracking-tight text-slate-900 font-mono tabular-nums">
              {executiveSummary.agendaMes.toLocaleString('pt-BR')}
            </span>
            <span className="text-xs text-slate-500">apresentações</span>
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-xs">
            {executiveSummary.agendaDiff >= 0 ? (
              <span className="flex items-center font-semibold text-emerald-600">
                <TrendingUp className="mr-0.5 h-3.5 w-3.5" />
                +{executiveSummary.agendaDiff} ({executiveSummary.agendaDiffPct}%)
              </span>
            ) : (
              <span className="flex items-center font-semibold text-rose-600">
                <TrendingDown className="mr-0.5 h-3.5 w-3.5" />
                {executiveSummary.agendaDiff} ({executiveSummary.agendaDiffPct}%)
              </span>
            )}
            <span className="text-slate-400">vs mês anterior</span>
          </div>
        </div>

        {/* 3. Abertura da Agenda */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold text-slate-600">Abertura da Agenda</span>
            <div className="rounded-lg bg-sky-50 p-2 text-sky-600">
              <DoorOpen className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold tracking-tight text-slate-900 font-mono tabular-nums">
              {executiveSummary.aberturaMes.toLocaleString('pt-BR')}
            </span>
            <span className="text-xs text-slate-500">casais</span>
          </div>
          <div className="mt-2 text-xs text-slate-500 truncate">
            Confirmados antes do 1º dia do mês
          </div>
        </div>

        {/* 4. Novas Entradas no Mês */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold text-slate-600">Novas Entradas</span>
            <div className="rounded-lg bg-emerald-50 p-2 text-emerald-600">
              <UserPlus className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold tracking-tight text-slate-900 font-mono tabular-nums">
              {executiveSummary.entradasMes.toLocaleString('pt-BR')}
            </span>
            <span className="text-xs text-slate-500">casais</span>
          </div>
          <div className="mt-2 text-xs text-slate-500 truncate">
            Confirmados e agendados no próprio mês
          </div>
        </div>

        {/* 5. Apresentações Já Vencidas */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold text-slate-600">Datas Já Vencidas</span>
            <div className="rounded-lg bg-amber-50 p-2 text-amber-600">
              <ClockAlert className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold tracking-tight text-slate-900 font-mono tabular-nums">
              {executiveSummary.apresentacoesVencidasMes.toLocaleString('pt-BR')}
            </span>
            <span className="text-xs text-slate-500">passadas</span>
          </div>
          <div className="mt-2 text-xs text-slate-500 truncate">
            Datas anteriores ao dia de corte
          </div>
        </div>

        {/* 6. Agenda Restante do Mês */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold text-slate-600">Agenda Restante</span>
            <div className="rounded-lg bg-teal-50 p-2 text-teal-600">
              <CalendarRange className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold tracking-tight text-blue-700 font-mono tabular-nums">
              {executiveSummary.agendaRestanteMes.toLocaleString('pt-BR')}
            </span>
            <span className="text-xs text-slate-500">a realizar</span>
          </div>
          <div className="mt-2 text-xs text-slate-500 truncate">
            Apresentações programadas restantes
          </div>
        </div>

        {/* 7. Carteira Geral Futura */}
        <div className="rounded-xl border border-blue-200 bg-gradient-to-br from-blue-900 to-slate-900 text-white p-4 shadow-xs">
          <div className="flex items-center justify-between text-blue-200">
            <span className="text-xs font-semibold text-blue-100">Carteira Geral Futura</span>
            <div className="rounded-lg bg-white/10 p-2 text-white">
              <BriefcaseBusiness className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold tracking-tight text-white font-mono tabular-nums">
              {executiveSummary.carteiraGeralFutura.toLocaleString('pt-BR')}
            </span>
            <span className="text-xs text-blue-200">casais ativos</span>
          </div>
          <div className="mt-2 text-xs text-blue-200/80 truncate">
            Apresentações futuras a partir de hoje
          </div>
        </div>

        {/* 8. Programado Próximo Mês */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold text-slate-600">Próximo Mês (M+1)</span>
            <div className="rounded-lg bg-slate-100 p-2 text-slate-600">
              <CalendarFold className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold tracking-tight text-slate-900 font-mono tabular-nums">
              {executiveSummary.programadoProximoMes.toLocaleString('pt-BR')}
            </span>
            <span className="text-xs text-slate-500">casais</span>
          </div>
          <div className="mt-2 text-xs text-slate-500 truncate">
            Previstos para {executiveSummary.programadoProximoMesLabel}
          </div>
        </div>
      </div>

      {/* Grid de 2 Colunas: Evolução Recente + Distribuição por Hotel */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Gráfico de Evolução Recente */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Evolução Mensal de Apresentações Programadas
              </h2>
              <p className="text-xs text-slate-500">
                Distribuição entre Abertura da Agenda e Novas Entradas
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-xs bg-blue-600 inline-block" />
                <span className="text-slate-600">Abertura</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-xs bg-emerald-500 inline-block" />
                <span className="text-slate-600">Novas Entradas</span>
              </div>
            </div>
          </div>

          {/* Gráfico de Barras SVG Customizado */}
          <div className="mt-6 space-y-4">
            {recentFlow.map((item) => {
              const aberturaWidth = (item.abertura / maxTotalProgramado) * 100;
              const entradasWidth = (item.entradas / maxTotalProgramado) * 100;
              const isSelected = item.mesAno === executiveSummary.mesReferencia;

              return (
                <div key={item.mesAno} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className={`font-semibold ${isSelected ? 'text-blue-700 font-bold' : 'text-slate-700'}`}>
                      {item.label}
                      {isSelected && <span className="ml-1 text-[10px] text-blue-600 font-normal">(Selecionado)</span>}
                    </span>
                    <div className="flex items-center gap-3 font-mono tabular-nums text-slate-600 text-xs">
                      <span className="text-blue-700 font-medium">Ab: {item.abertura}</span>
                      <span className="text-emerald-700 font-medium">Ent: {item.entradas}</span>
                      <span className="font-bold text-slate-900">Total: {item.totalProgramado}</span>
                    </div>
                  </div>
                  {/* Barra empilhada */}
                  <div className="h-5 w-full rounded-md bg-slate-100 overflow-hidden flex">
                    <div
                      style={{ width: `${aberturaWidth}%` }}
                      className="bg-blue-600 hover:bg-blue-700 transition-all flex items-center justify-center text-[10px] font-semibold text-white truncate"
                      title={`Abertura: ${item.abertura}`}
                    >
                      {item.abertura > 10 ? item.abertura : ''}
                    </div>
                    <div
                      style={{ width: `${entradasWidth}%` }}
                      className="bg-emerald-500 hover:bg-emerald-600 transition-all flex items-center justify-center text-[10px] font-semibold text-white truncate"
                      title={`Novas Entradas: ${item.entradas}`}
                    >
                      {item.entradas > 5 ? item.entradas : ''}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Distribuição por Hotel */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Distribuição por Hotel
              </h2>
              <p className="text-xs text-slate-500">
                Casais programados por empreendimento
              </p>
            </div>
            <Building className="h-4 w-4 text-slate-400" />
          </div>

          <div className="mt-4 space-y-4">
            {operationalAgenda.hotelDistribution.map((h) => (
              <div key={h.label} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-800">{h.label}</span>
                  <div className="flex items-center gap-2 font-mono tabular-nums">
                    <span className="font-bold text-slate-900">{h.quantidade.toLocaleString('pt-BR')}</span>
                    <span className="text-slate-400">({h.percentual}%)</span>
                  </div>
                </div>
                <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                  <div
                    style={{ width: `${h.percentual}%` }}
                    className="h-full rounded-full bg-blue-600"
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Destaque Técnico */}
          <div className="mt-6 rounded-lg bg-slate-50 p-3.5 border border-slate-200 text-xs text-slate-600">
            <div className="flex items-start gap-2">
              <Info className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-slate-900 block mb-0.5">Auditoria Rigorosa</span>
                Lançamentos com tipo <code className="text-blue-700 bg-blue-50 px-1 rounded">ADICIONAL</code> foram 100% expurgados de todos os totais. Cada reserva duplicada com mesma apresentação conta como exatamente 1 casal.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
