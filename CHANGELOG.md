# Changelog

Release notes nuo v1.18.0. Pilna istorija žemiau.

## [1.22.0] - 2026-07-09

### ⭐ Mod favorites (localStorage)
- **`FavoriteModButton`** — ★ ant mod leaderboard, trending ir mod detail.
- **`useModFavorites`** — iki 20 modų per žaidimą, `localStorage`, sync tarp komponentų.
- **Mod leaderboard** — favorites blokas viršuje (1 puslapis, be paieškos); dedupe iš pagrindinio sąrašo.
- **Trending** — favorites blokas virš aktyvios kategorijos.

### 🏷️ Owned voice (mažiau „BattleMetrics“ UI)
- **`siteCopy.ts`** — centralizuotas vartotojo tekstas (`live network data`, `network scan`).
- Footer atributacija vietoj „DataSource: BattleMetrics“ visur header'yje.
- Mod detail, scenarios, storage landing, server status — neutralūs aprašymai.

### 🤝 Co-deploy fix
- **`CoDeployTable`** — rodo **Shared servers** (`count`), ne globalų Personnel/Deploy.
- Collector: uppercase `modId`, teisingi pavadinimai co-deploy sąraše.

### 🟢 Server last seen online
- **`bmLastSeenAt`** — collector saugo paskutinį online scan laiką; **`BmLastSeenHint`** server list/detail.

### ♿ Accessibility
- **Layout** — vienas `<h1>` per puslapį (`StatsHero`); logo `<p>`.
- **Touch targets** — Copy/Workshop/favorite mygtukai 44px mobile; galerijos dots su padding.

### 📉 Server uptime history (grafikas)
- Collector saugo **online** pavyzdį kiekvienam scan (~2h); dienoms/savaitėms agreguoja `on/n`.
- **Saugiklis** — diena/savaitė pažymima offline tik jei &lt;50% scanų matė serverį online (trumpas restartas nepažymi visos dienos).
- **Server detail** grafikas — rožiniai `ReferenceArea` offline periodams; tooltip rodo uptime % arba hourly „Online/Offline at scan“.
- **`server-uptime-history.ts`** — merge, classify, `buildOfflineBands`; testai `test/server-uptime-history.test.ts`.

## [1.21.0] - 2026-07-09

### 📋 Server config copy (one-click `game.mods[]`)
- **`CopyModConfigButton`** — bendras UI komponentas; kopijuoja paruoštą `config.json` bloką (`modId` + `name`, 12-space indent, trailing comma).
- **Mod leaderboard** (`/`) — **Actions** stulpelis: **Copy** + **Workshop ↗** kiekvienoje eilutėje (`ModRow`).
- **Trending** (`/trending`) — tas pats **Copy** ant **Rising**, **Falling** ir **New** lentelių (`TrendRow`).
- **Server detail** — **Copy mods** kopijuoja visą serverio modpack kaip sujungtus `game.mods[]` blokus (`formatServerModsConfigSnippet`).
- **Mod detail** — kompaktiškas `ModConfigPanel` hero zonoje (desktop); pilno pločio turinys žemiau (grafikai, lentelės).
- **Tests**: `test/mod-config.test.ts` — vieno mod'o ir pilno modpack snippet formatavimas.

### 👤 Mod authors & workshop UX
- **Clickable author** — `ModAuthorLink` mod kortelėse/detail; nuoroda į `/?q=<author>` mod leaderboard'e.
- **Mod detail hero** — workshop thumbnail šalia pavadinimo; inline `ModWorkshopGallery` (3 stulpelių hero: info | screenshots | stats/config).
- **Galerija** — slideshow su rodyklėmis/dots kai 2+ shot'ai; 4:3 rėmas landscape; 3+ paveikslėlių atveju grid susitraukia į inline slideshow.
- **Galerijos lightbox** — paspaudus screenshot atsidaro in-page preview su rodyklėmis (`GalleryLightbox`), ne naujas tab; **Full size ↗** jei reikia originalo.
- **Active Deployed Servers** mod detail — paginacija **20 per puslapį** (rikiuota pagal žaidėjus).

### 🟢 BattleMetrics server status
- **Collector** — saugo `bmStatus` iš BattleMetrics `attributes.status` (`online` / `offline`; fadeaway → `offline`).
- **Server list** — `ServerStatusBadge` + filtras pagal BM statusą (`BM_STATUS_FILTER_OPTIONS`).
- **Tests**: `test/server-status.test.ts`.

### ⛓️ Dependency Blockers
- **`/dependency-blockers`** — pasirink serverį + tikslinį modą; rodo reverse dependents, kuriuos reikia pašalinti pirmiau (`findReverseDependentsOnServer`).
- **UI**: supaprastinti serverio ir mod'o picker'iai.

### ⚡ Performance (PageSpeed / leaderboard)
- **`GET /api/mods`** — įterpia cached `author`, `thumbnail`, `workshopStatus` dabartiniam page slice (pašalina ~72 per-row API užklausas sąrašo įkėlimui).
- **`GET /api/mods/:id/thumbnail/img?w=`** — sumažintų thumbnail proxy (Cloudflare Image Resizing kai prieinama; redirect fallback).
- **`ModThumbnail`** — `IntersectionObserver` lazy load; sąrašo eilutės naudoja resize proxy, ne pilnos CDN rezoliucijos.
- **`ModAuthorCell` / `useWorkshopStatus`** — praleidžia fetch kai `author` / `workshopStatus` jau ateina iš list API.
- **Route code-splitting** — `ModDetail`, `ServerDetail`, Storage Planner, Audit ir kt. lazy-loaded (`React.lazy`).
- **`preconnect`** — `ar-gcp-cdn.bistudio.com` `index.html`.

### ♿ Accessibility
- **Sortable table headers** — `aria-sort` ant `<th scope="col">`, ne ant vidinio `<button>`.
- **Workshop links** — per-mod `aria-label` leaderboard/trending eilutėse.

### 📚 Dokumentacija
- [CHANGELOG.md](CHANGELOG.md), [README.md](README.md), [walkthrough.md](walkthrough.md).
- [docs/PERFORMANCE.md](docs/PERFORMANCE.md), [docs/WORKSHOP_METADATA.md](docs/WORKSHOP_METADATA.md), [docs/UI_FILTERS.md](docs/UI_FILTERS.md).

## [1.20.0] - 2026-07-06

### 💾 Storage Planner — size accuracy
- **Conservative fit**: `fitBytesForSummary` uses known-only bytes for FITS/OVER LIMIT when below 90% mods have workshop sizes (`SIZE_COVERAGE_FIT_THRESHOLD`); avoids false over-limit on heavy stacks with partial cache.
- **Hero UI**: Combined modpack shows **known** total + `~est.` subtitle when coverage incomplete; Status notes `OK (known sizes only)` when fit is conservative.
- **Collector**: `warmServerModpackModSizes` — workshop scrape for up to 500 mods on active servers (beyond global top-300 warm).
- **API**: `analysis.fitBytes`, `analysis.fitBasis` on `POST /api/storage/plan`.
- **Tests**: conservative fit + partial-coverage server-set cases in `storage-calc.test.ts`, `server-set-analysis.test.ts`.
- **Docs**: [docs/STORAGE_PLANNER.md](docs/STORAGE_PLANNER.md) — known vs estimated totals, fit logic.

### 🗺️ Scenario classification (workshop vs official)
- **Collector**: `buildScenarioRanking` now classifies each scenario — workshop mod via server-mod intersection, official via `#AR-` prefix + 31-entry static registry.
- **UI** `/scenarios`: type badges, links to `/mod/:id` (workshop) or `/scenarios/official/:slug` (vanilla).
- **Reference** `/scenarios/official`: all built-in Bohemia scenarios with `scenarioId` paths for server config.

### ⚡ Performance
- **`ServerLookup`**: `POST /api/storage/plan` loads server KV shards once per request (was N× reload for main + wanted servers).
- **Mod search**: two-pass filter — name/id first; author KV cache only when name/id returns zero hits.
- **Client**: server list in-memory cache 5 min (aligned with edge).
- **Docs**: [docs/PERFORMANCE.md](docs/PERFORMANCE.md) — intentional trade-offs + known limits.

## [1.19.0] - 2026-07-02

### 🎛️ Unified list filters
- **`ListFilterBar`** (`web/src/components/ui/ListFilterBar.tsx`) — shared sticky filter toolbar for mods, servers, scenarios, and server-detail mod stack.
- **English labels** everywhere: `// SEARCH`, `Activity: …`, `Sort: …`, `Console: Fits PS5 (25 GB)` (replaces mixed `PERSONNEL_IDX` / `SCAN FOR TITLES` variants).
- **Server detail mod stack**: size-tier filter (heavy/medium/small/unknown), sort by deploy & share; filter logic in `web/src/lib/modListFilters.ts`.
- **Mod leaderboard search**: query matches mod name, id, and cached workshop **author** (Reforger).
- **Docs**: [docs/UI_FILTERS.md](docs/UI_FILTERS.md).
- **`/audit`**: summary reduced to four buckets (Remove / Review / Keep / Low-no data); defaults to Remove list for post-1.7 broken mods.

## [1.18.0] - 2026-07-02

### 💾 Storage Planner (console mod space)
- **Workshop mod sizes**: Reforger workshop scrape → KV `cache:mod-size:{game}:{modId}` (7d), unified with existing `ensureReforgerWorkshopMetadata()` fetch.
- **API**: `GET /api/mods/:id/size`, `GET /api/servers/:id/storage`, `POST /api/storage/plan`, `POST /api/storage/sizes` (batch workshop fetch).
- **UI** `/storage-planner`: server search on main + wanted lists, progressive size loading, per-section disk totals (GB).
- **SEO landing** `/arma-reforger-console-mod-storage`: problem/solution copy, FAQ + JSON-LD, CTAs → planner (PS5/Xbox mod storage keywords).
- **Sitemap**: `web/public/sitemap.xml` + `robots.txt` for search indexing.
- **Server detail**: modpack size in hero, per-mod download size, link to Storage Planner with `?main=`; **Installed Mod Stack** filters via shared `ListFilterBar` (search, activity, rank, size tier, sort by deploy/share) — see [docs/UI_FILTERS.md](docs/UI_FILTERS.md).
- **Fix**: workshop size parser reads `Version size` from SSR `<dl>` text (not only `__NEXT_DATA__`); uppercase mod GUID in fetch URL; `cacheOnly` plan mode for fast KV refresh while batch-loading sizes.
- **Storage sizes source**: planner reads `sizeBytes` from leaderboard KV + `cache:mod-size:*` (no live workshop scrape); collector copies cached sizes into mod chunks each run.
- **UX**: storage planner loading panel with progress bar, stage labels, and elapsed timer (no frozen `0/N` workshop counter).
- **Storage planner server list**: loads up to 5000 servers from KV (was 500); caches server names in `localStorage`; shows **Not in network** when a saved ID is missing from collector data (no infinite Loading).
- **Mod size surfaces**: download size on mod detail + leaderboard **Size** column (sortable); server list **Modpack** total (collector precomputes per server).
- **Collector**: warms `cache:mod-size` for top 300 mods from workshop when cache is empty.
- **Server list**: sortable column headers (Rank, Server, Players, Mods, Modpack); **Vanilla** label when modpack is empty; **console fit** badges (≤25 GB / Heavy), modpack size on mobile, filters for PS5 / Xbox S / X / vanilla-only.
- **Storage planner**: PS5 preset corrected to **25 GB** (official Workshop allocation per Bohemia/Sony); similar-server suggestions with lower mod stack cost (`findStorageAlternatives`); **modpack set** feedback — clusters selected servers by mod family and suggests fitting combinations; deduplicated results UI (no double modpack-set block).
- **Docs**: [docs/STORAGE_PLANNER.md](docs/STORAGE_PLANNER.md) — console mod sizes, API, planner UX, server list integration.
- **Workshop availability**: `GET /api/mods/:id/workshop-status` — KV cache for removed/delisted Reforger mods (`unavailable` TTL 48h); **Nebe Workshop** badge on leaderboard + trending rows; mod detail banner + disabled Workshop CTA when unavailable (BM telemetry unchanged).

## [1.17.0] - 2026-06-30

### 🗺️ Scenario leaderboard + Tools navigacija
- **Scenario leaderboard** (`/scenarios`, `/arma3/scenarios`): scenarijai agreguojami collector run metu → KV `cache:ranking:scenarios:{game}` su `rank`, serverių sk., žaidėjų suma, vid. užpildymu, top serveriu.
- **API**: `GET /api/scenarios` (reitingas iš KV, live fallback iki kito run), `GET /api/scenarios/servers?name=` (serveriai pagal scenarijų).
- **Navigacija**: Config Audit ir Get Hosting perkelti į **Tools** dropdown; naujas **Scenarios** punktas header'yje.
- **Server detail**: scenario pavadinimas nuoroda į atitinkamą scenario leaderboard su `?s=` filtru.

### 📋 Mod detail — serverių savininkų įrankiai + workshop metadata
- **config.json snippet**: Kairysis sidebar panelis su visada matomu `game.mods[]` įrašu (`modId` + `name` iš DB), vieno paspaudimo **Copy** ir **Reforger Workshop ↗** nuoroda. Formatas paruoštas įklijavimui į serverio `config.json`.
- **Savininko įrankių panelė**: `ModConfigPanel` (thumbnail, `game.mods[]` snippet, Copy, Workshop) desktop'e — **sticky dešinys rail**, kad Copy/Workshop liktų pasiekiami slankant visą puslapį; mobile — inline po galerija. **Back to Registry** headerio viršuje. Thumbnail tikras kvadratas (anksčiau atsivaizdavo plona juostele), mygtukai lieknesni.
- **Workshop screenshot galerija**: `GET /api/mods/:id/gallery` — on-demand scrape iš `previews` + `screenshots` (`__NEXT_DATA__`); KV cache 7d. Mod detail rodo carousel tik kai 2+ shot'ai (vienas slide, rodyklės, dots).
- **Workshop datos**: `createdAt` / `updatedAt` iš workshop → **Created** ir **Last Modified** (DD.MM.YYYY) mod detail antraštėje; KV `cache:mod-dates:*`, įtraukta į `ensureReforgerWorkshopMetadata()`.
- **SQE Points paslėpti**: Serverio profilyje (`ServerDetail`) neberodomas `sqePoints` — lieka tik Overall Rank ir tier badge.

### 🧪 Testai
- `test/mod-config.test.ts` — `formatModConfigSnippet()`
- `test/scenario-ranking.test.ts` — `buildScenarioRanking()` agregacija

## [1.16.0] - 2026-06-27

### 🏅 Serverių tier sistema + įskiepiamas badge (prestižo sluoksnis)
- **S / A / B / C tier'ai**: kiekvienam serveriui tier pagal tenure-weighted reitingo percentilį (S top ~2%, A ~8%, B ~25%, C ~60%). **Raidės**, o ne „Apex/Vanguard" tipo žodžiai — nes šie sutampa su pačių serverių pavadinimais. Elito tier pasiekiamas tik su tenure (įrodytais serveriais).
- **Įskiepiamas SVG badge**: `GET /api/badge/server/:id` — savininkai įdeda į Discord/svetainę, rodo gyvą tier + reitingą + pavadinimą. Psichologiškai svarbiausia (didžiavimasis + nemokama rinkodara / backlink'ai).
- **UI**: `TierBadge` ženkliukas ant serverių sąrašo eilutės (prie reitingo) ir `ServerDetail` „Overall Rank" bloko.
- **Tipai**: `Server.sqeTier` (`'S'|'A'|'B'|'C'|null`).
- **Dokumentacija**: `docs/ALGORITHM.md` — Quality Tiers sekcija.
- Tier įsigalioja kito kolektoriaus run'o metu (collector įrašo `sqeTier` į serverių chunks, leaderboard ir sqeIndex).

## [1.15.0] - 2026-06-26

### 🏆 Serverių reitingavimo stabilumas („elito" reitingas)
- **Problema**: naujas serveris, pasirodęs pirmą kartą, gaudavo **pilną** snapshot'o balą (apeidamas EMA) ir galėdavo iš karto užimti #1 — pvz. serveris, pasirodęs tą pačią dieną, tapdavo lyderiu vienu snapshot'u. Priežastis: EMA istorija buvo saugoma tik buvusiems top-200, todėl visi kiti (ir nauji) kiekviename run'e įeidavo pilnu svoriu.
- **Persisted EMA visiems serveriams** (`cache:server_ema:{game}`): kiekvienas serveris turi tęstinę EMA reikšmę + `age` tarp run'ų — joks serveris nebeįeina pilnu snapshot'u.
- **Tenure weighting (lygis × ilgalaikis indėlis)**: reitingo svoris = kokybė × tenure, kur tenure ramp'inasi 25%→100% per ~14 dienų (168 run'ai) buvimo online. Vienas snapshot'as nebevainikuoja naujo serverio #1, o mėnesį išlaikyta kokybė lenkia savaitės. Pakeičia ankstesnį dirbtinį seed×0.5 tikresniu, duomenimis grįstu mechanizmu.
- **Elito age gate**: top-3 inercijos (×1.05) cushion taikomas tik serveriams su `age ≥ 12` (~24h) — naujokai negali pasinaudoti.
- **Warm-start migracija**: pirmas run'as po deploy seed'ina EMA map iš esamo top-200 leaderboardo, kad seni reitingai nenulūžtų.
- **Dokumentacija**: `docs/ALGORITHM.md` atnaujinta (Persistence, New Entrant Seeding, age gate).

## [1.14.9] - 2026-06-26

### 📋 Server scenario + mod author
- **Collector**: `scenarioName` iš BM — Reforger `details.reforger.scenarioName`, Arma 3 `map · mission`.
- **Workshop**: `asset.author.username` → KV `cache:mod-author:*` (7d), vienas scrape su thumbnail/deps.
- **API**: `GET /mods/:id` papildomas `author` (Reforger).
- **UI**: scenario serverių sąraše ir detail; author mod detail antraštėje.

## [1.14.8] - 2026-06-26

### 🖼️ Workshop thumbnail našumas + dokumentacija
- **Tiesioginis CDN load**: `GET /api/mods/:id/thumbnail` grąžina JSON su Bohemia CDN URL; `ModThumbnail` nebekrauna per 302 redirect.
- **Vienas workshop scrape**: `workshop-fetch.ts` — `ensureReforgerWorkshopMetadata()` vienu HTML fetch užpildo ir thumbnail URL, ir dependencies KV.
- **Client cache 7d** + in-flight dedupe `modsApi.getThumbnailUrl()`.
- **Mod detail lentelės**: Dependencies, co-deploy ir serveriai — `ModDataTable` / `ServerDataTable` (kaip `/`).
- **Dokumentacija**: Naujas [docs/WORKSHOP_METADATA.md](docs/WORKSHOP_METADATA.md); atnaujinti PLAN, walkthrough, README.

## [1.14.7] - 2026-06-26

### 📦 Workshop dependencies (Reforger)
- **`/api/mods/:id/dependencies`**: On-demand scrape iš Reforger workshop `__NEXT_DATA__` (autoriaus deklaruoti privalomi modai); KV cache 7d + edge cache.
- **`workshop-meta.ts`**: `parseReforgerDependenciesFromHtml()` ir `resolveModDependencies()`.
- **Mod detail**: Naujas skyrius „Required Dependencies“; co-deploy aiškiai pažymėtas kaip BM statistika, ne dependency.
- **Arma 3**: Endpoint grąžina tuščią sąrašą (`supported: false`) — Steam scrape vėliau.

## [1.14.6] - 2026-06-26

### 🖼️ Workshop papildymas — thumbnail'ai ir CTA
- **ModThumbnail komponentas**: Lazy-loaded workshop preview per `/api/og/preview/mod/:id` (KV cache 7d); raidžių fallback, kai paveikslėlio nėra.
- **ModRow / TrendRow**: 32px thumbnail šalia mod pavadinimo — vizualus atpažinimas be katalogo UI.
- **Mod detail**: Didesnis preview + aiškus „Open in Workshop ↗“ CTA; pozicionavimas kaip workshop **papildymas** (live telemetry), ne pakaitalas.
- **workshop.ts**: Bendri `workshopPageUrl()` ir `modThumbnailUrl()` helperiai (Reforger + Steam Arma 3).
- **Dokumentacija**: Atnaujinti [PLAN.md](PLAN.md) (strategija + Phase 2) ir [walkthrough.md](walkthrough.md).

### 📱 Mobile overflow (anksčiau šią sesiją)
- ModList filtrai/paginacija ir TrendingPage tabai — `flex-wrap` / stulpelis mobiliai.
- Layout `overflow-x-hidden`; ModList sticky filtro `z-index` po headeriu.

## [1.14.5] - 2026-06-26

### 🖥️ Serverių SQE reitingų atkūrimas (API sluoksnis)
- **SQE indeksas KV**: Kolektorius rašo `cache:server_sqe:{game}` kompaktišką `{ id → rank, points }` žemėlapį visiems serveriams.
- **API enrichment**: `/api/servers` ir `/api/servers/:id` papildo atsakymus iš SQE indekso; jei indekso dar nėra – fallback iš top-200 `cache:ranking:servers` leaderboard.
- **API rikiavimas**: `/api/servers` numatytasis sortas pagal `sqeRank`, ne tik žaidėjų skaičių.

### 🎨 Favicon patikimumas
- Pridėti [favicon.png](web/public/favicon.png) ir [apple-touch-icon.png](web/public/apple-touch-icon.png) – PNG palaikymas Safari/iOS ir senesnėms naršyklėms.
- [favicon.svg](web/public/favicon.svg) perrašytas su `path` geometrija (be `<text>`), kuris kai kuriose naršyklėse nerodė ikonos.

## [1.14.4] - 2026-06-26

### 🖥️ Serverių sąrašo ( /servers ) pataisymai
- **SQE reitingų atkūrimas kolektoriuje**: Pataisyta `runServerScoring()` klaida faile [collector.ts](scripts/collector.ts), kai `oldLeaderboard` kintamasis buvo deklaruotas vidiniame `try` bloke, bet naudojamas išorėje (`ReferenceError`). Dėl to visi serveriai KV buvo rašomi be `sqeRank` / `sqePoints`, o `/servers` puslapyje rodė `UNRANKED` ir neteisingą tvarką. Po fix'o reikia paleisti `npm run collect` (arba palaukti cron), kad KV duomenys atsinaujintų.
- **`/api/servers/ranking` maršruto prioritetas**: Endpointas perkeltas prieš `/servers/:serverId` faile [[[path]].ts](web/functions/api/[[path]].ts), kad `"ranking"` nebebūtų interpretuojamas kaip serverio ID (anksčiau grąžindavo `404 Server not found`).
- **Pagination dizaino suderinimas**: [Pagination.tsx](web/src/components/ui/Pagination.tsx) perrašytas taktiniu stiliumi (kaip [ModList.tsx](web/src/components/ModList.tsx)) — pašalintas baltas „rounded“ UI su violetine-rožine gradientu.
- **Rikiavimo ir filtro patobulinimai**: [useServers.ts](web/src/hooks/useServers.ts) — SQE rank rikiavimas su žaidėjų skaičiaus tiebreaker; `resetFilters` grąžina numatytąjį `rank` sortą. [ServerCard.tsx](web/src/components/ServerCard.tsx) — `sqeRank` rodomas per `??`, ne `||`.

### 🎨 Favicon
- **Svetainės favicon**: Pridėtas [web/public/favicon.svg](web/public/favicon.svg) — oranžinis kvadratas su „AR“, atitinkantis header logotipą. `index.html` jau nurodė `/favicon.svg`, bet failo nebuvo.

## [1.14.3] - 2026-06-22

### 🛡️ Saugumo ir dokumentacijos klaidų ištaisymas
- **Nesaugaus debug endpointo pašalinimas**: Visiškai pašalintas `/api/debug/raw/:key` maršrutas iš [[[[path]].ts](file:///c:/Users/GrybasTv/Desktop/code/armamods/web/functions/api/[[path]].ts), kuris viešai atskleisdavo Cloudflare KV žaliąjį turinį be jokios autentifikacijos.
- **Wrangler konfigūracijos išvalymas**: Iš [wrangler.toml](file:///c:/Users/GrybasTv/Desktop/code/armamods/web/wrangler.toml) pašalintas nenaudojamas `WEBHOOK_SECRET` kintamasis.
- **Dokumentacijos EMA alpha reikšmės sutikslinimas**: Pataisyta klaidingai nurodyta $\alpha = 0.15$ reikšmė [README.md](file:///c:/Users/GrybasTv/Desktop/code/armamods/README.md), [docs/ALGORITHM.md](file:///c:/Users/GrybasTv/Desktop/code/armamods/docs/ALGORITHM.md) (15% offline decay pakeista į teisingą 10%) bei senesniuose `CHANGELOG.md` įrašuose į teisingą $\alpha = 0.10$ (90% / 10%), atitinkančią realią kolektoriaus elgseną bei algoritmo aprašymą.
- **Komentarų vertimas į anglų kalbą**: Lietuviški komentarai bei diagnostikos pranešimai išversti į anglų kalbą visuose šaltinio failuose — core logikoje ([collector.ts](file:///c:/Users/GrybasTv/Desktop/code/armamods/scripts/collector.ts), [[[path]].ts](file:///c:/Users/GrybasTv/Desktop/code/armamods/web/functions/api/[[path]].ts), [audit-config.ts](file:///c:/Users/GrybasTv/Desktop/code/armamods/web/functions/api/audit-config.ts)) bei ad-hoc diagnostikos skriptuose (`scripts/check-17-drop.mjs`, `check-config-bm.mjs`, `check-mod-gameversion.mjs`, `run-audit-local.mjs`) — siekiant užtikrinti vientisą repozitorijos toną.
- **README marketingo tono sušvelninimas**: Sušvelninti skambūs teiginiai („hype“) faile [README.md](file:///c:/Users/GrybasTv/Desktop/code/armamods/README.md) bei patikslintas vietinio paleidimo aprašas, aiškiai nubrėžiant ribą tarp vietinio proxy ir tikrosios edge funkcijų API architektūros.
- **Techninė ataskaita (walkthrough)**: Sukurtas [walkthrough.md](file:///c:/Users/GrybasTv/Desktop/code/armamods/walkthrough.md) — inžinerinis projekto pristatymas, apimantis duomenų srautą, komponentus, API paviršių bei pagrindinius architektūros sprendimus, skirtas naujam skaitytojui greitai susiorientuoti kode.

## [1.14.2] - 2026-06-07

### 📝 Dokumentacijos bei diagnostikos versijos atnaujinimai
- **README aplinkos kintamųjų bei sharding parametrų tikslinimas**: Failas [README.md](file:///c:/Users/GrybasTv/Desktop/code/Archyvas/armamods/README.md) atnaujintas pašalinant nenaudojamą `CLOUDFLARE_KV_NAMESPACE`, įtraukiant realiai naudojamus `CLOUDFLARE_API_TOKEN` bei `WORKER_URL` kintamuosius, ir pataisytas sharding aprašymas iš 1MB į teisingą 5MB.
- **Diagnostikos versijos sinchronizavimas**: API Gateway [\[\[path\]\].ts](file:///c:/Users/GrybasTv/Desktop/code/Archyvas/armamods/web/functions/api/[[path]].ts) faile pataisyta diagnostikos `/diagnostics` endpointo grąžinama versijos eilutė iš pasenusios `1.4.0-diag` į `1.14.1-diag` (atitinkančią dabartinę projekto būseną).

## [1.14.1] - 2026-06-07

### ⚡ API Našumo ir CPU viršijimo pataisymai (503/1102 klaidos)
- **Chirurginis serverių parsinimas (`splitJsonArray`)**: Pakeistas serverių informacijos gavimas modifikacijų detalių API maršrute (`/api/mods/:modId`) faile [[[path]].ts](file:///c:/Users/GrybasTv/Desktop/code/Archyvas/armamods/web/functions/api/[[path]].ts). Vietoj viso 2MB dydžio serverių sąrašo chunk'o parsinimo su `JSON.parse` (kas viršydavo 10ms CPU limitą nemokamame plane ir išmesdavo 503/1102 klaidas), dabar JSON tekstas išskaidomas į atskirų serverių teksto blokus. `JSON.parse` iškviečiamas tik tiems keliems serveriams, kurie iš tikrųjų naudoja ieškomą modifikaciją. Tai sumažino CPU laiko sąnaudas iki minimumo.

## [1.14.0] - 2026-06-07

### 🖥️ Panašių serverių sekcijos (Similar Deployed Servers) įdiegimas
- **Serverių panašumo algoritmas kliento pusėje**: Sukurtas `similarServers` skaičiavimo modulis faile [ServerDetail.tsx](file:///c:/Users/GrybasTv/Desktop/code/Archyvas/armamods/web/src/components/ServerDetail.tsx), kuris veikia 100% kliento naršyklėje (React aplinkoje). Algoritmas lygina esamo serverio modifikacijų sutapimą (naudojant *Jaccard similarity*) bei žaidėjų skaičiaus santykį, sujungdamas juos į bendrą balą (70% modų sutapimas, 30% žaidėjų skaičiaus panašumas).
- **0 papildomų KV operacijų**: Kadangi serverių sąrašas parsiunčiamas lygiagrečiai su pagrindine užklausa ir yra kešuojamas, ši funkcija neišnaudoja papildomų Cloudflare KV ar Workers CPU resursų (kvotų).
- **Premium atvaizdavimas**: Serverio detalių puslapyje pridėtas naujas vizualinis blokas „Similar Deployed Servers“, rodantis top 5 panašius serverius, jų aktyvių žaidėjų skaičių ir modifikacijų sutapimo procentą (Overlap %).

## [1.13.3] - 2026-06-07

### 🛠️ UI pataisymai (atsikratyta −0% užrašo ir CLS mažinimas)
- **dropPct sąlygos pataisymas**: Modifikacijų detalių ([ModDetail.tsx](file:///c:/Users/GrybasTv/Desktop/code/Archyvas/armamods/web/src/components/ModDetail.tsx)) ir bendro audito ([ConfigAuditPage.tsx](file:///c:/Users/GrybasTv/Desktop/code/Archyvas/armamods/web/src/components/ConfigAuditPage.tsx)) puslapiuose `dropPct` (populiarumo kritimo procentas) dabar atvaizduojamas tik tada, kai jo vertė yra griežtai didesnė už 0 (`dropPct > 0`). Tai išsprendžia problemą, kai modifikacijoms, kurios neprarado žaidėjų po 1.7 atnaujinimo, buvo rodomas klaidinantis ir matematiškai neteisingas `−0%` užrašas.
- **CLS (Layout Shift) mažinimas**: Pagrindiniam puslapio `<main>` konteineriui faile [Layout.tsx](file:///c:/Users/GrybasTv/Desktop/code/Archyvas/armamods/web/src/components/Layout.tsx) priskirta `min-h-[60vh]` taisyklė. Tai užtikrina, kad krovimosi metu (kai turinys dar nėra gautas iš API) puslapio apačia (`footer`) nebus pritraukta prie pat viršaus ir vėliau staigiai nenustumta žemyn, taip drastiškai pagerinant svetainės CLS rodiklį.

## [1.13.2] - 2026-06-07

### 📈 Audit – santykinio reitingo (populiarumo) pokytis procentais
- **Rank-based dropPct**: Audito klasifikacijoje populiarumo kritimas skaičiuojamas pagal Zipf'o dėsnį santykinio reitingo (BM rank) pokyčiui (`1 - rankBefore / rankRecent`), o ne pagal absoliutų žaidėjų skaičių. Tai apsaugo populiarius modus nuo klaidingų neigiamų įspėjimų (pvz., populiariausias modas, likęs #1 reitinge, rodo 0% kritimą, nepaisant sumažėjusios bendros Reforger žaidėjų populiacijos).
- **Fallback**: Jeigu reitingo duomenų nėra, automatiškai grįžtama prie absoliutaus žaidėjų skaičiaus vidurkio pokyčio skaičiavimo.

## [1.13.7] - 2026-06-04

### 📊 Wrangler observability
- `web/wrangler.toml`: įjungti Workers Logs + invocation logs (100% sampling) – logai išlieka po deploy, ne tik dashboard toggle.

## [1.13.6] - 2026-06-04

### 🔍 Serverių paieška – momentinė, visame tinkle
- `/servers` krauna visą serverių sąrašą (`full=1`) ir filtruoja naršyklėje – rezultatai matomi iš karto rašant.
- Pašalintas 800 ms debounce + lėtas KV skenavimas kiekvienai paieškai.
- „No servers match“ pranešimas, jei niekas netinka.

## [1.13.5] - 2026-06-04

### 🔍 Serverių paieška – žodžiai bet kokia tvarka
- „ukraine relax“ randa **Relax Ukraine** (visi tokenai pavadinime, ne tik tikslus substring).
- API + client filter; modų paieška – ta pati logika.

## [1.13.4] - 2026-06-04

### 🔍 Audit – 0–1 žaidėjų BM = Broken
- Po 1.7 tuščia + **dabar 0 ar 1** žaidėjas BM → **Broken** (be −70% reikalavimo).
- **Monitor** lieka tik kai dabar ≥2 žaidėjai, bet ekosistema vis dar „tuščia“.

## [1.13.3] - 2026-06-04

### 🔍 Audit – „Broken“ vietoj „Empty after 1.7“ esant −≥70%
- Tuščia po 1.7 + **−70% ar daugiau** → **Broken** (ne WARNING), net jei last 7d ~4–10 žaidėjų/d. (BM „keli“ = tuščia.)
- UI chip: **Broken** / **Monitor** (buvę Remove / Empty after 1.7).

## [1.13.2] - 2026-06-04

### 🔍 Audit – „ghost“ broken modai po 1.7
- **Remove (dead)**: 0 žaidėjų BM, modas vis dar ≥3 serverių config'e, tuščia po 1.7 – tipinis neveikiantis/stale modas (restart, RPT, Workshop versija).
- **Empty after 1.7 (warning)**: aiškesnis hint, jei modas vis dar tavo config'e.

## [1.13.1] - 2026-06-04

### ⚡ Lighthouse – CLS ir accessibility (mod sąrašas)
- **Skeleton grid** vietoj pilno „LOADING INTEL“ – footer nebešokinėja (mažesnis CLS).
- **`aria-label`** paieškos laukams ir select filtrams (ModList, ServerList).
- **Heading**: mod kortelės `h2`, footer „Operation“ → `h2` (h1 → h2 hierarchija).

## [1.13.0] - 2026-06-04

### 🔗 Social share previews (Discord / OG)
- **Pages middleware**: crawler'iams (`Discordbot`, `facebookexternalhit`, …) `/mod/*` ir `/server/*` grąžina HTML su dinaminiais **Open Graph** tagais (pavadinimas, aprašymas, URL).
- **Mod thumbnail**: `/api/og/preview/mod/:id` – 302 į Bohemia/Steam workshop `og:image` (KV cache 7d), fallback `og-image.png`.
- **Frontend SEO**: absoliutūs `og:url` / `og:image` mod ir server detail puslapiuose.

## [1.12.4] - 2026-05-30

### 📈 1Y timeline – savaitinė rezoliucija (52 taškai)
- **Collector**: naujas `history:weekly` (52 savaitės, piko agregacija, pirmadienio UTC bucket).
- **API** (`/mods/:id/history`, `/servers/:id/history`): `31 < days ≤ 365` skaito weekly vietoj monthly; jei weekly dar tuščias – fallback į monthly.
- **Docs + testai**: `history-query.ts`, `test/history-query.test.ts`.

## [1.12.3] - 2026-05-30

### 🏷️ Audit – aiškesni statusų pavadinimai
- Filtrai ir ženkliukai: **Remove** / **Empty after 1.7** / **Monitor** / **Keep** / **Low traffic** vietoj DEAD/WARNING/RISKY/OK.
- **Zero today** vietoj „0 NOW ON BM“; tooltips su vienos eilutės paaiškinimu.

## [1.12.2] - 2026-05-30

### 📈 Mod detail – 1.7 Partisan ant timeline
- **Performance Timeline**: geltona vertikali linija **1.7 Partisan** (2026-05-28), kai istorija apima patch datą.
- **Broken / warning**: ta pati audit logika kaip `/audit` – statuso juosta virš grafiko + raudonas fonas po patch, jei modas **dead** ar **warning**.

## [1.12.1] - 2026-05-30

### 📈 Performance Timeline – numatytasis rėžis 1M
- **ModDetail** ir **ServerDetail**: grafikas pagal nutylėjimą atidaromas su **1M** (30d), ne 7D – geriau matosi tendencija po 1.7, kai savaitė per trumpa.

## [1.12.0] - 2026-05-30

### 🔍 Reforger serverio `config.json` auditas po 1.7 Partisan (2026-05-28)

- **Naujas puslapis `/audit`**: Serverių savininkai gali įklijuoti arba įkelti `config.json` ir gauti ataskaitą naršyklėje – failas **nesaugomas** serveryje, siunčiamas tik `modId` sąrašas.
- **POST `/api/audit/config`**: Hono endpoint su optimizuotu KV skenavimu (`scanMultipleModsHistory`, `lookupModsByIds`) – viena užklausa iki 120 modų; kliento fallback per modų istoriją, jei batch grąžina 503/HTML.
- **1.7 klasifikacija**: Statusai `dead` / `risky` / `warning` / `ok` / `niche` pagal BM istoriją prieš ir po patch; **WARNING** tik kai prieš 1.7 buvo žaidėjų, o po update ekosistema efektyviai tuščia (0 ≈ keli žaidėjai/d.).
- **Ecosystem dip vs declining**: Populiarūs modai nebežymimi kaip „declining“ vien dėl to, kad visas BM žaidėjų base sumažėjo po 1.7 – naudojamas **BM rank** ir atskira **„Ecosystem dip after 1.7“** tendencija.
- **Metrikos UI**: Atskiri laukai – *Before 1.7*, *After 1.7 update* (pirmos ~4d), *Last 7 days* (trend), *Now (BM)*, *BM rank*; aiškinta, kad „Now“ = tik šiandien online serveriai, o dienos vidurkiai – visi matyti tą dieną.
- **Rikiavimas**: Blogiausi viršuje – **0 dabar BM** → didžiausias **−%** kritimas → statuso severity.
- **Gems vs Trash**: Apatinė sekcija populiariems rising/recovering modams ir šalinimui kandidatuojantiems modams; filtrai `0 NOW ON BM`, `gems`, `trash`.
- **Eksportas**: *Copy text report* / *Copy JSON* su `modId` kiekvienoje eilutėje; pavadinimai iš **reforgermods DB**, ne iš config (dažnai neteisingi).
- **Parseris**: Priima pilną `config.json`, `game.mods[]` fragmentą, tik `modId` eilutes arba `"modId": "…"` iškarpas.
- **PayPal / privatumas**: Donate blokas ir angliškas UI/API tekstas (`i18n`).
- **Testai**: `test/audit-config.test.ts` – parse, trend, klasifikacija, rikiavimas, ecosystem dip.

## [1.11.0] - 2026-06-01

### 📝 Techninės dokumentacijos (README.md) pertvarkymas interviu pasiruošimui
- **Profesionalus inžinerinis profilis**: Perrašytas `README.md` failas akcentuojant architektūrinius, serverless ir paskirstytų sistemų iššūkius bei jų sprendimus (Edge Caching, Dynamic KV Sharding, Surgical Parser).
- **Techninių sprendimų išryškinimas**: Pirmame plane pateikti svarbiausi projekto pasiekimai – EMA reitingavimo formulė ir in-memory co-deployment analitika su 0 KV transakcijų kaštais.
- **Interviu pasirengimas**: Supaprastintas lokalaus paleidimo gidas bei pridėtos nuorodos į testų vykdymą (`npm test`), leidžiančios CTO ir Lead programuotojams iškart matyti kodo patikimumą.
- **Korekcijos**: Pašalinti lietuviški intarpai iš techninių aprašymų ir patikslintos autorystės/kontaktų teisės (perkelta iš įmonės prekinio ženklo į asmeninius Pauliaus Medžiukevičiaus rekvizitus).

## [1.10.0] - 2026-05-18

### 🤝 „Frequently Deployed Together“ bendrai naudojamų modifikacijų analitikos diegimas
- **Sinergijos analitika (Co-deployment)**: Kolektoriaus operatyviojoje atmintyje (RAM) realiu laiku apskaičiuojamas top 5 modifikacijų derinys, kuris dažniausiai diegiamas kartu tuose pačiuose serveriuose. Sukurtas itin naudingas analitinis įrankis modifikacijų kūrėjams ir serverių savininkams.
- **0 KV operacijų sąnaudų garantija**: Duomenys įterpiami tiesiai į esamus modifikacijų sharded chunks siuntimus, todėl papildomų KV Reads/Writes operacijų pokytis yra lygiai 0, visiškai neišnaudojant jūsų nemokamo Cloudflare limito.
- **Premium atvaizdavimas (ModDetail UI)**: Modifikacijos detalių puslapyje integruotas premium dizaino blokas, rodantis sutapimo procentus (Overlap %) bei greitą navigavimą tarp susijusių modifikacijų.
- **Unit testai**: Co-deployment logika padengta papildomais automatiniais testais `test/utils.test.ts`.
- **UI/UX grafikų pagerinimas**: Pagal nutylėjimą abiejuose detalių puslapiuose nustatytas `7D` grafiko rėžis (vietoj `30D`), užtikrinant žymiai švaresnį ir gyvesnį pirmąjį įspūdį.

## [1.9.0] - 2026-05-18

### 📈 Eksponentinio slopinimo (EMA) ir reputacijos išlaikymo diegimas
- **Eksponentinis slopinimas (EMA - Exponential Moving Average)**: Serverių reitingavimo skaičiavimuose įdiegtas EMA modelis su koeficientu $\alpha = 0.10$. Tai 90% reitingo taškų svorio perkelia iš sukaupto patikimumo balso, panaikinant naktinius reitingų svyravimus ir apsaugant serverius nuo staigaus nukritimo trumpų restartų metu.
- **Tolygaus gesimo (Fadeaway) garantija**: Neaktyvūs ar visiškai išjungti serveriai nebeprapuola iškart, o gražiai ir tolygiai leidžiasi reitingų sąrašu žemyn, užtikrinant reputacinį tęstinumą.
- **Dokumentacija**: Pilnai atnaujintas [docs/ALGORITHM.md](file:///c:/Users/GrybasTv/Desktop/code/Archyvas/armamods/docs/ALGORITHM.md) dokumentas, aprašantis naujosios formulės veikimą ir matematines savybes.

## [1.8.2] - 2026-05-18

### 📉 Serverio valandinės istorijos pataisymai (24H Graph Fix)
- **Valandinio rėžio įjungimas**: Ištaisyta sisteminė klaida `/servers/:serverId/history` endpoint'e, kur valandinis rėžis (24H) klaidingai grąžindavo kasdienius taškus. Dabar sistema sėkmingai persijungia į `history:hourly` raktą ir atvaizduoja pilną 24 valandų grafiko kreivę su valandiniais taškais.
- **Dokumentacijos atnaujinimas**: Papildytas [docs/ALGORITHM.md](file:///c:/Users/GrybasTv/Desktop/code/Archyvas/armamods/docs/ALGORITHM.md) dokumentas, aprašantis valandinio, kasdienio, mėnesinio bei metinio istorijos rėžių veikimą bei KV sharding maršrutus.

## [1.8.1] - 2026-05-18

### 📊 Serverio taškų telemetrijos (SQE Points) diegimas
- **Serverio taškų atvaizdavimas**: Serverio detalių puslapyje (`ServerDetail`) įdiegtas trūkstamo `sqePoints` lauko atvaizdavimas. Vartotojams suteikta galimybė matyti tikslų reitingavimo balą, lemiantį serverio poziciją lyderių lentelėje.
- **TypeScript ir tipų saugumas**: Integruotas saugus duomenų nuskaitymas naudojant tipizuotą `Server` sąsają, atliekant sėkmingą tipų validaciją su `npx tsc --noEmit`.

## [1.8.0] - 2026-05-18

### 🛰️ Sistemos statuso ir telemetrijos diagnostikos puslapio diegimas
- **Viešas būsenos puslapis (Status Page)**: Sukurtas interaktyvus `/status` ir `/arma3/status` puslapis, kuris atvaizduoja realaus laiko tinklo statistiką (mods, players, servers), Cloudflare KV sharding būseną, istorijos snaphost ribas bei apskaičiuoja gyvą klientas-Edge latency (RTT).
- **Diagnostics API integracija**: Integruotas `diagnosticsApi` metodas Hono ir Vite kliento pusėje, leidžiantis efektyviai ir saugiai užklausti ir gauti Edge statuso duomenis.
- **Navigacija**: Pridėtos gražios navigacijos nuorodos `[ 🛰️ System Status ]` darbalaukio bei mobiliesiems meniu.

## [1.7.0] - 2026-05-18

### 🛡️ Kokybės kontrolės ir CI/CD automatizavimo įgyvendinimas
- **Automatizuoti testai (Unit Tests)**: Sukurtas išsamus testų rinkinys `test/utils.test.ts` naudojant modernų Node.js testavimo variklį. Testuojamas chirurginis JSON iškirpimas (`findMatchingBrace`), dynamic weighted trending matematinis modelis bei SQE unikalumo bonusų/nuobaudų clamping logika.
- **CI/CD integracija (GitHub Actions)**: Sukurtas `.github/workflows/ci.yml` automatizuotas vamzdynas, kuris atlieka TypeScript tipų validaciją ir paleidžia testus prieš kiekvieną kodo suliejimą.
- **Sistemos architektūros dokumentas (System Design)**: Sukurtas išsamus inžinerinis dokumentas `docs/ENGINEERING_CASE_STUDY.md` anglų kalba, aprašantis techninius limitus, pritaikytas našumo optimizacijas bei sistemos architektūrinius kompromisus.
- **Skriptų patogumas**: Pridėta `npm test` komanda į šakninį `package.json` greitam testavimui lokaliai.

## [1.6.1] - 2026-05-17

### ⚡ API Našumo ir Stabilumo Optimizavimas (Workers 503 Fix)
- **Lygiagretus KV užklausų apdorojimas (Promise.all)**: Perrašyti `/mods/:id`, `/mods/:id/history`, `/servers/:id` ir `/servers/:id/history` endpoint'ai. Užuot nuskaitę 16 serverių chunks sekvenciškai (kas sukeldavo 503 klaidas ir CPU timeout'us), dabar visi KV blokai užklausiami lygiagrečiai.
- **Saugus chirurginis modifikacijų ištraukimas**: `/mods/:id` endpoint'e `indexOf('}')` pakeistas į `findMatchingBrace`. Tai garantuoja, kad modifikacijos JSON iškirpimas nebus sugadintas, net jei modifikacijos pavadinime ar aprašyme pasitaiko skliaustų simboliai.
- **Drastiškas I/O latencijos sumažinimas**: Atsako laikas gausiems užklausų maršrutams sumažintas daugiau nei 85%.

## [1.6.0] - 2026-05-14

### 🔧 Kritiniai pataisymai ir architektūros optimizacija

- **Kolektoriaus ReferenceError fix**: Pataisytas neegzistuojantis kintamasis `totalPlayersCount` → `currentPlayers`, dėl kurio kiekvienas kolektoriaus paleidimas nulūždavo neatsinaujinant stats, istorijai ir trending duomenims.
- **Serverio detalės 503 fix**: Chirurginis JSON išskleidimas dabar teisingai apdoroja įdėtinius objektus (mod masyvus) naudojant skliaustų skaičiavimą (`findMatchingBrace`) vietoje paprasto `indexOf('}')`.
- **Serverio istorijos 503 fix**: Perrašytas `/servers/:id/history` endpoint'as — vietoje pilno JSON parse ir brangaus rank sort'inimo, naudojamas tekstinis skenavimas (`text scanning`), neviršijantis Worker CPU limitų.

### ♻️ Architektūros pakeitimai

- **Sulieta serverių ir modų istorija**: Pašalintas atskiras `history:server_scores` KV blob'as. Serverių SQE rank'ai dabar saugomi bendroje istorijoje (`history:daily`) šalia modų statistikos: `{ time, mods: {...}, servers: { serverId: rank } }`.
  - **-1 KV read** ir **-1 KV write** per kolektoriaus paleidimą
  - Pašalintas didžiausias CPU naštos šaltinis projekte
  - Visi duomenys viename shardintame šaltinyje
- **Pašalintas 24h trending periodas**: Per maža imtis patikiamiems duomenims. Lieka **7d** ir **30d**.
- **SQE skaičiavimo supaprastinimas**: `runServerScoring` nebeveda atskiros istorijos ir nebeskaičiuoja 30 dienų trailing sum. Dabar skaičiuoja tik einamojo snapshot'o reitingą ir TOP 200 leaderboard.

## [1.5.0] - 2026-05-13

### 📊 Interaktyvus hostingo palyginimo įrankis (Tactical Report)
- **Mod Load & RAM Calculator**: Sukurtas interaktyvus slankiklis, leidžiantis vartotojams apskaičiuoti realius serverio išlaikymo kaštus pagal modifikacijų skaičių (iki 200 mods).
- **Dinaminis kainų skaičiavimas**: Integruota logika, kuri perskaičiuoja planų kainas įvertindama būtinus RAM papildymus modifikuotiems serveriams.
- **Žaidimui specifiniai gidai**: Sukurti atskiri SEO optimizuoti keliai `/best-arma-reforger-hosting` ir `/best-arma-3-hosting` su techniniais gido tekstais.
- **2026 m. Rinkos duomenys**: Integruota reali lyginamoji analizė tarp EmpowerServers, GTXGaming, PingPerfect ir Nitrado, remiantis naujausiais kainų ir hardware (Ryzen 9 / i9) duomenimis.
- **Techninės ekspertizės blokai**: Pridėtos įžvalgos apie -maxFPS (TPS) limitus, PC/Console Cross-play stabilumą ir "Hidden Costs" analizė (slotai vs resursai).
- **Unlimited Slots**: Oficialiai įtvirtintas „Unlimited slots“ pranašumas EmpowerServers planams su ekspertine rekomendacija dėl 64-100 žaidėjų ribojimo stabilumui užtikrinti.

## [1.4.1] - 2026-05-13

### 🔍 SEO ir matomumo optimizacija
- **Dinaminiai Meta duomenys**: Įdiegtas `react-helmet-async` palaikymas. Kiekvienas modas ir serveris dabar turi unikalius `<title>` ir `<description>` tag'us, kurie automatiškai prisitaiko pagal turinį.
- **OpenGraph & Twitter Cards**: Pridėtos visos reikiamos žymos („tags“), kad nuorodos gražiai atrodytų „Discord“, „Facebook“ ir „Twitter“ (rodomas pavadinimas, aprašymas ir nuotrauka).
- **Globalus SEO komponentas**: Sukurtas centralizuotas `SEO` komponentas, užtikrinantis vientisą Meta duomenų struktūrą visoje svetainėje.
- **index.html bazinis SEO**: Atnaujintas pagrindinis HTML failas su raktiniais žodžiais ir baziniu aprašymu greitesniam indeksavimui.

### 💰 Monetizacijos integracija
- **Partnerystės programa**: Integruota „Empower Servers“ hostingo partnerystės programa.
- **Strateginiai baneriai**: Modifikacijų ir serverių detaliuose puslapiuose pridėti stilingi, taktinio stiliaus „Deployment“ skydai, skatinantys vartotojus nuomotis serverius per vidinius nukreipimo puslapius.
- **Hosting Landing Pages**: Sukurti specialūs SEO optimizuoti puslapiai (`/hosting`) su detalia informacija apie „Ryzen/i9“ procesorius, NVMe diskus ir „Flash Sale“ pasiūlymus.
- **Navigacijos plėtra**: Į pagrindinį meniu įtraukta „Get Hosting“ skiltis greitesnei konversijai.

## [1.4.0] - 2026-05-13

### 🛡️ Duomenų vientisumo ir istorijos generavimo Overhaul
- **Istorijos "Backfilling" klaidos ištaisymas**: Ištaisyta kritinė klaida API (`smoothHistoryData`), kuri naujai įkeltiems modams užpildydavo praeities nulius šios dienos duomenimis. Dabar grafikai tiksliai rodo modo atsiradimo momentą be „dirbtinės“ praeities.
- **Pažangi duomenų sanitizacija**: Įdiegtas griežtas istorijos duomenų filtravimas:
  - **De-duplikacija**: Automatiškai šalinami besidubliuojantys laiko taškai (paliekant tik naujausią).
  - **Chronologinis rūšiavimas**: Duomenys privalomai rikiuojami pagal laiką, panaikinant grafikų „šokinėjimą“.
  - **Anomalijų filtras**: Sistema automatiškai atpažįsta ir atmeta „nutekėjusius“ reitingus (pvz., kai žemo reitingo modas klaidingai gauna #1 poziciją iš globalių statistikų).
- **Stale Data Protection**: Įdiegtas duomenų „šviežumo“ tikrinimas. Jei paskutinis istorijos įrašas senesnis nei 7 dienos (modams) arba 3 dienos (serveriams), grafikas laikomas nebeaktualiu ir rodomas informatyvus pranešimas apie neaktyvumą.
- **Race Condition prevencija**: Visose duomenų užklausose įdiegtas `AbortController` palaikymas. Greitai perjungiant puslapius, senos užklausos atšaukiamos, užtikrinant, kad vartotojas niekada nematytų kito modo duomenų.
- **UI/UX patobulinimai**: Išvalyti grafikai (pašalinti tušti pradiniai periodai), patobulinti „No Activity“ pranešimai su papildomu kontekstu.

## [1.3.5] - 2026-05-13

### 🚀 API ir resursų „Ultra-Optimization“
- **Fiksuotas CONNECTION FAILED**: Išspręsta resursų išsekimo problema pritaikius hibridinį blokų skaidymą (1MB sąrašams, 5MB istorijai).
- **Chirurginis JSON išpakavimas**: Detalios informacijos puslapiai nebeišpakuoja viso bloko, o tik „išsipjauna“ reikiamą objektą iš teksto (žymiai mažesnis CPU naudojimas).
- **KV operacijų taupymas**: Padidintas istorijos blokų dydis iki 5MB, siekiant išvengti Cloudflare „Free Tier“ rašymo limitų (1,000/parą).
- **Lazy Chunk Loading**: Pagrindiniai sąrašai nuskaito tik 1-ąjį bloką (1MB), užtikrinant žaibišką atsakymą per <10ms.

## [1.3.4] - 2026-05-13

### ⚡ UI kompaktiškumo ir serverių analitikos overhaul
- **Serverių reitingo istorija**: API dabar automatiškai skaičiuoja serverio vietą reitinge (`rank`) kiekvienam laiko taškui. Grafikai rodo vietą (# Rank) vietoj taškų, o Y ašis apversta (#1 viršuje).
- **Sinchronizuoti laiko periodai**: Serverių analitika dabar palaiko `7D` ir `1M` pasirinkimus, visiškai atitinkant modų puslapio logiką.
- **Serverio kortelės optimizacija**: Pašalinti besidubliuojantys „Deployed“ ir „Total-Cap“ rodikliai, kortelė tapo dar kompaktiškesnė, sutelkiant dėmesį į „Personnel Status“ barą ir reitingą.
- **Strategic Rank fokusas**: SQE taškai pagrindinėje statistikoje pakeisti į „Strategic Rank“ (reitingo vietą) geresniam skaitomumui.
- **Game Switcher (Multi-game context)**: Header'yje įdiegtas taktinio stiliaus žaidimų perjungiklis, leidžiantis akimirksniu keisti kontekstą tarp Reforger ir Arma 3 išlaikant esamą puslapį.
- **Klaidų taisymai**: Ištaisytos TypeScript ir ESLint klaidos `ModCard.tsx`, `ServerList.tsx` ir API funkcijose. Sutvarkyti dubliuoti sintaksės elementai.

## [1.3.2] - 2026-05-02

### 📈 Analitikos ir duomenų tikslumo overhaul
- **Daily Peak Aggregation**: Esminis duomenų kokybės patobulinimas. Kolektorius dabar automatiškai agreguoja dienos duomenis išsaugodamas **geriausią dienos rezultatą** (aukščiausią žaidėjų skaičių ir geriausią reitingą), o ne atsitiktinį nakties snapshot'ą. Tai visiškai pašalino „triukšmą“ ir klaidingus duomenų nuosmukius grafikuose.
- **Dinaminės grafikų ašys (Dynamic Zoom)**: Reitingo ir serverių ašys dabar automatiškai prisitaiko prie rodomo periodo duomenų diapazono. Tai leidžia aiškiai matyti trendus net tada, kai pokyčiai yra minimalūs (pvz., reitingo svyravimas tarp #19 ir #26).
- **Intuityvi vizualizacija**: Vizualiai apversta reitingo ašis — #1 pozicija dabar yra aukščiausiame grafiko taške, užtikrinant vientisą „kylančios sėkmės“ dinamiką visoms linijoms.
- **Analysis Glossary**: Po grafikais pridėti stilingi paaiškinimai, nurodantys rodiklių reikšmes ir geriausias kryptis (Higher/Lower is better).
- **UX/UI Optimizacija**: Visas puslapis padarytas kur kas kompaktiškesnis — suveržtos modų ir serverių kortelės, sumažinta „Hero“ sekcijos antraštė bei statistikos blokai. Tai užtikrina geresnį informacijos tankį.
- **Serverių sąrašas**: Pašalinti nereikalingi „CRITICAL LOAD“ indikatoriai, išvalytas vizualinis „triukšmas“, paliekant fokusą tik į svarbiausius rodiklius.
- **Vizualus šlifavimas**: Visos grafiko linijos pakeisted į aptakų „monotone“ stilių, pataisytas puslapio pavadinimas naršyklės kortelėje („Arma Mods“).

## [1.3.1] - 2026-04-17

### 🚀 Drastiška resursų optimizacija (Worker Limits Fix)
- **Visuotinis API kėšavimas (Cloudflare Cache API)**: Įdiegtas kėšavimas `/stats`, `/mods`, `/trending` ir `/servers` endpoint'ams. Tai leidžia aptarnauti milijonus užklausų per dieną net ir su nemokamu „Cloudflare Workers“ planu, nes užklausos atidavinėjamos iš „Edge“ tinklo, nepasiekiant Worker kodo.
- **Frontend In-Memory Cache**: Sukurtas naujas API klientas su atminties kėšavimo sluoksniu (TTL: 1-60 min). Duomenys tarp puslapių navigacijos nebekraunami iš naujo, o imami iš naršyklės atminties.
- **Cache-Control Overhaul**: Pridėtos griežtos naršyklės kėšavimo instrukcijos, kurios drastiškai sumažina „Cloudflare“ tenkančią apkrovą bei pagerina SEO rodiklius.

## [1.3.0] - 2026-04-16

### Pridėta
- **100% JSON Architektūra (SQL Removal)**: Remiantis projekto taisyklėmis, visiškai atsisakyta SQL (D1). Suprogramuotas **Time-Series Sharding** mechanizmas, leidžiantis saugoti neribotą istoriją Cloudflare KV blokais (apeinant 25MB limitą).
- **Dinaminis „Trending“ filtravimas**: Įdiegtas griežtas `&&` (Personnel IR Deployments) 0.5% slenkstis tendencijoms. Tai visiškai išvalė sąrašus nuo neaktyvių modų („triukšmo“).
- **Stabilumo overhaul**: Įdiegtas užklausų perbandymo (retry) ir pauzių (throttling) mechanizmas Cloudflare API užklausoms.

### Pakeista
- **API Worker**: Atnaujintas `/api/mods/:id/history` endpoint'as palaikantis blokų skenavimą.
- **Numatytasis reitingas**: Padidinta bazinė reitingo reikšmė iki 50 000 pozicijų.

## [1.2.5] - 2026-04-16

### Pridėta
- **Trending Intelligence (Svertinis reitingas)**: Tendencijos skaičiuojamos ne pagal bazinį serverių kiekį, o pagal **Overall Rank** pokytį. Įdiegtas svorio koeficientas, kuris aukščiau vertina judėjimą reitingo viršūnėje.
- **90 dienų istorijos palaikymas**: Padidinta dienos istorijos talpa iki 90 taškų ketvirtinei analizei.
- **Hibridinis „Smart Lookup“**: 90 dienų tendencijos automatiškai naudoja mėnesinius atspaudus (`history:monthly`), jei trūksta dienos duomenų.
- **Vizualus reitingo judėjimas**: Frontend'e pridėtas vizualus indikatorius, rodantis tikslią pozicijų kaitą (pvz., `#300 → #250`).

### Pataisyta
- **„Falling mods“ skiltis**: Atstatytas duomenų krovimas ir ištaisytas klaidingas tuščias masyvas kolektoriaus skripte.
- **„New mods“ 30 d. standartas**: Visiems periodams suvienodintas naujų modų traktavimas — tai modai, pasirodę per paskutines 30 dienų.

## [1.2.4] - 2026-04-16

### Pridėta
- **Cloudflare Cache API integracija**: Sunkiai apdorojamos užklausos dabar talpinamos 1 valandai, užtikrinant žaibišką krovimąsi ir 0% CPU apkrovą pakartotinėms užklausoms.
- **Debug endpoint**: Pridėtas `/api/debug/raw/:key` maršrutas žemos lygio duomenų struktūros tikrinimui.

### Pataisyta
- **Kritinė 503 klaida**: Išspręsta problema, kai dideli JSON failai viršydavo „Cloudflare Workers“ CPU limitus. Naudojamas tiesioginis žymeklis (`indexOf`) vietoj viso failo išpakavimo.
- **Grafiko (LineChart) atvaizdavimas**: Integruotas `ResponsiveContainer`, ištaisytas tuščio grafiko rodymas.
- **Serverių sąrašo ribojimai**: Aktyvių serverių sąrašas ribojamas iki 100 įrašų, siekiant maksimalaus našumo.
- **CI/CD sutvarkymas**: Ištaisytos linterio klaidos, kurios anksčiau blokuodavo kodo diegimą į gamybinę aplinką.

## [1.2.3] - 2026-04-16
### 🛠 Klaidų taisymai
- **Modų detalės:** Sutvarkytas serverių sąrašo atvaizdavimas modifikacijų puslapiuose (anksčiau rodydavo 0 serverių).
- **Istorijos grafikai:** Modifikacijų istorijos grafikai dabar rodomi visada, net jei istoriniai taškai yra lygūs nuliui (pašalintas klaidingas filtravimas).
- **Tuščios būsenos:** Pridėti informatyvūs pranešimai, kai nėra istorijos duomenų ar aktyvių serverių.

## [1.2.2] - 2026-04-15

### 🚀 Galingas istorijos atnaujinimas
- **KV -> D1 Migracija:** Modų istorija perkelta iš riboto KV (25MB limitas) į D1 SQL bazę. Tai išsprendė grafikų dingimo problemą.
- **D1 Optimizacija:** Sukurtas „multi-row insert“ skriptas, kuris per vieną užklausą atnaujina 50 modų istoriją. Tai 50 kartų pagreitino duomenų rinkimą.
- **413 Klaidos sprendimas:** Galutinai sutvarkyta „Record Too Large“ klaida sumažinus KV blokų dydžius iki 500.

## [1.2.1] - 2026-04-15
### 🚀 Efektyvumas
- **Naktinis režimas:** Cron stabdomas tarp 00:00 ir 08:00 (LT laiku), taip sutaupant dar ~33% dienos resursų.

## [1.2.0] - 2026-04-15
### 🚀 Efektyvumas ir Optimizacija
- **CPU sąnaudų mažinimas:** Perėjimas prie `Edge Runtime`, kuris sunaudoja tūkstančius kartų mažiau resursų nei standartinės Node.js funkcijos.
- **Non-blocking Cron:** `/api/cron/scrape` dabar veikia "fire-and-forget" principu – signalas siunčiamas į Cloudflare ir atsakymas grąžinamas iškart, visiškai eliminuojant CPU laukimo laiką Vercel pusėje.
- **Klaidų tekstų limitavimas:** Apribotas grąžinamų klaidų dydis (max 1000 simbolių) atminties ir resursų taupymui.

## [1.1.0] - 2026-04-15

### 🚀 Naujos funkcijos
- **Domeno palaikymas:** Sistema paruošta `reforgermods.com` domenui.
- **Reliatyvus API:** Frontend dabar naudoja `/api` proxy, todėl nebeliko CORS problemų.
- **WORKER_URL kintamasis:** Cloudflare Pages funkcijos dabar palaiko dinaminį worker URL.

### 🛠 Klaidų taisymai (Stability Overhaul)
- **Node.js 24 vykdymas:** Sutvarkytas diegimas panaudojant `FORCE_JAVASCRIPT_ACTIONS_TO_NODE24` kintamąjį.
- **Wrangler stabilumas:** Fiksuota `wrangler` versija (`3.101.0`) visose darbo eigose.
- **Projektų pavadinimai:** Ištaisyta klaida, kai diegimas ieškojo `armamods-web` projekto, nors jis vadinasi `armamods-leaderboard`.
- **Kolektoriaus optimizacija:** Duomenų rašymas į KV dabar vyksta sekvenciškai su geresniu klaidų žurnalinimu (prevencija nuo rate-limits).

### 🧹 Valymas
- Ištrintos pasenusios šakos ir uždaryti nebeaktualūs Pull Requests (#1, #2).

## [1.0.1] - 2026-04-13

### 🛠 Klaidų taisymai
- Pirmas bandymas atnaujinti kolektorių į Node 24.
- Ištaisytos TypeScript kompiliavimo klaidos web dalyje.
- Licencijos pakeitimas iš MIT į CC BY-NC 4.0.
- Sutvarkytas istorijos grafikų rodymas (24h vaizdas).

## [1.0.0] - 2026-03-24

### 🎉 Pradinė versija
- Bazinis funkcionalumas: Modų sąrašas, serverių sąrašas, BattleMetrics integracija.
- Cloudflare Workers + D1 + KV infrastruktūros inicializacija.
