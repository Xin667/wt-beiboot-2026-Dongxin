# ADR 0007: Pinch-Jitter durch gemeinsame holdMs-Stabilisierung beheben (Weg B)

**Date:** 2026-08-20
**Author:** Dongxin Wang
**Status:** Accepted

## Kurzfassung

- **Problem:** Die Geste `pinch` flackerte bei gehaltener Hand (mehrere `START`/`END`-Events pro Sekunde).
- **Ursache:** Nur `PinchGesture` wertete das Rohsignal Frame für Frame aus – ohne Haltedauer. Die anderen Gesten hatten bereits eine Halte-Stabilisierung (`holdMs`), deren Code dreimal dupliziert war.
- **Lösung (Weg B):** Die duplizierte Logik ist als gemeinsame Methode `_stabilize()` in `BaseGesture` gebündelt. `PinchGesture` nutzt sie jetzt auch (Default `holdMs = 150`).
- **Messung:** Der Jitter-Test zählt `gesturestart`-Flanken: bei Rauschen **4 → 0**, beim Halten **2 → 1**. Die anderen Gesten bleiben unverändert (52 Tests grün).

## Context and Problem Statement

Beim Regressionstest der Issue-#4-Änderung flackerte die `PinchGesture` (vollständiges Log: `docs/issue4/friction-notes.md`, Abschnitt 2026-07-14). Bei durchgehend gehaltener Pinch-Geste erschienen im Event-Log mehrere `START`/`END`-Paare pro Sekunde:

```
[17:14:09] START pinch
[17:14:09] END pinch
[17:14:09] START pinch
...
```

Die vermutete Ursache stand schon in `friction-notes.md`: Der Schwellenwert (`threshold: 0.04`, Distanz LM4↔LM8) hat keine Hysterese. Liegt die tatsächliche Distanz nahe 0.04, kippt der Vergleich `dist < threshold` durch Landmark-Jitter frame-weise. Jeder Kipp erzeugt ein neues START/END-Paar.

Die Code-Analyse bestätigt das und präzisiert es:

- Drei Gesten (`ThumbsUpGesture`, `ThumbsDownGesture`, `PeaceGesture`) stabilisieren ihr Rohsignal bereits über einen holdMs-Timer. Die Logik (`_activeStart`-Sentinel, Halte-Dauer, `held >= holdMs`) war dabei **wortgleich dupliziert**.
  - *Sentinel:* ein Markierungswert (`null`), der anzeigt: „noch kein Halten aktiv".
- Zwei Gesten (`OpenHandStableGesture`, `TwoHandZoomGesture`) haben eigene, **andersartige** Halte-Semantik: Stabilitäts-gated bzw. Latching.
  - *Stabilitäts-gated:* die Haltezeit läuft nur, wenn zusätzlich die Hand stabil steht.
  - *Latching:* einmal erkannt, bleibt die Geste eine Weile aktiv (wie ein Schalter).
- **Einzig `PinchGesture` wertet nur einen einzelnen Frame aus** (`dist < threshold`). Das Rohsignal trifft ungefiltert auf die Event-Diff-Logik – das erzeugt die Flanken.

## Considered Options

* **Option A – Nur Pinch patchen:** `PinchGesture` bekommt einen eigenen privaten holdMs-Timer (Kopie der Logik aus den drei Pose-Gesten).
* **Option B – Gemeinsamen Mechanismus extrahieren (gewählt):** Die duplizierte Halte-Logik wird in `BaseGesture._stabilize()` gebündelt; alle Gesten mit kontinuierlicher Halte-Semantik (die drei Pose-Gesten + Pinch) nutzen sie.
* **Option C – Doppel-Schwellen-Hysterese:** Pinch bekommt zwei Schwellen (aktiv unter 0.035, inaktiv über 0.045) statt eines holdMs-Timers.

## Decision Outcome

Gewählt: **Option B**, bewusst begrenzt auf die *kontinuierliche Halte-Semantik*.

- `BaseGesture` erhält `_stabilize(rawDetected, now, holdMs)`. Die Methode hält `_activeStart` intern und liefert `null` (kein Rohsignal) oder `{ detected, heldMs }`. `reset()` setzt `_activeStart` zurück.
- `ThumbsUpGesture`/`ThumbsDownGesture`/`PeaceGesture` rufen `_stabilize()` auf und verlieren ihren eigenen `_activeStart`-Code – **Verhalten bleibt exakt identisch** (per Regressionstests belegt).
- `PinchGesture` ruft `_stabilize(dist < threshold, now, holdMs)` auf, `holdMs`-Default 150 ms, `distance` bleibt im `data`.

**Warum Option B statt A:** A löst das Symptom, kopiert die identische Timer-Logik aber an einen vierten Ort (verstößt gegen DRY). B beseitigt die vorhandene Duplikation, gibt Pinch dieselbe Stabilisierung wie den Pose-Gesten und hält es bei **einem** Mechanismus (KISS). Die Tests belegen: die bestehenden Gesten bleiben unverändert.

**Warum nicht C (Hysterese):** Hysterese hat einen Vorteil – sie braucht keine Zusatzlatenz. Sie löst aber nur Gesten mit **Schwellenwert-Vergleich** (Pinch). Die Pose-Gesten (ThumbsUp/Peace) haben keine sinnvolle „Distanz zur Schwelle", für die sich zwei Schwellen definieren ließen. Hysterese hätte also einen **zweiten, parallelen Mechanismus** neben holdMs eingeführt, statt die Duplikation zu beseitigen. Das widerspricht dem Ziel einer einheitlichen Stabilisierung. C bleibt als Option dokumentiert, falls die holdMs-Latenz bei Pinch künftig stört.

## Bezug zum Akzeptanzkriterium (Weg-Entscheidung)

Issue #5 verlangt die begründete Wahl zwischen zwei Arbeitswegen. **Gewählt wurde Weg B: Stabilisierung der bestehenden Gesten plus Engineering-Abschluss** (Pinch-Jitter beheben, Tests, CI, Deployment, Dokumentation). Weg A (eine neue Anwendung bauen) wurde verworfen, weil `friction-notes.md` bereits einen konkreten Defekt belegte (wiederholtes `START`/`END` bei gehaltener Geste) und das Issue-Ziel die Stabilisierung der bestehenden API war – Zeit und Fokus sollten nicht in ein neues Anwendungsbeispiel fließen.

Innerhalb von Weg B wurden auf Implementierungsebene drei Optionen verglichen (siehe „Considered Options"): A = nur Pinch lokal patchen, B = gemeinsame Halte-Stabilisierung extrahieren (gewählt), C = Doppel-Schwellen-Hysterese.

Die Synthesizer-Demo (`src/synth/`, ADR 0008) entstand zusätzlich als planmäßig nicht vorgesehene Zusatz-Demo – nicht als Weg-A-Lieferung. Sie belegt die Kernaussage von `PROJECT.md`: dieselbe Library treibt verschiedene Anwendungen.

## Positive Consequences

* **Flackern behoben (gemessen):** Der Pinch-Jitter-Test speist die Library Frame für Frame und zählt `gesturestart`-Flanken:
  * Rausch-Sequenz `[0.05, 0.035, 0.045, 0.038, 0.05, 0.036, 0.045, 0.035]`: **vorher 4 → nachher 0** false→true-Flanken.
  * Halte-Sequenz `[0.05, 0.035, 0.045, 0.038, 0.036, 0.034, 0.036, 0.035]`: **vorher 2 → nachher 1** Flanke.
* **DRY:** Die zuvor dreifach duplizierte `_activeStart`-Logik existiert nur noch in `BaseGesture._stabilize()` (`grep -r "_activeStart" src/lib/` trifft nur noch `BaseGesture.js`).
* **Open/Closed:** Neue Gesten mit kontinuierlicher Halte-Semantik erhalten die Stabilisierung über `_stabilize()` ohne eigenen Timer-Code.
* **Kein Breaking Change:** Das Verhalten von `ThumbsUp`/`ThumbsDown`/`Peace`/`OpenHandStable`/`TwoHandZoom` ist unverändert (52 Unit-Tests decken Positiv-, Negativ- und Grenzfälle ab).

## Negative Consequences

* **Latenz-Trade-off:** Pinch löst jetzt erst nach ~150 ms durchgehendem Halten aus. Das ist der dokumentierte Tausch „Stabilität gegen Reaktionszeit" – bewusst gewählt, da der bisherige Zustand (Flackern) jede reale Nutzung als Trigger-Quelle blockierte.
* **Bewusst *nicht* vereinheitlicht:** `OpenHandStableGesture` (Stabilitäts-gated) und `TwoHandZoomGesture` (Latching) behalten ihre eigene Halte-Logik. Sie durch `_stabilize()` zu zwingen hätte ihr Verhalten geändert oder die Methode überladen – unverhältnismäßig für den eigentlichen Fix.
* **`_stabilize()`-Vertrag:** Wenn das Rohsignal nicht erkannt ist, gibt die Methode `null` zurück. Das ist auf den ersten Blick ungewöhnlich; der Vertrag steht im JSDoc und die Methode bleibt `_`-gekennzeichnet intern.

## Update (2026-08-20): Folge-Befunde nach Webcam-Test

Zwei unabhängige Folge-Befunde wurden nach dem ersten Webcam-Test der stabilisierten Version behoben:

**1. OpenHandStable löste während langsamer Pinch-Bewegungen aus.** Beim langsamen Zusammenführen bleibt der Zeigefinger oft gestreckt (`tip.y < mcp.y`), sodass die Bedingung „Hand ist offen" erfüllt ist, während der Daumen schon Richtung Zeigefinger wandert. Bei stabiler Hand (Wrist-Bewegung klein) zählte OpenHandStable dadurch die Pinch-Anbahnung als „offen und stabil" und startete konkurrierend. Fix: `OpenHandStableGesture` prüft zusätzlich `minThumbIndexDistance` (Default 0.05) zwischen Daumen- und Zeigefingerspitze – eine Pinch-Haltung ist keine offene Hand.

**2. Grenzwert-Inkonsistenz zwischen `_stabilize()` und `OpenHandStableGesture`.** `_stabilize()` kippt bei `heldMs >= holdMs`, `OpenHandStableGesture` nutzte `>`. Die strikt-größer-Variante ist jetzt angeglichen (`>=`), sodass alle Halte-Gesten dieselbe Grenzwert-Semantik haben (1 ms Differenz, aber konsistente Verträge).

Beide Fixes sind durch zusätzliche Unit-Tests abgedeckt (52 Tests gesamt). Kein Breaking Change an der öffentlichen API.

## Links

* `docs/issue4/friction-notes.md` – Ursprungsbeobachtung (Pinch-Flackern im Event-Log)
* `docs/issue2/0003-algorithmus-und-stabilitaet.md` – Herkunft des Schwellenwerts 0.04
* `docs/issue4/0006-eventtarget-api.md` – dortige Empfehlung, Debounce künftig auf Library-Ebene zu lösen
* `src/lib/BaseGesture.js`, `src/lib/gestures/{ThumbsUp,ThumbsDown,Peace,Pinch}Gesture.js`
* `test/pinch.test.js`, `test/library-pinch-jitter.test.js` – die Messung vorher/nachher
