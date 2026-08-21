# API-Referenz: body-gesture-lib

Detaillierte Referenz der Library (`src/lib/`). Einsteiger starten mit dem [README](README.md) – dort gibt es ein kurzes Beispiel und die Anwendungen. Dieses Dokument beschreibt die komplette öffentliche API.

## Inhalt

- [Einführung](#einführung)
- [Öffentliche vs. interne API](#öffentliche-vs-interne-api)
- [GestureLibrary: API-Referenz](#gesturelibrary-api-referenz)
- [Eingebaute Gesten](#eingebaute-gesten)
- [Eigene Geste schreiben](#eigene-geste-schreiben)
- [Links](#links)

## Einführung

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

### `new GestureLibrary(options?)`

Erstellt eine neue Library-Instanz ohne registrierte Gesten.

| Option | Default | Beschreibung |
|---|---|---|
| `exclusive` | `true` | Wenn true: Pro Frame wird nur die ERSTE erkannte Geste gemeldet. Registrierungsreihenfolge = Priorität; wenn false: alle Gesten werden unabhängig ausgewertet. |

Zusätzlich wird automatisch nach Handanzahl getrennt: Bei 1 Hand werden nur Einhand-Gesten geprüft, bei 2 Händen nur Zweihand-Gesten.

### Methoden

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
| `minThumbIndexDistance` | `0.05` | Min. Abstand Daumen ↔ Zeigefingerspitze – verhindert, dass eine langsame Pinch-Bewegung als „offene Hand" erkannt wird |

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

## Links

- [README.md](README.md) – Projektübersicht, Anwendungen, Tests, Deployment
- `docs/issue3/0004-library-architektur.md` – Registry-Pattern (ADR 0004)
- `docs/issue4/0006-eventtarget-api.md` – EventTarget-API (ADR 0006)
- `docs/issue5/0007-pinch-jitter-stabilisierung.md` – Hold-Stabilisierung (ADR 0007)
