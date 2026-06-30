import { useMemo, useState } from 'react';
import { copyToClipboard } from '../../lib/clipboard';
import { formatModConfigSnippet } from '../../lib/modConfig';

interface ModConfigCopyProps {
  modId: string;
  modName: string;
}

export function ModConfigCopy({ modId, modName }: ModConfigCopyProps) {
  const [open, setOpen] = useState(false);
  const [hint, setHint] = useState<string | null>(null);

  const snippet = useMemo(() => formatModConfigSnippet(modId, modName), [modId, modName]);

  const showHint = (message: string) => {
    setHint(message);
    window.setTimeout(() => setHint(null), 2500);
  };

  const handleCopy = async () => {
    const ok = await copyToClipboard(snippet);
    showHint(ok ? 'Copied — paste into game.mods[]' : 'Copy failed — allow clipboard access');
  };

  const handleCopyModId = async () => {
    const ok = await copyToClipboard(modId.toUpperCase());
    showHint(ok ? 'Copied modId' : 'Copy failed');
  };

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="inline-flex items-center gap-2 px-5 py-3 border border-white/10 bg-zinc-900 text-gray-400 hover:text-tactical-orange hover:border-tactical-orange/40 text-[10px] font-black uppercase tracking-widest transition-colors"
      >
        {open ? 'Close Config Snippet' : 'Copy config.json Snippet'}
      </button>

      {open && (
        <div className="max-w-xl bg-zinc-900 border border-white/5 p-5 space-y-4">
          <div className="space-y-1">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">
              Paste into game.mods[]
            </p>
            <p className="text-[9px] text-gray-600 font-bold uppercase tracking-widest leading-relaxed">
              Name comes from our database — often more accurate than workshop titles in old configs.
            </p>
          </div>

          <pre className="overflow-x-auto p-4 bg-black/50 border border-white/5 text-[11px] leading-relaxed text-emerald-200/90 font-mono">
            {snippet}
          </pre>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void handleCopy()}
              className="px-4 py-2 bg-tactical-orange text-black text-[10px] font-black uppercase tracking-widest hover:bg-white transition-colors"
            >
              Copy snippet
            </button>
            <button
              type="button"
              onClick={() => void handleCopyModId()}
              className="px-4 py-2 border border-white/10 text-gray-400 hover:text-white text-[10px] font-black uppercase tracking-widest transition-colors"
            >
              Copy modId only
            </button>
          </div>

          {hint && (
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-tactical-orange">{hint}</p>
          )}
        </div>
      )}
    </div>
  );
}
