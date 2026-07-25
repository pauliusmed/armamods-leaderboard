# SEO operations

How search indexing works for reforgermods.com and what to do after deploys.

See also: [walkthrough.md](../walkthrough.md) · dynamic sitemap · [CHANGELOG.md](../CHANGELOG.md) **v1.22.17**.

---

## Already in the product

| Piece | Location |
|-------|----------|
| Canonical + robots meta | `web/src/components/ui/SEO.tsx` |
| JSON-LD (WebSite, ItemList, SoftwareApplication, HowTo, Breadcrumb) | `web/src/lib/seoJsonLd.ts` + page wiring |
| Sitemap index + mods/servers | `/sitemap.xml`, `/sitemap/{pages,mods,servers}.xml` |
| Crawler HTML for `/mod/:id` and `/server/:id` | `_middleware.ts` + `share-meta.ts` (Googlebot + social) |
| `noindex` | `/admin`, `/status`, `/arma3/status` |
| Guides | `/how-to-find-popular-arma-reforger-mods`, `/how-to-check-arma-reforger-modpack-size` |

---

## Search Console checklist (manual)

1. [Google Search Console](https://search.google.com/search-console) — add `https://reforgermods.com/` (DNS or HTML tag).
2. Submit sitemap: `https://reforgermods.com/sitemap.xml`.
3. After deploy, use **URL Inspection** on a sample `/mod/{id}` and `/server/{id}` — confirm canonical + HTML snapshot (not empty SPA shell).
4. [Bing Webmaster Tools](https://www.bing.com/webmasters) — import from GSC or add site; submit the same sitemap.
5. Watch **Coverage / Pages** for “Crawled – currently not indexed” on thin URLs; keep `noindex` on ops pages.

Backlinks (forums, Discord, Bohemia community posts) remain off-code growth — not automated here.
