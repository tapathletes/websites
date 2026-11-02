# websites

Every public `tapathletes.com` site, one folder per site. Each folder is its own Cloudflare Workers static-assets site (no code runs; Cloudflare serves the files): the folder's `wrangler.jsonc` names the Worker, `.assetsignore` keeps dev and build files off the site, and `_headers` sets response headers. Moved from GitHub Pages on 2026-11-02 (the earlier plan named Vercel; see the tapos ADR that records the Cloudflare move).

Deploy a site by hand: `cd <site>` then `pnpm dlx wrangler@4 deploy` with `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` set. Once Cloudflare Workers Builds is connected to this repo, merging to `main` publishes, as GitHub Pages did. Any file over 25 MiB must go to R2 instead (the investors demo video lives at `https://media.tapathletes.com/`).

| Folder | Site |
|---|---|
| `tapathletes.com/` | `tapathletes.com` — the Rogers academy (history kept from `tapathletes/tapathletes.com`) |
| `investors/` | `company.tapathletes.com` — the Training Athletic Performance, Inc. company hub (investor material and the facility walkthrough inside it); `facility.tapathletes.com` 301s here, path and query kept. The folder and the Worker keep the names `investors` / `tapathletes-investors` for now (history kept from `tapathletes/tap-facility-layout`) |
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

Or deploy the branch by hand (above) and open the site's `*.workers.dev` address.

## Scripts (Node 20+, no dependencies)

```sh
node shared/jsonld/build.mjs <site>      # regenerate JSON-LD from <site>/site.config.mjs
node shared/check-metadata.mjs <site>    # the web-estate metadata checklist; exits 1 on any miss
```

Or `pnpm run build:jsonld <site>` / `pnpm run check:metadata <site>`. Never `npm install` here.
