# Web Technologies // Body Data PoC

Begleitprojekt zum Modul Web Technologies. Das Projekt wird von Issue zu Issue weiterentwickelt, wobei Fortschritte durch Code Reviews und Präsentationen begleitet werden.

Ziel ist die browserbasierte Erfassung und Verarbeitung von Körperdaten (Hand- und Gesichtsbewegungen) über die Kamera – sowie die Steuerung von Interaktionen durch Gestenerkennung.

## Team
Author: [Dongxin Wang](https://github.com/Xin667)
Reviewer: [Christian Noss](https://github.com/cnoss)

## Quick Start

Keine Installation notwendig. Die Anwendung läuft direkt im Browser.

1. Repository klonen
2. In `index.html` mit z.B VS Code "Go Live" starten
3. Kamerazugriff von der Browser erlauben

> Ein lokaler Webserver ist notwendig, da MediaPipe die Modelldateien per HTTP lädt. Das direkte Öffnen der Datei im Browser funktioniert nicht.

## Schnellstart

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
- `GestureLibrary` – Instanziierung, `register()`, `update()`, `onGesture()`, `onChange()`, `getActiveGestures()`, `getLastResult()`
- `BaseGesture` – Basisklasse zum Erweitern für eigene Gesten
- Alle eingebauten Gesten (`ThumbsUpGesture`, `PinchGesture`, etc.) – Konstruktor-Optionen
- Utilities aus `utils/landmarks.js` – `LM`, `distance2D`, `isFingerCurled`, `isFingerExtended`

**Intern** (Implementierungsdetails, `_`-Präfix):
- `_gestures`, `_listeners`, `_activeStart`, `_emitChanges()` etc.
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
| `update(landmarks, meta?)` | Alle Gesten auswerten. `landmarks` = `handResults.landmarks` von MediaPipe. |
| `getActiveGestures()` | Namen der aktuell erkannten Gesten (`string[]`). |
| `getLastResult(name)` | Letztes Ergebnis einer Geste (`{detected, confidence, data}`). |
| `onGesture(callback)` | Callback bei jeder erkannten Geste. Gibt Unsubscribe-Funktion zurück. |
| `onChange(callback)` | Callback bei Start/Ende einer Geste (`{type: 'start'\|'end', gesture}`). |
| `resetAll()` | Alle Gesten zurücksetzen (wenn keine Hand erkannt wird). |
| `dispose()` | Alle Gesten und Listener entfernen. |

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
```


## Branches

Drei Issues befinden sich in den drei Branches.

## Decision Records

Die Architekturentscheidungen sind nach Issue dokumentiert in `/docs`

## Process Documentation

Die Process Documentation ist nach Issue dokumentiert in `/docs`

## Notes

Die Library ist von der Demo-Anwendung getrennt und kann von Dritten genutzt werden, ohne den Quellcode lesen zu müssen.