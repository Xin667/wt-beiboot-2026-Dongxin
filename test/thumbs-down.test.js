import { test } from 'node:test';
import assert from 'node:assert/strict';

import { ThumbsDownGesture } from '../src/lib/index.js';
import { makeHand, landmark } from './helpers.js';

/** Daumen runter: Daumenspitze ist der tiefste Punkt der Hand. */
function thumbsDownHand() {
  return makeHand({
    4: landmark(0.5, 0.9),   // THUMB_TIP (tiefster Punkt)
    3: landmark(0.45, 0.5),  // THUMB_IP
    8: landmark(0.4, 0.4),   // INDEX_TIP
    12: landmark(0.35, 0.4), // MIDDLE_TIP
    16: landmark(0.3, 0.4),  // RING_TIP
    20: landmark(0.25, 0.4), // PINKY_TIP
  });
}

test('ThumbsDown: erkennt Daumen runter (holdMs=0)', () => {
  const g = new ThumbsDownGesture({ holdMs: 0 });
  assert.equal(g.detect(thumbsDownHand(), { timestamp: 100 }).detected, true);
});

test('ThumbsDown: erkennt NICHT, wenn der Daumen nicht der tiefste Punkt ist', () => {
  const g = new ThumbsDownGesture({ holdMs: 0 });
  const hand = thumbsDownHand();
  hand[4] = landmark(0.5, 0.3); // Daumen höher als die Fingerspitzen
  assert.equal(g.detect(hand, { timestamp: 100 }).detected, false);
});

test('ThumbsDown: erkennt NICHT bei angewinkeltem Daumen', () => {
  const g = new ThumbsDownGesture({ holdMs: 0 });
  const hand = thumbsDownHand();
  hand[4] = landmark(0.5, 0.4); // Daumenspitze über THUMB_IP (nicht gestreckt)
  assert.equal(g.detect(hand, { timestamp: 100 }).detected, false);
});

test('ThumbsDown: löst erst nach holdMs aus (Grenzwert)', () => {
  const g = new ThumbsDownGesture({ holdMs: 100 });
  const hand = thumbsDownHand();
  assert.equal(g.detect(hand, { timestamp: 0 }).detected, false);
  assert.equal(g.detect(hand, { timestamp: 99 }).detected, false);
  assert.equal(g.detect(hand, { timestamp: 100 }).detected, true);
});
