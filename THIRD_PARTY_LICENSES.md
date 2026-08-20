# Third-Party Licenses

Übersicht der im Projekt verwendeten Fremdsoftware und -ressourcen. Die Library selbst (`src/lib/`) hat **keine** Laufzeit-Abhängigkeiten; die folgenden Komponenten werden ausschließlich von den Demo-/Präsentations-Anwendungen (`src/demo/`, `src/presentation/`) zur Laufzeit aus dem CDN geladen.

| Komponente | Version | Lizenz | Quelle |
|---|---|---|---|
| MediaPipe Tasks Vision (`@mediapipe/tasks-vision`) | 0.10.0 | Apache-2.0 | https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0 |
| MediaPipe Hand Landmarker Model (`hand_landmarker.task`) | float16/1 | Apache-2.0 | https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task |
| MediaPipe Face Landmarker Model (`face_landmarker.task`) | float16/1 | Apache-2.0 | https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task |

## Nachweise

- **MediaPipe Tasks Vision** (Google LLC) – lizenziert unter [Apache License 2.0](https://www.apache.org/licenses/LICENSE-2.0). Eingebunden per CDN (`cdn.jsdelivr.net`), Version in den Imports fixiert (`@0.10.0`).
- **MediaPipe Models** (`hand_landmarker`, `face_landmarker`) – von Google bereitgestellte Modellgewichte, ebenfalls Apache-2.0. Die URLs sind in `src/demo/app.js` bzw. `src/presentation/app.js` fixiert.

Die Nutzung wird dadurch begründet, dass die Hand-/Gesichts-Landmark-Erkennung das Fundament des Projekts bildet (`PROJECT.md`) und MediaPipe als ML-Library in ADR 0001 begründet ausgewählt wurde. Es wird kein Fremdcode ins Repository kopiert – alles wird zur Laufzeit referenziert.
