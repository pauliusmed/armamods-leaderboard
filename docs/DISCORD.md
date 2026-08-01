# Discord — kanalų šablonas ir tikslai

Pradedame nuo mažo: vienas serveris, minimalus kanalų rinkinys, aiškios taisyklės.
Tuščias kanalų chaosas žudo bendruomenę — kiekvienas kanalas turi turėti vieną paskirtį
ir nuorodą į dokumentaciją.

## Paruošti tekstai

### #information (pirmas įrašas, pininkite kanalą)

```text
Sveiki atvykę į reforgermods.com bendruomenės Discord!

Šis serveris yra Arma Reforger & Arma 3 modų ir serverių leaderboard bendruomenė.
Čia:
- Sekite atnaujinimus #announcements
- Teikite idėjas ir atsiliepimus #feature-requests / #feedback
- Praneškite apie klaidas #bug-reports
- Bendraukite #general

Nuorodos:
- Svetainė: https://reforgermods.com
- GitHub: https://github.com/GrybasTV/armamods-leaderboard
- Duomenys sinchronizuojami kas ~2h iš BattleMetrics.

Kaip gauti pagalbą: klauskite #support. Serverių savininkams — #server-owners.
```

### #announcements (automatinis skelbimas)

`#announcements` gauna automatinį pranešimą per webhook kiekvieną kartą, kai
pasikeičia `CHANGELOG.md` (release). Rankiniu būdu rašyti nereikia — tik dideliems
pranešimams (pav. serverio perkėlimas, reitingų politikos pakeitimai).

## Tikslai (kodėl egzistuoja serveris)

1. **Atsiliepimų kanalas** — vartotojai ir serverių savininkai praneša apie klaidas,
   netikslius duomenis ir idėjas be GitHub account'o.
2. **Feature request ciklas** — aiškus kelias nuo idėjos iki sprendimo:
   `#feature-requests` → GitHub issue → changelog (žr. `docs/` + `CHANGELOG.md`).
3. **Serverių savininkų ryšys** — FEATURED vieta, hosting rekomendacijos, duomenų
   teisingumo pranešimai (žr. `docs/MONETIZATION.md`).
4. **Skaidrumas ir atnaujinimai** — release notes, statuso pokyčiai, donacijų etapai.

## Kanalų struktūra

### Prieigos / svarbūs

| Kanalas | Paskirtis |
|---|---|
| `#welcome` | Pasisveikinimas, taisyklės, nuorodos (GitHub, svetainė, šis dokumentas) |
| `#rules` | Trumpa taisyklių santrauka: pagarba, jokio spam'o, jokio reitingų manipuliavimo |
| `#announcements` | Tik admin postina: release notes, statuso pokyčiai, donacijų etapai |
| `#status` | Robotas/rankiniu būdu skelbia duomenų sinchronizacijos būseną (stale/ok) |

### Bendruomenė

| Kanalas | Paskirtis |
|---|---|
| `#general` | Laisvi pokalbiai apie Arma Reforger / Arma 3, modus, serverius |
| `#showcase` | Vartotojai dalijasi modpack'ais, serveriais, screenshot'ais |
| `#introductions` | Naujokai prisistato (nebūtina, bet kuria ryšį) |

### Atsiliepimai / darbas

| Kanalas | Paskirtis |
|---|---|
| `#feedback` | Atsiliepimai apie svetainę: kas neveikia, kas neaišku, kas trūksta |
| `#feature-requests` | Idėjos; adminas žymi emoji (👍 reiškia "priimta/apsvarstyta") ir kuria GitHub issues |
| `#bug-reports` | Klaidos su aiškiu aprašymu: URL, ką darei, ką gavai |
| `#server-owners` | Serverių savininkams: FEATURED vieta, duomenų teisingumas, hosting klausimai |

## Moderavimo taisyklės (trumpai)

- Adminai: reikia bent 2 (kad nebūtų vieno žmogaus bottleneck).
- `#announcements` ir `#status` — tik adminai gali rašyti.
- Feature request'as be aiškaus aprašymo → paprašyti patikslinimo, ne iškart uždaryti.
- Spam/reklama → įspėjimas; pakartotinis — nuošalė.
- Reitingų manipuliavimo aptarimas → nukreipti į GitHub issue, ne į tiesioginius veiksmus.

## Release taisyklė (#announcements)

Vienintelė turinio taisyklė, sauganti kanalą nuo spam'o ir žargono:

> Kiekvienam release'ui paruošiamas atskiras, **angliškas, vartotojui suprantamas**
> aprašas (1–5 eilutės). **Jokių techninių detalių** (failų pavadinimai, KV,
> worker'iai) ir **jokios monetizacijos / affiliate** temų. Kalbame apie naudą
> žaidėjui, ne vidaus mechaniką.

Aprašas rašomas `DISCORD_RELEASES.md` viršuje (ne CHANGELOG!). CHANGELOG lieka
techninis ir lietuviškas (dev auditorija), `DISCORD_RELEASES.md` — user-facing ir
angliškas. Automatika siunčia tik pastarąjį.

## Nuoroda į kodą

- Mygtukas puslapyje: `web/src/components/ui/DiscordButton.tsx` (naudojama `PROJECT_DISCORD_URL` iš `web/src/lib/siteLinks.ts` — pakeisk nuorodą vienoje vietoje).
- Šabloną laikyk atvirai: įdėk nuorodą į `#welcome` ir `docs/README.md`.

## Automatinis release pranešimas (#announcements)

1. Discord: Channel Settings → Integrations → Webhooks → New Webhook, nustatyk kanalą `#announcements`, nukopijuok URL.
2. GitHub: repo Settings → Secrets → `DISCORD_WEBHOOK_URL`.
3. Kiekvienam deploy'ui, kuriame pasikeitė `DISCORD_RELEASES.md`, workflowas
   (`deploy.yml` → `Announce release to Discord`) pats išsiunčia embed su naujausiu
   įrašu per `scripts/post-discord-release.mjs`.

Be `DISCORD_RELEASES.md` pakeitimo pranešimas nesiunčiamas — taip išvengiama spam'o
kiekvienam push'ui. CHANGELOG.md pakeitimai pranešimo nebeišsiunčia.
