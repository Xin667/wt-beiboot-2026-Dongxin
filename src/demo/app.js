/**
 * Demo-Anwendung für Issue #3.
 *
 * Basiert auf der index.html aus Issue #2, aber die Gestenlogik
 * kommt jetzt aus der Library (src/lib/) statt inline im Script.
 */

// ── Library importieren ─────────────────────────────────────────────────────
import {
  GestureLibrary,
  ThumbsUpGesture,
  PinchGesture,
  OpenHandStableGesture,
  TwoHandZoomGesture,
  PeaceGesture,
  ThumbsDownGesture,
} from '../lib/index.js';

// ── MediaPipe (gleiche Version wie Issue #2) ────────────────────────────────
import {
  FilesetResolver,
  HandLandmarker,
  FaceLandmarker,
} from 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0';

// ── DOM-Elemente ────────────────────────────────────────────────────────────
const video       = document.getElementById('video');
const canvas      = document.getElementById('canvas');
const ctx         = canvas.getContext('2d');
const log         = document.getElementById('log');
const eventLog    = document.getElementById('event-log');
const modeSelect  = document.getElementById('tracking-mode');
const statusText  = document.getElementById('status');
const btnRecord   = document.getElementById('btn-record');
const btnDownload = document.getElementById('btn-download');
const gestureOut  = document.getElementById('gesture-output');
const gestureChips = document.getElementById('gesture-chips');

// ── Gesture Library einrichten ──────────────────────────────────────────────
// exclusive: true → Registrierungsreihenfolge = Priorität.
const lib = new GestureLibrary({ exclusive: true });

// Reihenfolge = Priorität (wie if/else-if in Issue #2)
lib.register(new ThumbsUpGesture({ holdMs: 250 }));
lib.register(new ThumbsDownGesture({ holdMs: 250 }));
lib.register(new PinchGesture({ threshold: 0.04 }));
lib.register(new PeaceGesture({ holdMs: 400 }));
lib.register(new OpenHandStableGesture({ holdMs: 1500, maxMovement: 0.015 }));
lib.register(new TwoHandZoomGesture({ minDelta: 0.01, minDistance: 0.2, holdMs: 400 }));

renderGestureChips();

// Gesten-Events loggen
lib.onChange((event) => {
  const time = new Date().toLocaleTimeString('de-DE');
  const color = event.type === 'start' ? '#0f0' : '#f44';
  const line = `<span style="color:${color}">[${time}] ${event.type.toUpperCase()} ${event.gesture}</span>\n`;
  eventLog.innerHTML = line + eventLog.innerHTML;
  const lines = eventLog.querySelectorAll('span');
  if (lines.length > 40) lines[lines.length - 1].remove();
});

// ── Gesten-Labels ───────────────────────────────────────────────────────────
const GESTURE_LABELS = {
  'thumbs-up':         'Start (Nah)',
  'thumbs-down':       'Stop (Nah)',
  'pinch':             'Zoom-out (Nah)',
  'peace':             'Aufwecken',
  'open-hand-stable':  'Start (Fern)',
  'two-hand-zoom':     'Zoom-out (Fern)',
};

// ── MediaPipe Setup ─────────────────────────────────────────────────────────
statusText.textContent = 'Loading models...';

const vision = await FilesetResolver.forVisionTasks(
  'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm'
);

const handLandmarker = await HandLandmarker.createFromOptions(vision, {
  baseOptions: {
    modelAssetPath:
      'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
    delegate: 'GPU',
  },
  runningMode: 'VIDEO',
  numHands: 2,
});

const faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
  baseOptions: {
    modelAssetPath:
      'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
    delegate: 'GPU',
  },
  runningMode: 'VIDEO',
  numFaces: 1,
});

// ── Kamera ──────────────────────────────────────────────────────────────────
statusText.textContent = 'Starting camera...';
const stream = await navigator.mediaDevices.getUserMedia({ video: true });
video.srcObject = stream;
await video.play();
statusText.textContent = 'Tracking active';

// ── Zeichenkonstanten (aus Issue #2) ────────────────────────────────────────
const keyFaceIndices = [1, 468, 473, 61, 291, 199];
const faceConnections = [[468, 1], [473, 1], [1, 61], [1, 291], [61, 199], [291, 199]];
const handConnections = [
  [0,1],[1,2],[2,3],[3,4], [0,5],[5,6],[6,7],[7,8],
  [5,9],[9,10],[10,11],[11,12], [9,13],[13,14],[14,15],[15,16],
  [13,17],[17,18],[18,19],[19,20], [0,17],
];

// ── Recording (aus Issue #2) ────────────────────────────────────────────────
let isRecording = false;
let recordedSession = [];

btnRecord.addEventListener('click', () => {
  if (!isRecording) {
    isRecording = true;
    recordedSession = [];
    btnRecord.textContent = 'Stop Recording...';
    btnRecord.style.background = '#f00';
    btnDownload.disabled = true;
  } else {
    isRecording = false;
    btnRecord.textContent = 'Start Recording';
    btnRecord.style.background = '#000';
    if (recordedSession.length > 0) btnDownload.disabled = false;
  }
});

btnDownload.addEventListener('click', () => {
  const blob = new Blob([JSON.stringify(recordedSession, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `body_data_export_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
  a.click();
  URL.revokeObjectURL(url);
});

// ── Render-Loop ─────────────────────────────────────────────────────────────
let lastTime = -1;
let frameCounter = 0;

function detect() {
  if (video.currentTime !== lastTime) {
    lastTime = video.currentTime;
    const currentMode = modeSelect.value;
    const now = performance.now();

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(video, 0, 0, 640, 480);

    let currentFrameData = { timestamp: Date.now() };

    // ── Hand-Tracking ──
    if (currentMode === 'hands' || currentMode === 'both') {
      const handResults = handLandmarker.detectForVideo(video, now);

      if (handResults.landmarks.length > 0) {
        handResults.landmarks.forEach((hand, handIndex) => {
          const handednessData = handResults.handednesses[handIndex];
          let category = 'Unknown';
          if (handednessData && handednessData.length > 0) {
            category = handednessData[0].categoryName || handednessData[0].displayName || 'Unknown';
          }
          if (category === 'Left') category = 'Right';
          else if (category === 'Right') category = 'Left';

          const prefix = category === 'Unknown' ? '?' : category.charAt(0).toUpperCase();
          const handKey = `Hand ${handIndex} (${category})`;
          const handPoints = [];

          ctx.strokeStyle = '#00ff00';
          ctx.lineWidth = 2;
          handConnections.forEach(([start, end]) => {
            ctx.beginPath();
            ctx.moveTo(hand[start].x * 640, hand[start].y * 480);
            ctx.lineTo(hand[end].x * 640, hand[end].y * 480);
            ctx.stroke();
          });

          hand.forEach((pt, index) => {
            const px = pt.x * 640;
            const py = pt.y * 480;
            ctx.beginPath();
            ctx.arc(px, py, 4, 0, Math.PI * 2);
            ctx.fillStyle = '#00ff00';
            ctx.fill();
            ctx.font = '12px Arial';
            ctx.fillStyle = '#ffffff';
            ctx.fillText(`${prefix}${index}`, px + 6, py - 6);
            handPoints.push({ id: index, x: pt.x.toFixed(3), y: pt.y.toFixed(3), z: pt.z.toFixed(3) });
          });

          currentFrameData[handKey] = handPoints;
        });

        // Library: Hand-Gesten auswerten
        lib.update(handResults.landmarks, { timestamp: now });
      } else {
        lib.resetAll();
      }
    }

    // ── Face-Tracking (Visualisierung, unverändert aus Issue #2) ──
    if (currentMode === 'face' || currentMode === 'both') {
      const faceResults = faceLandmarker.detectForVideo(video, now);
      if (faceResults.faceLandmarks.length > 0) {
        faceResults.faceLandmarks.forEach((face) => {
          const facePoints = [];
          ctx.strokeStyle = '#0088ff';
          ctx.lineWidth = 2;
          faceConnections.forEach(([startID, endID]) => {
            const startPt = face[startID];
            const endPt = face[endID];
            if (startPt && endPt) {
              ctx.beginPath();
              ctx.moveTo(startPt.x * 640, startPt.y * 480);
              ctx.lineTo(endPt.x * 640, endPt.y * 480);
              ctx.stroke();
            }
          });

          keyFaceIndices.forEach((index) => {
            const pt = face[index];
            const px = pt.x * 640;
            const py = pt.y * 480;
            ctx.beginPath();
            ctx.arc(px, py, 4, 0, Math.PI * 2);
            ctx.fillStyle = '#0088ff';
            ctx.fill();
            ctx.font = '12px Arial';
            ctx.fillStyle = '#ffffff';
            ctx.fillText(`F${index}`, px + 6, py - 6);
            facePoints.push({ id: index, x: pt.x.toFixed(3), y: pt.y.toFixed(3), z: pt.z.toFixed(3) });
          });
          currentFrameData['Face'] = facePoints;
        });
      }
    }

    if (isRecording) recordedSession.push(currentFrameData);

    updateGestureOverlay();
    updateGestureChipHighlights();

    frameCounter++;
    if (frameCounter % 5 === 0) {
      if (Object.keys(currentFrameData).length > 1) {
        log.textContent = JSON.stringify(currentFrameData, null, 2);
      } else {
        log.textContent = 'No detection in current mode...';
      }
    }
  }
  requestAnimationFrame(detect);
}

detect();

// ── UI-Helfer ───────────────────────────────────────────────────────────────

function updateGestureOverlay() {
  const active = lib.getActiveGestures();
  if (active.length === 0) {
    gestureOut.style.display = 'none';
    return;
  }
  const name = active[0];
  gestureOut.innerText = GESTURE_LABELS[name] || name;
  gestureOut.style.display = 'block';
  gestureOut.style.backgroundColor = 'rgba(0, 150, 0, 0.9)';
}

function renderGestureChips() {
  gestureChips.innerHTML = '';
  for (const name of lib.getRegisteredGestures()) {
    const gesture = lib.getGesture(name);
    const chip = document.createElement('span');
    chip.className = 'gesture-chip';
    chip.id = `chip-${name}`;
    chip.textContent = name;
    gestureChips.appendChild(chip);
  }
}

function updateGestureChipHighlights() {
  const active = new Set(lib.getActiveGestures());
  for (const name of lib.getRegisteredGestures()) {
    const chip = document.getElementById(`chip-${name}`);
    if (chip) chip.classList.toggle('active', active.has(name));
  }
}
