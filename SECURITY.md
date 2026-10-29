# Security policy

## Supported versions

Only the latest commit on `main` is supported. That is what runs at
[reforgermods.com](https://reforgermods.com/). Older commits are not patched.

## Reporting a vulnerability

**Do not open a public issue.** Use GitHub's private vulnerability reporting:

<https://github.com/pauliusmed/armamods-leaderboard/security/advisories/new>

Please include:

- the affected endpoint or page (for example `GET /api/mods`, `/server/:id`),
- reproduction steps or a proof-of-concept request,
- the impact you expect (data exposure, cache poisoning, cost amplification, XSS),
- any suggested fix.

You can expect an initial response within 7 days. Confirmed issues are fixed on a
private branch and described in the release notes after deployment.

## Scope

In scope:

- the Worker API and SPA (`web/worker.ts`, `web/src/`),
- the collector and its GitHub Actions workflow (`scripts/`, `.github/workflows/`),
- the public site and its caching behaviour.

Out of scope:

- third-party services (Cloudflare, BattleMetrics, Bohemia Interactive Workshop),
- volumetric denial-of-service,
- reports that require a compromised account, leaked credentials or physical access.

## Handling

We do not operate a paid bug bounty. Valid reports are credited in the release
notes unless you ask to stay anonymous.
