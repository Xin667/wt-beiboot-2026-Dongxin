/**
 * landmarks.js – Konstanten und Hilfsfunktionen für MediaPipe Hand-Landmarks.
 *
 * MediaPipe Hands liefert 21 Landmarks pro Hand.
 * Koordinaten: x, y normalisiert auf [0, 1]. y-Achse zeigt NACH UNTEN.
 * z ist relativ zur Handgelenktiefe (negativ = näher zur Kamera).
 */

// ── Landmark-Indizes ──────────────────────────────────────────────────────────

export const LM = Object.freeze({
  WRIST:        0,
  THUMB_CMC:    1,
  THUMB_MCP:    2,
  THUMB_IP:     3,
  THUMB_TIP:    4,
  INDEX_MCP:    5,
  INDEX_PIP:    6,
  INDEX_DIP:    7,
  INDEX_TIP:    8,
  MIDDLE_MCP:   9,
  MIDDLE_PIP:  10,
  MIDDLE_DIP:  11,
  MIDDLE_TIP:  12,
  RING_MCP:    13,
  RING_PIP:    14,
  RING_DIP:    15,
  RING_TIP:    16,
  PINKY_MCP:   17,
  PINKY_PIP:   18,
  PINKY_DIP:   19,
  PINKY_TIP:   20,
});

/** Fingerspitzen-Indizes */
export const FINGER_TIPS = [LM.THUMB_TIP, LM.INDEX_TIP, LM.MIDDLE_TIP, LM.RING_TIP, LM.PINKY_TIP];

/** MCP-Gelenke (Knöchel, Basis jedes Fingers) */
export const FINGER_MCPS = [LM.THUMB_MCP, LM.INDEX_MCP, LM.MIDDLE_MCP, LM.RING_MCP, LM.PINKY_MCP];

// ── Mathematische Helfer ──────────────────────────────────────────────────────

/**
 * 2D-Distanz zwischen zwei Landmarks.
 * Entspricht der getDistance()-Funktion aus Issue #2.
 */
export function distance2D(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/**
 * Prüft, ob ein Finger eingeklappt ist:
 * Fingerspitze (TIP) liegt tiefer (größerer y-Wert) als das MCP-Gelenk.
 *
 * Entspricht der Logik aus Issue #2: z.B. hand[8].y > hand[5].y für Zeigefinger.
 *
 * @param {Array} hand – 21 Landmarks
 * @param {number} tipIndex – Landmark-Index der Fingerspitze
 * @param {number} mcpIndex – Landmark-Index des MCP-Gelenks
 * @returns {boolean}
 */
export function isFingerCurled(hand, tipIndex, mcpIndex) {
  return hand[tipIndex].y > hand[mcpIndex].y;
}

/**
 * Prüft, ob ein Finger gestreckt ist (Gegenteil von curled):
 * Fingerspitze liegt höher (kleinerer y-Wert) als das MCP-Gelenk.
 */
export function isFingerExtended(hand, tipIndex, mcpIndex) {
  return hand[tipIndex].y < hand[mcpIndex].y;
}
