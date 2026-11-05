/**
 * LAGOA BI — Definição de Rotas e Navegação Compartilhável
 */

export type NavViewId = 
  | 'overview'
  | 'monthly-flow'
  | 'future-portfolio'
  | 'confirmation-flow'
  | 'agenda'
  | 'team'
  | 'audit'
  | 'settings';

export interface RouteConfig {
  id: NavViewId;
  path: string;
  label: string;
  title: string;
  subtitle: string;
}

export const ROUTES: RouteConfig[] = [
  {
    id: 'overview',
    path: '/dashboard',
    label: 'Visão Geral',
    title: 'Visão Geral Executiva',
    subtitle: 'Indicadores consolidados de casais confirmados e agenda de apresentações'
  },
  {
    id: 'monthly-flow',
    path: '/evolucao-mensal',
    label: 'Evolução Mensal',
    title: 'Evolução e Fluxo Mensal',
    subtitle: 'Abertura, novas entradas e agenda restante mês a mês'
  },
  {
    id: 'future-portfolio',
    path: '/carteira-futura',
    label: 'Carteira Futura',
    title: 'Carteira Geral Futura',
    subtitle: 'Compromissos acumulados e distribuição de apresentações futuras'
  },
  {
    id: 'confirmation-flow',
    path: '/fluxo-confirmacoes',
    label: 'Fluxo de Confirmações',
    title: 'Fluxo de Confirmações & Horizontes',
    subtitle: 'Análise de maturação (M+0 a M+3+) e matriz cruzada de confirmação × apresentação'
  },
  {
    id: 'agenda',
    path: '/agenda',
    label: 'Agenda & Operação',
    title: 'Agenda & Análise Operacional',
    subtitle: 'Concentração semanal, diária e distribuição por hotel'
  },
  {
    id: 'team',
    path: '/equipe',
    label: 'Equipe Comercial',
    title: 'Equipe Comercial (SDRs & Consultores)',
    subtitle: 'Volume de casais programados por responsável comercial'
  },
  {
    id: 'audit',
    path: '/auditoria',
    label: 'Auditoria & Qualidade',
    title: 'Auditoria & Confiabilidade de Dados',
    subtitle: 'Reconciliação matemática estrita da planilha e auditoria de pendências'
  },
  {
    id: 'settings',
    path: '/configuracoes',
    label: 'Configurações & Conexão',
    title: 'Configurações de Conexão',
    subtitle: 'Integração Google Apps Script e sincronização do painel'
  }
];

export function getRouteByPathname(pathname: string): RouteConfig {
  const clean = pathname.toLowerCase().replace(/\/$/, '') || '/dashboard';
  const found = ROUTES.find(r => r.path === clean);
  return found || ROUTES[0];
}

export function getRouteById(id: NavViewId): RouteConfig {
  return ROUTES.find(r => r.id === id) || ROUTES[0];
}
