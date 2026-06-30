import { useMemo, useState } from 'react';
import type { GameType } from '../../api/client';
import { copyToClipboard } from '../../lib/clipboard';
import { formatModConfigSnippet } from '../../lib/modConfig';
import { workshopPageUrl, workshopLabel } from '../../lib/workshop';

interface ModConfigPanelProps {
  modId: string;
  modName: string;
  game?: GameType;
}

export function ModConfigPanel({ modId, modName, game = 'reforger' }: ModConfigPanelProps) {
  const [hint, setHint] = useState<string | null>(null);
  const snippet = useMemo(() => formatModConfigSnippet(modId, modName), [modId, modName]);

  const handleCopy = async () => {
    const ok = await copyToClipboard(snippet);
    setHint(ok ? 'Copied' : 'Copy failed');
    window.setTimeout(() => setHint(null), 2500);
  };

  return (
    <div className="border border-white/5 bg-zinc-900/60 p-4 space-y-3">
      <p className="text-[9px] text-gray-600 font-black uppercase tracking-[0.25em]">
        game.mods[]
      </p>

      <pre className="overflow-x-auto text-[10px] leading-relaxed text-emerald-200/90 font-mono whitespace-pre">
        {snippet}
      </pre>

      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={() => void handleCopy()}
          className="w-full px-4 py-2.5 bg-tactical-orange text-black text-[10px] font-black uppercase tracking-widest hover:bg-white transition-colors"
        >
          Copy
        </button>
        <a
          href={workshopPageUrl(modId, game)}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full text-center px-4 py-2.5 border border-tactical-orange/30 text-tactical-orange hover:bg-tactical-orange/10 text-[10px] font-black uppercase tracking-widest transition-colors"
        >
          {workshopLabel(game)} ↗
        </a>
      </div>

      {hint && (
        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-tactical-orange text-center">
          {hint}
        </p>
      )}
    </div>
  );
}
