import { BaseGesture } from '../BaseGesture.js';
import { LM, isFingerExtended, isFingerCurled } from '../utils/landmarks.js';

/**
 * PeaceGesture – NEU für Issue #3.
 *
 * Erkennt die V-Geste / Peace-Zeichen: Nur Zeige- und Mittelfinger gestreckt,
 * Rest eingeklappt.
 *
 * Aus der Mapping-Tabelle (Interaktion 9, Fernbereich – „System aufwecken"):
 *   „Peace-Zeichen (V-Geste): Nur Zeige- und Mittelfinger gestreckt,
 *    Rest angewinkelt. Reliabilität: Hoch, bewusste Geste."
 *
 * Algorithmus:
 *   1. Zeigefinger gestreckt: hand[8].y < hand[5].y
 *   2. Mittelfinger gestreckt: hand[12].y < hand[9].y
 *   3. Ringfinger eingeklappt: hand[16].y > hand[13].y
 *   4. Kleiner Finger eingeklappt: hand[20].y > hand[17].y
 *   5. Daumen eingeklappt: hand[4].y > hand[3].y
 *      (oder neutral – Daumen ist bei der V-Geste oft leicht abgespreizt,
 *       deshalb wird die Daumen-Bedingung etwas lockerer geprüft)
 *
 * Stabilisierung: Geste muss holdMs durchgehend erkannt werden.
 */
export class PeaceGesture extends BaseGesture {

  /**
   * @param {object} [options]
   * @param {number} [options.holdMs=400] – Mindest-Haltedauer
   */
  constructor(options = {}) {
    super();
    this._holdMs = options.holdMs ?? 400;
    this._activeStart = null;
  }

  get name() { return 'peace'; }
  get description() { return 'V-Geste / Peace-Zeichen – System aufwecken.'; }

  detect(hand, meta = {}) {
    const now = meta.timestamp ?? performance.now();

    // Zeige- und Mittelfinger gestreckt
    const indexUp  = isFingerExtended(hand, LM.INDEX_TIP,  LM.INDEX_MCP);
    const middleUp = isFingerExtended(hand, LM.MIDDLE_TIP, LM.MIDDLE_MCP);

    // Ring- und kleiner Finger eingeklappt
    const ringDown  = isFingerCurled(hand, LM.RING_TIP,  LM.RING_MCP);
    const pinkyDown = isFingerCurled(hand, LM.PINKY_TIP, LM.PINKY_MCP);

    // Daumen: nicht gestreckt (Tip nicht deutlich über MCP)
    // Lockerer als bei ThumbsUp, da der Daumen bei Peace oft neutral liegt
    const thumbNotUp = hand[LM.THUMB_TIP].y >= hand[LM.THUMB_MCP].y - 0.02;

    const rawDetected = indexUp && middleUp && ringDown && pinkyDown && thumbNotUp;

    // Stabilisierung
    if (rawDetected) {
      if (this._activeStart === null) this._activeStart = now;
      const held = now - this._activeStart;
      const stable = held >= this._holdMs;

      return {
        detected: stable,
        confidence: stable ? 0.9 : Math.min(0.4, held / this._holdMs * 0.4),
        data: { heldMs: held },
      };
    }

    this._activeStart = null;
    return { detected: false, confidence: 0 };
  }

  reset() {
    this._activeStart = null;
  }
}
