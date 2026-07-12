import { Link } from 'react-router-dom';
import { Card, CardContent } from './ui/Card';

export function SupportPage() {
  return (
    <div className="max-w-3xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header */}
      <div className="text-center space-y-6 pt-12">
        <div className="inline-flex items-center gap-4 px-6 py-3 bg-[#172635] border border-white/5">
          <span className="text-tactical-orange font-black text-[10px] uppercase tracking-[0.3em]">
            // Support The Project
          </span>
        </div>
        <h1 className="text-5xl md:text-6xl font-black text-white uppercase tracking-tighter leading-none italic">
          Built By The Community
        </h1>
        <p className="text-gray-500 font-bold uppercase tracking-[0.2em] text-sm max-w-2xl mx-auto">
          Free. No ads. No tracking. Just pure mod intelligence for Arma Reforger players.
        </p>
      </div>

      {/* Main Message */}
      <Card>
        <CardContent className="p-10 space-y-8">
          <div className="space-y-4">
            <h2 className="text-2xl font-black text-white uppercase tracking-tighter">
              Why This Exists
            </h2>
            <p className="text-gray-400 text-sm leading-relaxed">
              I built this because finding good Arma Reforger mods is harder than it should be. 
              The official workshop shows likes and subscribes, but that doesn't tell you what's 
              <span className="text-white font-bold"> actually being played</span>.
            </p>
            <p className="text-gray-400 text-sm leading-relaxed">
              This platform tracks real server data - which mods are active, which servers are 
              popular, what's trending right now. No fluff, just real player telemetry.
            </p>
          </div>

          <div className="pt-6 border-t border-white/5">
            <h3 className="text-lg font-black text-white uppercase tracking-widest mb-4">
              What Your Support Enables
            </h3>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <span className="text-tactical-orange font-black">✓</span>
                <div>
                  <p className="text-white font-bold text-sm uppercase tracking-wider">Keep it running</p>
                  <p className="text-gray-500 text-xs mt-1">Domain renewal and infrastructure costs</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-tactical-orange font-black">✓</span>
                <div>
                  <p className="text-white font-bold text-sm uppercase tracking-wider">More frequent updates</p>
                  <p className="text-gray-500 text-xs mt-1">Hourly data collection instead of daily</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-tactical-orange font-black">✓</span>
                <div>
                  <p className="text-white font-bold text-sm uppercase tracking-wider">New features</p>
                  <p className="text-gray-500 text-xs mt-1">Historical trends, mod reviews, better search</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Simple Goal */}
      <div className="text-center space-y-6 py-8">
        <p className="text-gray-500 text-sm font-medium uppercase tracking-[0.2em]">
          Target Goal
        </p>
        <div className="text-6xl font-black text-tactical-orange">€100</div>
        <p className="text-gray-500 text-xs font-medium uppercase tracking-wider max-w-md mx-auto">
          First milestone - covers domain and basic infrastructure for the year
        </p>
      </div>

      {/* CTA Section */}
      <div className="text-center space-y-8 pt-8 pb-12">
        <a
          href="https://www.paypal.com/paypalme/sachta2023"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-4 px-12 py-6 bg-tactical-orange text-black font-black uppercase tracking-widest text-sm hover:bg-white transition-all shadow-[0_0_30px_rgba(255,107,0,0.4)] hover:shadow-[0_0_60px_rgba(255,107,0,0.6)]"
        >
          <span>❤️</span>
          <span>Support the Project</span>
        </a>

        <p className="text-gray-600 text-[9px] font-medium uppercase tracking-[0.3em]">
          Any amount helps • No pressure • Much appreciated
        </p>

        <div className="flex items-center justify-center gap-8 pt-12 border-t border-white/5">
          <Link
            to="/"
            className="text-gray-600 hover:text-white text-[9px] font-black uppercase tracking-[0.3em] transition-colors"
          >
            ← Back to Mods
          </Link>
          <Link
            to="/servers"
            className="text-gray-600 hover:text-white text-[9px] font-black uppercase tracking-[0.3em] transition-colors"
          >
            View Servers →
          </Link>
        </div>
      </div>
    </div>
  );
}
