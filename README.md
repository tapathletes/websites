# websites

Every public `tapathletes.com` site, one folder per site. Each folder is its own Vercel static project: Root Directory = the folder, Framework = Other, no build command, output `.`, Ignored Build Step `git diff --quiet HEAD^ HEAD -- .`.

| Folder | Site |
|---|---|
| `tapathletes.com/` | `tapathletes.com` — the Rogers academy (history kept from `tapathletes/tapathletes.com`) |
| `investors/` | `investors.tapathletes.com` — investor hub and facility walkthrough; `facility.tapathletes.com` redirects here (history kept from `tapathletes/tap-facility-layout`) |
| `shared/` | Build-time tools only, never served: `tokens.css`, `jsonld/build.mjs`, `check-metadata.mjs` |

Planned: `coach/`, `parents/`, `athletes/`.

## The canonical map

`docs/web-estate.md` in the `tapathletes/tapos` repository is the canonical map of the whole web estate: every subdomain, the repository and host behind it, its DNS record, how a visitor gets into the app from it, and the metadata package every site must carry before it is linked from anywhere. Read it before touching DNS, hosting, links, sitemaps or sign-in paths. The decision behind the layout is ADR-0051 in the same repository; the build plan is `docs/plans/web-estate-prd.md`.

## Preview a site locally

No install step: the sites are plain static HTML and the scripts here have no dependencies.

```sh
cd tapathletes.com
python -m http.server 8000
# open http://localhost:8000/
```

Or push a branch and open the Vercel preview deployment for that site's project.

## Scripts (Node 20+, no dependencies)

```sh
node shared/jsonld/build.mjs <site>      # regenerate JSON-LD from <site>/site.config.mjs
node shared/check-metadata.mjs <site>    # the web-estate metadata checklist; exits 1 on any miss
```

Or `pnpm run build:jsonld <site>` / `pnpm run check:metadata <site>`. Never `npm install` here.
