# armamods — Agent Instructions

Agento darbo lapas. Domain logika / deploy detalės — `docs/`; čia — elgesys, kokybė, komandos, spąstai.

## Kalba ir elgesys

- Visi paaiškinimai ir atsakymai – lietuvių kalba (kodo identifikatoriai anglų).
- Būk mentorius: nepataikauk, būk kritiškas ir tiesmukas. Svarbu **rezultatas**, ne kaip jaučiasi vartotojas.
- Jei prašymas neoptimalus ar bloga praktika – aiškiai pasakyk ir pasiūlyk geresnį sprendimą.
- Jei trūksta informacijos arba nežinai – prašyk patikslinimo arba ieškok internete.
- Visada užklausas vertink kritiškai.
- Naudokis dokumentacija kaip gidu; jei neteisinga ar pasenusi – pasiūlyk atnaujinimą.

## Prieš kodą (privaloma seka)

1. Suprask užduotį ir ją trumpai perfrazuok.
2. **Šaka:** default = `main`. Nekurk / nepersijunk į kitas šakas be savininko leidimo. Prieš commit — `git branch --show-current`; jei ne ta šaka — stabdyk ir klausk.
3. **Multi-agent:** perskaityk `AGENT_WIP.md` (jei failo nėra — WIP nėra; sukurk jį, kai prasideda daugiaagentis darbas). Darbas >3 failų arba ta pati tema → įrašyk `IN_PROGRESS`; overlap → nestartink / klausk vartotojo. Baigęs — ištrink savo eilutę.
4. Pateik 2–3 sakinių planą, įvertink kritiškai.
5. Nuspręsk: ar reikia **pilnų testų** (žr. žemiau). Parašyk sprendimą plane.
6. **Grill** (žr. žemiau): jei užduotis keičia esmines sistemos dalis — interviu privalomas; plane pažymėk `Grill: atliktas / NE`. Kitoms — laisvas.
7. Tik tada rašyk kodą.

### Grill — dvikryptis interviu (iki bendro supratimo)

Vietoj paviršutiniško perfrazavimo — dvikryptis interviu, kol tikslas, apimtis, rizikos ir acceptance (ką reiškia „padaryta") aiškūs. Tikslas — **bendras sprendimas** ir prevencija: išvengti iteracijų / perdarymo ateityje.

1. **Privalomas**, kai užduotis keičia esmines sistemos dalis (kolektorių, duomenų modelį, rankinimo logiką, API kontraktus). Vartotojas gali iškviesti „grill" bet kada.
2. Agentas **klausia**, vartotojas atsako: tikslas, apimtis (ką darom / ko NEdarom), kraštiniai atvejai, spąstai, nediskutuotini invariantai.
3. Agentas **ne tik klausinėja** — pats siūlo alternatyvas, prieštarauja silpnoms prielaidoms. Nepataikauja.
4. Klausimų kiekis nefiksuojamas: baigiama, kai aišku; jei miglota — klausiama toliau.
5. Plane — eilutė `Grill: atliktas / NE`, kad sprendimas būtų audituojamas.

## Kada paleisti pilnus testus

Default = greitas lokalinis patikrinimas (keičiama vieta + tsc). **Pilni testai PRIVALOMI**, jei keičiasi:
- duomenų modelis / KV shard struktūra / cache schemos
- kolektorius / BattleMetrics API integracija / cron sinchronizacija
- rankinimo / paieškos / dydžio skaičiavimo algoritmai (mods, serveriai, scenarijai)
- API endpoint'ai / URL kontraktai / SEO generavimas
- monetizacija (FEATURED) / auth / prieigos guardrail'ai

PR aprašyme: `Heavy CI: required because <priežastis>` arba `Heavy CI: skipped because <priežastis>`.

## Kodo kokybė

- Rašyk modulinį kodą; failai kiek įmanoma mažesni (~<200 eilučių; išimtis — dideli generatoriai).
- Viena funkcija = viena atsakomybė.
- Daryk tik minimalius, būtinuosius pakeitimus.
- Ištaisyk žinomas linter klaidas (savo pakeitimų; pre-existing — netaisom).
- Nenaudok tylaus fallback — grąžink aiškų error.
- **Testų registracija:** kiekvienas testas/auditas privalo būti prijungtas prie CI **arba** sąmoningai dokumentuotas registre su priežastimi. Testas be registracijos = neegzistuojantis testas.

## Klaidų taisymas

- Nepradėk nuo vienos prielaidos – apsvarstyk kelias priežastis.
- Pirmiausia paaiškink, kur klaida ir kas ją sukelia.
- Jei problema susijusi su išorine sistema ar versija – ieškok internete.

## Komentarai, changelog, dokumentacija

- Komentaruose aiškink KODĖL, ne KĄ.
- Nešalink esamų komentarų, nebent klaidingi ar pasenę.
- **Visada** atnaujink `CHANGELOG.md` po reikšmingų pakeitimų (user-facing release žinutė, su versijos numeriu).
- **`DISCORD_RELEASES.md`** — po user-facing pakeitimo (naujas puslapis, matomas elgesio pokytis žaidėjams/serverių savininkams) privaloma atnaujinti ir šį failą: viršuje naujas `## [versija] - data` įrašas, anglų kalba, 1–5 eilutės, tik vartotojo vertė (be techninio žargono/monetizacijos). Deploy'as automatiškai išsiunčia viršutinį įrašą į Discord #announcements. Techniniams fix'ams (CI, refaktoriai) — nereikia.
- Dokumentaciją atnaujink tik jei pasenusi – **pirma paklausk patvirtinimo**.

## Git / PR

- Commit / push / PR visada po reikšmingų pakeitimų.
- Nekeisk `.env`, `node_modules/`, generuotų artefaktų (`dist/`, ikonos ir t.t.).
- 1 PR = 1 tema, ≲15 failų / ≲400 diff eil. Mega-PR draudžiama.
- Prod kandidatas — tik per PR (CI + rankinis merge). Push į `main` automatiškai paleidžia deploy (žr. žemiau).

## Komandos / struktūra / spąstai

| Grupė | Komandos | Pastaba |
| ----- | -------- | ------- |
| Dev (Worker) | `npx wrangler dev --cwd web --local` | Unified Worker (API + SPA assets `web/worker.ts` + `ASSETS`) — production parity |
| Dev (web) | `npm --prefix web run dev` | Vite dev serveris (React SPA only) |
| Dev (legacy) | `npm run dev` | Deprecated Express proxy (`src/index.ts`) — nenaudoti prod |
| Kolektorius | `npm run collect` / `collect:arma3` / `trending` / `trending:arma3` | BattleMetrics → KV; production'e paleidžia GitHub Actions cron |
| Test (root) | `npm test` | tsx --test; **explicit failų sąrašas package.json — naują testų failą PRIDĖK į sąrašą!** |
| Test (web) | `npm --prefix web test` | Vitest |
| Lint / type | `npm --prefix web run lint` (eslint web/), `npx tsc --noEmit` (visas repo), `npx --cwd web wrangler deploy --dry-run` (Worker bundling) | |
| Build | `npm --prefix web run build` | Vite → `web/dist` (Workers assets) |
| Deploy | push į `main` (kai keičiasi `web/**`) | GitHub Actions `.github/workflows/deploy.yml`: `npm ci --prefix web` → build (`npm run build`) → `cloudflare/wrangler-action@v3` (secrets: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`). Rankinis fallback: `npx wrangler deploy --cwd web` su `.env` token'u; Discord release žinutė per `.github/workflows/discord-release.yml` (kai keičiasi `DISCORD_RELEASES.md`; webhook `DISCORD_WEBHOOK_URL` secret) |

Spąstai:

- Root `npm test` naudoja **explicit failų sąrašą** — naujas testų failas be registracijos sąraše NEBĖGA.
- CI (`ci.yml`) paleidžia **tik `test/utils.test.ts`** — pasikliauti vien CI = praleisti beveik visus testus. Po esminių pakeitimų būtinai paleisk pilną `npm test` + web vitest lokaliai.
- Deploy automatinis su push į `main` — necommit'ink tiesiai į main su nepatikrintais pakeitimais.
- `.env` reikalingas lokaliems kolektoriaus run'ams (BM API raktai) — niekada nesiųsk jo į repo (`.env` yra gitignore).
- Kolektorius ir web dalis turi atskiras `package.json` — priklausomybės nededamos į vieną root sąrašą.
- **PowerShell `Get-Content`/`Set-Content` be `-Encoding UTF8` gadina `—` → `â€"`** — naudoti `Edit` įrankį arba `node fs` su `utf8`; niekada `bash` su PowerShell failų redagavimui.
- **Recharts `lazy` ant kritinių grafikų** — `React.lazy` + hash mismatch po deploy → tuščias grafikas visiems (ChunkLoadError, `width(-1)`). Laikyti `Recharts` tiesioginiame importe `ModDetail`; `ServerDetail` gali likti `lazy`.

## Kur skaityti (ne kopijuoti čia)

- `AGENT_WIP.md` (multi-agent WIP; kuriamas pagal poreikį), `CHANGELOG.md` (release istorija), `PLAN.md` (roadmap), `walkthrough.md` (end-to-end duomenų srautas, local dev), `docs/README.md` (dokumentacijos indeksas)
