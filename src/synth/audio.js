/**
 * SynthEngine – Web-Audio-Engine für die Gesten-Synthesizer-Demo.
 *
 * Synthetisiert alle Klänge (keine Audio-Dateien). Zwei Ebenen:
 *   1. Live-Klänge: Solonoten (ThumbsUp/ThumbsDown), Pad (OpenHandStable)
 *   2. Backing-Track (Peace): 4-Takt-Akkordprogression in A-Moll mit
 *      Bass und Drums, die als Looper endlos weiterläuft – die Musik
 *      spielt also weiter, auch wenn keine Hand mehr im Bild ist.
 *
 * Signalfluss: alle Stimmen → BiquadFilter (Pinch-Cutoff) → Master-Gain
 * (Handabstand) → AudioContext.
 */
export class SynthEngine {

  constructor() {
    // AudioContext im User-Gesture erzeugen (Autoplay-Policy, s. app.js)
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (this.ctx.state === 'suspended') this.ctx.resume();

    this.filter = this.ctx.createBiquadFilter();
    this.filter.type = 'lowpass';
    this.filter.frequency.value = 8000;
    this.filter.Q.value = 0.7;

    this.master = this.ctx.createGain();
    this.master.gain.value = 0.8;

    this.filter.connect(this.master);

    // Analyse-Knoten für die Spektrum-Visualisierung (Signal läuft durch)
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 256;
    this.analyser.smoothingTimeConstant = 0.8;
    this.master.connect(this.analyser);
    this.analyser.connect(this.ctx.destination);

    // Pad-Stimmen (OpenHandStable) laufen in einen eigenen Bus
    this.padGain = this.ctx.createGain();
    this.padGain.gain.value = 0.0001;
    this.padGain.connect(this.filter);
    this._padOscs = [];
    this._padOn = false;

    // Rausch-Buffer für die Hi-Hat (einmalig erzeugen)
    const len = this.ctx.sampleRate;
    this._noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = this._noise.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;

    // Backing-Track-Zustand
    this._trackOn = false;
    this._timer = null;
    this._nextBarTime = 0;
    this._barIndex = 0;
  }

  // ── Grundbaustein: ein gestimmter Ton mit Hüllkurve ────────────────────────

  /**
   * Spielt einen Ton mit kurzer Anschlag- und Abkling-Hüllkurve.
   * @param {number} freq – Frequenz in Hz
   * @param {number} t – Startzeit (Sekunden, Audio-Clock)
   * @param {number} dur – Abklingdauer in Sekunden
   * @param {number} peak – Spitzenlautstärke
   * @param {string} [type='triangle'] – Oszillator-Wellenform
   * @param {number} [attack=0.01] – Anschlagdauer in Sekunden
   */
  _pluck(freq, t, dur, peak, type = 'triangle', attack = 0.01) {
    const osc = this.ctx.createOscillator();
    osc.type = type;
    osc.frequency.value = freq;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + attack);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(g);
    g.connect(this.filter);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  }

  // ── Live-Klänge ─────────────────────────────────────────────────────────────

  /** Solonote (ThumbsUp/ThumbsDown): zwei leicht verstimmte Triangeln. */
  playNote(freq) {
    const t = this.ctx.currentTime;
    for (const cents of [-6, 6]) {
      this._pluck(freq * Math.pow(2, cents / 1200), t, 1.2, 0.22);
    }
  }

  /** Pad einschalten (OpenHandStable): Sägen schwellen über ~2.5 s an. */
  startPad() {
    if (this._padOn) return;
    this._padOn = true;
    const t = this.ctx.currentTime;
    for (const [freq, cents] of [[110, -8], [110, 8], [220, -5], [220, 5]]) {
      const osc = this.ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.value = freq;
      osc.detune.value = cents;
      const g = this.ctx.createGain();
      g.gain.value = 0.25;
      osc.connect(g);
      g.connect(this.padGain);
      osc.start(t);
      this._padOscs.push(osc);
    }
    this.padGain.gain.cancelScheduledValues(t);
    this.padGain.gain.setValueAtTime(this.padGain.gain.value, t);
    this.padGain.gain.linearRampToValueAtTime(0.16, t + 2.5);
  }

  /** Pad ausblenden (OpenHandStable aus). */
  stopPad() {
    if (!this._padOn) return;
    this._padOn = false;
    const t = this.ctx.currentTime;
    this.padGain.gain.cancelScheduledValues(t);
    this.padGain.gain.setValueAtTime(this.padGain.gain.value, t);
    this.padGain.gain.exponentialRampToValueAtTime(0.0001, t + 1.2);
    for (const osc of this._padOscs) osc.stop(t + 1.3);
    this._padOscs = [];
  }

  // ── Backing-Track (Looper) ──────────────────────────────────────────────────

  /**
   * Startet den Backing-Track: eine 4-Takt-Progression (Am–F–C–G) in
   * A-Moll, bestehend aus Akkordtönen, Bass und Drums. Läuft endlos,
   * bis stopTrack() aufgerufen wird.
   */
  startTrack() {
    if (this._trackOn) return;
    this._trackOn = true;
    this._barIndex = 0;
    this._nextBarTime = this.ctx.currentTime + 0.1;
    this._timer = setInterval(() => this._scheduleBars(), 100);
  }

  /** Stoppt den Looper. Bereits geplante Töne klingen natürlich aus. */
  stopTrack() {
    this._trackOn = false;
    clearInterval(this._timer);
    this._timer = null;
  }

  /** Plant alle Takte, die innerhalb des Lookahead-Fensters beginnen. */
  _scheduleBars() {
    const horizon = this.ctx.currentTime + 0.6;
    while (this._trackOn && this._nextBarTime < horizon) {
      this._scheduleBar(this._barIndex, this._nextBarTime);
      this._nextBarTime += BAR_LENGTH;
      this._barIndex = (this._barIndex + 1) % PROGRESSION.length;
    }
  }

  /** Ein Takt: Akkord + Bass auf Schlag 1 und 3 + Drums. */
  _scheduleBar(barIdx, t) {
    const bar = PROGRESSION[barIdx];

    // Akkordtöne als weiche, lange Anschläge (1 Takt)
    for (const freq of bar.tones) {
      this._pluck(freq, t, BAR_LENGTH - 0.2, 0.1, 'triangle', 0.05);
    }

    // Bass auf Schlag 1 und 3 (eckige Welle, kurz)
    this._pluck(bar.bass, t, 0.4, 0.24, 'square', 0.005);
    this._pluck(bar.bass, t + BEAT * 2, 0.4, 0.24, 'square', 0.005);

    // Drums: Kick auf 1 und 3, Hi-Hat auf allen Achteln
    this._kick(t);
    this._kick(t + BEAT * 2);
    for (let e = 0; e < 8; e++) {
      this._hat(t + e * EIGHTH, e % 2 === 0 ? 0.12 : 0.06);
    }
  }

  _kick(t) {
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(120, t);
    osc.frequency.exponentialRampToValueAtTime(45, t + 0.1);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.5, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
    osc.connect(g);
    g.connect(this.filter);
    osc.start(t);
    osc.stop(t + 0.26);
  }

  _hat(t, gain) {
    const src = this.ctx.createBufferSource();
    src.buffer = this._noise;
    const hp = this.ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 6000;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
    src.connect(hp);
    hp.connect(g);
    g.connect(this.filter);
    src.start(t);
    src.stop(t + 0.06);
  }

  // ── Kontinuierliche Steuerung ───────────────────────────────────────────────

  /**
   * Filter-Cutoff setzen (Pinch-Abstand). setTargetAtTime glättet
   * das Landmark-Rauschen, ohne dass die App selbst filtern muss.
   * @param {number} hz
   */
  setFilter(hz) {
    this.filter.frequency.setTargetAtTime(hz, this.ctx.currentTime, 0.05);
  }

  /** Lautstärke setzen (Abstand beider Hände). */
  setVolume(v) {
    this.master.gain.setTargetAtTime(v, this.ctx.currentTime, 0.05);
  }

  dispose() {
    this.stopTrack();
    if (this._padOn) this.stopPad();
    if (this.ctx.state !== 'closed') this.ctx.close();
  }
}

// ── Timing & Progression ──────────────────────────────────────────────────────

const TEMPO = 96;         // BPM
const BEAT = 60 / TEMPO;  // 0.625 s
const BAR_LENGTH = BEAT * 4; // 2.5 s
const EIGHTH = BEAT / 2;  // 0.3125 s

/** Vier Akkorde in A-Moll (Am–F–C–G), tiefe Voicings, Bass eine Oktave tiefer. */
const PROGRESSION = [
  { bass: 55.0,  tones: [110.0, 130.81, 164.81] }, // Am:  A2 C3 E3
  { bass: 43.65, tones: [87.31, 110.0, 130.81] },  // F:   F2 A2 C3
  { bass: 65.41, tones: [130.81, 164.81, 196.0] }, // C:   C3 E3 G3
  { bass: 49.0,  tones: [98.0, 123.47, 146.83] },  // G:   G2 B2 D3
];
