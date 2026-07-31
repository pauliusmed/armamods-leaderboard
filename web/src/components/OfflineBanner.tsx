import { useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';

export function OfflineBanner() {
  const [online, setOnline] = useState(navigator.onLine);

  useEffect(() => {
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  if (online) return null;

  return (
    <div className="sticky top-[72px] sm:top-[84px] z-40 px-4 py-2 bg-amber-900/80 border-b border-amber-600/30 backdrop-blur-sm text-center">
      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-200 flex items-center justify-center gap-2">
        <AlertTriangle size={12} className="shrink-0" />
        UPLINK LOST — Showing cached telemetry
      </p>
    </div>
  );
}
