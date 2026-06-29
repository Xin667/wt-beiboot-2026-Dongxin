import { BaseGesture } from './BaseGesture.js';

/**
 * GestureLibrary – Zentrale Registry und Erkennungs-Engine.
 *
 * Designentscheidung: Registry-Pattern (siehe ADR 0004).
 * Neue Gesten werden per register() hinzugefügt, ohne bestehenden Code zu ändern.
 *
 * Unterstützt Einhand- und Zweihand-Gesten:
 *   - Einhand (handCount === 1): Library testet die Geste gegen jede erkannte Hand
 *   - Zweihand (handCount === 2): Library übergibt beide Hände als Array von Arrays
 *
 * @example
 *   import { GestureLibrary, ThumbsUpGesture, PinchGesture } from './index.js';
 *
 *   const lib = new GestureLibrary();
 *   lib.register(new ThumbsUpGesture());
 *   lib.register(new PinchGesture());
 *
 *   lib.onGesture((name, result) => {
 *     console.log(`Geste erkannt: ${name}`, result);
 *   });
 *
 *   // Im MediaPipe-Callback:
 *   lib.update(results.landmarks, { timestamp: performance.now() });
 */
export class GestureLibrary {

  constructor() {
    /** @type {Map<string, BaseGesture>} */
    this._gestures = new Map();

    /** @type {Map<string, object>} Letztes Ergebnis pro Geste */
    this._lastResults = new Map();

    /** @type {Set<function>} Listener: wird bei JEDER erkannten Geste aufgerufen */
    this._listeners = new Set();

    /** @type {Set<function>} Listener: wird bei Start/Ende einer Geste aufgerufen */
    this._changeListeners = new Set();

    /** @type {Set<string>} Aktuell aktive Gesten */
    this._activeGestures = new Set();
  }

  // ── Registrierung ─────────────────────────────────────────────────────────

  /**
   * Registriert eine neue Geste.
   * @param {BaseGesture} gesture
   * @throws {Error} bei doppeltem Namen oder ungültigem Typ
   * @returns {GestureLibrary} this (für Chaining)
   */
  register(gesture) {
    if (!(gesture instanceof BaseGesture)) {
      throw new Error(`register() erwartet eine BaseGesture-Instanz, erhalten: ${typeof gesture}`);
    }
    if (this._gestures.has(gesture.name)) {
      throw new Error(`Geste "${gesture.name}" ist bereits registriert.`);
    }
    this._gestures.set(gesture.name, gesture);
    return this;
  }

  /**
   * Entfernt eine registrierte Geste.
   * @param {string} name
   * @returns {boolean}
   */
  unregister(name) {
    const gesture = this._gestures.get(name);
    if (!gesture) return false;
    gesture.dispose();
    this._gestures.delete(name);
    this._lastResults.delete(name);
    this._activeGestures.delete(name);
    return true;
  }

  /** @returns {string[]} Namen aller registrierten Gesten */
  getRegisteredGestures() {
    return [...this._gestures.keys()];
  }

  /** @returns {BaseGesture|undefined} */
  getGesture(name) {
    return this._gestures.get(name);
  }

  // ── Erkennung ─────────────────────────────────────────────────────────────

  /**
   * Hauptmethode: Wertet alle registrierten Gesten gegen die aktuellen
   * Landmark-Daten aus. Einmal pro Frame aufrufen.
   *
   * @param {Array[]} landmarksArray – Array von Landmark-Arrays, wie von
   *   MediaPipe geliefert: handResults.landmarks (ein Array pro erkannter Hand).
   *   Kann leer sein (keine Hand erkannt).
   * @param {object} [meta] – { timestamp, frameWidth, frameHeight }
   * @returns {Map<string, object>} Ergebnisse aller Gesten
   */
  update(landmarksArray, meta = {}) {
    // Keine Hände → alles zurücksetzen
    if (!landmarksArray || landmarksArray.length === 0) {
      this._resetAll();
      return new Map();
    }

    const numHands = landmarksArray.length;
    const results = new Map();
    const nowActive = new Set();

    for (const [name, gesture] of this._gestures) {
      try {
        let result;

        if (gesture.handCount === 1) {
          // Einhand-Geste: gegen die erste erkannte Hand testen
          result = gesture.detect(landmarksArray[0], meta);

        } else if (gesture.handCount === 2) {
          if (numHands >= 2) {
            // Zweihand-Geste: beide Hände übergeben
            result = gesture.detect(landmarksArray, meta);
          } else {
            // Nur eine Hand → Zweihand-Geste kann nicht erkannt werden
            gesture.reset();
            result = { detected: false, confidence: 0, data: { reason: 'need-two-hands' } };
          }
        }

        results.set(name, result);
        this._lastResults.set(name, result);

        if (result.detected) {
          nowActive.add(name);
          for (const listener of this._listeners) {
            listener(name, result);
          }
        }
      } catch (err) {
        console.warn(`Fehler in Geste "${name}":`, err);
        results.set(name, { detected: false, confidence: 0, data: { error: err.message } });
      }
    }

    // Change-Events emittieren
    this._emitChanges(nowActive);
    this._activeGestures = nowActive;

    return results;
  }

  /** @returns {string[]} Aktuell aktive Gesten */
  getActiveGestures() {
    return [...this._activeGestures];
  }

  /** @returns {object|undefined} Letztes Ergebnis einer bestimmten Geste */
  getLastResult(name) {
    return this._lastResults.get(name);
  }

  // ── Events ────────────────────────────────────────────────────────────────

  /**
   * Callback bei jeder erkannten Geste (pro Frame).
   * @returns {function} Unsubscribe-Funktion
   */
  onGesture(callback) {
    this._listeners.add(callback);
    return () => this._listeners.delete(callback);
  }

  /**
   * Callback bei Zustandswechsel (Geste startet / endet).
   * @param {function({type: 'start'|'end', gesture: string, result?: object})} callback
   * @returns {function} Unsubscribe-Funktion
   */
  onChange(callback) {
    this._changeListeners.add(callback);
    return () => this._changeListeners.delete(callback);
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  /** Setzt alle Gesten zurück (z.B. wenn keine Hand erkannt wird). */
  resetAll() {
    this._resetAll();
  }

  /** Entfernt alle Gesten und Listener. */
  dispose() {
    for (const g of this._gestures.values()) g.dispose();
    this._gestures.clear();
    this._lastResults.clear();
    this._activeGestures.clear();
    this._listeners.clear();
    this._changeListeners.clear();
  }

  // ── Private ───────────────────────────────────────────────────────────────

  _resetAll() {
    for (const name of this._activeGestures) {
      for (const listener of this._changeListeners) {
        listener({ type: 'end', gesture: name });
      }
    }
    for (const g of this._gestures.values()) g.reset();
    this._activeGestures.clear();
    this._lastResults.clear();
  }

  _emitChanges(nowActive) {
    for (const name of nowActive) {
      if (!this._activeGestures.has(name)) {
        for (const l of this._changeListeners) {
          l({ type: 'start', gesture: name, result: this._lastResults.get(name) });
        }
      }
    }
    for (const name of this._activeGestures) {
      if (!nowActive.has(name)) {
        for (const l of this._changeListeners) {
          l({ type: 'end', gesture: name });
        }
      }
    }
  }
}
