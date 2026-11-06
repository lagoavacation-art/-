import React, { useState, useEffect } from 'react';
import { Database, Check, Copy, ExternalLink, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react';
import { BIDataset } from '../../types/bi';

interface SettingsViewProps {
  dataset?: BIDataset;
  onRefreshData: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ dataset, onRefreshData }) => {
  const [appsScriptUrl, setAppsScriptUrl] = useState('');
  const [autoRefreshMinutes, setAutoRefreshMinutes] = useState(5);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [codeCopied, setCodeCopied] = useState(false);
  const [codeContent, setCodeContent] = useState('');

  // Carrega configuração salva no backend
  useEffect(() => {
    fetch('/api/config')
      .then(res => res.json())
      .then(data => {
        if (data.appsScriptUrl) setAppsScriptUrl(data.appsScriptUrl);
        if (data.autoRefreshMinutes) setAutoRefreshMinutes(data.autoRefreshMinutes);
      })
      .catch(err => console.error('Erro ao carregar config:', err));

    // Carrega o código do Code.gs para exibição
    fetch('/Code.gs')
      .then(res => res.text())
      .then(text => setCodeContent(text))
      .catch(() => {
        setCodeContent('// Visualize o arquivo Code.gs no repositório');
      });
  }, []);

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(null);
    setSaveError(null);

    try {
      const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appsScriptUrl,
          autoRefreshMinutes
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Erro ao salvar configuração');
      }

      setSaveSuccess(
        data.testResult
          ? `Conexão validada! ${data.testResult.totalCasais.toLocaleString('pt-BR')} casais válidos contabilizados com sucesso.`
          : 'Configurações salvas com sucesso.'
      );
      if (data.testError) {
        setSaveError(`Aviso: ${data.testError}`);
      }

      onRefreshData();
    } catch (err: any) {
      setSaveError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopyCode = () => {
    if (codeContent) {
      navigator.clipboard.writeText(codeContent);
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 3000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Formulário de Configuração do Endpoint */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs">
        <div className="border-b border-slate-100 pb-4 mb-5">
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5 text-blue-600" />
            <h2 className="text-sm font-bold text-slate-900">
              Conexão com Google Sheets via Google Apps Script
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Conecte o painel ao endpoint HTTPS do Web App executado no Google Apps Script da planilha.
          </p>
        </div>

        <form onSubmit={handleSaveConfig} className="space-y-4">
          <div>
            <label htmlFor="script-url" className="block text-xs font-bold text-slate-800 mb-1">
              URL do Web App do Google Apps Script (/exec)
            </label>
            <div className="relative">
              <input
                id="script-url"
                type="url"
                placeholder="https://script.google.com/macros/s/.../exec"
                value={appsScriptUrl}
                onChange={(e) => setAppsScriptUrl(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-hidden focus:ring-1 focus:ring-blue-600 font-mono"
              />
            </div>
            <p className="mt-1.5 text-[11px] text-slate-500">
              O backend Node.js consultará essa URL no servidor e tratará respostas com segurança. O navegador nunca faz requisições diretas ao Apps Script.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-2">
            <div className="w-full sm:w-60">
              <label htmlFor="refresh-interval" className="block text-xs font-semibold text-slate-700 mb-1">
                Intervalo de Atualização Automática
              </label>
              <select
                id="refresh-interval"
                value={autoRefreshMinutes}
                onChange={(e) => setAutoRefreshMinutes(Number(e.target.value))}
                className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 focus:border-blue-500 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
              >
                <option value={1}>A cada 1 minuto</option>
                <option value={5}>A cada 5 minutos (Padrão)</option>
                <option value={10}>A cada 10 minutos</option>
                <option value={15}>A cada 15 minutos</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 transition-colors disabled:opacity-60"
            >
              {isSaving ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Testando e Salvando...</span>
                </>
              ) : (
                <span>Testar e Salvar Conexão</span>
              )}
            </button>
          </div>

          {/* Feedback de Salvar */}
          {saveSuccess && (
            <div className="rounded-lg bg-emerald-50 p-3 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>{saveSuccess}</span>
            </div>
          )}

          {saveError && (
            <div className="rounded-lg bg-rose-50 p-3 border border-rose-200 text-xs text-rose-800 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
              <span>{saveError}</span>
            </div>
          )}

          {dataset?.warning && (
            <div className="rounded-lg bg-amber-50 p-3.5 border border-amber-200 text-xs text-amber-900 flex items-start gap-2.5">
              <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block mb-0.5">Informações de Integração com a Planilha</span>
                <p className="text-amber-800 leading-relaxed">{dataset.warning}</p>
              </div>
            </div>
          )}
        </form>
      </div>

      {/* Tutorial Passo a Passo de Publicação */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs">
        <h3 className="text-sm font-bold text-slate-900 mb-3">
          Como Publicar o Google Apps Script na Planilha Original
        </h3>
        <ol className="list-decimal list-inside space-y-2.5 text-xs text-slate-700 leading-relaxed">
          <li>
            Abra a planilha oficial do <strong>Grupo Lagoa Quente</strong>:
            <code className="ml-1 text-[11px] bg-slate-100 text-blue-900 px-1 py-0.5 rounded font-mono">
              1fL6-WidpT8Nxsy6w-UCHGJiUjZkSqY0CRc1Ja9i6EnU
            </code>
          </li>
          <li>
            No menu superior do Google Sheets, clique em <strong>Extensões &gt; Apps Script</strong>.
          </li>
          <li>
            Substitua qualquer código existente pelo script <strong>Code.gs</strong> (código fornecido abaixo).
          </li>
          <li>
            No canto superior direito do editor, clique em <strong>Implantar &gt; Nova implantação</strong>.
          </li>
          <li>
            Clique na engrenagem ao lado de "Selecione o tipo" e escolha <strong>App da Web</strong>.
          </li>
          <li>
            Configure:
            <ul className="list-disc list-inside ml-4 mt-1 space-y-1 text-slate-600">
              <li>Executar como: <strong>Eu (sua conta autorizada com acesso à planilha)</strong></li>
              <li>Quem pode acessar: <strong>Qualquer pessoa</strong> (permite que o backend consulte sem OAuth)</li>
            </ul>
          </li>
          <li>
            Clique em <strong>Implantar</strong>, autorize o acesso da sua conta e copie a <strong>URL do App da Web</strong> (termina em <code className="font-mono text-blue-700">/exec</code>).
          </li>
          <li>
            Cole a URL no campo acima e clique em <strong>Testar e Salvar Conexão</strong>.
          </li>
        </ol>
      </div>

      {/* Visualizador de Código Code.gs com Copiar em 1 Clique */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-2xs overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3.5 bg-slate-50">
          <div>
            <h3 className="text-xs font-bold text-slate-900">
              Arquivo: Code.gs (Script Oficial do Lagoa BI)
            </h3>
            <p className="text-[11px] text-slate-500">
              Código seguro: entrega exclusivamente indicadores quantitativos agregados sem expor dados confidenciais
            </p>
          </div>
          <button
            type="button"
            onClick={handleCopyCode}
            className="flex items-center gap-1.5 rounded-md bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 transition-colors"
          >
            {codeCopied ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-400" />
                <span>Copiado!</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                <span>Copiar Código</span>
              </>
            )}
          </button>
        </div>
        <div className="p-4 bg-slate-900 text-slate-200 text-xs font-mono max-h-96 overflow-y-auto">
          <pre>{codeContent || '// Carregando Code.gs...'}</pre>
        </div>
      </div>
    </div>
  );
};
