import { test } from 'node:test';
import assert from 'node:assert/strict';

import { PeaceGesture } from '../src/lib/index.js';
import { makeHand, landmark } from './helpers.js';

/** Peace: Zeige- + Mittelfinger gestreckt, Ring- + kleiner Finger eingeklappt. */
function peaceHand() {
  return makeHand({
    8: landmark(0.4, 0.3),   // INDEX_TIP gestreckt
    5: landmark(0.4, 0.6),   // INDEX_MCP
    12: landmark(0.35, 0.3), // MIDDLE_TIP gestreckt
    9: landmark(0.35, 0.6),  // MIDDLE_MCP
    16: landmark(0.3, 0.7),  // RING_TIP eingeklappt
    13: landmark(0.3, 0.6),  // RING_MCP
    20: landmark(0.25, 0.7), // PINKY_TIP eingeklappt
    17: landmark(0.25, 0.6), // PINKY_MCP
  });
}

test('Peace: erkennt die V-Geste (holdMs=0)', () => {
  const g = new PeaceGesture({ holdMs: 0 });
  assert.equal(g.detect(peaceHand(), { timestamp: 100 }).detected, true);
});

test('Peace: erkennt NICHT bei eingeklapptem Mittelfinger', () => {
  const g = new PeaceGesture({ holdMs: 0 });
  const hand = peaceHand();
  hand[12] = landmark(0.35, 0.7); // Mittelfinger eingeklappt
  assert.equal(g.detect(hand, { timestamp: 100 }).detected, false);
});

test('Peace: erkennt NICHT bei gestrecktem Ringfinger', () => {
  const g = new PeaceGesture({ holdMs: 0 });
  const hand = peaceHand();
  hand[16] = landmark(0.3, 0.3); // Ringfinger gestreckt statt eingeklappt
  assert.equal(g.detect(hand, { timestamp: 100 }).detected, false);
});

test('Peace: löst erst nach holdMs aus (Grenzwert)', () => {
  const g = new PeaceGesture({ holdMs: 100 });
  const hand = peaceHand();
  assert.equal(g.detect(hand, { timestamp: 0 }).detected, false);
  assert.equal(g.detect(hand, { timestamp: 99 }).detected, false);
  assert.equal(g.detect(hand, { timestamp: 100 }).detected, true);
});
