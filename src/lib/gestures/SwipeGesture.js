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
 *   5. Nach erkanntem Swipe: Cooldown-Phase (kein erneuter Swipe)
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
   * @param {number} [options.cooldownMs=600] – Pause nach erkanntem Swipe
   */
  constructor(options = {}) {
    super();
    this._threshold  = options.threshold  ?? 0.12;
    this._windowMs   = options.windowMs   ?? 300;
    this._cooldownMs = options.cooldownMs ?? 600;

    /** @type {Array<{x: number, y: number, t: number}>} */
    this._history = [];
    this._lastSwipeTime = 0;
  }

  get name() { return 'swipe'; }
  get description() { return 'Horizontale/vertikale Wischbewegung – Navigation (zurück/vor/oben/unten).'; }

  detect(hand, meta = {}) {
    const now = meta.timestamp ?? performance.now();
    const wrist = hand[LM.WRIST];

    // Position speichern
    this._history.push({ x: wrist.x, y: wrist.y, t: now });

    // History begrenzen (max. 30 Einträge)
    if (this._history.length > 30) this._history.shift();

    // Cooldown prüfen
    if (now - this._lastSwipeTime < this._cooldownMs) {
      return { detected: false, confidence: 0, data: { reason: 'cooldown' } };
    }

    // Brauchen mindestens 2 Einträge
    if (this._history.length < 2) {
      return { detected: false, confidence: 0 };
    }

    // Ältesten Eintrag innerhalb des Zeitfensters finden
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

    // Dominante Achse → Richtung
    let direction;
    if (absDx > absDy) {
      // MediaPipe: x wächst nach rechts im Bild.
      // Bei gespiegeltem Video: x wächst nach links aus Nutzersicht.
      // Richtung hier aus Kameraperspektive (Spiegelung ist Sache der Demo-App).
      direction = dx > 0 ? 'right' : 'left';
    } else {
      direction = dy > 0 ? 'down' : 'up';
    }

    // Swipe erkannt → Cooldown starten, History leeren
    this._lastSwipeTime = now;
    this._history = [];

    return {
      detected: true,
      confidence: Math.min(1, Math.max(absDx, absDy) / this._threshold),
      data: { direction, dx, dy },
    };
  }

  /** Findet den History-Eintrag am nächsten zum Ziel-Timestamp. */
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
    this._lastSwipeTime = 0;
  }
}
