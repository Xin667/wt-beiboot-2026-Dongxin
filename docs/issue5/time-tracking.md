# Time Tracking – Issue 5

| Aufgabe | Zeit |
| :--- | :--- |
| Code-Analyse & Root-Cause (Pinch-Jitter, holdMs-Duplikation) | 1.5h |
| Refactoring `BaseGesture._stabilize` + 4 Gesten | 1.5h |
| Unit-Tests (38 Stück, inkl. Jitter-Messung) | 3h |
| ADR 0007 | 1h |
| CI-Workflow (GitHub Actions) + Pages-Konfiguration | 1.5h |
| Repo-Compliance (LICENSE, THIRD_PARTY_LICENSES, Chat-Protokoll, README, CONTRIBUTING) | 2h |
| Video (Dreh & Upload) | 3h |
| Zeittracking & Reflexion | 0.5h |
| **Gesamt** | **14h** |

## Reflexion

Der eigentliche Fix war klein – die meiste Zeit ging in den Nachweis. Dass Pinch als einzige Geste ohne Halte-Stabilisierung auskam, war aus dem Code sofort ersichtlich; aber der Anspruch von Issue 5 (Begründung A/B, harte Vorher/Nachher-Zahlen, Tests, Deployment) verlangt, die Beobachtung aus `friction-notes.md` in einen reproduzierbaren Test zu übersetzen. Das war der wertvollste Teil: Erst der Pinch-Jitter-Test, der `gesturestart`-Flanken zählt, macht aus „es flackert" eine belastbare Zahl (Rauschen 4→0, Halten 2→1 Flanken).

Wichtig war außerdem, die Duplikation ehrlich zu benennen statt dem Plan blind zu folgen: Nur drei Gesten teilten die `_activeStart`-Logik wortgleich, nicht fünf. Die Extraktion auf die kontinuierliche Halte-Familie zu begrenzen (statt `OpenHandStable` und `TwoHandZoom` mit anderen Halte-Semantiken durch eine Methode zu zwingen) war die richtige Abgrenzung – dokumentiert in ADR 0007.
