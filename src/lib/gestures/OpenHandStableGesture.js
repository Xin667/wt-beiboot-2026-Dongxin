import { BaseGesture } from '../BaseGesture.js';
import { LM, distance2D, isFingerExtended } from '../utils/landmarks.js';

/**
 * OpenHandStableGesture – „Start (Fern)": Hand offen und stabil gehalten.
 *
 * Übernommen aus Issue #2 (detectGestures → isStable).
 *
 * Originallogik:
 *   - Hand ist offen: Zeige-, Mittel-, Ringfinger gestreckt (tip.y < mcp.y)
 *   - Handgelenk (LM 0) bewegt sich weniger als 0.015 pro Frame
 *   - Zustand muss für > 1500 ms durchgehend gehalten werden
 *
 * Zustandsbehaftet: Speichert die letzte Handgelenkposition und den
 * Zeitpunkt, seit dem die Hand stabil steht.
 */
export class OpenHandStableGesture extends BaseGesture {

  /**
   * @param {object} [options]
   * @param {number} [options.holdMs=1500] – Mindest-Haltedauer
   * @param {number} [options.maxMovement=0.015] – Max. Handgelenkbewegung pro Frame
   */
  constructor(options = {}) {
    super();
    this._holdMs = options.holdMs ?? 1500;
    this._maxMovement = options.maxMovement ?? 0.015;
    this._lastWristPos = null;
    this._stableStart = 0;
  }

  get name() { return 'open-hand-stable'; }
  get description() { return 'Hand offen und stabil gehalten – Start-Geste im Fernbereich.'; }

  detect(hand, meta = {}) {
    const now = meta.timestamp ?? performance.now();
    const wrist = hand[LM.WRIST];

    // Bedingung 1: Hand ist offen (Zeige-, Mittel-, Ringfinger gestreckt)
    const isOpen =
      isFingerExtended(hand, LM.INDEX_TIP,  LM.INDEX_MCP)  &&
      isFingerExtended(hand, LM.MIDDLE_TIP, LM.MIDDLE_MCP) &&
      isFingerExtended(hand, LM.RING_TIP,   LM.RING_MCP);

    // Bedingung 2: Handgelenk bewegt sich kaum
    let isStable = false;
    if (this._lastWristPos) {
      const moveDist = distance2D(wrist, this._lastWristPos);

      if (moveDist < this._maxMovement && isOpen) {
        if (this._stableStart === 0) this._stableStart = now;
        if (now - this._stableStart > this._holdMs) {
          isStable = true;
        }
      } else {
        this._stableStart = 0;
      }
    }

    this._lastWristPos = { x: wrist.x, y: wrist.y };

    const heldMs = this._stableStart > 0 ? now - this._stableStart : 0;

    return {
      detected: isStable,
      confidence: isStable ? 0.85 : Math.min(0.4, heldMs / this._holdMs * 0.4),
      data: { heldMs },
    };
  }

  reset() {
    this._lastWristPos = null;
    this._stableStart = 0;
  }
}
