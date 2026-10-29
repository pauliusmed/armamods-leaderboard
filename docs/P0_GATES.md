# P0 gates — agreement with a colleague (2026-08-31) — revised

Overall conclusion: `rooms/search` standalone is proven **only with a BI JWT**. The
whole `SteamKit → Identity → lobby` chain is **not proven**.

| Gate | GO | STOP | What is shared |
|---|---|---|---|
| **A QR + ticket** | QR confirmed; relogin without QR (`LoggedOn OK`); `GetAuthTicketForWebApi(1874880, identity)` success plus length **and** `--allow-null-identity` for the control test only | empty / error / unknown `identity` / no licence | `SteamKit2 3.3.1`, `EResult`, `ticket len`, `QR success` (no token/QR/hash) |
| **B Identity** | With our own account a BI token is obtained and the payload is known from the BI docs/response | guessed fields, someone else's token, guessing `identity` | payload shape only, plus the fact of a 200 |
| **C Session** | Clear whether `session/login` is required | unclear token purpose | — |
| **D Lobby** | `rooms/search limit 50 from 0` → `200`, schema valid (`lobbyRooms/search` example) | `401/403` / version error | `clientVersion` (e.g. `1.7.0`) and the `User-Agent` build (`1.7.0.54`) — separate values, never change one to match the other |
| **F Permission** | BI in writing | without permission — no roster names in P0 | — |

Workshop: works (`workshop-api.ts` `x-client-id`/`User-Agent` in configuration, a
minimal `ids[]` payload without `orderBy`), but the client is fragile —
`400/401/403 → fail closed`.

SteamAuthProbe: **COMPILES, NOT READY TO RUN** — missing the `CallbackManager`
pump, `ChallengeURLChanged`, `PollingWaitForResultAsync`, `LoggedOn EResult`,
relogin and `ISecretStore` (until then it is memory-only and lost with the process).

Operational: `60s + 5-10s jitter`, `limit 50`, `401/403 → 1 re-auth → breaker`,
`429 → Retry-After`, `5xx → stale`.
