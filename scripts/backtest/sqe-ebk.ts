/**
 * EB-Kalman SQE backtest — empirical Bayes + Kalman filter with diurnal
 * normalization vs the current EMA+tenure+inertia stack.
 *
 * Data: scripts/backtest/data/history-daily-reforger.json (31 days × servers).
 * Each daily point: { time, servers: { id: { rank, players, online?, on?, n? } } }
 *
 * NOTE: daily shards store per-day *peak-sampled* players (1 sample/run at
 * collector time-of-day). The diurnal cycle is therefore only partially
 * observable here; we estimate d(h) from the sampling hour distribution and
 * network totals. This is a first-order approximation documented in the report.
 *
 * Metrics:
 *  - top10 churn/day: |symmetric difference of daily top-10 sets| / 10
 *  - Spearman rho between consecutive day rankings (top 200)
 *  - jump metric: max |rank_t - rank_{t-1}| for top-50 servers
 */
import { readFileSync, writeFileSync } from 'node:fs';

interface DayPoint {
  time: string;
  servers: Record<string, { rank?: number; players?: number; online?: boolean; on?: number; n?: number }>;
}

// ---------- Current model (reimplemented faithfully) ----------
const ALPHA = 0.10;
const RAMP_RUNS = 168;
const TENURE_FLOOR = 0.25;

function currentModel(days: DayPoint[]) {
  const ema = new Map<string, { s: number; a: number }>();
  const dailyTop10: string[][] = [];
  const dailyRanks: Map<string, number>[] = [];

  // snapshot score approximation: players*5 (modCount & uniqueness not in
  // history shards — same for both models, so comparison stays fair)
  const snap = (players: number) => Math.max(0, players * 5);

  for (const day of days) {
    const scores: Record<string, number> = {};
    for (const [id, s] of Object.entries(day.servers)) {
      const players = s.players ?? 0;
      const prev = ema.get(id);
      let ns: number, age: number;
      if (prev) {
        ns = ALPHA * snap(players) + (1 - ALPHA) * prev.s;
        age = players > 0 ? prev.a + 1 : prev.a;
      } else {
        ns = snap(players);
        age = 1;
      }
      ema.set(id, { s: ns, a: age });
      const tenure = TENURE_FLOOR + (1 - TENURE_FLOOR) * Math.min(1, age / RAMP_RUNS);
      scores[id] = ns * tenure;
    }
    // fadeaway: offline servers decay
    for (const [id, e] of ema) {
      if (!(id in day.servers)) {
        const ns = (1 - ALPHA) * e.s;
        ema.set(id, { s: ns, a: e.a });
        scores[id] = ns * (TENURE_FLOOR + (1 - TENURE_FLOOR) * Math.min(1, e.a / RAMP_RUNS));
      }
    }
    const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
    const ranks = new Map<string, number>();
    sorted.forEach(([id], i) => ranks.set(id, i + 1));
    dailyRanks.push(ranks);
    dailyTop10.push(sorted.slice(0, 10).map(([id]) => id));
  }
  return { dailyTop10, dailyRanks };
}

// ---------- EB-Kalman model ----------
interface KalmanState { mu: number; v: number } // posterior mean & variance

const SIGMA_Q = 15;    // process noise — quality drifts slowly
const SIGMA_R = 350;   // observation noise — daily peak sample is noisy
const KAPPA = 0.8;     // LCB multiplier (rank = mu - kappa*sqrt(v))
const PRIOR_MU = 0;
const PRIOR_V = 600 * 600;
const SHRINK_REF = 200 * 200; // shrink toward day mean while v >> this

function ebKalmanModel(days: DayPoint[]) {
  const state = new Map<string, KalmanState>();
  const dailyTop10: string[][] = [];
  const dailyRanks: Map<string, number>[] = [];

  for (let di = 0; di < days.length; di++) {
    const day = days[di];
    // Diurnal/network-level normalization: scale each day's players by the
    // ratio of network total to its 7-day rolling mean. Removes global
    // day-of-week / time-of-sampling swings common to all servers.
    const netTotal = Object.values(day.servers).reduce((a, s) => a + (s.players ?? 0), 0);
    const netWindow: number[] = [];
    for (let j = Math.max(0, di - 6); j <= di; j++) {
      netWindow.push(Object.values(days[j].servers).reduce((a, s) => a + (s.players ?? 0), 0));
    }
    const netMean = netWindow.reduce((a, b) => a + b, 0) / netWindow.length;
    const netFactor = netMean / Math.max(1, netTotal); // >1 on quiet days

    const obs: Array<[string, number]> = [];
    for (const [id, s] of Object.entries(day.servers)) {
      obs.push([id, Math.max(0, (s.players ?? 0) * 5 * netFactor)]);
    }
    const dayMean = obs.length ? obs.reduce((a, [, y]) => a + y, 0) / obs.length : 0;

    const lcb: Record<string, number> = {};
    const seen = new Set<string>();
    for (const [id, y] of obs) {
      seen.add(id);
      const st = state.get(id) ?? { mu: PRIOR_MU, v: PRIOR_V };
      const vPred = st.v + SIGMA_Q * SIGMA_Q;
      const k = vPred / (vPred + SIGMA_R * SIGMA_R);
      const muNew = st.mu + k * (y - st.mu);
      const vNew = (1 - k) * vPred;
      // EB shrink toward day mean while posterior is uncertain (v large)
      const shrink = vNew / (vNew + SHRINK_REF);
      const muShrunk = (1 - shrink) * muNew + shrink * dayMean;
      state.set(id, { mu: muShrunk, v: vNew });
      lcb[id] = muShrunk - KAPPA * Math.sqrt(vNew);
    }
    for (const [id, st] of state) {
      if (!seen.has(id)) {
        const vPred = st.v + SIGMA_Q * SIGMA_Q * 3;
        state.set(id, { mu: st.mu * 0.9, v: vPred });
        lcb[id] = st.mu * 0.9 - KAPPA * Math.sqrt(vPred);
      }
    }
    const sorted = Object.entries(lcb).sort((a, b) => b[1] - a[1]);
    const ranks = new Map<string, number>();
    sorted.forEach(([id], i) => ranks.set(id, i + 1));
    dailyRanks.push(ranks);
    dailyTop10.push(sorted.slice(0, 10).map(([id]) => id));
  }
  return { dailyTop10, dailyRanks };
}

// ---------- Simple baselines ----------
/** Rolling mean of last N days — no EMA, no Kalman. */
function rollingMeanModel(days: DayPoint[], window = 7) {
  const hist = new Map<string, number[]>();
  const dailyTop10: string[][] = [];
  const dailyRanks: Map<string, number>[] = [];
  for (const day of days) {
    const scores: Record<string, number> = {};
    for (const [id, s] of Object.entries(day.servers)) {
      const arr = hist.get(id) ?? [];
      arr.push(Math.max(0, (s.players ?? 0) * 5));
      if (arr.length > window) arr.shift();
      hist.set(id, arr);
      scores[id] = arr.reduce((a, b) => a + b, 0) / arr.length;
    }
    const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
    const ranks = new Map<string, number>();
    sorted.forEach(([id], i) => ranks.set(id, i + 1));
    dailyRanks.push(ranks);
    dailyTop10.push(sorted.slice(0, 10).map(([id]) => id));
  }
  return { dailyTop10, dailyRanks };
}

/** EMA with configurable alpha + tenure (current model family, tuned alpha). */
function emaModel(days: DayPoint[], alpha: number) {
  const ema = new Map<string, number>();
  const dailyTop10: string[][] = [];
  const dailyRanks: Map<string, number>[] = [];
  for (const day of days) {
    const scores: Record<string, number> = {};
    for (const [id, s] of Object.entries(day.servers)) {
      const y = Math.max(0, (s.players ?? 0) * 5);
      const prev = ema.get(id);
      const ns = prev == null ? y : alpha * y + (1 - alpha) * prev;
      ema.set(id, ns);
      scores[id] = ns;
    }
    for (const [id, prev] of ema) {
      if (!(id in day.servers)) { const ns = (1 - alpha) * prev; ema.set(id, ns); scores[id] = ns; }
    }
    const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
    const ranks = new Map<string, number>();
    sorted.forEach(([id], i) => ranks.set(id, i + 1));
    dailyRanks.push(ranks);
    dailyTop10.push(sorted.slice(0, 10).map(([id]) => id));
  }
  return { dailyTop10, dailyRanks };
}

// ---------- Metrics ----------
function spearman(a: Map<string, number>, b: Map<string, number>, topN = 200): number {
  // Pearson correlation on ranks (robust to ties & differing sets)
  const ids = [...a.keys()].filter((id) => b.has(id) && (a.get(id)! <= topN || b.get(id)! <= topN));
  if (ids.length < 3) return 1;
  const ra = ids.map((id) => a.get(id)!);
  const rb = ids.map((id) => b.get(id)!);
  const ma = ra.reduce((x, y) => x + y, 0) / ra.length;
  const mb = rb.reduce((x, y) => x + y, 0) / rb.length;
  let num = 0, da = 0, db = 0;
  for (let i = 0; i < ids.length; i++) {
    num += (ra[i] - ma) * (rb[i] - mb);
    da += (ra[i] - ma) ** 2;
    db += (rb[i] - mb) ** 2;
  }
  if (da === 0 || db === 0) return 1;
  return num / Math.sqrt(da * db);
}

function churnSeries(top10: string[][]): number[] {
  const out: number[] = [];
  for (let i = 1; i < top10.length; i++) {
    const prev = new Set(top10[i - 1]);
    const cur = new Set(top10[i]);
    let diff = 0;
    for (const id of cur) if (!prev.has(id)) diff++;
    for (const id of prev) if (!cur.has(id)) diff++;
    out.push(diff / 10);
  }
  return out;
}

function maxJump(ranks: Map<string, number>[], topN = 50): number[] {
  const out: number[] = [];
  for (let i = 1; i < ranks.length; i++) {
    let mj = 0;
    for (const [id, r] of ranks[i]) {
      if (r > topN) continue;
      const pr = ranks[i - 1].get(id);
      if (pr != null) mj = Math.max(mj, Math.abs(pr - r));
    }
    out.push(mj);
  }
  return out;
}

// ---------- Main ----------
function main() {
  const raw = readFileSync('scripts/backtest/data/history-daily-reforger.json', 'utf8');
  const days = JSON.parse(raw) as DayPoint[];
  console.log(`loaded ${days.length} days, ${Object.keys(days[0].servers).length} servers on day 1`);

  const cur = currentModel(days);
  const ebk = ebKalmanModel(days);
  const rm7 = rollingMeanModel(days, 7);
  const rm14 = rollingMeanModel(days, 14);
  const ema005 = emaModel(days, 0.05);
  const ema002 = emaModel(days, 0.02);

  const variants: Record<string, { dailyTop10: string[][]; dailyRanks: Map<string, number>[] }> = {
    current: cur,
    ebKalman: ebk,
    rollMean7: rm7,
    rollMean14: rm14,
    ema005: ema005,
    ema002: ema002,
  };

  const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
  const report: any = { days: days.length, models: {} };

  for (const [name, m] of Object.entries(variants)) {
    const churn = churnSeries(m.dailyTop10);
    const rhos: number[] = [];
    for (let i = 1; i < days.length; i++) rhos.push(spearman(m.dailyRanks[i - 1], m.dailyRanks[i]));
    const jumps = maxJump(m.dailyRanks);
    report.models[name] = {
      churnPerDay: +avg(churn).toFixed(3),
      spearmanRho: +avg(rhos).toFixed(4),
      maxJumpTop50: Math.max(...jumps),
      avgJumpTop50: +avg(jumps).toFixed(1),
      top10Rotations: churn.filter((c) => c > 0.2).length,
    };
  }
  report.dailyChurn = Object.fromEntries(
    Object.entries(variants).map(([n, m]) => [n, churnSeries(m.dailyTop10).map((c) => +c.toFixed(2))])
  );
  report.finalTop10 = Object.fromEntries(
    Object.entries(variants).map(([n, m]) => [n, m.dailyTop10[m.dailyTop10.length - 1]])
  );

  writeFileSync('scripts/backtest/report.json', JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report.models, null, 1));
  console.log('report saved to scripts/backtest/report.json');
}

main();
