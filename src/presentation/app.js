/**
 * Präsentations-Demo für Issue #4.
 *
 * Nutzt AUSSCHLIESSLICH die öffentliche API der Gesture Library (README.md),
 * keinerlei Zugriff auf src/lib/-Interna.
 *
 * Gesten-Anbindung über lib.addEventListener('gesturestart', ...) – natives
 * EventTarget-Event, seit der Library-Änderung in ADR 0006. Verhält sich
 * strukturell identisch zum Keyboard-Fallback unten (window.addEventListener).
 */

import {
  GestureLibrary,
  ThumbsUpGesture,
  ThumbsDownGesture,
  PeaceGesture,
} from '../lib/index.js';

import {
  FilesetResolver,
  HandLandmarker,
} from 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0';

import { slides } from './slides.js';

// ── DOM-Elemente ────────────────────────────────────────────────────────────
const idleOverlay   = document.getElementById('idle-overlay');
const slideContainer = document.getElementById('slide-container');
const slideTitle     = document.getElementById('slide-title');
const slideBody      = document.getElementById('slide-body');
const slideCounter   = document.getElementById('slide-counter');
const statusEl       = document.getElementById('status');
const video          = document.getElementById('video-preview');

// ── App-State (lebt in der App, nicht in der Library) ───────────────────────
let appState = 'idle'; // 'idle' | 'active'
let currentSlide = 0;
let lastGesture = '(keine)';

function render() {
  idleOverlay.style.display = appState === 'idle' ? 'flex' : 'none';
  slideContainer.style.display = appState === 'active' ? 'block' : 'none';
  slideCounter.style.display = appState === 'active' ? 'block' : 'none';

  if (appState === 'active') {
    const slide = slides[currentSlide];
    slideTitle.textContent = slide.title;
    slideBody.textContent = slide.body;
    slideCounter.textContent = `${currentSlide + 1} / ${slides.length}`;
  }

  statusEl.textContent = `state: ${appState}\nletzte Geste: ${lastGesture}`;
}

function wake() {
  appState = 'active';
  currentSlide = 0;
}

function goTo(index) {
  currentSlide = Math.max(0, Math.min(slides.length - 1, index));
}

function applyGesture(gestureName) {
  lastGesture = gestureName;

  if (gestureName === 'peace' && appState === 'idle') {
    wake();
  } else if (appState === 'active') {
    if (gestureName === 'thumbs-up') goTo(currentSlide + 1);
    if (gestureName === 'thumbs-down') goTo(currentSlide - 1);
  }

  render();
}

render();

// ── Gesture Library einrichten (nur README-dokumentierte API) ───────────────
const lib = new GestureLibrary({ exclusive: true });
lib.register(new ThumbsUpGesture({ holdMs: 250 }));
lib.register(new ThumbsDownGesture({ holdMs: 250 }));
lib.register(new PeaceGesture({ holdMs: 400 }));

// 'gesturestart' feuert nur bei Start (edge-triggered) – dadurch löst ein
// gehaltenes ThumbsUp nicht bei jedem Frame erneut "weiter" aus.
lib.addEventListener('gesturestart', (e) => applyGesture(e.detail.gesture));

// ── Keyboard-Fallback (zum Testen ohne Kamera) ──────────────────────────────
// Strukturell identisch zu lib.addEventListener() oben – beides EventTarget.
window.addEventListener('keydown', (e) => {
  if (e.key === 'w' || e.key === 'W') applyGesture('peace');
  if (e.key === 'ArrowRight') applyGesture('thumbs-up');
  if (e.key === 'ArrowLeft') applyGesture('thumbs-down');
});

// ── MediaPipe Setup ──────────────────────────────────────────────────────────
statusEl.textContent = 'Lade Modelle...';

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

// ── Kamera ───────────────────────────────────────────────────────────────────
statusEl.textContent = 'Starte Kamera...';
const stream = await navigator.mediaDevices.getUserMedia({ video: true });
video.srcObject = stream;
await video.play();
render();

// ── Render-Loop ──────────────────────────────────────────────────────────────
let lastTime = -1;

function detect() {
  if (video.currentTime !== lastTime) {
    lastTime = video.currentTime;
    const now = performance.now();
    const handResults = handLandmarker.detectForVideo(video, now);

    if (handResults.landmarks.length > 0) {
      lib.update(handResults.landmarks, { timestamp: now });
    } else {
      lib.resetAll();
    }
  }
  requestAnimationFrame(detect);
}

detect();
