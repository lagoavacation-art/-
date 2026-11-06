import React, { useState } from 'react';
import { RefreshCw, Building2, ChevronDown, ChevronUp, Database } from 'lucide-react';

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
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);
  const [appsScriptUrl, setAppsScriptUrl] = useState(OFFICIAL_URL);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

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
      <div className="w-full max-w-lg space-y-6">
        {/* Brand Header */}
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-blue-900 text-white shadow-md">
            <Building2 className="h-8 w-8" />
          </div>
          <h1 className="mt-4 text-xl font-extrabold text-slate-900 tracking-tight sm:text-2xl">
            LAGOA BI
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-500">
            Controle de Confirmações e Apresentações · Grupo Lagoa Quente
          </p>
        </div>

        {/* Mensagem Executiva Limpa */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 sm:p-8 text-center shadow-2xs">
          <h2 className="text-base font-bold text-slate-900">
            Não foi possível atualizar os dados no momento.
          </h2>
          <p className="mt-2 text-xs sm:text-sm text-slate-600 leading-relaxed max-w-md mx-auto">
            Por favor, tente novamente em instantes. Os indicadores serão restabelecidos assim que a sincronização for concluída.
          </p>

          <div className="mt-6 flex justify-center">
            <button
              type="button"
              onClick={onRetry}
              disabled={isRetrying}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 transition-colors disabled:opacity-60"
            >
              <RefreshCw className={`h-4 w-4 ${isRetrying ? 'animate-spin' : ''}`} />
              <span>{isRetrying ? 'Tentando atualizar...' : 'Tentar novamente'}</span>
            </button>
          </div>
        </div>

        {/* Seção Colapsável de Informações Técnicas (Restrita / Suporte) */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-2xs overflow-hidden">
          <button
            type="button"
            onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
            className="w-full flex items-center justify-between px-5 py-3.5 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors"
          >
            <span>Informações Técnicas & Conexão</span>
            {showTechnicalDetails ? (
              <ChevronUp className="h-4 w-4 text-slate-400" />
            ) : (
              <ChevronDown className="h-4 w-4 text-slate-400" />
            )}
          </button>

          {showTechnicalDetails && (
            <div className="px-5 pb-5 pt-2 border-t border-slate-100 text-xs space-y-4">
              {errorMessage && (
                <div className="rounded-md bg-slate-100 p-3 font-mono text-[11px] text-slate-700 break-words">
                  {errorMessage}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-3">
                <div>
                  <label htmlFor="script-url-input" className="block text-[11px] font-semibold text-slate-700 mb-1">
                    URL do Web App (/exec)
                  </label>
                  <input
                    id="script-url-input"
                    type="url"
                    required
                    value={appsScriptUrl}
                    onChange={(e) => setAppsScriptUrl(e.target.value)}
                    className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-xs text-slate-900 font-mono focus:border-blue-600 focus:outline-hidden"
                  />
                </div>

                {submitError && (
                  <p className="text-[11px] text-rose-700 bg-rose-50 p-2 rounded border border-rose-200">
                    {submitError}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting || !appsScriptUrl.trim()}
                  className="w-full rounded-md bg-slate-900 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? 'Salvando...' : 'Salvar e Validar Conexão'}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
