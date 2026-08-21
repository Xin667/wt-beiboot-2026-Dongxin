# Web Technologies // Body Data PoC

![CI](https://github.com/Xin667/wt-beiboot-2026-Dongxin/actions/workflows/deploy.yml/badge.svg)

Begleitprojekt zum Modul Web Technologies. Das Projekt wird von Issue zu Issue weiterentwickelt, wobei Fortschritte durch Code Reviews und Präsentationen begleitet werden.

Ziel ist die browserbasierte Erfassung und Verarbeitung von Körperdaten (Hand- und Gesichtsbewegungen) über die Kamera – sowie die Steuerung von Interaktionen durch Gestenerkennung.

## Forschungsfrage

Wie lässt sich Körperdaten-Erkennung (MediaPipe Hands) so als **native Browser-Events** abstrahieren, dass eine beliebige Web-Anwendung Gesten mit einem simplen `addEventListener` nutzen kann – ohne die ML-Rohdaten selbst verarbeiten zu müssen? Vollständiger Kontext: [`PROJECT.md`](PROJECT.md).

## Team
Author: [Dongxin Wang](https://github.com/Xin667)
Reviewer: [Christian Noss](https://github.com/cnoss)

## Voraussetzungen

- **Node.js >= 18.13**
- **Zur Laufzeit null npm-Abhängigkeiten.** Die Library (`src/lib/`) ist reines ES-Module-JavaScript und läuft direkt im Browser – MediaPipe wird zur Laufzeit aus dem CDN geladen (Version per URL fixiert). `npm install` wird nur für die Entwicklungswerkzeuge (ESLint) benötigt; dadurch existiert ein `package-lock.json`, das die devDependency-Version fixiert.

## Anwendungen im Überblick

Das Repository enthält eine Library (`src/lib/`) und **drei Anwendungen**, die sie nutzen. Die Library ist von den Anwendungen getrennt – siehe [Projektstruktur](#projektstruktur).

| Anwendung | Verzeichnis | Öffentliche URL | Zweck |
|---|---|---|---|
| **Tracking-Demo** | `src/demo/` | […/demo/](https://xin667.github.io/wt-beiboot-2026-Dongxin/demo/) | Rohdaten-Visualisierung, Debug & Recording (Entwicklungs-Werkbank) |
| **Präsentations-App** | `src/presentation/` | […/presentation/](https://xin667.github.io/wt-beiboot-2026-Dongxin/presentation/) | Anwendungsbeispiel 1: gestengesteuerte Slides |
| **Synthesizer-App** | `src/synth/` | […/synth/](https://xin667.github.io/wt-beiboot-2026-Dongxin/synth/) | Anwendungsbeispiel 2: Gesten steuern einen Web-Audio-Synthesizer |

**Einstieg:** Lokal `npx serve src` starten und `http://localhost:3000/` öffnen – die Startseite verlinkt alle drei Anwendungen (online gilt dasselbe: die Startseite liegt unter [https://xin667.github.io/wt-beiboot-2026-Dongxin/](https://xin667.github.io/wt-beiboot-2026-Dongxin/)). Keine Installation nötig; die Anwendungen laufen direkt im Browser.

> Ein lokaler Webserver ist notwendig, da MediaPipe die Modelldateien per HTTP lädt. Das direkte Öffnen der HTML-Dateien im Browser funktioniert nicht.

### Tracking-Demo (`src/demo/`)

Die Entwicklungs-Werkbank: zeigt die rohen Landmark-Daten, das Hand- und Gesichts-Skelett und die erkannten Gesten live.

1. Startseite öffnen (siehe oben) und **Demo** anklicken, oder direkt `./src/demo/index.html` mit VS Code „Go Live" starten
2. Kamerazugriff vom Browser erlauben

**Funktionen:**

- **Mode-Auswahl** (`Hands & Face (Both)` / `Hands Only` / `Face Only`): schaltet zwischen Hand- und Gesichtserkennung um.
- **Recording/Export:** „Start Recording" sammelt die rohen Landmark-Daten pro Frame; „Download JSON" exportiert sie. Die Daten dienten in Issue #2 zum iterativen Kalibrieren der Schwellenwerte (ADR 0003) und bleiben als Debug-/Datenerfassungswerkzeug erhalten.
- **Face-Tracking** ist bewusst reine Visualisierung (Skelett + Daten-Export) und treibt keine Geste an. `PROJECT.md` nennt Gesichtsbewegungen als Teil der Körperdaten, die Gestenerkennung der Library arbeitet aber ausschließlich mit Hand-Landmarks – der Face-Modus zeigt die zusätzlich erfasste Modalität.

### Präsentations-App (`src/presentation/`)

Anwendungsbeispiel 1 – nutzt die Library ausschließlich über ihre öffentliche API: eine gestengesteuerte Slide-Präsentation (✌️ Peace = Aufwecken, 👍 ThumbsUp = weiter, 👎 ThumbsDown = zurück).

1. Startseite öffnen und **Präsentation** anklicken, oder direkt `./src/presentation/index.html` mit VS Code „Go Live" starten
2. Kamerazugriff erlauben

Details und Reflexion: `docs/issue4/`.

### Synthesizer-App (`src/synth/`)

Anwendungsbeispiel 2 – ein Web-Audio-Synthesizer, der ausschließlich über die öffentliche Library-API gesteuert wird. Interaktionsmodell – die Handanzahl ist der Modus-Wechsel:

- **1 Hand im Bild = Instrument:** `peace` = Backing-Track an/aus (A-Moll-Progression Am–F–C–G mit Bass und Drums als Looper), `thumbs-up`/`thumbs-down` = Solo-Töne (Pentatonik), `open-hand-stable` = Pad an/aus.
- **2 Hände im Bild = Mixer:** Handabstand (`two-hand-zoom`) = Lautstärke.

`peace` und `open-hand-stable` sind **Latching-Schalter**: Einmal getriggert läuft der Track/das Pad weiter, auch wenn die Hand das Bild verlässt – so lässt sich Schicht für Schicht eine ganze Musikaufstellung aufbauen. Die kontinuierlichen Parameter (Lautstärke) liest die App pro Frame über `lib.getLastResult(name).data` – der Data-Kanal der Library, neben den Event-Kanälen (`gesturestart`/`gestureend`).

1. Startseite öffnen und **Synthesizer** anklicken, oder direkt `./src/synth/index.html` mit VS Code „Go Live" starten
2. Kamerazugriff erlauben und **Start** klicken (AudioContext wird im Klick erzeugt – Autoplay-Policy)
3. `peace` zeigen, dann über 👍/👎 improvisieren

## Datenschutz

Die Kamera-Bilder werden ausschließlich **lokal im Browser** verarbeitet: MediaPipe läuft als WASM direkt im Browser, die Modelle werden per CDN geladen. Es werden keine Bild- oder Landmark-Daten an Server übertragen oder gespeichert – das Schließen der Seite verwirft alle Daten.

## Library-Nutzung

Die Library ist ein reines ES-Modul-Paket (`src/lib/index.js`). Der komplette Einstieg (inkl. aller Gesten-Optionen, Events und dem Schreiben eigener Gesten) steht in **[API.md](API.md)**. Minimal-Beispiel:

```js
import { GestureLibrary, ThumbsUpGesture, PeaceGesture } from './lib/index.js';

const lib = new GestureLibrary({ exclusive: true });
lib.register(new ThumbsUpGesture({ holdMs: 250 }));
lib.register(new PeaceGesture({ holdMs: 400 }));

lib.addEventListener('gesturestart', (e) => {
  console.log(`${e.detail.gesture} gestartet`);
});

// Im MediaPipe-Callback:
function onResults(handResults) {
  if (handResults.landmarks.length > 0) {
    lib.update(handResults.landmarks, { timestamp: performance.now() });
  } else {
    lib.resetAll();
  }
}
```

## Projektstruktur

```
wt-beiboot-2026-Dongxin/
├── README.md                       ← Projektübersicht & Schnellstart
├── API.md                          ← Komplette Library-Referenz
├── PROJECT.md                      ← Projektkontext & Zielsetzung
├── CONTRIBUTING.md                 ← Guide für Beiträge
├── LICENSE                         ← MIT-Lizenz
├── THIRD_PARTY_LICENSES.md         ← Lizenzen der CDN-Komponenten
├── package.json                    ← Test-/Lint-Skripte (keine Runtime-Dependencies)
├── eslint.config.js                ← ESLint-Konfiguration (Flat Config)
├── .github/workflows/deploy.yml    ← CI (lint/check/test) + GitHub-Pages-Deploy
├── docs/                           ← ADRs & Prozess-Dokumentation (issue1–5)
├── test/                           ← 51 Unit-Tests (node:test)
└── src/                            ← Startseite, Library & Anwendungen
    ├── index.html                  ← Startseite (verlinkt alle Anwendungen)
    ├── lib/                        ← Die Library
    │   ├── index.js                ← Haupt-Export
    │   ├── GestureLibrary.js       ← Registry & Engine
    │   ├── BaseGesture.js          ← Basisklasse
    │   ├── gestures/
    │   │   ├── ThumbsUpGesture.js        ← Issue #2: Start (Nah)
    │   │   ├── ThumbsDownGesture.js      ← Issue #3: Stop (Nah)
    │   │   ├── PinchGesture.js           ← Issue #2: Zoom-out (Nah)
    │   │   ├── PeaceGesture.js           ← Issue #3: System aufwecken
    │   │   ├── OpenHandStableGesture.js  ← Issue #2: Start (Fern)
    │   │   └── TwoHandZoomGesture.js     ← Issue #2: Zoom-out (Fern)
    │   └── utils/
    │       └── landmarks.js        ← Konstanten & Hilfsfunktionen
    ├── demo/                       ← Tracking-Demo (Entwicklungs-Werkbank)
    ├── presentation/               ← Präsentations-App (Issue #4)
    └── synth/                      ← Synthesizer-App (Issue #5)
```

## Tests & Lint

```bash
npm test        # 51 Unit-Tests (node:test)
npm run lint    # ESLint – statische Analyse (keine Style-Regeln, nur echte Fehler)
npm run check   # Syntax-Check aller Source-Dateien (node --check)
```

Die Tests decken pro Geste Positiv-, Negativ- und Grenzfälle ab. Der Pinch-Jitter-Test (`test/library-pinch-jitter.test.js`) zählt `gesturestart`-Flanken bei oszillierender Distanz und liefert die Messung vorher/nachher für ADR 0007.

## Deployment (GitHub Pages)

Die Anwendungen werden über GitHub Actions auf GitHub Pages veröffentlicht:

- **Public URL:** `https://xin667.github.io/wt-beiboot-2026-Dongxin/` (Startseite; Anwendungen unter `/demo/`, `/presentation/`, `/synth/`)
- **Workflow:** `.github/workflows/deploy.yml` – bei Push auf `main` laufen `npm ci` + `npm run lint` + `npm run check` + `npm test` (jeder Schritt ist ein Deploy-Gate), danach wird `src/` als Pages-Artefakt veröffentlicht (relative `../lib/`-Imports bleiben dadurch intakt).
- **Einmalige Voraussetzung:** in den Repo-Settings **Settings → Pages → Source: GitHub Actions** wählen.

## Branches

Fünf Issues befinden sich in den fünf Branches (`feature/issue-1` … `feature/issue-5`).

## Decision Records

Die Architekturentscheidungen sind nach Issue dokumentiert in `/docs`

## Process Documentation

Die Process Documentation ist nach Issue dokumentiert in `/docs`

## Notes

Die Library ist von den Anwendungen getrennt und kann von Dritten genutzt werden, ohne den Quellcode lesen zu müssen.
