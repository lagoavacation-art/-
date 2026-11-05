import React, { useState } from 'react';
import { Users, UserCheck, Briefcase } from 'lucide-react';
import { BIDataset } from '../../types/bi';

interface CommercialTeamViewProps {
  dataset: BIDataset;
}

export const CommercialTeamView: React.FC<CommercialTeamViewProps> = ({ dataset }) => {
  const { teamData } = dataset;
  const { sdrs, consultores, crossMatrix } = teamData;
  const [activeTab, setActiveTab] = useState<'sdrs' | 'consultores' | 'cross'>('sdrs');

  return (
    <div className="space-y-6">
      {/* Abas Superiores */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
        <div>
          <h2 className="text-sm font-bold text-slate-900">
            Desempenho Quantitativo da Equipe Comercial
          </h2>
          <p className="text-xs text-slate-500">
            Casais confirmados e distribuição operacional por SDR e Consultor
          </p>
        </div>
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
          <button
            type="button"
            onClick={() => setActiveTab('sdrs')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              activeTab === 'sdrs'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            SDRs ({sdrs.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('consultores')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              activeTab === 'consultores'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Consultores ({consultores.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('cross')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              activeTab === 'cross'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Matriz SDR × Consultor
          </button>
        </div>
      </div>

      {activeTab === 'sdrs' && (
        <div className="rounded-xl border border-slate-200 bg-white shadow-2xs overflow-hidden">
          <div className="border-b border-slate-200 px-5 py-4 bg-slate-50/50">
            <h3 className="text-sm font-bold text-slate-900">
              Ranking de Produção por SDR (Pré-Venda / Agendamento)
            </h3>
            <p className="text-xs text-slate-500">
              Casais confirmados, proporção de agendamento no mesmo mês vs futuro e hotéis
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-100 text-slate-700 font-bold uppercase tracking-wider text-[11px]">
                  <th className="px-5 py-3">Nome do SDR</th>
                  <th className="px-5 py-3 text-right">Total de Casais</th>
                  <th className="px-5 py-3 text-right">Participação</th>
                  <th className="px-5 py-3 text-right">Mesmo Mês (M+0)</th>
                  <th className="px-5 py-3 text-right">Apresentação Futura</th>
                  <th className="px-5 py-3">Distribuição por Hotel</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-slate-800 font-mono tabular-nums">
                {sdrs.map((s) => (
                  <tr key={s.nome} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-5 py-3 font-sans font-semibold text-slate-900">
                      {s.nome}
                    </td>
                    <td className="px-5 py-3 text-right font-bold text-slate-900 text-sm">
                      {s.totalCasais.toLocaleString('pt-BR')}
                    </td>
                    <td className="px-5 py-3 text-right text-slate-600">
                      {s.percentualDoTotal}%
                    </td>
                    <td className="px-5 py-3 text-right text-emerald-700">
                      {s.apresentacoesNoMesmoMes.toLocaleString('pt-BR')}
                    </td>
                    <td className="px-5 py-3 text-right text-blue-700">
                      {s.apresentacoesFuturas.toLocaleString('pt-BR')}
                    </td>
                    <td className="px-5 py-3 font-sans text-xs">
                      <div className="flex flex-wrap gap-1.5">
                        {Object.entries(s.hoteis).map(([h, q]) => (
                          <span
                            key={h}
                            className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-700 border border-slate-200"
                          >
                            {h}: <strong className="font-mono">{q}</strong>
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'consultores' && (
        <div className="rounded-xl border border-slate-200 bg-white shadow-2xs overflow-hidden">
          <div className="border-b border-slate-200 px-5 py-4 bg-slate-50/50">
            <h3 className="text-sm font-bold text-slate-900">
              Ranking de Produção por Consultor Comercial
            </h3>
            <p className="text-xs text-slate-500">
              Casais confirmados e divisão de agenda por consultor
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-100 text-slate-700 font-bold uppercase tracking-wider text-[11px]">
                  <th className="px-5 py-3">Nome do Consultor</th>
                  <th className="px-5 py-3 text-right">Total de Casais</th>
                  <th className="px-5 py-3 text-right">Participação</th>
                  <th className="px-5 py-3 text-right">Mesmo Mês (M+0)</th>
                  <th className="px-5 py-3 text-right">Apresentação Futura</th>
                  <th className="px-5 py-3">Distribuição por Hotel</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-slate-800 font-mono tabular-nums">
                {consultores.map((c) => (
                  <tr key={c.nome} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-5 py-3 font-sans font-semibold text-slate-900">
                      {c.nome}
                    </td>
                    <td className="px-5 py-3 text-right font-bold text-slate-900 text-sm">
                      {c.totalCasais.toLocaleString('pt-BR')}
                    </td>
                    <td className="px-5 py-3 text-right text-slate-600">
                      {c.percentualDoTotal}%
                    </td>
                    <td className="px-5 py-3 text-right text-emerald-700">
                      {c.apresentacoesNoMesmoMes.toLocaleString('pt-BR')}
                    </td>
                    <td className="px-5 py-3 text-right text-blue-700">
                      {c.apresentacoesFuturas.toLocaleString('pt-BR')}
                    </td>
                    <td className="px-5 py-3 font-sans text-xs">
                      <div className="flex flex-wrap gap-1.5">
                        {Object.entries(c.hoteis).map(([h, q]) => (
                          <span
                            key={h}
                            className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-700 border border-slate-200"
                          >
                            {h}: <strong className="font-mono">{q}</strong>
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'cross' && (
        <div className="rounded-xl border border-slate-200 bg-white shadow-2xs overflow-hidden">
          <div className="border-b border-slate-200 px-5 py-4 bg-slate-50/50">
            <h3 className="text-sm font-bold text-slate-900">
              Matriz de Atribuição: SDR (Linhas) × Consultor (Colunas)
            </h3>
            <p className="text-xs text-slate-500">
              Cruzamento de volume de casais entre quem pré-agendou e quem atendeu
            </p>
          </div>
          <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
            <table className="w-full text-center text-xs border-collapse">
              <thead className="sticky top-0 bg-slate-100 z-10 shadow-2xs">
                <tr className="border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider text-[11px]">
                  <th className="px-4 py-3 text-left sticky left-0 bg-slate-100 z-20">
                    SDR ↓ / Consultor →
                  </th>
                  {crossMatrix.consultores.map(c => (
                    <th key={c} className="px-3 py-3 whitespace-nowrap min-w-[100px]">
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-slate-800 font-mono tabular-nums">
                {crossMatrix.sdrs.map(s => (
                  <tr key={s} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-2.5 text-left font-sans font-semibold text-slate-900 sticky left-0 bg-white z-10 border-r border-slate-200 whitespace-nowrap">
                      {s}
                    </td>
                    {crossMatrix.consultores.map(c => {
                      const count = crossMatrix.matrix[s]?.[c] || 0;
                      return (
                        <td
                          key={c}
                          className={`px-3 py-2 text-center border border-slate-100 ${
                            count > 0 ? 'bg-blue-50/60 font-semibold text-blue-900' : 'text-slate-300'
                          }`}
                        >
                          {count > 0 ? count : '·'}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
