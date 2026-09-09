# P0 vartai — bendras sutarimas su kolega (2026-08-31) — pataisyta

Bendra išvada: `rooms/search` standalone įrodyta **tik su BI JWT**. Visa `SteamKit → Identity → lobby` grandinė **neįrodyta**.

| Vartai | GO | STOP | Kas dalijamasi |
|---|---|---|---|
| **A QR + ticket** | QR patvirtintas; relogin be QR (`LoggedOn OK`); `GetAuthTicketForWebApi(1874880, identity)` success + length **ir** `--allow-null-identity` tik kontroliniam testui | tuščia / klaida / nežinoma `identity` / licencijos nėra | `SteamKit2 3.3.1`, `EResult`, `ticket len`, `QR success` (be token/QR/hash) |
| **B Identity** | Su savo paskyra gaunamas BI token, payload žinomas iš BI docs/atsakymo | spėjami laukai, svetimas token, `identity` spėjimas | tik payload forma + 200 faktas |
| **C Session** | Aišku ar `session/login` būtinas | neaiški tokenų paskirtis | — |
| **D Lobby** | `rooms/search limit 50 from 0` → `200` schema validi (`lobbyRooms/search` pavyzdys) | `401/403` / versijos klaida | `clientVersion` (pvz. `1.7.0`) ir `User-Agent` build (`1.7.0.54`) — atskiri, nekeisti vieno pagal kitą |
| **F Leidimas** | BI raštu | be leidimo — jokių roster vardų į P0 | — |

Workshop: veikia (`workshop-api.ts` `x-client-id`/`User-Agent` konfigūracijoje, minimalus `ids[]` payload be `orderBy`), bet klientas trapus — `400/401/403 → fail closed`.
SteamAuthProbe: **COMPILES, ne READY TO RUN** — trūksta `CallbackManager` pump, `ChallengeURLChanged`, `PollingWaitForResultAsync`, `LoggedOn EResult`, relogin, `ISecretStore` (kol nėra — tik atmintis, po proceso prarasti).

Operacinis: `60s + 5-10s jitter`, `limit 50`, `401/403 → 1 re-auth → breaker`, `429 → Retry-After`, `5xx → stale`.
