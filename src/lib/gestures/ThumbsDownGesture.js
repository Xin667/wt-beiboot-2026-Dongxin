import { BaseGesture } from '../BaseGesture.js';
import { LM } from '../utils/landmarks.js';

/**
 * ThumbsDownGesture – NEU für Issue #3.
 *
 * Aus der Mapping-Tabelle (Interaktion 6 – „stop", Nahbereich):
 *   „Daumen runter – y(4) > y(3), Rest geschlossen. Reliabilität: Hoch."
 *
 * Algorithmus:
 *   - Daumenspitze ist der TIEFSTE Punkt der Hand (größter y-Wert)
 *   - Daumenspitze liegt unter allen vier Fingerspitzen
 *   - Daumenspitze liegt unter Daumen-IP (Daumen ist gestreckt nach unten)
 *
 * Hinweis: isFingerCurled() aus landmarks.js kann hier NICHT verwendet werden,
 * weil die Hand bei ThumbsDown invertiert ist und die y-Achsen-Vergleiche
 * (tip.y > mcp.y) dann falsche Ergebnisse liefern. Stattdessen wird geprüft,
 * ob der Daumen der tiefste Punkt ist – das ist richtungsunabhängig.
 */
export class ThumbsDownGesture extends BaseGesture {

  /**
   * @param {object} [options]
   * @param {number} [options.holdMs=250] – Mindest-Haltedauer
   */
  constructor(options = {}) {
    super();
    this._holdMs = options.holdMs ?? 250;
  }

  get name() { return 'thumbs-down'; }
  get description() { return 'Daumen runter – Stop-Geste im Nahbereich.'; }

  detect(hand, meta = {}) {
    const now = meta.timestamp ?? performance.now();

    const thumbTipY = hand[LM.THUMB_TIP].y;

    // Daumen ist gestreckt (Spitze unter IP-Gelenk)
    const thumbExtendedDown = thumbTipY > hand[LM.THUMB_IP].y;

    // Daumen ist der tiefste Punkt: unter allen vier Fingerspitzen
    const thumbIsLowest =
      thumbTipY > hand[LM.INDEX_TIP].y  &&
      thumbTipY > hand[LM.MIDDLE_TIP].y &&
      thumbTipY > hand[LM.RING_TIP].y   &&
      thumbTipY > hand[LM.PINKY_TIP].y;

    const stable = this._stabilize(thumbExtendedDown && thumbIsLowest, now, this._holdMs);
    if (!stable) return { detected: false, confidence: 0 };

    return {
      detected: stable.detected,
      confidence: stable.detected ? 0.9 : 0.3,
      data: { heldMs: stable.heldMs },
    };
  }
}
