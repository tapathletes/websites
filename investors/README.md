# TAP Athletes — Facility Layout

3D and 2D models of the planned TAP Athletes training facility. Shared with
investors, suppliers (flooring, equipment), and used as an internal planning
tool. Dimensional accuracy is load-bearing — the model is used to spec real
purchase orders, not just to impress.

**Live:** see GitHub Pages URL in the repo's About panel.

## Variants

Active:

- [`sky/`](sky/) — Three.js walkthrough: black rubber border around a grey
  PVC field, 14' × 70' net, one mound, classroom nook
  (served at `facility.tapathletes.com/sky/`).
- [`facility-3d.html`](facility-3d.html) — Three.js walkthrough, black turf.
  Earlier layout; not updated with the sky variant's 2026-10-01 changes.

Archive:

- [`facility-layout-v2.html`](facility-layout-v2.html) — 2D isometric SVG
  blueprint. Hand-baked polygons; does not auto-update when 3D dimensions
  change. Kept viewable but no longer maintained alongside the 3D variants.
- [`facility-layout-v1.html`](facility-layout-v1.html) — earlier 2D layout
  (superseded by v2; kept for reference).

## Demos

- [`demos/tapos-demo-video.mp4`](demos/tapos-demo-video.mp4) — TAPOS Sports
  Management & Performance Software demo video (4:23, 1080p, narrated with
  captions). Embedded on the landing page under "Demos";
  `demos/tapos-demo-video-poster.png` is the still shown before play. The
  video is rendered in the `tap-os` repo (`tools/video/`); copy a new render
  over this file to update it.

## Run locally

Any static-file server works. Examples from the project root:

```bash
# Python 3
python -m http.server 4567

# Node (npx)
npx http-server -p 4567

# Ruby
ruby -run -e httpd . -p 4567
```

Then open <http://localhost:4567/>.

## Source files

`design-canvas.jsx`, `facility.jsx`, `pov.jsx` are the React components
used to generate the HTML output. They are *not* loaded by the HTML files
and are kept here for archival purposes only.

`reference/` contains design-time reference images (photos, screenshots).
Not loaded by the app.
