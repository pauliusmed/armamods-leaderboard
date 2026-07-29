import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  label: string;
  children: ReactNode;
  /** Sheet height. Default: h-5/6 (83% of screen). */
  heightClass?: string;
}

export function BottomSheet({ open, onClose, label, children, heightClass = 'h-5/6' }: BottomSheetProps) {
  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100]">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div
        className={`absolute bottom-0 left-0 right-0 ${heightClass} bg-[#172635] border-t border-white/10 rounded-t-lg flex flex-col animate-slide-up`}
        role="dialog"
        aria-modal="true"
        aria-label={label}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-1 rounded-full bg-white/20" />
            <span className="text-[10px] font-black uppercase tracking-[0.25em] text-gray-400 truncate">{label}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 min-w-11 flex items-center justify-center border border-white/10 text-white hover:border-tactical-orange/50 hover:text-tactical-orange transition-colors text-lg leading-none"
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <div className="flex-1 overflow-auto p-4">
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
}
