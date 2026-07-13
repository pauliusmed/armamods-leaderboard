

interface StatusStateProps {
  type: 'loading' | 'error' | 'empty';
  message?: string;
  details?: string;
  onAction?: () => void;
  actionText?: string;
  retryCount?: number;
}

export function StatusState({ type, message, details, onAction, actionText, retryCount }: StatusStateProps) {
  const getIcon = () => {
    switch (type) {
      case 'loading': return (
        <div className="relative">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-3 h-3 bg-signal-ok animate-pulse" style={{ animationDuration: '500ms' }}></div>
            <div className="w-2 h-2 bg-signal-ok/60 animate-pulse delay-100" style={{ animationDuration: '500ms' }}></div>
            <div className="w-2 h-2 bg-signal-ok/40 animate-pulse delay-200" style={{ animationDuration: '500ms' }}></div>
            <div className="w-1 h-1 bg-signal-ok/20 animate-pulse delay-300" style={{ animationDuration: '500ms' }}></div>
          </div>
          <div className="text-[8px] text-signal-neutral font-mono uppercase tracking-[0.3em] space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-signal-info">▸</span>
              <span>Establishing Uplink...</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-signal-info">▸</span>
              <span>Fetching Telemetry...</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-signal-info animate-pulse">▸</span>
              <span className="animate-pulse">Processing Intel...</span>
            </div>
            {retryCount != null && retryCount > 0 && (
              <div className="flex items-center gap-2 mt-3 pt-2 border-t border-white/5">
                <span className="text-signal-critical">⚠</span>
                <span className="text-signal-critical">
                  UPLINK LOST — Auto-retrying ({retryCount}/3)...
                </span>
              </div>
            )}
          </div>
        </div>
      );
      case 'error': return (
        <div className="text-6xl mb-6">
          <div className="w-24 h-24 border-2 border-signal-critical/40 flex items-center justify-center bg-[#172635]">
            <span className="text-signal-critical text-4xl font-bold">!</span>
          </div>
        </div>
      );
      case 'empty': return (
        <div className="text-6xl mb-6">
          <div className="w-24 h-24 border-2 border-signal-warning/40 flex items-center justify-center bg-[#172635]">
            <span className="text-signal-warning text-4xl font-bold">Ø</span>
          </div>
        </div>
      );
    }
  };

  const signalColor = {
    loading: 'text-signal-ok',
    error: 'text-signal-critical',
    empty: 'text-signal-warning'
  };

  return (
    <div className={`
      flex flex-col items-center justify-center min-h-[500px] w-full
      bg-[#101923] border border-white/5 p-16
    `}>
      <div className="mb-8">
        {getIcon()}
      </div>
      <h3 className={`text-3xl font-black ${signalColor[type]} mb-4 uppercase tracking-widest`}>
        {message || (type === 'loading' ? 'ESTABLISHING UPLINK' : type === 'error' ? 'UPLINK LOST' : 'NO DATA FOUND')}
      </h3>
      {details && (
        <p className="text-signal-neutral max-w-md mx-auto mb-10 text-sm font-medium uppercase tracking-wider text-center">
          {details}
        </p>
      )}
      {onAction && actionText && (
        <button
          onClick={onAction}
          className={`
            px-8 py-4 bg-tactical-orange text-black
            hover:bg-white transition-all font-black uppercase tracking-widest text-xs
          `}
        >
          {actionText}
        </button>
      )}
    </div>
  );
}
