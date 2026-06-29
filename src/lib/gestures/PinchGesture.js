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
 */
export class PinchGesture extends BaseGesture {

  /**
   * @param {object} [options]
   * @param {number} [options.threshold=0.04] – Max. Distanz für Pinch-Erkennung
   */
  constructor(options = {}) {
    super();
    this._threshold = options.threshold ?? 0.04;
  }

  get name() { return 'pinch'; }
  get description() { return 'Daumen und Zeigefinger zusammen – Zoom-out im Nahbereich.'; }

  detect(hand, _meta) {
    const dist = distance2D(hand[LM.THUMB_TIP], hand[LM.INDEX_TIP]);
    const detected = dist < this._threshold;

    return {
      detected,
      confidence: detected ? Math.max(0.6, 1 - dist / this._threshold) : 0,
      data: { distance: dist },
    };
  }
}
