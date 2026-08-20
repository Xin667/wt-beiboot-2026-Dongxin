import { test } from 'node:test';
import assert from 'node:assert/strict';

import { TwoHandZoomGesture } from '../src/lib/index.js';
import { makeHand, landmark } from './helpers.js';

/** Hand, bei der nur das Handgelenk (LM 0) für die Distanz relevant ist. */
function handAt(x) {
  return makeHand({ 0: landmark(x, 0.5) });
}

test('TwoHandZoom: erkennt Annäherung beider Hände', () => {
  const g = new TwoHandZoomGesture({ minDelta: 0.01, minDistance: 0.2, holdMs: 400 });
  g.detect([handAt(0.3), handAt(0.7)], { timestamp: 0 }); // Distanz 0.4 initialisieren
  const r = g.detect([handAt(0.35), handAt(0.65)], { timestamp: 50 }); // Distanz 0.3, delta 0.1
  assert.equal(r.detected, true);
});

test('TwoHandZoom: Auseinanderbewegung wird nicht erkannt', () => {
  const g = new TwoHandZoomGesture({ minDelta: 0.01, minDistance: 0.2, holdMs: 400 });
  g.detect([handAt(0.35), handAt(0.65)], { timestamp: 0 }); // Distanz 0.3
  const r = g.detect([handAt(0.3), handAt(0.7)], { timestamp: 50 }); // Distanz 0.4, delta -0.1
  assert.equal(r.detected, false);
});

test('TwoHandZoom: Grenzwert – delta == minDelta zählt nicht (strikt >)', () => {
  // 0.0/0.5/1.0 sind binär exakt darstellbar → delta ist exakt 0.5.
  const g = new TwoHandZoomGesture({ minDelta: 0.5, minDistance: 0.2, holdMs: 400 });
  g.detect([handAt(0.0), handAt(1.0)], { timestamp: 0 }); // Distanz 1.0
  const r = g.detect([handAt(0.0), handAt(0.5)], { timestamp: 50 }); // Distanz 0.5, delta 0.5
  assert.equal(r.detected, false);
});

test('TwoHandZoom: unter minDistance wird nicht erkannt', () => {
  const g = new TwoHandZoomGesture({ minDelta: 0.01, minDistance: 0.2, holdMs: 400 });
  g.detect([handAt(0.4), handAt(0.6)], { timestamp: 0 }); // Distanz 0.2
  const r = g.detect([handAt(0.45), handAt(0.55)], { timestamp: 50 }); // Distanz 0.1 < minDistance
  assert.equal(r.detected, false);
});

test('TwoHandZoom: bleibt nach positivem Delta für holdMs aktiv', () => {
  const g = new TwoHandZoomGesture({ minDelta: 0.01, minDistance: 0.2, holdMs: 400 });
  g.detect([handAt(0.3), handAt(0.7)], { timestamp: 0 });
  g.detect([handAt(0.35), handAt(0.65)], { timestamp: 50 }); // aktiv
  // Kein weiteres Delta – Hand bleibt stehen, innerhalb holdMs noch aktiv
  assert.equal(g.detect([handAt(0.35), handAt(0.65)], { timestamp: 100 }).detected, true);
  assert.equal(g.detect([handAt(0.35), handAt(0.65)], { timestamp: 500 }).detected, false);
});
