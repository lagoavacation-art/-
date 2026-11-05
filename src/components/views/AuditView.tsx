import React, { useState } from 'react';
import { ShieldCheck, ShieldAlert, Download, CheckCircle2, AlertTriangle, FileSpreadsheet } from 'lucide-react';
import { BIDataset } from '../../types/bi';

interface AuditViewProps {
  dataset: BIDataset;
}

export const AuditView: React.FC<AuditViewProps> = ({ dataset }) => {
  const { audit, currentDate } = dataset;
  const [filterType, setFilterType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const issues = audit.listaPendencias || [];

  const filteredIssues = issues.filter(issue => {
    if (filterType !== 'all' && issue.tipo !== filterType) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        issue.reserva.toLowerCase().includes(q) ||
        issue.descricao.toLowerCase().includes(q) ||
        String(issue.line).includes(q) ||
        (issue.hotel && issue.hotel.toLowerCase().includes(q))
      );
    }
    return true;
  });

  // Baixar relatório CSV
  const handleDownloadAuditCSV = () => {
    window.location.href = '/api/export-audit';
  };

  return (
    <div className="space-y-6">
      {/* Banner de Fechamento Matemático Estrito */}
      <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-5 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="h-6 w-6 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <h2 className="text-sm font-bold text-emerald-950">
                Auditoria de Fechamento Matemático (100% Auditável)
              </h2>
              <p className="text-xs text-emerald-900/90 mt-1 leading-relaxed">
                A totalização dos registros obedece estritamente às regras de integridade de dados comerciais. Nenhum valor fictício ou estimativa foi injetado.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleDownloadAuditCSV}
            className="flex items-center gap-2 rounded-lg bg-emerald-700 px-3.5 py-2 text-xs font-semibold text-white shadow-2xs hover:bg-emerald-800 transition-colors shrink-0"
          >
            <Download className="h-4 w-4" />
            <span>Baixar Relatório de Pendências (.CSV)</span>
          </button>
        </div>

        {/* Fita de Reconciliação Matemática */}
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 border-t border-emerald-200/80 pt-4 text-xs font-mono tabular-nums">
          <div>
            <span className="text-emerald-800/80 block text-[11px] font-sans font-medium">1. Total de Linhas</span>
            <span className="text-lg font-extrabold text-emerald-950">{audit.totalLinhas.toLocaleString('pt-BR')}</span>
          </div>
          <div>
            <span className="text-rose-800 block text-[11px] font-sans font-medium">2. Ignorado (ADICIONAL)</span>
            <span className="text-lg font-extrabold text-rose-900">-{audit.totalAdicionalDesconsiderado.toLocaleString('pt-BR')}</span>
          </div>
          <div>
            <span className="text-emerald-800/80 block text-[11px] font-sans font-medium">3. RESERVA NORMAL</span>
            <span className="text-lg font-extrabold text-emerald-950">{audit.totalReservaNormal.toLocaleString('pt-BR')}</span>
          </div>
          <div>
            <span className="text-blue-900 block text-[11px] font-sans font-medium">4. Casais Válidos Únicos</span>
            <span className="text-lg font-extrabold text-blue-950">{audit.casaisValidosContabilizados.toLocaleString('pt-BR')}</span>
          </div>
        </div>
      </div>

      {/* Grid de Cards de Auditoria */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
          <span className="text-xs font-semibold text-slate-500">Lançamentos RESERVA NORMAL</span>
          <div className="mt-2 text-2xl font-extrabold text-slate-900 font-mono tabular-nums">
            {audit.totalReservaNormal.toLocaleString('pt-BR')}
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Base primária qualificada conforme Coluna J
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
          <span className="text-xs font-semibold text-slate-500">Lançamentos ADICIONAL Desconsiderados</span>
          <div className="mt-2 text-2xl font-extrabold text-slate-700 font-mono tabular-nums">
            {audit.totalAdicionalDesconsiderado.toLocaleString('pt-BR')}
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Regra absoluta: expurgados de todos os totais
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
          <span className="text-xs font-semibold text-slate-500">Duplicidades Identificadas & Consolidadas</span>
          <div className="mt-2 text-2xl font-extrabold text-indigo-700 font-mono tabular-nums">
            {audit.duplicidadesEliminadas.toLocaleString('pt-BR')}
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Mesma reserva e mesma apresentação: mantida a 1ª
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
          <span className="text-xs font-semibold text-slate-500">Possíveis Reprogramações Sinalizadas</span>
          <div className="mt-2 text-2xl font-extrabold text-amber-600 font-mono tabular-nums">
            {audit.reprogramacoesSinalizadas.toLocaleString('pt-BR')}
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Mesmo ID com datas de apresentação divergentes
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
          <span className="text-xs font-semibold text-slate-500">Total de Pendências Auditadas</span>
          <div className="mt-2 text-2xl font-extrabold text-rose-600 font-mono tabular-nums">
            {audit.pendenciasAuditadas.toLocaleString('pt-BR')}
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Sem apresentação, datas inválidas ou invertidas
          </p>
        </div>

        <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-4 shadow-2xs">
          <span className="text-xs font-semibold text-blue-900">Total Efetivamente Contabilizado</span>
          <div className="mt-2 text-2xl font-extrabold text-blue-950 font-mono tabular-nums">
            {audit.casaisValidosContabilizados.toLocaleString('pt-BR')}
          </div>
          <p className="mt-1 text-xs text-blue-800">
            Taxa de conformidade de {audit.taxaConformidade}%
          </p>
        </div>
      </div>

      {/* Tabela de Pendências para Correção na Planilha */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-2xs overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 px-5 py-4 gap-3 bg-slate-50/50">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Relação de Pendências para Correção na Planilha Original
            </h3>
            <p className="text-xs text-slate-500">
              Registros que exigem atenção da equipe de reservas para regularização
            </p>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="text"
              placeholder="Buscar reserva ou linha..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-blue-500 w-44"
            />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
            >
              <option value="all">Todos os Tipos ({issues.length})</option>
              <option value="SEM_APRESENTACAO">Sem Apresentação</option>
              <option value="DATAS_INVERTIDAS">Datas Invertidas</option>
              <option value="DUPLICIDADE_ELIMINADA">Duplicidades</option>
              <option value="REPROGRAMACAO_POTENCIAL">Reprogramações</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="sticky top-0 bg-slate-100 z-10 shadow-2xs">
              <tr className="border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider text-[11px]">
                <th className="px-5 py-3">Linha Planilha</th>
                <th className="px-5 py-3">Reserva</th>
                <th className="px-5 py-3">Tipo de Alerta</th>
                <th className="px-5 py-3">Descrição / Motivo</th>
                <th className="px-5 py-3">Hotel / SDR</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-800 font-mono tabular-nums">
              {filteredIssues.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-slate-400 font-sans">
                    Nenhuma pendência encontrada para o filtro selecionado.
                  </td>
                </tr>
              ) : (
                filteredIssues.map((issue) => {
                  let badgeClass = 'text-amber-800 bg-amber-50 border-amber-200';
                  if (issue.tipo === 'SEM_APRESENTACAO' || issue.tipo === 'DATAS_INVERTIDAS') {
                    badgeClass = 'text-rose-800 bg-rose-50 border-rose-200';
                  } else if (issue.tipo === 'DUPLICIDADE_ELIMINADA') {
                    badgeClass = 'text-slate-800 bg-slate-100 border-slate-200';
                  }

                  return (
                    <tr key={issue.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-5 py-2.5 font-bold text-slate-900">
                        Linha {issue.line}
                      </td>
                      <td className="px-5 py-2.5 font-semibold text-blue-900">
                        {issue.reserva || 'S/N'}
                      </td>
                      <td className="px-5 py-2.5 font-sans">
                        <span className={`inline-block rounded px-2 py-0.5 text-[10px] font-semibold border ${badgeClass}`}>
                          {issue.tipo}
                        </span>
                      </td>
                      <td className="px-5 py-2.5 font-sans text-xs text-slate-700">
                        {issue.descricao}
                      </td>
                      <td className="px-5 py-2.5 font-sans text-xs text-slate-500">
                        {issue.hotel || 'N/I'} · {issue.sdr || 'N/I'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
