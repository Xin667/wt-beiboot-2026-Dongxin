import { test } from 'node:test';
import assert from 'node:assert/strict';

import { GestureLibrary, BaseGesture } from '../src/lib/index.js';
import { makeHand } from './helpers.js';

/**
 * FakeGesture – eine minimal steuerbare Geste, um die Library-Integration
 * (Routing, exclusive-Modus, Events) unabhängig von der konkreten Gestenlogik
 * zu testen.
 */
class FakeGesture extends BaseGesture {
  constructor(name, detected, options = {}) {
    super();
    this._name = name;
    this._detected = detected;
    this._handCount = options.handCount ?? 1;
  }
  get name() { return this._name; }
  get description() { return `Fake-Geste für Tests (${this._name})`; }
  get handCount() { return this._handCount; }
  setResult(detected) { this._detected = detected; }
  detect() {
    return { detected: this._detected, confidence: this._detected ? 1 : 0, data: {} };
  }
}

// ── Registrierung ───────────────────────────────────────────────────────────

test('GestureLibrary: getRegisteredGestures/getGesture/unregister', () => {
  const lib = new GestureLibrary();
  const a = new FakeGesture('a', false);
  lib.register(a);
  lib.register(new FakeGesture('b', false));

  assert.deepEqual(lib.getRegisteredGestures(), ['a', 'b']);
  assert.equal(lib.getGesture('a'), a);
  assert.equal(lib.getGesture('nope'), undefined);

  assert.equal(lib.unregister('a'), true);
  assert.deepEqual(lib.getRegisteredGestures(), ['b']);
  assert.equal(lib.unregister('a'), false); // bereits entfernt
});

test('GestureLibrary: register validiert Typ und doppelte Namen', () => {
  const lib = new GestureLibrary();
  assert.throws(() => lib.register({}), /BaseGesture/);
  lib.register(new FakeGesture('a', false));
  assert.throws(() => lib.register(new FakeGesture('a', false)), /bereits registriert/);
});

// ── exclusive-Modus ─────────────────────────────────────────────────────────

test('GestureLibrary: exclusive – erste registrierte Geste gewinnt', () => {
  const lib = new GestureLibrary({ exclusive: true });
  lib.register(new FakeGesture('first', true));
  lib.register(new FakeGesture('second', true));

  const results = lib.update([makeHand()], { timestamp: 0 });
  assert.equal(results.get('first').detected, true);
  assert.equal(results.get('second').detected, false); // exclusive: übersprungen
  assert.deepEqual(lib.getActiveGestures(), ['first']);
});

test('GestureLibrary: exclusive:false – alle Gesten werden unabhängig ausgewertet', () => {
  const lib = new GestureLibrary({ exclusive: false });
  lib.register(new FakeGesture('first', true));
  lib.register(new FakeGesture('second', true));

  const results = lib.update([makeHand()], { timestamp: 0 });
  assert.equal(results.get('first').detected, true);
  assert.equal(results.get('second').detected, true);
  assert.deepEqual(lib.getActiveGestures(), ['first', 'second']);
});

// ── handCount-Routing ───────────────────────────────────────────────────────

test('GestureLibrary: handCount-Routing – 1 Hand testet nur Einhand-Gesten', () => {
  const lib = new GestureLibrary({ exclusive: false });
  lib.register(new FakeGesture('one', true, { handCount: 1 }));
  lib.register(new FakeGesture('two', true, { handCount: 2 }));

  const oneHand = lib.update([makeHand()], { timestamp: 0 });
  assert.equal(oneHand.get('one').detected, true);
  assert.equal(oneHand.get('two').detected, false); // wrong-hand-count

  const twoHands = lib.update([makeHand(), makeHand()], { timestamp: 1 });
  assert.equal(twoHands.get('two').detected, true);
  assert.equal(twoHands.get('one').detected, false);
});

// ── Events ──────────────────────────────────────────────────────────────────

test('GestureLibrary: gesturestart/gestureend feuern nur beim Übergang', () => {
  const lib = new GestureLibrary({ exclusive: false });
  const g = new FakeGesture('a', false);
  lib.register(g);

  const events = [];
  lib.addEventListener('gesturestart', () => events.push('start'));
  lib.addEventListener('gestureend', () => events.push('end'));

  lib.update([makeHand()], { timestamp: 0 }); // false → keine Events
  g.setResult(true);
  lib.update([makeHand()], { timestamp: 1 }); // start
  lib.update([makeHand()], { timestamp: 2 }); // bleibt erkannt → kein neues Event
  g.setResult(false);
  lib.update([makeHand()], { timestamp: 3 }); // end

  assert.deepEqual(events, ['start', 'end']);
});

test('GestureLibrary: gesture-Event feuert pro Frame bei Erkennung', () => {
  const lib = new GestureLibrary({ exclusive: false });
  lib.register(new FakeGesture('a', true));

  let count = 0;
  lib.addEventListener('gesture', () => count++);
  lib.update([makeHand()], { timestamp: 0 });
  lib.update([makeHand()], { timestamp: 1 });
  lib.update([makeHand()], { timestamp: 2 });

  assert.equal(count, 3);
});

test('GestureLibrary: onGesture/onChange bleiben kompatible Wrapper', () => {
  const lib = new GestureLibrary({ exclusive: false });
  const g = new FakeGesture('a', false);
  lib.register(g);

  const gestures = [];
  const changes = [];
  const unsubGesture = lib.onGesture((name) => gestures.push(name));
  const unsubChange = lib.onChange((c) => changes.push(c.type));

  lib.update([makeHand()], { timestamp: 0 });
  g.setResult(true);
  lib.update([makeHand()], { timestamp: 1 });
  assert.deepEqual(gestures, ['a']);
  assert.deepEqual(changes, ['start']);

  unsubGesture();
  unsubChange();
  g.setResult(false);
  lib.update([makeHand()], { timestamp: 2 });
  g.setResult(true);
  lib.update([makeHand()], { timestamp: 3 });
  assert.deepEqual(gestures, ['a']); // unsubscribed → keine neuen Events
  assert.deepEqual(changes, ['start']);
});

// ── Lifecycle ───────────────────────────────────────────────────────────────

test('GestureLibrary: resetAll beendet aktive Gesten und leert den Zustand', () => {
  const lib = new GestureLibrary({ exclusive: false });
  lib.register(new FakeGesture('a', true));

  const ends = [];
  lib.addEventListener('gestureend', (e) => ends.push(e.detail.gesture));

  lib.update([makeHand()], { timestamp: 0 });
  assert.deepEqual(lib.getActiveGestures(), ['a']);

  lib.resetAll();
  assert.deepEqual(lib.getActiveGestures(), []);
  assert.deepEqual(ends, ['a']);
  assert.equal(lib.getLastResult('a'), undefined);
});

test('GestureLibrary: update ohne Hände entspricht resetAll', () => {
  const lib = new GestureLibrary({ exclusive: false });
  lib.register(new FakeGesture('a', true));

  const ends = [];
  lib.addEventListener('gestureend', (e) => ends.push(e.detail.gesture));

  lib.update([makeHand()], { timestamp: 0 });
  lib.update([], { timestamp: 1 });

  assert.deepEqual(lib.getActiveGestures(), []);
  assert.deepEqual(ends, ['a']);
});

test('GestureLibrary: dispose entfernt alle Gesten', () => {
  const lib = new GestureLibrary();
  lib.register(new FakeGesture('a', false));
  lib.register(new FakeGesture('b', false));
  lib.dispose();
  assert.deepEqual(lib.getRegisteredGestures(), []);
});
