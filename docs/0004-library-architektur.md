# ADR 0004: Library-Architektur – Registry-Pattern

**Date:** 2026-07-XX  
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

## Referenzen

- [Fingerpose](https://github.com/andypotato/fingerpose) – ähnlicher Ansatz mit GestureDescription-Klassen
- [ZingTouch](https://zingchart.github.io/zingtouch/) – Registry für Touch-Gesten
- [Hammer.js](https://hammerjs.github.io/) – Touch-Gesture-Library mit recognizer-basierter Architektur
