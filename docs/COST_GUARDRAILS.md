# Cost Guardrails — Cloudflare resursų politika

Projektas turi būti efektyvus naudodamas resursus. Šis lapas fiksuoja mokamų
Cloudflare produktų naudojimo ribas ir vienintinius leidžiamus taškus kode.
Nauji mokamų operacijų taškai kuriami tik savininkui patvirtinus
(**Images transformations — pašalintos 2026-09-28, žr. žemiau**).

## Images transformations — pašalintos

**Politika (savininko sprendimas 2026-09-28): CF Images transformacijos šiame
projekte NENAUDOJAMOS.** Kode nebeliko nė vieno `cf.image` /
`/cdn-cgi/image` taško, o zonoje `image_resizing = off` (kill switch, kad
net botų URL užklausos negeneruotų transformacijų).

Istorija: 2026-09-09 buvo atsisakyta NAUJŲ taškų, o du legacy taškai
(`/api/mods/:id/thumbnail/img`, `/api/img/proxy`) palikti su pločių
allowlist. Sprendimas neišsilaikė: 09-28 account-wide mėnesio kaupiklis
rodė **8 655 unikalias** transformacijas (>5k free ribos; ~240/d. tempas po
Pages sunaikinimo), ir skaičius struktūriškai auga su katalogu × pločiais.
Todėl abu taškai **ištrinti**, o frontendas krauna originalus tiesiogiai iš
Workshop CDN (sąmoninga ~2.4 MB mobilioji regresija, v1.23.33 analizė;
thumbnailai lazy per `IntersectionObserver`, krovimo klaida → raidės
placeholder).

Jei kada grįžtama prie optimizavimo — **tik su aiškiu savininko
patvirtinimu** ir be CF Images: iš anksto paruošti dydžiai R2 (generuojama
kolektoriaus pusėje), tiekiant iš edge cache. Cloudflare Images „variants"
netinka — originalai saugomi Workshop CDN, ne CF Images saugojime.

Likušios taisyklės:

- **`workers_dev = false`** (`web/wrangler.toml`, 2026-09-09) — workers.dev
  subdomainas išjungtas. Vienintelis viešas puslapis yra **reforgermods.com**
  (zonos DNS); jokie dublikatai (pages.dev / workers.dev) nebeatkuriami.
- Senasis Pages projektas `armamods-leaderboard.pages.dev` **sunaikintas
  2026-09-09** — jis aptarnavo seną kodą ir generavo ~20k transformacijų/periodą.
  Neprikabinti prie jo atgal.

## Workers CPU

**Politika: vidurkis < 10 ms CPU/request; bendras < ~500k ms/dieną.**
(09-28 tyrimas: 1.29M ms/d. ir avg 41 ms/req; pikas 2.2M — v1.23.46 taisymai.)

- Didžiausi šaltiniai: `mod-changes` (~36%; cold kelias parse'ino visus 12
  modpack ring chunk'ų per request) ir `history` (~12%; skaitė visus shard'us).
  ~56% šių requestų — SEO/AI crawleriai (Bytespider, AhrefsBot, Reflectionbot),
  kurie renderina SPA ir kviečia API.
- Guardrail'ai: `robots.txt` `Disallow: /api/`; WAF rule
  `armamods-api-bot-guard` blokuoja SEO/AI crawlerius `/api/*` iki Worker'io
  (Googlebot/Bingbot nepaliečiami — jiems serviruojamas prerender HTML).
- Kode: modpack ring'as — isolate cache per versiją (`loadModpackDiffRing`);
  mod/server history — skaitymas nuo uodegos su `historyCutoffPrefix`
  (ne visi chunk'ai); mod-changes atsakymo TTL 6h.
- **Nauji istorijos/ring'ų skaitytojai privalo naudoti tail-stop** (uodegos
  chunk'ai + `firstPointTime` riba) — per-request didelių ring'ų `JSON.parse`
  ar visų shard'ų skenavimas neleistinas.
- Stebėjimas: Observability `$workers.cpuTimeMs` per `$metadata.trigger`
  (atskirais kvietimais sum + count — kombinacija grąžina tuščią agregatą);
  GraphQL `workersInvocationsAdaptive` per `scriptName`.

## KV (trending_snapshots)

**Politika: reads < 10M/mėn (free lygis), siekiam < 5M/mėn.**

- `/api/mods` non-default laukai (author/thumbnail/workshopStatus) skaitomi iš
  vieno agreguoto `cache:bundle:modfields:reforger` rakto (v1.23.32) —
  ne iš ~22k per-mod raktų.
- **Kolektorius buvo didžiausias reads generatorius** (09-16 auditas):
  per-mod size/author read'ai iš ~22k sąrašo kas pilną run'ą → ~45–50K
  reads/run (~33M/mėn tempas, ~$12,5/mėn). v1.23.40: agreguotas
  `cache:bundle:modsizes:<game>` (1 read + 1 write/run), author'iai — iš
  modfields bundle. **Išmatuota 09-17 (15h langas): 728K → 102K reads/dieną
  (~3.1M/mėn, $0)** — < 5M tikslas tenkintas. Per-mod raktai rašomi toliau
  (worker'io fallback'ams); jų loop'inis SKAITYMAS kolektoriuje grįžta tik
  per vienkartinį bootstrap (bundle'ui dingus).
- Naujos per-mod raktų „ventiliacijos" (loop'ai su `kv.get` pagal modą)
  rašant naują funkcionalumą — neleistinos: pirmiausia apsvarstyti bundle.
- Known fazės 2 (dar neoptimizuota): mod detail server chunk scan (~15
  reads), istorijos shard skenavimas (~28 reads). **09-17: istorijos full-scan
`fetchModHistoryPoints` (worker.ts) įrodyta kaip `exceededMemory` šaltinis —
  19 klaidų per 09-16 (5+14 vienose minutėse, kai kelios lygiagrečios
  istorijos užklausos toje pačioje izoliate kartu viršija 128 MB).** Fix'as —
  skaityti tik uodegos shard'us pagal `days` langą (chunk'ai laike surūšiuoti).

## D1

Armamods šiuo metu D1 nenaudoja (`armamdos` DB — 0 rows read). Jei ateityje
naudosime — prieš deploy privalomas `EXPLAIN QUERY PLAN` (indekso
patvirtinimas) — pamoka iš basketballmanager 37B rows read incidento.

## Stebėjimas

- KV/Workers/D1 usage per parą: GraphQL `kvOperationsAdaptiveGroups`,
  `workersInvocationsAdaptive`, `d1AnalyticsAdaptiveGroups` (tokenas .env).
- Images unique per mėnesį (kontrolei, kad liktų 0): GraphQL
  `imagesUniqueTransformations`.
