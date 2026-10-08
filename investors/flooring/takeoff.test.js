// Run: node flooring/takeoff.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DIMS, ZONES, CUTOUTS } from '../dimensions.js';
import { area, fmtFtIn, takeoff, PRESETS, planRolls, packCuts, bestDirection, planTiles, planMaterial } from './takeoff.js';

const close = (a, b, msg) => assert.ok(Math.abs(a - b) < 1e-6, `${msg}: got ${a}, expected ${b}`);
const zone = (id) => ZONES.find((z) => z.id === id);

test('zones partition the floor exactly', () => {
  const building = { x0: 0, x1: DIMS.building.length, z0: 0, z1: DIMS.building.width };
  const expected = area(building) - CUTOUTS.reduce((s, c) => s + area(c), 0);
  close(area(building), 1933.3333333, 'gross');
  close(expected, 1884.3333333, 'net');
  close(ZONES.reduce((s, z) => s + area(z), 0), expected, 'zone sum');
  close(area(zone('entrance')), 120.1666667, 'entrance');
  close(area(zone('padding')), 81.6666667, 'padding');
  close(area(zone('cage')), 980, 'cage');
  close(area(zone('gym')), 630, 'gym');
  close(area(zone('back')), 72.5, 'back');
});

test('take-off: all rubber at 10% waste', () => {
  const t = takeoff(ZONES, PRESETS.allRubber(ZONES), 10);
  close(t.byMaterial.rubber.netSf, 1884.3333333, 'rubber net');
  close(t.byMaterial.rubber.orderSf, 2072.7666667, 'rubber order');
  assert.equal(t.byMaterial.pvc, undefined);
});

test('take-off: rubber gym + PVC cage at 10% waste', () => {
  const t = takeoff(ZONES, PRESETS.rubberGymPvcCage(ZONES), 10);
  close(t.byMaterial.pvc.netSf, 1061.6666667, 'pvc net');
  close(t.byMaterial.pvc.orderSf, 1167.8333333, 'pvc order');
  close(t.byMaterial.rubber.netSf, 822.6666667, 'rubber net');
  close(t.byMaterial.rubber.orderSf, 904.9333333, 'rubber order');
  close(t.byMaterial.pvc.netSf + t.byMaterial.rubber.netSf, 1884.3333333, 'sum');
});

test('cage, 4 ft rolls cut to length, strips along the length', () => {
  const p = planRolls(zone('cage'), { rollWidth: 4, rollLength: null, direction: 'length' });
  assert.equal(p.strips, 4);
  close(p.stripLength, 70, 'strip length');
  close(p.lastStripWidth, 2, 'last strip');
  close(p.linearFt, 280, 'linear ft');
  assert.equal(p.rolls, null);
  close(p.orderedSf, 1120, 'ordered');
  close(p.wasteSf, 140, 'waste');
  close(p.wastePct, 14.2857143, 'waste pct');
  assert.deepEqual(p.seams.rip.map((v) => +v.toFixed(4)), [5.1667, 9.1667, 13.1667]);
  assert.deepEqual(p.seams.butt, []);
});

test('cage, 4 ft x 25 ft rolls, strips along the length', () => {
  const p = planRolls(zone('cage'), { rollWidth: 4, rollLength: 25, direction: 'length' });
  assert.deepEqual(p.cuts.filter((c) => c.strip === 0).map((c) => c.len), [25, 25, 20]);
  assert.equal(p.cuts.length, 12);
  assert.equal(p.rolls, 12);
  close(p.orderedSf, 1200, 'ordered');
  const strip0 = p.seams.butt.filter((s) => s.strip === 0).map((s) => s.coord);
  assert.deepEqual(strip0, [25, 50]);
  const packed = packCuts(p.cuts.map((c) => c.len), 25);
  assert.equal(packed.rolls, 12);
  close(packed.offcutFt, 20, 'offcut');
});

test('cage, 4 ft rolls cut to length, strips across the width — and auto picks it', () => {
  const p = planRolls(zone('cage'), { rollWidth: 4, rollLength: null, direction: 'width' });
  assert.equal(p.strips, 18);
  close(p.stripLength, 14, 'strip length');
  close(p.lastStripWidth, 2, 'last strip');
  close(p.linearFt, 252, 'linear ft');
  close(p.orderedSf, 1008, 'ordered');
  close(p.wasteSf, 28, 'waste');
  assert.equal(p.seams.rip.length, 17);
  close(p.seams.rip[0], 11, 'first rip seam');
  close(p.seams.rip[16], 75, 'last rip seam');
  assert.equal(bestDirection(zone('cage'), { rollWidth: 4, rollLength: null }), 'width');
});

test('gym strip, 4 ft x 25 ft rolls', () => {
  const across = planRolls(zone('gym'), { rollWidth: 4, rollLength: 25, direction: 'width' });
  assert.equal(across.strips, 18);
  close(across.stripLength, 9, 'strip length');
  close(across.lastStripWidth, 2, 'last strip');
  assert.equal(across.cuts.length, 18);
  assert.equal(across.rolls, 9);
  close(across.orderedSf, 900, 'ordered');
  close(packCuts(across.cuts.map((c) => c.len), 25).offcutFt, 63, 'offcut');

  const along = planRolls(zone('gym'), { rollWidth: 4, rollLength: null, direction: 'length' });
  assert.equal(along.strips, 3);
  close(along.lastStripWidth, 1, 'last strip');
  close(along.linearFt, 210, 'linear ft');
  close(along.orderedSf, 840, 'ordered');
  assert.equal(bestDirection(zone('gym'), { rollWidth: 4, rollLength: null }), 'width');
});

test('formatting, tiles, and the roll-length guard', () => {
  assert.equal(fmtFtIn(DIMS.building.width), `24'-2"`);
  assert.equal(fmtFtIn(7.375), `7'-4 1/2"`);
  assert.equal(fmtFtIn(1 + 2 / 12), `1'-2"`);
  assert.equal(fmtFtIn(80), `80'-0"`);
  assert.equal(fmtFtIn(DIMS.bathroom.z0), `17'-2"`);

  const cage = planTiles(zone('cage'), 2, 2);
  assert.deepEqual([cage.cols, cage.rows, cage.tiles, cage.cutTiles], [35, 7, 245, 0]);
  const gym = planTiles(zone('gym'), 2, 2);
  assert.deepEqual([gym.cols, gym.rows, gym.tiles, gym.cutTiles], [35, 5, 175, 35]);

  assert.throws(() => packCuts([30], 25), /longer than roll/);
});

test('material-level packing shares roll stock across zones', () => {
  const rubberZones = ZONES.filter((z) => z.id !== 'cage' && z.id !== 'padding');
  const m = planMaterial(rubberZones, { rollWidth: 4, rollLength: 25, direction: 'auto' });
  close(m.netSf, 822.6666667, 'net');
  const separate = m.perZone.reduce((s, p) => s + p.plan.rolls, 0);
  assert.ok(m.rolls <= separate, `shared packing (${m.rolls}) should not exceed per-zone (${separate})`);
  close(m.orderedSf, m.rolls * 100, 'ordered = rolls x 100 sf');
});
