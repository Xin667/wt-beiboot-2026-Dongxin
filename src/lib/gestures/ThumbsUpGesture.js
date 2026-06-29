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
 */
export class ThumbsUpGesture extends BaseGesture {

  get name() { return 'thumbs-up'; }
  get description() { return 'Daumen hoch – Start-Geste im Nahbereich.'; }

  detect(hand, _meta) {
    // Daumen gestreckt und höher als Zeigefingerbasis
    const thumbUp = hand[LM.THUMB_TIP].y < hand[LM.INDEX_MCP].y
                  && hand[LM.THUMB_TIP].y < hand[LM.THUMB_IP].y;

    // Alle vier Finger eingeklappt
    const fingersCurled =
      isFingerCurled(hand, LM.INDEX_TIP,  LM.INDEX_MCP)  &&
      isFingerCurled(hand, LM.MIDDLE_TIP, LM.MIDDLE_MCP) &&
      isFingerCurled(hand, LM.RING_TIP,   LM.RING_MCP)   &&
      isFingerCurled(hand, LM.PINKY_TIP,  LM.PINKY_MCP);

    const detected = thumbUp && fingersCurled;

    return {
      detected,
      confidence: detected ? 0.9 : 0,
    };
  }
}
