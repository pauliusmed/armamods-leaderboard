## [1.4.1] - 2026-05-13

### 🔍 SEO ir matomumo optimizacija
- **Dinaminiai Meta duomenys**: Įdiegtas `react-helmet-async` palaikymas. Kiekvienas modas ir serveris dabar turi unikalius `<title>` ir `<description>` tag'us, kurie automatiškai prisitaiko pagal turinį.
- **OpenGraph & Twitter Cards**: Pridėtos visos reikiamos žymos („tags“), kad nuorodos gražiai atrodytų „Discord“, „Facebook“ ir „Twitter“ (rodomas pavadinimas, aprašymas ir nuotrauka).
- **Globalus SEO komponentas**: Sukurtas centralizuotas `SEO` komponentas, užtikrinantis vientisą Meta duomenų struktūrą visoje svetainėje.
- **index.html bazinis SEO**: Atnaujintas pagrindinis HTML failas su raktiniais žodžiais ir baziniu aprašymu greitesniam indeksavimui.

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
