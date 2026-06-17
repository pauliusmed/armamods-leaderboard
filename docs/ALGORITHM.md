https://reforgermods.com/trending# Trending Algorithm

## Overall Rank-Based Weighted Velocity Model

The trending system uses a weighted rank delta model to calculate mod popularity trends. This approach evaluates the position change (`rankDelta`) in the overall mod leaderboard rather than absolute server counts, heavily weighting movements at the top of the rankings where competition is fiercer.

### Mathematical Model

The trend score for each mod is calculated as:

```
trendScore = rankDelta × positionWeight × activityMultiplier
```

**Where:**

1. **Rank Delta (`rankDelta`)**:

   ```
   rankDelta = prevRank - currentRank
   ```

   - The number of positions a mod has climbed (positive score) or fallen (negative score) in the overall rank.
   - Mod positions are sequentially indexed starting from `1` (higher rank is better).

2. **Position Weight (`positionWeight`)**:

   ```
   positionWeight = 100 / sqrt(min(currentRank, prevRank))
   ```

   - This adjusts the difficulty of ranking shifts. Climbing 5 spots in the **Top 10** is mathematically harder and more valuable than climbing 5 spots in the **Top 5000**.
   - By taking the square root of the highest rank achieved in the period, the system applies a heavy curve favoring high-tier rank changes.

3. **Activity Multiplier (`activityMultiplier`)**:
   ```
   activityMultiplier = log10(max(currentPlayers, prevPlayers) + 1.1)
   ```

   - A logarithmic multiplier based on the maximum player count (either current or in the previous snapshot).
   - This ensures that mods with higher active player engagement receive priority over inactive ("dead") mods that might climb ranks purely due to background shifts.

---

### Dynamic Quality Thresholds

Instead of static minimums, the collector utilizes dynamic activity thresholds representing **0.5%** of the entire network's statistics to filter out background noise:

| Metric                    | Calculation                   | Hard Minimum |
| ------------------------- | ----------------------------- | ------------ |
| **Personnel (Players)**   | `floor(totalPlayers * 0.005)` | `5`          |
| **Deployments (Servers)** | `floor(totalServers * 0.005)` | `2`          |

A mod's activity is considered **significant** if:
`max(currentPlayers, prevPlayers) >= MIN_TREND_PLAYERS` AND `max(currentServers, prevServers) >= MIN_TREND_SERVERS`.

---

### Categories

- **Rising**: Mods with positive growth (`rankDelta > 0`) that meet the significance thresholds. Sorted by `trendScore` descending.
- **Falling**: Mods with negative growth (`rankDelta < 0`) that meet the significance thresholds. Sorted by `trendScore` ascending.
- **New**: Mods not present in the previous snapshot that meet the significance thresholds and have a `currentRank < 10000`. Sorted by `overallRank` ascending.

---

---

## Server Quality & Efficiency Index (SQE)

The SQE Index is designed to rank servers not just by their instantaneous player count, but by their overall technical quality, optimization, and uniqueness relative to the global network.

### Goal

To reward server owners who:

1. **Optimize**: Achieve high player counts with minimal mod overhead (Console & performance friendly).
2. **Innovate**: Create unique experiences using niche/original mods rather than common "copy-paste" setups.

### Snapshot Formula

Points are calculated every collector run (every 2 hours):

```
SnapshotScore = (Players × 5) - (ModCount × 1) + UniquenessBonus
```

**Variables:**

- **Players**: Number of active players at snapshot time.
- **ModCount**: Number of mods required to join the server (lower is better).
- **UniquenessBonus**: A value from **-100 to +100** based on the rarity of mods used.

### Temporal Smoothing & Reputation Decay (EMA)

To eliminate wild ranking fluctuations during off-peak night hours or brief technical restarts, the system implements an **Exponential Moving Average (EMA)** smoothing model for final rankings:

```
NewSQEPoints = α × SnapshotScore + (1 - α) × PreviousSQEPoints
```

**Where:**
- **Alpha ($\alpha = 0.10$)**: The smoothing factor. New snapshots contribute 10% of the score weight, while 90% is retained from the server's accumulated historical score. This high inertia prevents hourly player-count swings from instantly reshuffling the leaderboard.
- **Fadeaway (Slow Decay)**: If a server goes offline completely, its score decays slowly by 15% every 2 hours rather than instantly plunging to zero, preserving its ranking position during restarts.
- **Stability**: Prevents new, volatile servers from instantly overtaking highly established community nodes.

### Elite Rank Inertia

Because the top servers often run with similar player counts, tiny differences in the `UniquenessBonus` can cause the #1-#3 spots to flip every snapshot. To make the highest ranks feel authoritative and stable, the system applies a small **ranking-only cushion** to the previous leaderboard's top 3 servers:

```
RankingScore(top3) = SQEPoints × 1.05
```

**Rules:**
- The 5% cushion is used **only** to determine rank order; the stored `sqePoints` remain unchanged.
- It applies only to the **top 3** servers from the previous leaderboard.
- If another server genuinely pulls ahead by more than ~5%, it will still overtake the cushioned elite server.

This creates a "hysteresis" effect: once a server reaches the elite tier, it needs a meaningful lead by a challenger to be displaced, eliminating noisy #1-#3 swaps while still allowing true shifts in popularity.

### Uniqueness Bonus/Penalty Calculation

The bonus compares the server's average mod rank to the global network mean rank to penalize generic setups and reward true innovation.

```
Bonus = Clamp((ServerAvgModRank - GlobalMeanRank) / ScalingFactor, -100, 100)
```

**Where:**

- **GlobalMeanRank**: `TotalMods / 2`. The mathematical center of the current mod registry.
- **ScalingFactor**: `GlobalMeanRank / 100`. Ensures the bonus always scales neatly between -100 and +100 regardless of total mod count.

- **Penalty (-100 to 0)**: Applied to servers using only Top 100 / Vanilla mods. This rewards developers who move away from "the herd".
- **Bonus (0 to +100)**: Applied to servers using niche, unique, or high-quality artisanal mods.
- **Vanilla Exception**: Vanilla servers (0 mods) receive the maximum penalty of **-100** for using the default configuration without any community content.

### Ranking Output

All servers receive `sqePoints` and `sqeRank` fields stored in their KV data. The TOP 200 servers are saved separately to `cache:ranking:servers` for the leaderboard page.

### History

Server rank history is stored in the shared history shards alongside mod data. Each time point includes `"servers": { "serverId": rank }`, enabling the SQE Rank chart on server detail pages without separate storage or expensive calculations.

The history API supports dynamic temporal scaling:
- **24H (Hourly)**: Swings baseKey to `history:hourly:${game}` (slices the last 24 entries).
- **7D / 30D (Daily)**: Reads from `history:daily:${game}` (slices the last 7 or 30 entries).
- **1Y (Weekly)**: Swings baseKey to `history:weekly:${game}` (52 Monday buckets, peak per week). Falls back to `history:monthly` until enough weekly points exist after deploy.
- **All-Time (Yearly)**: Swings baseKey to `history:yearly:${game}` (slices the last 10 entries).

---

## Frequently Deployed Together (Co-deployment) Analytics

The Co-deployment Analytics system is an advanced in-memory association algorithm designed to identify tactical synergies between different workshop modules. It computes which mods are frequently run alongside a given target mod on active servers across the global network.

### Goal

1. **For Mod Developers**: To discover compatibility trends, audience overlaps, and technical integration opportunities (e.g., ensuring zero conflicts with other highly popular mods used alongside theirs).
2. **For Server Owners**: To serve as a modpack building guide, highlighting which mods are standard or highly recommended when deploying a specific map or core module.

### Mathematical Algorithm

During each collector cycle, the in-memory engine calculates association frequencies in $O(S \times M)$ time complexity:

1. **Mapping Phase**:
   - The engine builds a mod-to-servers index map: $M \rightarrow [S_1, S_2, ...]$ (retrieving all active server IDs where mod $M$ is running).
   - The engine builds a server-to-mods lookup map: $S \rightarrow [M_1, M_2, ...]$ (listing all installed mods on server $S$).

2. **Frequency Counting Phase**:
   - For a target mod $M$, the algorithm fetches all active server IDs running $M$.
   - It iterates through all other mods $O$ active on those servers (excluding $M$ itself).
   - A frequency table tracks the occurrences of each co-deployed mod: $Freq(O) = \text{count}$.

3. **Ranking & Slicing**:
   - The association overlap percentage for a co-deployed mod $O$ relative to target mod $M$ is computed as:
     $$\text{Overlap} = \text{Round}\left(\frac{\text{Freq}(O)}{\text{ServerCount}(M)} \times 100\right)$$
   - The list is sorted in descending order of frequency, and the Top 5 co-deployed mods are sliced and stored.

### Zero-Cost KV Architecture

To strictly comply with Cloudflare KV's Free Tier constraints (1,000 write ops/day), the calculated Top 5 co-deployed objects are embedded directly inside the pre-existing mod objects within their sharded list chunks (`cache:mods:i` keys). 

As a result:
- **KV Write Operations**: Increase is exactly **0**.
- **KV Read Operations**: Increase is exactly **0** (the client retrieves it inside the standard single mod JSON payload).
- **Storage Overhead**: Only ~100 bytes per mod, representing $< 1\%$ increase in global cache size.

---

## References

- [Bayesian Statistics](https://en.wikipedia.org/wiki/Bayesian_statistics)
- [Wilson Score Interval](https://en.wikipedia.org/wiki/Binomial_proportion_confidence_interval#Wilson_score_interval)
- [IMDb Top 250 Formula](https://stackoverflow.com/questions/1411199/what-is-a-better-way-to-sort-by-two-values)
