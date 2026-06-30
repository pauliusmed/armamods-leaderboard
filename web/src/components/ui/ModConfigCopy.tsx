import { useMemo, useState } from 'react';
import { copyToClipboard } from '../../lib/clipboard';
import { formatModConfigSnippet } from '../../lib/modConfig';

interface ModConfigCopyProps {
  modId: string;
  modName: string;
}

const BTN =
  'inline-flex items-center px-5 py-3 border text-[10px] font-black uppercase tracking-widest transition-all';

export function ModConfigCopy({ modId, modName }: ModConfigCopyProps) {
  const [preview, setPreview] = useState(false);
  const [hint, setHint] = useState<string | null>(null);

  const snippet = useMemo(() => formatModConfigSnippet(modId, modName), [modId, modName]);

  const showHint = (message: string) => {
    setHint(message);
    window.setTimeout(() => setHint(null), 2500);
  };

  const handleCopy = async () => {
    const ok = await copyToClipboard(snippet);
    showHint(ok ? 'Copied' : 'Copy failed');
  };

  return (
    <>
      <button
        type="button"
        onClick={() => void handleCopy()}
        className={`${BTN} border-tactical-orange/30 bg-tactical-orange/10 text-tactical-orange hover:bg-tactical-orange hover:text-black`}
      >
        Copy config.json
      </button>
      <button
        type="button"
        onClick={() => setPreview((v) => !v)}
        className={`${BTN} border-white/10 text-gray-500 hover:text-white hover:border-white/20`}
      >
        {preview ? 'Hide' : 'Preview'}
      </button>

      {(preview || hint) && (
        <div className="w-full basis-full mt-2 space-y-3">
          {hint && (
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-tactical-orange">{hint}</p>
          )}
          {preview && (
            <pre className="overflow-x-auto p-4 bg-zinc-900 border border-white/5 text-[11px] leading-relaxed text-emerald-200/90 font-mono">
              {snippet}
            </pre>
          )}
        </div>
      )}
    </>
  );
}
