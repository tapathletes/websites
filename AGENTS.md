# AGENTS.md — websites

> Instructions for every coding agent in this repo (Claude Code, Codex, others). The human overview is `README.md`; read it for local preview and script details. This file loads at the start of every session, so keep it short.

## What this repo is

The public static websites of TAP Athletes (Training Athletic Performance, Inc.). One folder per site; each folder is its own Cloudflare Workers static-assets site, and no server code runs.

| Folder | Serves | Worker |
|---|---|---|
| `tapathletes.com/` | https://tapathletes.com (`www` 301-redirects to the apex) | `tapathletes-com` |
| `investors/` | https://company.tapathletes.com, the company hub: investor material and the facility 3D walkthrough (`facility.tapathletes.com` 301-redirects here) | `tapathletes-investors` |
| `shared/` | Nothing. Build-time tools only: `tokens.css`, `jsonld/build.mjs`, `check-metadata.mjs` | none |

Not in this repo: `book.tapathletes.com` (the Wix booking site for TAP Athletes Pitching Academy; every buy button opens it), `tapos.cloud` (the TAPOS app; `ops.tapathletes.com` redirects there), and `media.tapathletes.com` (R2 bucket `tapathletes-media`, for files over 25 MiB).

**This repo is public.** Never commit secrets, financials, internal plans, or anything not meant for the open web.

## Read before changing

- `docs/web-estate.md` in the `tapathletes/tapos` repo (local: `C:\Users\derri\dev\tap-os\docs\web-estate.md`) is the canonical map of every subdomain, host, DNS record and sign-in path. Read it before touching DNS, hosting, links, sitemaps or sign-in paths. The hosting decision is ADR-0061 there (Cloudflare DNS + Workers static assets, superseding GitHub Pages).
- Before touching the facility walkthrough, read `investors/README.md` and `investors/specs/`. Its dimensions feed purchase orders, so accuracy is load-bearing.

## How work reaches `main`

1. Work on a branch named `<type>/<short-description>`, with Conventional Commits (`feat(investors): ...`, `fix(tapathletes.com): ...`).
2. Run the checks below, push the branch, and open a PR. Eugene merges (squash). This repo has no CI and no branch protection, so the local checks are the only gate.
3. Never push to `main` directly, and never force-push.

## Checks before a PR

- `pnpm run check:metadata <site>`: the web-estate metadata checklist; exits 1 on any miss.
- `pnpm run build:jsonld <site>` after changing a site's `site.config.mjs`. The JSON-LD blocks in the HTML are generated; never hand-edit them.
- Adding a page or a site: update its `sitemap.xml` and navigation in the same PR.
- Use pnpm only; never `npm install` (per `README.md`), whatever `tapathletes.com/package-lock.json` suggests.

## Deploying changes the live site

- From the site folder: `pnpm dlx wrangler@4 deploy`, with `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` set in the environment. Never print the token; Eugene enters it with `Read-Host -AsSecureString`.
- Say what you are deploying and why before you run it.
- Whether Cloudflare Workers Builds publishes on merge is not confirmed. Check before saying a merge has gone live.
- The `routes` in each `wrangler.jsonc` attach the hostnames; never remove them. Hostnames use a Workers route on a proxied DNS record, not a Workers custom domain (ADR-0061).
- Any file over 25 MiB fails the deploy: put it in R2 (`media.tapathletes.com`) and list it in that folder's `.assetsignore`.

## Leftovers that are not live config

`CNAME` files (GitHub Pages era) and `vercel.json` files (an abandoned Vercel plan; its redirect target is wrong) do nothing today. Live behavior comes from `wrangler.jsonc`, `.assetsignore`, `_headers` and the Cloudflare redirect rules. Don't edit the leftovers to change behavior; flag them to Eugene for removal.

## Writing on these sites

- Never write "TAP" on its own. Use TAP Athletes, Training Athletic Performance, Inc. (the legal entity), TAPOS (one word), Talia, or TAP Athletes Pitching Academy. Before publishing user-facing or legal text, search it for the bare word.
- American spelling: recognize, organize, behavior, color.
