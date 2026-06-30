# Time Tracking – Issue 3

| Aufgabe | Zeit |
| :--- | :--- |
| Bestehende Gesture Libraries recherchieren (Fingerpose, ZingTouch, Hammer.js) | 2.0h |
| Library-Architektur entwerfen (Registry-Pattern) + ADR 0004 | 2.5h |
| BaseGesture, GestureLibrary, Utilities implementieren | 3.0h |
| Issue-#2-Gesten in Library-Struktur überführen | 1.5h |
| Neue Gesten implementieren (Peace, ThumbsDown) | 1.0h |
| Demo-Anwendung refactored (detectGestures → lib.update) | 2.5h |
| Testen & Stabilisierung (Prioritätslogik, holdMs, False Positives) | 3.0h |
| Dokumentation (API-Doku, ADR 0005) | 1.5h |
| **Gesamt** | **16.0h** |

## Reflexion

Die meiste Zeit ging in die Stabilisierung der Erkennung – nicht in die Library-Architektur selbst. Das Registry-Pattern war relativ schnell entworfen, aber die Wechselwirkungen zwischen den Gesten (z.B. ThumbsUp löst Pinch aus, Swipe feuert bei jeder Handbewegung) erforderten eine Prioritätslogik (exclusive-Modus), die im ursprünglichen Issue-#2-Code implizit durch die if/else-if-Kette vorhanden war, aber bei der Zerlegung in einzelne Klassen verloren ging.

Swipe wurde implementiert und wieder verworfen – die False-Positive-Rate war zu hoch. Die Erkenntnis: bewegungsbasierte Gesten (Frame-Deltas) sind fundamental schwieriger zu stabilisieren als statische Posen (Finger-Koordinatenvergleiche).

Beim nächsten Mal würde ich die Prioritätslogik von Anfang an in die Architektur einplanen, statt sie nachträglich einzubauen.