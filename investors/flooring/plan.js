/*
  plan.js — draws the flooring plan as inline SVG straight from dimensions.js.
  Nothing here is hand-placed in feet; every coordinate is DIMS * S.
  Plan units: 1 ft = S svg units. Left wall (z=0) is the TOP edge of the plan,
  front wall (x=0) is the LEFT edge, so the drawing reads like the site plan.
*/
import { DIMS, ZONES, CUTOUTS } from '../dimensions.js';
import { fmtFtIn } from './takeoff.js';

const S = 10;
const L = DIMS.building.length;
const W = DIMS.building.width;
const MARGIN = { left: 125, top: 95, right: 100, bottom: 85 };

export const VIEW = {
  x: -MARGIN.left,
  y: -MARGIN.top,
  w: L * S + MARGIN.left + MARGIN.right,
  h: W * S + MARGIN.top + MARGIN.bottom,
};

export const MATERIAL_COLORS = {
  rubber: { fill: '#c5d6e0', label: 'Rubber' },
  pvc: { fill: '#e9dcbb', label: 'PVC' },
};

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const num = (v) => +(v * S).toFixed(3);

function rect(r, attrs = '') {
  return `<rect x="${num(r.x0)}" y="${num(r.z0)}" width="${num(r.x1 - r.x0)}" height="${num(r.z1 - r.z0)}" ${attrs}/>`;
}

function text(x, y, str, attrs = '') {
  return `<text x="${num(x)}" y="${num(y)}" ${attrs}>${esc(str)}</text>`;
}

// Architectural tick: a short 45° slash across the dimension line.
const tick = (x, y) => `<line class="tick" x1="${x - 3}" y1="${y + 3}" x2="${x + 3}" y2="${y - 3}"/>`;

// Horizontal dimension between x0..x1 (ft) with its line at zLine (ft) and
// extension lines rising from zFrom (ft). Label sits above the line.
// Labels shrink on short segments; if they still don't fit they sit past the
// far end of the segment (used for the stub at the end of a chain).
function fitLabel(label, span) {
  const width = (fs) => label.length * fs * 0.62;
  let fs = 9;
  if (width(fs) > span - 6) fs = 7.5;
  const outside = width(fs) > span + 2;
  return { fs, outside, w: width(fs) };
}

function dimH(x0, x1, zLine, zFrom, label = fmtFtIn(x1 - x0)) {
  const y = num(zLine), yf = num(zFrom), a = num(x0), b = num(x1);
  const dir = y < yf ? -1 : 1;
  const fit = fitLabel(label, b - a);
  const tx = !fit.outside ? (a + b) / 2 : a === 0 ? a - fit.w / 2 - 4 : b + fit.w / 2 + 4;
  return `<g class="dim">
    <line class="ext" x1="${a}" y1="${yf}" x2="${a}" y2="${y + dir * 4}"/>
    <line class="ext" x1="${b}" y1="${yf}" x2="${b}" y2="${y + dir * 4}"/>
    <line class="dl" x1="${a}" y1="${y}" x2="${b}" y2="${y}"/>
    ${tick(a, y)}${tick(b, y)}
    <text x="${tx}" y="${y - 4}" text-anchor="middle" font-size="${fit.fs}">${esc(label)}</text>
  </g>`;
}

// Vertical dimension between z0..z1 with its line at xLine and extension
// lines from xFrom. Label is rotated to read along the line.
function dimV(z0, z1, xLine, xFrom, label = fmtFtIn(z1 - z0)) {
  const x = num(xLine), xf = num(xFrom), a = num(z0), b = num(z1);
  const dir = x < xf ? -1 : 1;
  const fit = fitLabel(label, b - a);
  const tx = x - 4, ty = !fit.outside ? (a + b) / 2 : a === 0 ? a - fit.w / 2 - 4 : b + fit.w / 2 + 4;
  return `<g class="dim">
    <line class="ext" x1="${xf}" y1="${a}" x2="${x + dir * 4}" y2="${a}"/>
    <line class="ext" x1="${xf}" y1="${b}" x2="${x + dir * 4}" y2="${b}"/>
    <line class="dl" x1="${x}" y1="${a}" x2="${x}" y2="${b}"/>
    ${tick(x, a)}${tick(x, b)}
    <text x="${tx}" y="${ty}" text-anchor="middle" font-size="${fit.fs}" transform="rotate(-90 ${tx} ${ty})">${esc(label)}</text>
  </g>`;
}

function badge(x, z, id) {
  return `<g class="badge" data-for="${id}"><circle cx="${num(x)}" cy="${num(z)}" r="6"/><text x="${num(x)}" y="${num(z) + 3.5}" text-anchor="middle">?</text></g>`;
}

// Wall outline with door gaps cut out. Doors are drawn as openings plus a
// swing (pedestrian) or a dashed line (roll-up).
const doorTag = (x, z, str) => `<text class="doortag" x="${num(x)}" y="${num(z)}" text-anchor="middle" font-size="7" transform="rotate(-90 ${num(x)} ${num(z)})">${str}</text>`;

function walls() {
  const t = 4; // wall stroke, svg units
  const d = DIMS.doors;
  const parts = [];
  // Left wall (z=0) and right wall (z=W): continuous.
  parts.push(`<line class="wall" x1="0" y1="0" x2="${num(L)}" y2="0"/>`);
  parts.push(`<line class="wall" x1="0" y1="${num(W)}" x2="${num(L)}" y2="${num(W)}"/>`);
  // Front wall (x=0) with the entry door gap.
  parts.push(`<line class="wall glass" x1="0" y1="0" x2="0" y2="${num(d.front.z0)}"/>`);
  parts.push(`<line class="wall glass" x1="0" y1="${num(d.front.z1)}" x2="0" y2="${num(W)}"/>`);
  parts.push(doorTag(-1.1, (d.front.z0 + d.front.z1) / 2, 'DOOR'));
  parts.push(doorTag(L + 1.4, (d.backRollUp.z0 + d.backRollUp.z1) / 2, 'ROLL-UP'));
  parts.push(doorTag(L + 1.4, (d.backPedestrian.z0 + d.backPedestrian.z1) / 2, 'DOOR'));
  parts.push(`<path class="door" d="M0 ${num(d.front.z0)} L${num(d.front.z1 - d.front.z0)} ${num(d.front.z0)} A${num(d.front.z1 - d.front.z0)} ${num(d.front.z1 - d.front.z0)} 0 0 1 0 ${num(d.front.z1)}"/>`);
  // Back wall (x=L) with the roll-up and pedestrian gaps.
  const bx = num(L);
  const spans = [[0, d.backRollUp.z0], [d.backRollUp.z1, d.backPedestrian.z0], [d.backPedestrian.z1, W]];
  for (const [a, b] of spans) parts.push(`<line class="wall" x1="${bx}" y1="${num(a)}" x2="${bx}" y2="${num(b)}"/>`);
  parts.push(`<line class="rollup" x1="${bx}" y1="${num(d.backRollUp.z0)}" x2="${bx}" y2="${num(d.backRollUp.z1)}"/>`);
  parts.push(`<path class="door" d="M${bx} ${num(d.backPedestrian.z0)} L${bx - num(d.backPedestrian.z1 - d.backPedestrian.z0)} ${num(d.backPedestrian.z0)} A${num(3)} ${num(3)} 0 0 0 ${bx} ${num(d.backPedestrian.z1)}"/>`);
  return `<g class="walls" stroke-width="${t}">${parts.join('')}</g>`;
}

function dimensions() {
  const d = DIMS.doors;
  const b = DIMS.bathroom;
  const c = DIMS.cage;
  const m = DIMS.mirror;
  const out = [];
  // Top: length partition and overall.
  out.push(dimH(0, DIMS.entrance.x1, -3.5, 0, `${fmtFtIn(DIMS.entrance.x1)} ENTRANCE`));
  out.push(dimH(c.x0, c.x1, -3.5, 0, `${fmtFtIn(c.x1 - c.x0)} NET`));
  out.push(dimH(DIMS.backClearance.x0, L, -3.5, 0, `${fmtFtIn(L - DIMS.backClearance.x0)} CODE`));
  out.push(dimH(0, L, -7, 0));
  // Left (front wall): door chain, zone chain, overall.
  out.push(dimV(0, d.front.z0, -3.5, 0));
  out.push(dimV(d.front.z0, d.front.z1, -3.5, 0));
  out.push(dimV(d.front.z1, W, -3.5, 0));
  out.push(dimV(0, c.z0, -7, 0, `PAD ${fmtFtIn(c.z0)}`));
  out.push(dimV(c.z0, c.z1, -7, 0, `${fmtFtIn(c.z1 - c.z0)} NET`));
  out.push(dimV(c.z1, W, -7, 0, `${fmtFtIn(W - c.z1)} GYM`));
  out.push(dimV(0, W, -10.5, 0));
  // Right (back wall): door chain.
  const rx = L + 3.5;
  out.push(dimV(0, d.backRollUp.z0, rx, L));
  out.push(dimV(d.backRollUp.z0, d.backRollUp.z1, rx, L, `ROLL-UP ${fmtFtIn(d.backRollUp.z1 - d.backRollUp.z0)}`));
  out.push(dimV(d.backRollUp.z1, d.backPedestrian.z0, rx, L));
  out.push(dimV(d.backPedestrian.z0, d.backPedestrian.z1, rx, L));
  out.push(dimV(d.backPedestrian.z1, W, rx, L));
  // Bottom (right wall): mirror chain.
  const by = W + 3.5;
  out.push(dimH(0, m.x0, by, W));
  out.push(dimH(m.x0, m.x1, by, W, `MIRROR ${fmtFtIn(m.x1 - m.x0)}`));
  out.push(dimH(m.x1, L, by, W));
  // Bathroom internal dims.
  out.push(dimH(b.x0, b.x1, b.z0 - 2.2, b.z0));
  out.push(dimV(b.z0, b.z1, b.x1 + 2.2, b.x1));
  return out.join('');
}

function scaleBar() {
  const y = W + 6.2;
  const blocks = [];
  for (let f = 0; f < 10; f += 2) {
    blocks.push(`<rect x="${num(f)}" y="${num(y)}" width="${num(2)}" height="5" fill="${f % 4 === 0 ? '#1a232b' : '#fff'}" stroke="#1a232b" stroke-width="0.8"/>`);
  }
  return `<g class="scale">${blocks.join('')}${text(0, y + 1.3, "0", 'font-size="8"')}${text(5, y + 1.3, "5'", 'text-anchor="middle" font-size="8"')}${text(10, y + 1.3, "10'", 'text-anchor="middle" font-size="8"')}${text(11.5, y + 0.55, "SCALE BAR — dimensions govern; check the bar if printed", 'font-size="8" class="muted"')}</g>`;
}

function titleBlock() {
  const x = L - 30, y = W + 4.6;
  return `<g class="title">
    ${text(x, y, 'TAP ATHLETES — FACILITY FLOORING PLAN', 'font-size="11" font-weight="700"')}
    ${text(x, y + 1.2, `AS-BUILT ${DIMS.meta.asBuiltDate} · interior ${fmtFtIn(W)} × ${fmtFtIn(L)} · ceiling ~${DIMS.building.ceiling}'`, 'font-size="8.5"')}
    ${text(x, y + 2.3, 'Source: dimensions.js · Left wall at top, front (glass) wall at left', 'font-size="8" class="muted"')}
  </g>`;
}

// Draw the whole sheet. `assignment` maps zone id -> material id.
export function renderPlan(svg, assignment) {
  const zones = ZONES.map((z) => {
    const mat = MATERIAL_COLORS[assignment[z.id]] || { fill: '#ddd' };
    return rect(z, `class="zone" data-zone="${z.id}" fill="${mat.fill}"`);
  }).join('');

  const cutouts = CUTOUTS.map((c) => rect(c, 'class="cutout" fill="url(#hatch)"')).join('');
  const b = DIMS.bathroom;
  const bathLabel = `${text((b.x0 + b.x1) / 2, (b.z0 + b.z1) / 2 - 0.3, 'BATHROOM', 'text-anchor="middle" font-size="9" font-weight="700"')}${text((b.x0 + b.x1) / 2, (b.z0 + b.z1) / 2 + 0.9, 'not floored', 'text-anchor="middle" font-size="8"')}`;

  const c = DIMS.cage;
  const pad = DIMS.padding;
  const cage = `${rect(c, 'class="net"')}${rect({ x0: c.x0, x1: c.x1, z0: 0, z1: pad.thickness }, 'class="pad"')}`;
  const cageLabel = text((c.x0 + c.x1) / 2, c.z0 + 1.6, `NET LINE — ${fmtFtIn(c.x1 - c.x0)} × ${fmtFtIn(c.z1 - c.z0)} × ${c.height}' H (retractable, deployed)`, 'text-anchor="middle" font-size="8.5" class="muted"');

  const m = DIMS.mirror;
  const mirror = `<rect class="mirror" x="${num(m.x0)}" y="${num(W) - 3}" width="${num(m.x1 - m.x0)}" height="3"/>`;

  const badges = [
    badge(c.x0 - 2.5, c.z0 / 2, 'padding'),
    badge(L + 1.4, DIMS.doors.backRollUp.z0 - 1.2, 'doors.backRollUp'),
    badge(L + 1.4, DIMS.doors.backPedestrian.z0 - 1.0, 'doors.backPedestrian'),
    badge(m.x1 + 1.5, W - 0.9, 'mirror'),
  ].join('');

  svg.setAttribute('viewBox', `${VIEW.x} ${VIEW.y} ${VIEW.w} ${VIEW.h}`);
  svg.innerHTML = `
    <defs>
      <pattern id="hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
        <rect width="6" height="6" fill="#eee"/><line x1="0" y1="0" x2="0" y2="6" stroke="#8a96a3" stroke-width="1.2"/>
      </pattern>
    </defs>
    <g id="sheet">
      <g id="zones">${zones}</g>
      <g id="seams"></g>
      <g id="labels"></g>
      ${cutouts}${bathLabel}
      ${cage}${cageLabel}
      ${mirror}
      ${walls()}
      <g id="dims">${dimensions()}</g>
      ${badges}
      ${scaleBar()}
      ${titleBlock()}
    </g>`;
}

// Zone labels carry the live take-off numbers, so they re-render on change.
export function renderLabels(svg, rows) {
  const g = svg.querySelector('#labels');
  g.innerHTML = rows.map((r) => {
    const z = ZONES.find((zz) => zz.id === r.id);
    const cx = (z.x0 + z.x1) / 2;
    const cz = (z.z0 + z.z1) / 2;
    const tall = z.z1 - z.z0 < 2; // pad strip: label sits inside, small
    if (tall) return text(cx, cz + 0.25, `${z.label.toUpperCase()} · ${r.netSf.toFixed(1)} sf · ${MATERIAL_COLORS[r.material]?.label ?? r.material}`, 'text-anchor="middle" font-size="6.5" class="muted"');
    const narrow = z.x1 - z.x0 < 10; // entrance / back: stack vertically
    const rot = narrow ? `transform="rotate(-90 ${num(cx)} ${num(cz)})"` : '';
    return `${text(cx, cz - 0.6, z.label.toUpperCase(), `text-anchor="middle" font-size="9.5" font-weight="700" ${rot}`)}${text(cx, cz + 0.9, `${r.netSf.toFixed(1)} sf · ${MATERIAL_COLORS[r.material]?.label ?? r.material}`, `text-anchor="middle" font-size="8.5" ${rot}`)}`;
  }).join('');
}

// seamsByZone: { zoneId: { direction, rip: [coord], butt: [{strip, coord}], rollWidth, stripStart } }
export function renderSeams(svg, seamsByZone) {
  const g = svg.querySelector('#seams');
  const out = [];
  for (const [id, s] of Object.entries(seamsByZone)) {
    const z = ZONES.find((zz) => zz.id === id);
    if (!z || !s) continue;
    for (const coord of s.rip) {
      out.push(s.direction === 'length'
        ? `<line class="rip" x1="${num(z.x0)}" y1="${num(coord)}" x2="${num(z.x1)}" y2="${num(coord)}"/>`
        : `<line class="rip" x1="${num(coord)}" y1="${num(z.z0)}" x2="${num(coord)}" y2="${num(z.z1)}"/>`);
    }
    for (const bs of s.butt) {
      // Strip index -> its band across the zone.
      const a = (s.direction === 'length' ? z.z0 : z.x0) + bs.strip * s.rollWidth;
      const b = Math.min(a + s.rollWidth, s.direction === 'length' ? z.z1 : z.x1);
      const p = (s.direction === 'length' ? z.x0 : z.z0) + bs.coord;
      out.push(s.direction === 'length'
        ? `<line class="butt" x1="${num(p)}" y1="${num(a)}" x2="${num(p)}" y2="${num(b)}"/>`
        : `<line class="butt" x1="${num(a)}" y1="${num(p)}" x2="${num(b)}" y2="${num(p)}"/>`);
    }
  }
  g.innerHTML = out.join('');
}

// Phones: turn the sheet sideways so the 80 ft axis runs down the screen.
export function setOrientation(svg, portrait) {
  const sheet = svg.querySelector('#sheet');
  if (portrait) {
    svg.setAttribute('viewBox', `0 0 ${VIEW.h} ${VIEW.w}`);
    sheet.setAttribute('transform', `rotate(90) translate(${-VIEW.x} ${-(VIEW.y + VIEW.h)})`);
  } else {
    svg.setAttribute('viewBox', `${VIEW.x} ${VIEW.y} ${VIEW.w} ${VIEW.h}`);
    sheet.removeAttribute('transform');
  }
}
