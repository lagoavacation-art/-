import React, { useState } from 'react';
import { Download, CalendarCheck, HelpCircle, CheckCircle2 } from 'lucide-react';
import { BIDataset, MonthlyFlowItem } from '../../types/bi';

interface MonthlyFlowViewProps {
  dataset: BIDataset;
}

export const MonthlyFlowView: React.FC<MonthlyFlowViewProps> = ({ dataset }) => {
  const { monthlyFlow, currentDate } = dataset;
  const [sortAsc, setSortAsc] = useState(false);

  // Ordenação
  const sortedFlow = [...monthlyFlow].sort((a, b) => {
    return sortAsc ? a.mesAno.localeCompare(b.mesAno) : b.mesAno.localeCompare(a.mesAno);
  });

  // Totais agregados da tabela
  const totals = monthlyFlow.reduce(
    (acc, item) => {
      acc.abertura += item.abertura;
      acc.entradas += item.entradas;
      acc.totalProgramado += item.totalProgramado;
      acc.agendaRestante += item.agendaRestante;
      return acc;
    },
    { abertura: 0, entradas: 0, totalProgramado: 0, agendaRestante: 0 }
  );

  // Exportar Tabela para CSV
  const handleExportCSV = () => {
    let csv = 'MES,ABERTURA,NOVAS_ENTRADAS,TOTAL_PROGRAMADO,AGENDA_RESTANTE,STATUS\n';
    for (const item of sortedFlow) {
      const status = item.isCurrentMonth ? 'Mês Corrente' : item.isPastMonth ? 'Passado' : 'Futuro';
      csv += `"${item.label}",${item.abertura},${item.entradas},${item.totalProgramado},${item.agendaRestante},"${status}"\n`;
    }
    csv += `"TOTAL GERAL",${totals.abertura},${totals.entradas},${totals.totalProgramado},${totals.agendaRestante},""\n`;

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `lagoa_bi_fluxo_mensal_${currentDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Bloco de Definições Metodológicas */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs">
        <div className="flex items-center gap-2 mb-3">
          <HelpCircle className="h-5 w-5 text-blue-600" />
          <h2 className="text-sm font-bold text-slate-900">
            Metodologia Executiva do Fluxo Mensal
          </h2>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 text-xs">
          <div className="rounded-lg bg-slate-50 p-3 border border-slate-200">
            <span className="font-bold text-blue-800 block mb-1">1. ABERTURA</span>
            <p className="text-slate-600">
              Casais confirmados <strong>antes do 1º dia do mês M</strong>, com apresentação prevista dentro de M.
            </p>
          </div>
          <div className="rounded-lg bg-slate-50 p-3 border border-slate-200">
            <span className="font-bold text-emerald-800 block mb-1">2. NOVAS ENTRADAS</span>
            <p className="text-slate-600">
              Casais confirmados <strong>durante M</strong>, com apresentação prevista dentro do próprio M.
            </p>
          </div>
          <div className="rounded-lg bg-slate-50 p-3 border border-slate-200">
            <span className="font-bold text-slate-900 block mb-1">3. TOTAL PROGRAMADO</span>
            <p className="text-slate-600">
              Soma exata: <strong>Abertura + Novas Entradas</strong>. Quantitativo total de casais previstos.
            </p>
          </div>
          <div className="rounded-lg bg-slate-50 p-3 border border-slate-200">
            <span className="font-bold text-indigo-800 block mb-1">4. AGENDA RESTANTE</span>
            <p className="text-slate-600">
              Casais com apresentações em <strong>datas ainda não vencidas</strong> no mês (0 para meses passados).
            </p>
          </div>
        </div>
      </div>

      {/* Tabela Gerencial de Fluxo Mensal */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-2xs overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 px-5 py-4 gap-3 bg-slate-50/50">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Tabela Gerencial de Acompanhamento Mensal
            </h3>
            <p className="text-xs text-slate-500">
              Histórico completo e meses futuros existentes na base ({monthlyFlow.length} meses apurados)
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSortAsc(!sortAsc)}
              className="rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              {sortAsc ? 'Mês: Mais Antigo Primeiro' : 'Mês: Mais Recente Primeiro'}
            </button>
            <button
              type="button"
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 shadow-2xs"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Exportar CSV</span>
            </button>
          </div>
        </div>

        {/* Tabela com scroll horizontal interno seguro */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-100 text-slate-700 font-bold uppercase tracking-wider text-[11px]">
                <th className="px-5 py-3">Mês de Apresentação</th>
                <th className="px-5 py-3 text-right">Abertura</th>
                <th className="px-5 py-3 text-right">Novas Entradas</th>
                <th className="px-5 py-3 text-right">Total Programado</th>
                <th className="px-5 py-3 text-right">Agenda Restante</th>
                <th className="px-5 py-3 text-center">Status no Calendário</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-800 font-mono tabular-nums">
              {sortedFlow.map((item) => {
                const isCurrent = item.isCurrentMonth;
                return (
                  <tr
                    key={item.mesAno}
                    className={`hover:bg-slate-50/80 transition-colors ${
                      isCurrent ? 'bg-blue-50/50 font-semibold' : ''
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
                        <span className="text-blue-700 font-semibold text-xs">
                          Em andamento
                        </span>
                      ) : item.isPastMonth ? (
                        <span className="text-slate-400 text-xs">Concluído</span>
                      ) : (
                        <span className="text-indigo-600 font-medium text-xs">Futuro</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            {/* Linha de Totais */}
            <tfoot>
              <tr className="border-t-2 border-slate-300 bg-slate-100/80 font-bold text-slate-900 font-mono tabular-nums">
                <td className="px-5 py-3 font-sans font-extrabold">TOTAL ACUMULADO</td>
                <td className="px-5 py-3 text-right text-blue-800">
                  {totals.abertura.toLocaleString('pt-BR')}
                </td>
                <td className="px-5 py-3 text-right text-emerald-800">
                  {totals.entradas.toLocaleString('pt-BR')}
                </td>
                <td className="px-5 py-3 text-right text-base text-slate-950 font-extrabold">
                  {totals.totalProgramado.toLocaleString('pt-BR')}
                </td>
                <td className="px-5 py-3 text-right text-indigo-900">
                  {totals.agendaRestante.toLocaleString('pt-BR')}
                </td>
                <td className="px-5 py-3 text-center font-sans font-medium text-slate-500 text-xs">
                  {monthlyFlow.length} meses apurados
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};
