import { BaseGesture } from '../BaseGesture.js';
import { LM, isFingerCurled } from '../utils/landmarks.js';

/**
 * ThumbsUpGesture – „Start (Nah)": Daumen hoch, alle anderen Finger eingeklappt.
 *
 * Übernommen aus Issue #2 (detectGestures → isThumbsUpGeste).
 *
 * Originallogik:
 *   - hand[4].y < hand[5].y  → Daumenspitze über Zeigefingerbasis
 *   - hand[4].y < hand[3].y  → Daumenspitze über Daumen-IP (Daumen gestreckt)
 *   - Zeige-, Mittel-, Ring-, kleiner Finger jeweils eingeklappt (tip.y > mcp.y)
 *
 * Ergänzung Issue #3: holdMs-Stabilisierung hinzugefügt, um kurzes Aufblitzen
 * bei Übergangsbewegungen zu unterdrücken.
 */
export class ThumbsUpGesture extends BaseGesture {

  /**
   * @param {object} [options]
   * @param {number} [options.holdMs=250] – Mindest-Haltedauer
   */
  constructor(options = {}) {
    super();
    this._holdMs = options.holdMs ?? 250;
    this._activeStart = null;
  }

  get name() { return 'thumbs-up'; }
  get description() { return 'Daumen hoch – Start-Geste im Nahbereich.'; }

  detect(hand, meta = {}) {
    const now = meta.timestamp ?? performance.now();

    // Daumen gestreckt und höher als Zeigefingerbasis
    const thumbUp = hand[LM.THUMB_TIP].y < hand[LM.INDEX_MCP].y
                  && hand[LM.THUMB_TIP].y < hand[LM.THUMB_IP].y;

    // Alle vier Finger eingeklappt
    const fingersCurled =
      isFingerCurled(hand, LM.INDEX_TIP,  LM.INDEX_MCP)  &&
      isFingerCurled(hand, LM.MIDDLE_TIP, LM.MIDDLE_MCP) &&
      isFingerCurled(hand, LM.RING_TIP,   LM.RING_MCP)   &&
      isFingerCurled(hand, LM.PINKY_TIP,  LM.PINKY_MCP);

    const rawDetected = thumbUp && fingersCurled;

    if (rawDetected) {
      if (this._activeStart === null) this._activeStart = now;
      const held = now - this._activeStart;
      return {
        detected: held >= this._holdMs,
        confidence: held >= this._holdMs ? 0.9 : 0.3,
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
