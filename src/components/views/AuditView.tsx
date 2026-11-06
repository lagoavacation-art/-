import React, { useState } from 'react';
import { ShieldCheck, Download, CheckCircle2, FileSpreadsheet, Search } from 'lucide-react';
import { BIDataset } from '../../types/bi';

interface AuditViewProps {
  dataset: BIDataset;
}

export const AuditView: React.FC<AuditViewProps> = ({ dataset }) => {
  const { audit } = dataset;
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

  const getFriendlyBadge = (tipo: string) => {
    switch (tipo) {
      case 'SEM_APRESENTACAO':
        return { label: 'Data a Confirmar', class: 'text-amber-800 bg-amber-50 border-amber-200' };
      case 'DATAS_INVERTIDAS':
        return { label: 'Sequência de Datas', class: 'text-rose-800 bg-rose-50 border-rose-200' };
      case 'DUPLICIDADE_ELIMINADA':
        return { label: 'Duplicidade Consolidada', class: 'text-slate-700 bg-slate-100 border-slate-200' };
      case 'REPROGRAMACAO_POTENCIAL':
        return { label: 'Ajuste de Cronograma', class: 'text-blue-800 bg-blue-50 border-blue-200' };
      default:
        return { label: tipo, class: 'text-slate-700 bg-slate-100 border-slate-200' };
    }
  };

  return (
    <div className="space-y-6">
      {/* Banner de Governança e Consistência da Base */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-emerald-50 p-2 text-emerald-700">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Governança e Qualidade dos Dados Comerciais
              </h2>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                Totalização gerencial auditável com aplicação de critérios de consistência para conferência da diretoria.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleDownloadAuditCSV}
            className="flex items-center gap-2 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white shadow-2xs hover:bg-slate-800 transition-colors shrink-0"
          >
            <Download className="h-4 w-4" />
            <span>Exportar Relatório Gerencial (.CSV)</span>
          </button>
        </div>

        {/* Fita de Reconciliação Executiva */}
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 border-t border-slate-100 pt-4 text-xs font-mono tabular-nums">
          <div>
            <span className="text-slate-500 block text-[11px] font-sans font-medium">1. Lançamentos Registrados</span>
            <span className="text-lg font-extrabold text-slate-900">{audit.totalLinhas.toLocaleString('pt-BR')}</span>
          </div>
          <div>
            <span className="text-slate-500 block text-[11px] font-sans font-medium">2. Complementos (Adicionais)</span>
            <span className="text-lg font-extrabold text-amber-700">-{audit.totalAdicionalDesconsiderado.toLocaleString('pt-BR')}</span>
          </div>
          <div>
            <span className="text-slate-500 block text-[11px] font-sans font-medium">3. Reservas Principais</span>
            <span className="text-lg font-extrabold text-indigo-900">{audit.totalReservaNormal.toLocaleString('pt-BR')}</span>
          </div>
          <div>
            <span className="text-slate-500 block text-[11px] font-sans font-medium">4. Casais Qualificados Únicos</span>
            <span className="text-lg font-extrabold text-blue-900">{audit.casaisValidosContabilizados.toLocaleString('pt-BR')}</span>
          </div>
        </div>
      </div>

      {/* Grid de Cards Executivos de Auditoria */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
          <span className="text-xs font-semibold text-slate-500">Reservas Principais</span>
          <div className="mt-2 text-2xl font-extrabold text-slate-900 font-mono tabular-nums">
            {audit.totalReservaNormal.toLocaleString('pt-BR')}
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Lançamentos de reserva regular no sistema
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
          <span className="text-xs font-semibold text-slate-500">Complementos Financeiros (Adicionais)</span>
          <div className="mt-2 text-2xl font-extrabold text-slate-700 font-mono tabular-nums">
            {audit.totalAdicionalDesconsiderado.toLocaleString('pt-BR')}
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Os critérios de consistência de base foram aplicados automaticamente.
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
          <span className="text-xs font-semibold text-slate-500">Tratamento de Duplicidades</span>
          <div className="mt-2 text-2xl font-extrabold text-indigo-700 font-mono tabular-nums">
            {audit.duplicidadesEliminadas.toLocaleString('pt-BR')}
          </div>
          <p className="mt-1 text-xs text-slate-500">
            A base passou por tratamento de consistência para evitar duplicidades.
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
          <span className="text-xs font-semibold text-slate-500">Reprogramações de Agenda</span>
          <div className="mt-2 text-2xl font-extrabold text-amber-700 font-mono tabular-nums">
            {audit.reprogramacoesSinalizadas.toLocaleString('pt-BR')}
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Reservas com atualização de cronograma de apresentação
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
          <span className="text-xs font-semibold text-slate-500">Apontamentos de Validação</span>
          <div className="mt-2 text-2xl font-extrabold text-slate-800 font-mono tabular-nums">
            {audit.pendenciasAuditadas.toLocaleString('pt-BR')}
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Registros pendentes de confirmação operacional
          </p>
        </div>

        <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-4 shadow-2xs">
          <span className="text-xs font-semibold text-blue-900">Total de Casais Qualificados</span>
          <div className="mt-2 text-2xl font-extrabold text-blue-950 font-mono tabular-nums">
            {audit.casaisValidosContabilizados.toLocaleString('pt-BR')}
          </div>
          <p className="mt-1 text-xs text-blue-800">
            Índice de qualificação da base: {audit.taxaConformidade}%
          </p>
        </div>
      </div>

      {/* Tabela de Apontamentos Operacionais */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-2xs overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 px-5 py-4 gap-3 bg-slate-50/50">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Apontamentos Cadastrais para Regularização Operacional
            </h3>
            <p className="text-xs text-slate-500">
              Relação de itens que demandam conferência na planilha pela equipe de atendimento
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar reserva ou linha..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="rounded-md border border-slate-300 bg-white pl-8 pr-2.5 py-1.5 text-xs text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-blue-500 w-48"
              />
            </div>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
            >
              <option value="all">Todos os Apontamentos ({issues.length})</option>
              <option value="SEM_APRESENTACAO">Aguardando Data</option>
              <option value="DATAS_INVERTIDAS">Sequência de Datas</option>
              <option value="DUPLICIDADE_ELIMINADA">Duplicidades</option>
              <option value="REPROGRAMACAO_POTENCIAL">Reprogramações</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="sticky top-0 bg-slate-100 z-10 shadow-2xs">
              <tr className="border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider text-[11px]">
                <th className="px-5 py-3">Linha</th>
                <th className="px-5 py-3">Reserva</th>
                <th className="px-5 py-3">Classificação</th>
                <th className="px-5 py-3">Detalhamento</th>
                <th className="px-5 py-3">Empreendimento / Responsável</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-800 font-mono tabular-nums">
              {filteredIssues.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-slate-400 font-sans">
                    Nenhum apontamento encontrado com os filtros atuais.
                  </td>
                </tr>
              ) : (
                filteredIssues.map((issue) => {
                  const badge = getFriendlyBadge(issue.tipo);

                  return (
                    <tr key={issue.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-5 py-2.5 font-bold text-slate-900">
                        Linha {issue.line}
                      </td>
                      <td className="px-5 py-2.5 font-semibold text-blue-900">
                        {issue.reserva || 'S/N'}
                      </td>
                      <td className="px-5 py-2.5 font-sans">
                        <span className={`inline-block rounded px-2 py-0.5 text-[10px] font-semibold border ${badge.class}`}>
                          {badge.label}
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
