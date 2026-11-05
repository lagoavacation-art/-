import React from 'react';
import { Briefcase, AlertTriangle, HelpCircle, Layers, Calendar } from 'lucide-react';
import { BIDataset } from '../../types/bi';

interface FuturePortfolioViewProps {
  dataset: BIDataset;
}

export const FuturePortfolioView: React.FC<FuturePortfolioViewProps> = ({ dataset }) => {
  const { futurePortfolio, currentDate } = dataset;
  const { history, futureDistribution, totalCarteiraFuturaAtual, saldoAtualReferencia } = futurePortfolio;

  // Encontra o mês atual no histórico
  const currentMonthHistory = history.find(h => h.isCurrentMonth);
  const maxFutureQty = Math.max(...futureDistribution.map(d => d.quantidade), 1);

  return (
    <div className="space-y-6">
      {/* Alerta Metodológico Crucial */}
      <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4 text-xs text-amber-900">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold block text-sm mb-1 text-amber-950">
              Conceito Fundamental: Carteira Geral Futura vs Agenda Mensal
            </span>
            <p className="text-amber-800 leading-relaxed">
              A <strong>Carteira Futura</strong> consolida o saldo vivo de casais confirmados que ainda têm apresentações a realizar a partir da data de corte ({currentDate}).
              <strong> Nota de auditoria:</strong> Datas passadas/vencidas representam saídas do cronograma futuro e <em>não devem ser confundidas com comparecimento presencial efetivo</em> (o qual dependeria de dados operacionais de recepção de sala inexistentes na planilha).
            </p>
          </div>
        </div>
      </div>

      {/* Cards de Resumo da Carteira Viva */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-blue-200 bg-white p-5 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold text-slate-700">Carteira Futura Ativa</span>
            <Briefcase className="h-4 w-4 text-blue-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-blue-900 font-mono tabular-nums">
              {totalCarteiraFuturaAtual.toLocaleString('pt-BR')}
            </span>
            <span className="text-xs text-slate-500">casais com apresentação futura</span>
          </div>
          <div className="mt-2 text-xs text-slate-500">
            Apresentações programadas a partir de {currentDate}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold text-slate-700">Saldo da Carteira no Mês Atual</span>
            <Layers className="h-4 w-4 text-indigo-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900 font-mono tabular-nums">
              {(currentMonthHistory ? currentMonthHistory.saldo : saldoAtualReferencia).toLocaleString('pt-BR')}
            </span>
            <span className="text-xs text-slate-500">casais em carteira</span>
          </div>
          <div className="mt-2 text-xs text-slate-500">
            Carteira Inicial + Entradas − Saídas até o corte
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold text-slate-700">Horizonte Futuro Rastreado</span>
            <Calendar className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-emerald-800 font-mono tabular-nums">
              {futureDistribution.length}
            </span>
            <span className="text-xs text-slate-500">meses à frente</span>
          </div>
          <div className="mt-2 text-xs text-slate-500">
            Meses com apresentações já agendadas
          </div>
        </div>
      </div>

      {/* Grid: Distribuição da Carteira Futura por Mês + Tabela Histórica */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Distribuição por Mês Futuro */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs">
          <div className="border-b border-slate-100 pb-3 mb-4">
            <h3 className="text-sm font-bold text-slate-900">
              Distribuição da Carteira Ativa por Mês Futuro
            </h3>
            <p className="text-xs text-slate-500">
              Onde estão distribuídos os {totalCarteiraFuturaAtual} casais da carteira futura
            </p>
          </div>

          <div className="space-y-3.5">
            {futureDistribution.map((item) => {
              const barWidth = (item.quantidade / maxFutureQty) * 100;
              return (
                <div key={item.mesAno} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-800">{item.label}</span>
                    <div className="flex items-center gap-2 font-mono tabular-nums">
                      <span className="font-bold text-slate-900 text-sm">
                        {item.quantidade.toLocaleString('pt-BR')}
                      </span>
                      <span className="text-slate-500 text-[11px]">({item.percentual}%)</span>
                    </div>
                  </div>
                  <div className="h-3 w-full rounded-full bg-slate-100 overflow-hidden">
                    <div
                      style={{ width: `${barWidth}%` }}
                      className="h-full rounded-full bg-gradient-to-r from-blue-600 to-indigo-600"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Fórmulas Explicativas */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <HelpCircle className="h-5 w-5 text-blue-600" />
              <h3 className="text-sm font-bold text-slate-900">
                Lógica Contábil da Carteira Futura
              </h3>
            </div>
            <div className="space-y-3 text-xs text-slate-700">
              <div className="rounded-lg bg-slate-50 p-3 border border-slate-200">
                <span className="font-bold text-slate-900 block mb-0.5">CARTEIRA INICIAL</span>
                <span>Casais confirmados antes do início do mês M, com apresentação nesse mês M ou posterior.</span>
              </div>
              <div className="rounded-lg bg-slate-50 p-3 border border-slate-200">
                <span className="font-bold text-slate-900 block mb-0.5">NOVAS ENTRADAS VÁLIDAS</span>
                <span>Reservas confirmadas no período com apresentação válida ainda futura na data da confirmação.</span>
              </div>
              <div className="rounded-lg bg-slate-50 p-3 border border-slate-200">
                <span className="font-bold text-slate-900 block mb-0.5">SAÍDAS PROGRAMADAS</span>
                <span>Apresentações cuja data ocorreu durante o período (no mês corrente, apenas até o dia de corte).</span>
              </div>
              <div className="rounded-lg bg-slate-50 p-3 border border-slate-200">
                <span className="font-bold text-slate-900 block mb-0.5">SALDO</span>
                <span className="font-mono text-blue-800 font-semibold">Carteira Inicial + Novas Entradas − Saídas Programadas</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabela de Evolução da Carteira por Período */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-2xs overflow-hidden">
        <div className="border-b border-slate-200 px-5 py-4 bg-slate-50/50">
          <h3 className="text-sm font-bold text-slate-900">
            Evolução Mensal da Carteira (Entradas, Saídas e Saldo)
          </h3>
          <p className="text-xs text-slate-500">
            Cálculo auditável período a período conforme a base histórica
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-100 text-slate-700 font-bold uppercase tracking-wider text-[11px]">
                <th className="px-5 py-3">Período</th>
                <th className="px-5 py-3 text-right">Carteira Inicial</th>
                <th className="px-5 py-3 text-right">Novas Entradas</th>
                <th className="px-5 py-3 text-right">Saídas Programadas</th>
                <th className="px-5 py-3 text-right">Saldo Final do Mês</th>
                <th className="px-5 py-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-800 font-mono tabular-nums">
              {history.map((row) => (
                <tr
                  key={row.mesAno}
                  className={`hover:bg-slate-50/80 transition-colors ${
                    row.isCurrentMonth ? 'bg-blue-50/60 font-semibold' : ''
                  }`}
                >
                  <td className="px-5 py-3 font-sans font-medium text-slate-900 flex items-center gap-2">
                    <span>{row.label}</span>
                    {row.isCurrentMonth && (
                      <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-bold text-blue-800 font-sans">
                        Em Corte
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-right font-medium text-slate-700">
                    {row.carteiraInicial.toLocaleString('pt-BR')}
                  </td>
                  <td className="px-5 py-3 text-right font-medium text-emerald-700">
                    +{row.novasEntradas.toLocaleString('pt-BR')}
                  </td>
                  <td className="px-5 py-3 text-right font-medium text-rose-700">
                    -{row.saidasProgramadas.toLocaleString('pt-BR')}
                  </td>
                  <td className="px-5 py-3 text-right font-extrabold text-blue-900 text-sm">
                    {row.saldo.toLocaleString('pt-BR')}
                  </td>
                  <td className="px-5 py-3 text-center font-sans text-xs">
                    {row.isCurrentMonth ? (
                      <span className="text-blue-700 font-semibold">Corte em {currentDate}</span>
                    ) : (
                      <span className="text-slate-400">Consolidado</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
