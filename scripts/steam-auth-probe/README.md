# SteamAuthProbe — P0 vartai A — suderinta su kolega (2026-08-31)

Izoliuotas testas, ar galime **be žaidimo** gauti `GetAuthTicketForWebApi(1874880)` reikšmę. BI POST dar nedaromas — tik nustatome service `identity` ir ticket gavimą. Versija suderinta: `.NET 8 + SteamKit2 3.3.1` (kolega, 3.4.0 → .NET 10).

> **Sauga:** jokių tokenų / QR URL / GuardData / hash į logus / git / pokalbį. Loguojam tik `SteamKit2Version, QR success, relogin, EResult, ticket len`. `refresh token` — secrets vault (OS store / systemd credentials).

## Tikslas

Patvirtinti `Valve → SteamKit2 → WebAPI ticket` dalį atskirai nuo `BI IdentityApi → lobby` (kolegos pataisa: standalone `rooms/search` įrodyta tik su jau paruoštu JWT `gitea.tbdevent.eu/TBD/reforger_crawler_main` `PASTE_JWT_HERE`).

## Vartai

| Vartai | GO | STOP |
|---|---|---|
| A1 QR + persist login | pavyksta pakartotinis login be QR | login loop / nesaugus tokenas |
| A2 `GetAuthTicketForWebApi(1874880, identity)` | grąžina ne-tuščią ticket + žinoma `identity` | tuščia / klaida / nežinoma `identity` |

Tik po A imam B/C (`IdentityApi` payload, `session/login`).

## Būsena

**COMPILES, bet dar ne READY TO RUN** — `Program.cs` stub (40 eilučių) neįgyvendina `CallbackManager` pump, `ChallengeURLChanged`, `PollingWaitForResultAsync`, `LoggedOn EResult`, `refresh relogin` ir `ISecretStore`. Kol ne READY, **nejungti realios Steam paskyros** (kolegos pastaba).

## Paleidimas (kai bus READY)

```powershell
cd scripts/steam-auth-probe
dotnet restore
dotnet run -- --qr
# 1) nuskaito QR per Steam Mobile, 2) išsaugo refresh token į vault (OS store / systemd, ne %APPDATA% be 0600) — testiniame režime atmintis
dotnet run -- --ticket 1874880 --allow-null-identity
# kontrolinis null identity testas; su BI patvirtinta identity: STEAM_TICKET_IDENTITY=... dotnet run -- --ticket 1874880
# išveda: ticket len (be bytes/hash), EResult
```

## Ko klausiame kolegos

* Ar tavo paskyroje QR → refresh → ticket seka veikia su `AppId 1874880`?
* Kokią `identity` reikšmę naudoji `GetAuthTicketForWebApi` — ar BI ją viešai nurodė, ar spėjimas?

## Ką dalijamės

* Workshop batch `web/functions/lib/workshop-api.ts:109` `workshopListByIds` (50/mod, jau patikrinta `200 count:1` su `Tactical Flava`).
* BM vs BI spragų lentelę `docs/DATA_SOURCES_RESEARCH.md:95`.
* **Nesidalijam:** tikrais tokenais, capture su paslaptimis, nepatvirtintais roster endpointais.

## Kitas žingsnis po A

Nustatyti BI `IdentityApi` payload (`api-ar-id.bistudio.com/api/v1.1/identities/...`) iš teisėtos dokumentacijos / BI atsakymo ir patikrinti ar `/session/login` būtinas prieš `rooms/search`.
