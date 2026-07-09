import { useMemo, useState, type MouseEvent } from 'react';
import { copyToClipboard } from '../../lib/clipboard';
import { formatServerModsConfigSnippet } from '../../lib/modConfig';

interface CopyServerModsButtonProps {
  mods: ReadonlyArray<{ id: string; name: string }>;
  className?: string;
  /** sm = table rows; md = section headers */
  size?: 'sm' | 'md';
}

/** Copies the server's mod list as game.mods[] blocks for config.json. */
export function CopyServerModsButton({
  mods,
  className = '',
  size = 'md',
}: CopyServerModsButtonProps) {
  const [hint, setHint] = useState<string | null>(null);
  const snippet = useMemo(() => formatServerModsConfigSnippet(mods), [mods]);
  const disabled = mods.length === 0;

  const handleCopy = async (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (disabled) return;

    const ok = await copyToClipboard(snippet);
    setHint(ok ? 'Copied' : 'Failed');
    window.setTimeout(() => setHint(null), 2000);
  };

  const pad = size === 'sm' ? 'px-2 py-1 text-[8px]' : 'px-3 py-1.5 text-[9px]';

  return (
    <button
      type="button"
      onClick={(e) => void handleCopy(e)}
      disabled={disabled}
      title={
        disabled
          ? 'No mods to copy'
          : `Copy ${mods.length} mods as config.json entries`
      }
      className={`inline-flex items-center justify-center font-black uppercase tracking-widest border transition-colors shrink-0 ${pad} ${
        disabled
          ? 'border-white/5 text-gray-700 cursor-not-allowed'
          : 'border-tactical-orange/40 text-tactical-orange hover:bg-tactical-orange hover:text-black'
      } ${className}`}
    >
      {hint ?? 'Copy mods'}
    </button>
  );
}
