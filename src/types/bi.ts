/**
 * LAGOA BI — Tipos TypeScript para Modelo Quantitativo de Business Intelligence
 */

export interface RawReservationRecord {
  line: number;
  confDate: string; // DD/MM/YYYY
  confDateIso: string | null; // YYYY-MM-DD
  consultor: string;
  sdr: string;
  reservaId: string;
  hotel: string;
  tipoReserva: string;
  apresDate: string; // DD/MM/YYYY
  apresDateIso: string | null; // YYYY-MM-DD
  checkIn?: string;
  checkOut?: string;
  observacao?: string;
}

export interface AuditIssue {
  id: string;
  line: number;
  reserva: string;
  tipo: 'SEM_APRESENTACAO' | 'DATA_INVALIDA' | 'DATAS_INVERTIDAS' | 'REPROGRAMACAO_POTENCIAL' | 'DUPLICIDADE_ELIMINADA';
  descricao: string;
  dataConfirmacao?: string;
  dataApresentacao?: string;
  hotel?: string;
  consultor?: string;
  sdr?: string;
}

export interface AuditSummary {
  totalLinhas: number;
  totalAdicionalDesconsiderado: number;
  totalOutrosTiposDesconsiderados: number;
  totalReservaNormal: number;
  duplicidadesEliminadas: number;
  reprogramacoesSinalizadas: number;
  pendenciasAuditadas: number;
  casaisValidosContabilizados: number;
  taxaConformidade: number;
  listaPendencias: AuditIssue[];
}

export interface MonthlyFlowItem {
  mesAno: string; // "YYYY-MM"
  label: string; // "Novembro/2026"
  abertura: number; // Confirmados antes do 1º dia do mês M, apresentação em M
  entradas: number; // Confirmados durante M, apresentação em M
  totalProgramado: number; // Abertura + Entradas
  vencidas: number; // Apresentações já ocorridas até a data de corte
  agendaRestante: number; // Apresentações restantes (ainda não vencidas)
  isCurrentMonth: boolean;
  isPastMonth: boolean;
  isFutureMonth: boolean;
}

export interface FuturePortfolioItem {
  mesAno: string; // "YYYY-MM"
  label: string;
  carteiraInicial: number; // Confirmados antes do início do mês com apresentação no mês ou posterior
  novasEntradas: number; // Confirmados no mês com apresentação futura
  saidasProgramadas: number; // Apresentações no mês (até o dia de corte no mês atual)
  saldo: number; // Carteira Inicial + Entradas - Saídas
  isCurrentMonth: boolean;
}

export interface FuturePortfolioDistributionItem {
  mesAno: string;
  label: string;
  quantidade: number;
  percentual: number;
}

export interface FuturePortfolioView {
  history: FuturePortfolioItem[];
  futureDistribution: FuturePortfolioDistributionItem[];
  totalCarteiraFuturaAtual: number;
  saldoAtualReferencia: number;
  dataReferencia: string;
}

export interface ConfirmationFlowCohort {
  mesConfirmacao: string;
  label: string;
  totalConfirmados: number;
  m0: number; // mesmo mês
  m0Pct: number;
  m1: number; // mês seguinte
  m1Pct: number;
  m2: number; // dois meses depois
  m2Pct: number;
  m3Plus: number; // 3 ou mais meses
  m3PlusPct: number;
  inconsistente: number;
  inconsistentePct: number;
}

export interface ConfirmationMatrix {
  confMonths: string[];
  apresMonths: string[];
  matrix: Record<string, Record<string, number>>;
  totalsByConf: Record<string, number>;
  totalsByApres: Record<string, number>;
  grandTotal: number;
}

export interface DistributionMetric {
  label: string;
  quantidade: number;
  percentual: number;
}

export interface WeekdayMetric {
  diaIndex: number;
  diaSemana: string;
  quantidade: number;
  percentual: number;
}

export interface AntecedenciaMetric {
  faixa: string;
  quantidade: number;
  percentual: number;
}

export interface DailyAgendaItem {
  data: string; // YYYY-MM-DD
  dataStr: string; // DD/MM/YYYY
  diaSemana: string;
  quantidade: number;
  isPast: boolean;
  isToday: boolean;
  hoteis: Record<string, number>;
}

export interface WeeklyAgendaItem {
  semanaKey: string;
  label: string;
  quantidade: number;
  hoteis: Record<string, number>;
}

export interface OperationalAgenda {
  dailyCounts: Record<string, number>;
  dailyList: DailyAgendaItem[];
  weeklyList: WeeklyAgendaItem[];
  weekdayDistribution: WeekdayMetric[];
  hotelDistribution: DistributionMetric[];
  sdrDistribution: DistributionMetric[];
  consultorDistribution: DistributionMetric[];
  antecedenciaDistribution: AntecedenciaMetric[];
}

export interface TeamMemberMetric {
  nome: string;
  totalCasais: number;
  percentualDoTotal: number;
  apresentacoesNoMesmoMes: number;
  apresentacoesFuturas: number;
  hoteis: Record<string, number>;
  distribuicaoMeses: Record<string, number>;
}

export interface CommercialTeamData {
  sdrs: TeamMemberMetric[];
  consultores: TeamMemberMetric[];
  crossMatrix: {
    sdrs: string[];
    consultores: string[];
    matrix: Record<string, Record<string, number>>;
  };
}

export interface ExecutiveSummary {
  mesReferencia: string;
  mesReferenciaLabel: string;
  dataConsulta: string;
  
  // Confirmações
  confirmacoesMes: number;
  confirmacoesMesAnterior: number;
  confirmacoesDiff: number;
  confirmacoesDiffPct: number;
  
  // Agenda
  agendaMes: number;
  agendaMesAnterior: number;
  agendaDiff: number;
  agendaDiffPct: number;

  // Fluxo
  aberturaMes: number;
  entradasMes: number;
  totalProgramadoMes: number;
  apresentacoesVencidasMes: number;
  agendaRestanteMes: number;

  // Carteira
  carteiraGeralFutura: number;
  programadoProximoMes: number;
  programadoProximoMesLabel: string;

  // Qualidade / Auditoria
  totalPendenciasAuditoria: number;
  taxaConformidade: number;
}

export interface FinancialMonthlyItem {
  mesAno: string; // "YYYY-MM"
  label: string; // "Novembro/2026"
  valorNormal: number;
  valorAdicional: number;
  valorTotal: number;
  percentualAdicional: number;
  variacaoMensalPct: number | null;
  isCurrentMonth: boolean;
}

export interface FinancialDailyItem {
  dataIso: string; // "YYYY-MM-DD"
  dataStr: string; // "DD/MM/YYYY"
  diaSemana: string;
  valorNormal: number;
  valorAdicional: number;
  valorTotal: number;
}

export interface FinancialSummary {
  mesReferencia: string;
  mesReferenciaLabel: string;
  dataConsulta: string;
  valorTotalMes: number;
  valorNormalMes: number;
  valorAdicionalMes: number;
  participacaoAdicionalMes: number;
  valorTotalMesAnterior: number;
  variacaoMesAnteriorDiff: number;
  variacaoMesAnteriorPct: number;
  acumuladoAno: number;
  acumuladoAnoLabel: string;
}

export interface FinancialTeamOrHotelMetric {
  nome: string;
  valorNormal: number;
  valorAdicional: number;
  valorTotal: number;
  percentual: number;
}

export interface FinancialRecord {
  line: number;
  confYM: string;
  confDateIso: string | null;
  confDateStr: string;
  tipo: 'RESERVA NORMAL' | 'ADICIONAL';
  valor: number;
  consultor: string;
  sdr: string;
  hotel: string;
  reservaId: string;
}

export interface FinancialDataset {
  summary: FinancialSummary;
  monthlyFlow: FinancialMonthlyItem[];
  dailyFlow: FinancialDailyItem[];
  porConsultor: FinancialTeamOrHotelMetric[];
  porSdr: FinancialTeamOrHotelMetric[];
  porHotel: FinancialTeamOrHotelMetric[];
  auditFinanceiro: {
    totalRegistrosAnalisados: number;
    totalNormal: number;
    totalAdicional: number;
    registrosZeradosOuVazios: number;
    registrosValidos: number;
  };
  records?: FinancialRecord[];
}

export interface RealizedReservationDailyItem {
  dataIso: string;
  dataStr: string;
  diaSemana: string;
  quantidade: number;
  acumulado: number;
}

export interface RealizedReservationMonthlyItem {
  mesAno: string;
  label: string;
  quantidade: number;
  mediaDiaria: number;
  mesAnterior: number | null;
  variacaoPct: number | null;
  isCurrentMonth: boolean;
}

export interface RealizedReservationsSummary {
  mesReferencia: string;
  mesReferenciaLabel: string;
  totalMes: number;
  hoje: number;
  naSemana: number;
  mediaDiaria: number;
  mesAnterior: number;
  variacaoMoMPct: number;
  acumuladoMes: number;
  totalAnual: number;
  totalAnualLabel: string;
}

export interface RealizedReservationsDistributionItem {
  nome: string;
  quantidade: number;
  percentual: number;
}

export interface RealizedReservationsDataset {
  summary: RealizedReservationsSummary;
  dailyFlow: RealizedReservationDailyItem[];
  monthlyFlow: RealizedReservationMonthlyItem[];
  porConsultor: RealizedReservationsDistributionItem[];
  porSdr: RealizedReservationsDistributionItem[];
  porHotel: RealizedReservationsDistributionItem[];
}

export interface BIDataset {
  success: boolean;
  timestamp: string;
  sourceType: 'apps_script' | 'google_sheet_direct';
  sourceUrl?: string;
  warning?: string;
  currentDate: string;
  audit: AuditSummary;
  monthlyFlow: MonthlyFlowItem[];
  futurePortfolio: FuturePortfolioView;
  confirmationFlow: ConfirmationFlowCohort[];
  confirmationMatrix: ConfirmationMatrix;
  operationalAgenda: OperationalAgenda;
  teamData: CommercialTeamData;
  executiveSummary: ExecutiveSummary;
  financialData?: FinancialDataset;
  realizedReservations?: RealizedReservationsDataset;
  availableFilters: {
    months: Array<{ value: string; label: string }>;
    hotels: string[];
    consultores: string[];
    sdrs: string[];
  };
  // Normalized clean records for fast in-browser filtering
  records?: Array<{
    line: number;
    confYM: string;
    confDateIso: string | null;
    apresYM: string;
    apresDateIso: string | null;
    hotel: string;
    consultor: string;
    sdr: string;
    reservaId: string;
  }>;
}

export interface FilterState {
  mesAno: string; // 'all' or 'YYYY-MM'
  hotel: string; // 'all' or hotel name
  consultor: string; // 'all' or consultor name
  sdr: string; // 'all' or sdr name
}

export interface AppConfig {
  appsScriptUrl: string;
  autoRefreshMinutes: number;
  lastSuccessfulSync?: string;
}
