import React, { useState } from 'react';
import { Calendar, Building2, Clock, Users, ArrowUpDown } from 'lucide-react';
import { BIDataset } from '../../types/bi';

interface OperationalAgendaViewProps {
  dataset: BIDataset;
}

export const OperationalAgendaView: React.FC<OperationalAgendaViewProps> = ({ dataset }) => {
  const { operationalAgenda, currentDate } = dataset;
  const {
    dailyList,
    weeklyList,
    weekdayDistribution,
    hotelDistribution,
    antecedenciaDistribution,
    consultorDistribution
  } = operationalAgenda;

  const [filterMode, setFilterMode] = useState<'future' | 'all'>('future');
  const [searchDay, setSearchDay] = useState('');

  // Filtra dias da agenda
  const filteredDays = dailyList.filter(d => {
    if (filterMode === 'future' && d.isPast) return false;
    if (searchDay && !d.dataStr.includes(searchDay) && !d.data.includes(searchDay)) return false;
    return true;
  });

  const maxWeekdayQty = Math.max(...weekdayDistribution.map(w => w.quantidade), 1);
  const maxAntecedenciaQty = Math.max(...antecedenciaDistribution.map(a => a.quantidade), 1);

  return (
    <div className="space-y-6">
      {/* Cards de Concentração Semanal e Antecedência */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Concentração por Dia da Semana */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs">
          <div className="border-b border-slate-100 pb-3 mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Concentração por Dia da Semana
              </h3>
              <p className="text-xs text-slate-500">
                Dias de apresentação com maior fluxo de casais agendados
              </p>
            </div>
            <Clock className="h-4 w-4 text-slate-400" />
          </div>

          <div className="space-y-3">
            {weekdayDistribution.map((w) => {
              const widthPct = (w.quantidade / maxWeekdayQty) * 100;
              const isWeekend = w.diaIndex === 0 || w.diaIndex === 6; // Sábado ou Domingo
              return (
                <div key={w.diaSemana} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className={`font-semibold ${isWeekend ? 'text-blue-900 font-bold' : 'text-slate-800'}`}>
                      {w.diaSemana}
                      {isWeekend && <span className="ml-1 text-[10px] text-blue-600 font-normal">(Fim de Semana)</span>}
                    </span>
                    <div className="flex items-center gap-2 font-mono tabular-nums">
                      <span className="font-bold text-slate-900">{w.quantidade.toLocaleString('pt-BR')}</span>
                      <span className="text-slate-400 text-[11px]">({w.percentual}%)</span>
                    </div>
                  </div>
                  <div className="h-2.5 w-full rounded-full bg-slate-100 overflow-hidden">
                    <div
                      style={{ width: `${widthPct}%` }}
                      className={`h-full rounded-full ${isWeekend ? 'bg-blue-600' : 'bg-slate-500'}`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Antecedência em Dias (Lead Time entre Confirmação e Apresentação) */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs">
          <div className="border-b border-slate-100 pb-3 mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Antecedência da Reserva (Lead Time)
              </h3>
              <p className="text-xs text-slate-500">
                Intervalo em dias entre a data de confirmação e a data da apresentação
              </p>
            </div>
            <ArrowUpDown className="h-4 w-4 text-slate-400" />
          </div>

          <div className="space-y-3">
            {antecedenciaDistribution.map((a) => {
              const widthPct = (a.quantidade / maxAntecedenciaQty) * 100;
              return (
                <div key={a.faixa} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-800">{a.faixa}</span>
                    <div className="flex items-center gap-2 font-mono tabular-nums">
                      <span className="font-bold text-slate-900">{a.quantidade.toLocaleString('pt-BR')}</span>
                      <span className="text-slate-400 text-[11px]">({a.percentual}%)</span>
                    </div>
                  </div>
                  <div className="h-2.5 w-full rounded-full bg-slate-100 overflow-hidden">
                    <div
                      style={{ width: `${widthPct}%` }}
                      className="h-full rounded-full bg-emerald-600"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Agenda Futura por Semana */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs">
        <div className="border-b border-slate-100 pb-3 mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Agenda Futura por Semana Operacional
            </h3>
            <p className="text-xs text-slate-500">
              Cronograma consolidado de apresentações para as próximas semanas
            </p>
          </div>
          <Calendar className="h-4 w-4 text-blue-600" />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {weeklyList.slice(0, 8).map((sem) => (
            <div key={sem.semanaKey} className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs">
              <div className="font-bold text-slate-900 mb-1">{sem.label}</div>
              <div className="text-2xl font-extrabold text-blue-900 font-mono tabular-nums my-1">
                {sem.quantidade} <span className="text-xs text-slate-500 font-sans font-normal">casais</span>
              </div>
              <div className="text-[11px] text-slate-600 space-y-0.5 mt-2 border-t border-slate-200 pt-1.5">
                {Object.entries(sem.hoteis).map(([h, q]) => (
                  <div key={h} className="flex justify-between">
                    <span className="truncate">{h}:</span>
                    <span className="font-mono font-semibold tabular-nums">{q}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Calendário Diário / Cronograma Detalhado */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-2xs overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 px-5 py-4 gap-3 bg-slate-50/50">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Cronograma Diário de Apresentações
            </h3>
            <p className="text-xs text-slate-500">
              Visualização por data com contagem de casais e divisão por hotel
            </p>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="text"
              placeholder="Filtrar data (ex: 07/11)..."
              value={searchDay}
              onChange={(e) => setSearchDay(e.target.value)}
              className="rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-blue-500 w-44"
            />
            <div className="flex items-center gap-1 p-0.5 bg-slate-200/70 rounded-md text-xs">
              <button
                type="button"
                onClick={() => setFilterMode('future')}
                className={`px-2.5 py-1 rounded font-medium transition-colors ${
                  filterMode === 'future' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                }`}
              >
                Apenas Futuras
              </button>
              <button
                type="button"
                onClick={() => setFilterMode('all')}
                className={`px-2.5 py-1 rounded font-medium transition-colors ${
                  filterMode === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                }`}
              >
                Todas as Datas
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="sticky top-0 bg-slate-100 z-10 shadow-2xs">
              <tr className="border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider text-[11px]">
                <th className="px-5 py-3">Data da Apresentação</th>
                <th className="px-5 py-3">Dia da Semana</th>
                <th className="px-5 py-3 text-right">Casais Programados</th>
                <th className="px-5 py-3">Distribuição por Hotel</th>
                <th className="px-5 py-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-800 font-mono tabular-nums">
              {filteredDays.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-slate-400 font-sans">
                    Nenhuma data de apresentação encontrada com os filtros atuais.
                  </td>
                </tr>
              ) : (
                filteredDays.map((d) => (
                  <tr
                    key={d.data}
                    className={`hover:bg-slate-50/80 transition-colors ${
                      d.isToday ? 'bg-amber-50/60 font-semibold' : ''
                    }`}
                  >
                    <td className="px-5 py-2.5 font-bold text-slate-900 flex items-center gap-2">
                      <span>{d.dataStr}</span>
                      {d.isToday && (
                        <span className="rounded bg-amber-200/80 px-1.5 py-0.5 text-[10px] font-bold text-amber-900 font-sans">
                          Hoje
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-2.5 font-sans font-medium text-slate-700">
                      {d.diaSemana}
                    </td>
                    <td className="px-5 py-2.5 text-right font-extrabold text-blue-900 text-sm">
                      {d.quantidade}
                    </td>
                    <td className="px-5 py-2.5 font-sans text-xs">
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(d.hoteis).map(([h, q]) => (
                          <span
                            key={h}
                            className="rounded bg-slate-100 px-2 py-0.5 text-[11px] text-slate-700 border border-slate-200"
                          >
                            <strong>{h}:</strong> <span className="font-mono">{q}</span>
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-5 py-2.5 text-center font-sans">
                      {d.isPast ? (
                        <span className="text-slate-400 text-[11px]">Realizada</span>
                      ) : (
                        <span className="text-emerald-700 font-semibold text-[11px]">Programada</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
