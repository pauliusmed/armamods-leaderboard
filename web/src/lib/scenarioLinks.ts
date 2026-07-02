import type { ScenarioKind, ScenarioRankingEntry } from '../types';

export function scenarioDetailHref(
  scenario: Pick<ScenarioRankingEntry, 'kind' | 'modId' | 'officialSlug' | 'name'>,
  gamePrefix = '',
): string | null {
  if (scenario.kind === 'workshop' && scenario.modId) {
    return `${gamePrefix}/mod/${scenario.modId}`;
  }
  if (scenario.kind === 'official' && scenario.officialSlug) {
    return `${gamePrefix}/scenarios/official/${scenario.officialSlug}`;
  }
  return null;
}

export function scenarioKindLabel(kind: ScenarioKind | undefined): string {
  switch (kind ?? 'unknown') {
    case 'workshop':
      return 'Workshop';
    case 'official':
      return 'Official';
    default:
      return 'Unknown';
  }
}

export function scenarioKindBadgeClass(kind: ScenarioKind | undefined): string {
  switch (kind ?? 'unknown') {
    case 'workshop':
      return 'text-tactical-orange border-tactical-orange/30 bg-tactical-orange/5';
    case 'official':
      return 'text-sky-400 border-sky-400/30 bg-sky-400/5';
    default:
      return 'text-gray-500 border-white/10 bg-white/5';
  }
}
