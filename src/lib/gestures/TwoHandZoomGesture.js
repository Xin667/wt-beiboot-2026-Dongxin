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
 * Ergänzung Issue #3: holdMs hinzugefügt. Einmal erkannt, bleibt die Geste
 * für holdMs aktiv. Jeder weitere positive Delta verlängert den Timer.
 * Dadurch bleibt die Geste während einer durchgehenden Zoom-Bewegung stabil,
 * auch wenn einzelne Frames durch MediaPipe-Rauschen kein positives Delta haben.
 *
 * Zweihand-Geste: handCount === 2.
 */
export class TwoHandZoomGesture extends BaseGesture {

  /**
   * @param {object} [options]
   * @param {number} [options.minDelta=0.01] – Mindest-Annäherung pro Frame
   * @param {number} [options.minDistance=0.2] – Mindestabstand beider Hände
   * @param {number} [options.holdMs=400] – Wie lange die Geste nach letztem
   *        positiven Delta aktiv bleibt
   */
  constructor(options = {}) {
    super();
    this._minDelta = options.minDelta ?? 0.01;
    this._minDistance = options.minDistance ?? 0.2;
    this._holdMs = options.holdMs ?? 400;
    this._lastDist = null;
    this._lastPositiveTime = 0;   // Zeitpunkt des letzten positiven Deltas
    this._lastData = null;        // Gespeicherte Daten für die Hold-Phase
  }

  get name() { return 'two-hand-zoom'; }
  get description() { return 'Beide Hände bewegen sich aufeinander zu – Zoom-out im Fernbereich.'; }

  get handCount() { return 2; }

  /**
   * @param {Array[]} allHands – [hand0, hand1]
   */
  detect(allHands, meta = {}) {
    const now = meta.timestamp ?? performance.now();
    const currentDist = distance2D(allHands[0][LM.WRIST], allHands[1][LM.WRIST]);

    let freshDetection = false;
    let delta = 0;

    if (this._lastDist !== null) {
      delta = this._lastDist - currentDist;
      freshDetection = delta > this._minDelta && currentDist > this._minDistance;
    }

    this._lastDist = currentDist;

    if (freshDetection) {
      // Neues positives Delta → Timer verlängern
      this._lastPositiveTime = now;
      this._lastData = { distance: currentDist, delta };
    }

    // Aktiv, solange innerhalb holdMs nach letztem positiven Delta
    const withinHold = (now - this._lastPositiveTime) < this._holdMs;
    const detected = withinHold && this._lastData !== null;

    return {
      detected,
      confidence: detected ? Math.min(1, (this._lastData?.delta ?? 0) / this._minDelta * 0.5) : 0,
      data: detected ? this._lastData : { distance: currentDist, delta },
    };
  }

  reset() {
    this._lastDist = null;
    this._lastPositiveTime = 0;
    this._lastData = null;
  }
}
