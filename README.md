# Von Einzelgesten zur wiederverwendbaren Bibliothek

Die prototypischen Gesten aus Issue #2 wurden in eine eigenständige, erweiterbare Gesture Library überführt. Die Library ist von der Demo-Anwendung getrennt und kann von Dritten genutzt werden, ohne den Quellcode lesen zu müssen.

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

## Lokal starten

```bash
IDE: Go Live auf src/demo/index.html
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

## GestureLibrary

### `new GestureLibrary(options?)`

| Option | Default | Beschreibung |
|---|---|---|
| `exclusive` | `true` | Pro Frame wird nur die ERSTE erkannte Geste gemeldet. Registrierungsreihenfolge = Priorität. Bei `false` werden alle Gesten unabhängig ausgewertet. |

Bei 1 Hand werden nur Einhand-Gesten geprüft, bei 2 Händen nur Zweihand-Gesten.

### `lib.register(gesture)` → `GestureLibrary`

Registriert eine Geste. Chaining möglich. Im exclusive-Modus bestimmt die Reihenfolge die Priorität.

```js
lib.register(new PinchGesture())      // Priorität 1
   .register(new ThumbsUpGesture());  // Priorität 2
```

### `lib.unregister(name)` → `boolean`

Entfernt eine registrierte Geste.

### `lib.update(landmarksArray, meta?)` → `Map`

Hauptmethode. Wertet alle Gesten gegen die aktuellen Landmark-Daten aus. Einmal pro Frame aufrufen.

```js
lib.update(handResults.landmarks, { timestamp: performance.now() });
```

Routing: Einhand-Gesten (`handCount === 1`) bekommen `landmarksArray[0]`, Zweihand-Gesten (`handCount === 2`) bekommen `[hand0, hand1]`.

### `lib.getActiveGestures()` → `string[]`

Namen der aktuell erkannten Gesten.

### `lib.getLastResult(name)` → `object | undefined`

Letztes Erkennungsergebnis einer bestimmten Geste.

### `lib.getRegisteredGestures()` → `string[]`

Namen aller registrierten Gesten.

### `lib.getGesture(name)` → `BaseGesture | undefined`

Gibt die Gesten-Instanz zurück.

### `lib.onGesture(callback)` → `function`

Callback bei jeder erkannten Geste (pro Frame). Gibt Unsubscribe-Funktion zurück.

```js
const unsub = lib.onGesture((name, result) => {
  console.log(name, result.confidence);
});
// Später: unsub();
```

### `lib.onChange(callback)` → `function`

Callback bei Zustandswechsel (Geste startet / endet).

```js
lib.onChange((event) => {
  // event.type: 'start' oder 'end'
  // event.gesture: Name der Geste
  // event.result: Erkennungsergebnis (nur bei 'start')
});
```

### `lib.resetAll()`

Setzt alle Gesten zurück. Aufrufen, wenn keine Hand erkannt wird.

### `lib.dispose()`

Entfernt alle Gesten und Listener.

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
| `name` (getter) | ✅ | Eindeutiger String |
| `description` (getter) | ✅ | Kurze Beschreibung |
| `handCount` (getter) | Optional | `1` (default) oder `2` |
| `detect(landmarks, meta)` | ✅ | Gibt `{detected, confidence, data?}` zurück |
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
├── lib/                              ← Die Library (eigenständig nutzbar)
│   ├── index.js                      ← Haupt-Export
│   ├── GestureLibrary.js             ← Registry & Engine
│   ├── BaseGesture.js                ← Basisklasse / Vertrag
│   ├── gestures/
│   │   ├── ThumbsUpGesture.js        ← Issue #2: Start (Nah)
│   │   ├── ThumbsDownGesture.js      ← Issue #3: Stop (Nah)
│   │   ├── PinchGesture.js           ← Issue #2: Zoom-out (Nah)
│   │   ├── PeaceGesture.js           ← Issue #3: System aufwecken
│   │   ├── OpenHandStableGesture.js  ← Issue #2: Start (Fern)
│   │   └── TwoHandZoomGesture.js     ← Issue #2: Zoom-out (Fern)
│   └── utils/
│       └── landmarks.js              ← Konstanten & Hilfsfunktionen
├── demo/                             ← Demo-Anwendung (getrennt von Library)
│   ├── index.html
│   └── app.js
```

## Akzeptanzkriterien

| Kriterium | Status |
|---|---|
| Gestenlogik in eigenständiger Library, getrennt von Demo | ✅ `src/lib/` vs. `src/demo/` |
| Mind. 4 Gesten (2 aus #2 + 2 neue) implementiert | ✅ 6 Gesten |
| Neue Gesten hinzufügbar ohne bestehenden Code zu ändern | ✅ Siehe „Eigene Geste schreiben" |
| Öffentliche API dokumentiert | ✅ Siehe oben |
| Designentscheidungen in Decision Records | ✅ ADR 0004, ADR 0005 |

## Weitere Dokumentation

- [ADR 0004: Library-Architektur](0004-library-architektur.md) – Registry-Pattern, Analyse bestehender Libraries
- [ADR 0005: Neue Gesten](0005-neue-gesten.md) – Warum Peace und ThumbsDown
- [Zeiterfassung](time-tracking.md)