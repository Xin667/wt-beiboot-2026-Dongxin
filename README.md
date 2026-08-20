# Web Technologies // Body Data PoC

Begleitprojekt zum Modul Web Technologies. Das Projekt wird von Issue zu Issue weiterentwickelt, wobei Fortschritte durch Code Reviews und Präsentationen begleitet werden.

Ziel ist die browserbasierte Erfassung und Verarbeitung von Körperdaten (Hand- und Gesichtsbewegungen) über die Kamera – sowie die Steuerung von Interaktionen durch Gestenerkennung.

## Forschungsfrage

Wie lässt sich Körperdaten-Erkennung (MediaPipe Hands) so als **native Browser-Events** abstrahieren, dass eine beliebige Web-Anwendung Gesten mit einem simplen `addEventListener` nutzen kann – ohne die ML-Rohdaten selbst verarbeiten zu müssen? Vollständiger Kontext: [`PROJECT.md`](PROJECT.md).

## Team
Author: [Dongxin Wang](https://github.com/Xin667)
Reviewer: [Christian Noss](https://github.com/cnoss)

## Voraussetzungen

- **Node.js >= 18.13** – wird nur für die Tests benötigt; die Library selbst hat **null npm-Abhängigkeiten**.
- **Kein Lockfile** – da keine Dependencies installiert werden (bewusste KISS-Entscheidung), existiert kein `package-lock.json`. `npm test` nutzt ausschließlich Node-Bordmittel (`node:test`).

## Start Demo

Keine Installation notwendig. Die Anwendung läuft direkt im Browser.

1. Repository klonen
2. Lokalen Webserver im Projektstamm starten – entweder VS Code "Go Live" auf `src/demo/index.html`, oder headless: `npx serve src` (Demo dann unter `http://localhost:3000/demo/`)
3. Kamerazugriff vom Browser erlauben

> Ein lokaler Webserver ist notwendig, da MediaPipe die Modelldateien per HTTP lädt. Das direkte Öffnen der Datei im Browser funktioniert nicht.

## Präsentations-Demo (Issue #4)

Eigenständige Anwendung, die die Library ausschließlich über ihre öffentliche API nutzt: eine gestengesteuerte Slide-Präsentation (✌️ Peace = Aufwecken, 👍 ThumbsUp = weiter, 👎 ThumbsDown = zurück; Pfeiltasten/„W" als Keyboard-Fallback).

1. `./src/presentation/index.html` mit z.B. VS Code "Go Live" starten
2. Kamerazugriff erlauben

Details und Reflexion: `docs/issue4/`.

## Tests

```bash
npm test        # 38 Unit-Tests (node:test), keine Dependencies nötig
npm run check   # Syntax-Check aller Source-Dateien (node --check)
```

Die Tests decken pro Geste Positiv-, Negativ- und Grenzfälle ab. Der Pinch-Jitter-Test (`test/library-pinch-jitter.test.js`) zählt `gesturestart`-Flanken bei oszillierender Distanz und liefert die Messung vorher/nachher für ADR 0007.

## Deployment (GitHub Pages)

Die Demo wird über GitHub Actions auf GitHub Pages veröffentlicht:

- **Public URL:** `https://xin667.github.io/wt-beiboot-2026-Dongxin/` (Demo unter `/demo/`)
- **Workflow:** `.github/workflows/deploy.yml` – bei Push auf `main` laufen `npm run check` + `npm test`, danach wird `src/` als Pages-Artefakt veröffentlicht (relative `../lib/`-Imports bleiben dadurch intakt).
- **Einmalige Voraussetzung:** in den Repo-Settings **Settings → Pages → Source: GitHub Actions** wählen.

## Video

> ⏳ Platzhalter – Link zur Video-Demo folgt nach dem Upload.

## Einführung in die Library

```js
import {
  GestureLibrary,
  ThumbsUpGesture,
  PinchGesture,
  PeaceGesture,
} from './lib/index.js';

// 1. Library instanziieren (exclusive: Registrierungsreihenfolge = Priorität)
const lib = new GestureLibrary({ exclusive: true });

// 2. Gesten registrieren – Reihenfolge bestimmt Priorität!
lib.register(new ThumbsUpGesture({ holdMs: 250 }));
lib.register(new PinchGesture({ threshold: 0.04 }));
lib.register(new PeaceGesture({ holdMs: 400 }));

// 3. Auf erkannte Gesten reagieren
lib.onGesture((name, result) => {
  console.log(`${name} erkannt`, result.data);
});

// 4. Im MediaPipe-Callback aufrufen
function onResults(handResults) {
  if (handResults.landmarks.length > 0) {
    lib.update(handResults.landmarks, { timestamp: performance.now() });
  } else {
    lib.resetAll();
  }
}
```

## Öffentliche vs. interne API

**Öffentlich** (stabil, dokumentiert, für Nutzer der Library):
- `GestureLibrary` – Instanziierung, `register()`, `unregister()`, `getRegisteredGestures()`, `getGesture()`, `update()`, `getActiveGestures()`, `getLastResult()`, `resetAll()`, `dispose()`
- `GestureLibrary` erbt von `EventTarget` (siehe ADR 0006): `addEventListener()`/`removeEventListener()` mit den Events `gesture`/`gesturestart`/`gestureend` (Details unten). `onGesture()`/`onChange()` bleiben als Convenience-Wrapper erhalten.
- `BaseGesture` – Basisklasse zum Erweitern für eigene Gesten
- Alle eingebauten Gesten (`ThumbsUpGesture`, `PinchGesture`, etc.) – Konstruktor-Optionen
- Utilities aus `utils/landmarks.js` – `LM`, `distance2D`, `isFingerCurled`, `isFingerExtended`

**Intern** (Implementierungsdetails, `_`-Präfix):
- `_gestures`, `_activeStart`, `_emitChanges()` etc.
- `BaseGesture._stabilize()` – gemeinsame Halte-Stabilisierung (ADR 0007)
- Routing-Logik in `update()` (handCount-Weiche, exclusive-Auswertung)
- Zustandsvariablen einzelner Gesten (`_lastWristPos`, `_stableStart`, `_lastDist`)

Eigenschaften und Methoden mit `_`-Präfix können sich ohne Vorwarnung ändern und sollten von außen nicht aufgerufen werden.

---

## GestureLibrary: API-Referenz

### `new GestureLibrary(options?)

Erstellt eine neue Library-Instanz ohne registrierte Gesten.

| Option | Default | Beschreibung |
|---|---|---|
| `exclusive` | `true` | Wenn true: Pro Frame wird nur die ERSTE erkannte Geste gemeldet. Registrierungsreihenfolge = Priorität; wenn false: alle Gesten werden unabhängig ausgewertet. |

Zusätzlich wird automatisch nach Handanzahl getrennt: Bei 1 Hand werden nur Einhand-Gesten geprüft, bei 2 Händen nur Zweihand-Gesten.

### Methode
Folgende Methoden wurden implementiert:
| Methode | Beschreibung |
|---|---|
| `register(gesture)` | Geste registrieren. Reihenfolge = Priorität. Chaining möglich. |
| `unregister(name)` | Geste entfernen (`boolean`). |
| `getRegisteredGestures()` | Namen aller registrierten Gesten (`string[]`). |
| `getGesture(name)` | Registrierte Gesten-Instanz (`BaseGesture\|undefined`). |
| `update(landmarks, meta?)` | Alle Gesten auswerten. `landmarks` = `handResults.landmarks` von MediaPipe. |
| `getActiveGestures()` | Namen der aktuell erkannten Gesten (`string[]`). |
| `getLastResult(name)` | Letztes Ergebnis einer Geste (`{detected, confidence, data}`). |
| `onGesture(callback)` | Convenience-Wrapper um das `'gesture'`-Event. Gibt Unsubscribe-Funktion zurück. |
| `onChange(callback)` | Convenience-Wrapper um `'gesturestart'`/`'gestureend'` (`{type: 'start'\|'end', gesture}`). |
| `resetAll()` | Alle Gesten zurücksetzen (wenn keine Hand erkannt wird). |
| `dispose()` | Alle Gesten entfernen. |

### Events (EventTarget)

`GestureLibrary` erbt von `EventTarget` (seit ADR 0006). Ereignisse lassen sich wie bei jedem nativen DOM-Objekt mit `addEventListener()` abonnieren:

| Event | `detail` | Feuert |
|---|---|---|
| `gesture` | `{gesture: string, result: object}` | jeden Frame bei Erkennung (entspricht `onGesture`) |
| `gesturestart` | `{gesture: string, result: object}` | beim Übergang zu erkannt (entspricht `onChange({type:'start'})`) |
| `gestureend` | `{gesture: string}` | beim Übergang zu nicht mehr erkannt (entspricht `onChange({type:'end'})`) |

```js
lib.addEventListener('gesturestart', (e) => {
  console.log(`${e.detail.gesture} gestartet`, e.detail.result);
});
```

`onGesture()`/`onChange()` bleiben als abwärtskompatible Convenience-Wrapper erhalten (intern implementiert über `addEventListener`).

---

## Eingebaute Gesten

### ThumbsUpGesture

Daumen hoch – Start (Nah). Aus Issue #2.

```js
new ThumbsUpGesture({ holdMs: 250 })
```

| Option | Default | Beschreibung |
|---|---|---|
| `holdMs` | `250` | Mindest-Haltedauer |

Erkennung: Daumenspitze über Zeigefingerbasis (`hand[4].y < hand[5].y`), alle anderen Finger eingeklappt.

### ThumbsDownGesture

Daumen runter – Stop (Nah). Neu in Issue #3.

```js
new ThumbsDownGesture({ holdMs: 250 })
```

| Option | Default | Beschreibung |
|---|---|---|
| `holdMs` | `250` | Mindest-Haltedauer |

Erkennung: Daumenspitze ist der tiefste Punkt der Hand, unter allen anderen Fingerspitzen.

### PinchGesture

Daumen + Zeigefinger zusammen – Zoom-out (Nah). Aus Issue #2.

```js
new PinchGesture({ threshold: 0.04 })
```

| Option | Default | Beschreibung |
|---|---|---|
| `threshold` | `0.04` | Max. Distanz LM4 ↔ LM8 (aus ADR 0003) |
| `holdMs` | `150` | Mindest-Haltedauer unter der Schwelle (ADR 0007) |

### PeaceGesture

V-Geste / Peace-Zeichen – System aufwecken. Neu in Issue #3.

```js
new PeaceGesture({ holdMs: 400 })
```

| Option | Default | Beschreibung |
|---|---|---|
| `holdMs` | `400` | Mindest-Haltedauer |

Erkennung: Zeige- und Mittelfinger gestreckt, Ring- und kleiner Finger eingeklappt.

### OpenHandStableGesture

Hand offen und stabil gehalten – Start (Fern). Aus Issue #2.

```js
new OpenHandStableGesture({ holdMs: 1500, maxMovement: 0.015 })
```

| Option | Default | Beschreibung |
|---|---|---|
| `holdMs` | `1500` | Mindest-Haltedauer |
| `maxMovement` | `0.015` | Max. Handgelenkbewegung pro Frame |

### TwoHandZoomGesture

Beide Hände bewegen sich aufeinander zu – Zoom-out (Fern). Aus Issue #2. `handCount === 2`.

```js
new TwoHandZoomGesture({ minDelta: 0.01, minDistance: 0.2, holdMs: 400 })
```

| Option | Default | Beschreibung |
|---|---|---|
| `minDelta` | `0.01` | Mindest-Annäherung pro Frame |
| `minDistance` | `0.2` | Mindestabstand beider Hände |
| `holdMs` | `400` | Überbrückt einzelne Rausch-Frames |

---

## Eigene Geste schreiben

```js
import { BaseGesture } from './lib/BaseGesture.js';
import { LM, isFingerCurled } from './lib/utils/landmarks.js';

export class FistGesture extends BaseGesture {
  get name() { return 'fist'; }
  get description() { return 'Geballte Faust – Stop im Fernbereich.'; }

  detect(hand, meta) {
    const allCurled =
      isFingerCurled(hand, LM.INDEX_TIP,  LM.INDEX_MCP)  &&
      isFingerCurled(hand, LM.MIDDLE_TIP, LM.MIDDLE_MCP) &&
      isFingerCurled(hand, LM.RING_TIP,   LM.RING_MCP)   &&
      isFingerCurled(hand, LM.PINKY_TIP,  LM.PINKY_MCP)  &&
      isFingerCurled(hand, LM.THUMB_TIP,  LM.THUMB_IP);

    return { detected: allCurled, confidence: allCurled ? 0.85 : 0 };
  }
}

// Registrieren – kein bestehender Code muss geändert werden:
lib.register(new FistGesture());
```

### BaseGesture-Vertrag

| Eigenschaft/Methode | Pflicht | Beschreibung |
|---|---|---|
| `name` (getter) | Ja | Eindeutiger String |
| `description` (getter) | Ja | Kurze Beschreibung |
| `handCount` (getter) | Optional | `1` (default) oder `2` |
| `detect(landmarks, meta)` | Ja | Gibt `{detected, confidence, data?}` zurück |
| `reset()` | Optional | Internen Zustand zurücksetzen |
| `dispose()` | Optional | Ressourcen aufräumen |

### Verfügbare Utilities (`utils/landmarks.js`)

| Export | Beschreibung |
|---|---|
| `LM` | Landmark-Indizes (WRIST, THUMB_TIP, INDEX_TIP, …) |
| `FINGER_TIPS` | `[4, 8, 12, 16, 20]` |
| `FINGER_MCPS` | `[2, 5, 9, 13, 17]` |
| `distance2D(a, b)` | 2D-Distanz (`Math.hypot`) |
| `isFingerCurled(hand, tipIdx, mcpIdx)` | `tip.y > mcp.y` |
| `isFingerExtended(hand, tipIdx, mcpIdx)` | `tip.y < mcp.y` |

---

## Projektstruktur

```
src/
├── lib/                              ← Die Library
│   ├── index.js                      ← Haupt-Export
│   ├── GestureLibrary.js             ← Registry & Engine
│   ├── BaseGesture.js                ← Basisklasse
│   ├── gestures/
│   │   ├── ThumbsUpGesture.js        ← Issue #2: Start (Nah)
│   │   ├── ThumbsDownGesture.js      ← Issue #3: Stop (Nah)
│   │   ├── PinchGesture.js           ← Issue #2: Zoom-out (Nah)
│   │   ├── PeaceGesture.js           ← Issue #3: System aufwecken
│   │   ├── OpenHandStableGesture.js  ← Issue #2: Start (Fern)
│   │   └── TwoHandZoomGesture.js     ← Issue #2: Zoom-out (Fern)
│   └── utils/
│       └── landmarks.js              ← Konstanten & Hilfsfunktionen
├── demo/                             ← Demo-Anwendung
│   ├── index.html
│   └── app.js
├── presentation/                     ← Issue #4: Präsentations-Demo (nur öffentliche API)
│   ├── index.html
│   ├── app.js
│   └── slides.js
```


## Branches

Fünf Issues befinden sich in den fünf Branches (`feature/issue-1` … `feature/issue-5`).

## Decision Records

Die Architekturentscheidungen sind nach Issue dokumentiert in `/docs`

## Process Documentation

Die Process Documentation ist nach Issue dokumentiert in `/docs`

## Notes

Die Library ist von der Demo-Anwendung getrennt und kann von Dritten genutzt werden, ohne den Quellcode lesen zu müssen.