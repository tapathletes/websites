/*
  dimensions.js — single source of truth for the TAP Athletes facility.

  Every number is in FEET. Build fractional feet with ftIn(ft, in) so 24'-2"
  is exactly 24 + 2/12 and never a rounded decimal.

  Coordinate system (shared with sky/index.html):
    x = length, 0 at the FRONT wall (glass), 80 at the BACK wall
    z = width,  0 at the LEFT wall (cage/padding side), building.width at the RIGHT wall (mirror side)
    y = height, 0 at the floor

  Provenance lives on each feature group's `meta`. `confirmed: false` means
  the value is carried forward from the old model or inferred, not measured.
  If a value here disagrees with specs/, specs/ wins — fix this file.
*/

export const ftIn = (ft, inch = 0) => ft + inch / 12;

const asBuilt = (extra = {}) => ({ source: 'eugene', date: '2026-09-22', confirmed: true, ...extra });

const WIDTH = ftIn(24, 2);
const LENGTH = 80;

export const DIMS = {
  meta: {
    asBuiltDate: '2026-09-22',
    units: 'ft',
    supersedes: ['specs/bathroom-2026-05-09.md'],
  },

  building: {
    length: LENGTH,
    width: WIDTH,
    ceiling: 17,
    meta: asBuilt({ note: 'Interior, walls up. Ceiling is approximate (~17 ft).' }),
  },

  // Front-of-house strip between the glass and the cage. Holds the bathroom.
  entrance: { x0: 0, x1: 7, meta: asBuilt() },

  // 7 x 7 OUTSIDE footprint in the front corner on the gym-strip (right) side.
  // No floor grate, no concrete apron (both retired 2026-09-22).
  bathroom: {
    x0: 0, x1: 7,
    z0: WIDTH - 7, z1: WIDTH,
    height: 9,
    meta: asBuilt({ note: '7 x 7 outside footprint. Supersedes the architect 6\'-11 1/2" x 8\'-8 1/2" interior note.' }),
  },

  // Ordered net: 70 L x 14 W x 12 H, retractable. Deployed position below.
  // Front edge sits on the bathroom back wall (x = 7); 3 ft code clearance behind.
  cage: {
    x0: 7, x1: 77,
    z0: ftIn(1, 2), z1: ftIn(1, 2) + 14,
    height: 12,
    retractable: true,
    retractDirection: null, // 'length' | 'width' — not yet known
    meta: asBuilt({ note: 'Net ordered 70 x 14 x 12. Collapse direction TBD.' }),
  },

  // Foam wall pad on the left wall plus the gap to the net — carried forward
  // from the pre-construction model, not re-measured.
  padding: {
    thickness: ftIn(0, 2),
    gap: 1,
    height: 6,
    meta: asBuilt({ confirmed: false, note: '2 in wall pad + 1 ft gap carried forward from the 3D model.' }),
  },

  // City code clearance from the back doors to anything. Not concrete — floored.
  backClearance: { x0: 77, x1: LENGTH, meta: asBuilt({ note: 'City code door clearance.' }) },

  // Open floor between the net and the right wall.
  gymStrip: { z0: ftIn(1, 2) + 14, z1: WIDTH, meta: asBuilt() },

  mirror: { wall: 'right', x0: 10, x1: 40, height: 10, meta: asBuilt({ confirmed: false, note: 'Position carried forward from the 3D model.' }) },

  doors: {
    front: {
      wall: 'front', z0: 7.375, z1: 10.375, height: 7,
      meta: { source: 'architect', date: '2026-05-09', confirmed: true, note: "7'-4 1/2\" from the left (z=0) edge; independent of the width change." },
    },
    backRollUp: {
      wall: 'back', z0: 7.5, z1: 17.5, height: 8,
      meta: asBuilt({ confirmed: false, note: 'Was centered on the old 25 ft width. Centered on 24\'-2" it would be 7.083..17.083.' }),
    },
    backPedestrian: {
      wall: 'back', z0: 20.5, z1: 23.5, height: 7,
      meta: asBuilt({ confirmed: false, note: 'Positioned on the old 25 ft width; only 8 in from the right wall now. Keeping the old 1.5 ft margin gives 19.667..22.667.' }),
    },
  },

  flooring: {
    turf: false,
    concretePads: false,
    materials: ['rubber', 'pvc'],
    meta: asBuilt({ note: 'Whole slab covered: all rubber, or rubber + PVC mix (split undecided).' }),
  },
};

// Non-overlapping partition of the floor covering. Sums to
// building area minus the bathroom footprint.
export const ZONES = [
  { id: 'entrance', label: 'Entrance zone',   x0: 0,  x1: 7,  z0: 0,                z1: DIMS.bathroom.z0 },
  { id: 'padding',  label: 'Wall pad strip',  x0: 7,  x1: 77, z0: 0,                z1: DIMS.cage.z0 },
  { id: 'cage',     label: 'Cage footprint',  x0: 7,  x1: 77, z0: DIMS.cage.z0,     z1: DIMS.cage.z1 },
  { id: 'gym',      label: 'Gym strip',       x0: 7,  x1: 77, z0: DIMS.gymStrip.z0, z1: WIDTH },
  { id: 'back',     label: 'Back clearance',  x0: 77, x1: 80, z0: 0,                z1: WIDTH },
];

export const CUTOUTS = [
  { id: 'bathroom', label: 'Bathroom', x0: DIMS.bathroom.x0, x1: DIMS.bathroom.x1, z0: DIMS.bathroom.z0, z1: DIMS.bathroom.z1 },
];

// Walk DIMS and list every group whose meta says confirmed: false.
export function unconfirmed(obj = DIMS, path = []) {
  const out = [];
  for (const [key, val] of Object.entries(obj)) {
    if (!val || typeof val !== 'object' || key === 'meta') continue;
    if (val.meta && val.meta.confirmed === false) out.push({ path: [...path, key].join('.'), note: val.meta.note || '' });
    out.push(...unconfirmed(val, [...path, key]));
  }
  return out;
}
