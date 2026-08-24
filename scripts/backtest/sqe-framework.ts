/**
 * SQE v2 backtest framework — Thurstone latent-strength + time-calibrated
 * Kalman + probabilistic rank hysteresis, with Pareto sweep to find the
 * stability/plasticity "golden middle" (knee point).
 *
 * === Theory ===
 *
 * 1. Latent strength (Thurstone 1927): each server has true quality
 *      theta_i ~ N(mu_i, sigma_i^2)
 *    observed via noisy player counts (network-normalized):
 *      y_it = theta_i * netFactor_t + eps,  eps ~ N(0, sigma_e^2)
 *
 * 2. Time-calibrated Kalman filter. We do NOT guess alpha per run — the
 *    parameter is the half-life H in DAYS (physically meaningful), giving
 *    per-day gain k = 1 - 2^(-1/H). Process noise follows analytically from
 *    steady-state matching (v_pred = k*sigma_e^2/(1-k), v = k*sigma_e^2):
 *      sigma_q^2 = k^2 * sigma_e^2 / (1 - k)
 *    => estimator half-life is exactly H regardless of sampling cadence.
 *    (Production alpha=0.10/RUN == H=0.55 days: 72% of score replaced daily —
 *     this resonates with the 24h player cycle instead of smoothing it.)
 *
 * 3. Probabilistic rank hysteresis: keep yesterday's order; an adjacent pair
 *    swaps only when P(better) = Phi((mu_j-mu_i)/sqrt(s_i^2+s_j^2)) > tau.
 *    tau = 0.5 -> pure meritocracy (no hysteresis); higher tau = incumbency
 *    advantage; a GENUINE lead exceeds the threshold and breaks through.
 *
 * 4. Golden middle = knee of the Pareto frontier between:
 *      noiseRate  — rank moves >5 positions among top-50 servers whose
 *                   7-day trailing quality changed <5% (false movement)
 *      responseDays — days for a synthetic "improver" (jumped to top-tier
 *                   players at day 10) to enter its deserved top-20 rank
 *
 * Sweep: H x tau -> Pareto -> knee. Recommended production params:
 *      alpha_run = 1 - 2^(-1 / (H_days * 12 runs/day))
 *
 * Weights (production integration; players-only in this backtest since
 * history shards lack uniqueness/modCount):
 *   wPlayers, wUniqueness, wModCount, wTenure — see WEIGHTS below.
 */
import { readFileSync, writeFileSync } from 'node:fs';

interface DayPoint {
  time: string;
  servers: Record<string, { rank?: number; players?: number }>;
}

/** Production weight config — single source of truth for the collector. */
export const WEIGHTS = {
  players: 5,          // per player at snapshot
  uniqueness: 0.35,    // multiplier on TF-IDF-style bonus (future)
  modCount: 1,         // penalty per mod (future)
  tenureFloor: 0.25,   // min rank weight for newcomers (future)
} as const;

// ---------- math helpers ----------
const SQRT2 = Math.SQRT2;

export function normalCdf(x: number): number {
  // Abramowitz & Stegun 7.1.26 approximation of erf
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d = 0.3989422804014327 * Math.exp(-x * x / 2);
  let p = d * t * (0.319381530 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
  return x >= 0 ? 1 - p : p;
}

/** Per-day Kalman gain for a desired half-life H (days). */
export function gainForHalfLife(H: number): number {
  return 1 - Math.pow(2, -1 / H);
}

// ---------- estimator ----------
interface Est { mu: number; v: number }

function estimateSigmaE(days: DayPoint[]): number {
  // residual std of day-to-day score changes among stable servers:
  // Var(dY) = 2*sigma_e^2  =>  sigma_e = std(dY)/sqrt(2)
  const deltas: number[] = [];
  for (let i = 1; i < days.length; i++) {
    const prev = days[i - 1].servers, cur = days[i].servers;
    for (const id of Object.keys(cur)) {
      if (!(id in prev)) continue;
      const a = (prev[id].players ?? 0) * 5, b = (cur[id].players ?? 0) * 5;
      deltas.push(b - a);
    }
  }
  const n = deltas.length;
  if (!n) return 100;
  const mean = deltas.reduce((a, b) => a + b, 0) / n;
  const varr = deltas.reduce((a, b) => a + (b - mean) ** 2, 0) / n;
  return Math.sqrt(varr / 2);
}

function netFactorAt(days: DayPoint[], di: number): number {
  const total = (d: DayPoint) => Object.values(d.servers).reduce((a, s) => a + (s.players ?? 0), 0);
  const win: number[] = [];
  for (let j = Math.max(0, di - 6); j <= di; j++) win.push(total(days[j]));
  const mean = win.reduce((a, b) => a + b, 0) / win.length;
  return mean / Math.max(1, total(days[di]));
}

export interface ModelResult {
  dailyRanks: Map<string, number>[];
  dailyTop10: string[][];
}

/**
 * Full model: Kalman (half-life H) + probabilistic hysteresis (tau).
 * Hysteresis applies to the top-200 (the visible leaderboard); the tail is
 * ranked by mu directly (nobody sees it, keeps O(n log n)).
 */
export function runModel(days: DayPoint[], H: number, tau: number, sigmaE: number): ModelResult {
  const est = new Map<string, Est>();
  const k = gainForHalfLife(H);
  const kEff = Math.min(0.95, k);
  const sigmaQ2 = (kEff * kEff * sigmaE * sigmaE) / (1 - kEff);
  const dailyRanks: Map<string, number>[] = [];
  const dailyTop10: string[][] = [];
  let prevTop200Order: string[] = [];

  for (let di = 0; di < days.length; di++) {
    const nf = netFactorAt(days, di);
    const present = new Set<string>();

    for (const [id, s] of Object.entries(days[di].servers)) {
      present.add(id);
      const y = Math.max(0, (s.players ?? 0) * 5 * nf);
      const st = est.get(id) ?? { mu: y * 0.3, v: sigmaE * sigmaE * 4 }; // modest prior
      const vPred = st.v + sigmaQ2;
      const kk = vPred / (vPred + sigmaE * sigmaE);
      est.set(id, { mu: st.mu + kk * (y - st.mu), v: (1 - kk) * vPred });
    }
    for (const [id, st] of est) {
      if (!present.has(id)) {
        const vPred = st.v + sigmaQ2 * 3;
        est.set(id, { mu: st.mu * 0.9, v: vPred });
      }
    }

    // candidates for the visible leaderboard: everything with mu > small floor
    const cand = [...est.entries()]
      .map(([id, st]) => ({ id, mu: st.mu, sd: Math.sqrt(st.v) }))
      .filter((c) => c.mu > 1)
      .sort((a, b) => b.mu - a.mu)
      .slice(0, 400); // superset of top-200

    // hysteresis ordering over the top band, seeded with yesterday's order
    let band: Array<{ id: string; mu: number; sd: number }>;
    if (tau <= 0.5 || prevTop200Order.length === 0) {
      band = cand.slice(0, 200);
    } else {
      const pos = new Map(prevTop200Order.map((id, i) => [id, i]));
      const inBand = cand.slice(0, 220); // small margin for movement
      inBand.sort((a, b) => {
        const pa = pos.has(a.id) ? pos.get(a.id)! : 1000;
        const pb = pos.has(b.id) ? pos.get(b.id)! : 1000;
        return pa - pb;
      });
      band = inBand.slice(0, 200);
      // bubble passes: swap adjacent only with probability evidence > tau
      let swapped = true;
      while (swapped) {
        swapped = false;
        for (let i = 0; i < band.length - 1; i++) {
          const a = band[i], b = band[i + 1]; // a above b
          const p = normalCdf((b.mu - a.mu) / Math.sqrt(a.sd * a.sd + b.sd * b.sd));
          if (p > tau) { band[i] = b; band[i + 1] = a; swapped = true; }
        }
      }
    }

    const ranks = new Map<string, number>();
    band.forEach((e, i) => ranks.set(e.id, i + 1));
    cand.forEach((e, i) => { if (!ranks.has(e.id)) ranks.set(e.id, 201 + i); });
    dailyRanks.push(ranks);
    dailyTop10.push(band.slice(0, 10).map((e) => e.id));
    prevTop200Order = band.map((e) => e.id);
  }
  return { dailyRanks, dailyTop10 };
}

// ---------- metrics ----------
function trailingQuality(days: DayPoint[], window = 7): Map<string, number>[] {
  const hist = new Map<string, number[]>();
  return days.map((d) => {
    const out = new Map<string, number>();
    for (const [id, s] of Object.entries(d.servers)) {
      const arr = hist.get(id) ?? [];
      arr.push(s.players ?? 0);
      if (arr.length > window) arr.shift();
      hist.set(id, arr);
      out.set(id, arr.reduce((a, b) => a + b, 0) / arr.length);
    }
    return out;
  });
}

/** False-movement rate: big rank changes among stable-quality top-50 servers. */
export function noiseRate(days: DayPoint[], res: ModelResult, quality: Map<string, number>[]): number {
  let moves = 0, exposed = 0;
  for (let i = 1; i < days.length; i++) {
    for (const [id, r] of res.dailyRanks[i]) {
      if (r > 50 && (res.dailyRanks[i - 1].get(id) ?? 1e9) > 50) continue;
      const q0 = quality[i - 1].get(id), q1 = quality[i].get(id);
      if (q0 == null || q1 == null || q0 <= 0) continue;
      if (Math.abs(q1 - q0) / q0 >= 0.05) continue; // genuinely changed
      const pr = res.dailyRanks[i - 1].get(id);
      if (pr == null) continue;
      exposed++;
      if (Math.abs(pr - r) > 5) moves++;
    }
  }
  return exposed ? moves / exposed : 0;
}

/** Days for SYNTHETIC improvers (cloned mid-tier, boosted to top-tier at day 10)
 *  to reach their deserved top-20 rank. Proper injection, not wishful thinking. */
export function responseDays(days: DayPoint[], H: number, tau: number, sigmaE: number): number | null {
  if (days.length <= 14) return null;

  // 1. build injected dataset
  const quality0 = trailingQuality(days.slice(0, 10), 7)[9];
  // seeds: ACTIVE mid-tier (players > 20), 30-60th percentile among active
  const active = [...quality0.entries()].filter(([, q]) => q > 20).sort((a, b) => b[1] - a[1]);
  if (active.length < 50) return null;
  const lo = Math.floor(active.length * 0.3), hi = Math.floor(active.length * 0.6);
  const seeds = active.slice(lo, hi).slice(0, 20).map(([id]) => id);

  // top-tier daily target per day: full mean of real top-10 players
  // (an unambiguous "deserves top-10" improver; we measure entry into top-20)
  const topTarget = days.map((d) => {
    const ps = Object.values(d.servers).map((s) => s.players ?? 0).sort((a, b) => b - a).slice(0, 10);
    return ps.reduce((a, b) => a + b, 0) / Math.max(1, ps.length);
  });

  const injected: DayPoint[] = days.map((d, di) => {
    const servers: DayPoint['servers'] = { ...d.servers };
    seeds.forEach((sid, i) => {
      if (di < 10) {
        const real = d.servers[sid];
        if (real) servers[`SYN${i}`] = { ...real };
      } else {
        const noise = 1 + ((di * 7 + i * 13) % 11 - 5) / 50; // deterministic ±10%
        servers[`SYN${i}`] = { players: Math.round(topTarget[di] * noise) };
      }
    });
    return { time: d.time, servers };
  });

  // 2. run the model on injected data
  const res = runModel(injected, H, tau, sigmaE);

  // 3. measure days from injection (day 10) to first top-20 entry
  let total = 0, counted = 0;
  for (let i = 0; i < seeds.length; i++) {
    const id = `SYN${i}`;
    for (let t = 10; t < injected.length; t++) {
      const r = res.dailyRanks[t].get(id);
      if (r != null && r <= 20) { total += t - 10; counted++; break; }
    }
  }
  return counted ? total / counted : null; // null = nobody broke through (too slow)
}

/** Knee of a Pareto frontier (max distance from endpoint line, normalized). */
export function kneeIndex(points: Array<{ x: number; y: number }>): number {
  if (points.length < 3) return 0;
  const xs = points.map((p) => p.x), ys = points.map((p) => p.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const nx = (v: number) => (v - minX) / Math.max(1e-9, maxX - minX);
  const ny = (v: number) => (v - minY) / Math.max(1e-9, maxY - minY);
  const a = { x: nx(points[0].x), y: ny(points[0].y) };
  const b = { x: nx(points[points.length - 1].x), y: ny(points[points.length - 1].y) };
  let best = 0, bestD = -1;
  for (let i = 1; i < points.length - 1; i++) {
    const p = { x: nx(points[i].x), y: ny(points[i].y) };
    const d = Math.abs((b.x - a.x) * (a.y - p.y) - (a.x - p.x) * (b.y - a.y));
    if (d > bestD) { bestD = d; best = i; }
  }
  return best;
}

// ---------- main sweep ----------
function main() {
  const raw = readFileSync('scripts/backtest/data/history-daily-reforger.json', 'utf8');
  const days = JSON.parse(raw) as DayPoint[];
  const sigmaE = estimateSigmaE(days);
  const quality = trailingQuality(days, 7);
  console.log(`days=${days.length} servers=${Object.keys(days[0].servers).length} sigmaE=${sigmaE.toFixed(1)}`);
  console.log(`production equivalent: H=0.55d  (alpha 0.10/run x 12 runs/day)`);

  const Hs = [0.55, 1, 2, 3, 4, 5, 7, 10, 14, 21];
  const taus = [0.5, 0.6, 0.7, 0.75, 0.8, 0.85];
  const rows: any[] = [];

  for (const H of Hs) {
    for (const tau of taus) {
      const res = runModel(days, H, tau, sigmaE);
      const noise = noiseRate(days, res, quality);
      const resp = responseDays(days, H, tau, sigmaE); // runs model on injected copy
      const respVal = resp ?? 25; // nobody broke through in-window => cap at 25d
      rows.push({ H, tau, noiseRate: +noise.toFixed(4), responseDays: +respVal.toFixed(1), reached: resp != null });
      console.log(`H=${String(H).padStart(5)}d tau=${tau.toFixed(2)}  noise=${(noise * 100).toFixed(2)}%  response=${respVal.toFixed(1)}d${resp == null ? ' (capped)' : ''}`);
    }
  }

  // Pareto: minimize both. Build frontier over all evaluated points.
  const pts = rows;
  const sortedPts = [...pts].sort((a, b) => a.responseDays - b.responseDays);
  const frontier: typeof pts = [];
  let bestNoise = Infinity;
  for (const p of sortedPts) {
    if (p.noiseRate < bestNoise) { frontier.push(p); bestNoise = p.noiseRate; }
  }
  const ki = kneeIndex(frontier.map((p) => ({ x: p.responseDays, y: p.noiseRate })));
  const chordKnee = frontier[ki];

  // Constrained optimum — product-owner criteria (quality mark + competition):
  //   noiseRate <= 13%  (stable = a rank you can trust and show off)
  //   response  <= 18d  (a genuinely top-tier newcomer still breaks in fast)
  // Among feasible points pick min noise; report the feasible zone for context.
  const NOISE_MAX = 0.13, RESP_MAX = 18;
  const feasible = rows.filter((r) => r.noiseRate <= NOISE_MAX && r.responseDays <= RESP_MAX);
  const constrained = feasible.length
    ? feasible.reduce((a, b) => (b.noiseRate < a.noiseRate ? b : a))
    : null;
  const knee = constrained ?? chordKnee;

  const alphaRun = 1 - Math.pow(2, -1 / (knee.H * 12));
  const report = {
    meta: { days: days.length, sigmaE: +sigmaE.toFixed(1), productionEquivalent: { H: 0.55, alphaRun: 0.10 } },
    sweep: rows,
    paretoFrontier: frontier,
    chordKnee,
    constrainedOptimum: constrained,
    constraints: { noiseRateMax: NOISE_MAX, responseDaysMax: RESP_MAX, feasibleCount: feasible.length },
    recommendation: {
      halfLifeDays: knee.H,
      tau: knee.tau,
      alphaPerRun: +alphaRun.toFixed(4),
      alphaPerRunFormula: 'alpha_run = 1 - 2^(-1 / (H_days * 12))',
    },
  };
  writeFileSync('scripts/backtest/pareto-report.json', JSON.stringify(report, null, 2));
  console.log('\n=== PARETO FRONTIER ===');
  frontier.forEach((p) => console.log(`  H=${String(p.H).padStart(5)}d tau=${p.tau.toFixed(2)}  noise=${(p.noiseRate * 100).toFixed(2)}%  response=${p.responseDays.toFixed(1)}d`));
  console.log(`\n=== CHORD KNEE (max bang/buck) ===`);
  console.log(`  H=${chordKnee.H}d  tau=${chordKnee.tau}`);
  console.log(`\n=== CONSTRAINED OPTIMUM (noise<=${NOISE_MAX * 100}%, response<=${RESP_MAX}d; ${feasible.length} feasible) ===`);
  if (constrained) console.log(`  H=${constrained.H}d  tau=${constrained.tau}  noise=${(constrained.noiseRate * 100).toFixed(2)}%  response=${constrained.responseDays.toFixed(1)}d`);
  console.log(`\n=== RECOMMENDATION ===`);
  console.log(`  H=${knee.H}d  tau=${knee.tau}  ->  alpha_run=${alphaRun.toFixed(4)}`);
  console.log('saved scripts/backtest/pareto-report.json');
}

if (process.argv[1]?.includes('sqe-framework')) main();
