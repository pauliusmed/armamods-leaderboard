import { useState } from 'react';
import type { GameType } from '../../api/client';
import { workshopPageUrl, workshopLabel } from '../../lib/workshop';

const COLLAPSE_CHARS = 320;

interface ModWorkshopCopyProps {
  modId: string;
  game?: GameType;
  summary?: string | null;
  description?: string | null;
}

export function ModWorkshopCopy({
  modId,
  game = 'reforger',
  summary,
  description,
}: ModWorkshopCopyProps) {
  const [expanded, setExpanded] = useState(false);
  const workshopUrl = workshopPageUrl(modId, game);

  if (!summary && !description) return null;

  const needsCollapse = (description?.length ?? 0) > COLLAPSE_CHARS;
  const descriptionText = description ?? '';
  const visibleDescription =
    needsCollapse && !expanded ? `${descriptionText.slice(0, COLLAPSE_CHARS).trim()}…` : descriptionText;

  return (
    <section className="space-y-4 border border-white/5 bg-zinc-950/40 p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 border-b border-white/5 pb-4">
        <div>
          <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500">
            Workshop Intel
          </h2>
          <p className="text-[9px] font-bold uppercase tracking-widest text-gray-600 mt-1">
            Summary & description from {workshopLabel(game)} — not BattleMetrics stats
          </p>
        </div>
        <a
          href={workshopUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 text-[9px] font-black uppercase tracking-widest text-tactical-orange hover:underline"
        >
          {workshopLabel(game)} ↗
        </a>
      </div>

      {summary && (
        <div className="space-y-1">
          <h3 className="text-[9px] font-black uppercase tracking-[0.25em] text-gray-600">Summary</h3>
          <p className="text-sm sm:text-base text-gray-200 leading-relaxed">{summary}</p>
        </div>
      )}

      {description && (
        <div className="space-y-2">
          <h3 className="text-[9px] font-black uppercase tracking-[0.25em] text-gray-600">Description</h3>
          <div className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">{visibleDescription}</div>
          {needsCollapse && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="text-[9px] font-black uppercase tracking-widest text-tactical-orange hover:underline"
            >
              {expanded ? 'Show less' : 'Read full description'}
            </button>
          )}
        </div>
      )}
    </section>
  );
}
