# Chat-Protokoll (KI-Nutzung)

Diese Datei dokumentiert die Nutzung von KI-Werkzeugen im Projekt, wie von den Bewertungskriterien gefordert.

## Eingesetzte Werkzeuge

- **DeepSeek** – konzeptionelle Unterstützung: Erstellung des Umsetzungsplans für Issue #5 und Diskussion der Vorgehensweise.
- **Claude (Anthropic)** – Review und Root-Cause-Analyse: Identifikation der Pinch-Jitter-Ursache und der duplizierten holdMs-Logik; Ideenfindung für die Synthesizer-Demo.
- **ZCode (KI-Agent)** – ausführende Unterstützung: Refactoring, Tests, CI-Workflow, Dokumentation (ADR, README, Compliance-Dateien) und Umsetzung der Synthesizer-Demo.

## Verwendungsbereiche

KI-Unterstützung wurde eingesetzt für:

- Umsetzungsplan und Entscheidungsvorbereitung für Issue #5 (Stabilisierung der Pinch-Geste, Weg B)
- Refactoring der duplizierten Halte-Logik in `BaseGesture._stabilize()` und Anbindung der `PinchGesture` (ADR 0007)
- Erstellung der Unit- und Integrationstests (inkl. Vorher/Nachher-Messung des Pinch-Flackerns)
- CI-Pipeline (GitHub Actions) und GitHub-Pages-Deployment
- Entwurf und Umsetzung der Synthesizer-Demo (`src/synth/`)
- Formulierung von ADRs, README und Compliance-Dateien (Lizenz, Drittlizenzen, Contributing)

## Verifikation

Alle KI-erstellten Code- und Dokumentteile wurden vom Autor gelesen, verstanden und vor dem Commit geprüft. Verhaltensrelevante Entscheidungen – etwa die Entfernung der Pinch-Geste aus der Demo oder der OpenHandStable-vs-Pinch-Fix – hat der Autor selbst getroffen und per Webcam-Test verifiziert. Die Verhaltensgleichheit der refaktorierten Gesten ist durch die Unit-Tests belegt.

## Transparenz in der Commit-Historie

Einige Commits tragen einen `Co-Authored-By: Claude …`-Fußtext. Dieser wird vom KI-Codierungswerkzeug automatisch angehängt und kennzeichnet, dass die Änderung mit KI-Unterstützung entstanden ist (Bewertungskriterium: Transparenz bei KI-Nutzung). Der Autor aller Commits ist ausschließlich der Repository-Inhaber – die KI hat keine eigenen Commits erstellt.
