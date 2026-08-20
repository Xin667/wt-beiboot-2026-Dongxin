/**
 * Gemeinsame Hilfsfunktionen für die Gesten-Tests.
 *
 * Die Library arbeitet mit den normalisierten MediaPipe-Landmarks:
 * 21 Punkte pro Hand, je { x, y, z } mit x/y in [0, 1] und y-Achse nach unten.
 */

/** Erzeugt ein einzelnes Landmark. */
export function landmark(x = 0, y = 0, z = 0) {
  return { x, y, z };
}

/**
 * Erzeugt eine synthetische Hand mit 21 Landmarks (alle auf 0,0,0)
 * und übersteuert die über `overrides` angegebenen Indizes.
 *
 * @param {Object<number, {x:number,y:number,z:number}>} [overrides]
 * @returns {Array}
 */
export function makeHand(overrides = {}) {
  const hand = Array.from({ length: 21 }, () => landmark());
  for (const [idx, lm] of Object.entries(overrides)) {
    hand[Number(idx)] = lm;
  }
  return hand;
}

/**
 * Zählt die false→true-Übergänge einer Sequenz von `detected`-Werten.
 * Entspricht der Anzahl der 'gesturestart'-Flanken, die die Library
 * aus dieser Sequenz ableiten würde.
 */
export function countTransitions(detectedValues) {
  let count = 0;
  for (let i = 1; i < detectedValues.length; i++) {
    if (!detectedValues[i - 1] && detectedValues[i]) count++;
  }
  return count;
}
