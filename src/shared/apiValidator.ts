/**
 * LAGOA BI — Validador Estrito de Resposta da API do Google Apps Script
 */

import { BIDataset } from '../types/bi';
import {
  calculateMonthlyFlow,
  calculateFuturePortfolio,
  calculateConfirmationFlow,
  calculateConfirmationMatrix,
  calculateOperationalAgenda,
  calculateCommercialTeam,
  calculateExecutiveSummary,
  parseDate,
  formatYearMonth,
  formatMonthLabel,
  normalizeHotel,
  normalizeName,
  InternalRecord
} from './biEngine';

export interface ValidationResult {
  valid: boolean;
  dataset?: BIDataset;
  missingFields?: string[];
  errorMessage?: string;
}

/**
 * Valida o JSON recebido da API do Apps Script e monta o dataset do LAGOA BI
 */
export function validateAndParseApiResponse(
  rawJson: any,
  sourceUrl: string,
  referenceDateInput?: Date
): BIDataset {
  if (!rawJson || typeof rawJson !== 'object') {
    throw new Error('A resposta da API está vazia ou não é um objeto JSON válido.');
  }

  if (rawJson.success === false) {
    throw new Error(rawJson.error || rawJson.message || 'A API do Apps Script reportou erro na execução.');
  }

  const now = referenceDateInput || new Date();
  const todayUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const todayIso = todayUtc.toISOString().slice(0, 10);

  // CASO 1: A API já retornou o payload estruturado de indicadores
  if (rawJson.monthlyFlow && typeof rawJson.monthlyFlow === 'object') {
    const missing: string[] = [];
    if (!Array.isArray(rawJson.monthlyFlow)) missing.push('monthlyFlow (deve ser lista de meses)');
    if (!rawJson.audit || typeof rawJson.audit !== 'object') missing.push('audit (resumo de auditoria)');
    if (!rawJson.futurePortfolio || typeof rawJson.futurePortfolio !== 'object') missing.push('futurePortfolio (carteira futura)');

    if (missing.length > 0) {
      throw new Error(`A API retornou informações insuficientes. Campos obrigatórios ausentes: ${missing.join(', ')}.`);
    }

    // Valida itens de monthlyFlow
    const flowItems = rawJson.monthlyFlow;
    if (flowItems.length > 0) {
      const sample = flowItems[0];
      const requiredFlowKeys = ['mesAno', 'abertura', 'entradas', 'totalProgramado', 'agendaRestante'];
      const missingFlowKeys = requiredFlowKeys.filter(k => !(k in sample));
      if (missingFlowKeys.length > 0) {
        throw new Error(`Itens do monthlyFlow incompletos na API. Propriedades ausentes: ${missingFlowKeys.join(', ')}.`);
      }
    }

    // Valida itens de futurePortfolio
    const fp = rawJson.futurePortfolio;
    if (!Array.isArray(fp.history) && !Array.isArray(fp.futureDistribution)) {
      throw new Error('A estrutura futurePortfolio retornada pela API não contém history ou futureDistribution.');
    }

    // Valida itens de audit
    const audit = rawJson.audit;
    if (typeof audit.totalReservaNormal !== 'number' && typeof audit.totalLinhas !== 'number') {
      throw new Error('O objeto audit retornado pela API não contém totalReservaNormal ou totalLinhas numéricos.');
    }

    // Se a API retornou o dataset completo calculado, monta o BIDataset completo
    const dataset: BIDataset = {
      success: true,
      timestamp: rawJson.timestamp || now.toISOString(),
      sourceType: 'apps_script',
      sourceUrl,
      currentDate: rawJson.currentDate || todayIso,
      audit: {
        totalLinhas: audit.totalLinhas || 0,
        totalAdicionalDesconsiderado: audit.totalAdicionalDesconsiderado || 0,
        totalOutrosTiposDesconsiderados: audit.totalOutrosTiposDesconsiderados || 0,
        totalReservaNormal: audit.totalReservaNormal || 0,
        duplicidadesEliminadas: audit.duplicidadesEliminadas || 0,
        reprogramacoesSinalizadas: audit.reprogramacoesSinalizadas || 0,
        pendenciasAuditadas: audit.pendenciasAuditadas || 0,
        casaisValidosContabilizados: audit.casaisValidosContabilizados || 0,
        taxaConformidade: audit.taxaConformidade || 100,
        listaPendencias: Array.isArray(audit.listaPendencias) ? audit.listaPendencias : []
      },
      monthlyFlow: rawJson.monthlyFlow,
      futurePortfolio: {
        history: Array.isArray(fp.history) ? fp.history : [],
        futureDistribution: Array.isArray(fp.futureDistribution) ? fp.futureDistribution : [],
        totalCarteiraFuturaAtual: typeof fp.totalCarteiraFuturaAtual === 'number' ? fp.totalCarteiraFuturaAtual : 0,
        saldoAtualReferencia: typeof fp.saldoAtualReferencia === 'number' ? fp.saldoAtualReferencia : 0,
        dataReferencia: fp.dataReferencia || todayIso
      },
      confirmationFlow: Array.isArray(rawJson.confirmationFlow) ? rawJson.confirmationFlow : [],
      confirmationMatrix: rawJson.confirmationMatrix && typeof rawJson.confirmationMatrix === 'object'
        ? rawJson.confirmationMatrix
        : { confMonths: [], apresMonths: [], matrix: {}, totalsByConf: {}, totalsByApres: {}, grandTotal: 0 },
      operationalAgenda: rawJson.operationalAgenda && typeof rawJson.operationalAgenda === 'object'
        ? rawJson.operationalAgenda
        : {
            dailyCounts: {},
            dailyList: [],
            weeklyList: [],
            weekdayDistribution: [],
            hotelDistribution: [],
            sdrDistribution: [],
            consultorDistribution: [],
            antecedenciaDistribution: []
          },
      teamData: rawJson.teamData && typeof rawJson.teamData === 'object'
        ? rawJson.teamData
        : { sdrs: [], consultores: [], crossMatrix: { sdrs: [], consultores: [], matrix: {} } },
      executiveSummary: rawJson.executiveSummary && typeof rawJson.executiveSummary === 'object'
        ? rawJson.executiveSummary
        : {
            mesReferencia: todayIso.slice(0, 7),
            mesReferenciaLabel: formatMonthLabel(todayIso.slice(0, 7)),
            dataConsulta: todayIso,
            confirmacoesMes: 0,
            confirmacoesMesAnterior: 0,
            confirmacoesDiff: 0,
            confirmacoesDiffPct: 0,
            agendaMes: 0,
            agendaMesAnterior: 0,
            agendaDiff: 0,
            agendaDiffPct: 0,
            aberturaMes: 0,
            entradasMes: 0,
            totalProgramadoMes: 0,
            apresentacoesVencidasMes: 0,
            agendaRestanteMes: 0,
            carteiraGeralFutura: 0,
            programadoProximoMes: 0,
            programadoProximoMesLabel: '',
            totalPendenciasAuditoria: 0,
            taxaConformidade: 100
          },
      availableFilters: rawJson.availableFilters || {
        months: (rawJson.monthlyFlow || []).map((m: any) => ({ value: m.mesAno, label: m.label })),
        hotels: [],
        consultores: [],
        sdrs: []
      },
      records: Array.isArray(rawJson.records) ? rawJson.records : []
    };

    return dataset;
  }

  // CASO 2: A API retornou registros individuais/linhas para agregação no backend
  const recordsArray = Array.isArray(rawJson) 
    ? rawJson 
    : (Array.isArray(rawJson.data) ? rawJson.data : (Array.isArray(rawJson.records) ? rawJson.records : null));

  if (recordsArray && Array.isArray(recordsArray)) {
    if (recordsArray.length === 0) {
      throw new Error('A API retornou uma lista vazia de registros.');
    }

    return processApiRecordsList(recordsArray, sourceUrl, todayUtc);
  }

  // Se o JSON não atende a nenhum formato esperado
  const availableKeys = Object.keys(rawJson).join(', ') || 'nenhuma';
  throw new Error(
    `O JSON retornado pela API não possui estrutura reconhecida. Chaves presentes: [${availableKeys}]. ` +
    `A API deve retornar ou os indicadores agregados (monthlyFlow, futurePortfolio, audit) ou a lista de registros da planilha.`
  );
}

/**
 * Processa registros brutos em JSON fornecidos pelo Apps Script
 */
function processApiRecordsList(
  records: any[],
  sourceUrl: string,
  todayUtc: Date
): BIDataset {
  // Verifica presença de colunas obrigatórias
  const sample = records[0];
  const keys = Object.keys(sample).map(k => k.toUpperCase().trim());

  const hasTipo = keys.some(k => k.includes('TIPO') || k === 'TIPORESERVA');
  const hasConf = keys.some(k => k.includes('CONFIRM') || k === 'CONFDATE' || k === 'DATACONFIRMACAO');
  const hasApres = keys.some(k => k.includes('APRESENT') || k === 'APRESDATE' || k === 'DATAAPRESENTACAO');

  const missingColumns: string[] = [];
  if (!hasTipo) missingColumns.push('Tipo de Reserva (RESERVA NORMAL / ADICIONAL)');
  if (!hasConf) missingColumns.push('Data da Confirmação');
  if (!hasApres) missingColumns.push('Data da Apresentação');

  if (missingColumns.length > 0) {
    throw new Error(`Registros da API não contêm as colunas obrigatórias: ${missingColumns.join(', ')}.`);
  }

  let totalLinhas = records.length;
  let totalAdicional = 0;
  let totalOutrosTipos = 0;
  let totalReservaNormal = 0;

  const rawNormalRecords: InternalRecord[] = [];
  const auditIssues: any[] = [];

  records.forEach((row, idx) => {
    const lineNum = idx + 2;

    // Extrai propriedades de forma tolerante a nomes maiúsculos/minúsculos
    const tipo = String(
      row['TIPO DE RESERVA'] ?? row.tipoReserva ?? row.tipo ?? row.Tipo ?? row.TIPO ?? ''
    ).trim().toUpperCase();

    // REGRA ABSOLUTA: contabilizar somente RESERVA NORMAL
    if (tipo === 'ADICIONAL') {
      totalAdicional++;
      return;
    }

    if (tipo !== 'RESERVA NORMAL') {
      totalOutrosTipos++;
      return;
    }

    totalReservaNormal++;

    const confDateStr = String(
      row['DATA DA CONFIRMAÇÃO'] ?? row.dataConfirmacao ?? row.confDate ?? row.CONFIRMACAO ?? ''
    ).trim();

    const apresDateStr = String(
      row['DATA APRESENTAÇÃO'] ?? row.dataApresentacao ?? row.apresDate ?? row.APRESENTACAO ?? ''
    ).trim();

    const confDate = parseDate(confDateStr);
    const apresDate = parseDate(apresDateStr);

    const reservaId = String(
      row['RESERVA'] ?? row.reserva ?? row.reservaId ?? row.numeroReserva ?? ''
    ).trim().replace(/\s+/g, ' ');

    const hotel = normalizeHotel(row['HOTEL'] ?? row.hotel ?? row.Hotel);
    const consultor = normalizeName(row['CONSULTOR'] ?? row.consultor ?? row.Consultor);
    const sdr = normalizeName(row['SDR'] ?? row.sdr ?? row.Sdr);

    if (!apresDate) {
      auditIssues.push({
        id: `SEM-APRES-${lineNum}`,
        line: lineNum,
        reserva: reservaId || 'S/N',
        tipo: 'SEM_APRESENTACAO',
        descricao: 'Reserva normal sem data de apresentação preenchida.',
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
  });

  // Deduplicação pelo identificador da Coluna H
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

        if (rec.confDate && (!existing.confDate || rec.confDate < existing.confDate)) {
          existing.confDate = rec.confDate;
          existing.confDateStr = rec.confDateStr;
          existing.confYM = rec.confYM;
          existing.confDateIso = rec.confDateIso;
        }
      } else {
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
        uniqueCouples.push(rec);
      }
    } else {
      seenReservas.set(key, rec);
      uniqueCouples.push(rec);
    }
  }

  const auditSummary = {
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

  const allMonthsSet = new Set<string>();
  monthlyFlow.forEach(m => allMonthsSet.add(m.mesAno));
  futurePortfolio.history.forEach(m => allMonthsSet.add(m.mesAno));
  const sortedMonths = Array.from(allMonthsSet).sort().reverse();
  const availableMonths = sortedMonths.map(ym => ({ value: ym, label: formatMonthLabel(ym) }));

  const hotels = Array.from(new Set(uniqueCouples.map(c => c.hotel))).filter(Boolean).sort();
  const consultores = Array.from(new Set(uniqueCouples.map(c => c.consultor))).filter(Boolean).sort();
  const sdrs = Array.from(new Set(uniqueCouples.map(c => c.sdr))).filter(Boolean).sort();

  const currentYM = formatYearMonth(todayUtc);
  const targetSummaryYM = allMonthsSet.has(currentYM) ? currentYM : (sortedMonths[0] || currentYM);
  const executiveSummary = calculateExecutiveSummary(uniqueCouples, monthlyFlow, futurePortfolio, auditSummary, targetSummaryYM, todayUtc);

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

  return {
    success: true,
    timestamp: new Date().toISOString(),
    sourceType: 'apps_script',
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
    availableFilters: {
      months: availableMonths,
      hotels,
      consultores,
      sdrs
    },
    records: lightRecords
  };
}
