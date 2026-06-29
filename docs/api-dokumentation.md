# API-Dokumentation: body-gesture-lib

Browser-basierte Gestenerkennung auf Basis von MediaPipe Hand-Landmarks.
Erweiterbar über ein Registry-Pattern – eigene Gesten können hinzugefügt werden,
ohne bestehenden Code zu ändern.

## Schnellstart

```js
import {
  GestureLibrary,
  ThumbsUpGesture,
  PinchGesture,
  SwipeGesture,
} from './lib/index.js';

// 1. Library instanziieren
const lib = new GestureLibrary();

// 2. Gesten registrieren (mit optionalen Parametern)
lib.register(new ThumbsUpGesture());
lib.register(new PinchGesture({ threshold: 0.04 }));
lib.register(new SwipeGesture({ threshold: 0.12, cooldownMs: 600 }));

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

---

## GestureLibrary

### `new GestureLibrary()`

Erstellt eine neue Library-Instanz ohne registrierte Gesten.

### `lib.register(gesture)` → `GestureLibrary`

Registriert eine Geste. Chaining möglich.

```js
lib.register(new ThumbsUpGesture())
   .register(new PinchGesture());
```

### `lib.unregister(name)` → `boolean`

Entfernt eine registrierte Geste.

### `lib.update(landmarksArray, meta?)` → `Map`

**Hauptmethode.** Wertet alle Gesten gegen die aktuellen Landmark-Daten aus.

```js
// landmarksArray: direkt von MediaPipe (handResults.landmarks)
// = Array von Landmark-Arrays, ein Array pro erkannter Hand
lib.update(handResults.landmarks, { timestamp: performance.now() });
```

Die Library routet automatisch:
- **Einhand-Gesten** (`handCount === 1`): bekommen `landmarksArray[0]`
- **Zweihand-Gesten** (`handCount === 2`): bekommen `[hand0, hand1]` als Array von Arrays

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

### ThumbsUpGesture (Issue #2)

Daumen hoch – Start-Geste im Nahbereich.

```js
new ThumbsUpGesture()
```

| Erkennung | Originalwert aus Issue #2 |
|---|---|
| Daumenspitze über Zeigefingerbasis | `hand[4].y < hand[5].y` |
| Daumenspitze über Daumen-IP | `hand[4].y < hand[3].y` |
| Alle anderen Finger eingeklappt | `tip.y > mcp.y` |

Keine konfigurierbaren Parameter (Schwellenwerte sind absolute Koordinatenvergleiche).

### PinchGesture (Issue #2)

Daumen + Zeigefinger zusammen – Zoom-out im Nahbereich.

```js
new PinchGesture({ threshold: 0.04 })
```

| Option | Default | Beschreibung |
|---|---|---|
| `threshold` | `0.04` | Max. Distanz LM4 ↔ LM8 (aus ADR 0003) |

**data:** `{ distance: number }`

### OpenHandStableGesture (Issue #2)

Hand offen und stabil gehalten – Start-Geste im Fernbereich.

```js
new OpenHandStableGesture({ holdMs: 1500, maxMovement: 0.015 })
```

| Option | Default | Beschreibung |
|---|---|---|
| `holdMs` | `1500` | Mindest-Haltedauer (aus ADR 0003) |
| `maxMovement` | `0.015` | Max. Handgelenkbewegung pro Frame (aus ADR 0003) |

**data:** `{ heldMs: number }`

### TwoHandZoomGesture (Issue #2)

Beide Hände bewegen sich aufeinander zu – Zoom-out im Fernbereich.

```js
new TwoHandZoomGesture({ minDelta: 0.01, minDistance: 0.2 })
```

| Option | Default | Beschreibung |
|---|---|---|
| `minDelta` | `0.01` | Mindest-Annäherung pro Frame (aus ADR 0003) |
| `minDistance` | `0.2` | Mindestabstand beider Hände (MediaPipe-Bug-Workaround) |

**data:** `{ distance: number, delta: number }`

**Hinweis:** `handCount === 2` – wird nur ausgewertet, wenn zwei Hände erkannt werden.

### SwipeGesture (Issue #3 – neu)

Wischbewegung – Navigation (zurück / vor / oben / unten).

```js
new SwipeGesture({ threshold: 0.12, windowMs: 300, cooldownMs: 600 })
```

| Option | Default | Beschreibung |
|---|---|---|
| `threshold` | `0.12` | Mindest-Verschiebung auf einer Achse |
| `windowMs` | `300` | Zeitfenster für die Bewegungsmessung |
| `cooldownMs` | `600` | Pause nach erkanntem Swipe |

**data:** `{ direction: 'left'|'right'|'up'|'down', dx: number, dy: number }`

### PeaceGesture (Issue #3 – neu)

V-Geste / Peace-Zeichen – System aufwecken.

```js
new PeaceGesture({ holdMs: 400 })
```

| Option | Default | Beschreibung |
|---|---|---|
| `holdMs` | `400` | Mindest-Haltedauer |

**data:** `{ heldMs: number }`

---

## Eigene Geste schreiben

```js
import { BaseGesture } from './lib/BaseGesture.js';
import { LM, distance2D, isFingerCurled } from './lib/utils/landmarks.js';

export class FistGesture extends BaseGesture {
  get name() { return 'fist'; }
  get description() { return 'Geballte Faust – Stop im Fernbereich.'; }

  detect(hand, meta) {
    // Alle fünf Fingerspitzen nah am Handgelenk
    const allCurled =
      isFingerCurled(hand, LM.INDEX_TIP,  LM.INDEX_MCP)  &&
      isFingerCurled(hand, LM.MIDDLE_TIP, LM.MIDDLE_MCP) &&
      isFingerCurled(hand, LM.RING_TIP,   LM.RING_MCP)   &&
      isFingerCurled(hand, LM.PINKY_TIP,  LM.PINKY_MCP)  &&
      isFingerCurled(hand, LM.THUMB_TIP,  LM.THUMB_IP);

    return {
      detected: allCurled,
      confidence: allCurled ? 0.85 : 0,
    };
  }
}

// Registrieren:
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

### Verfügbare Utilities (`./lib/utils/landmarks.js`)

| Export | Beschreibung |
|---|---|
| `LM` | Landmark-Indizes (WRIST, THUMB_TIP, INDEX_TIP, …) |
| `FINGER_TIPS` | `[4, 8, 12, 16, 20]` |
| `FINGER_MCPS` | `[2, 5, 9, 13, 17]` |
| `distance2D(a, b)` | 2D-Distanz (= `Math.hypot`, wie `getDistance()` aus Issue #2) |
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
│   │   ├── PinchGesture.js           ← Issue #2: Zoom-out (Nah)
│   │   ├── OpenHandStableGesture.js  ← Issue #2: Start (Fern)
│   │   ├── TwoHandZoomGesture.js     ← Issue #2: Zoom-out (Fern)
│   │   ├── SwipeGesture.js           ← Issue #3: zurück/vor
│   │   └── PeaceGesture.js           ← Issue #3: System aufwecken
│   └── utils/
│       └── landmarks.js              ← Konstanten & Hilfsfunktionen
├── demo/                             ← Demo-Anwendung (getrennt von Library)
│   ├── index.html
│   └── app.js
```

## Lokal starten

```bash
cd src
python3 -m http.server 8080
# → http://localhost:8080/demo/
```

Oder mit einem beliebigen HTTP-Server, der ES-Module unterstützt.
