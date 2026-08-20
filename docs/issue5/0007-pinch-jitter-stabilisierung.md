# ADR 0007: Pinch-Jitter durch gemeinsame holdMs-Stabilisierung beheben (Weg B)

**Date:** 2026-08-20
**Author:** Dongxin Wang
**Status:** Accepted

## Context and Problem Statement

Beim Regressionstest der Issue-#4-Änderung wurde ein wiederkehrendes Flackern der `PinchGesture` beobachtet (vollständiges Log: `docs/issue4/friction-notes.md`, Abschnitt 2026-07-14). Bei durchgehend gehaltener Pinch-Geste erschienen im Event-Log mehrere `START`/`END`-Paare pro Sekunde:

```
[17:14:09] START pinch
[17:14:09] END pinch
[17:14:09] START pinch
...
```

Vermutete Ursache (bereits in `friction-notes.md` notiert): Der Schwellenwert (`threshold: 0.04`, Distanz LM4↔LM8) hat keine Hysterese. Liegt die tatsächliche Distanz nahe 0.04, kippt der Vergleich `dist < threshold` durch Landmark-Jitter frame-weise, jeder Kipp erzeugt ein neues START/END-Paar.

Die Code-Analyse bestätigt die Vermutung und präzisiert sie: Von den sechs eingebauten Gesten stabilisieren drei (`ThumbsUpGesture`, `ThumbsDownGesture`, `PeaceGesture`) ihr Rohsignal bereits über einen holdMs-Timer – die Logik (`_activeStart`-Sentinel, Halte-Dauer, `held >= holdMs`) ist dabei **wortgleich dupliziert**. Zwei weitere (`OpenHandStableGesture`, `TwoHandZoomGesture`) haben eigene, *andersartige* Halte-Semantik (Stabilitäts-gated bzw. Latching nach letztem positiven Delta). **Einzig `PinchGesture` wertet nur einen einzelnen Frame aus** (`dist < threshold`) – das Rohsignal trifft ungefiltert auf die Event-Diff-Logik und erzeugt so die Flanken.

## Considered Options

* **Option A – Nur Pinch patchen:** `PinchGesture` bekommt einen eigenen privaten holdMs-Timer (Kopie der Logik aus den drei Pose-Gesten).
* **Option B – Gemeinsamen Mechanismus extrahieren (gewählt):** Die wortgleich duplizierte Halte-Logik wird in `BaseGesture._stabilize()` gebündelt; alle Gesten mit kontinuierlicher Halte-Semantik (die drei Pose-Gesten + Pinch) nutzen sie.
* **Option C – Doppel-Schwellen-Hysterese:** Pinch bekommt zwei Schwellen (aktiv unter 0.035, inaktiv über 0.045) statt eines holdMs-Timers.

## Decision Outcome

Gewählt: **Option B**, bewusst begrenzt auf die *kontinuierliche Halte-Semantik*.

- `BaseGesture` erhält `_stabilize(rawDetected, now, holdMs)`: hält `_activeStart` intern, liefert `null` (kein Rohsignal) oder `{ detected, heldMs }`. `reset()` setzt `_activeStart` zurück.
- `ThumbsUpGesture`/`ThumbsDownGesture`/`PeaceGesture` rufen `_stabilize()` auf und verlieren ihren eigenen `_activeStart`-Code – **Verhalten bleibt exakt identisch** (per Regressionstests belegt).
- `PinchGesture` ruft `_stabilize(dist < threshold, now, holdMs)` auf, `holdMs`-Default 150 ms, `distance` bleibt im `data`.

**Warum Option B statt A:** A löst das Symptom, würde die identische Timer-Logik aber auf einen vierten Ort kopieren (verstößt gegen DRY). B beseitigt die vorhandene Duplikation, gibt Pinch dieselbe Stabilisierung wie den Pose-Gesten und hält es bei **einem** Mechanismus (KISS). Der Aufwand ist gering, das Verhalten der bestehenden Gesten bleibt per Test nachweisbar unverändert.

**Warum nicht C (Hysterese):** Hysterese hat den Vorteil *ohne* Zusatzlatenz zu arbeiten, löst aber nur Gesten mit **Schwellenwert-Vergleich** (Pinch) – die Pose-Gesten (ThumbsUp/Peace) haben keine sinnvolle "Distanz zur Schwelle", für die sich zwei Schwellen definieren ließen. Hysterese würde also einen **zweiten, parallelen Mechanismus** neben holdMs einführen, statt die vorhandene Duplikation zu beseitigen. Das widerspricht dem Ziel einer einheitlichen Stabilisierung. C bleibt als Option dokumentiert, falls die holdMs-Latenz bei Pinch künftig stört.

## Positive Consequences

* **Flackern behoben (gemessen):** Der Pinch-Jitter-Test speist die Library Frame für Frame und zählt `gesturestart`-Flanken:
  * Rausch-Sequenz `[0.05, 0.035, 0.045, 0.038, 0.05, 0.036, 0.045, 0.035]`: **vorher 4 → nachher 0** false→true-Flanken.
  * Halte-Sequenz `[0.05, 0.035, 0.045, 0.038, 0.036, 0.034, 0.036, 0.035]`: **vorher 2 → nachher 1** Flanke.
* **DRY:** Die zuvor dreifach duplizierte `_activeStart`-Logik existiert nur noch in `BaseGesture._stabilize()` (`grep -r "_activeStart" src/lib/` trifft nur noch `BaseGesture.js`).
* **Open/Closed:** Neue Gesten mit kontinuierlicher Halte-Semantik erhalten die Stabilisierung über `_stabilize()` ohne eigenen Timer-Code.
* **Kein Breaking Change:** Das Verhalten von `ThumbsUp`/`ThumbsDown`/`Peace`/`OpenHandStable`/`TwoHandZoom` ist unverändert (38 Unit-Tests decken Positiv-, Negativ- und Grenzfälle ab).

## Negative Consequences

* **Latenz-Trade-off:** Pinch löst jetzt erst nach ~150 ms durchgehendem Halten aus. Das ist der dokumentierte Tausch "Stabilität gegen Reaktionszeit" – bewusst gewählt, da der bisherige Zustand (Flackern) jede reale Nutzung als Trigger-Quelle blockierte.
* **Bewusst *nicht* vereinheitlicht:** `OpenHandStableGesture` (Stabilitäts-gated) und `TwoHandZoomGesture` (Latching) behalten ihre eigene Halte-Logik. Sie durch `_stabilize()` zu zwingen hätte ihr Verhalten geändert oder die Methode überladen – unverhältnismäßig für den eigentlichen Fix.
* **`_stabilize()`-Vertrag:** Rückgabe `null` für "kein Rohsignal" ist ein leicht nicht-offensichtlicher Vertrag; er ist im JSDoc dokumentiert und bleibt `_`-gekennzeichnet intern.

## Links

* `docs/issue4/friction-notes.md` – Ursprungsbeobachtung (Pinch-Flackern im Event-Log)
* `docs/issue2/0003-algorithmus-und-stabilitaet.md` – Herkunft des Schwellenwerts 0.04
* `docs/issue4/0006-eventtarget-api.md` – dortige Empfehlung, Debounce künftig auf Library-Ebene zu lösen
* `src/lib/BaseGesture.js`, `src/lib/gestures/{ThumbsUp,ThumbsDown,Peace,Pinch}Gesture.js`
* `test/pinch.test.js`, `test/library-pinch-jitter.test.js` – die Messung vorher/nachher
