import { BaseGesture } from '../BaseGesture.js';
import { LM, distance2D } from '../utils/landmarks.js';

/**
 * PinchGesture – „Zoom-out (Nah)": Daumen und Zeigefinger zusammengeführt.
 *
 * Übernommen aus Issue #2 (detectGestures → isPinch).
 *
 * Originallogik:
 *   - pinchDist = getDistance(hand[4], hand[8])
 *   - isPinch = pinchDist < 0.04
 *
 * Der Schwellenwert 0.04 wurde in Issue #2 durch iteratives Testen ermittelt
 * (siehe ADR 0003). Er ist auf die normalisierten MediaPipe-Koordinaten bezogen.
 *
 * Ergänzung Issue #5 (ADR 0007): holdMs-Stabilisierung über BaseGesture.
 * Vorher wurde Pinch rein über den Einzel-Frame-Vergleich erkannt – lag die
 * Distanz durch Landmark-Jitter nahe der Schwelle, kippte der Vergleich ständig
 * und erzeugte wiederholte START/END-Paare (siehe docs/issue4/friction-notes.md).
 */
export class PinchGesture extends BaseGesture {

  /**
   * @param {object} [options]
   * @param {number} [options.threshold=0.04] – Max. Distanz für Pinch-Erkennung
   * @param {number} [options.holdMs=150] – Mindest-Haltedauer unter der Schwelle
   */
  constructor(options = {}) {
    super();
    this._threshold = options.threshold ?? 0.04;
    this._holdMs = options.holdMs ?? 150;
  }

  get name() { return 'pinch'; }
  get description() { return 'Daumen und Zeigefinger zusammen – Zoom-out im Nahbereich.'; }

  detect(hand, meta = {}) {
    const now = meta.timestamp ?? performance.now();
    const dist = distance2D(hand[LM.THUMB_TIP], hand[LM.INDEX_TIP]);

    const stable = this._stabilize(dist < this._threshold, now, this._holdMs);
    const detected = !!stable && stable.detected;

    return {
      detected,
      confidence: detected ? Math.max(0.6, 1 - dist / this._threshold) : 0,
      data: { distance: dist, heldMs: stable ? stable.heldMs : 0 },
    };
  }
}
