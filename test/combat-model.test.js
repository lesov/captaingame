const test = require('node:test');
const assert = require('node:assert/strict');
const {
  NOGO, HELM_MARGIN, AMMO, CLASSES, polar, pointOfSail, sailable,
  rangeAt, elevFor, computeDamage, gunsAvailCount, mountCount, D2R,
  speedMultiplier, turnMultiplier, reloadMultiplier,
} = require('../combat-model.js');

test('polar: dead below NOGO, rises through close-hauled into broad reach, eases running', () => {
  assert.equal(polar(0), 0);
  assert.equal(polar(NOGO - 0.01), 0);
  assert.ok(polar(70) > 0 && polar(70) < polar(100));
  assert.ok(polar(100) > polar(70));
  assert.ok(polar(135) >= polar(100));
  // some easing (but not collapse) running dead downwind vs. a broad reach
  assert.ok(polar(180) < polar(135));
  assert.ok(polar(180) > 0.8 * polar(135));
});

test('pointOfSail labels match the same NOGO boundary as polar()', () => {
  assert.equal(pointOfSail(NOGO - 1, 0), 'In irons');
  assert.equal(pointOfSail(NOGO - 1, -0.2), 'Aback, sternway');
  assert.equal(pointOfSail(NOGO + 1, 0.5), 'Close-hauled');
  assert.equal(pointOfSail(170, 1), 'Running');
});

test('sailable: clamps a heading inside the no-go wedge to the HELM_MARGIN edge, leaves others alone', () => {
  const windFrom = 0; // wind blowing from due north
  // dead upwind -> clamped to the nearer edge of the wedge
  const clamped = sailable(0.001, windFrom);
  assert.ok(Math.abs(clamped) > (HELM_MARGIN - 1) * D2R);
  // a beam reach heading is well outside the wedge -> returned unchanged
  const beam = Math.PI / 2;
  assert.equal(sailable(beam, windFrom), beam);
});

test('rangeAt/elevFor round-trip for every ammo type', () => {
  for (const k of Object.keys(AMMO)) {
    for (const e of [-2, 0, 3, 6, 9]) {
      const d = rangeAt(k, e);
      const sol = elevFor(k, d);
      assert.ok(sol, `elevFor(${k}, ${d}) found no solution`);
      assert.ok(Math.abs(sol.e - e) < 0.3, `${k} elev round-trip off: wanted ${e}, got ${sol.e}`);
    }
  }
});

test('computeDamage: hull-zone damage ranks round > chain > grape, scales with energy and caliber', () => {
  const d = (k, zone = 'hull') => computeDamage(k, 0.6, 1, zone);
  assert.ok(d('round').hull > d('chain').hull);
  assert.ok(d('chain').hull > d('grape').hull);
  // monotonic in energy
  assert.ok(computeDamage('round', 1.2, 1, 'hull').hull > computeDamage('round', 0.3, 1, 'hull').hull);
  // monotonic in caliber multiplier
  assert.ok(computeDamage('round', 0.6, 1.3, 'hull').hull > computeDamage('round', 0.6, 0.8, 'hull').hull);
  // rig-zone hits are sail/crew damage, not hull damage, and chain is the rigging specialist
  const rig = (k) => computeDamage(k, 0.6, 1, 'rig');
  assert.equal(rig('round').hull, 0);
  assert.ok(rig('chain').sails > rig('round').sails);
});

test('gunsAvailCount: heeled-away broadside halves, the opposite side and chasers never do', () => {
  assert.equal(gunsAvailCount(20, true, -6), 10);
  assert.equal(gunsAvailCount(20, true, 6), 20);
  assert.equal(gunsAvailCount(20, true, 0), 20);
  // a chaser mount (isBroadside=false) is never masked by heel
  assert.equal(gunsAvailCount(2, false, -20), 2);
});

test('speedMultiplier/turnMultiplier/reloadMultiplier: boundary values and monotonic in damage recovery', () => {
  // these are the single source of truth for both updateShip() and the pause stats panel
  assert.equal(speedMultiplier(1), 1);
  assert.equal(speedMultiplier(0), 0.55);
  assert.ok(speedMultiplier(0.5) > speedMultiplier(0) && speedMultiplier(0.5) < speedMultiplier(1));

  assert.equal(turnMultiplier(1, 1), 1);
  assert.equal(turnMultiplier(0, 0), 0.5 * 0.6);
  assert.ok(turnMultiplier(0.5, 1) > turnMultiplier(0, 1), 'more crew should turn faster');
  assert.ok(turnMultiplier(1, 0.5) > turnMultiplier(1, 0), 'more rigging should turn faster');

  assert.equal(reloadMultiplier(1), 1);
  assert.equal(reloadMultiplier(0), 0.35);
  assert.ok(reloadMultiplier(0.5) > reloadMultiplier(0) && reloadMultiplier(0.5) < reloadMultiplier(1));

  // out-of-range inputs (e.g. a crew fraction that briefly overshoots due to float error) stay clamped
  assert.equal(speedMultiplier(-1), speedMultiplier(0));
  assert.equal(turnMultiplier(2, 2), turnMultiplier(1, 1));
});

test('CLASSES schema: every class has the fields the physics/combat code depends on', () => {
  const ids = Object.keys(CLASSES);
  assert.ok(ids.length >= 6, 'expected at least 6 ship classes');
  for (const id of ids) {
    const C = CLASSES[id];
    for (const f of ['name', 'L', 'B', 'guns', 'hull', 'speedK', 'turn', 'hh', 'dmg', 'chaserBow', 'chaserStern', 'blurb']) {
      assert.ok(f in C, `${id} is missing field "${f}"`);
    }
    assert.ok(C.hull > 0, `${id}.hull must be > 0`);
    assert.ok(C.guns >= 0, `${id}.guns must be >= 0`);
    assert.ok(C.chaserBow >= 0 && C.chaserStern >= 0, `${id} chaser counts must be >= 0`);
    assert.equal(mountCount(C, 0), C.guns);
    assert.equal(mountCount(C, 1), C.guns);
    assert.equal(mountCount(C, 2), C.chaserBow);
    assert.equal(mountCount(C, 3), C.chaserStern);
  }
});
