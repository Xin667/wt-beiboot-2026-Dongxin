/**
 * BaseGesture – Abstrakte Basisklasse für alle Gesten.
 *
 * Jede konkrete Geste erbt von BaseGesture und implementiert:
 *   - name          (string)  eindeutiger Bezeichner
 *   - description   (string)  kurze Beschreibung
 *   - detect(landmarks, meta) → { detected, confidence, data? }
 *
 * Optional überschreibbar:
 *   - handCount     (number)  1 = Einhand-Geste (default), 2 = braucht zwei Hände
 *   - reset()                 setzt internen Zustand zurück
 *   - dispose()               räumt Ressourcen auf
 *
 * Für Einhand-Gesten (handCount === 1):
 *   detect() erhält ein Array von 21 Landmarks für EINE Hand.
 *
 * Für Zweihand-Gesten (handCount === 2):
 *   detect() erhält ein Array von zwei Landmark-Arrays: [[21 Punkte], [21 Punkte]].
 */
export class BaseGesture {

  /** @type {string} */
  get name() {
    throw new Error(`${this.constructor.name} muss "name" implementieren.`);
  }

  /** @type {string} */
  get description() {
    throw new Error(`${this.constructor.name} muss "description" implementieren.`);
  }

  /**
   * Wie viele Hände braucht diese Geste?
   * 1 = Einhand (default), 2 = Zweihand.
   * Die GestureLibrary routet anhand dieses Werts automatisch.
   * @type {number}
   */
  get handCount() {
    return 1;
  }

  /**
   * @param {Array} landmarks – Je nach handCount:
   *   handCount=1: Array von 21 MediaPipe-Landmarks [{x,y,z}, ...]
   *   handCount=2: Array von zwei solchen Arrays [[...], [...]]
   * @param {object} meta – { handedness, timestamp, frameWidth, frameHeight }
   * @returns {{ detected: boolean, confidence: number, data?: object }}
   */
  detect(_landmarks, _meta) {
    throw new Error(`${this.constructor.name} muss "detect()" implementieren.`);
  }

  reset() {}
  dispose() {}
}
