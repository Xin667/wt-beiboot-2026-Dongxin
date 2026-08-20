import { test } from 'node:test';
import assert from 'node:assert/strict';

import { ThumbsUpGesture } from '../src/lib/index.js';
import { makeHand, landmark } from './helpers.js';

/** Daumen hoch, alle anderen Finger eingeklappt. */
function thumbsUpHand() {
  return makeHand({
    4: landmark(0.5, 0.2),   // THUMB_TIP hoch
    3: landmark(0.45, 0.4),  // THUMB_IP
    5: landmark(0.4, 0.5),   // INDEX_MCP
    8: landmark(0.4, 0.7),   // INDEX_TIP (eingeklappt)
    9: landmark(0.35, 0.5),  // MIDDLE_MCP
    12: landmark(0.35, 0.7), // MIDDLE_TIP
    13: landmark(0.3, 0.5),  // RING_MCP
    16: landmark(0.3, 0.7),  // RING_TIP
    17: landmark(0.25, 0.5), // PINKY_MCP
    20: landmark(0.25, 0.7), // PINKY_TIP
  });
}

test('ThumbsUp: erkennt Daumen hoch (holdMs=0)', () => {
  const g = new ThumbsUpGesture({ holdMs: 0 });
  assert.equal(g.detect(thumbsUpHand(), { timestamp: 100 }).detected, true);
});

test('ThumbsUp: erkennt NICHT bei gesenktem Daumen', () => {
  const g = new ThumbsUpGesture({ holdMs: 0 });
  const hand = thumbsUpHand();
  hand[4] = landmark(0.5, 0.9); // Daumenspitze unter INDEX_MCP
  assert.equal(g.detect(hand, { timestamp: 100 }).detected, false);
});

test('ThumbsUp: erkennt NICHT bei gestrecktem Zeigefinger', () => {
  const g = new ThumbsUpGesture({ holdMs: 0 });
  const hand = thumbsUpHand();
  hand[8] = landmark(0.4, 0.3); // Zeigefinger gestreckt statt eingeklappt
  assert.equal(g.detect(hand, { timestamp: 100 }).detected, false);
});

test('ThumbsUp: löst erst nach holdMs aus (Grenzwert)', () => {
  const g = new ThumbsUpGesture({ holdMs: 100 });
  const hand = thumbsUpHand();
  assert.equal(g.detect(hand, { timestamp: 0 }).detected, false);
  assert.equal(g.detect(hand, { timestamp: 99 }).detected, false);  // holdMs - 1
  assert.equal(g.detect(hand, { timestamp: 100 }).detected, true);  // genau holdMs
});

test('ThumbsUp: reset() setzt den Halte-Zustand zurück', () => {
  const g = new ThumbsUpGesture({ holdMs: 100 });
  const hand = thumbsUpHand();
  g.detect(hand, { timestamp: 0 });
  g.detect(hand, { timestamp: 100 }); // erkannt
  g.reset();
  assert.equal(g.detect(hand, { timestamp: 150 }).detected, false);
});
