# Cost Guardrails — Cloudflare resursų politika

Projektas turi būti efektyvus naudodamas resursus. Šis lapas fiksuoja mokamų
Cloudflare produktų naudojimo ribas ir vienintinius leidžiamus taškus kode.
Nauji mokamų operacijų taškai kuriami tik savininkui patvirtinus.

## Images transformations

**Politika: unikalios transformacijos turi likti žemiau 5k/mėn (free lygis).**

Billingas skaičiuoja UNIKALIAS (paveikslėlis, parinktys) poras — ne requestus.
Po 5k unikalių/mėn taikoma $5/100k. Esama architektūra konverguoja žemiau
free ribos, nes deriniai pasikartoja ir yra dedup'inami.

Vienintiniai leidžiami transformacijos taškai (abu su fiksuotu pločių allowlist):

| Endpointas | Leidžiami `w` | Fallback |
| ---------- | ------------- | -------- |
| `/api/mods/:id/thumbnail/img` | 64, 96, 128 | 302 → kanoninis `w=64` |
| `/api/img/proxy` | 384, 768, 960, 1200, 1600, 1920 | 302 → kanoninis `w=960` |

Taisyklės:

- Neleistinas `w` (pvz. bot `w=33`) visada gauna **302 į kanoninį URL** —
  tai dedup'ina ir edge cache, ir unikalių transformacijų derinius.
- Nauji `cf.image` naudojimo taškai kode — **draudžiami** be savininko
  leidimo (`fetch(url, { cf: { image: … } })`).
- Frontendas pločius ima tik iš `SIZE_PX` (ModThumbnail) ir fiksuotų
  `modScreenshotProxyUrl` kvietimų (960 galerija, 1600 lightbox).
- Senasis Pages projektas `armamods-leaderboard.pages.dev` **sunaikintas
  2026-09-09** — jis aptarnavo seną kodą ir generavo ~20k transformacijų/periodą.
  Neprikabinti prie jo atgal.
- **`workers_dev = false`** (`web/wrangler.toml`, 2026-09-09) — workers.dev
  subdomainas išjungtas. Vienintelis viešas puslapis yra **reforgermods.com**
  (zonos DNS); jokie dublikatai (pages.dev / workers.dev) nebeatkuriami.

## KV (trending_snapshots)

**Politika: reads < 10M/mėn (free lygis), siekiam < 5M/mėn.**

- `/api/mods` non-default laukai (author/thumbnail/workshopStatus) skaitomi iš
  vieno agreguoto `cache:bundle:modfields:reforger` rakto (v1.23.32) —
  ne iš ~22k per-mod raktų.
- Naujos per-mod raktų „ventiliacijos" (loop'ai su `kv.get` pagal modą)
  rašant naują funkcionalumą — neleistinos: pirmiausia apsvarstyti bundle.
- Known fazės 2 (dar neoptimizuota): mod detail server chunk scan (~15
  reads), istorijos shard skenavimas (~28 reads).

## D1

Armamods šiuo metu D1 nenaudoja (`armamdos` DB — 0 rows read). Jei ateityje
naudosime — prieš deploy privalomas `EXPLAIN QUERY PLAN` (indekso
patvirtinimas) — pamoka iš basketballmanager 37B rows read incidento.

## Stebėjimas

- KV/Workers/D1 usage per parą: GraphQL `kvOperationsAdaptiveGroups`,
  `workersInvocationsAdaptive`, `d1AnalyticsAdaptiveGroups` (tokenas .env).
- Images unique per mėnesį: GraphQL `imagesUniqueTransformations`.
