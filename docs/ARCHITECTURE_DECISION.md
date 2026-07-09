# Architektūros Sprendimas: KV-Based Time-Series History

## Problema
Standardinis SQL (`D1`) naudojimas istorinių duomenų saugojimui Armas Reforger Leaderboard projektui atsimuša į Cloudflare D1 nemokamus limitus:
- SQL Write limitas: 100,000 per dieną.
- Kiekvienas modas (iš ~3,000) reikalauja atskiro SQL įrašo kas valandą.
- 3,000 mods * 24h = 72,000 SQL writes per parą vien istorijai. Tai palieka labai mažai vietos kitiems atnaujinimams.

## Sprendimas: 100% KV-Native Architektūra (0 SQL)
Siekiant maksimalaus „Anti-Limit“ saugumo ir žaibiško greičio, projektas visiškai atsisakė SQL (`D1`) duomenų bazės:

1. **Visiškas SQL atsisakymas**: Į SQL (`D1`) nebebus nei rašoma, nei skaitoma. Visi operacijų limitai dabar lygūs 0, kas leidžia projektui augti neribotai be baimės užblokuoti duomenų bazę.
2. **KV Time-Series (History)**: Istoriniai duomenys pildomi kas valandą į „Master JSON“ paketus:
   - `history:hourly`: Paskutinės 24 valandos aukšta rezoliucija.
   - `history:daily`: Paskutinės 31 dienos (Peak Aggregation su „Sliding Window“).
   - `history:weekly`: Paskutinės 52 savaitės (piko agregacija per savaitę, laiko žyma = pirmadienis UTC).
   - `history:monthly`: Paskutiniai 12 mėnesių (fallback 1Y, kol weekly serija užsipildo).
   - `history:yearly`: Paskutiniai 5 metai.
3. **Agreguotas Trending API**: Vietoj SQL JOIN'ų, „Trending“ logika dabar lygina du JSON taškus tiesiai KV podėlyje, sutaupydama šimtus milisekundžių užkrovimo laiko.
4. **Resursų saugumas**: 25MB KV limito aplenkimas naudojant automatinį sharding'ą (5MB blokais).
5. **Bendra modų ir serverių istorija** (nuo v1.6.0): Serverių SQE rank'ai saugomi tame pačiame istorijos taške kaip ir modų statistika. Tai pašalina atskirą `history:server_scores` blob'ą ir sutaupo KV operacijų.

## KV Duomenų Struktūra

```
cache:mods[:0..N]          — Modų sąrašas su reitingais (shardintas, 5MB/blokas)
cache:mods:meta            — Shard metadata { total, chunks }
cache:servers[:0..N]       — Serverių sąrašas su SQE duomenimis (shardintas, 5MB/blokas)
cache:servers:meta         — Shard metadata
cache:stats                — Globalūs skaitikliai { totalMods, totalPlayers, totalServers }
cache:lastUpdate           — Paskutinio atnaujinimo ISO timestamp
cache:trending:daily       — 24h trending pre-calculated
cache:trending:weekly      — 7d trending pre-calculated
cache:trending:monthly     — 30d trending pre-calculated
cache:ranking:servers      — TOP 200 serverių leaderboard
cache:ranking:scenarios:{game} — Scenario leaderboard (rank, serverCount, totalPlayers, topServer)
cache:server_sqe:{game}    — Kompaktinis SQE indeksas API enrichment
cache:server_bm_last_seen:{game} — Paskutinis collector scan, kai serveris buvo online
cache:og-image:*           — Workshop thumbnail CDN URL (on-demand, 7d)
cache:mod-deps:*           — Workshop dependencies JSON (on-demand, 7d)

history:hourly:game[:0..N] — Modų + serverių istorija (12 taškų, valandinė)
history:daily:game[:0..N]  — Modų + serverių istorija (31 taškas, dienos peak)
history:weekly:game[:0..N] — Savaitinė agregacija (52 taškai, 1Y grafikas)
history:monthly:game[:0..N]— Mėnesinė agregacija (12 taškų, fallback)
history:yearly:game[:0..N] — Metinė agregacija (5 taškai)
```

Kiekvienas istorijos taškas turi formatą:
```json
{
  "time": "2026-05-14",
  "mods": { "modId": { "p": 100, "s": 5, "r": 3 } },
  "servers": {
    "serverId": {
      "rank": 5,
      "players": 32,
      "online": true,
      "on": 5,
      "n": 6
    }
  }
}
```

- **Legacy** server įrašai gali būti tik skaičius (`"serverId": 5`) — API vis dar palaiko.
- **Uptime** (`online` hourly; `on`/`n` daily+): žr. [SERVER_UPTIME.md](./SERVER_UPTIME.md) (v1.22+).

## API Optimization Strategies

1. **Chirurginis JSON išskleidimas**: Detalės puslapiuose naudojamas `findMatchingBrace` su skliaustų skaičiavimu, leidžiantis tiksliai išpjaustyti objektą iš didelio JSON teksto be pilno `JSON.parse`.
2. **Mod lookup (`mod-lookup.ts`, v1.22.1)**: `extractModFromChunks` ieško pilno mod įrašo (`overallRank` / `totalPlayers`), praleidžia `coDeployed` snippet'us kitų modų JSON'e — mod detail rank sutampa su leaderboard.
3. **Tekstinis skenavimas**: Istorijos endpoint'ai skenuoja raw tekstą `indexOf` metodu, aplenkdami pilną JSON parse. CPU laikas išlaikomas <5ms.
4. **Edge kėšavimas (Cache API)**: Cloudflare Cache API naudojamas visiems endpoint'ams su skirtingais TTL (5min – 1val).
5. **Lazy Chunk Loading**: Sąrašų endpoint'ai krauna tik 1-ąjį bloką default view, pilną duomenų krūvį naudoja tik paieškai.

Pilnas resursų žemėlapis, žinomi limitai ir `ServerLookup` optimizacija: [PERFORMANCE.md](./PERFORMANCE.md).

## Privalumai
- **Žaibiškas greitis**: KV podėlis yra Edge lygio – vartotojas gauna duomenis iš arčiausių serverių be SQL lėtumo.
- **Nulis „Writes“ klaidų**: Išvengta SQL „Database Locked“ problemų, būdingų D1 Beta stadijoje.
- **Neribotas augimas**: Modų skaičiaus didėjimas nebeveikia sistemos pajėgumo.
- **KV biudžeto optimizavimas**: Sujungus serverių ir modų istoriją, sutaupomos ~2 KV operacijos per kolektoriaus paleidimą.

## Pakeitimo Svarba
- 2024-03-29: Pradinis SQL → KV migracijos sprendimas.
- 2026-05-13: Peak Aggregation, sharding, chirurginis JSON išskleidimas.
- 2026-05-14: Serverių istorijos suliejimas su modų istorija, pašalinant atskirą `history:server_scores` blob'ą.
- 2026-06-30: Scenario leaderboard (`cache:ranking:scenarios:{game}`) — agregacija collector run metu, API read-only.
- 2026-07-09: Serverių uptime pavyzdžiai (`on`/`n`/`online`) bendroje `history:*` struktūroje — offline grafikas be papildomų KV raktų.
- 2026-07-10: `mod-lookup.ts` — pilno mod objekto paieška shard'e (ne co-deploy snippet).
