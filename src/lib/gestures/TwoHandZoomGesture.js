import { BaseGesture } from '../BaseGesture.js';
import { LM, distance2D } from '../utils/landmarks.js';

/**
 * TwoHandZoomGesture – „Zoom-out (Fern)": Beide Hände bewegen sich aufeinander zu.
 *
 * Übernommen aus Issue #2 (detectGestures → numHands === 2).
 *
 * Originallogik:
 *   - Distanz zwischen den Handgelenken (LM 0) beider Hände berechnen
 *   - delta = letzteDistanz - aktuelleDistanz
 *   - Wenn delta > 0.01 UND aktuelleDistanz > 0.2 → Zoom-out erkannt
 *   - Mindestabstand > 0.2 umgeht einen bekannten MediaPipe-Bug bei sich
 *     kreuzenden Händen (siehe ADR 0003)
 *
 * Zweihand-Geste: handCount === 2.
 * Die GestureLibrary übergibt ein Array von zwei Landmark-Arrays.
 */
export class TwoHandZoomGesture extends BaseGesture {

  /**
   * @param {object} [options]
   * @param {number} [options.minDelta=0.01] – Mindest-Annäherung pro Frame
   * @param {number} [options.minDistance=0.2] – Mindestabstand beider Hände
   */
  constructor(options = {}) {
    super();
    this._minDelta = options.minDelta ?? 0.01;
    this._minDistance = options.minDistance ?? 0.2;
    this._lastDist = null;
  }

  get name() { return 'two-hand-zoom'; }
  get description() { return 'Beide Hände bewegen sich aufeinander zu – Zoom-out im Fernbereich.'; }

  /** @override – Diese Geste braucht zwei Hände */
  get handCount() { return 2; }

  /**
   * @param {Array[]} allHands – Array von zwei Landmark-Arrays: [hand0, hand1]
   */
  detect(allHands, _meta) {
    const currentDist = distance2D(allHands[0][LM.WRIST], allHands[1][LM.WRIST]);

    let detected = false;
    let delta = 0;

    if (this._lastDist !== null) {
      delta = this._lastDist - currentDist;   // positiv = Hände nähern sich
      detected = delta > this._minDelta && currentDist > this._minDistance;
    }

    this._lastDist = currentDist;

    return {
      detected,
      confidence: detected ? Math.min(1, delta / this._minDelta * 0.5) : 0,
      data: { distance: currentDist, delta },
    };
  }

  reset() {
    this._lastDist = null;
  }
}
