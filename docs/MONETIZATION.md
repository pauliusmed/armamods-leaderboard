# Monetizacija — politika ir veikimo modelis

Projektas lieka **nemokamas žaidėjams, be reklamos, be sekimo**. Šis dokumentas apibrėžia,
iš kur ateina pajamos ir kokios ribos saugo projekto dvasią. Skaidrumas svarbiau už bet kokią
pajamų sumą — vienas sugedęs pasitikėjimas sugadina viską.

## Kietos ribos (nesikeičia)

1. **Duomenys ir reitingai niekada neparduodami.** Mokama vieta niekada nekeičia organinio
   rūšiavimo (players / rank / SQE), žaidėjų skaičių ar duomenų. FEATURED yra atskira sekcija.
2. **Žaidėjo patirtis nesikeičia.** Nemokama, be reklamos, be spaudimo, be paywall.
   Pinigai ateina iš tų, kas gauna vertę (serverių savininkai), ne iš tų, kas vertę vartoja
   (žaidėjai).
3. **Jokių baimės žinučių.** Duomenų senėjimo būsena yra techninė informacija, ne aukojimo
   piltuvas.

## Pajamų šaltiniai

| Šaltinis | Kam | Statusas |
|---|---|---|
| Affiliate hosting (Empower, Nitrado, GTX, PingPerfect) | Serverio savininkai / norintys hostinti | Įgyvendinta (`/api/click/*` + Admin kortelės) |
| FEATURED serverio vieta | Serverio savininkai (gauna žaidėjų srautą) | Šis dokumentas — specifikacija |
| Donation (Community Sync Fund) | Savanoriškai norintys paremti | Įgyvendinta (žr. `donation.ts`) |

### Principas

Svetainė yra mod-first: modai kuria srautą, o srautas nukreipia žaidėjus į serverius.
Serverio savininkas gauna pasitenkinimą (gyvas serveris, ne miręs) ir apmoka infra —
reciprocity, ne labdara.

## FEATURED serverio vieta

- **Kaina:** $9.99/mėn vienam serveriui. Startinis taškas (sutampa su hostingo kainos kalba);
  validuojama praktikoje — nėra konversijų → krentame, yra eilės → keliame.
- **Atvaizdavimas:**
  - `ServerList` viršuje — atskira **FEATURED** juosta (oranžinis ženkliukas + plonas rėmelis),
    atskirta nuo organinio sąrašo.
  - `ModDetail` "Active Deployed Servers" sekcijoje — featured serveris išryškinamas ženkliuku.
- **Valdymas:** rankinis config `web/src/lib/featuredServers.ts` — `FEATURED_SERVERS` masyvas.
  Gavai PayPal → įrašai serverio ID + commit → puslapis atnaujintas. Po mėnesio pašalini.
  Jokių DB, auth ar admin panelės.
- **Kodėl ne admin panelė:** featured vietų bus 0–10; config failas + commit yra "admin panelė".
  Tikra panelė pridėtų infrastruktūrą ir naują saugumo paviršių (auth endpointas = puolimo
  taikinys) be realios naudos.
- **Open source / free cron:** lieka nepaliesta. Featured ID yra vieši duomenys (juos visi
  ir taip mato puslapyje). Sekretai (`BATTLEMETRICS_API_KEY`, `CLOUDFLARE_API_TOKEN`,
  `CLOUDFLARE_ACCOUNT_ID`) eina per GitHub Actions secrets, ne repo.

### Skaidrumas

FEATURED ženkliukas reiškia apmokamą vietą; jis niekada neįtakoja reitingų ar duomenų.
Ši eilutė dubliuojama Privacy Policy puslapyje.

## Donation (Community Sync Fund)

- Etapo modelis: tikslas $50 (etapas 2), surinkta suma perkeliama kaip progresas,
  seni donorai lieka sienoje.
- Fiksuotų sumų mygtukai $3/$5/$10/$25 (PayPal.me `/{amount}`), laisva suma — pagrindinis CTA.
- Sumos atnaujinamos rankiniu būdu `web/src/lib/donation.ts`, kai PayPal gauta auka.
