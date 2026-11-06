/**
 * LAGOA BI — Motor de Cálculo e Auditoria Quantitativa
 * 
 * Este módulo processa os registros da planilha Google Sheets,
 * aplica a regra estrita de RESERVA NORMAL, deduplica casais por ID de reserva,
 * gera relatórios de auditoria e calcula todas as visões executivas e operacionais.
 */

import {
  RawReservationRecord,
  AuditIssue,
  AuditSummary,
  MonthlyFlowItem,
  FuturePortfolioItem,
  FuturePortfolioDistributionItem,
  FuturePortfolioView,
  ConfirmationFlowCohort,
  ConfirmationMatrix,
  OperationalAgenda,
  DailyAgendaItem,
  WeeklyAgendaItem,
  WeekdayMetric,
  DistributionMetric,
  AntecedenciaMetric,
  CommercialTeamData,
  TeamMemberMetric,
  ExecutiveSummary,
  FinancialMonthlyItem,
  FinancialDailyItem,
  FinancialSummary,
  FinancialTeamOrHotelMetric,
  FinancialRecord,
  FinancialDataset,
  RealizedReservationDailyItem,
  RealizedReservationMonthlyItem,
  RealizedReservationsSummary,
  RealizedReservationsDistributionItem,
  RealizedReservationsDataset,
  BIDataset
} from '../types/bi';

export interface InternalRecord {
  line: number;
  confDate: Date | null;
  confDateStr: string;
  confYM: string;
  confDateIso: string | null;
  consultor: string;
  sdr: string;
  reservaId: string;
  hotel: string;
  apresDate: Date | null;
  apresDateStr: string;
  apresYM: string;
  apresDateIso: string | null;
}

/**
 * Analisa o CSV bruto do Google Sheets e gera o dataset completo do LAGOA BI
 */
export function processRawSheetData(
  csvContent: string,
  sourceType: 'apps_script' | 'google_sheet_direct' = 'google_sheet_direct',
  sourceUrl?: string,
  referenceDateInput?: Date
): BIDataset {
  const rows = parseCSV(csvContent);
  if (rows.length <= 1) {
    throw new Error('A planilha retornou vazia ou apenas com cabeçalho.');
  }

  // Identificação dos índices das colunas reais:
  // A: Data da Confirmação (0)
  // B: Consultor (1)
  // C: SDR (2)
  // D: Nome do Casal (3 - ignorado/não exposto por privacidade)
  // E: Valor Pago (4 - COMPLETAMENTE DESCONSIDERADO)
  // F: Check-in (5)
  // G: Check-out (6)
  // H: Número da Reserva (7)
  // I: Hotel (8)
  // J: Tipo de Reserva (9)
  // K: Data da Apresentação (10)
  // L: Observação (11)

  const COL_CONF_DATE = 0;
  const COL_CONSULTOR = 1;
  const COL_SDR = 2;
  const COL_VALOR = 4;
  const COL_RESERVA = 7;
  const COL_HOTEL = 8;
  const COL_TIPO = 9;
  const COL_APRES_DATE = 10;

  const totalLinhas = rows.length - 1;
  let totalAdicional = 0;
  let totalOutrosTipos = 0;
  let totalReservaNormal = 0;

  const rawNormalRecords: InternalRecord[] = [];
  const financialRecords: FinancialRecord[] = [];
  const auditIssues: AuditIssue[] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const lineNum = i + 1;
    const tipo = (row[COL_TIPO] || '').trim().toUpperCase();

    // Extração Financeira Independente (RESERVA NORMAL e ADICIONAL)
    if (tipo === 'RESERVA NORMAL' || tipo === 'ADICIONAL') {
      const confDateStrFin = (row[COL_CONF_DATE] || '').trim();
      const confDateFin = parseDate(confDateStrFin);
      const confYMFibr = confDateFin ? formatYearMonth(confDateFin) : 'SEM_DATA';
      const confDateIsoFin = confDateFin ? confDateFin.toISOString().slice(0, 10) : null;
      const valorPago = parseCurrency(row[COL_VALOR]);

      financialRecords.push({
        line: lineNum,
        tipo: tipo as 'RESERVA NORMAL' | 'ADICIONAL',
        confYM: confYMFibr,
        confDateIso: confDateIsoFin,
        confDateStr: confDateStrFin,
        valor: valorPago,
        consultor: normalizeName(row[COL_CONSULTOR]),
        sdr: normalizeName(row[COL_SDR]),
        hotel: normalizeHotel(row[COL_HOTEL]),
        reservaId: (row[COL_RESERVA] || '').trim().replace(/\s+/g, ' ')
      });
    }

    // REGRA ABSOLUTA COMERCIAL: contabilizar casais somente em RESERVA NORMAL. Ignorar ADICIONAL.
    if (tipo === 'ADICIONAL') {
      totalAdicional++;
      continue;
    }

    if (tipo !== 'RESERVA NORMAL') {
      totalOutrosTipos++;
      continue;
    }

    totalReservaNormal++;

    const confDateStr = (row[COL_CONF_DATE] || '').trim();
    const apresDateStr = (row[COL_APRES_DATE] || '').trim();
    const confDate = parseDate(confDateStr);
    const apresDate = parseDate(apresDateStr);
    const reservaId = (row[COL_RESERVA] || '').trim().replace(/\s+/g, ' ');
    const hotel = normalizeHotel(row[COL_HOTEL]);
    const consultor = normalizeName(row[COL_CONSULTOR]);
    const sdr = normalizeName(row[COL_SDR]);

    // Auditoria de Datas
    if (!apresDate) {
      auditIssues.push({
        id: `SEM-APRES-${lineNum}`,
        line: lineNum,
        reserva: reservaId || 'S/N',
        tipo: 'SEM_APRESENTACAO',
        descricao: 'Reserva normal sem data de apresentação definida ou inválida.',
        dataConfirmacao: confDateStr,
        hotel,
        consultor,
        sdr
      });
    }

    if (confDate && apresDate && apresDate < confDate) {
      auditIssues.push({
        id: `INV-${lineNum}`,
        line: lineNum,
        reserva: reservaId || 'S/N',
        tipo: 'DATAS_INVERTIDAS',
        descricao: `Data de apresentação (${apresDateStr}) é anterior à confirmação (${confDateStr}).`,
        dataConfirmacao: confDateStr,
        dataApresentacao: apresDateStr,
        hotel,
        consultor,
        sdr
      });
    }

    rawNormalRecords.push({
      line: lineNum,
      confDate,
      confDateStr,
      confYM: confDate ? formatYearMonth(confDate) : 'SEM_DATA',
      confDateIso: confDate ? confDate.toISOString().slice(0, 10) : null,
      consultor,
      sdr,
      reservaId,
      hotel,
      apresDate,
      apresDateStr,
      apresYM: apresDate ? formatYearMonth(apresDate) : 'SEM_DATA',
      apresDateIso: apresDate ? apresDate.toISOString().slice(0, 10) : null
    });
  }

  // Deduplicação pelo identificador da Coluna H
  // Uma linha com múltiplos números de reserva (ex: "388045 / 388052") representa UM único casal.
  const seenReservas = new Map<string, InternalRecord>();
  const uniqueCouples: InternalRecord[] = [];
  let duplicidadesEliminadas = 0;
  let reprogramacoesSinalizadas = 0;

  for (const rec of rawNormalRecords) {
    const key = rec.reservaId ? rec.reservaId.toUpperCase() : `LINHA_${rec.line}`;
    const apresKey = rec.apresDate ? rec.apresDate.toISOString().slice(0, 10) : 'SEM_DATA';

    if (seenReservas.has(key)) {
      const existing = seenReservas.get(key)!;
      const existingApresKey = existing.apresDate ? existing.apresDate.toISOString().slice(0, 10) : 'SEM_DATA';

      if (existingApresKey === apresKey) {
        // Mesma reserva e mesma data de apresentação: duplicidade confirmada
        duplicidadesEliminadas++;
        auditIssues.push({
          id: `DUP-${rec.line}`,
          line: rec.line,
          reserva: rec.reservaId,
          tipo: 'DUPLICIDADE_ELIMINADA',
          descricao: `Reserva duplicada na linha ${rec.line} (mesma apresentação da linha ${existing.line}). Contabilizada 1 vez.`,
          dataConfirmacao: rec.confDateStr,
          dataApresentacao: rec.apresDateStr,
          hotel: rec.hotel,
          consultor: rec.consultor,
          sdr: rec.sdr
        });

        // Mantém a data de confirmação válida mais antiga
        if (rec.confDate && (!existing.confDate || rec.confDate < existing.confDate)) {
          existing.confDate = rec.confDate;
          existing.confDateStr = rec.confDateStr;
          existing.confYM = rec.confYM;
          existing.confDateIso = rec.confDateIso;
        }
      } else {
        // Mesma reserva com apresentação diferente: sinalizar possível reprogramação
        reprogramacoesSinalizadas++;
        auditIssues.push({
          id: `REP-${rec.line}`,
          line: rec.line,
          reserva: rec.reservaId,
          tipo: 'REPROGRAMACAO_POTENCIAL',
          descricao: `Possível reprogramação: reserva com apresentação em ${rec.apresDateStr} e outra na linha ${existing.line} em ${existing.apresDateStr}.`,
          dataConfirmacao: rec.confDateStr,
          dataApresentacao: rec.apresDateStr,
          hotel: rec.hotel,
          consultor: rec.consultor,
          sdr: rec.sdr
        });
        // Inclui como registro distinto para não escolher arbitrariamente
        uniqueCouples.push(rec);
      }
    } else {
      seenReservas.set(key, rec);
      uniqueCouples.push(rec);
    }
  }

  // Data de corte / consulta (padrão é hoje no horário UTC)
  const now = referenceDateInput || new Date();
  const todayUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

  const auditSummary: AuditSummary = {
    totalLinhas,
    totalAdicionalDesconsiderado: totalAdicional,
    totalOutrosTiposDesconsiderados: totalOutrosTipos,
    totalReservaNormal,
    duplicidadesEliminadas,
    reprogramacoesSinalizadas,
    pendenciasAuditadas: auditIssues.length,
    casaisValidosContabilizados: uniqueCouples.length,
    taxaConformidade: totalReservaNormal > 0 ? Number(((uniqueCouples.length / totalReservaNormal) * 100).toFixed(1)) : 100,
    listaPendencias: auditIssues
  };

  const monthlyFlow = calculateMonthlyFlow(uniqueCouples, todayUtc);
  const futurePortfolio = calculateFuturePortfolio(uniqueCouples, todayUtc);
  const confirmationFlow = calculateConfirmationFlow(uniqueCouples);
  const confirmationMatrix = calculateConfirmationMatrix(uniqueCouples);
  const operationalAgenda = calculateOperationalAgenda(uniqueCouples, todayUtc);
  const teamData = calculateCommercialTeam(uniqueCouples);

  // Lista de meses disponíveis para filtro
  const allMonthsSet = new Set<string>();
  monthlyFlow.forEach(m => allMonthsSet.add(m.mesAno));
  futurePortfolio.history.forEach(m => allMonthsSet.add(m.mesAno));

  const sortedMonths = Array.from(allMonthsSet).sort().reverse();
  const availableMonths = sortedMonths.map(ym => ({
    value: ym,
    label: formatMonthLabel(ym)
  }));

  // Hotéis, Consultores e SDRs para filtros
  const hotels = Array.from(new Set(uniqueCouples.map(c => c.hotel))).filter(Boolean).sort();
  const consultores = Array.from(new Set(uniqueCouples.map(c => c.consultor))).filter(Boolean).sort();
  const sdrs = Array.from(new Set(uniqueCouples.map(c => c.sdr))).filter(Boolean).sort();

  // Mês de referência para o resumo executivo: o mês atual se houver, ou o último com movimentação
  const currentYM = formatYearMonth(todayUtc);
  const targetSummaryYM = allMonthsSet.has(currentYM) ? currentYM : (sortedMonths[0] || currentYM);
  const executiveSummary = calculateExecutiveSummary(uniqueCouples, monthlyFlow, futurePortfolio, auditSummary, targetSummaryYM, todayUtc);

  // Registros limpos serializados para filtros dinâmicos rápidos no front
  const lightRecords = uniqueCouples.map(c => ({
    line: c.line,
    confYM: c.confYM,
    confDateStr: c.confDateStr,
    confDateIso: c.confDateIso,
    apresYM: c.apresYM,
    apresDateStr: c.apresDateStr,
    apresDateIso: c.apresDateIso,
    hotel: c.hotel,
    consultor: c.consultor,
    sdr: c.sdr,
    reservaId: c.reservaId
  }));

  const financialData = calculateFinancialMetrics(financialRecords, todayUtc, targetSummaryYM);
  const realizedReservations = calculateRealizedReservations(uniqueCouples, todayUtc, targetSummaryYM);

  return {
    success: true,
    timestamp: now.toISOString(),
    sourceType,
    sourceUrl,
    currentDate: todayUtc.toISOString().slice(0, 10),
    audit: auditSummary,
    monthlyFlow,
    futurePortfolio,
    confirmationFlow,
    confirmationMatrix,
    operationalAgenda,
    teamData,
    executiveSummary,
    financialData,
    realizedReservations,
    availableFilters: {
      months: availableMonths,
      hotels,
      consultores,
      sdrs
    },
    records: lightRecords
  };
}

/**
 * Filtra dinamicamente o dataset no navegador mantendo as regras estritas de BI
 */
export function filterDataset(
  dataset: BIDataset,
  filters: { mesAno: string; hotel: string; consultor: string; sdr: string }
): BIDataset {
  if (
    filters.mesAno === 'all' &&
    filters.hotel === 'all' &&
    filters.consultor === 'all' &&
    filters.sdr === 'all'
  ) {
    return dataset;
  }

  if (!dataset.records) return dataset;

  const filteredRaw = dataset.records.filter(r => {
    if (filters.mesAno !== 'all') {
      if (r.apresYM !== filters.mesAno && r.confYM !== filters.mesAno) return false;
    }
    if (filters.hotel !== 'all' && r.hotel !== filters.hotel) return false;
    if (filters.consultor !== 'all' && r.consultor !== filters.consultor) return false;
    if (filters.sdr !== 'all' && r.sdr !== filters.sdr) return false;
    return true;
  });

  const reconstructedCouples: InternalRecord[] = filteredRaw.map(r => ({
    line: r.line,
    confDate: r.confDateIso ? new Date(r.confDateIso + 'T00:00:00Z') : null,
    confDateStr: (r as any).confDateStr || (r.confDateIso ? r.confDateIso.split('-').reverse().join('/') : ''),
    confYM: r.confYM,
    confDateIso: r.confDateIso,
    consultor: r.consultor,
    sdr: r.sdr,
    reservaId: r.reservaId,
    hotel: r.hotel,
    apresDate: r.apresDateIso ? new Date(r.apresDateIso + 'T00:00:00Z') : null,
    apresDateStr: (r as any).apresDateStr || (r.apresDateIso ? r.apresDateIso.split('-').reverse().join('/') : ''),
    apresYM: r.apresYM,
    apresDateIso: r.apresDateIso
  }));

  const refDate = new Date(dataset.currentDate + 'T00:00:00Z');
  const monthlyFlow = calculateMonthlyFlow(reconstructedCouples, refDate);
  const futurePortfolio = calculateFuturePortfolio(reconstructedCouples, refDate);
  const confirmationFlow = calculateConfirmationFlow(reconstructedCouples);
  const confirmationMatrix = calculateConfirmationMatrix(reconstructedCouples);
  const operationalAgenda = calculateOperationalAgenda(reconstructedCouples, refDate);
  const teamData = calculateCommercialTeam(reconstructedCouples);

  const targetSummaryYM = filters.mesAno !== 'all' ? filters.mesAno : dataset.executiveSummary.mesReferencia;
  const executiveSummary = calculateExecutiveSummary(
    reconstructedCouples,
    monthlyFlow,
    futurePortfolio,
    dataset.audit,
    targetSummaryYM,
    refDate
  );

  // Filtro Dinâmico dos Indicadores Financeiros
  let financialData = dataset.financialData;
  if (dataset.financialData && dataset.financialData.records) {
    const recordsByDimension = dataset.financialData.records.filter(r => {
      if (filters.hotel !== 'all' && r.hotel !== filters.hotel) return false;
      if (filters.consultor !== 'all' && r.consultor !== filters.consultor) return false;
      if (filters.sdr !== 'all' && r.sdr !== filters.sdr) return false;
      return true;
    });

    const recordsExact = filters.mesAno !== 'all'
      ? recordsByDimension.filter(r => r.confYM === filters.mesAno)
      : recordsByDimension;

    const targetFinYM = filters.mesAno !== 'all'
      ? filters.mesAno
      : dataset.financialData.summary.mesReferencia;

    const calculatedFin = calculateFinancialMetrics(
      recordsExact,
      refDate,
      targetFinYM,
      recordsByDimension
    );

    financialData = {
      ...calculatedFin,
      records: dataset.financialData.records
    };
  }

  const targetRealizedYM = filters.mesAno !== 'all' ? filters.mesAno : dataset.executiveSummary.mesReferencia;
  const realizedReservations = calculateRealizedReservations(
    reconstructedCouples,
    refDate,
    targetRealizedYM,
    (dataset as any)._allCouples || reconstructedCouples
  );

  return {
    ...dataset,
    monthlyFlow,
    futurePortfolio,
    confirmationFlow,
    confirmationMatrix,
    operationalAgenda,
    teamData,
    executiveSummary,
    financialData,
    realizedReservations,
    audit: {
      ...dataset.audit,
      casaisValidosContabilizados: reconstructedCouples.length
    }
  };
}

/**
 * Cálculo do Fluxo Mensal
 * Mês | Abertura | Novas Entradas | Total Programado | Agenda Restante
 */
export function calculateMonthlyFlow(couples: InternalRecord[], refDate: Date): MonthlyFlowItem[] {
  const monthsMap = new Map<string, {
    abertura: number;
    entradas: number;
    totalProgramado: number;
    vencidas: number;
    agendaRestante: number;
  }>();

  const currentYM = formatYearMonth(refDate);

  for (const c of couples) {
    if (!c.apresDate) continue;
    const mesApres = c.apresYM;
    if (mesApres === 'SEM_DATA') continue;

    if (!monthsMap.has(mesApres)) {
      monthsMap.set(mesApres, {
        abertura: 0,
        entradas: 0,
        totalProgramado: 0,
        vencidas: 0,
        agendaRestante: 0
      });
    }

    const item = monthsMap.get(mesApres)!;
    item.totalProgramado++;

    // Primeiro dia do mês da apresentação (UTC)
    const [aY, aM] = mesApres.split('-').map(Number);
    const startOfMonth = new Date(Date.UTC(aY, aM - 1, 1));

    // Abertura: confirmado antes do primeiro dia do mês M, apresentação em M
    if (c.confDate && c.confDate < startOfMonth) {
      item.abertura++;
    } else if (c.confYM === mesApres) {
      // Entradas: confirmado durante M com apresentação em M
      item.entradas++;
    } else {
      // Casos sem confirmação válida mas agendados
      item.abertura++;
    }

    // Status vencido vs restante em relação à data de consulta
    if (c.apresDate < refDate) {
      item.vencidas++;
    } else {
      item.agendaRestante++;
    }
  }

  const sortedMonths = Array.from(monthsMap.keys()).sort();

  return sortedMonths.map(ym => {
    const data = monthsMap.get(ym)!;
    const isPast = ym < currentYM;
    const isFuture = ym > currentYM;
    const isCurrent = ym === currentYM;

    let restante = data.agendaRestante;
    let vencidas = data.vencidas;

    if (isPast) {
      restante = 0; // No passado, datas já expiraram
      vencidas = data.totalProgramado;
    } else if (isFuture) {
      restante = data.totalProgramado; // No futuro, todas as apresentações estão a realizar
      vencidas = 0;
    }

    return {
      mesAno: ym,
      label: formatMonthLabel(ym),
      abertura: data.abertura,
      entradas: data.entradas,
      totalProgramado: data.totalProgramado,
      vencidas,
      agendaRestante: restante,
      isCurrentMonth: isCurrent,
      isPastMonth: isPast,
      isFutureMonth: isFuture
    };
  });
}

/**
 * Cálculo da Carteira Geral Futura
 */
export function calculateFuturePortfolio(couples: InternalRecord[], refDate: Date): FuturePortfolioView {
  const currentYM = formatYearMonth(refDate);
  const monthsSet = new Set<string>();

  for (const c of couples) {
    if (c.confYM && c.confYM !== 'SEM_DATA') monthsSet.add(c.confYM);
    if (c.apresYM && c.apresYM !== 'SEM_DATA') monthsSet.add(c.apresYM);
  }

  const sortedMonths = Array.from(monthsSet).sort();
  const portfolioHistory: FuturePortfolioItem[] = [];

  for (const ym of sortedMonths) {
    const [y, m] = ym.split('-').map(Number);
    const startOfPeriod = new Date(Date.UTC(y, m - 1, 1));
    const endOfPeriod = new Date(Date.UTC(y, m, 0, 23, 59, 59));

    let carteiraInicial = 0;
    let novasEntradas = 0;
    let saidasProgramadas = 0;

    for (const c of couples) {
      if (!c.apresDate) continue;

      // Carteira Inicial: confirmados antes do início do mês com apresentação nesse mês ou posterior
      if (c.confDate && c.confDate < startOfPeriod && c.apresDate >= startOfPeriod) {
        carteiraInicial++;
      }

      // Novas Entradas: reservas confirmadas no período com apresentação válida ainda futura na data de confirmação
      if (c.confDate && c.confDate >= startOfPeriod && c.confDate <= endOfPeriod && c.apresDate >= c.confDate) {
        novasEntradas++;
      }

      // Saídas Programadas: apresentações cuja data ocorreu durante o período
      if (ym === currentYM) {
        // No mês corrente, calcular somente até a data de consulta
        if (c.apresDate >= startOfPeriod && c.apresDate < refDate) {
          saidasProgramadas++;
        }
      } else if (ym < currentYM) {
        if (c.apresDate >= startOfPeriod && c.apresDate <= endOfPeriod) {
          saidasProgramadas++;
        }
      } else {
        // Meses futuros: saídas totais programadas no mês
        if (c.apresDate >= startOfPeriod && c.apresDate <= endOfPeriod) {
          saidasProgramadas++;
        }
      }
    }

    portfolioHistory.push({
      mesAno: ym,
      label: formatMonthLabel(ym),
      carteiraInicial,
      novasEntradas,
      saidasProgramadas,
      saldo: carteiraInicial + novasEntradas - saidasProgramadas,
      isCurrentMonth: ym === currentYM
    });
  }

  // Distribuição da Carteira Geral Futura por mês de apresentação (apresentações a partir de refDate)
  const futureMap = new Map<string, number>();
  let totalFuturo = 0;

  for (const c of couples) {
    if (c.apresDate && c.apresDate >= refDate) {
      const ym = c.apresYM;
      futureMap.set(ym, (futureMap.get(ym) || 0) + 1);
      totalFuturo++;
    }
  }

  const futureDistribution: FuturePortfolioDistributionItem[] = Array.from(futureMap.keys())
    .sort()
    .map(ym => {
      const q = futureMap.get(ym)!;
      return {
        mesAno: ym,
        label: formatMonthLabel(ym),
        quantidade: q,
        percentual: totalFuturo > 0 ? Number(((q / totalFuturo) * 100).toFixed(1)) : 0
      };
    });

  const currentMonthHistory = portfolioHistory.find(h => h.mesAno === currentYM);
  const saldoAtual = currentMonthHistory ? currentMonthHistory.saldo : totalFuturo;

  return {
    history: portfolioHistory,
    futureDistribution,
    totalCarteiraFuturaAtual: totalFuturo,
    saldoAtualReferencia: saldoAtual,
    dataReferencia: refDate.toISOString().slice(0, 10)
  };
}

/**
 * Fluxo de Confirmações (M+0, M+1, M+2, M+3+)
 */
export function calculateConfirmationFlow(couples: InternalRecord[]): ConfirmationFlowCohort[] {
  const confMap = new Map<string, {
    total: number;
    m0: number;
    m1: number;
    m2: number;
    m3Plus: number;
    inconsistente: number;
  }>();

  for (const c of couples) {
    const confYM = c.confYM;
    if (!confMap.has(confYM)) {
      confMap.set(confYM, {
        total: 0,
        m0: 0,
        m1: 0,
        m2: 0,
        m3Plus: 0,
        inconsistente: 0
      });
    }

    const item = confMap.get(confYM)!;
    item.total++;

    if (!c.confDate || !c.apresDate) {
      item.inconsistente++;
      continue;
    }

    const cY = c.confDate.getUTCFullYear();
    const cM = c.confDate.getUTCMonth();
    const aY = c.apresDate.getUTCFullYear();
    const aM = c.apresDate.getUTCMonth();

    const monthDiff = (aY - cY) * 12 + (aM - cM);

    if (monthDiff === 0) item.m0++;
    else if (monthDiff === 1) item.m1++;
    else if (monthDiff === 2) item.m2++;
    else if (monthDiff >= 3) item.m3Plus++;
    else item.inconsistente++;
  }

  const sortedKeys = Array.from(confMap.keys()).sort();

  return sortedKeys.map(ym => {
    const d = confMap.get(ym)!;
    const total = d.total || 1;
    return {
      mesConfirmacao: ym,
      label: ym !== 'SEM_DATA' ? formatMonthLabel(ym) : 'Sem Data de Confirmação',
      totalConfirmados: d.total,
      m0: d.m0,
      m0Pct: Number(((d.m0 / total) * 100).toFixed(1)),
      m1: d.m1,
      m1Pct: Number(((d.m1 / total) * 100).toFixed(1)),
      m2: d.m2,
      m2Pct: Number(((d.m2 / total) * 100).toFixed(1)),
      m3Plus: d.m3Plus,
      m3PlusPct: Number(((d.m3Plus / total) * 100).toFixed(1)),
      inconsistente: d.inconsistente,
      inconsistentePct: Number(((d.inconsistente / total) * 100).toFixed(1))
    };
  });
}

/**
 * Matriz Cruzada: Mês da Confirmação × Mês da Apresentação
 */
export function calculateConfirmationMatrix(couples: InternalRecord[]): ConfirmationMatrix {
  const confMonthsSet = new Set<string>();
  const apresMonthsSet = new Set<string>();
  const matrix: Record<string, Record<string, number>> = {};
  const totalsByConf: Record<string, number> = {};
  const totalsByApres: Record<string, number> = {};
  let grandTotal = 0;

  for (const c of couples) {
    if (!c.confYM || !c.apresYM || c.confYM === 'SEM_DATA' || c.apresYM === 'SEM_DATA') continue;

    confMonthsSet.add(c.confYM);
    apresMonthsSet.add(c.apresYM);

    if (!matrix[c.confYM]) matrix[c.confYM] = {};
    matrix[c.confYM][c.apresYM] = (matrix[c.confYM][c.apresYM] || 0) + 1;

    totalsByConf[c.confYM] = (totalsByConf[c.confYM] || 0) + 1;
    totalsByApres[c.apresYM] = (totalsByApres[c.apresYM] || 0) + 1;
    grandTotal++;
  }

  return {
    confMonths: Array.from(confMonthsSet).sort(),
    apresMonths: Array.from(apresMonthsSet).sort(),
    matrix,
    totalsByConf,
    totalsByApres,
    grandTotal
  };
}

/**
 * Análise Operacional e Agenda
 */
export function calculateOperationalAgenda(couples: InternalRecord[], refDate: Date): OperationalAgenda {
  const dailyMap: Record<string, number> = {};
  const dailyDetailMap = new Map<string, {
    dataStr: string;
    diaSemana: string;
    quantidade: number;
    hoteis: Record<string, number>;
  }>();

  const hotelMap: Record<string, number> = {};
  const sdrMap: Record<string, number> = {};
  const consultorMap: Record<string, number> = {};
  const weekdayMap: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
  const antecedenciaFaixas: Record<string, number> = {
    '0 a 7 dias': 0,
    '8 a 15 dias': 0,
    '16 a 30 dias': 0,
    '31 a 60 dias': 0,
    '60+ dias': 0
  };

  const weekdayNames = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
  const refDateIso = refDate.toISOString().slice(0, 10);

  for (const c of couples) {
    if (c.hotel) hotelMap[c.hotel] = (hotelMap[c.hotel] || 0) + 1;
    if (c.sdr) sdrMap[c.sdr] = (sdrMap[c.sdr] || 0) + 1;
    if (c.consultor) consultorMap[c.consultor] = (consultorMap[c.consultor] || 0) + 1;

    if (c.apresDate && c.apresDateIso) {
      const iso = c.apresDateIso;
      dailyMap[iso] = (dailyMap[iso] || 0) + 1;

      if (!dailyDetailMap.has(iso)) {
        const dayOfWeekIndex = c.apresDate.getUTCDay();
        dailyDetailMap.set(iso, {
          dataStr: c.apresDateStr,
          diaSemana: weekdayNames[dayOfWeekIndex],
          quantidade: 0,
          hoteis: {}
        });
      }

      const dayDetail = dailyDetailMap.get(iso)!;
      dayDetail.quantidade++;
      dayDetail.hoteis[c.hotel] = (dayDetail.hoteis[c.hotel] || 0) + 1;

      const dayOfWeek = c.apresDate.getUTCDay();
      weekdayMap[dayOfWeek] = (weekdayMap[dayOfWeek] || 0) + 1;

      if (c.confDate) {
        const diffMs = c.apresDate.getTime() - c.confDate.getTime();
        const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
        if (diffDays >= 0 && diffDays <= 7) antecedenciaFaixas['0 a 7 dias']++;
        else if (diffDays <= 15) antecedenciaFaixas['8 a 15 dias']++;
        else if (diffDays <= 30) antecedenciaFaixas['16 a 30 dias']++;
        else if (diffDays <= 60) antecedenciaFaixas['31 a 60 dias']++;
        else if (diffDays > 60) antecedenciaFaixas['60+ dias']++;
      }
    }
  }

  const total = couples.length || 1;

  // Lista diária ordenada
  const dailyList: DailyAgendaItem[] = Array.from(dailyDetailMap.keys())
    .sort()
    .map(iso => {
      const item = dailyDetailMap.get(iso)!;
      return {
        data: iso,
        dataStr: item.dataStr,
        diaSemana: item.diaSemana,
        quantidade: item.quantidade,
        isPast: iso < refDateIso,
        isToday: iso === refDateIso,
        hoteis: item.hoteis
      };
    });

  // Agrupamento semanal (próximas semanas futuras)
  const weeklyMap = new Map<string, { label: string; quantidade: number; hoteis: Record<string, number> }>();
  for (const d of dailyList) {
    if (d.data >= refDateIso) {
      const dateObj = new Date(d.data + 'T00:00:00Z');
      const weekNumber = getWeekNumber(dateObj);
      const weekKey = `${dateObj.getUTCFullYear()}-W${String(weekNumber).padStart(2, '0')}`;
      if (!weeklyMap.has(weekKey)) {
        weeklyMap.set(weekKey, {
          label: `Semana ${weekNumber}/${dateObj.getUTCFullYear()}`,
          quantidade: 0,
          hoteis: {}
        });
      }
      const w = weeklyMap.get(weekKey)!;
      w.quantidade += d.quantidade;
      for (const [h, count] of Object.entries(d.hoteis)) {
        w.hoteis[h] = (w.hoteis[h] || 0) + count;
      }
    }
  }

  const weeklyList: WeeklyAgendaItem[] = Array.from(weeklyMap.keys())
    .sort()
    .slice(0, 16)
    .map(key => {
      const item = weeklyMap.get(key)!;
      return {
        semanaKey: key,
        label: item.label,
        quantidade: item.quantidade,
        hoteis: item.hoteis
      };
    });

  const weekdayDistribution: WeekdayMetric[] = [1, 2, 3, 4, 5, 6, 0].map(dayIndex => {
    const count = weekdayMap[dayIndex] || 0;
    return {
      diaIndex: dayIndex,
      diaSemana: weekdayNames[dayIndex],
      quantidade: count,
      percentual: Number(((count / total) * 100).toFixed(1))
    };
  });

  const hotelDistribution: DistributionMetric[] = Object.keys(hotelMap)
    .map(h => ({
      label: h,
      quantidade: hotelMap[h],
      percentual: Number(((hotelMap[h] / total) * 100).toFixed(1))
    }))
    .sort((a, b) => b.quantidade - a.quantidade);

  const sdrDistribution: DistributionMetric[] = Object.keys(sdrMap)
    .map(s => ({
      label: s,
      quantidade: sdrMap[s],
      percentual: Number(((sdrMap[s] / total) * 100).toFixed(1))
    }))
    .sort((a, b) => b.quantidade - a.quantidade);

  const consultorDistribution: DistributionMetric[] = Object.keys(consultorMap)
    .map(co => ({
      label: co,
      quantidade: consultorMap[co],
      percentual: Number(((consultorMap[co] / total) * 100).toFixed(1))
    }))
    .sort((a, b) => b.quantidade - a.quantidade);

  const antecedenciaDistribution: AntecedenciaMetric[] = Object.keys(antecedenciaFaixas).map(faixa => ({
    faixa,
    quantidade: antecedenciaFaixas[faixa],
    percentual: Number(((antecedenciaFaixas[faixa] / total) * 100).toFixed(1))
  }));

  return {
    dailyCounts: dailyMap,
    dailyList,
    weeklyList,
    weekdayDistribution,
    hotelDistribution,
    sdrDistribution,
    consultorDistribution,
    antecedenciaDistribution
  };
}

/**
 * Análise da Equipe Comercial (SDRs e Consultores)
 */
export function calculateCommercialTeam(couples: InternalRecord[]): CommercialTeamData {
  const sdrMap = new Map<string, {
    total: number;
    mesmoMes: number;
    futuro: number;
    hoteis: Record<string, number>;
    meses: Record<string, number>;
  }>();

  const consultorMap = new Map<string, {
    total: number;
    mesmoMes: number;
    futuro: number;
    hoteis: Record<string, number>;
    meses: Record<string, number>;
  }>();

  const crossMatrix: Record<string, Record<string, number>> = {};
  const sdrSet = new Set<string>();
  const consultorSet = new Set<string>();

  for (const c of couples) {
    const s = c.sdr || 'NÃO INFORMADO';
    const co = c.consultor || 'NÃO INFORMADO';

    sdrSet.add(s);
    consultorSet.add(co);

    if (!crossMatrix[s]) crossMatrix[s] = {};
    crossMatrix[s][co] = (crossMatrix[s][co] || 0) + 1;

    // SDR
    if (!sdrMap.has(s)) {
      sdrMap.set(s, { total: 0, mesmoMes: 0, futuro: 0, hoteis: {}, meses: {} });
    }
    const sdrItem = sdrMap.get(s)!;
    sdrItem.total++;
    sdrItem.hoteis[c.hotel] = (sdrItem.hoteis[c.hotel] || 0) + 1;
    if (c.apresYM) sdrItem.meses[c.apresYM] = (sdrItem.meses[c.apresYM] || 0) + 1;
    if (c.confYM === c.apresYM) sdrItem.mesmoMes++;
    else sdrItem.futuro++;

    // Consultor
    if (!consultorMap.has(co)) {
      consultorMap.set(co, { total: 0, mesmoMes: 0, futuro: 0, hoteis: {}, meses: {} });
    }
    const coItem = consultorMap.get(co)!;
    coItem.total++;
    coItem.hoteis[c.hotel] = (coItem.hoteis[c.hotel] || 0) + 1;
    if (c.apresYM) coItem.meses[c.apresYM] = (coItem.meses[c.apresYM] || 0) + 1;
    if (c.confYM === c.apresYM) coItem.mesmoMes++;
    else coItem.futuro++;
  }

  const grandTotal = couples.length || 1;

  const sdrs: TeamMemberMetric[] = Array.from(sdrMap.keys())
    .map(name => {
      const item = sdrMap.get(name)!;
      return {
        nome: name,
        totalCasais: item.total,
        percentualDoTotal: Number(((item.total / grandTotal) * 100).toFixed(1)),
        apresentacoesNoMesmoMes: item.mesmoMes,
        apresentacoesFuturas: item.futuro,
        hoteis: item.hoteis,
        distribuicaoMeses: item.meses
      };
    })
    .sort((a, b) => b.totalCasais - a.totalCasais);

  const consultores: TeamMemberMetric[] = Array.from(consultorMap.keys())
    .map(name => {
      const item = consultorMap.get(name)!;
      return {
        nome: name,
        totalCasais: item.total,
        percentualDoTotal: Number(((item.total / grandTotal) * 100).toFixed(1)),
        apresentacoesNoMesmoMes: item.mesmoMes,
        apresentacoesFuturas: item.futuro,
        hoteis: item.hoteis,
        distribuicaoMeses: item.meses
      };
    })
    .sort((a, b) => b.totalCasais - a.totalCasais);

  return {
    sdrs,
    consultores,
    crossMatrix: {
      sdrs: Array.from(sdrSet).sort(),
      consultores: Array.from(consultorSet).sort(),
      matrix: crossMatrix
    }
  };
}

/**
 * Cálculo do Resumo Executivo com comparações MoM
 */
export function calculateExecutiveSummary(
  couples: InternalRecord[],
  monthlyFlow: MonthlyFlowItem[],
  futurePortfolio: FuturePortfolioView,
  audit: AuditSummary,
  selectedYM: string,
  refDate: Date
): ExecutiveSummary {
  const currentMonthFlow = monthlyFlow.find(m => m.mesAno === selectedYM) || {
    abertura: 0,
    entradas: 0,
    totalProgramado: 0,
    vencidas: 0,
    agendaRestante: 0
  };

  // Mês anterior
  const [y, m] = selectedYM.split('-').map(Number);
  const prevMonthDate = new Date(Date.UTC(y, m - 2, 1));
  const prevYM = formatYearMonth(prevMonthDate);
  const prevMonthFlow = monthlyFlow.find(m => m.mesAno === prevYM);

  // Mês seguinte (M+1)
  const nextMonthDate = new Date(Date.UTC(y, m, 1));
  const nextYM = formatYearMonth(nextMonthDate);
  const nextMonthFlow = monthlyFlow.find(m => m.mesAno === nextYM);

  // Confirmações no mês selecionado
  const confirmacoesMes = couples.filter(c => c.confYM === selectedYM).length;
  const confirmacoesMesAnterior = couples.filter(c => c.confYM === prevYM).length;
  const confirmacoesDiff = confirmacoesMes - confirmacoesMesAnterior;
  const confirmacoesDiffPct = confirmacoesMesAnterior > 0 
    ? Number(((confirmacoesDiff / confirmacoesMesAnterior) * 100).toFixed(1))
    : (confirmacoesMes > 0 ? 100 : 0);

  // Agenda do mês
  const agendaMes = currentMonthFlow.totalProgramado;
  const agendaMesAnterior = prevMonthFlow ? prevMonthFlow.totalProgramado : 0;
  const agendaDiff = agendaMes - agendaMesAnterior;
  const agendaDiffPct = agendaMesAnterior > 0
    ? Number(((agendaDiff / agendaMesAnterior) * 100).toFixed(1))
    : (agendaMes > 0 ? 100 : 0);

  return {
    mesReferencia: selectedYM,
    mesReferenciaLabel: formatMonthLabel(selectedYM),
    dataConsulta: refDate.toISOString().slice(0, 10),
    confirmacoesMes,
    confirmacoesMesAnterior,
    confirmacoesDiff,
    confirmacoesDiffPct,
    agendaMes,
    agendaMesAnterior,
    agendaDiff,
    agendaDiffPct,
    aberturaMes: currentMonthFlow.abertura,
    entradasMes: currentMonthFlow.entradas,
    totalProgramadoMes: currentMonthFlow.totalProgramado,
    apresentacoesVencidasMes: currentMonthFlow.vencidas,
    agendaRestanteMes: currentMonthFlow.agendaRestante,
    carteiraGeralFutura: futurePortfolio.totalCarteiraFuturaAtual,
    programadoProximoMes: nextMonthFlow ? nextMonthFlow.totalProgramado : 0,
    programadoProximoMesLabel: formatMonthLabel(nextYM),
    totalPendenciasAuditoria: audit.pendenciasAuditadas,
    taxaConformidade: audit.taxaConformidade
  };
}

/**
 * Utilitários de Parsing e Formatação
 */
export function parseCSV(text: string): string[][] {
  const lines: string[][] = [];
  let row: string[] = [];
  let inQuotes = false;
  let current = '';

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      row.push(current.trim());
      current = '';
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') i++;
      row.push(current.trim());
      if (row.length > 1 || (row.length === 1 && row[0] !== '')) {
        lines.push(row);
      }
      row = [];
      current = '';
    } else {
      current += char;
    }
  }

  if (current || row.length > 0) {
    row.push(current.trim());
    lines.push(row);
  }

  return lines;
}

export function parseDate(val: string | null | undefined): Date | null {
  if (!val) return null;
  const str = String(val).trim();
  if (!str) return null;

  const parts = str.split(/[\/\-]/);
  if (parts.length !== 3) return null;

  let d: number, m: number, y: number;
  if (parts[0].length === 4) {
    y = parseInt(parts[0], 10);
    m = parseInt(parts[1], 10);
    d = parseInt(parts[2], 10);
  } else {
    d = parseInt(parts[0], 10);
    m = parseInt(parts[1], 10);
    y = parseInt(parts[2], 10);
  }

  if (isNaN(d) || isNaN(m) || isNaN(y)) return null;
  if (y < 100) y += 2000;
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;

  const date = new Date(Date.UTC(y, m - 1, d));
  return isNaN(date.getTime()) ? null : date;
}

export function formatYearMonth(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

export function formatMonthLabel(ym: string): string {
  if (!ym || !ym.includes('-')) return ym;
  const [y, mStr] = ym.split('-');
  const m = parseInt(mStr, 10);
  const nomes = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];
  return `${nomes[m - 1] || mStr}/${y}`;
}

export function normalizeName(val: string | undefined): string {
  if (!val) return 'NÃO INFORMADO';
  const clean = val.trim().toUpperCase().replace(/\s+/g, ' ');
  return clean || 'NÃO INFORMADO';
}

export function normalizeHotel(val: string | undefined): string {
  if (!val) return 'NÃO INFORMADO';
  const clean = val.trim().toUpperCase().replace(/\s+/g, ' ');
  return clean || 'NÃO INFORMADO';
}

function getWeekNumber(d: Date): number {
  const target = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dayNr = (target.getUTCDay() + 6) % 7;
  target.setUTCDate(target.getUTCDate() - dayNr + 3);
  const firstThursday = target.getTime();
  target.setUTCMonth(0, 1);
  if (target.getUTCDay() !== 4) {
    target.setUTCMonth(0, 1 + ((4 - target.getUTCDay()) + 7) % 7);
  }
  return 1 + Math.ceil((firstThursday - target.getTime()) / 604800000);
}

export function parseCurrency(val: any): number {
  if (val === undefined || val === null) return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  const str = String(val).trim();
  if (!str) return 0;

  // Remove R$, espaços, aspas
  let cleaned = str.replace(/[R$\s"']/g, '');

  if (cleaned.includes(',')) {
    // Formato brasileiro: 1.234,56 -> remove pontos de milhar, substitui vírgula por ponto
    cleaned = cleaned.replace(/\./g, '').replace(',', '.');
  } else {
    // Caso com múltiplos pontos (separador de milhar sem centavos)
    const dotCount = (cleaned.match(/\./g) || []).length;
    if (dotCount > 1) {
      cleaned = cleaned.replace(/\./g, '');
    }
  }

  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : Math.round(num * 100) / 100;
}

export function calculateFinancialMetrics(
  records: FinancialRecord[],
  refDate: Date,
  targetSummaryYM?: string,
  allHistoricalRecords?: FinancialRecord[]
): FinancialDataset {
  let totalNormal = 0;
  let totalAdicional = 0;
  let zerados = 0;
  let validos = 0;

  // Registros para a evolução mensal histórica
  const recordsForMonthly = allHistoricalRecords || records;

  const monthsMap = new Map<string, { normal: number; adicional: number }>();
  for (const r of recordsForMonthly) {
    const ym = r.confYM;
    if (ym && ym !== 'SEM_DATA') {
      if (!monthsMap.has(ym)) {
        monthsMap.set(ym, { normal: 0, adicional: 0 });
      }
      const m = monthsMap.get(ym)!;
      if (r.tipo === 'RESERVA NORMAL') m.normal += r.valor;
      else m.adicional += r.valor;
    }
  }

  const hotelMap = new Map<string, { normal: number; adicional: number }>();
  const consultorMap = new Map<string, { normal: number; adicional: number }>();
  const sdrMap = new Map<string, { normal: number; adicional: number }>();

  for (const r of records) {
    if (r.valor <= 0) {
      zerados++;
    } else {
      validos++;
    }

    if (r.tipo === 'RESERVA NORMAL') totalNormal++;
    if (r.tipo === 'ADICIONAL') totalAdicional++;

    // Hotel
    const h = r.hotel || 'NÃO INFORMADO';
    if (!hotelMap.has(h)) hotelMap.set(h, { normal: 0, adicional: 0 });
    const hItem = hotelMap.get(h)!;
    if (r.tipo === 'RESERVA NORMAL') hItem.normal += r.valor;
    else hItem.adicional += r.valor;

    // Consultor
    const c = r.consultor || 'NÃO INFORMADO';
    if (!consultorMap.has(c)) consultorMap.set(c, { normal: 0, adicional: 0 });
    const cItem = consultorMap.get(c)!;
    if (r.tipo === 'RESERVA NORMAL') cItem.normal += r.valor;
    else cItem.adicional += r.valor;

    // SDR
    const s = r.sdr || 'NÃO INFORMADO';
    if (!sdrMap.has(s)) sdrMap.set(s, { normal: 0, adicional: 0 });
    const sItem = sdrMap.get(s)!;
    if (r.tipo === 'RESERVA NORMAL') sItem.normal += r.valor;
    else sItem.adicional += r.valor;
  }

  // Ordena meses cronologicamente (antigo para recente) para gráficos e MoM
  const sortedYMs = Array.from(monthsMap.keys()).sort();
  const currentYM = formatYearMonth(refDate);

  const monthlyFlow: FinancialMonthlyItem[] = [];
  let prevTotal: number | null = null;

  for (const ym of sortedYMs) {
    const data = monthsMap.get(ym)!;
    const vNormal = Math.round(data.normal * 100) / 100;
    const vAdicional = Math.round(data.adicional * 100) / 100;
    const vTotal = Math.round((vNormal + vAdicional) * 100) / 100;
    const pctAdicional = vTotal > 0 ? Math.round(((vAdicional / vTotal) * 100) * 10) / 10 : 0;
    const variacaoMensalPct = prevTotal !== null && prevTotal > 0 
      ? Math.round((((vTotal - prevTotal) / prevTotal) * 100) * 10) / 10 
      : null;

    monthlyFlow.push({
      mesAno: ym,
      label: formatMonthLabel(ym),
      valorNormal: vNormal,
      valorAdicional: vAdicional,
      valorTotal: vTotal,
      percentualAdicional: pctAdicional,
      variacaoMensalPct,
      isCurrentMonth: ym === currentYM
    });

    prevTotal = vTotal;
  }

  // Mês de referência do sumário
  let summaryItem: FinancialMonthlyItem | undefined;
  if (targetSummaryYM && targetSummaryYM !== 'all') {
    summaryItem = monthlyFlow.find(m => m.mesAno === targetSummaryYM);
  }
  if (!summaryItem) {
    summaryItem = monthlyFlow.find(m => m.mesAno === currentYM) || monthlyFlow[monthlyFlow.length - 1];
  }

  const mesReferencia = summaryItem?.mesAno || currentYM;
  const mesReferenciaLabel = summaryItem?.label || formatMonthLabel(currentYM);
  const valorTotalMes = summaryItem?.valorTotal || 0;
  const valorNormalMes = summaryItem?.valorNormal || 0;
  const valorAdicionalMes = summaryItem?.valorAdicional || 0;
  const participacaoAdicionalMes = summaryItem?.percentualAdicional || 0;

  // Comparação com mês anterior (MoM)
  const summaryIndex = summaryItem ? monthlyFlow.indexOf(summaryItem) : -1;
  const prevMonthItem = summaryIndex > 0 ? monthlyFlow[summaryIndex - 1] : null;
  const valorTotalMesAnterior = prevMonthItem?.valorTotal || 0;
  const variacaoMesAnteriorDiff = Math.round((valorTotalMes - valorTotalMesAnterior) * 100) / 100;
  const variacaoMesAnteriorPct = valorTotalMesAnterior > 0 
    ? Math.round((((valorTotalMes - valorTotalMesAnterior) / valorTotalMesAnterior) * 100) * 10) / 10 
    : 0;

  // Acumulado do Ano (Ano do mês de referência)
  const [anoRef] = mesReferencia.split('-');
  const anoPrefix = `${anoRef}-`;
  const acumuladoAno = Math.round(
    monthlyFlow
      .filter(m => m.mesAno.startsWith(anoPrefix))
      .reduce((acc, m) => acc + m.valorTotal, 0) * 100
  ) / 100;
  const acumuladoAnoLabel = `Acumulado ${anoRef}`;

  // Evolução Diária no mês de referência
  const dailyMap = new Map<string, { normal: number; adicional: number; dataStr: string }>();
  for (const r of records) {
    if (r.confYM === mesReferencia && r.confDateIso) {
      if (!dailyMap.has(r.confDateIso)) {
        dailyMap.set(r.confDateIso, { normal: 0, adicional: 0, dataStr: r.confDateStr });
      }
      const d = dailyMap.get(r.confDateIso)!;
      if (r.tipo === 'RESERVA NORMAL') d.normal += r.valor;
      else d.adicional += r.valor;
    }
  }

  const diasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const dailyFlow: FinancialDailyItem[] = Array.from(dailyMap.keys()).sort().map(iso => {
    const dData = dailyMap.get(iso)!;
    const vNorm = Math.round(dData.normal * 100) / 100;
    const vAdic = Math.round(dData.adicional * 100) / 100;
    const vTot = Math.round((vNorm + vAdic) * 100) / 100;
    const dateObj = new Date(iso + 'T00:00:00Z');
    const diaSemana = diasSemana[dateObj.getUTCDay()] || '';
    return {
      dataIso: iso,
      dataStr: dData.dataStr,
      diaSemana,
      valorNormal: vNorm,
      valorAdicional: vAdic,
      valorTotal: vTot
    };
  });

  // Agregações por Hotel, Consultor e SDR
  const totalGeral = records.reduce((acc, r) => acc + r.valor, 0);

  const porHotel: FinancialTeamOrHotelMetric[] = Array.from(hotelMap.entries())
    .map(([nome, vals]) => {
      const vNorm = Math.round(vals.normal * 100) / 100;
      const vAdic = Math.round(vals.adicional * 100) / 100;
      const vTot = Math.round((vNorm + vAdic) * 100) / 100;
      const pct = totalGeral > 0 ? Math.round(((vTot / totalGeral) * 100) * 10) / 10 : 0;
      return { nome, valorNormal: vNorm, valorAdicional: vAdic, valorTotal: vTot, percentual: pct };
    })
    .sort((a, b) => b.valorTotal - a.valorTotal);

  const porConsultor: FinancialTeamOrHotelMetric[] = Array.from(consultorMap.entries())
    .map(([nome, vals]) => {
      const vNorm = Math.round(vals.normal * 100) / 100;
      const vAdic = Math.round(vals.adicional * 100) / 100;
      const vTot = Math.round((vNorm + vAdic) * 100) / 100;
      const pct = totalGeral > 0 ? Math.round(((vTot / totalGeral) * 100) * 10) / 10 : 0;
      return { nome, valorNormal: vNorm, valorAdicional: vAdic, valorTotal: vTot, percentual: pct };
    })
    .sort((a, b) => b.valorTotal - a.valorTotal);

  const porSdr: FinancialTeamOrHotelMetric[] = Array.from(sdrMap.entries())
    .map(([nome, vals]) => {
      const vNorm = Math.round(vals.normal * 100) / 100;
      const vAdic = Math.round(vals.adicional * 100) / 100;
      const vTot = Math.round((vNorm + vAdic) * 100) / 100;
      const pct = totalGeral > 0 ? Math.round(((vTot / totalGeral) * 100) * 10) / 10 : 0;
      return { nome, valorNormal: vNorm, valorAdicional: vAdic, valorTotal: vTot, percentual: pct };
    })
    .sort((a, b) => b.valorTotal - a.valorTotal);

  return {
    summary: {
      mesReferencia,
      mesReferenciaLabel,
      dataConsulta: refDate.toISOString().slice(0, 10),
      valorTotalMes,
      valorNormalMes,
      valorAdicionalMes,
      participacaoAdicionalMes,
      valorTotalMesAnterior,
      variacaoMesAnteriorDiff,
      variacaoMesAnteriorPct,
      acumuladoAno,
      acumuladoAnoLabel
    },
    monthlyFlow,
    dailyFlow,
    porHotel,
    porConsultor,
    porSdr,
    auditFinanceiro: {
      totalRegistrosAnalisados: records.length,
      totalNormal,
      totalAdicional,
      registrosZeradosOuVazios: zerados,
      registrosValidos: validos
    },
    records
  };
}

/**
 * LAGOA BI — Motor de Cálculo Exclusivo para Reservas Realizadas
 * 
 * Regra Principal: Contabiliza exclusivamente registros RESERVA NORMAL (já filtrados e deduplicados por ID).
 * Referência Temporal: Coluna A (Data da Confirmação) define o dia e o mês da realização da venda.
 * Estritamente quantitativo (sem valores em R$).
 */
export function calculateRealizedReservations(
  couples: InternalRecord[],
  refDate: Date,
  targetSummaryYM?: string,
  allHistoricalCouples?: InternalRecord[]
): RealizedReservationsDataset {
  const currentYM = formatYearMonth(refDate);
  const todayIso = refDate.toISOString().slice(0, 10);

  // Início da semana atual (Segunda-feira)
  const dayOfWeek = refDate.getUTCDay(); // 0 = Domingo, 1 = Segunda, etc.
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const mondayUtc = new Date(refDate);
  mondayUtc.setUTCDate(refDate.getUTCDate() + diffToMonday);
  mondayUtc.setUTCHours(0, 0, 0, 0);

  // Registros para a evolução mensal (se passado conjunto histórico para comparação contínua)
  const recordsForMonthly = allHistoricalCouples || couples;

  // 1. Agrupamento Mensal
  const monthsMap = new Map<string, number>();
  for (const c of recordsForMonthly) {
    const ym = c.confYM;
    if (ym && ym !== 'SEM_DATA') {
      monthsMap.set(ym, (monthsMap.get(ym) || 0) + 1);
    }
  }

  const sortedYMs = Array.from(monthsMap.keys()).sort();
  const monthlyFlow: RealizedReservationMonthlyItem[] = [];
  let prevCount: number | null = null;

  for (const ym of sortedYMs) {
    const count = monthsMap.get(ym)!;
    const [yStr, mStr] = ym.split('-');
    const yNum = parseInt(yStr, 10);
    const mNum = parseInt(mStr, 10);

    // Dias decorridos para média diária
    let diasDivisor: number;
    if (ym === currentYM) {
      diasDivisor = Math.max(refDate.getUTCDate(), 1);
    } else {
      // Total de dias no mês
      diasDivisor = new Date(Date.UTC(yNum, mNum, 0)).getUTCDate();
    }

    const mediaDiaria = Math.round((count / diasDivisor) * 10) / 10;
    const variacaoPct = prevCount !== null && prevCount > 0
      ? Math.round((((count - prevCount) / prevCount) * 100) * 10) / 10
      : null;

    monthlyFlow.push({
      mesAno: ym,
      label: formatMonthLabel(ym),
      quantidade: count,
      mediaDiaria,
      mesAnterior: prevCount,
      variacaoPct,
      isCurrentMonth: ym === currentYM
    });

    prevCount = count;
  }

  // Identificação do mês de referência do sumário
  let summaryItem: RealizedReservationMonthlyItem | undefined;
  if (targetSummaryYM && targetSummaryYM !== 'all') {
    summaryItem = monthlyFlow.find(m => m.mesAno === targetSummaryYM);
  }
  if (!summaryItem) {
    summaryItem = monthlyFlow.find(m => m.mesAno === currentYM) || monthlyFlow[monthlyFlow.length - 1];
  }

  const mesReferencia = summaryItem?.mesAno || currentYM;
  const mesReferenciaLabel = summaryItem?.label || formatMonthLabel(currentYM);
  const totalMes = summaryItem?.quantidade || 0;

  // Comparação com mês anterior
  const summaryIndex = summaryItem ? monthlyFlow.indexOf(summaryItem) : -1;
  const prevMonthItem = summaryIndex > 0 ? monthlyFlow[summaryIndex - 1] : null;
  const mesAnterior = prevMonthItem?.quantidade || 0;
  const variacaoMoMPct = mesAnterior > 0
    ? Math.round((((totalMes - mesAnterior) / mesAnterior) * 100) * 10) / 10
    : 0;

  // Média diária do mês selecionado
  const [selYStr, selMStr] = mesReferencia.split('-');
  const selYNum = parseInt(selYStr, 10);
  const selMNum = parseInt(selMStr, 10);
  const diasMesRef = mesReferencia === currentYM
    ? Math.max(refDate.getUTCDate(), 1)
    : new Date(Date.UTC(selYNum, selMNum, 0)).getUTCDate();
  const mediaDiaria = Math.round((totalMes / diasMesRef) * 10) / 10;

  // Total Hoje & Na Semana & Acumulado até hoje
  let hoje = 0;
  let naSemana = 0;
  let acumuladoMes = 0;

  for (const c of couples) {
    if (!c.confDate || !c.confDateIso) continue;

    if (c.confDateIso === todayIso) {
      hoje++;
    }

    if (c.confDate >= mondayUtc && c.confDate <= refDate) {
      naSemana++;
    }

    if (c.confYM === mesReferencia) {
      if (mesReferencia === currentYM) {
        if (c.confDate <= refDate) {
          acumuladoMes++;
        }
      } else {
        acumuladoMes++;
      }
    }
  }

  // Total Anual (Ano do mês de referência)
  const [anoRef] = mesReferencia.split('-');
  const anoPrefix = `${anoRef}-`;
  const totalAnual = monthlyFlow
    .filter(m => m.mesAno.startsWith(anoPrefix))
    .reduce((acc, m) => acc + m.quantidade, 0);
  const totalAnualLabel = `Total Anual ${anoRef}`;

  // 2. Evolução Diária no mês de referência (com acumulado)
  const dailyCountsMap = new Map<string, { count: number; dataStr: string }>();
  for (const c of couples) {
    if (c.confYM === mesReferencia && c.confDateIso) {
      if (!dailyCountsMap.has(c.confDateIso)) {
        dailyCountsMap.set(c.confDateIso, { count: 0, dataStr: c.confDateStr });
      }
      dailyCountsMap.get(c.confDateIso)!.count++;
    }
  }

  const diasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const sortedDays = Array.from(dailyCountsMap.keys()).sort();
  let acumuladoCorrido = 0;
  const dailyFlow: RealizedReservationDailyItem[] = sortedDays.map(iso => {
    const dData = dailyCountsMap.get(iso)!;
    acumuladoCorrido += dData.count;
    const dateObj = new Date(iso + 'T00:00:00Z');
    const diaSemana = diasSemana[dateObj.getUTCDay()] || '';
    return {
      dataIso: iso,
      dataStr: dData.dataStr,
      diaSemana,
      quantidade: dData.count,
      acumulado: acumuladoCorrido
    };
  });

  // 3. Distribuições por Consultor, SDR e Hotel (no conjunto filtrado atual)
  const consultorMap = new Map<string, number>();
  const sdrMap = new Map<string, number>();
  const hotelMap = new Map<string, number>();

  for (const c of couples) {
    const consultor = c.consultor || 'NÃO INFORMADO';
    consultorMap.set(consultor, (consultorMap.get(consultor) || 0) + 1);

    const sdr = c.sdr || 'NÃO INFORMADO';
    sdrMap.set(sdr, (sdrMap.get(sdr) || 0) + 1);

    const hotel = c.hotel || 'NÃO INFORMADO';
    hotelMap.set(hotel, (hotelMap.get(hotel) || 0) + 1);
  }

  const totalCouples = couples.length;

  const porConsultor: RealizedReservationsDistributionItem[] = Array.from(consultorMap.entries())
    .map(([nome, quantidade]) => ({
      nome,
      quantidade,
      percentual: totalCouples > 0 ? Math.round(((quantidade / totalCouples) * 100) * 10) / 10 : 0
    }))
    .sort((a, b) => b.quantidade - a.quantidade);

  const porSdr: RealizedReservationsDistributionItem[] = Array.from(sdrMap.entries())
    .map(([nome, quantidade]) => ({
      nome,
      quantidade,
      percentual: totalCouples > 0 ? Math.round(((quantidade / totalCouples) * 100) * 10) / 10 : 0
    }))
    .sort((a, b) => b.quantidade - a.quantidade);

  const porHotel: RealizedReservationsDistributionItem[] = Array.from(hotelMap.entries())
    .map(([nome, quantidade]) => ({
      nome,
      quantidade,
      percentual: totalCouples > 0 ? Math.round(((quantidade / totalCouples) * 100) * 10) / 10 : 0
    }))
    .sort((a, b) => b.quantidade - a.quantidade);

  return {
    summary: {
      mesReferencia,
      mesReferenciaLabel,
      totalMes,
      hoje,
      naSemana,
      mediaDiaria,
      mesAnterior,
      variacaoMoMPct,
      acumuladoMes,
      totalAnual,
      totalAnualLabel
    },
    dailyFlow,
    monthlyFlow,
    porConsultor,
    porSdr,
    porHotel
  };
}
