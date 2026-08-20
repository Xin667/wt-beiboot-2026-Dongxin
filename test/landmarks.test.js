import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  LM,
  FINGER_TIPS,
  FINGER_MCPS,
  distance2D,
  isFingerCurled,
  isFingerExtended,
} from '../src/lib/utils/landmarks.js';

import { makeHand, landmark } from './helpers.js';

test('LM enthält die 21 MediaPipe-Indizes (0–20)', () => {
  assert.equal(Object.keys(LM).length, 21);
  assert.equal(LM.WRIST, 0);
  assert.equal(LM.THUMB_TIP, 4);
  assert.equal(LM.INDEX_TIP, 8);
  assert.equal(LM.PINKY_TIP, 20);
});

test('FINGER_TIPS und FINGER_MCPS nennen die fünf Finger', () => {
  assert.deepEqual(FINGER_TIPS, [4, 8, 12, 16, 20]);
  assert.deepEqual(FINGER_MCPS, [2, 5, 9, 13, 17]);
});

test('distance2D berechnet die euklidische Distanz', () => {
  assert.equal(distance2D({ x: 0, y: 0 }, { x: 3, y: 4 }), 5);
  assert.equal(distance2D({ x: 1, y: 1 }, { x: 1, y: 1 }), 0);
});

test('isFingerCurled: Spitze tiefer als MCP (y-Achse nach unten)', () => {
  const hand = makeHand({
    5: landmark(0, 0.5),   // INDEX_MCP
    8: landmark(0, 0.7),   // INDEX_TIP
  });
  assert.equal(isFingerCurled(hand, LM.INDEX_TIP, LM.INDEX_MCP), true);
});

test('isFingerCurled: Spitze höher als MCP → nicht eingeklappt', () => {
  const hand = makeHand({
    5: landmark(0, 0.5),
    8: landmark(0, 0.3),
  });
  assert.equal(isFingerCurled(hand, LM.INDEX_TIP, LM.INDEX_MCP), false);
});

test('isFingerExtended ist das Gegenteil von isFingerCurled', () => {
  const extended = makeHand({ 5: landmark(0, 0.5), 8: landmark(0, 0.3) });
  const curled = makeHand({ 5: landmark(0, 0.5), 8: landmark(0, 0.7) });

  assert.equal(isFingerExtended(extended, 8, 5), true);
  assert.equal(isFingerExtended(curled, 8, 5), false);
  assert.equal(isFingerExtended(extended, 8, 5), !isFingerCurled(extended, 8, 5));
});
