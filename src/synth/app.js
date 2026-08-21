/**
 * Gesten-Synthesizer (Issue 5) – Demo für die Gesture Library.
 *
 * Nutzt ausschließlich die öffentliche API (README.md) – gleiches Muster wie
 * src/presentation/. Kein Zugriff auf src/lib/-Interna.
 *
 * Interaktionsmodell (handCount = Modus-Wechsel, s. GestureLibrary):
 *   - 1 Hand im Bild  = Instrument: peace = Backing-Track an/aus, 👍/👎 =
 *     Solo-Töne (Pentatonik), open-hand-stable = Pad an/aus
 *   - 2 Hände im Bild = Mixer: Handabstand (TwoHandZoom) = Lautstärke
 *
 * peace und open-hand-stable sind Latching-Schalter: Einmal getriggert läuft
 * der Backing-Track bzw. das Pad weiter, auch wenn die Hand nicht mehr im
 * Bild ist – so lässt sich Schicht für Schicht eine Musikaufstellung bauen.
 *
 * Drei App-seitige Stabilisierungen (bewusst nicht in der Library):
 *   - gesturestart-Kooldown unterdrückt Fehlauslösungen beim Gestenwechsel
 *     (Zwischenposen erfüllen kurz eine andere Geste).
 *   - open-hand-stable braucht 1.5 s ruhige, offene Hand (Library-Default),
 *     damit das Pad nicht schon beim Ansetzen einer Bewegung togglet.
 *   - Lautstärke folgt dem Handabstand nur, solange sich die Hände merklich
 *     bewegen (|delta| > Schwelle, in beide Richtungen) – sonst bleibt der
 *     letzte Wert stehen (kein Verstellen durch ruhig im Bild stehende Hände).
 *
 * Die kontinuierlichen Werte (Lautstärke) werden pro Frame über
 * lib.getLastResult(...).data gelesen – der Data-Kanal der Library.
 */

import {
  GestureLibrary,
  ThumbsUpGesture,
  ThumbsDownGesture,
  PeaceGesture,
  OpenHandStableGesture,
  TwoHandZoomGesture,
} from '../lib/index.js';

import {
  FilesetResolver,
  HandLandmarker,
} from 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0';

import { SynthEngine } from './audio.js';

// ── A-Moll-Pentatonik (nur Tonstufen, die gut zusammenklingen) ───────────────
const SCALE = [
  { name: 'A3', freq: 220.0 },
  { name: 'C4', freq: 261.63 },
  { name: 'D4', freq: 293.66 },
  { name: 'E4', freq: 329.63 },
  { name: 'G4', freq: 392.0 },
  { name: 'A4', freq: 440.0 },
  { name: 'C5', freq: 523.25 },
  { name: 'D5', freq: 587.33 },
  { name: 'E5', freq: 659.25 },
  { name: 'G5', freq: 783.99 },
];
let noteIndex = 3; // Start bei E4

const VOLUME_ALPHA = 0.25; // EMA-Glättung der Lautstärke
const VOLUME_DELTA = 0.01; // Mindestbewegung der Hände, ab der die Lautstärke folgt

// Kooldown gegen Fehlauslösung beim Gestenwechsel (Zwischenposen)
const GESTURE_COOLDOWN_MS = 300;

// Hand-Skelett-Verbindungen (MediaPipe, 21 Landmarks)
const HAND_CONNECTIONS = [
  [0, 1], [1, 2], [2, 3], [3, 4], [0, 5], [5, 6], [6, 7], [7, 8],
  [5, 9], [9, 10], [10, 11], [11, 12], [9, 13], [13, 14], [14, 15], [15, 16],
  [13, 17], [17, 18], [18, 19], [19, 20], [0, 17],
];

// ── DOM ──────────────────────────────────────────────────────────────────────
const btnStart   = document.getElementById('btn-start');
const btnStop    = document.getElementById('btn-stop');
const statusEl   = document.getElementById('status');
const badgeEl    = document.getElementById('badge');
const modeEl     = document.getElementById('mode');
const gestureEl  = document.getElementById('last-gesture');
const noteEl     = document.getElementById('note');
const noteBars   = document.getElementById('note-bars');
const volumeEl   = document.getElementById('volume');
const chipTrack  = document.getElementById('chip-track');
const chipPad    = document.getElementById('chip-pad');
const wave       = document.getElementById('wave');
const wctx       = wave.getContext('2d');
const skeleton   = document.getElementById('skeleton');
const sctx       = skeleton.getContext('2d');
const video      = document.getElementById('video');

// ── State ────────────────────────────────────────────────────────────────────
let engine = null;
let lib = null;
let handLandmarker = null;
let stream = null;
let rafId = 0;
let rafViz = 0;
let lastTime = -1;
let lastGestureAt = 0;   // für den gesturestart-Kooldown
let vSmooth = 0.8;       // EMA-geglättete Lautstärke (0..1)
let trackOn = false;     // Latching-Schalter für den Backing-Track
let padOn = false;       // Latching-Schalter für das Pad
let vizData = null;
let lastHand = null;     // letzte Hand-Landmarks (für Skelett-Overlay)

const GESTURE_ICONS = {
  'peace': '✌️',
  'thumbs-up': '👍',
  'thumbs-down': '👎',
  'open-hand-stable': '✋',
  'two-hand-zoom': '🤲',
};

function renderNote() {
  noteEl.textContent = SCALE[noteIndex].name;
  // Pentatonik wiederholt sich jede 5 Stufen – die Balken zeigen die Lage
  // innerhalb der Oktave (fünfte Stufe = leuchtend).
  for (let i = 0; i < noteBars.children.length; i++) {
    noteBars.children[i].classList.toggle('on', i === noteIndex % 5);
  }
}

function setupLibrary() {
  // exclusive: false → alle Gesten werden unabhängig ausgewertet, damit die
  // kontinuierlichen Data-Kanäle (TwoHandZoom) jeden Frame lesbar sind.
  lib = new GestureLibrary({ exclusive: false });
  lib.register(new ThumbsUpGesture({ holdMs: 120 }));
  lib.register(new ThumbsDownGesture({ holdMs: 120 }));
  lib.register(new PeaceGesture({ holdMs: 350 }));
  lib.register(new OpenHandStableGesture({ holdMs: 1500, maxMovement: 0.02 }));
  lib.register(new TwoHandZoomGesture({ minDelta: 0.01, minDistance: 0.2, holdMs: 400 }));

  lib.addEventListener('gesturestart', (e) => {
    // Zwischenposen beim Gestenwechsel lösen kurz fremde Gesten aus –
    // ein Kooldown verhindert, dass daraus hörbare Fehltrigger werden.
    const now = performance.now();
    if (now - lastGestureAt < GESTURE_COOLDOWN_MS) return;
    lastGestureAt = now;

    const name = e.detail.gesture;
    if (!engine) return;

    if (name === 'peace') {
      trackOn = !trackOn;
      if (trackOn) engine.startTrack();
      else engine.stopTrack();
      chipTrack.classList.toggle('active', trackOn);
    } else if (name === 'thumbs-up') {
      noteIndex = Math.min(noteIndex + 1, SCALE.length - 1);
      renderNote();
      engine.playNote(SCALE[noteIndex].freq);
    } else if (name === 'thumbs-down') {
      noteIndex = Math.max(noteIndex - 1, 0);
      renderNote();
      engine.playNote(SCALE[noteIndex].freq);
    } else if (name === 'open-hand-stable') {
      padOn = !padOn;
      if (padOn) engine.startPad();
      else engine.stopPad();
      chipPad.classList.toggle('active', padOn);
    }
  });
}

/**
 * Liest die kontinuierlichen Data-Kanäle aus der Library und mappt sie auf
 * die Lautstärke. Wird nur aktualisiert, wenn die Geste in diesem Frame
 * tatsächlich evaluiert wurde (data.distance vorhanden).
 */
function updateAnalog() {
  // Lautstärke folgt dem Handabstand nur, solange sich die Hände merklich
  // bewegen (in beide Richtungen) – ruhig im Bild stehende Hände verstellen
  // die Lautstärke nicht von allein.
  const zoom = lib.getLastResult('two-hand-zoom');
  if (zoom && typeof zoom.data?.distance === 'number' && Math.abs(zoom.data.delta) > VOLUME_DELTA) {
    const v = Math.max(0, Math.min(1, (zoom.data.distance - 0.15) / 0.6));
    vSmooth += VOLUME_ALPHA * (v - vSmooth);
    engine.setVolume(0.05 + vSmooth * 0.9); // Hände auseinander = lauter
    volumeEl.textContent = `${Math.round(vSmooth * 100)} %`;
  }
}

/** Zeigt die aktuell aktive(n) Geste(n) statt der letzten Auslösung. */
function renderCurrentGesture() {
  const active = lib.getActiveGestures();
  if (active.length === 0) {
    badgeEl.textContent = '✋';
    gestureEl.textContent = '–';
    return;
  }
  const name = active[0];
  badgeEl.textContent = GESTURE_ICONS[name] ?? '✋';
  gestureEl.textContent = name;
}

/** Zeichnet das Hand-Skelett über das (gespiegelte) Kamerabild. */
function drawSkeleton() {
  const w = skeleton.clientWidth || 220;
  const h = skeleton.clientHeight || 130;
  if (skeleton.width !== w) skeleton.width = w;
  if (skeleton.height !== h) skeleton.height = h;
  sctx.clearRect(0, 0, w, h);
  if (!lastHand) return;

  sctx.strokeStyle = '#7ee787';
  sctx.fillStyle = '#7ee787';
  sctx.lineWidth = 1.2;
  sctx.globalAlpha = 0.85;
  for (const [a, b] of HAND_CONNECTIONS) {
    const p1 = lastHand[a];
    const p2 = lastHand[b];
    sctx.beginPath();
    sctx.moveTo((1 - p1.x) * w, p1.y * h); // x gespiegelt, wie das Video
    sctx.lineTo((1 - p2.x) * w, p2.y * h);
    sctx.stroke();
  }
  for (const p of lastHand) {
    sctx.beginPath();
    sctx.arc((1 - p.x) * w, p.y * h, 1.8, 0, Math.PI * 2);
    sctx.fill();
  }
  sctx.globalAlpha = 1;
}

function detect() {
  if (video.currentTime !== lastTime) {
    lastTime = video.currentTime;
    const now = performance.now();
    const handResults = handLandmarker.detectForVideo(video, now);

    if (handResults.landmarks.length > 0) {
      lastHand = handResults.landmarks[0];
      lib.update(handResults.landmarks, { timestamp: now });
      modeEl.textContent = handResults.landmarks.length === 1
        ? '1 Hand – Instrument'
        : '2 Hände – Mixer';
      updateAnalog();
    } else {
      lastHand = null;
      lib.resetAll();
      modeEl.textContent = 'Keine Hand im Bild';
    }
    renderCurrentGesture();
    drawSkeleton();
  }
  rafId = requestAnimationFrame(detect);
}

/** Zeichnet das Frequenzspektrum des Audio-Outputs als Wellenlinie. */
function visualize() {
  if (!engine) return;
  if (!vizData) vizData = new Uint8Array(engine.analyser.frequencyBinCount);
  engine.analyser.getByteFrequencyData(vizData);

  const W = wave.width;
  const H = wave.height;
  wctx.clearRect(0, 0, W, H);
  wctx.beginPath();
  const samples = 48;
  for (let i = 0; i <= samples; i++) {
    const bin = Math.min(vizData.length - 1, Math.floor((i / samples) * vizData.length));
    const y = H - Math.max(1.5, (vizData[bin] / 255) * (H - 4));
    const x = (i / samples) * W;
    if (i === 0) wctx.moveTo(x, y);
    else wctx.lineTo(x, y);
  }
  wctx.strokeStyle = '#7ee787';
  wctx.lineWidth = 1.5;
  wctx.stroke();
  rafViz = requestAnimationFrame(visualize);
}

// ── Start / Stop ─────────────────────────────────────────────────────────────
async function start() {
  engine = new SynthEngine(); // AudioContext im User-Gesture (Autoplay-Policy)
  setupLibrary();
  statusEl.textContent = 'Lade Modelle…';

  const vision = await FilesetResolver.forVisionTasks(
    'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm',
  );
  handLandmarker = await HandLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath:
        'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
      delegate: 'GPU',
    },
    runningMode: 'VIDEO',
    numHands: 2,
  });

  statusEl.textContent = 'Starte Kamera…';
  stream = await navigator.mediaDevices.getUserMedia({ video: true });
  video.srcObject = stream;
  await video.play();

  statusEl.textContent = 'Bereit – zeige eine Geste';
  btnStart.disabled = true;
  btnStop.disabled = false;
  detect();
  visualize();
}

function stop() {
  cancelAnimationFrame(rafId);
  cancelAnimationFrame(rafViz);
  if (stream) stream.getTracks().forEach((t) => t.stop());
  if (engine) {
    engine.dispose();
    engine = null;
  }
  video.srcObject = null;
  lib = null;
  handLandmarker = null;
  stream = null;
  lastTime = -1;
  lastGestureAt = 0;
  vSmooth = 0.8;
  lastHand = null;
  trackOn = false;
  padOn = false;
  chipTrack.classList.remove('active');
  chipPad.classList.remove('active');
  badgeEl.textContent = '✋';
  gestureEl.textContent = '–';
  modeEl.textContent = '–';
  volumeEl.textContent = '80 %';
  for (const bar of noteBars.children) bar.classList.remove('on');
  noteEl.textContent = '–';
  wctx.clearRect(0, 0, wave.width, wave.height);
  drawSkeleton();

  statusEl.textContent = 'Gestoppt';
  btnStart.disabled = false;
  btnStop.disabled = true;
}

btnStart.addEventListener('click', () => {
  start().catch((err) => {
    statusEl.textContent = `Fehler: ${err.message}`;
    btnStart.disabled = false;
  });
});

btnStop.addEventListener('click', stop);
