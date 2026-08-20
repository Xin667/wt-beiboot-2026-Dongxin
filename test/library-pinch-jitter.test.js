import { test } from 'node:test';
import assert from 'node:assert/strict';

import { GestureLibrary, PinchGesture } from '../src/lib/index.js';
import { makeHand, landmark } from './helpers.js';

/**
 * End-to-End-Regressionstest für das Pinch-Flackern (docs/issue4/friction-notes.md).
 *
 * Füttert die Library Frame für Frame mit einer Distanz-Sequenz und zählt die
 * 'gesturestart'-Events – das ist exakt die START/END-Paar-Logik, die im
 * Event-Log der Demo sichtbar wurde. Vor der Änderung (ADR 0007) erzeugte jede
 * einzelne Unterschreitung der Schwelle eine neue start-Flanke.
 */

function countStarts(dists, stepMs = 50) {
  const lib = new GestureLibrary({ exclusive: true });
  lib.register(new PinchGesture({ threshold: 0.04, holdMs: 150 }));

  let starts = 0;
  lib.addEventListener('gesturestart', () => starts++);

  dists.forEach((d, i) => {
    const hand = makeHand({ 4: landmark(0.5, 0.5), 8: landmark(0.5 + d, 0.5) });
    lib.update([hand], { timestamp: i * stepMs });
  });

  return starts;
}

test('GestureLibrary: durchgehender Pinch löst genau einen gesturestart aus', () => {
  const dists = [0.05, 0.035, 0.045, 0.038, 0.036, 0.034, 0.036, 0.035];
  assert.equal(countStarts(dists), 1);
});

test('GestureLibrary: reines Pinch-Rauschen löst keinen gesturestart aus', () => {
  const dists = [0.05, 0.035, 0.045, 0.038, 0.05, 0.036, 0.045, 0.035];
  assert.equal(countStarts(dists), 0);
});
