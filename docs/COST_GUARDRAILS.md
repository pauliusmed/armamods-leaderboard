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

> ⚠️ **Riba praktiškai neatspėjama nuo 09-28.** Ką tik pasiekti skaičiai
> (matuota 09-30, po v1.23.45-46 deploy): **~810k ms/d., avg 61 ms/req**,
> p50 13–15 ms, p90 ~216 ms, p99 ~540 ms, max 1 092 ms. Lygiagreti su
> 09-28 bazės matavimu (1.29M ms/d., avg 41 ms/req) tai **−37 % bendro
> CPU**, bet **+50 % CPU į vieną invokaciją**.
>
> **Priežasnis, svarbus interpretacijai:** 09-28 deployas (Workers Caching)
> sutrumpino Worker invokacijas ~3.9× (50k → 17k/24h). Į Worker'į dabar
> atlieka tik cache-miss'ai — t. y. brangiausios užklausos, o ne pigios.
> Vidurkis todėl auga mechaniškai, o realus pinigų efektas yra atvirkščias.
>
> **Kodėl riba realistiška arba ne:** Workers CPU skaitiklis — vienintelis
> artas prie free ribos (30M ms/mėn; dabar 24.3M = 81 %). Requests (6.9M/mėn
> = 69 % nuo 10M) ir KV reads (2.6M/mėn = 26 % nuo 10M) — žymių atsarga.
> Visa sąskaita dabar ≈ $5/mėn (Workers Paid bazė), viršijimo $0.
> Net 3× traffic → ~+$4/mėn. **Optimizuoti reikia ne dėl pinigų, o dėl
> atsparumo ir 128 MB RAM sienos.**
>
> **Konkretus neatneštas kandidatas:** CPU deginamas ne KV reads, o 5 MB
> shard'o *teksto skenavime* — `findMatchingBrace` (`server-lookup.ts`) yra
> char-by-char JS ciklas per 5 MB, plius `chunkText.includes()` + `JSON.parse`
> per shard. Tai matyti kaip ~900–1092 ms p99/max. Ticketų neatidaryta.

- Didžiausi šaltiniai (09-30, p95 per path): `/server/:id` **376 ms**,
  `/api/servers/:id/mod-changes` **181 ms**, `/api/servers/:id/storage` 114 ms,
  `/arma3/server/:id` 48–93 ms. `/mod/*`, `/api/mods/*/thumbnail/img`,
  `/api/og/preview/*` — 3–9 ms (pigūs).
- Iš anksto 09-28: didžiausi šaltiniai buvo `mod-changes` (~36 %; cold kelias
  parse'ino visus 12 modpack ring chunk'ų per request) ir `history` (~12 %;
  skaitė visus shard'us). ~56 % tų requestų — SEO/AI crawleriai
  (Bytespider, AhrefsBot, Reflectionbot), kurie renderina SPA.
- Guardrail'ai: `robots.txt` `Disallow: /api/`; WAF rule
  `armamods-api-bot-guard` blokuoja SEO/AI crawlerius `/api/*` iki Worker'io
  (Googlebot/Bingbot nepaliečiami — jiems serviruojamas prerender HTML).
- Kode: modpack ring'as — isolate cache per versiją (`loadModpackDiffRing`);
  mod/server history — skaitymas nuo uodegos su `historyCutoffPrefix`
  (ne visi chunk'ai); mod-changes atsakymo TTL 6h; share prerender serverių
  paieška per `servers-index` (`ServerLookup`, v1.23.47) vietoj ~16 nuoseklių
  shard'ų.
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
- **Išmatuota 09-30 (24 val.): 85 817 reads/dieną** (~2.6M/mėn, **26 %** nuo
  10M/mėn free ribos) → **$0 viršijimo**. Iš anksto (prieš 09-28 deployą)
  buvo ~156k–269k/dieną; deployas Workers Caching įjungimu sumažino ~53 %.
  Vidurkis **5.05 reads/Worker invokacija**.
- **Kodėl tai mažai svarbu finansiškai:** KV reads nemokamos iki 10M/mėn, o
  dabar naudojama 26 %. Kiekvienas papildomas reads „sutaupymas" čia yra be
  piniginės vertės — jis svarbus tik kaip **proxy į CPU** (kv.get → await →
  parse) ir kaip signalas apie neefektyvų kelią.
- **09-30 read'ų pasiskirstymas (1 % trace sampling, ~130 KV spanų):**
  `cache:servers:<shard>` **38 %** · `cache:mods:meta` **32 %** ·
  `cache:mod-size:*` 12 % · og-image/history/lastUpdate ~10 % ·
  `cache:mod-alias:*` **2.3 %**.
- **09-30 atmesti „optimizacijos" (matavimo pagrindu, ne pagal kodo auditą):**
  - *mod-sizes bundle fast-path* (`applySizesFromBundle` į
    `resolveModSizesBatch`) — taupytų ~12 % reads, bet pridėtų ~550 KB
    `JSON.parse` per 5 min per izoliatą (~43 CPU-s/d = ~5 % CPU biudžeto).
    **Netas neigiamas.** Kol kas neatidaryta.
  - *alias 301 po `caches.default.match()`* (`worker.ts` ~2560) — 2.3 % reads.
    Ne vertas atskiro pataisymo.
  - **Prieštarinantis faktas:** kodo auditas rodė „60–220 reads per
    `/api/servers/:id/storage` requestą", bet **išmatuotas vidurkis 5.05**
    to patvirtina nepatvirtina — leaderboard eilutės jau neša `sizeBytes`, todėl
    `workshop-fetch.ts:846` per-mod loopas praktiškai nepasiekiamas.
    **Matuok, o ne tiki kodu.**
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
