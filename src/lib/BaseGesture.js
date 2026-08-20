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
 *
 * Stellt mit _stabilize() eine gemeinsame Haltestabilisierung für
 * zeitbasierte Gesten bereit (siehe ADR 0007).
 */
export class BaseGesture {

  constructor() {
    /**
     * Zeitpunkt (ms), seit dem die Geste als Rohsignal durchgehend erkannt
     * wird. Wird ausschließlich von _stabilize() verwaltet.
     * null = aktuell nicht erkannt.
     * @type {number|null}
     */
    this._activeStart = null;
  }

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

  /**
   * Stabilisiert ein rohes Erkennungssignal über eine Mindest-Haltedauer.
   *
   * Zuvor in mehreren Gesten duplizierte Logik (ADR 0007): Ein einzelnes
   * `true` reicht nicht – das Rohsignal muss für `holdMs` durchgehend erkannt
   * werden, bevor `detected` auf `true` kippt. Dadurch werden einzelne
   * Rausch-Frames an der Schwelle unterdrückt (z.B. Landmark-Jitter bei Pinch).
   *
   * @param {boolean} rawDetected – Rohsignal der Geste in diesem Frame
   * @param {number} now – Zeitstempel in ms (z.B. meta.timestamp)
   * @param {number} holdMs – Mindest-Haltedauer in ms
   * @returns {{ detected: boolean, heldMs: number }|null}
   *   null, wenn das Rohsignal nicht erkannt ist (kein Halte-Zustand),
   *   sonst { detected, heldMs } mit der aktuell gehaltenen Dauer.
   */
  _stabilize(rawDetected, now, holdMs) {
    if (rawDetected) {
      if (this._activeStart === null) this._activeStart = now;
      const heldMs = now - this._activeStart;
      return { detected: heldMs >= holdMs, heldMs };
    }

    this._activeStart = null;
    return null;
  }

  reset() {
    this._activeStart = null;
  }
  dispose() {}
}
