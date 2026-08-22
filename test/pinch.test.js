import { test } from 'node:test';
import assert from 'node:assert/strict';

import { PinchGesture } from '../src/lib/index.js';
import { makeHand, landmark, countTransitions } from './helpers.js';

/** Hand mit Daumen- und Zeigefingerspitze im Abstand `d` (x-Richtung). */
function pinchHand(d) {
  return makeHand({
    4: landmark(0.5, 0.5),      // THUMB_TIP
    8: landmark(0.5 + d, 0.5),  // INDEX_TIP
  });
}

test('Pinch: erkennt bei Distanz unter der Schwelle (holdMs=0)', () => {
  const g = new PinchGesture({ threshold: 0.04, holdMs: 0 });
  assert.equal(g.detect(pinchHand(0.02), { timestamp: 0 }).detected, true);
});

test('Pinch: erkennt NICHT bei Distanz über der Schwelle', () => {
  const g = new PinchGesture({ threshold: 0.04, holdMs: 0 });
  assert.equal(g.detect(pinchHand(0.1), { timestamp: 0 }).detected, false);
});

test('Pinch: Grenzwert – Distanz genau auf der Schwelle zählt nicht (strikt <)', () => {
  const g = new PinchGesture({ threshold: 0.04, holdMs: 0 });
  assert.equal(g.detect(pinchHand(0.04), { timestamp: 0 }).detected, false);
});

test('Pinch: reines Rauschen um die Schwelle erzeugt keine Flanke', () => {
  // Die Distanz oszilliert um 0.04, bleibt aber nie länger als einen Frame
  // unter der Schwelle → die holdMs-Stabilisierung unterdrückt jede Flanke.
  // Vor der Änderung (Einzel-Frame-Vergleich) wären es 4 false→true-Flanken.
  const g = new PinchGesture({ threshold: 0.04, holdMs: 150 });
  const dists = [0.05, 0.035, 0.045, 0.038, 0.05, 0.036, 0.045, 0.035];
  const detected = dists.map((d, i) => g.detect(pinchHand(d), { timestamp: i * 50 }).detected);
  assert.equal(countTransitions(detected), 0);
});

test('Pinch: durchgehendes Halten löst genau eine Flanke aus', () => {
  // Zwei Rausch-Frames über der Schwelle, danach durchgehend darunter.
  // Vorher (Einzel-Frame) wären es 2 false→true-Flanken, jetzt 1.
  const g = new PinchGesture({ threshold: 0.04, holdMs: 150 });
  const dists = [0.05, 0.035, 0.045, 0.038, 0.036, 0.034, 0.036, 0.035];
  const detected = dists.map((d, i) => g.detect(pinchHand(d), { timestamp: i * 50 }).detected);
  assert.equal(countTransitions(detected), 1);
  assert.equal(detected.at(-1), true);
});

test('Pinch: Daten enthalten Distanz und Haltedauer', () => {
  const g = new PinchGesture({ threshold: 0.04, holdMs: 0 });
  const r = g.detect(pinchHand(0.02), { timestamp: 100 });
  assert.equal(r.detected, true);
  assert.equal(typeof r.data.distance, 'number');
  assert.equal(typeof r.data.heldMs, 'number');
});

test('Pinch: Exit bewusst ohne Debounce – stabil gehalten, ein Rausch-Frame beendet sofort', () => {
  // Dokumentierte Semantik (ADR 0007): Nur der EINTRITT ist durch holdMs
  // stabilisiert, der Austritt reagiert sofort. Dieser Test fixiert das
  // Verhalten, damit eine künftige Änderung bewusst passieren muss.
  const g = new PinchGesture({ threshold: 0.04, holdMs: 150 });
  const held = [0, 50, 100, 150].map((t) => g.detect(pinchHand(0.03), { timestamp: t }).detected);
  assert.deepEqual(held, [false, false, false, true]); // ab 150 ms aktiv

  // Ein einzelner Frame über der Schwelle beendet die Geste sofort …
  assert.equal(g.detect(pinchHand(0.05), { timestamp: 200 }).detected, false);

  // … und die nächste Erkennung braucht wieder die volle holdMs.
  assert.equal(g.detect(pinchHand(0.03), { timestamp: 250 }).detected, false);
  assert.equal(g.detect(pinchHand(0.03), { timestamp: 400 }).detected, true);
});
