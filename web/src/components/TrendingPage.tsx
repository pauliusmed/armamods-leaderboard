import { useEffect, useState, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { trendingApi, type GameType } from '../api/client';
import { StatusState } from './ui/StatusState';
import { SEO } from './ui/SEO';
import { TrendRow } from './TrendRow';
import type { TrendingMod, TrendPeriod } from '../types';

type TrendCategory = 'rising' | 'falling' | 'new';

interface TrendingPageProps {
  game?: GameType;
}

export function TrendingPage({ game = 'reforger' }: TrendingPageProps) {
  const [trending, setTrending] = useState<{
    rising: TrendingMod[];
    falling: TrendingMod[];
    new: TrendingMod[];
  }>({ rising: [], falling: [], new: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);
  const [activeCategory, setActiveCategory] = useState<TrendCategory>('rising');
  const [activePeriod, setActivePeriod] = useState<TrendPeriod>('30d');
  const [comparisonDate, setComparisonDate] = useState<string | null>(null);

  const loadTrending = useCallback(async (isRetry = false) => {
    try {
      if (isRetry) setRetrying(true);
      else setLoading(true);
      const data = await trendingApi.getTrending(activePeriod, game);

      if (data && data.data) {
        setTrending({
          rising: data.data.rising,
          falling: data.data.falling,
          new: data.data.new
        });
      }

      setComparisonDate(data?.meta?.comparisonDate || null);
      setError(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load trending data';
      const isTimeout = msg.includes('503') || msg.includes('timeout') || msg.includes('502') || msg.includes('504');
      if (isTimeout) {
        // Auto-retry transients: 503, timeout, 502, 504
        for (let attempt = 1; attempt <= 3; attempt++) {
          await new Promise((r) => setTimeout(r, 2000 * attempt));
          setRetrying(true);
          try {
            const data = await trendingApi.getTrending(activePeriod, game);
            if (data?.data) {
              setTrending({
                rising: data.data.rising,
                falling: data.data.falling,
                new: data.data.new
              });
            }
            setComparisonDate(data?.meta?.comparisonDate || null);
            setError(null);
            setLoading(false);
            setRetrying(false);
            return;
          } catch {
            // continue retrying
          }
        }
      }
      setError(msg);
      setRetrying(false);
    } finally {
      setLoading(false);
      setRetrying(false);
    }
  }, [activePeriod, game]);

  useEffect(() => {
    loadTrending();
  }, [loadTrending]);

  const currentMods = trending[activeCategory] || [];
  const hasNoData = !currentMods || currentMods.length === 0;

  // Sort mods based on category
  const sortedCurrentMods = useMemo(() => {
    if (!Array.isArray(currentMods)) return currentMods;
    if (activeCategory === 'new') {
      return [...currentMods].sort((a, b) => (a.overallRank || 9999) - (b.overallRank || 9999));
    }
    if (activeCategory === 'rising') {
      return [...currentMods].sort((a, b) => {
        const changeA = (a.prevRank || 9999) - (a.currentRank || 9999);
        const changeB = (b.prevRank || 9999) - (b.currentRank || 9999);
        return changeB - changeA;
      });
    }
    if (activeCategory === 'falling') {
      return [...currentMods].sort((a, b) => {
        const changeA = (a.prevRank || 9999) - (a.currentRank || 9999);
        const changeB = (b.prevRank || 9999) - (b.currentRank || 9999);
        return changeA - changeB;
      });
    }
    return currentMods;
  }, [currentMods, activeCategory]);



  if (loading || retrying) return <StatusState type="loading" />;
  if (error) return (
    <div className="space-y-8">
      <StatusState
        type="error"
        message={error}
        onAction={loadTrending}
        actionText="Retry"
      />
      <Link to="/" className="block text-center text-tactical-orange font-black uppercase tracking-[0.4em] text-[10px] hover:underline">
        ← Return to Database
      </Link>
    </div>
  );

  const getCategoryLabel = (cat: TrendCategory, short = false) => {
    switch (cat) {
      case 'rising': return short ? '📈 Rising' : '📈 Rising Mods';
      case 'falling': return short ? '📉 Falling' : '📉 Falling Mods';
      case 'new': return short ? '⭐ New' : '⭐ New Mods';
    }
  };

  const getCategoryDescription = (cat: TrendCategory) => {
    switch (cat) {
      case 'rising': return 'Modules gaining significant traction across the network';
      case 'falling': return 'Modules experiencing declining activity';
      case 'new': return 'Recently detected modules in the registry';
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      <SEO
        title={`Trending ${activePeriod} - ${game === 'reforger' ? 'Arma Reforger' : 'Arma 3'}`}
        description={`See which mods are trending in ${game === 'reforger' ? 'Arma Reforger' : 'Arma 3'} over the last ${activePeriod}. Track rising stars, falling giants, and new discoveries.`}
      />
      {/* Compact control bar */}
      <div className="border-b border-white/10 pb-4 space-y-4">
        {/* Row 1: Title + Period selector */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-baseline gap-4">
            <h1 className="text-2xl font-black text-white uppercase tracking-tighter">
              Trending
            </h1>
            <p className="text-gray-600 text-[10px] font-bold uppercase tracking-[0.2em]">
              vs {comparisonDate ? new Date(comparisonDate).toLocaleDateString() : 'Baseline'}
            </p>
          </div>
          <div className="flex gap-1">
            {(['7d', '30d'] as TrendPeriod[]).map((period) => (
              <button
                key={period}
                onClick={() => setActivePeriod(period)}
                className={`min-h-11 px-3 py-2 sm:py-1.5 text-[10px] font-black uppercase tracking-widest transition-all ${
                  activePeriod === period
                    ? 'bg-white text-black'
                    : 'bg-zinc-800 text-gray-400 hover:text-white'
                }`}
              >
                {period === '7d' ? '7d' : '30d'}
              </button>
            ))}
          </div>
        </div>

        {/* Row 2: Inline stats */}
        <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-[11px]">
          <span className="text-gray-500 font-bold">
            <span className="text-white font-black">{trending?.rising?.length || 0}</span> Rising
          </span>
          <span className="text-white/10">|</span>
          <span className="text-gray-500 font-bold">
            <span className="text-white font-black">{trending?.falling?.length || 0}</span> Falling
          </span>
          <span className="text-white/10">|</span>
          <span className="text-gray-500 font-bold">
            <span className="text-white font-black">{trending?.new?.length || 0}</span> New
          </span>
        </div>

        {/* Row 3: Category tabs */}
        <div className="flex flex-wrap gap-2">
          {(['rising', 'falling', 'new'] as TrendCategory[]).map((category) => (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              className={`px-3 sm:px-4 py-2 font-black uppercase tracking-widest text-[11px] transition-all border ${
                activeCategory === category
                  ? 'bg-tactical-orange text-black border-tactical-orange'
                  : 'bg-transparent text-gray-500 border-white/10 hover:border-white/30 hover:text-white'
              }`}
            >
              <span className="sm:hidden">{getCategoryLabel(category, true)}</span>
              <span className="hidden sm:inline">{getCategoryLabel(category)}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-gray-500 font-bold uppercase tracking-[0.15em] text-[10px]">
            {getCategoryDescription(activeCategory)}
          </p>
        </div>

        {hasNoData ? (
          <div className="p-20 text-center border-2 border-dashed border-white/5">
            <p className="text-xl font-black text-gray-700 uppercase tracking-widest">
              No data available for this category
            </p>
            <p className="text-gray-600 mt-2">Trending data will be available after the first daily snapshot</p>
          </div>
        ) : (
          <div className="border border-white/5 bg-black/40">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="pl-4 pr-2 py-3 text-left text-[11px] font-black uppercase tracking-[0.1em] text-gray-600">Rank</th>
                    <th className="pr-4 py-3 text-left text-[11px] font-black uppercase tracking-[0.1em] text-gray-600">Module</th>
                    <th className="px-4 py-3 text-left text-[11px] font-black uppercase tracking-[0.1em] text-gray-600">Change</th>
                    <th className="px-4 py-3 text-right text-[11px] font-black uppercase tracking-[0.1em] text-gray-600">Personnel</th>
                    <th className="hidden md:table-cell px-4 py-3 text-right text-[11px] font-black uppercase tracking-[0.1em] text-gray-600">Deploy</th>
                    <th className="pl-2 pr-4 py-3 text-right text-[11px] font-black uppercase tracking-[0.1em] text-gray-600">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedCurrentMods.map((mod: TrendingMod) => (
                    <TrendRow
                      key={mod.id}
                      mod={mod}
                      category={activeCategory}
                      game={game}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
