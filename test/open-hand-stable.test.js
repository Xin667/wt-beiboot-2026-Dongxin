import { test } from 'node:test';
import assert from 'node:assert/strict';

import { OpenHandStableGesture } from '../src/lib/index.js';
import { makeHand, landmark } from './helpers.js';

/** Offene Hand mit stabilem Handgelenk (Index-, Mittel-, Ringfinger gestreckt). */
function openHand() {
  return makeHand({
    0: landmark(0.5, 0.5),   // WRIST
    8: landmark(0.4, 0.3),   // INDEX_TIP gestreckt
    5: landmark(0.4, 0.6),   // INDEX_MCP
    12: landmark(0.35, 0.3), // MIDDLE_TIP gestreckt
    9: landmark(0.35, 0.6),  // MIDDLE_MCP
    16: landmark(0.3, 0.3),  // RING_TIP gestreckt
    13: landmark(0.3, 0.6),  // RING_MCP
  });
}

test('OpenHandStable: erster Frame kann noch keine Bewegung messen', () => {
  const g = new OpenHandStableGesture({ holdMs: 100, maxMovement: 0.015 });
  assert.equal(g.detect(openHand(), { timestamp: 0 }).detected, false);
});

test('OpenHandStable: erkennt offene, stabile Hand nach holdMs', () => {
  const g = new OpenHandStableGesture({ holdMs: 100, maxMovement: 0.015 });
  const hand = openHand();
  g.detect(hand, { timestamp: 0 });
  g.detect(hand, { timestamp: 50 });   // _stableStart = 50
  g.detect(hand, { timestamp: 100 });  // held = 50
  assert.equal(g.detect(hand, { timestamp: 201 }).detected, true); // held = 151 > 100
});

test('OpenHandStable: Grenzwert – genau holdMs zählt noch nicht (strikt >)', () => {
  const g = new OpenHandStableGesture({ holdMs: 100, maxMovement: 0.015 });
  const hand = openHand();
  g.detect(hand, { timestamp: 0 });
  g.detect(hand, { timestamp: 50 });  // _stableStart = 50
  assert.equal(g.detect(hand, { timestamp: 150 }).detected, false); // held = 100, nicht > 100
  assert.equal(g.detect(hand, { timestamp: 151 }).detected, true);  // held = 101 > 100
});

test('OpenHandStable: Bewegung über maxMovement setzt den Timer zurück', () => {
  const g = new OpenHandStableGesture({ holdMs: 100, maxMovement: 0.015 });
  const still = openHand();
  const moved = openHand();
  moved[0] = landmark(0.7, 0.5); // Handgelenk springt weit

  g.detect(still, { timestamp: 0 });
  g.detect(still, { timestamp: 50 });  // _stableStart = 50
  assert.equal(g.detect(moved, { timestamp: 100 }).detected, false); // Reset durch Bewegung
  assert.equal(g.detect(still, { timestamp: 200 }).detected, false); // Timer beginnt neu
});

test('OpenHandStable: geschlossene Hand wird nicht erkannt', () => {
  const g = new OpenHandStableGesture({ holdMs: 0, maxMovement: 0.015 });
  const closed = makeHand({
    0: landmark(0.5, 0.5),
    8: landmark(0.4, 0.7),  // Zeigefinger eingeklappt
    5: landmark(0.4, 0.6),
  });
  g.detect(closed, { timestamp: 0 });
  assert.equal(g.detect(closed, { timestamp: 50 }).detected, false);
});
