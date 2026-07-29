import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { OFFICIAL_SCENARIOS, getOfficialScenarioBySlug } from '../../functions/lib/official-scenarios';
import { SEO } from './ui/SEO';
import { SortableTh } from './ui/SortableTh';
import type { GameType } from '../api/client';
import { OFFICIAL_SCENARIOS_BM_NOTE } from '../lib/siteCopy';

interface OfficialScenariosPageProps {
  game?: GameType;
}

type OfficialSortBy = 'title' | 'scenarioId';
type OfficialSortDir = 'asc' | 'desc';

export function OfficialScenariosPage({ game = 'reforger' }: OfficialScenariosPageProps) {
  const { slug } = useParams<{ slug?: string }>();
  const gp = game === 'reforger' ? '' : `/${game}`;
  const detail = slug ? getOfficialScenarioBySlug(slug) : null;

  if (slug && !detail) {
    return (
      <div className="p-12 text-center text-gray-500">
        <p className="text-[10px] font-black uppercase tracking-widest mb-4">Scenario not found</p>
        <Link to={`${gp}/scenarios/official`} className="text-tactical-orange hover:underline text-sm">
          Back to official list
        </Link>
      </div>
    );
  }

  if (detail) {
    return (
      <div className="space-y-10 animate-in fade-in duration-700">
        <SEO
          title={`${detail.title} — Official Reforger Scenario`}
          description={`${detail.title} is a built-in Arma Reforger scenario. scenarioId: ${detail.scenarioId}`}
          url={`${gp}/scenarios/official/${detail.slug}`}
        />
        <div className="border-b border-white/10 pb-8">
          <Link
            to={`${gp}/scenarios/official`}
            className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-600 hover:text-tactical-orange transition-colors"
          >
            ← Official Scenarios
          </Link>
          <h1 className="mt-4 text-4xl font-black text-white uppercase tracking-tighter">
            {detail.title}
          </h1>
          <p className="mt-2 text-[10px] font-bold uppercase tracking-widest text-gray-500">
            Built-in · No Workshop mod required
          </p>
        </div>

        <div className="bg-zinc-900/50 border border-white/5 p-8 space-y-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-600 mb-2">
              scenarioId
            </p>
            <code className="text-sm font-mono text-tactical-orange break-all">{detail.scenarioId}</code>
          </div>
          <p className="text-sm text-gray-400 leading-relaxed">
            Use this ID in your dedicated server <code className="text-gray-300">config.json</code> under{' '}
            <code className="text-gray-300">game.scenarioId</code>. Official scenarios ship with the base game —
            they do not need a Workshop mod entry in <code className="text-gray-300">game.mods</code>.
          </p>
          <Link
            to={`${gp}/scenarios?s=${encodeURIComponent(detail.bmPatterns[0] ?? detail.title)}`}
            className="inline-block mt-4 text-[10px] font-black uppercase tracking-[0.2em] text-tactical-orange border border-tactical-orange/30 hover:bg-tactical-orange/10 px-4 py-2 transition-colors"
          >
            View live deployments →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      <SEO
        title="Official Arma Reforger Scenarios"
        description="All 31 built-in Reforger scenarios with server config scenarioId paths — Conflict, Game Master, Capture & Hold, and more."
        url={`${gp}/scenarios/official`}
      />
      <div className="border-b border-white/10 pb-8">
        <Link
          to={`${gp}/scenarios`}
          className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-600 hover:text-tactical-orange transition-colors"
        >
          ← Scenario Leaderboard
        </Link>
        <h1 className="mt-4 text-4xl font-black text-white uppercase tracking-tighter">
          Official Scenarios
        </h1>
        <p className="mt-2 text-sm text-gray-500 max-w-2xl">
          {OFFICIAL_SCENARIOS.length} {OFFICIAL_SCENARIOS_BM_NOTE}{' '}
          <code className="text-gray-400">#AR-</code> prefix — they are not Workshop mods.
        </p>
      </div>

      <OfficialScenariosTable gamePrefix={gp} />
    </div>
  );
}

function OfficialScenariosTable({ gamePrefix }: { gamePrefix: string }) {
  const [sortBy, setSortBy] = useState<OfficialSortBy>('title');
  const [sortDir, setSortDir] = useState<OfficialSortDir>('asc');
  const toggleSort = (column: OfficialSortBy) => {
    if (sortBy === column) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortBy(column);
    setSortDir('asc');
  };
  const sorted = useMemo(() => {
    const dir = sortDir === 'asc' ? -1 : 1;
    return [...OFFICIAL_SCENARIOS].sort((a, b) => {
      if (sortBy === 'title') return dir * a.title.localeCompare(b.title);
      return dir * a.scenarioId.localeCompare(b.scenarioId);
    });
  }, [sortBy, sortDir]);
  return (
    <div className="border border-white/5 bg-black/40">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-white/10">
              <SortableTh
                label="Scenario"
                sortKey="title"
                activeSort={sortBy}
                sortDir={sortDir}
                onSort={(key) => toggleSort(key as OfficialSortBy)}
                className="pl-4 pr-4"
              />
              <SortableTh
                label="scenarioId"
                sortKey="scenarioId"
                activeSort={sortBy}
                sortDir={sortDir}
                onSort={(key) => toggleSort(key as OfficialSortBy)}
                className="hidden lg:table-cell px-4"
              />
            </tr>
          </thead>
          <tbody>
            {sorted.map((scenario) => (
              <tr key={scenario.slug} className="border-b border-white/5 hover:bg-white/[0.03] transition-colors">
                <td className="py-3 pl-4 pr-4 align-middle">
                  <Link
                    to={`${gamePrefix}/scenarios/official/${scenario.slug}`}
                    className="text-[13px] font-bold text-white hover:text-tactical-orange transition-colors"
                  >
                    {scenario.title}
                  </Link>
                </td>
                <td className="hidden lg:table-cell py-3 px-4 align-middle">
                  <code className="text-[11px] font-mono text-gray-500">{scenario.scenarioId}</code>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
