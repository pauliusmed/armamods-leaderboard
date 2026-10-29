# SteamAuthProbe — P0 gate A — agreed with a colleague (2026-08-31)

An isolated test of whether we can obtain a `GetAuthTicketForWebApi(1874880)` value
**without the game**. The BI POST is not attempted yet — we only establish the
service `identity` and ticket retrieval. Agreed version: `.NET 8 + SteamKit2 3.3.1`
(colleague: 3.4.0 → .NET 10).

> **Safety:** no tokens / QR URLs / GuardData / hashes in logs, git or chat. We log
> only `SteamKit2Version, QR success, relogin, EResult, ticket len`. The `refresh
> token` lives in a secrets vault (OS store / systemd credentials).

## Goal

Confirm the `Valve → SteamKit2 → WebAPI ticket` part separately from
`BI IdentityApi → lobby` (colleague's correction: standalone `rooms/search` is
proven only with an already prepared JWT `gitea.tbdevent.eu/TBD/reforger_crawler_main`
`PASTE_JWT_HERE`).

## Gates

| Gate | GO | STOP |
|---|---|---|
| A1 QR + persist login | relogin without QR succeeds | login loop / insecure token |
| A2 `GetAuthTicketForWebApi(1874880, identity)` | returns a non-empty ticket plus a known `identity` | empty / error / unknown `identity` |

Only after A do we take B/C (`IdentityApi` payload, `session/login`).

## Status

**COMPILES, but not READY TO RUN yet** — the `Program.cs` stub (40 lines) does not
implement the `CallbackManager` pump, `ChallengeURLChanged`,
`PollingWaitForResultAsync`, `LoggedOn EResult`, refresh relogin or `ISecretStore`.
Until it is READY, **do not connect a real Steam account** (colleague's note).

## Running (once READY)

```powershell
cd scripts/steam-auth-probe
dotnet restore
dotnet run -- --qr
# 1) scan the QR with Steam Mobile, 2) store the refresh token in a vault (OS store / systemd,
# not %APPDATA% without 0600) — in-memory in test mode
dotnet run -- --ticket 1874880 --allow-null-identity
# control null-identity test; with a BI-confirmed identity: STEAM_TICKET_IDENTITY=... dotnet run -- --ticket 1874880
# prints: ticket len (no bytes/hash), EResult
```

## What we ask the colleague

* Does the QR → refresh → ticket chain work on your account with `AppId 1874880`?
* Which `identity` value do you use in `GetAuthTicketForWebApi` — did BI state it
  publicly, or is it a guess?

## What we share

* Workshop batch `web/functions/lib/workshop-api.ts:109` `workshopListByIds`
  (50/mod, already verified `200 count:1` with `Tactical Flava`).
* The BM vs BI gap table in `docs/DATA_SOURCES_RESEARCH.md:95`.
* **We do not share:** real tokens, captures containing secrets, unconfirmed roster
  endpoints.

## Next step after A

Establish the BI `IdentityApi` payload (`api-ar-id.bistudio.com/api/v1.1/identities/...`)
from legitimate documentation or a BI response, and check whether `/session/login`
is required before `rooms/search`.
