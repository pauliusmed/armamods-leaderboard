import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { GameType } from '../../api/client';
import { copyToClipboard } from '../../lib/clipboard';
import { formatModConfigSnippet } from '../../lib/modConfig';
import { workshopPageUrl, workshopLabel } from '../../lib/workshop';
import { ModThumbnail } from './ModThumbnail';

interface ModConfigPanelProps {
  modId: string;
  modName: string;
  backHref: string;
  game?: GameType;
}

const BTN =
  'flex w-full items-center justify-center py-4 text-[11px] font-black uppercase tracking-widest transition-colors';

export function ModConfigPanel({ modId, modName, backHref, game = 'reforger' }: ModConfigPanelProps) {
  const [hint, setHint] = useState<string | null>(null);
  const snippet = useMemo(() => formatModConfigSnippet(modId, modName), [modId, modName]);
  const isReforger = game === 'reforger';

  const handleCopy = async () => {
    const ok = await copyToClipboard(snippet);
    setHint(ok ? 'Copied' : 'Copy failed');
    window.setTimeout(() => setHint(null), 2500);
  };

  return (
    <div className="border border-white/10 bg-zinc-900/50 flex flex-col overflow-hidden">
      <Link
        to={backHref}
        className="px-4 py-3.5 border-b border-white/5 text-gray-500 hover:text-tactical-orange hover:bg-white/[0.02] text-[10px] font-black uppercase tracking-[0.3em] transition-colors"
      >
        ← [ Back to Registry ]
      </Link>

      <div className="p-4 flex flex-col gap-4">
        <ModThumbnail
          modId={modId}
          modName={modName}
          game={game}
          size="lg"
          className="w-full! max-w-none! aspect-square object-cover border border-white/10"
        />

        {isReforger && (
          <div className="space-y-3">
            <p className="text-[9px] text-gray-600 font-black uppercase tracking-[0.25em] text-center">
              game.mods[]
            </p>
            <pre className="overflow-x-auto p-3 bg-black/40 border border-white/5 text-[10px] leading-relaxed text-emerald-200/90 font-mono whitespace-pre">
              {snippet}
            </pre>
            <button
              type="button"
              onClick={() => void handleCopy()}
              className={`${BTN} bg-tactical-orange text-black hover:bg-white`}
            >
              Copy
            </button>
          </div>
        )}

        <a
          href={workshopPageUrl(modId, game)}
          target="_blank"
          rel="noopener noreferrer"
          className={`${BTN} border-2 border-tactical-orange/50 bg-tactical-orange/10 text-tactical-orange hover:bg-tactical-orange hover:text-black`}
        >
          {workshopLabel(game)} ↗
        </a>

        {hint && (
          <p className="text-[9px] font-black uppercase tracking-[0.2em] text-tactical-orange text-center">
            {hint}
          </p>
        )}
      </div>
    </div>
  );
}
