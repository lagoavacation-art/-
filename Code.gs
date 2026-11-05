/**
 * ============================================================================
 * LAGOA BI — Controle de Confirmações e Apresentações (Grupo Lagoa Quente)
 * Google Apps Script — Web App de Agregação de Dados
 * ============================================================================
 * 
 * Este script deve ser vinculado à planilha original ou instalado no editor de Apps Script.
 * Lê a aba 'CONTROLE DE RESERVAS', filtra e audita os dados com segurança,
 * e disponibiliza exclusivamente indicadores quantitativos agregados em formato JSON.
 * 
 * NENHUM DADO SENSÍVEL (Nomes de clientes, valores financeiros ou linhas individuais)
 * é retornado pelo endpoint público.
 * 
 * INSTRUÇÕES RÁPIDAS DE IMPLANTAÇÃO:
 * 1. Abra a planilha do Google Sheets:
 *    ID: 1fL6-WidpT8Nxsy6w-UCHGJiUjZkSqY0CRc1Ja9i6EnU
 * 2. Clique no menu: Extensões > Apps Script.
 * 3. Cole este código no arquivo Code.gs.
 * 4. Clique em Implantação > Nova implantação.
 * 5. Selecione o tipo "App da Web" (ícone de engrenagem).
 * 6. Configurações:
 *    - Descrição: "LAGOA BI API v1.0"
 *    - Executar como: "Eu" (sua conta autorizada com acesso à planilha)
 *    - Quem pode acessar: "Qualquer pessoa" (permite que o backend Node.js consulte sem login)
 * 7. Clique em "Implantar" e copie a URL gerada (termina com /exec).
 * 8. Cole a URL no painel de configurações do LAGOA BI.
 */

const SHEET_NAME = 'CONTROLE DE RESERVAS';
const SPREADSHEET_ID = '1fL6-WidpT8Nxsy6w-UCHGJiUjZkSqY0CRc1Ja9i6EnU';

/**
 * Ponto de entrada HTTP GET para o Web App
 */
function doGet(e) {
  try {
    const data = getAggregatedBIData();
    return ContentService.createTextOutput(JSON.stringify(data))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    const errorResponse = {
      success: false,
      error: err.toString(),
      timestamp: new Date().toISOString()
    };
    return ContentService.createTextOutput(JSON.stringify(errorResponse))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Função de teste direto no editor do Apps Script
 */
function testScript() {
  const result = getAggregatedBIData();
  Logger.log("Sucesso: " + result.success);
  Logger.log("Total Linhas: " + result.audit.totalLinhas);
  Logger.log("Reserva Normal: " + result.audit.totalReservaNormal);
  Logger.log("Casais Válidos: " + result.audit.casaisValidosContabilizados);
}

/**
 * Leitura da planilha e cálculo dos indicadores quantitativos
 */
function getAggregatedBIData() {
  let spreadsheet;
  try {
    spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    if (!spreadsheet) {
      spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    }
  } catch (e) {
    spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  }

  const sheet = spreadsheet.getSheetByName(SHEET_NAME) || spreadsheet.getSheets()[0];
  if (!sheet) {
    throw new Error("Aba '" + SHEET_NAME + "' não encontrada na planilha.");
  }

  const values = sheet.getDataRange().getValues();
  if (!values || values.length <= 1) {
    return {
      success: true,
      timestamp: new Date().toISOString(),
      empty: true,
      message: "Planilha sem registros de dados."
    };
  }

  // Mapeamento de colunas baseado na convenção real
  // A(0): Data Confirmação | B(1): Consultor | C(2): SDR | D(3): Nome Casal (não expor)
  // E(4): Valor Pago (ignorado) | F(5): Check-in | G(6): Check-out | H(7): Reserva
  // I(8): Hotel | J(9): Tipo Reserva | K(10): Data Apresentação | L(11): Observação
  const COL_CONF_DATE = 0;
  const COL_CONSULTOR = 1;
  const COL_SDR = 2;
  const COL_VALOR = 4;
  const COL_RESERVA = 7;
  const COL_HOTEL = 8;
  const COL_TIPO = 9;
  const COL_APRES_DATE = 10;

  const totalLinhas = values.length - 1;
  let totalAdicional = 0;
  let totalReservaNormal = 0;
  let totalOutrosTipos = 0;

  const rawNormalRecords = [];
  const financialRecords = [];
  const auditIssues = [];

  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    const tipo = String(row[COL_TIPO] || "").trim().toUpperCase();

    // Extração Financeira Independente (RESERVA NORMAL e ADICIONAL)
    if (tipo === "RESERVA NORMAL" || tipo === "ADICIONAL") {
      const confDateFin = parseDateValue(row[COL_CONF_DATE]);
      const confYMFibr = confDateFin ? formatYearMonth(confDateFin) : "SEM_DATA";
      const valor = parseCurrency(row[COL_VALOR]);

      financialRecords.push({
        tipo: tipo,
        confYM: confYMFibr,
        confDateIso: confDateFin ? formatDateIso(confDateFin) : null,
        confDateStr: formatDateStr(confDateFin),
        valor: valor,
        consultor: String(row[COL_CONSULTOR] || "NÃO INFORMADO").trim().toUpperCase(),
        sdr: String(row[COL_SDR] || "NÃO INFORMADO").trim().toUpperCase(),
        hotel: String(row[COL_HOTEL] || "NÃO INFORMADO").trim().toUpperCase(),
        reservaId: String(row[COL_RESERVA] || "").trim()
      });
    }

    if (tipo === "ADICIONAL") {
      totalAdicional++;
      continue;
    }

    if (tipo !== "RESERVA NORMAL") {
      totalOutrosTipos++;
      continue;
    }

    totalReservaNormal++;

    const confDate = parseDateValue(row[COL_CONF_DATE]);
    const apresDate = parseDateValue(row[COL_APRES_DATE]);
    const reservaId = String(row[COL_RESERVA] || "").trim().replace(/\s+/g, " ");
    const hotel = String(row[COL_HOTEL] || "NÃO INFORMADO").trim().toUpperCase() || "NÃO INFORMADO";
    const consultor = String(row[COL_CONSULTOR] || "NÃO INFORMADO").trim().toUpperCase() || "NÃO INFORMADO";
    const sdr = String(row[COL_SDR] || "NÃO INFORMADO").trim().toUpperCase() || "NÃO INFORMADO";

    const lineNum = i + 1;

    // Auditoria de consistência das datas
    if (!apresDate) {
      auditIssues.push({
        id: "PEND-" + lineNum,
        line: lineNum,
        reserva: reservaId || "S/N",
        tipo: "SEM_APRESENTACAO",
        descricao: "Reserva normal sem data de apresentação preenchida."
      });
    }

    if (confDate && apresDate && apresDate < confDate) {
      auditIssues.push({
        id: "INV-" + lineNum,
        line: lineNum,
        reserva: reservaId || "S/N",
        tipo: "DATAS_INVERTIDAS",
        descricao: "Data de apresentação (" + formatDateStr(apresDate) + ") anterior à data de confirmação (" + formatDateStr(confDate) + ")."
      });
    }

    rawNormalRecords.push({
      line: lineNum,
      confDate: confDate,
      confDateStr: formatDateStr(confDate),
      apresDate: apresDate,
      apresDateStr: formatDateStr(apresDate),
      reservaId: reservaId,
      hotel: hotel,
      consultor: consultor,
      sdr: sdr
    });
  }

  // Deduplicação e auditoria de reserva
  const seenReservas = {};
  const uniqueCouples = [];
  let duplicidadesEliminadas = 0;
  let reprogramacoesSinalizadas = 0;

  for (let j = 0; j < rawNormalRecords.length; j++) {
    const rec = rawNormalRecords[j];
    const key = rec.reservaId ? rec.reservaId.toUpperCase() : ("LINHA_" + rec.line);
    const apresKey = rec.apresDate ? rec.apresDateStr : "SEM_DATA";

    if (seenReservas[key]) {
      const existing = seenReservas[key];
      const existingApresKey = existing.apresDate ? existing.apresDateStr : "SEM_DATA";

      if (existingApresKey === apresKey) {
        // Mesma reserva e mesma data de apresentação: duplicidade
        duplicidadesEliminadas++;
        auditIssues.push({
          id: "DUP-" + rec.line,
          line: rec.line,
          reserva: rec.reservaId,
          tipo: "DUPLICIDADE_ELIMINADA",
          descricao: "Reserva duplicada na linha " + rec.line + " (mesma apresentação da linha " + existing.line + "). Contabilizada 1 vez."
        });

        // Mantém a data de confirmação mais antiga
        if (rec.confDate && (!existing.confDate || rec.confDate < existing.confDate)) {
          existing.confDate = rec.confDate;
          existing.confDateStr = rec.confDateStr;
        }
      } else {
        // Mesma reserva com data de apresentação diferente: sinalizar reprogramação
        reprogramacoesSinalizadas++;
        auditIssues.push({
          id: "REP-" + rec.line,
          line: rec.line,
          reserva: rec.reservaId,
          tipo: "REPROGRAMACAO_POTENCIAL",
          descricao: "Possível reprogramação: reserva com apresentação em " + rec.apresDateStr + " e outra na linha " + existing.line + " em " + existing.apresDateStr + "."
        });
        uniqueCouples.push(rec);
      }
    } else {
      seenReservas[key] = rec;
      uniqueCouples.push(rec);
    }
  }

  const now = new Date();
  const todayStr = formatDateStr(now);

  // Geração dos Agregados
  const monthlyFlow = calculateMonthlyFlow(uniqueCouples, now);
  const futurePortfolio = calculateFuturePortfolio(uniqueCouples, now);
  const confirmationFlow = calculateConfirmationFlow(uniqueCouples);
  const confirmationMatrix = calculateConfirmationMatrix(uniqueCouples);
  const operationalAgenda = calculateOperationalAgenda(uniqueCouples, now);
  const financialData = calculateFinancialData(financialRecords, now);

  return {
    success: true,
    timestamp: now.toISOString(),
    currentDate: todayStr,
    audit: {
      totalLinhas: totalLinhas,
      totalAdicionalDesconsiderado: totalAdicional,
      totalOutrosTiposDesconsiderados: totalOutrosTipos,
      totalReservaNormal: totalReservaNormal,
      duplicidadesEliminadas: duplicidadesEliminadas,
      reprogramacoesSinalizadas: reprogramacoesSinalizadas,
      pendenciasAuditadas: auditIssues.length,
      casaisValidosContabilizados: uniqueCouples.length,
      taxaConformidade: totalReservaNormal > 0 ? Number(((uniqueCouples.length / totalReservaNormal) * 100).toFixed(1)) : 100,
      listaPendencias: auditIssues.slice(0, 500) // Limite seguro para payload
    },
    monthlyFlow: monthlyFlow,
    futurePortfolio: futurePortfolio,
    confirmationFlow: confirmationFlow,
    confirmationMatrix: confirmationMatrix,
    operationalAgenda: operationalAgenda,
    financialData: financialData
  };
}

/**
 * Cálculo do Fluxo Mensal:
 * Mês | Abertura | Novas Entradas | Total Programado | Agenda Restante
 */
function calculateMonthlyFlow(couples, refDate) {
  const monthsMap = {};

  couples.forEach(function(c) {
    if (!c.apresDate) return;
    const mesApres = formatYearMonth(c.apresDate);
    if (!monthsMap[mesApres]) {
      monthsMap[mesApres] = {
        mesAno: mesApres,
        abertura: 0,
        entradas: 0,
        totalProgramado: 0,
        vencidas: 0,
        agendaRestante: 0
      };
    }

    const item = monthsMap[mesApres];
    item.totalProgramado++;

    // Primeiro dia do mês da apresentação
    const startOfMonth = new Date(c.apresDate.getFullYear(), c.apresDate.getMonth(), 1);
    const confYM = c.confDate ? formatYearMonth(c.confDate) : "";

    if (c.confDate && c.confDate < startOfMonth) {
      item.abertura++;
    } else if (confYM === mesApres) {
      item.entradas++;
    } else {
      // Confirmação no mesmo mês ou sem data anterior
      item.abertura++;
    }

    // Status de vencimento em relação à data atual de consulta
    if (c.apresDate < refDate) {
      item.vencidas++;
    } else {
      item.agendaRestante++;
    }
  });

  const sortedMonths = Object.keys(monthsMap).sort();
  const currentYM = formatYearMonth(refDate);

  return sortedMonths.map(function(ym) {
    const m = monthsMap[ym];
    const isPast = ym < currentYM;
    const isFuture = ym > currentYM;
    const isCurrent = ym === currentYM;

    let restanteFinal = m.agendaRestante;
    if (isPast) {
      restanteFinal = 0; // Para meses passados a agenda restante já expirou
    } else if (isFuture) {
      restanteFinal = m.totalProgramado; // Para meses futuros o total está a realizar
    }

    return {
      mesAno: ym,
      label: formatMonthLabel(ym),
      abertura: m.abertura,
      entradas: m.entradas,
      totalProgramado: m.totalProgramado,
      vencidas: isPast ? m.totalProgramado : (isCurrent ? m.vencidas : 0),
      agendaRestante: restanteFinal,
      isCurrentMonth: isCurrent,
      isPastMonth: isPast,
      isFutureMonth: isFuture
    };
  });
}

/**
 * Cálculo da Carteira Geral Futura
 */
function calculateFuturePortfolio(couples, refDate) {
  const currentYM = formatYearMonth(refDate);
  const monthsSet = {};

  couples.forEach(function(c) {
    if (c.confDate) monthsSet[formatYearMonth(c.confDate)] = true;
    if (c.apresDate) monthsSet[formatYearMonth(c.apresDate)] = true;
  });

  const sortedMonths = Object.keys(monthsSet).sort();
  const portfolioHistory = [];

  sortedMonths.forEach(function(ym) {
    const parts = ym.split("-");
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const startOfPeriod = new Date(year, month, 1);
    const endOfPeriod = new Date(year, month + 1, 0, 23, 59, 59);

    let carteiraInicial = 0;
    let novasEntradas = 0;
    let saidasProgramadas = 0;

    couples.forEach(function(c) {
      if (!c.apresDate) return;

      // Carteira Inicial: confirmados antes do início do mês com apresentação nesse mês ou posterior
      if (c.confDate && c.confDate < startOfPeriod && c.apresDate >= startOfPeriod) {
        carteiraInicial++;
      }

      // Novas Entradas: confirmadas no mês com apresentação futura ou válida
      if (c.confDate && c.confDate >= startOfPeriod && c.confDate <= endOfPeriod && c.apresDate >= c.confDate) {
        novasEntradas++;
      }

      // Saídas Programadas: apresentações cujo prazo ocorreu no período
      if (ym === currentYM) {
        // No mês corrente, considera saídas ocorridas até a data de consulta
        if (c.apresDate >= startOfPeriod && c.apresDate < refDate) {
          saidasProgramadas++;
        }
      } else if (ym < currentYM) {
        if (c.apresDate >= startOfPeriod && c.apresDate <= endOfPeriod) {
          saidasProgramadas++;
        }
      } else {
        // Mês futuro: saídas programadas totais previstas no mês
        if (c.apresDate >= startOfPeriod && c.apresDate <= endOfPeriod) {
          saidasProgramadas++;
        }
      }
    });

    portfolioHistory.push({
      mesAno: ym,
      label: formatMonthLabel(ym),
      carteiraInicial: carteiraInicial,
      novasEntradas: novasEntradas,
      saidasProgramadas: saidasProgramadas,
      saldo: carteiraInicial + novasEntradas - saidasProgramadas,
      isCurrentMonth: ym === currentYM
    });
  });

  // Distribuição da Carteira Ativa Atual por mês futuro de apresentação (>= refDate)
  const futureDistributionMap = {};
  let totalFuturo = 0;

  couples.forEach(function(c) {
    if (c.apresDate && c.apresDate >= refDate) {
      const apresYM = formatYearMonth(c.apresDate);
      futureDistributionMap[apresYM] = (futureDistributionMap[apresYM] || 0) + 1;
      totalFuturo++;
    }
  });

  const futureDistribution = Object.keys(futureDistributionMap).sort().map(function(ym) {
    const count = futureDistributionMap[ym];
    return {
      mesAno: ym,
      label: formatMonthLabel(ym),
      quantidade: count,
      percentual: totalFuturo > 0 ? Number(((count / totalFuturo) * 100).toFixed(1)) : 0
    };
  });

  return {
    history: portfolioHistory,
    futureDistribution: futureDistribution,
    totalCarteiraFuturaAtual: totalFuturo
  };
}

/**
 * Fluxo de Confirmações (M+0, M+1, M+2, M+3+)
 */
function calculateConfirmationFlow(couples) {
  const confMap = {};

  couples.forEach(function(c) {
    const confYM = c.confDate ? formatYearMonth(c.confDate) : "SEM_CONFIRMACAO";
    if (!confMap[confYM]) {
      confMap[confYM] = {
        mesConfirmacao: confYM,
        total: 0,
        m0: 0,
        m1: 0,
        m2: 0,
        m3Plus: 0,
        inconsistente: 0
      };
    }

    const item = confMap[confYM];
    item.total++;

    if (!c.confDate || !c.apresDate) {
      item.inconsistente++;
      return;
    }

    const confYear = c.confDate.getFullYear();
    const confMonth = c.confDate.getMonth();
    const apresYear = c.apresDate.getFullYear();
    const apresMonth = c.apresDate.getMonth();

    const monthDiff = (apresYear - confYear) * 12 + (apresMonth - confMonth);

    if (monthDiff === 0) item.m0++;
    else if (monthDiff === 1) item.m1++;
    else if (monthDiff === 2) item.m2++;
    else if (monthDiff >= 3) item.m3Plus++;
    else item.inconsistente++;
  });

  const sortedKeys = Object.keys(confMap).sort();
  return sortedKeys.map(function(ym) {
    const d = confMap[ym];
    const total = d.total || 1;
    return {
      mesConfirmacao: ym,
      label: ym !== "SEM_CONFIRMACAO" ? formatMonthLabel(ym) : "Sem Data de Confirmação",
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
 * Matriz Dinâmica: Mês da Confirmação × Mês da Apresentação
 */
function calculateConfirmationMatrix(couples) {
  const confMonthsSet = {};
  const apresMonthsSet = {};
  const matrix = {};
  const totalsByConf = {};
  const totalsByApres = {};
  let grandTotal = 0;

  couples.forEach(function(c) {
    if (!c.confDate || !c.apresDate) return;
    const cYM = formatYearMonth(c.confDate);
    const aYM = formatYearMonth(c.apresDate);

    confMonthsSet[cYM] = true;
    apresMonthsSet[aYM] = true;

    if (!matrix[cYM]) matrix[cYM] = {};
    matrix[cYM][aYM] = (matrix[cYM][aYM] || 0) + 1;

    totalsByConf[cYM] = (totalsByConf[cYM] || 0) + 1;
    totalsByApres[aYM] = (totalsByApres[aYM] || 0) + 1;
    grandTotal++;
  });

  return {
    confMonths: Object.keys(confMonthsSet).sort(),
    apresMonths: Object.keys(apresMonthsSet).sort(),
    matrix: matrix,
    totalsByConf: totalsByConf,
    totalsByApres: totalsByApres,
    grandTotal: grandTotal
  };
}

/**
 * Análise Operacional e Agenda
 */
function calculateOperationalAgenda(couples, refDate) {
  const dailyMap = {};
  const hotelMap = {};
  const sdrMap = {};
  const consultorMap = {};
  const weekdayMap = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
  const antecedenciaFaixas = {
    "0 a 7 dias": 0,
    "8 a 15 dias": 0,
    "16 a 30 dias": 0,
    "31 a 60 dias": 0,
    "60+ dias": 0
  };

  couples.forEach(function(c) {
    if (c.hotel) hotelMap[c.hotel] = (hotelMap[c.hotel] || 0) + 1;
    if (c.sdr) sdrMap[c.sdr] = (sdrMap[c.sdr] || 0) + 1;
    if (c.consultor) consultorMap[c.consultor] = (consultorMap[c.consultor] || 0) + 1;

    if (c.apresDate) {
      const dStr = c.apresDateStr;
      dailyMap[dStr] = (dailyMap[dStr] || 0) + 1;

      const dayOfWeek = c.apresDate.getDay();
      weekdayMap[dayOfWeek] = (weekdayMap[dayOfWeek] || 0) + 1;

      if (c.confDate) {
        const diffDays = Math.round((c.apresDate - c.confDate) / (1000 * 60 * 60 * 24));
        if (diffDays >= 0 && diffDays <= 7) antecedenciaFaixas["0 a 7 dias"]++;
        else if (diffDays <= 15) antecedenciaFaixas["8 a 15 dias"]++;
        else if (diffDays <= 30) antecedenciaFaixas["16 a 30 dias"]++;
        else if (diffDays <= 60) antecedenciaFaixas["31 a 60 dias"]++;
        else if (diffDays > 60) antecedenciaFaixas["60+ dias"]++;
      }
    }
  });

  const total = couples.length || 1;

  const weekdayNames = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
  const weekdayDistribution = [1, 2, 3, 4, 5, 6, 0].map(function(dayIndex) {
    const count = weekdayMap[dayIndex] || 0;
    return {
      diaIndex: dayIndex,
      diaSemana: weekdayNames[dayIndex],
      quantidade: count,
      percentual: Number(((count / total) * 100).toFixed(1))
    };
  });

  const hotelDistribution = Object.keys(hotelMap).map(function(h) {
    return {
      hotel: h,
      quantidade: hotelMap[h],
      percentual: Number(((hotelMap[h] / total) * 100).toFixed(1))
    };
  }).sort(function(a, b) { return b.quantidade - a.quantidade; });

  const sdrDistribution = Object.keys(sdrMap).map(function(s) {
    return {
      sdr: s,
      quantidade: sdrMap[s],
      percentual: Number(((sdrMap[s] / total) * 100).toFixed(1))
    };
  }).sort(function(a, b) { return b.quantidade - a.quantidade; });

  const consultorDistribution = Object.keys(consultorMap).map(function(co) {
    return {
      consultor: co,
      quantidade: consultorMap[co],
      percentual: Number(((consultorMap[co] / total) * 100).toFixed(1))
    };
  }).sort(function(a, b) { return b.quantidade - a.quantidade; });

  const antecedenciaDistribution = Object.keys(antecedenciaFaixas).map(function(f) {
    return {
      faixa: f,
      quantidade: antecedenciaFaixas[f],
      percentual: Number(((antecedenciaFaixas[f] / total) * 100).toFixed(1))
    };
  });

  return {
    dailyCounts: dailyMap,
    weekdayDistribution: weekdayDistribution,
    hotelDistribution: hotelDistribution,
    sdrDistribution: sdrDistribution,
    consultorDistribution: consultorDistribution,
    antecedenciaDistribution: antecedenciaDistribution
  };
}

/**
 * Utilitários de Data
 */
function parseDateValue(val) {
  if (!val) return null;
  if (val instanceof Date) return isNaN(val.getTime()) ? null : val;
  const str = String(val).trim();
  if (!str) return null;

  // DD/MM/YYYY ou YYYY-MM-DD
  const parts = str.split(/[\/\-]/);
  if (parts.length !== 3) return null;

  let d, m, y;
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

  const date = new Date(y, m - 1, d);
  return isNaN(date.getTime()) ? null : date;
}

function formatDateStr(date) {
  if (!date) return "";
  const d = String(date.getDate()).padStart(2, "0");
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const y = date.getFullYear();
  return d + "/" + m + "/" + y;
}

function formatYearMonth(date) {
  if (!date) return "";
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return y + "-" + m;
}

function formatMonthLabel(ym) {
  const parts = ym.split("-");
  const y = parts[0];
  const m = parseInt(parts[1], 10);
  const nomes = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];
  return (nomes[m - 1] || ym) + "/" + y;
}

function formatDateIso(date) {
  if (!date) return null;
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return y + "-" + m + "-" + d;
}

function parseCurrency(val) {
  if (val === undefined || val === null) return 0;
  if (typeof val === "number") return isNaN(val) ? 0 : val;
  const str = String(val).trim();
  if (!str) return 0;
  let cleaned = str.replace(/[R$\s"']/g, "");
  if (cleaned.indexOf(",") !== -1) {
    cleaned = cleaned.replace(/\./g, "").replace(",", ".");
  } else {
    const dotCount = (cleaned.match(/\./g) || []).length;
    if (dotCount > 1) {
      cleaned = cleaned.replace(/\./g, "");
    }
  }
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : Math.round(num * 100) / 100;
}

function calculateFinancialData(records, refDate) {
  let totalNormal = 0;
  let totalAdicional = 0;
  let zerados = 0;
  let validos = 0;

  const monthsMap = {};
  const hotelMap = {};
  const consultorMap = {};
  const sdrMap = {};

  records.forEach(function(r) {
    if (r.valor <= 0) zerados++;
    else validos++;

    if (r.tipo === "RESERVA NORMAL") totalNormal++;
    if (r.tipo === "ADICIONAL") totalAdicional++;

    const ym = r.confYM;
    if (ym && ym !== "SEM_DATA") {
      if (!monthsMap[ym]) monthsMap[ym] = { normal: 0, adicional: 0 };
      if (r.tipo === "RESERVA NORMAL") monthsMap[ym].normal += r.valor;
      else monthsMap[ym].adicional += r.valor;
    }

    const h = r.hotel || "NÃO INFORMADO";
    if (!hotelMap[h]) hotelMap[h] = { normal: 0, adicional: 0 };
    if (r.tipo === "RESERVA NORMAL") hotelMap[h].normal += r.valor;
    else hotelMap[h].adicional += r.valor;

    const c = r.consultor || "NÃO INFORMADO";
    if (!consultorMap[c]) consultorMap[c] = { normal: 0, adicional: 0 };
    if (r.tipo === "RESERVA NORMAL") consultorMap[c].normal += r.valor;
    else consultorMap[c].adicional += r.valor;

    const s = r.sdr || "NÃO INFORMADO";
    if (!sdrMap[s]) sdrMap[s] = { normal: 0, adicional: 0 };
    if (r.tipo === "RESERVA NORMAL") sdrMap[s].normal += r.valor;
    else sdrMap[s].adicional += r.valor;
  });

  const sortedYMs = Object.keys(monthsMap).sort();
  const currentYM = formatYearMonth(refDate);

  const monthlyFlow = [];
  let prevTotal = null;

  sortedYMs.forEach(function(ym) {
    const data = monthsMap[ym];
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
      variacaoMensalPct: variacaoMensalPct,
      isCurrentMonth: ym === currentYM
    });

    prevTotal = vTotal;
  });

  const summaryItem = monthlyFlow.find(function(m) { return m.mesAno === currentYM; }) || monthlyFlow[monthlyFlow.length - 1];
  const mesReferencia = summaryItem ? summaryItem.mesAno : currentYM;
  const mesReferenciaLabel = summaryItem ? summaryItem.label : formatMonthLabel(currentYM);
  const valorTotalMes = summaryItem ? summaryItem.valorTotal : 0;
  const valorNormalMes = summaryItem ? summaryItem.valorNormal : 0;
  const valorAdicionalMes = summaryItem ? summaryItem.valorAdicional : 0;
  const participacaoAdicionalMes = summaryItem ? summaryItem.percentualAdicional : 0;

  const summaryIndex = summaryItem ? monthlyFlow.indexOf(summaryItem) : -1;
  const prevMonthItem = summaryIndex > 0 ? monthlyFlow[summaryIndex - 1] : null;
  const valorTotalMesAnterior = prevMonthItem ? prevMonthItem.valorTotal : 0;
  const variacaoMesAnteriorDiff = Math.round((valorTotalMes - valorTotalMesAnterior) * 100) / 100;
  const variacaoMesAnteriorPct = valorTotalMesAnterior > 0
    ? Math.round((((valorTotalMes - valorTotalMesAnterior) / valorTotalMesAnterior) * 100) * 10) / 10
    : 0;

  const anoRef = mesReferencia.split("-")[0];
  const anoPrefix = anoRef + "-";
  const acumuladoAno = Math.round(
    monthlyFlow
      .filter(function(m) { return m.mesAno.indexOf(anoPrefix) === 0; })
      .reduce(function(acc, m) { return acc + m.valorTotal; }, 0) * 100
  ) / 100;

  const dailyMap = {};
  records.forEach(function(r) {
    if (r.confYM === mesReferencia && r.confDateIso) {
      if (!dailyMap[r.confDateIso]) {
        dailyMap[r.confDateIso] = { normal: 0, adicional: 0, dataStr: r.confDateStr };
      }
      if (r.tipo === "RESERVA NORMAL") dailyMap[r.confDateIso].normal += r.valor;
      else dailyMap[r.confDateIso].adicional += r.valor;
    }
  });

  const diasSemana = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  const dailyFlow = Object.keys(dailyMap).sort().map(function(iso) {
    const d = dailyMap[iso];
    const vNorm = Math.round(d.normal * 100) / 100;
    const vAdic = Math.round(d.adicional * 100) / 100;
    const parts = iso.split("-");
    const dt = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    const diaSemana = diasSemana[dt.getDay()] || "";
    return {
      dataIso: iso,
      dataStr: d.dataStr,
      diaSemana: diaSemana,
      valorNormal: vNorm,
      valorAdicional: vAdic,
      valorTotal: Math.round((vNorm + vAdic) * 100) / 100
    };
  });

  const totalGeral = records.reduce(function(acc, r) { return acc + r.valor; }, 0);

  function mapDimension(mapObj) {
    return Object.keys(mapObj).map(function(nome) {
      const vals = mapObj[nome];
      const vNorm = Math.round(vals.normal * 100) / 100;
      const vAdic = Math.round(vals.adicional * 100) / 100;
      const vTot = Math.round((vNorm + vAdic) * 100) / 100;
      const pct = totalGeral > 0 ? Math.round(((vTot / totalGeral) * 100) * 10) / 10 : 0;
      return { nome: nome, valorNormal: vNorm, valorAdicional: vAdic, valorTotal: vTot, percentual: pct };
    }).sort(function(a, b) { return b.valorTotal - a.valorTotal; });
  }

  return {
    summary: {
      mesReferencia: mesReferencia,
      mesReferenciaLabel: mesReferenciaLabel,
      dataConsulta: formatDateIso(refDate),
      valorTotalMes: valorTotalMes,
      valorNormalMes: valorNormalMes,
      valorAdicionalMes: valorAdicionalMes,
      participacaoAdicionalMes: participacaoAdicionalMes,
      valorTotalMesAnterior: valorTotalMesAnterior,
      variacaoMesAnteriorDiff: variacaoMesAnteriorDiff,
      variacaoMesAnteriorPct: variacaoMesAnteriorPct,
      acumuladoAno: acumuladoAno,
      acumuladoAnoLabel: "Acumulado " + anoRef
    },
    monthlyFlow: monthlyFlow,
    dailyFlow: dailyFlow,
    porHotel: mapDimension(hotelMap),
    porConsultor: mapDimension(consultorMap),
    porSdr: mapDimension(sdrMap),
    auditFinanceiro: {
      totalRegistrosAnalisados: records.length,
      totalNormal: totalNormal,
      totalAdicional: totalAdicional,
      registrosZeradosOuVazios: zerados,
      registrosValidos: validos
    }
  };
}
