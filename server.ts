import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import https from 'https';
import http from 'http';
import { validateAndParseApiResponse } from './src/shared/apiValidator';
import { processRawSheetData } from './src/shared/biEngine';
import { BIDataset } from './src/types/bi';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json());

// Diretório de dados e configurações persistentes
const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const CONFIG_FILE = path.join(DATA_DIR, 'config.json');

// URL OFICIAL FORNECIDA PELO USUÁRIO
const OFFICIAL_APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxTqus1b-WG9pZgqa1vnmdVX82G_fzoTdoJb216J6AbW-eitpjaz3MwXBFWQmaJDBu6/exec';

// Planilha oficial do Google Sheets (aba CONTROLE DE RESERVAS)
const OFFICIAL_SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/1fL6-WidpT8Nxsy6w-UCHGJiUjZkSqY0CRc1Ja9i6EnU/export?format=csv&gid=1228909225';

interface ServerConfig {
  appsScriptUrl: string;
  autoRefreshMinutes: number;
  lastSuccessfulSync?: string;
  enableDirectSheetFallback: boolean;
}

const DEFAULT_CONFIG: ServerConfig = {
  appsScriptUrl: process.env.APPS_SCRIPT_URL || OFFICIAL_APPS_SCRIPT_URL,
  autoRefreshMinutes: 5,
  enableDirectSheetFallback: true
};

function loadConfig(): ServerConfig {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const content = fs.readFileSync(CONFIG_FILE, 'utf-8');
      const loaded = JSON.parse(content);
      return {
        ...DEFAULT_CONFIG,
        ...loaded,
        appsScriptUrl: loaded.appsScriptUrl || OFFICIAL_APPS_SCRIPT_URL,
        enableDirectSheetFallback: true
      };
    }
  } catch (err) {
    console.error('Erro ao ler config.json:', err);
  }
  return DEFAULT_CONFIG;
}

function saveConfig(cfg: ServerConfig): void {
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(cfg, null, 2), 'utf-8');
  } catch (err) {
    console.error('Erro ao salvar config.json:', err);
  }
}

let serverConfig = loadConfig();

// Cache em memória dos indicadores
interface CacheEntry {
  data: BIDataset;
  timestamp: number;
  sourceUrl: string;
}

let memoryCache: CacheEntry | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos

/**
 * Função utilitária para requisição HTTP/HTTPS com suporte a redirecionamentos (301, 302, 307)
 */
function fetchWithRedirect(urlStr: string, maxRedirects = 8): Promise<string> {
  return new Promise((resolve, reject) => {
    if (maxRedirects <= 0) {
      return reject(new Error('Muitos redirecionamentos'));
    }

    let urlObj: URL;
    try {
      urlObj = new URL(urlStr);
    } catch (e: any) {
      return reject(new Error(`URL inválida: ${urlStr}`));
    }

    const client = urlObj.protocol === 'https:' ? https : http;

    const req = client.get(urlStr, {
      headers: {
        'User-Agent': 'LAGOA-BI/1.0 (Business Intelligence Coordinator)',
        'Accept': 'application/json, text/csv, text/plain, */*'
      }
    }, (res) => {
      // Trata redirecionamentos 301, 302, 303, 307
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        const nextUrl = new URL(res.headers.location, urlStr).toString();

        // Se redirecionar para accounts.google.com, o Apps Script está exigindo login
        if (nextUrl.includes('accounts.google.com/ServiceLogin') || nextUrl.includes('accounts.google.com/v3/signin')) {
          return reject(new Error(
            'PERMISSÃO NO APPS SCRIPT: O Web App redirecionou para autenticação do Google (login). ' +
            'Para liberar acesso anônimo sem login, no editor do Apps Script vá em: ' +
            'Implantar > Gerenciar implantações > Editar > "Quem pode acessar" e selecione "Qualquer pessoa" (Anyone).'
          ));
        }

        return fetchWithRedirect(nextUrl, maxRedirects - 1).then(resolve).catch(reject);
      }

      if (res.statusCode && res.statusCode >= 400) {
        return reject(new Error(`Servidor retornou status HTTP ${res.statusCode}: ${res.statusMessage}`));
      }

      let data = '';
      res.setEncoding('utf-8');
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    });

    req.on('error', reject);
    req.setTimeout(35000, () => {
      req.destroy();
      reject(new Error('Timeout de 35 segundos ao conectar à fonte de dados.'));
    });
  });
}

/**
 * Consulta a API do Google Apps Script e valida rigorosamente a resposta JSON,
 * com fallback para leitura da planilha oficial se o Apps Script estiver bloqueado por login.
 */
async function fetchBIData(forceRefresh = false): Promise<BIDataset> {
  const now = Date.now();
  if (!forceRefresh && memoryCache && (now - memoryCache.timestamp < CACHE_TTL_MS)) {
    return memoryCache.data;
  }

  const appsScriptUrl = serverConfig.appsScriptUrl ? serverConfig.appsScriptUrl.trim() : OFFICIAL_APPS_SCRIPT_URL;
  let appsScriptWarning: string | undefined = undefined;

  // 1. Tenta prioritariamente a URL oficial do Apps Script
  if (appsScriptUrl) {
    try {
      const responseText = await fetchWithRedirect(appsScriptUrl);

      // Se não for HTML (ou seja, retornou JSON)
      if (!responseText.trim().startsWith('<!doctype') && !responseText.trim().startsWith('<html')) {
        let parsedJson: any;
        try {
          parsedJson = JSON.parse(responseText);
        } catch (jsonErr: any) {
          throw new Error(`A resposta da API não é um JSON válido: ${jsonErr.message}`);
        }

        // Validação estrita dos dados
        const dataset = validateAndParseApiResponse(parsedJson, appsScriptUrl);
        memoryCache = { data: dataset, timestamp: now, sourceUrl: appsScriptUrl };
        serverConfig.lastSuccessfulSync = new Date().toISOString();
        saveConfig(serverConfig);
        return dataset;
      } else {
        appsScriptWarning = 'O endpoint do Google Apps Script retornou uma página de login do Google. Para usar a API diretamente, configure "Quem pode acessar: Qualquer pessoa" no editor de script.';
      }
    } catch (err: any) {
      appsScriptWarning = err.message;
      console.warn('Tentativa via Apps Script falhou:', err.message);
    }
  }

  // 2. Se o Apps Script estiver exigindo login, conecta diretamente à planilha oficial
  // CONTROLE DE RESERVAS (ID: 1fL6-WidpT8Nxsy6w-UCHGJiUjZkSqY0CRc1Ja9i6EnU)
  try {
    const csvContent = await fetchWithRedirect(OFFICIAL_SHEET_CSV_URL);
    if (!csvContent || csvContent.trim().length === 0) {
      throw new Error('A planilha retornou vazia.');
    }

    const dataset = processRawSheetData(csvContent, 'google_sheet_direct', OFFICIAL_SHEET_CSV_URL);
    if (appsScriptWarning) {
      dataset.warning = appsScriptWarning;
    }

    memoryCache = { data: dataset, timestamp: now, sourceUrl: OFFICIAL_SHEET_CSV_URL };
    serverConfig.lastSuccessfulSync = new Date().toISOString();
    saveConfig(serverConfig);
    return dataset;
  } catch (sheetErr: any) {
    throw new Error(
      `Falha na conexão com a fonte de dados. Apps Script: ${appsScriptWarning || 'Não configurado'}. Planilha Direta: ${sheetErr.message}`
    );
  }
}

// ==========================================
// ROTAS DA API REST (SEMPRE RETORNANDO JSON)
// ==========================================

app.get('/api/status', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'application/json');
  res.json({
    connected: !!memoryCache,
    hasAppsScriptUrl: !!serverConfig.appsScriptUrl,
    appsScriptUrl: serverConfig.appsScriptUrl || OFFICIAL_APPS_SCRIPT_URL,
    officialUrl: OFFICIAL_APPS_SCRIPT_URL,
    autoRefreshMinutes: serverConfig.autoRefreshMinutes || 5,
    lastSuccessfulSync: serverConfig.lastSuccessfulSync || null,
    isCached: !!memoryCache,
    cacheAgeSeconds: memoryCache ? Math.round((Date.now() - memoryCache.timestamp) / 1000) : null
  });
});

app.get('/api/config', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'application/json');
  res.json({
    appsScriptUrl: serverConfig.appsScriptUrl || OFFICIAL_APPS_SCRIPT_URL,
    officialUrl: OFFICIAL_APPS_SCRIPT_URL,
    autoRefreshMinutes: serverConfig.autoRefreshMinutes || 5,
    lastSuccessfulSync: serverConfig.lastSuccessfulSync || null
  });
});

app.post('/api/config', async (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'application/json');
  try {
    const { appsScriptUrl, autoRefreshMinutes } = req.body;
    
    serverConfig.appsScriptUrl = typeof appsScriptUrl === 'string' && appsScriptUrl.trim() 
      ? appsScriptUrl.trim() 
      : OFFICIAL_APPS_SCRIPT_URL;

    if (typeof autoRefreshMinutes === 'number' && autoRefreshMinutes >= 1) {
      serverConfig.autoRefreshMinutes = autoRefreshMinutes;
    }

    saveConfig(serverConfig);
    memoryCache = null; // Invalida cache imediatamente

    // Testa nova conexão
    let testResult = null;
    let testError = null;
    try {
      const data = await fetchBIData(true);
      testResult = {
        totalCasais: data.audit.casaisValidosContabilizados,
        totalReservaNormal: data.audit.totalReservaNormal,
        totalLinhas: data.audit.totalLinhas,
        sourceType: data.sourceType
      };
      if (data.warning) {
        testError = data.warning;
      }
    } catch (testErr: any) {
      testError = testErr.message;
    }

    res.json({
      success: !!testResult,
      message: testError ? `Conectado com aviso: ${testError}` : 'Conexão testada e salva com sucesso.',
      config: serverConfig,
      testResult,
      testError
    });
  } catch (err: any) {
    res.json({ success: false, error: err.message });
  }
});

app.get('/api/data', async (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'application/json');
  try {
    const force = req.query.refresh === 'true' || req.query.refresh === '1';
    const data = await fetchBIData(force);
    res.json(data);
  } catch (err: any) {
    // Retorna HTTP 200 com success: false para NUNCA ser interceptado pelo proxy reverso do Cloud Run
    res.json({
      success: false,
      error: err.message,
      appsScriptUrl: serverConfig.appsScriptUrl || OFFICIAL_APPS_SCRIPT_URL,
      timestamp: new Date().toISOString()
    });
  }
});

app.post('/api/refresh', async (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'application/json');
  try {
    memoryCache = null;
    const data = await fetchBIData(true);
    res.json({
      success: true,
      message: 'Dados atualizados com sucesso.',
      timestamp: data.timestamp,
      totalCasais: data.audit.casaisValidosContabilizados,
      sourceType: data.sourceType,
      warning: data.warning
    });
  } catch (err: any) {
    res.json({
      success: false,
      error: err.message
    });
  }
});

app.get('/api/export-audit', async (req: Request, res: Response) => {
  try {
    const data = await fetchBIData(false);
    const issues = data.audit.listaPendencias || [];

    let csv = 'ID,LINHA,RESERVA,TIPO_PENDENCIA,DESCRICAO,CONFIRMACAO,APRESENTACAO,HOTEL,CONSULTOR,SDR\n';
    for (const issue of issues) {
      const row = [
        issue.id,
        issue.line,
        `"${(issue.reserva || '').replace(/"/g, '""')}"`,
        issue.tipo,
        `"${(issue.descricao || '').replace(/"/g, '""')}"`,
        issue.dataConfirmacao || '',
        issue.dataApresentacao || '',
        `"${(issue.hotel || '').replace(/"/g, '""')}"`,
        `"${(issue.consultor || '').replace(/"/g, '""')}"`,
        `"${(issue.sdr || '').replace(/"/g, '""')}"`
      ];
      csv += row.join(',') + '\n';
    }

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="lagoa_bi_auditoria.csv"');
    res.send(csv);
  } catch (err: any) {
    res.status(500).send(`Erro ao gerar exportação: ${err.message}`);
  }
});

// ==========================================
// VITE DEV SERVER OU ARQUIVOS ESTÁTICOS
// ==========================================

async function startServer() {
  const isDev = process.env.NODE_ENV !== 'production';

  if (isDev) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`LAGOA BI rodando na porta ${PORT} [${isDev ? 'DEV' : 'PROD'}]`);
    console.log(`URL Oficial Apps Script configurada: ${OFFICIAL_APPS_SCRIPT_URL}`);
  });
}

startServer().catch(err => {
  console.error('Falha ao iniciar servidor:', err);
  process.exit(1);
});
