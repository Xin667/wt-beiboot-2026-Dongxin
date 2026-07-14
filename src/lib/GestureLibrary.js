import { BaseGesture } from './BaseGesture.js';

/**
 * GestureLibrary – Zentrale Registry und Erkennungs-Engine.
 *
 * Designentscheidung: Registry-Pattern (siehe ADR 0004).
 * Neue Gesten werden per register() hinzugefügt, ohne bestehenden Code zu ändern.
 *
 * Erbt von EventTarget (siehe ADR 0006) und dispatcht native CustomEvents:
 *   - 'gesture'      – bei jeder erkannten Geste (pro Frame)
 *   - 'gesturestart' – beim Übergang zu erkannt
 *   - 'gestureend'   – beim Übergang zu nicht mehr erkannt
 * onGesture()/onChange() bleiben als abwärtskompatible Convenience-Wrapper erhalten.
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
 *   lib.addEventListener('gesturestart', (e) => {
 *     console.log(`Geste erkannt: ${e.detail.gesture}`, e.detail.result);
 *   });
 *
 *   // Im MediaPipe-Callback:
 *   lib.update(results.landmarks, { timestamp: performance.now() });
 */
export class GestureLibrary extends EventTarget {

  /**
   * @param {object} [options]
   * @param {boolean} [options.exclusive=true] – Wenn true, wird pro Frame
   *   nur die ERSTE erkannte Geste gemeldet (Registrierungsreihenfolge = Priorität).
   *   Entspricht der if/else-if-Kette aus Issue #2.
   *   Wenn false, werden alle Gesten unabhängig ausgewertet.
   */
  constructor(options = {}) {
    super();

    /** @type {Map<string, BaseGesture>} */
    this._gestures = new Map();

    /** @type {Map<string, object>} Letztes Ergebnis pro Geste */
    this._lastResults = new Map();

    /** @type {Set<string>} Aktuell aktive Gesten */
    this._activeGestures = new Set();

    this._exclusive = options.exclusive ?? true;
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
   * Verhalten entspricht der Logik aus Issue #2:
   *   - 1 Hand erkannt → nur Einhand-Gesten prüfen
   *   - 2 Hände erkannt → nur Zweihand-Gesten prüfen
   *   - Im exclusive-Modus (default): Registrierungsreihenfolge = Priorität,
   *     erste erkannte Geste gewinnt (wie die if/else-if-Kette in Issue #2)
   *
   * @param {Array[]} landmarksArray – handResults.landmarks von MediaPipe
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

    // Welche handCount-Kategorie ist aktiv?
    // Entspricht dem if (numHands === 1) / else if (numHands === 2) aus Issue #2
    const activeHandCount = numHands >= 2 ? 2 : 1;

    // Wurde in diesem Frame bereits eine Geste erkannt? (für exclusive-Modus)
    let alreadyDetected = false;

    for (const [name, gesture] of this._gestures) {
      try {
        let result;

        if (gesture.handCount !== activeHandCount) {
          // Falsche Kategorie → Geste zurücksetzen und überspringen
          // (z.B. Einhand-Gesten werden bei 2 Händen zurückgesetzt,
          //  wie im Original: lastHand0Pos = null; stableStartTime = 0;)
          gesture.reset();
          result = { detected: false, confidence: 0, data: { reason: 'wrong-hand-count' } };

        } else if (this._exclusive && alreadyDetected) {
          // Exclusive-Modus: eine Geste hat bereits gewonnen → Rest überspringen
          // Zustandsbehaftete Gesten trotzdem zurücksetzen, damit sie nicht
          // "im Hintergrund" weiter zählen
          gesture.reset();
          result = { detected: false, confidence: 0, data: { reason: 'exclusive' } };

        } else if (gesture.handCount === 1) {
          result = gesture.detect(landmarksArray[0], meta);

        } else if (gesture.handCount === 2) {
          result = gesture.detect(landmarksArray, meta);
        }

        results.set(name, result);
        this._lastResults.set(name, result);

        if (result.detected) {
          nowActive.add(name);
          alreadyDetected = true;
          this.dispatchEvent(new CustomEvent('gesture', { detail: { gesture: name, result } }));
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
   * Convenience-Wrapper um das native 'gesture'-Event (siehe addEventListener()).
   * @returns {function} Unsubscribe-Funktion
   */
  onGesture(callback) {
    const handler = (e) => callback(e.detail.gesture, e.detail.result);
    this.addEventListener('gesture', handler);
    return () => this.removeEventListener('gesture', handler);
  }

  /**
   * Callback bei Zustandswechsel (Geste startet / endet).
   * Convenience-Wrapper um die nativen 'gesturestart'/'gestureend'-Events.
   * @param {function({type: 'start'|'end', gesture: string, result?: object})} callback
   * @returns {function} Unsubscribe-Funktion
   */
  onChange(callback) {
    const onStart = (e) => callback({ type: 'start', gesture: e.detail.gesture, result: e.detail.result });
    const onEnd = (e) => callback({ type: 'end', gesture: e.detail.gesture });
    this.addEventListener('gesturestart', onStart);
    this.addEventListener('gestureend', onEnd);
    return () => {
      this.removeEventListener('gesturestart', onStart);
      this.removeEventListener('gestureend', onEnd);
    };
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  /** Setzt alle Gesten zurück (z.B. wenn keine Hand erkannt wird). */
  resetAll() {
    this._resetAll();
  }

  /**
   * Entfernt alle Gesten. EventTarget kennt kein Bulk-Unsubscribe – Abonnenten,
   * die addEventListener() direkt genutzt haben, müssen sich selbst abmelden.
   * Die Unsubscribe-Funktionen von onGesture()/onChange() funktionieren wie gewohnt.
   */
  dispose() {
    for (const g of this._gestures.values()) g.dispose();
    this._gestures.clear();
    this._lastResults.clear();
    this._activeGestures.clear();
  }

  // ── Private ───────────────────────────────────────────────────────────────

  _resetAll() {
    for (const name of this._activeGestures) {
      this.dispatchEvent(new CustomEvent('gestureend', { detail: { gesture: name } }));
    }
    for (const g of this._gestures.values()) g.reset();
    this._activeGestures.clear();
    this._lastResults.clear();
  }

  _emitChanges(nowActive) {
    for (const name of nowActive) {
      if (!this._activeGestures.has(name)) {
        this.dispatchEvent(new CustomEvent('gesturestart', {
          detail: { gesture: name, result: this._lastResults.get(name) },
        }));
      }
    }
    for (const name of this._activeGestures) {
      if (!nowActive.has(name)) {
        this.dispatchEvent(new CustomEvent('gestureend', { detail: { gesture: name } }));
      }
    }
  }
}
