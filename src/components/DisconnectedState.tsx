import React, { useState } from 'react';
import { Database, AlertTriangle, RefreshCw, CheckCircle2, Building2, ExternalLink, ShieldAlert } from 'lucide-react';

interface DisconnectedStateProps {
  errorMessage: string | null;
  onRetry: () => void;
  isRetrying: boolean;
  onConfigSaved: () => void;
}

const OFFICIAL_URL = 'https://script.google.com/macros/s/AKfycbxTqus1b-WG9pZgqa1vnmdVX82G_fzoTdoJb216J6AbW-eitpjaz3MwXBFWQmaJDBu6/exec';

export const DisconnectedState: React.FC<DisconnectedStateProps> = ({
  errorMessage,
  onRetry,
  isRetrying,
  onConfigSaved
}) => {
  const [appsScriptUrl, setAppsScriptUrl] = useState(OFFICIAL_URL);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const isAuthError = errorMessage && (
    errorMessage.includes('PERMISSÃO') ||
    errorMessage.includes('autenticação') ||
    errorMessage.includes('login') ||
    errorMessage.includes('redirecionou')
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!appsScriptUrl.trim()) return;

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appsScriptUrl })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.testError || data.error || 'Erro ao conectar à URL fornecida.');
      }

      onConfigSaved();
    } catch (err: any) {
      setSubmitError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-2xl space-y-6">
        {/* Brand Header */}
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-blue-900 text-white shadow-md">
            <Building2 className="h-8 w-8" />
          </div>
          <h1 className="mt-4 text-xl font-extrabold text-slate-900 tracking-tight sm:text-2xl">
            LAGOA BI — Controle de Confirmações e Apresentações
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-500">
            Grupo Lagoa Quente · Coordenação Comercial Mini-Vac
          </p>
        </div>

        {/* Card de Diagnóstico do Endpoint Oficial */}
        <div className="rounded-xl border border-rose-200 bg-white p-6 shadow-2xs">
          <div className="flex items-start gap-3">
            <ShieldAlert className="h-6 w-6 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  Status da Conexão com Apps Script
                </h2>
                <span className="rounded bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-700 border border-rose-200">
                  Desconectado
                </span>
              </div>
              <p className="mt-2 text-xs text-rose-950 leading-relaxed font-medium bg-rose-50/80 p-3 rounded-lg border border-rose-200">
                {errorMessage || 'Não foi possível conectar ao endpoint do Google Apps Script.'}
              </p>

              {/* Se for erro de permissão do Google Apps Script, instrução precisa */}
              {isAuthError && (
                <div className="mt-4 rounded-lg bg-amber-50/90 p-4 border border-amber-200 text-xs text-amber-950">
                  <span className="font-bold text-amber-900 block mb-1.5 text-xs uppercase tracking-wide">
                    Como Resolver a Permissão no Google Apps Script:
                  </span>
                  <ol className="list-decimal list-inside space-y-1.5 text-slate-800 leading-relaxed">
                    <li>Abra o script da planilha <strong>CONTROLE DE RESERVAS</strong> no Google Sheets (Extensões &gt; Apps Script).</li>
                    <li>No canto superior direito, clique em <strong>Implantar &gt; Gerenciar implantações</strong>.</li>
                    <li>Clique no ícone de <strong>lápis (Editar)</strong> ao lado da implantação ativa.</li>
                    <li>Em <strong>"Quem pode acessar"</strong>, altere de <em>"Somente eu"</em> para <strong>"Qualquer pessoa"</strong> (Anyone).</li>
                    <li>Em "Versão", selecione <strong>"Nova versão"</strong> e clique em <strong>Implantar</strong>.</li>
                    <li>Em seguida, clique no botão <strong>"Atualizar Agora"</strong> abaixo.</li>
                  </ol>
                </div>
              )}

              <div className="mt-4 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={onRetry}
                  disabled={isRetrying}
                  className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-2xs hover:bg-blue-700 transition-colors disabled:opacity-60"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${isRetrying ? 'animate-spin' : ''}`} />
                  <span>{isRetrying ? 'Testando Conexão...' : 'Testar Conexão Novamente'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Formulário para Atualizar ou Alterar URL */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-2xs">
          <div className="border-b border-slate-100 pb-3 mb-4">
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-blue-600" />
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                URL Oficial do Apps Script Configurada
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Endpoint consultado diretamente pelo backend Node.js (sem expor credenciais nem dados pessoais).
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="script-url-input" className="block text-xs font-semibold text-slate-700 mb-1">
                URL do Web App (/exec)
              </label>
              <input
                id="script-url-input"
                type="url"
                required
                value={appsScriptUrl}
                onChange={(e) => setAppsScriptUrl(e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-xs text-slate-900 font-mono placeholder:text-slate-400 focus:border-blue-600 focus:outline-hidden focus:ring-1 focus:ring-blue-600"
              />
            </div>

            {submitError && (
              <p className="text-xs text-rose-700 bg-rose-50 p-2.5 rounded border border-rose-200 font-medium">
                {submitError}
              </p>
            )}

            <button
              type="submit"
              disabled={isSubmitting || !appsScriptUrl.trim()}
              className="w-full rounded-md bg-slate-900 py-2.5 text-xs font-semibold text-white shadow-2xs hover:bg-slate-800 transition-colors disabled:opacity-50"
            >
              {isSubmitting ? 'Verificando Resposta JSON...' : 'Salvar e Validar Resposta'}
            </button>
          </form>

          <div className="mt-4 text-[11px] text-slate-500 border-t border-slate-100 pt-3 flex items-center justify-between">
            <span><strong>Planilha:</strong> CONTROLE DE RESERVAS</span>
            <span className="font-mono text-slate-400">GID: 1228909225</span>
          </div>
        </div>
      </div>
    </div>
  );
};
