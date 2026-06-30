# ADR 0004: Library-Architektur – Registry-Pattern

**Date:** 2026-06-29  
**Author:** Dongxin Wang  
**Status:** Accepted

## Context and Problem Statement

In Issue #2 war die Gestenerkennungslogik direkt in der `index.html` eingebettet: eine einzelne `detectGestures(landmarksArray)`-Funktion mit verschachtelten if/else-Blöcken für Pinch, ThumbsUp, OpenHandStable und TwoHandZoom. Schwellenwerte, Zustandsvariablen und UI-Updates waren vermischt.

Für Issue #3 muss diese Logik in eine eigenständige, erweiterbare Library überführt werden, die:
- unabhängig von der Demo-Anwendung funktioniert
- neue Gesten aufnehmen kann, ohne bestehenden Code zu ändern
- von Dritten nutzbar ist, ohne den Quellcode lesen zu müssen

## Considered Options

### Option A: Monolithische Klasse
Eine `GestureDetector`-Klasse mit einer großen `detect()`-Methode und if/else-Verzweigungen – im Prinzip die `detectGestures()`-Funktion von Issue #2 in eine Klasse gewickelt.

- **Pro:** Wenig Refactoring nötig, einfach zu verstehen
- **Contra:** Jede neue Geste erfordert Änderungen am bestehenden Code; schlecht testbar

### Option B: Registry-Pattern (gewählt)
Jede Geste ist eine eigenständige Klasse, die von `BaseGesture` erbt. Eine `GestureLibrary` als Registry verwaltet registrierte Gesten und routet die MediaPipe-Daten automatisch.

- **Pro:** Open/Closed-Prinzip; Gesten sind einzeln testbar; Schwellenwerte per Konstruktor konfigurierbar (in Issue #2 waren sie direkt im Code eingebettet, ADR 0003 hatte das als Nachteil dokumentiert)
- **Contra:** Mehr Boilerplate pro Geste (eigene Datei, `extends BaseGesture`)

## Decision Outcome

**Option B – Registry-Pattern**, weil:

1. Das Akzeptanzkriterium „Neue Gesten lassen sich hinzufügen, ohne bestehenden Code zu verändern" direkt erfüllt wird
2. Die Schwellenwert-Konfigurierbarkeit den in ADR 0003 dokumentierten Nachteil behebt
3. Einhand- und Zweihand-Gesten über die `handCount`-Eigenschaft sauber getrennt werden (TwoHandZoomGesture bekommt automatisch beide Hände übergeben)

### Konsequenzen

**Positiv:**
- Jede Geste lebt in einer eigenen Datei → übersichtlich, testbar
- `GestureLibrary` kennt keine konkreten Gesten, arbeitet nur mit `BaseGesture`-Schnittstelle
- Schwellenwerte sind jetzt per Konstruktor-Optionen einstellbar: `new PinchGesture({ threshold: 0.04 })`
- Einhand/Zweihand-Routing ist in der Library gekapselt, Gesten müssen sich nicht darum kümmern
- `exclusive`-Modus (default) bildet die Prioritätsreihenfolge aus Issue #2 (ADR 0003: Pinch → ThumbsUp → Hand stabil) ab: Registrierungsreihenfolge = Priorität, erste erkannte Geste gewinnt. Kann für parallele Erkennung auf `false` gesetzt werden.

**Negativ:**
- Mehr Dateien als die ursprüngliche Single-File-Lösung
- `BaseGesture`-Vertrag muss eingehalten werden (name, description, detect sind Pflicht)
- Im `exclusive`-Modus bestimmt die Registrierungsreihenfolge das Verhalten – nicht offensichtlich ohne Dokumentation

## Analyse bestehender Gesture Libraries

Vor der Architekturentscheidung wurden drei bestehende Libraries untersucht, um wiederkehrende Muster zu identifizieren.

### Fingerpose (github.com/andypotato/fingerpose)

Fingerpose ist am nächsten an unserem Anwendungsfall – es erkennt ebenfalls statische Handposen aus MediaPipe-Landmarks.

- **Gestendefinition:** Jede Geste ist eine `GestureDescription`-Instanz, die pro Finger die erwartete Curl-Richtung festlegt (z.B. `addCurl(Finger.Thumb, FingerCurl.NoCurl)`)
- **Registrierung:** Alle Gesten werden als Array an den `GestureEstimator`-Konstruktor übergeben
- **Erkennung:** `estimator.estimate(landmarks, minConfidence)` gibt ein Array von Matches mit Konfidenzwerten zurück
- **Öffentlich:** `GestureEstimator`, `GestureDescription`, Finger/Curl/Direction-Enums
- **Intern:** Die Berechnung der Finger-Curl-Werte, Konfidenz-Scoring

**Einschränkung:** Fingerpose ist rein deklarativ (Finger-Zustände beschreiben), kann aber keine zeitbasierten oder bewegungsbasierten Gesten abbilden (z.B. OpenHandStable mit 1500ms Haltezeit).

### Hammer.js (hammerjs.github.io)

Hammer.js ist eine Touch-Gesture-Library für DOM-Events, konzeptionell aber übertragbar.

- **Gestendefinition:** Jede Geste ist ein `Recognizer` mit eigener Zustandsmaschine (Possible → Recognized → Failed)
- **Registrierung:** `manager.add(new Hammer.Tap({ taps: 2 }))` – Recognizer-Instanzen werden einzeln hinzugefügt
- **Erkennung:** Hammer routet Input-Events an alle Recognizer, die unabhängig voneinander auswerten
- **Öffentlich:** `Manager`, `Recognizer`-Unterklassen, `on()`/`off()` für Events
- **Intern:** Input-Event-Normalisierung, Recognizer-Zustandsmaschine, Inter-Recognizer-Abhängigkeiten

**Übernahme:** Die Idee, Gesten als eigenständige Klassen mit eigener Zustandslogik zu modellieren und per `register()`/`add()` anzumelden, stammt direkt aus Hammer.js.

### ZingTouch (github.com/nicholasdly/zingtouch)

- **Gestendefinition:** Custom Gestures erben von `Gesture`-Basisklasse und implementieren `start()`, `move()`, `end()`
- **Registrierung:** `ZingTouch.register(name, GestureClass)` – globale Registry
- **Öffentlich:** `Region`, `bind()`/`unbind()`, Event-Handler
- **Intern:** Input-Event-Verarbeitung

**Übernahme:** Die Basisklassen-Vererbung (`Gesture` → konkrete Geste) ist das gleiche Muster wie unser `BaseGesture` → `ThumbsUpGesture`.

### Synthese

| Aspekt | Fingerpose | Hammer.js | ZingTouch | Unsere Library |
|---|---|---|---|---|
| Geste definieren | Deklarativ (Curl-Zustände) | Klasse mit Zustandsmaschine | Klasse mit start/move/end | Klasse mit detect() |
| Registrieren | Array an Konstruktor | manager.add() | globale Registry | lib.register() |
| Erkennung | estimate() → Matches | automatisch, Event-basiert | Event-basiert | update() → Results |
| Zeitbasierte Gesten | Nein | Ja (Zustandsmaschine) | Ja | Ja (interner Zustand) |

Unsere Library kombiniert die Einfachheit von Fingerpose (eine detect()-Methode statt Zustandsmaschine) mit der Erweiterbarkeit von Hammer.js (eigenständige Klassen, einzeln registrierbar). Die `BaseGesture`-Vererbung folgt dem ZingTouch-Muster.
