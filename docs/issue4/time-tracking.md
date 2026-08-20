# Time Tracking – Issue 4

| Aufgabe | Zeit |
| :--- | :--- |
| README/PROJECT.md sichten, Issue-3-Stand nachvollziehen | 0.5h |
| Präsentations-App bauen (Slides + State-Machine) | 1.5h |
| MediaPipe/Kamera-Boilerplate übernehmen | 1h |
| App gegen bestehende `onChange()`-API verdrahten, Keyboard-Fallback, Reibungspunkte notieren | 1h |
| Library-Änderung (EventTarget/CustomEvent) + Kompatibilitäts-Wrapper | 0.5h |
| App auf `addEventListener` umstellen | 1.5h |
| Testen (neue App + Regression `src/demo/`) | 0.5h |
| Dokumentation (README-Update, ADR 0006) | 1h |
| Zeittracking & Reflexion | 1h |
| **Gesamt** | 8.5h |

## Reflexion

Die eigentliche Erkenntnis dieses Issues kam nicht beim Bauen, sondern beim Testen. Die App gegen die dokumentierte API zu schreiben war schnell erledigt – die erwartete Reibung (eigenes Callback-System statt nativer Events) zeigte sich zwar sofort und wurde planmäßig behoben (ADR 0006), aber sie war eher unschön als blockierend. Die wirklich überraschenden Befunde lieferte erst der echte Webcam-Test: Wiederholtes Triggern war unerwartet schwer, und flackernde Erkennung löste mehrfache Folienwechsel aus. Beides hätte man weder aus der README noch aus dem Quellcode herauslesen können – „API ausprobieren" heißt eben nicht nur „dagegen programmieren", sondern die Anwendung real benutzen.

Bewährt hat sich die Disziplin, nur ein Problem zu beheben und die übrigen Befunde (fehlende zeitliche Dimension im Event-Modell, Pinch-Flackern) sauber zu dokumentieren statt mitzufixen. Ebenso die Entscheidung, `onGesture`/`onChange` als Kompatibilitäts-Wrapper zu erhalten: Die EventTarget-Umstellung kostete dadurch nur eine halbe Stunde und brach nichts – die Issue-#3-Demo lief unverändert weiter.

Beim nächsten Mal würde ich den echten Gerätetest früher einplanen statt erst nach Fertigstellung – die wertvollsten API-Befunde entstanden in den letzten 30 Minuten Testen, nicht in den Stunden davor.
