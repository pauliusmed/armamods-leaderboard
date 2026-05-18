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
- **Alpha ($\alpha = 0.15$)**: The smoothing factor. New snapshots contribute 15% of the score weight, while 85% is retained from the server's accumulated historical score.
- **Fadeaway (Slow Decay)**: If a server goes offline completely, its score decays slowly by 15% every 2 hours rather than instantly plunging to zero, preserving its ranking position during restarts.
- **Stability**: Prevents new, volatile servers from instantly overtaking highly established community nodes.

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
- **1Y (Monthly)**: Swings baseKey to `history:monthly:${game}` (slices the last 12 entries).
- **All-Time (Yearly)**: Swings baseKey to `history:yearly:${game}` (slices the last 10 entries).

---

## References

- [Bayesian Statistics](https://en.wikipedia.org/wiki/Bayesian_statistics)
- [Wilson Score Interval](https://en.wikipedia.org/wiki/Binomial_proportion_confidence_interval#Wilson_score_interval)
- [IMDb Top 250 Formula](https://stackoverflow.com/questions/1411199/what-is-a-better-way-to-sort-by-two-values)
