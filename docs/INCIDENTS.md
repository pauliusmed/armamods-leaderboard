# Incident reports

Priežiūros incidentų registras. Kiekvienas įrašas: laiko juosta, poveikis,
šakninės priežastys, veiksmai. Nauji viršuje.

Formatas: `INC-YYYY-MM-DD-<short-slug>`.

---

## INC-2026-08-26 · kolektoriaus praleidimai + BattleMetrics 504

**Kategorija:** data-pipeline · **Poveikis:** vidutinis (UI stale banner'is ~5 h) · **Statusas:** closed (rankinis run)

### Laiko juosta (UTC)

| Laikas | Įvykis |
|---|---|
| 08-26 14:31 / 16:39 | Cron ok (slot'ai vėluoja +31–39 min) |
| 08-26 19:26 | Job `collect-arma3` **FAIL**: `HTTP 504: error code: 1106` iš `api.battlemetrics.com` arma3 puslapiavimo metu (`page[key]=500…`). 1106 = BM paties Cloudflare edge origin hang. Reforger dalis prieš tai sėkminga. |
| 08-26 22:31 | OK, bet slotas 20:00 → vėlavimas +2 h 31 min |
| 08-26 22:00 → 08-27 02:00 | **Trys cron slot'ai neįvyko** (`22:00`, `00:00`, `02:00`) — GitHub Actions scheduler'io praleidimai |
| 08-27 05:12 | OK (slotas 04:00, +72 min) → KV `lastUpdate` 05:22–05:27 |
| 08-27 ~10:40 | `/api/health` → `staleHours=5.3 > 3` → `[STALE DATA]` banner'is visiems lankytojams |
| 08-27 10:43 | Rankinis `workflow_dispatch` — run ok ~14 min, banner'is dingsta |

### Poveikis

- Svetainė ~5 h rodė `[STALE DATA]` bannerį; duomenys buvo iki ~4 val. senesni nei įprasta.
- **Worker'io pusėje incidento pėdsakų nėra** (Workers Observability 08-26 18:30 → 08-27 11:30): tik izoliuoti po 1–4 įvykiai ant pavienių endpoint'ų, be audrų.
- BM kvota ir likę job'ai nenukentėjo.

### Šakninės priežastys

1. **BM GET be retry** — `src/services/battlemetrics.ts` puslapiavimo užklausos neturi backoff (backoff tik KV rašymams `scripts/collector.ts:83`); vienas transient 504 žlunga visam job'ui.
2. **GitHub Actions scheduler'io praleidimai** — `'0 */2 * * *'` slot'ai gali vėluoti +2–6 h arba neišvykti; tai dokumentuota GA elgsena esant apkrovai.

**Pridedantys faktoriai:** 2 val ciklas + 3 h stale riba (`/api/health`) = mažas paklaidos buferis — vienas praleistas slot'as ≈ 4 h jau suaktyvina banner'į.

### Veiksmai

| # | Veiksmas | Statusas |
|---|---|---|
| 1 | BM GET retry ×3 su backoff (tik 5xx/timeout, ne 4xx) `src/services/battlemetrics.ts:50` | DONE `4fa2b58→1.23.25` |
| 2 | Cron kas valandą (`0 * * * *`) `.github/workflows/collector.yml:12` — praleisto slot'o „banga“ ≤1 h | DONE |
| 3 | (nebūtina) stale riba 3 h → 4,5 h | TODO (paliekam 3h — valandinis cron užtenka) |

Šio registro įrašymo metu atliktas rankinis dispatch (poveikio šalinimas).
