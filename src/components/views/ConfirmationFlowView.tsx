import React, { useState } from 'react';
import { GitFork, Grid3X3, Table } from 'lucide-react';
import { BIDataset } from '../../types/bi';

interface ConfirmationFlowViewProps {
  dataset: BIDataset;
}

export const ConfirmationFlowView: React.FC<ConfirmationFlowViewProps> = ({ dataset }) => {
  const { confirmationFlow, confirmationMatrix } = dataset;
  const [activeTab, setActiveTab] = useState<'cohorts' | 'matrix'>('cohorts');

  const { confMonths, apresMonths, matrix, totalsByConf, totalsByApres, grandTotal } = confirmationMatrix;

  // Encontra o valor máximo da matriz para calibrar a intensidade do mapa de calor
  let maxCell = 1;
  confMonths.forEach(cYM => {
    apresMonths.forEach(aYM => {
      const val = matrix[cYM]?.[aYM] || 0;
      if (val > maxCell) maxCell = val;
    });
  });

  return (
    <div className="space-y-6">
      {/* Abas de Navegação interna entre Visão de Horizontes e Matriz Dinâmica */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
        <div>
          <h2 className="text-sm font-bold text-slate-900">
            Tempo de Maturação entre Confirmação e Apresentação
          </h2>
          <p className="text-xs text-slate-500">
            Análise comportamental do intervalo entre a venda da reserva e a data da apresentação
          </p>
        </div>
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
          <button
            type="button"
            onClick={() => setActiveTab('cohorts')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              activeTab === 'cohorts'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Table className="h-3.5 w-3.5" />
            <span>Horizontes (M+0 a M+3+)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('matrix')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              activeTab === 'matrix'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Grid3X3 className="h-3.5 w-3.5" />
            <span>Matriz Confirmação × Apresentação</span>
          </button>
        </div>
      </div>

      {activeTab === 'cohorts' ? (
        /* VISÃO 1: COHORT TABLE (M+0, M+1, M+2, M+3+) */
        <div className="space-y-6">
          {/* Card explicativo das faixas */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5 text-xs">
            <div className="rounded-lg bg-emerald-50 p-3 border border-emerald-200">
              <span className="font-bold text-emerald-900 block mb-0.5">M+0 (Mesmo Mês)</span>
              <p className="text-emerald-800 text-[11px]">Apresentação ocorre no mesmo mês da confirmação.</p>
            </div>
            <div className="rounded-lg bg-blue-50 p-3 border border-blue-200">
              <span className="font-bold text-blue-900 block mb-0.5">M+1 (Mês Seguinte)</span>
              <p className="text-blue-800 text-[11px]">Apresentação prevista para o 1º mês após confirmação.</p>
            </div>
            <div className="rounded-lg bg-indigo-50 p-3 border border-indigo-200">
              <span className="font-bold text-indigo-900 block mb-0.5">M+2 (2 Meses)</span>
              <p className="text-indigo-800 text-[11px]">Apresentação prevista para o 2º mês posterior.</p>
            </div>
            <div className="rounded-lg bg-purple-50 p-3 border border-purple-200">
              <span className="font-bold text-purple-900 block mb-0.5">M+3+ (Longo Prazo)</span>
              <p className="text-purple-800 text-[11px]">Apresentação após 3 meses ou mais.</p>
            </div>
            <div className="rounded-lg bg-slate-50 p-3 border border-slate-200 col-span-2 sm:col-span-1">
              <span className="font-bold text-slate-800 block mb-0.5">Pendentes</span>
              <p className="text-slate-600 text-[11px]">Sem data ou com datas inconsistentes.</p>
            </div>
          </div>

          {/* Tabela de Cohorts */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-100 text-slate-700 font-bold uppercase tracking-wider text-[11px]">
                    <th className="px-5 py-3">Mês de Confirmação</th>
                    <th className="px-5 py-3 text-right">Total Confirmados</th>
                    <th className="px-5 py-3 text-right">M+0 (Mesmo Mês)</th>
                    <th className="px-5 py-3 text-right">M+1 (Mês Seguinte)</th>
                    <th className="px-5 py-3 text-right">M+2 (2 Meses)</th>
                    <th className="px-5 py-3 text-right">M+3+ (3+ Meses)</th>
                    <th className="px-5 py-3 text-right">Inconsistente</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-slate-800 font-mono tabular-nums">
                  {confirmationFlow.map((row) => (
                    <tr key={row.mesConfirmacao} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-5 py-3 font-sans font-semibold text-slate-900">
                        {row.label}
                      </td>
                      <td className="px-5 py-3 text-right font-bold text-slate-900">
                        {row.totalConfirmados.toLocaleString('pt-BR')}
                      </td>
                      <td className="px-5 py-3 text-right text-emerald-700">
                        <span className="font-bold">{row.m0}</span>
                        <span className="text-[11px] text-slate-400 ml-1">({row.m0Pct}%)</span>
                      </td>
                      <td className="px-5 py-3 text-right text-blue-700">
                        <span className="font-bold">{row.m1}</span>
                        <span className="text-[11px] text-slate-400 ml-1">({row.m1Pct}%)</span>
                      </td>
                      <td className="px-5 py-3 text-right text-indigo-700">
                        <span className="font-bold">{row.m2}</span>
                        <span className="text-[11px] text-slate-400 ml-1">({row.m2Pct}%)</span>
                      </td>
                      <td className="px-5 py-3 text-right text-purple-700">
                        <span className="font-bold">{row.m3Plus}</span>
                        <span className="text-[11px] text-slate-400 ml-1">({row.m3PlusPct}%)</span>
                      </td>
                      <td className="px-5 py-3 text-right text-rose-700">
                        {row.inconsistente > 0 ? (
                          <>
                            <span className="font-bold">{row.inconsistente}</span>
                            <span className="text-[11px] text-slate-400 ml-1">({row.inconsistentePct}%)</span>
                          </>
                        ) : (
                          <span className="text-slate-300">0</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* VISÃO 2: MATRIZ DINÂMICA (HEATMAP) */
        <div className="rounded-xl border border-slate-200 bg-white shadow-2xs overflow-hidden">
          <div className="border-b border-slate-200 px-5 py-4 bg-slate-50/50 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Matriz Cruzada: Mês de Confirmação (Linhas) × Mês de Apresentação (Colunas)
              </h3>
              <p className="text-xs text-slate-500">
                Intensidade de cor proporcional à densidade de casais programados (Total apurado: {grandTotal.toLocaleString('pt-BR')} casais)
              </p>
            </div>
          </div>

          <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
            <table className="w-full text-center text-xs border-collapse">
              <thead className="sticky top-0 bg-slate-100 z-10 shadow-2xs">
                <tr className="border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider text-[11px]">
                  <th className="px-4 py-3 text-left sticky left-0 bg-slate-100 z-20">
                    Confirmação ↓ / Apresentação →
                  </th>
                  {apresMonths.map(aYM => (
                    <th key={aYM} className="px-3 py-3 whitespace-nowrap min-w-[70px]">
                      {aYM}
                    </th>
                  ))}
                  <th className="px-4 py-3 text-right bg-slate-200/80 sticky right-0 z-20">
                    Total Conf.
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-slate-800 font-mono tabular-nums">
                {confMonths.map(cYM => {
                  const confTotal = totalsByConf[cYM] || 0;
                  return (
                    <tr key={cYM} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-2.5 text-left font-sans font-semibold text-slate-900 sticky left-0 bg-white z-10 whitespace-nowrap border-r border-slate-200">
                        {cYM}
                      </td>
                      {apresMonths.map(aYM => {
                        const val = matrix[cYM]?.[aYM] || 0;
                        const intensity = val > 0 ? Math.min(Math.max((val / maxCell) * 100, 15), 100) : 0;
                        
                        let bgColor = 'bg-transparent text-slate-300';
                        if (val > 0) {
                          if (intensity > 60) bgColor = 'bg-blue-600 text-white font-bold';
                          else if (intensity > 30) bgColor = 'bg-blue-200 text-blue-900 font-semibold';
                          else bgColor = 'bg-blue-50 text-blue-800 font-medium';
                        }

                        return (
                          <td
                            key={aYM}
                            className={`px-2 py-2 text-center transition-colors border border-slate-100 ${bgColor}`}
                            title={`Confirmado em ${cYM} com apresentação em ${aYM}: ${val} casais`}
                          >
                            {val > 0 ? val : '·'}
                          </td>
                        );
                      })}
                      <td className="px-4 py-2.5 text-right font-extrabold text-slate-900 sticky right-0 bg-slate-50 z-10 border-l border-slate-200">
                        {confTotal}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="sticky bottom-0 bg-slate-100 z-10 font-bold border-t-2 border-slate-300 font-mono tabular-nums">
                <tr>
                  <td className="px-4 py-3 text-left font-sans font-extrabold sticky left-0 bg-slate-100 z-20 border-r border-slate-200">
                    Total Apres.
                  </td>
                  {apresMonths.map(aYM => (
                    <td key={aYM} className="px-3 py-3 text-center text-blue-900 font-extrabold">
                      {totalsByApres[aYM] || 0}
                    </td>
                  ))}
                  <td className="px-4 py-3 text-right text-sm font-extrabold text-blue-950 sticky right-0 bg-slate-200 z-20 border-l border-slate-200">
                    {grandTotal.toLocaleString('pt-BR')}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
