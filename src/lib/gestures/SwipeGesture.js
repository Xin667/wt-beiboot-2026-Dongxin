import { BaseGesture } from '../BaseGesture.js';
import { LM, distance2D } from '../utils/landmarks.js';

/**
 * SwipeGesture – NEU für Issue #3.
 *
 * Erkennt horizontale und vertikale Wischbewegungen der Hand.
 * Deckt „zurück" und „vor" aus der Mapping-Tabelle ab (Interaktion 1 & 2).
 *
 * Mapping-Tabelle (Fernbereich):
 *   zurück: „Arm wischt nach links – x-Koordinate von L0 nimmt ab"
 *   vor:    „Arm wischt nach rechts – x-Koordinate von L0 nimmt zu"
 *
 * Algorithmus (zustandsbehaftet – Positions-History):
 *   1. Handgelenkposition (LM 0) in jedem Frame speichern
 *   2. Netto-Verschiebung über ein Zeitfenster (windowMs) berechnen
 *   3. Wenn |delta.x| oder |delta.y| > threshold → Swipe erkannt
 *   4. Dominante Achse bestimmt die Richtung (left/right/up/down)
 *   5. Nach Erkennung: Geste bleibt displayMs lang „aktiv" (für UI-Feedback),
 *      danach beginnt die cooldownMs-Phase (kein erneuter Swipe)
 *
 * Bekannte Einschränkung:
 *   - Sehr langsame Wischbewegungen bleiben unter dem Schwellenwert
 *   - Richtung ist aus Kameraperspektive (gespiegeltes Video → Mapping
 *     in der Demo-App berücksichtigen)
 */
export class SwipeGesture extends BaseGesture {

  /**
   * @param {object} [options]
   * @param {number} [options.threshold=0.12] – Mindest-Delta auf einer Achse
   * @param {number} [options.windowMs=300] – Zeitfenster für die Messung
   * @param {number} [options.displayMs=500] – Wie lange die Geste nach Erkennung
   *        als „aktiv" gemeldet wird (für sichtbares UI-Feedback)
   * @param {number} [options.cooldownMs=600] – Pause NACH displayMs bis zur
   *        nächsten möglichen Erkennung
   */
  constructor(options = {}) {
    super();
    this._threshold  = options.threshold  ?? 0.12;
    this._windowMs   = options.windowMs   ?? 300;
    this._displayMs  = options.displayMs  ?? 500;
    this._cooldownMs = options.cooldownMs ?? 600;

    /** @type {Array<{x: number, y: number, t: number}>} */
    this._history = [];
    this._lastSwipeTime = 0;
    this._lastSwipeData = null;   // Gespeichertes Ergebnis für die Display-Phase
  }

  get name() { return 'swipe'; }
  get description() { return 'Horizontale/vertikale Wischbewegung – Navigation (zurück/vor/oben/unten).'; }

  detect(hand, meta = {}) {
    const now = meta.timestamp ?? performance.now();
    const elapsed = now - this._lastSwipeTime;

    // ── Phase 1: Display – Geste wurde gerade erkannt, bleibt sichtbar ──
    if (this._lastSwipeData && elapsed < this._displayMs) {
      // Keine History sammeln während Display-Phase
      return {
        detected: true,
        confidence: this._lastSwipeData.confidence,
        data: this._lastSwipeData.data,
      };
    }

    // ── Phase 2: Cooldown – nach Display, vor nächster Erkennung ──
    if (this._lastSwipeData && elapsed < this._displayMs + this._cooldownMs) {
      this._lastSwipeData = null;  // Display-Daten aufräumen
      return { detected: false, confidence: 0, data: { reason: 'cooldown' } };
    }

    // Display-Daten aufräumen falls noch vorhanden
    this._lastSwipeData = null;

    // ── Phase 3: Normale Erkennung ──
    const wrist = hand[LM.WRIST];

    this._history.push({ x: wrist.x, y: wrist.y, t: now });
    if (this._history.length > 30) this._history.shift();

    if (this._history.length < 2) {
      return { detected: false, confidence: 0 };
    }

    const windowStart = now - this._windowMs;
    const startEntry = this._findClosest(windowStart);
    if (!startEntry) {
      return { detected: false, confidence: 0 };
    }

    const dx = wrist.x - startEntry.x;
    const dy = wrist.y - startEntry.y;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);

    if (absDx < this._threshold && absDy < this._threshold) {
      return { detected: false, confidence: 0, data: { dx, dy } };
    }

    // Richtung bestimmen
    let direction;
    if (absDx > absDy) {
      direction = dx > 0 ? 'right' : 'left';
    } else {
      direction = dy > 0 ? 'down' : 'up';
    }

    // Swipe erkannt → Display-Phase starten
    this._lastSwipeTime = now;
    this._history = [];

    const confidence = Math.min(1, Math.max(absDx, absDy) / this._threshold);
    this._lastSwipeData = {
      confidence,
      data: { direction, dx, dy },
    };

    return {
      detected: true,
      confidence,
      data: { direction, dx, dy },
    };
  }

  _findClosest(targetTime) {
    let closest = null;
    let minDiff = Infinity;
    for (const entry of this._history) {
      const diff = Math.abs(entry.t - targetTime);
      if (diff < minDiff) { minDiff = diff; closest = entry; }
    }
    return closest;
  }

  reset() {
    this._history = [];
    // Display-Phase bei reset NICHT abbrechen, damit das UI-Feedback
    // auch bei exclusive-Modus sichtbar bleibt
  }
}
