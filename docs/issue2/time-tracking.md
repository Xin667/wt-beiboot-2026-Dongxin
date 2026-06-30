# Time Tracking – Issue 2

| Aufgabe | Zeit |
| :--- | :--- |
| Gestenvokabular erarbeiten | 1.5h |
| Implementierung (detectGestures) | 2.5h |
| Testen & Schwellenwerte kalibrieren | 1.5h |
| Dokumentation (ADRs) | 2.0h |
| **Gesamt** | **7.5h** |

## Reflexion
Am meisten Zeit hat die Kalibrierung der Schwellenwerte gekostet – Werte wie 0.04 (Pinch) oder 0.015 (Handstabilität) mussten iterativ durch Ausprobieren gefunden werden, da die MediaPipe-Dokumentation keine Hinweise auf typische Wertebereiche gibt. 

Überraschend war, dass der z-Wert von MediaPipe für eine Nah-/Fern-Unterscheidung praktisch unbrauchbar ist (zu stark verrauscht), weshalb die Fernbereich-Gesten auch im Nahbereich auslösen. Die Prioritätsreihenfolge (Pinch → ThumbsUp → Hand stabil) war erst nachträglich nötig, als sich zeigte, dass mehrere Gesten gleichzeitig feuern können.