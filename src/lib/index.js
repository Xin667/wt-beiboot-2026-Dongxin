/**
 * body-gesture-lib – Browser-basierte Gestenerkennung mit MediaPipe Hands.
 *
 * Erweiterbar über ein Registry-Pattern: eigene Gesten können per
 * register() hinzugefügt werden, ohne bestehenden Code zu ändern.
 *
 * @example
 *   import { GestureLibrary, ThumbsUpGesture, PinchGesture } from './lib/index.js';
 *
 *   const lib = new GestureLibrary();
 *   lib.register(new ThumbsUpGesture());
 *   lib.register(new PinchGesture());
 *
 *   lib.onGesture((name, result) => console.log(name, result));
 *
 *   // Im MediaPipe-Callback:
 *   lib.update(handResults.landmarks, { timestamp: performance.now() });
 *
 * @module body-gesture-lib
 */

// Core
export { GestureLibrary } from './GestureLibrary.js';
export { BaseGesture } from './BaseGesture.js';

// Eingebaute Gesten – Issue #2
export { ThumbsUpGesture } from './gestures/ThumbsUpGesture.js';
export { PinchGesture } from './gestures/PinchGesture.js';
export { OpenHandStableGesture } from './gestures/OpenHandStableGesture.js';
export { TwoHandZoomGesture } from './gestures/TwoHandZoomGesture.js';

// Eingebaute Gesten – Issue #3 (neu)
export { SwipeGesture } from './gestures/SwipeGesture.js';
export { PeaceGesture } from './gestures/PeaceGesture.js';

// Utilities (für eigene Gesten)
export { LM, FINGER_TIPS, FINGER_MCPS } from './utils/landmarks.js';
export { distance2D, isFingerCurled, isFingerExtended } from './utils/landmarks.js';
