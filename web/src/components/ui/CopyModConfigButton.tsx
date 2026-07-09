import { useMemo, useState } from 'react';
import { copyToClipboard } from '../../lib/clipboard';
import { formatModConfigSnippet } from '../../lib/modConfig';

interface CopyModConfigButtonProps {
  modId: string;
  modName: string;
  className?: string;
}

export function CopyModConfigButton({ modId, modName, className = '' }: CopyModConfigButtonProps) {
  const [hint, setHint] = useState<'idle' | 'copied' | 'failed'>('idle');
  const snippet = useMemo(() => formatModConfigSnippet(modId, modName), [modId, modName]);

  const handleCopy = async () => {
    const ok = await copyToClipboard(snippet);
    setHint(ok ? 'copied' : 'failed');
    window.setTimeout(() => setHint('idle'), 2000);
  };

  const label = hint === 'copied' ? 'Copied' : hint === 'failed' ? 'Failed' : 'Copy';

  return (
    <button
      type="button"
      onClick={() => void handleCopy()}
      aria-label={`Copy ${modName} config snippet`}
      className={`inline-flex items-center justify-center px-2.5 py-1.5 border text-[9px] font-black uppercase tracking-widest transition-colors ${
        hint === 'copied'
          ? 'border-white/20 bg-white text-black'
          : hint === 'failed'
            ? 'border-red-500/40 text-red-300'
            : 'border-white/20 text-gray-300 hover:border-tactical-orange/50 hover:text-tactical-orange'
      } ${className}`}
    >
      {label}
    </button>
  );
}
