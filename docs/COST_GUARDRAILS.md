# Cost Guardrails — Cloudflare resursų politika

Projektas turi būti efektyvus naudodamas resursus. Šis lapas fiksuoja mokamų
Cloudflare produktų naudojimo ribas ir vienintinius leidžiamus taškus kode.
Nauji mokamų operacijų taškai kuriami tik savininkui patvirtinus
(**išimtis: Images transformations — visiškai atsakotos, žr. žemiau**).

## Images transformations

**Politika (savininko sprendimas 2026-09-09): CF Images transformations
šiame projekte ATSAKOMOS. Naujų `cf.image` naudojimo taškų NEKURIAMA —
ankstesnis „savininkui patvirtinus" kelias panaikintas, išimčių nėra.**

Istorinė riba buvo < 5k unikalių (paveikslėlis, parinktys) porų/mėn (free
lygis, po to $5/100k). Billingas skaičiuoja UNIKALIAS (paveikslėlis,
parinktys) poras — ne requestus.

**Legacy taškai — tik du, jų NEPLĖSTI** (allowlist ir 302 fallback lieka,
kol taškai gyvi; naujų pločių ar derinių nedėti):

| Endpointas | Leidžiami `w` | Fallback |
| ---------- | ------------- | -------- |
| `/api/mods/:id/thumbnail/img` | 64, 96, 128 | 302 → kanoninis `w=64` |
| `/api/img/proxy` | 384, 768, 960, 1200, 1600, 1920 | 302 → kanoninis `w=960` |

Taisyklės:

- Neleistinas `w` (pvz. bot `w=33`) visada gauna **302 į kanoninį URL** —
  tai dedup'ina ir edge cache, ir unikalių transformacijų derinius.
- Nauji `cf.image` naudojimo taškai kode — **draudžiami visada**
  (`fetch(url, { cf: { image: … } })`).
- **Legacy taškų šalinimas — tik atskiru savininko sprendimu ir su
  pakaitalu.** Pilnas išjungimas be pakaitalo duotų ~2.4 MB mobilųjį
  atsisiuntimų regresiją (v1.23.33 analizė). Įmanomos kryptys: iš anksto
  paruošti dydžiai (R2/edge cache, generuojama kolektoriaus pusėje) arba
  originalų tiekimas tik dideliems ekranams. Cloudflare Images „variants"
  **netinka** — originalai saugomi Workshop CDN, ne CF Images saugojime.
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
