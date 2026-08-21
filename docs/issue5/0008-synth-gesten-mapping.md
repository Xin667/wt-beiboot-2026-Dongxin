# ADR 0008: Gesten-Steuerung der Synthesizer-Demo (src/synth/)

**Date:** 2026-08-21
**Author:** Dongxin Wang
**Status:** Accepted

## Kurzfassung

- **Ziel:** Die Synthesizer-Demo (`src/synth/`) zeigt, dass dieselbe Library in einer völlig anderen Anwendung funktioniert – als zweites Anwendungsbeispiel neben `src/presentation/`.
- **Modell:** Musik entsteht nicht durch „ein Gesten-Trigger = ein Ton", sondern durch **Latching-Schalter**, die einzelne Sound-Schichten eines Loopers an- und ausschalten. So sind Fehlauslösungen harmlos (die Musik bleibt tonal).
- **Wichtigste Entscheidung:** `pinch` wurde aus der Demo **entfernt** – nach mehreren Stabilisierungsversuchen war sie in der Live-Interaktion zu fehleranfällig. Die Library selbst bleibt unverändert (ADR 0007 hat Pinch dort stabilisiert).
- **Ergebnis:** 5 Gesten steuern die Demo; die App nutzt Events *und* den Data-Kanal der Library.

## Context and Problem Statement

Issue #5 verlangt ein überzeugendes Anwendungsbeispiel. Im Repo gab es schon `src/demo/` (Entwicklungs-Werkbank) und `src/presentation/` (Anwendungsbeispiel 1). Für die Synthesizer-Demo galt:

- Musik-Interaktion braucht **stabile, persistente Kontrolle** – kein „Tippen" auf einer virtuellen Tastatur. Die Gestenerkennung läuft mit begrenzter Framerate (~30 fps) und Landmark-Jitter; „jede Geste = ein Ton" würde bei Fehlauslösung einzelne, falsche Noten erzeugen.
- Die Demo sollte zeigen, dass die Library mehr kann als diskrete Events: auch **kontinuierliche Parameter** (Data-Kanal) und **dauerhafte Zustände** (Latching).

## Considered Options

**Richtung der Demo:**

* **Option A – Xylophon-Modus:** Jeder `gesturestart` spielt einen Ton (je Hand ein Ton). *Verworfen:* zu langsam und zu ungenau für rhythmisches Spiel; jede Fehlauslösung klingt als falsche Note.
* **Option B – Layered Looper (gewählt):** Ein Looper spielt einen Backing-Track (96 BPM, Akkordfolge Am–F–C–G mit Bass und Drums). Gesten schalten einzelne Schichten an/aus (Latching). *Gewählt:* Timing liegt beim Looper, die Geste muss nur „umschalten" – viel stabiler, und das Ergebnis klingt auch bei Fehlauslösung musikalisch.

**Umgang mit `pinch` (6. Geste):**

* **Option A – Pinch behalten** (z.B. als Schalter für die Drum-Schicht). *Verworfen,* Begründung unten.
* **Option B – Pinch entfernen (gewählt):** Die Demo nutzt nur die fünf Pose-Gesten.

## Decision Outcome

**Gestalten-Mapping** (Handanzahl = Modus-Wechsel, vgl. `GestureLibrary`-Routing):

| Geste | Funktion | Art |
|---|---|---|
| `peace` | Backing-Track an/aus (Looper: Am–F–C–G + Bass + Drums) | Latching-Schalter |
| `thumbs-up` / `thumbs-down` | Solo-Töne (A-Moll-Pentatonik, nach oben/unten) | Diskreter Trigger |
| `open-hand-stable` | Pad an/aus | Latching-Schalter (1.5 s Haltezeit) |
| `two-hand-zoom` | Lautstärke (Handabstand) | Kontinuierlich (Data-Kanal) |

**Technische Umsetzung:**

- `exclusive: false` – alle Gesten werden unabhängig ausgewertet (die App braucht z.B. Track *und* Lautstärke gleichzeitig).
- Diskrete Trigger laufen über `gesturestart`-Events; die Lautstärke wird pro Frame über `lib.getLastResult('two-hand-zoom').data.distance` gelesen – der **Data-Kanal** der Library.
- Drei **App-seitige Stabilisierungen** (bewusst nicht in der Library, die Demo-Apps tragen ihre UX-Policy selbst):
  - `gesturestart`-Kooldown (300 ms) gegen Fehlauslösung beim Gestenwechsel (Zwischenposen erfüllen kurz eine andere Geste).
  - `open-hand-stable` mit 1.5 s Haltezeit (Library-Default), damit das Pad nicht schon beim Ansetzen einer Bewegung togglet.
  - Lautstärke folgt dem Handabstand nur, wenn sich die Hände merklich bewegen (`|delta| > 0.01`, beide Richtungen), geglättet per EMA (`α = 0.25`). Ruhig im Bild stehende Hände verstellen die Lautstärke nicht.

**Warum Pinch entfernt wurde (Messung statt Vermutung):**

Versuche in dieser Reihenfolge – alle app-seitig, die Library blieb unverändert:

1. holdMs-Tuning (150 ms und höher): verringerte das Flackern, beseitigte es nicht.
2. Gesturestart-Kooldown: unterdrückte Doppel-Trigger, aber die falschen Auslöser kamen zeitlich gestreut.
3. Filter/Latch auf dem `detected`-Signal: brachte kaum Verbesserung.
4. 8-stufige Quantisierung + EMA auf der Distanz: die Distanz oszilliert zu stark um die Schwelle 0.04.

**Befund aus dem Live-Test:** Pinch ist eine *schwellenwertbasierte* Geste (`distance < 0.04`). Die natürliche Bewegung „Daumen an Zeigefinger heranführen" durchquert den Schwellenbereich zwangsläufig langsam – dort reicht schon kleines Landmark-Rauschen zum Umschalten. Zusätzlich ist die Pinch-Haltung form-ähnlich zu anderen Gesten (Finger leicht gebeugt), was die Unterscheidung erschwert.

**Konsequenz:** Die Demo verwendet nur noch Pose-Gesten mit eindeutiger Handform (Daumen hoch/runter, V-Zeichen, offene Hand, zwei Hände). **Die Library wurde nicht geändert** – `pinch` bleibt eine eingebaute, durch ADR 0007 stabilisierte Geste. Die Entscheidung gilt nur für diese Demo.

## Positive Consequences

* **Musik klingt immer „richtig":** Der Looper gibt Timing und Harmonie vor (Pentatonik), Fehlauslösungen erzeugen höchstens einen zusätzlichen Wechsel – keine falschen Einzelnoten.
* **Latching-Modell passt zur Geste:** Einmal getriggert läuft die Schicht weiter, auch wenn die Hand das Bild verlässt – so entsteht Schicht für Schicht eine Aufstellung.
* **Alle drei API-Kanäle demonstriert:** Events (`gesturestart`/`gestureend`), Data-Kanal (`getLastResult().data`) und Status (`getActiveGestures`).
* **Kontrast zu `src/presentation/`:** Dieselben Gesten bedeuten in den beiden Apps etwas anderes – genau die Abstraktionsleistung, die `PROJECT.md` verspricht.

## Negative Consequences

* **Pinch nicht in der Demo:** Wer Pinch-Interaktionen bauen will, muss die Geste in der eigenen App evaluieren (mit den bekannten Eigenheiten).
* **Latenz durch Stabilisierung:** Pad-Schalter brauchen 1.5 s Haltezeit, die Lautstärke hat EMA-Glättung – bewusst erkauft mit Reaktionszeit.
* **Aufwand:** ~8.5 h für eine Demo außerhalb des Issue-Plans – dokumentiert als Zusatz (time-tracking.md).

## Links

* `src/synth/app.js`, `src/synth/audio.js`, `src/synth/index.html`
* `docs/issue5/0007-pinch-jitter-stabilisierung.md` – Stabilisierung von Pinch in der Library (Voraussetzung, dass Pinch überhaupt als Geste nutzbar bleibt)
* `docs/issue5/time-tracking.md` – Aufwand & Reflexion zur Synthesizer-Demo
* `README.md` – Abschnitt „Synthesizer-App"
