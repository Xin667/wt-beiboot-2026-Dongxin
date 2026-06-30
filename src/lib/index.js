/**
 * body-gesture-lib – Browser-basierte Gestenerkennung mit MediaPipe Hands.
 *
 * @module body-gesture-lib
 */

// Core
export { GestureLibrary } from './GestureLibrary.js';
export { BaseGesture } from './BaseGesture.js';

// Hand-Gesten – Issue #2
export { ThumbsUpGesture } from './gestures/ThumbsUpGesture.js';
export { PinchGesture } from './gestures/PinchGesture.js';
export { OpenHandStableGesture } from './gestures/OpenHandStableGesture.js';
export { TwoHandZoomGesture } from './gestures/TwoHandZoomGesture.js';

// Hand-Gesten – Issue #3 (neu)
export { PeaceGesture } from './gestures/PeaceGesture.js';
export { ThumbsDownGesture } from './gestures/ThumbsDownGesture.js';

// Utilities (für eigene Gesten)
export { LM, FINGER_TIPS, FINGER_MCPS } from './utils/landmarks.js';
export { distance2D, isFingerCurled, isFingerExtended } from './utils/landmarks.js';
