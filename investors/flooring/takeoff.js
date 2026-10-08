/*
  takeoff.js — pure flooring arithmetic. No DOM, no imports.
  Rectangles are { x0, x1, z0, z1 } in feet. Tested by takeoff.test.js.
*/

export const area = (r) => (r.x1 - r.x0) * (r.z1 - r.z0);

// 24.1667 -> 24'-2", 7.375 -> 7'-4 1/2", 80 -> 80'-0"
export function fmtFtIn(ft, denom = 16) {
  let whole = Math.floor(ft);
  let sixteenths = Math.round((ft - whole) * 12 * denom);
  if (sixteenths >= 12 * denom) { whole += 1; sixteenths -= 12 * denom; }
  const inches = Math.floor(sixteenths / denom);
  let num = sixteenths % denom;
  let den = denom;
  while (num && num % 2 === 0) { num /= 2; den /= 2; }
  const frac = num ? ` ${num}/${den}` : '';
  return `${whole}'-${inches}${frac}"`;
}

// assignment: { zoneId: 'rubber' | 'pvc' }
export function takeoff(zones, assignment, wastePct) {
  const factor = 1 + wastePct / 100;
  const rows = zones.map((z) => {
    const netSf = area(z);
    const orderSf = netSf * factor;
    return { id: z.id, label: z.label, material: assignment[z.id], netSf, wasteSf: orderSf - netSf, orderSf };
  });
  const byMaterial = {};
  for (const r of rows) {
    const m = (byMaterial[r.material] ||= { netSf: 0, orderSf: 0 });
    m.netSf += r.netSf;
    m.orderSf += r.orderSf;
  }
  return { rows, byMaterial, totalNetSf: rows.reduce((s, r) => s + r.netSf, 0) };
}

export const PRESETS = {
  allRubber: (zones) => Object.fromEntries(zones.map((z) => [z.id, 'rubber'])),
  // Pad strip follows the cage so there is no seam at the net line.
  rubberGymPvcCage: (zones) => ({ ...PRESETS.allRubber(zones), cage: 'pvc', padding: 'pvc' }),
};

// Strips of `rollWidth` laid across the zone. direction 'length' = strips run
// along x (rip seams at constant z); 'width' = strips run along z.
export function stripLayout(zone, rollWidth, direction) {
  const along = direction === 'length' ? zone.x1 - zone.x0 : zone.z1 - zone.z0;
  const across = direction === 'length' ? zone.z1 - zone.z0 : zone.x1 - zone.x0;
  const acrossStart = direction === 'length' ? zone.z0 : zone.x0;
  const strips = Math.ceil(across / rollWidth - 1e-9);
  const lastStripWidth = across - (strips - 1) * rollWidth;
  const ripSeams = [];
  for (let k = 1; k < strips; k++) ripSeams.push(acrossStart + k * rollWidth);
  return { direction, strips, stripLength: along, lastStripWidth, linearFt: strips * along, coverageSf: strips * rollWidth * along, ripSeams };
}

// Cut each strip into pieces no longer than rollLength (null = cut to length).
export function cutList(layout, rollLength) {
  const pieces = [];
  const buttSeams = [];
  for (let s = 0; s < layout.strips; s++) {
    if (!rollLength) { pieces.push({ strip: s, len: layout.stripLength }); continue; }
    let remaining = layout.stripLength;
    let pos = 0;
    while (remaining > 1e-9) {
      const len = Math.min(rollLength, remaining);
      pieces.push({ strip: s, len });
      remaining -= len;
      pos += len;
      if (remaining > 1e-9) buttSeams.push({ strip: s, coord: pos });
    }
  }
  return { pieces, buttSeams };
}

// First-fit decreasing bin packing of piece lengths into rolls of rollLength.
export function packCuts(pieceLengths, rollLength) {
  const sorted = [...pieceLengths].sort((a, b) => b - a);
  if (sorted.length && sorted[0] > rollLength + 1e-9) throw new Error(`piece ${sorted[0]} ft longer than roll ${rollLength} ft`);
  const bins = [];
  const free = [];
  for (const len of sorted) {
    let i = free.findIndex((f) => f + 1e-9 >= len);
    if (i === -1) { bins.push([]); free.push(rollLength); i = bins.length - 1; }
    bins[i].push(len);
    free[i] -= len;
  }
  const used = sorted.reduce((s, l) => s + l, 0);
  return { rolls: bins.length, bins, offcutFt: bins.length * rollLength - used };
}

// spec: { rollWidth, rollLength: number|null, direction: 'length'|'width'|'auto' }
export function planRolls(zone, spec) {
  const direction = spec.direction === 'auto' || !spec.direction ? bestDirection(zone, spec) : spec.direction;
  const layout = stripLayout(zone, spec.rollWidth, direction);
  const cuts = cutList(layout, spec.rollLength);
  let rolls = null;
  let orderedSf;
  if (spec.rollLength) {
    rolls = packCuts(cuts.pieces.map((p) => p.len), spec.rollLength).rolls;
    orderedSf = rolls * spec.rollLength * spec.rollWidth;
  } else {
    orderedSf = layout.linearFt * spec.rollWidth;
  }
  const netSf = area(zone);
  const wasteSf = orderedSf - netSf;
  return {
    direction, strips: layout.strips, stripLength: layout.stripLength, lastStripWidth: layout.lastStripWidth,
    linearFt: layout.linearFt, rolls, orderedSf, wasteSf, wastePct: (wasteSf / netSf) * 100,
    cuts: cuts.pieces, seams: { rip: layout.ripSeams, butt: cuts.buttSeams },
  };
}

// Fewer ordered square feet wins; tie -> fewer seams.
export function bestDirection(zone, spec) {
  const score = (direction) => {
    const p = planRolls(zone, { ...spec, direction });
    return [p.orderedSf, p.seams.rip.length + p.seams.butt.length];
  };
  const [aSf, aSeams] = score('length');
  const [bSf, bSeams] = score('width');
  if (Math.abs(aSf - bSf) > 1e-9) return aSf < bSf ? 'length' : 'width';
  return aSeams <= bSeams ? 'length' : 'width';
}

export function planTiles(zone, tileW, tileL) {
  const L = zone.x1 - zone.x0;
  const W = zone.z1 - zone.z0;
  const cols = Math.ceil(L / tileL - 1e-9);
  const rows = Math.ceil(W / tileW - 1e-9);
  const fullTiles = Math.floor(L / tileL + 1e-9) * Math.floor(W / tileW + 1e-9);
  const tiles = cols * rows;
  return { cols, rows, tiles, fullTiles, cutTiles: tiles - fullTiles, orderedSf: tiles * tileW * tileL };
}

// Pack every cut piece of one material across all its zones into shared roll
// stock — this is the order quantity. Per-zone plans are the installer's cut list.
export function planMaterial(zones, spec) {
  const perZone = zones.map((z) => ({ zone: z, plan: planRolls(z, spec) }));
  const netSf = zones.reduce((s, z) => s + area(z), 0);
  let rolls = null;
  let orderedSf;
  let linearFt = perZone.reduce((s, p) => s + p.plan.linearFt, 0);
  if (spec.rollLength) {
    const pieces = perZone.flatMap((p) => p.plan.cuts.map((c) => c.len));
    rolls = pieces.length ? packCuts(pieces, spec.rollLength).rolls : 0;
    orderedSf = rolls * spec.rollLength * spec.rollWidth;
  } else {
    orderedSf = linearFt * spec.rollWidth;
  }
  return { perZone, netSf, linearFt, rolls, orderedSf, wasteSf: orderedSf - netSf, wastePct: netSf ? ((orderedSf - netSf) / netSf) * 100 : 0 };
}
