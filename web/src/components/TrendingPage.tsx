import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { trendingApi, type GameType } from '../api/client';
import { StatusState } from './ui/StatusState';
import { SEO } from './ui/SEO';
import { Card, CardContent } from './ui/Card';
import type { TrendingMod, TrendPeriod } from '../types';

type TrendCategory = 'rising' | 'falling' | 'new';

interface TrendingPageProps {
  game?: GameType;
}

export function TrendingPage({ game = 'reforger' }: TrendingPageProps) {
  const gp = game === 'reforger' ? '' : `/${game}`;
  const [trending, setTrending] = useState<{
    rising: TrendingMod[];
    falling: TrendingMod[];
    new: TrendingMod[];
  }>({ rising: [], falling: [], new: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<TrendCategory>('rising');
  const [activePeriod, setActivePeriod] = useState<TrendPeriod>('30d');
  const [comparisonDate, setComparisonDate] = useState<string | null>(null);

  const loadTrending = useCallback(async () => {
    try {
      setLoading(true);
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
      setError(err instanceof Error ? err.message : 'Failed to load trending data');
    } finally {
      setLoading(false);
    }
  }, [activePeriod, game]);

  useEffect(() => {
    loadTrending();
  }, [loadTrending]);

  if (loading) return <StatusState type="loading" />;
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

  const currentMods = trending[activeCategory] || [];
  const hasNoData = !currentMods || currentMods.length === 0;

  // Sort mods based on category
  const sortedCurrentMods = Array.isArray(currentMods)
    ? activeCategory === 'new'
      ? [...currentMods].sort((a, b) => (a.overallRank || 9999) - (b.overallRank || 9999))
      : activeCategory === 'rising'
        ? [...currentMods].sort((a, b) => {
            const changeA = (a.prevRank || 9999) - (a.currentRank || 9999);
            const changeB = (b.prevRank || 9999) - (b.currentRank || 9999);
            return changeB - changeA; // Biggest improvement first
          })
        : activeCategory === 'falling'
          ? [...currentMods].sort((a, b) => {
              const changeA = (a.prevRank || 9999) - (a.currentRank || 9999);
              const changeB = (b.prevRank || 9999) - (b.currentRank || 9999);
              return changeA - changeB; // Biggest drop first
            })
          : currentMods
    : currentMods;

  const getCategoryLabel = (cat: TrendCategory) => {
    switch (cat) {
      case 'rising': return '📈 Rising Mods';
      case 'falling': return '📉 Falling Mods';
      case 'new': return '⭐ New Mods';
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
            {(['24h', '7d', '30d'] as TrendPeriod[]).map((period) => (
              <button
                key={period}
                onClick={() => setActivePeriod(period)}
                className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-widest transition-all ${
                  activePeriod === period
                    ? 'bg-white text-black'
                    : 'bg-zinc-800 text-gray-400 hover:text-white'
                }`}
              >
                {period === '24h' ? '24h' : period === '7d' ? '7d' : '30d'}
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
        <div className="flex gap-2">
          {(['rising', 'falling', 'new'] as TrendCategory[]).map((category) => (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              className={`px-4 py-2 font-black uppercase tracking-widest text-[11px] transition-all border ${
                activeCategory === category
                  ? 'bg-tactical-orange text-black border-tactical-orange'
                  : 'bg-transparent text-gray-500 border-white/10 hover:border-white/30 hover:text-white'
              }`}
            >
              {getCategoryLabel(category)}
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sortedCurrentMods.map((mod) => (
              <Card key={mod.id} className="border-l-4 border-l-zinc-800 hover:border-l-tactical-orange transition-all group">
                <CardContent className="p-6 space-y-4">
                  <div className="space-y-2">
                    <Link to={`${gp}/mod/${mod.id}`}>
                      <h3 className="text-lg font-black text-white uppercase leading-tight group-hover:text-tactical-orange transition-colors">
                        {mod.name}
                      </h3>
                    </Link>
                    <p className="text-[9px] font-mono text-gray-600 font-bold uppercase tracking-widest truncate">
                      {mod.id}
                    </p>
                  </div>

                  {/* Rank Badge */}
                  <div className="flex items-center justify-between border-t border-white/5 pt-3">
                    <div className="flex gap-4">
                      <div className="space-y-1">
                        <p className="text-[8px] text-gray-600 font-black uppercase tracking-[0.2em]">Overall Rank</p>
                        <p className="text-xl font-black text-white">#{mod.overallRank}</p>
                      </div>
                    </div>
                    {activeCategory !== 'new' && mod.prevRank != null && mod.currentRank != null && (
                      <div className="text-right">
                        <p className="text-[8px] text-gray-600 font-black uppercase tracking-[0.2em]">Rank Change</p>
                        <p className={`text-sm font-black ${mod.currentRank < mod.prevRank ? 'text-green-500' : 'text-red-500'}`}>
                          {mod.currentRank < mod.prevRank ? '↑' : '↓'} {Math.abs(mod.currentRank - mod.prevRank)} positions
                        </p>
                        <p className="text-[8px] text-gray-700 font-mono">#{mod.prevRank} → #{mod.currentRank}</p>
                      </div>
                    )}
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-4 border-t border-white/5 pt-3">
                    <div className="space-y-1">
                      <p className="text-[8px] text-gray-600 font-black uppercase tracking-[0.2em]">Personnel</p>
                      <p className="text-sm font-black text-white font-mono">{mod.totalPlayers.toLocaleString()}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[8px] text-gray-600 font-black uppercase tracking-[0.2em]">Deployments</p>
                      <p className="text-sm font-black text-white font-mono">{mod.serverCount}</p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3 pt-1">
                    <Link
                      to={`${gp}/mod/${mod.id}`}
                      className="flex-1 px-3 py-2 bg-white/5 border border-white/10 text-[9px] font-black text-gray-400 text-center uppercase tracking-widest hover:bg-tactical-orange hover:text-black transition-all"
                    >
                      Full Intel
                    </Link>
                    <a
                      href={/^\d+$/.test(mod.id)
                        ? `https://steamcommunity.com/sharedfiles/filedetails/?id=${mod.id}`
                        : `https://reforger.armaplatform.com/workshop/${mod.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-2 bg-white/5 border border-white/10 text-[9px] font-black text-gray-400 uppercase tracking-widest hover:bg-white hover:text-black transition-all"
                    >
                      Workshop ↗
                    </a>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
