/**
 * Backtest data extractor — pulls server history shards from KV via wrangler.
 * Usage: npx tsx scripts/backtest/fetch-history.ts
 * Saves: scripts/backtest/data/history-daily.json
 */
import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';

const NS = 'a8f21c595e39452e95e7e41e3d812013';
const OUT_DIR = 'scripts/backtest/data';

function kvGet(key: string): string | null {
  try {
    return execSync(
      `npx wrangler kv key get "${key}" --namespace-id=${NS} --remote`,
      { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, stdio: ['pipe', 'pipe', 'pipe'] }
    );
  } catch {
    return null;
  }
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });

  for (const game of ['reforger'] as const) {
    for (const period of ['daily', 'hourly'] as const) {
      const metaRaw = kvGet(`history:${period}:${game}:meta`);
      if (!metaRaw) { console.log(`no meta for ${period}:${game}`); continue; }
      const meta = JSON.parse(metaRaw) as { chunks: number; total: number };
      console.log(`${period}:${game} — ${meta.total} points in ${meta.chunks} chunks`);

      const points: any[] = [];
      for (let i = 0; i < meta.chunks; i++) {
        const raw = kvGet(`history:${period}:${game}:${i}`);
        if (!raw) { console.log(`  chunk ${i} missing`); continue; }
        const chunk = JSON.parse(raw) as any[];
        points.push(...chunk);
        console.log(`  chunk ${i}: ${chunk.length} points`);
      }

      // Keep only what we need: time + servers map (compact for backtest)
      const slim = points.map((p) => ({
        time: p.time,
        servers: p.servers,
      }));
      const out = `${OUT_DIR}/history-${period}-${game}.json`;
      writeFileSync(out, JSON.stringify(slim));
      console.log(`saved ${out} (${(JSON.stringify(slim).length / 1024 / 1024).toFixed(1)} MB, ${slim.length} points)`);
    }
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
