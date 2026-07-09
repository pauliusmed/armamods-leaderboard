import { useMemo, useState } from 'react';
import type { GameType } from '../../api/client';
import { copyToClipboard } from '../../lib/clipboard';
import { formatModConfigPreview, formatModConfigSnippet } from '../../lib/modConfig';
import { workshopPageUrl, workshopLabel } from '../../lib/workshop';
import { ModThumbnail } from './ModThumbnail';
import { useWorkshopStatus } from './ModWorkshopStatus';
import type { WorkshopAvailability } from '../../types';

interface ModConfigPanelProps {
  modId: string;
  modName: string;
  game?: GameType;
  workshopStatus?: WorkshopAvailability;
}

const BTN =
  'flex flex-1 items-center justify-center py-2.5 min-h-10 text-[10px] font-black uppercase tracking-widest transition-colors';

export function ModConfigPanel({
  modId,
  modName,
  game = 'reforger',
  workshopStatus: initialWorkshopStatus,
}: ModConfigPanelProps) {
  const [snippetOpen, setSnippetOpen] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const copySnippet = useMemo(() => formatModConfigSnippet(modId, modName), [modId, modName]);
  const previewSnippet = useMemo(() => formatModConfigPreview(modId, modName), [modId, modName]);
  const isReforger = game === 'reforger';
  const { isUnavailable: workshopUnavailable } = useWorkshopStatus(modId, game, {
    initialStatus: initialWorkshopStatus,
  });

  const handleCopy = async () => {
    const ok = await copyToClipboard(copySnippet);
    setHint(ok ? 'Copied to clipboard' : 'Copy failed — select text manually');
    window.setTimeout(() => setHint(null), 2000);
  };

  return (
    <div className="border border-white/10 bg-zinc-900/50 flex flex-col w-full">
      <div className="p-4 flex flex-col gap-3 w-full">
        <div className="flex items-start gap-3 min-w-0">
          <ModThumbnail modId={modId} modName={modName} game={game} size="sm" className="shrink-0" />
          <div className="min-w-0 pt-0.5">
            <p className="text-[9px] text-gray-600 font-black uppercase tracking-[0.2em]">
              Server config
            </p>
            <p className="text-[11px] font-bold text-white leading-snug line-clamp-3 mt-1" title={modName}>
              {modName}
            </p>
          </div>
        </div>

        {isReforger ? (
          <div className="space-y-2 w-full">
            <div className="flex gap-2 w-full">
              <button
                type="button"
                onClick={() => void handleCopy()}
                aria-label={`Copy ${modName} config snippet`}
                className={`${BTN} bg-tactical-orange text-black hover:bg-white`}
              >
                Copy
              </button>
              {workshopUnavailable ? (
                <span
                  className={`${BTN} border border-amber-500/30 bg-amber-500/10 text-amber-200/70 cursor-not-allowed text-center px-1`}
                  title="No longer on Reforger Workshop"
                >
                  Removed
                </span>
              ) : (
                <a
                  href={workshopPageUrl(modId, game)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`${BTN} border border-tactical-orange/50 bg-tactical-orange/10 text-tactical-orange hover:bg-tactical-orange hover:text-black`}
                >
                  Workshop ↗
                </a>
              )}
            </div>

            <button
              type="button"
              onClick={() => setSnippetOpen((open) => !open)}
              aria-expanded={snippetOpen}
              className="w-full text-[9px] font-black uppercase tracking-[0.15em] text-gray-500 hover:text-tactical-orange transition-colors text-left"
            >
              {snippetOpen ? '− Hide config snippet' : '+ Show config snippet'}
            </button>

            {snippetOpen && (
              <pre className="w-full min-w-0 overflow-x-auto p-3 bg-black/40 border border-white/5 text-[10px] leading-relaxed text-emerald-200/90 font-mono whitespace-pre">
                {previewSnippet}
              </pre>
            )}
          </div>
        ) : (
          <a
            href={workshopPageUrl(modId, game)}
            target="_blank"
            rel="noopener noreferrer"
            className={`${BTN} w-full border border-tactical-orange/50 bg-tactical-orange/10 text-tactical-orange hover:bg-tactical-orange hover:text-black`}
          >
            {workshopLabel(game)} ↗
          </a>
        )}

        <p
          role="status"
          aria-live="polite"
          className={`text-[9px] font-black uppercase tracking-[0.15em] text-center min-h-[14px] ${
            hint ? 'text-tactical-orange' : 'text-transparent'
          }`}
        >
          {hint ?? '\u00a0'}
        </p>
      </div>
    </div>
  );
}
