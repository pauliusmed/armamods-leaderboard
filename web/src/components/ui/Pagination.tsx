interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  /** Footer label, e.g. "Module Slice" on mod leaderboard */
  sliceLabel?: string;
  className?: string;
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  sliceLabel = 'Network Slice',
  className = ''
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const getPageNumbers = () => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    if (currentPage <= 4) return Array.from({ length: 7 }, (_, i) => i + 1);
    if (currentPage >= totalPages - 3) return Array.from({ length: 7 }, (_, i) => totalPages - 6 + i);
    return Array.from({ length: 7 }, (_, i) => currentPage - 3 + i);
  };

  return (
    <div className={`flex flex-col items-center gap-4 sm:gap-6 ${className}`}>
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full">
        <button
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          className="w-full sm:w-auto px-8 py-4 bg-zinc-900 border border-white/10 text-xs font-black text-white hover:bg-tactical-orange hover:text-black disabled:opacity-30 transition-all uppercase tracking-widest italic"
        >
          ← Previous Intel
        </button>

        <div className="flex flex-wrap items-center justify-center gap-2">
          {getPageNumbers().map((pageNum) => {
            const isCurrentPage = pageNum === currentPage;
            return (
              <button
                key={pageNum}
                onClick={() => onPageChange(pageNum)}
                className={`
                  min-w-[44px] h-11 px-3 text-xs font-black uppercase tracking-widest transition-all
                  ${isCurrentPage
                    ? 'bg-tactical-orange text-black border border-tactical-orange'
                    : 'bg-black/40 text-gray-500 border border-white/5 hover:border-tactical-orange/50 hover:text-white'
                  }
                `}
              >
                {pageNum}
              </button>
            );
          })}
        </div>

        <button
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
          className="w-full sm:w-auto px-8 py-4 bg-zinc-900 border border-white/10 text-xs font-black text-white hover:bg-tactical-orange hover:text-black disabled:opacity-30 transition-all uppercase tracking-widest italic"
        >
          Next Sector →
        </button>
      </div>

      <p className="px-8 py-3 bg-black/40 border border-white/5 text-xs font-mono text-gray-500 uppercase tracking-widest">
        {sliceLabel} <span className="text-white font-black">{currentPage}</span> / {totalPages}
      </p>
    </div>
  );
}
