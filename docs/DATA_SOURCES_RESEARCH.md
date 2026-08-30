# Data Sources Research — BattleMetrics Alternatives

Status: **research, no code change yet** · Date: 2026-08-30 · Owner: collector/research

Tyrimas, ar egzistuoja BattleMetrics alternatyvų Reforger / Arma 3 telemetrijai.
Aukšto lygio išvados ir rekomendacijos. **Techninė analizė (endpoint'ai, auth flow,
konkurento tyrimas) laikoma konfidencialia — nekomitinama, žr. `docs-private/`.**

---

## Background

- Kolektorius šiuo metu ima serverius tik iš BattleMetrics
  (`src/services/battlemetrics.ts:52` — `api.battlemetrics.com/servers?filter[game]=…`).
- BM nuo ~2026-07-20 reikalauja **paid subscription rakto** (žr. [DATA_SYNC.md](./DATA_SYNC.md)).
- Klausimas — ar galima sumažinti priklausomybę nuo BM, atskiriant modų metadata
  ir serverių telemetriją.

---

## Santrauka

| Duomenų grupė | Šaltiniai | Verdiktas |
|---------------|-----------|-----------|
| **Modų metadata** (dydis, autorius, deps, versijos, galerija, dates) | Oficialus Bohemia Workshop duomenų sluoksnis (be auth) | ✅ **Veikia, verta naudoti vietoj HTML scrape** |
| **Serverių telemetrija** (žaidėjų skaičiai, modai ant serverių, rankinimas) | BM (pagrindinis) + Bohemia lobby runtime (ateitis) | ⚠️ BM fallback; runtime reikalauja prototipo |
| **Serverių lobby** (pilna: region, queue, modai) | Bohemia žaidimo runtime API | ⚠️ Reikia prototipo + Bohemia leidimo |
| **Žaidėjų nikai (player names)** | Serverio bendradarbiavimas (opt-in modas / RCON) | ❌ Globaliai nepasiekiama be-auth |

**BM vaidmuo po tyrimo:** ne vienintelis šaltinis, o **fallback** + palyginimo
šaltinis + istorija, kol neįrodytas 24/7 runtime kolektorius.

---

## 1. Modų metadata — oficialus Workshop duomenų sluoksnis (P0b)

Oficialus Bohemia Workshop duomenų sluoksnis (be rakto) duoda pilną modų katalogą
ir detail objektus su versijomis, dependencies, scenarijais, licencijomis, autoriais,
galerija ir datomis. **Batch lookup** leidžia vienu requestu gauti iki 50 modų pagal id.

Dabartinis `web/functions/lib/workshop-fetch.ts` scrape'ina
`reforger.armaplatform.com/workshop/<id>` HTML (Next.js `__NEXT_DATA__` + regex).
Oficialus sluoksnis duoda **tą patį + daugiau**, struktūrizuotai ir patikimiau:

| Funkcija | HTML scrape (dabar) | Oficialus sluoksnis |
|----------|---------------------|---------------------|
| Dydis | regex iš HTML | tiesioginis laukas ✓ |
| Autorius | `__NEXT_DATA__` parse | `author` ✓ |
| Aprašymas | `summary`/`description` | `summary`/`description`/`license` ✓ |
| Galerija | `previews`/`screenshots` parse | `previews`+`screenshots` ✓ |
| Dates | parse | `createdAt`/`updatedAt` ✓ |
| Dependencies | `__NEXT_DATA__` parse | `dependencies[]` ✓ |
| Statusas (available) | 404 / HTML sniff | HTTP 404 / `blocked`/`unlisted` ✓ |
| Versijų istorija | ✗ | `versions[]` ✓ |
| Scenarios | ✗ | `scenarios[]` ✓ |
| Batch lookup | ✗ (1 HTML per modą) | `ids[]` iki 50 ✓ |

Kolektoriaus `warmTopModSizesFromWorkshop` + `warmServerModpackModSizes`
(`scripts/collector.ts`) daro po 1 HTTP request per modą; su batch — iki 50× mažiau.

---

## 2. Serverių telemetrija — BM fallback + ateities runtime

### Dabartis

- **BM** — vienintelis veikiantis serverių telemetrijos šaltinis (žaidėjų skaičiai,
  modai ant serverių, rankinimas). Moka už paid raktą.

### Ateitis (P2 tyrimas, ne dabar)

- Bohemia žaidimo runtime API (lobby) duoda turtingesnius duomenis (region, queue,
  modai, cross-platform), bet reikalauja:
  - **nuolatinio ar periodiško rinktuvo** Enfusion runtime aplinkoje (nebūtinai
    visas grafinis žaidimas meniu lange — prototipas tai turi įrodyti),
  - **stabilumo įrodymo** (auth sesijos trukmė nedokumentuota),
  - **rašytinio Bohemia leidimo** komercinei paslaugai.
- Kol neįrodyta — BM lieka pagrindinis.

### A2S (Steam server query)

- **Enrichment sluoksnis** jau žinomiems hostams, ne pagrindinis šaltinis.
- Praktinis testas (8 serveriai): A2S_INFO atsakė 1/8 (ir tik ant kito porto);
  A2S_PLAYER — 0/8 nikų. Likę timeout (uždari/NAT).
- Reforger nenaudoja Steam master server discovery.

---

## 2b. Ko mes NEGAUNAME (duomenų spraga vs Bohemia lobby)

Mūsų dabartinis šaltinis (BM) + A2S **neduoda** šių Bohemia lobby laukų, kuriuos
turi trečiosios šalies kolektorius. Spraga egzistuoja tol, kol neturime Bohemia
runtime prieigos.

| Duomuo | BM | A2S | Bohemia lobby (jų kolektorius) | Pasekmė mums |
|--------|----|-----|-------------------------------|--------------|
| Serverio **FPS** | ❌ | ⚠️ kartais | ✅ | Neturime; nerikiuoja modų — žema vertė |
| Žaidėjų **nikai** (names) | ❌ | ❌ (0/12) | ✅ | Neturime; ne produkto vertė |
| **Queue** dydis | ❌ (tik total) | ❌ | ✅ | Neturime atskirai |
| **Region / ping site** | ⚠️ regionas? | ❌ | ✅ `pingSiteId` | Dalinai |
| **Cross-platform** (PC/XBL/PSN) | ❌ | ❌ | ✅ `supportedClients` | Neturime |
| **Direct join code** | ❌ | ❌ | ✅ `directJoinCode` | Neturime |
| **Host type** (CommunityDs) | ❌ | ❌ | ✅ `hostType` | Neturime |
| **lastChanged** (pokyčio laikas) | ❌ | ❌ | ✅ | Neturime |
| Modai ant serverio | ✅ | ❌ | ✅ | **Turime** (BM) ✓ |
| Žaidėjų skaičius | ✅ | ⚠️ | ✅ | **Turime** (BM) ✓ |
| Serverio pavadinimas / map | ✅ | ⚠️ | ✅ | **Turime** (BM) ✓ |

**Svarbu:** spragos laukai (FPS, nikai, queue, cross-platform, direct join, host type)
yra **Bohemia lobby raw duomenys**, pasiekiami tik per tą patį auth kelią kaip nikai
(§3, §Rekomendacijos). Jų **negauti**:
- per BM (neduoda šių laukų),
- per A2S (nepatikima — FPS tik kartais, nikai 0/12),
- per Workshop API (tik modų metadata).

**Ar tai blokuoja produktą? Ne.** Modų statistika (kurios vertė — rankinimas, modų
populiarumas) remiasi **modais, žaidėjų skaičiais, serverių skaičiumi** — viską
turime iš BM. FPS/nikai/queue yra serverio-puslapio smulkmenos, ne modų signalas.

**Kaip spraga užsidarytų (ateitis):**
- Bohemia runtime prototipas (garantuotų lobby laukus; nikai — neaišku),
- Bohemia leidimas (roster + visi laukai),
- opt-in serverio modas (FPS, nikai — tik savo/partnerių serveriams).

---

## 3. Žaidėjų nikai (player names)

| Būdas | Svetimi serveriai | Reikia leidimo | Patikimumas |
|-------|-------------------|----------------|-------------|
| Bohemia lobby / Room | ✅ | — | Rodo tik žaidėjų **skaičių**, ne nikus |
| A2S_PLAYER | Kai kuriems | ❌ | Nepatikima: dažnai neatsako / be vardų |
| RCON `#players` | ❌ | ✅ RCON raktas | Aukštas |
| **Serverio Enfusion modas** | ❌ | Serveris įdiegia modą | **Aukščiausias** |

**Optimalus variantas:**
1. A2S_PLAYER bandyti viešiems (best-effort, žemas prioritetas).
2. Jei neveikia → rodyti tik žaidėjų skaičių.
3. Siūlyti serverių savininkams opt-in **"verified server" modą** arba read-only RCON.
   Oficialus PlayerManager suteikia `GetPlayers()`, `GetPlayerName()`, `GetPlatformKind()`.
4. **Nikus rodyti tik gyvai, ilgai nekaupti** — asmens duomenys (privatumo politika).

Nikai nėra pagrindinio modų statistikos produkto vertė — **atidėti**.

### Vieši įrodymai iš trečios šalies puslapio (2026-08-30, be jokio auth)

Jų viešas puslapis/JS atskleidžia šiuos faktus (tai jų pačių publikuotas turinys):

- **Detail puslapio tekstas:** *"Server discovery data is retrieved from the backend
  used by Arma Reforger and cached briefly; player counts are near-live."* → discovery
  ateina iš Bohemia backend per jų kolektorių; cache trumpalaikis.
- **`server-detail.js` komentaras:** *"the browser never calls Bohemia directly"* →
  visi upstream kvietimai vyksta jų backend'e, ne naršyklėje.
- **Nikų sekcija (`/players`):** *"Live player names are fetched on demand and are not
  stored"* + `fetchedAt` rodomas vartotojui + `available:false` → "Live player data is
  unavailable". Tai rodo **gyvą, on-demand** roster iš jų kolektoriaus.
- Praktinis testas: `/players` grąžino **pilnus 128+9** (limitas iki 10 — ankstesnė
  klaidinga išvada, buvome mes patys `slice(0,10)`).

**Ką įrodo:** jų nikai ateina per jų paties backend→Bohemia kolektorių; duomenys gyvi.
**Ko neįrodo:** tikslaus jų kolektoriaus auth mechanizmo (runtime žaidimas / privatus
HTTP klientas / Bohemia leidimas) — jų viešas turinys to neatskleidžia. Jų "not
affiliated" teiginys nereiškia, kad leidimo nėra.

### Papildomi įrodymai — jų laukai ir gyvumas (2026-08-30)

**Bohemia-specifiniai laukai jų serverio duomenyse:**
`pingSiteId` (london), `directJoinCode`, `hostType` (CommunityDs), `supportedClients`
(PC/XBL/PSN), `present`, `visible`, `lastChanged`, `queueMax`, `fps` (40).
Šie laukai yra Bohemia lobby `Room` objekto dalis — jų **neduoda** nei A2S, nei BM.
Tai stiprus ženklas, kad jie ima iš Bohemia lobby per kliento-kontekso užklausą.

**Kolekcijos dažnumas (iš `activity`):**
`samples24h: 939` ≈ **~92 sek. intervalas**; `samples7d: 3014` ≈ ~3.3 min vidurkis.
Tai rodo nuolatinį snapshot'ų kaupimą iš Bohemia.

**Gyvo roster įrodymas (26 s testas):**
Dviejų `/players` kvietimų palyginimas per 26 s: `queue` 6→4, o nikų rinkinys
pasikeitė — `hillnut`/`Louie2024` išėjo, `mivaniec`/`Oliminator_99` prisijungė.
`fetchedAt` buvo "dabar" (0–13 s delta). Tai on-demand, **gyvas** roster iš jų
kolektoriaus→Bohemia — ne cache, ne A2S (A2S_PLAYER mūsų teste buvo 0/12).

**Ką tai reiškia mums:** jų metodas patvirtintas kaip Bohemia lobby per jų kolektorių,
bet tikslus auth mechanizmas lieka jų paslaptis. Mes negalime jo atkartoti be EULA
rizikos ar Bohemia leidimo.

---

## Rekomendacijos

**BM vaidmuo:** fallback + palyginimas + istorija. Nekurti svarbiausių funkcijų
vien ant BM.

### Prioritetas: P0b (Workshop API) padarytas; istorija jau veikia

**BM snapshot istorija JAU kaupiama** (hourly/daily/weekly per kas-2h ciklą) — tai
duoda firstSeen, trend, activity. Dažnesnis snapshot neprioritetas (žr. P0a žemiau).

### P0a — BM serverių snapshot istorija (ATIDĖTA — dažnesnis snapshot nereikalingas)

Dabartinė KV istorija (hourly/daily/weekly/monthly/yearly, kolektorius kas-2h) jau
teikia firstSeen, trend, activity. **Dažnesnis snapshot (kas 5–15 min) NEREIKALINGAS**
— sprendimas 2026-08-30. R2 tyrimas parodytas kaip ateities pasiūlymas:

**R2 kaip istorijos saugykla (tyrimo išvada, neatlikta):**
- R2 free: 10 GB, 1M Class A / mėn (rašymas), 10M Class B (skaitymas).
- **Per-server objektai kas 2h viršija limitą** (60k/day ≈ 1.8M/mėn) — NEdaryti.
- **Agreguotas objektas per snapshot** (visas momentas ~220KB) — tik 12/day, niekada
  neviršys; atvertų kas-5-min snapshot'us be limitų.
- Migracija reiškia Edge skaitymo logikos perrašymą — daryti tik kai atsiras realus
  poreikis (smulki 24h kreivė / tikslesnis trend).

### P0b — iškart po (3-7 d.): Workshop duomenų sluoksnis

2. Pakeisti HTML scrape'ą oficialiu Workshop sluoksniu (batch lookup, daugiau duomenų).
3. API: pridėti `source`, `observedAt`, `stale` — šaltinių atskiriamumui.

### Atidėta

4. **Nikai** — ne produkto vertė.
5. **Bohemia lobby runtime prototipas** — eksperimentas, ne verslo prielaida.

### P4 — ilgalaikis pranašumas

6. **Opt-in serverio telemetrijos modas/agentas** (Enfusion REST event batch'ai) —
   verified server analytics. Duomenys, kurių konkurentas negali lengvai turėti be
   serverių bendruomenės sutikimo.

### Teisinė riba

- Arma Reforger EULA draudžia reverse engineering tinklo paslaugoms ir komercinį
  žaidimo naudojimą be leidimo. Laikytis: **ne** kopijuoti auth tokenų, **ne** kartoti
  nepublikuotų backend endpoint'ų, **ne** perskirstyti modų failų.
- Metadata indeksavimas + nuorodos — mažesnės rizikos, bet komercinei API verta
  gauti rašytinį Bohemia patvirtinimą (Business & Licensing).
- Žaidėjų ID/vardų istorija gali būti asmens duomenys — agreguoti arba trumpai saugoti.
- Tai ne teisinė konsultacija.

---

## Susiję dokumentai

- [WORKSHOP_METADATA.md](./WORKSHOP_METADATA.md) — dabartinis scrape sluoksnis
- [DATA_SYNC.md](./DATA_SYNC.md) — BM paid API, collector
- [DESIGN_DECISIONS.md](./DESIGN_DECISIONS.md) — "Direct Enfusion Telemetry" vizija (eilutė 94)
- [ALGORITHM.md](./ALGORITHM.md) — rankinimo logika
- `docs-private/` — konfidenciali techninė analizė (nekomitinama)
