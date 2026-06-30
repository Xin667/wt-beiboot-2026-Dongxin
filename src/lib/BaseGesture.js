/**
 * BaseGesture – Abstrakte Basisklasse für alle Gesten.
 *
 * Jede konkrete Geste erbt von BaseGesture und implementiert:
 *   - name          (string)  eindeutiger Bezeichner
 *   - description   (string)  kurze Beschreibung
 *   - detect(landmarks, meta) → { detected, confidence, data? }
 *
 * Optional überschreibbar:
 *   - handCount     (number)  1 = Einhand (default), 2 = Zweihand
 *   - reset()                 setzt internen Zustand zurück
 *   - dispose()               räumt Ressourcen auf
 */
export class BaseGesture {

  get name() {
    throw new Error(`${this.constructor.name} muss "name" implementieren.`);
  }

  get description() {
    throw new Error(`${this.constructor.name} muss "description" implementieren.`);
  }

  /**
   * Wie viele Hände braucht diese Geste?
   * 1 = Einhand (default), 2 = Zweihand.
   * @type {number}
   */
  get handCount() {
    return 1;
  }

  /**
   * @param {Array} landmarks – Je nach handCount:
   *   handCount=1: 21 MediaPipe-Landmarks [{x,y,z}, ...]
   *   handCount=2: Array von zwei solchen Arrays
   * @param {object} meta – { timestamp, ... }
   * @returns {{ detected: boolean, confidence: number, data?: object }}
   */
  detect(_landmarks, _meta) {
    throw new Error(`${this.constructor.name} muss "detect()" implementieren.`);
  }

  reset() {}
  dispose() {}
}
