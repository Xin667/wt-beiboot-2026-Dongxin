# Chat-Protokoll (KI-Nutzung)

Transparenz-Dokumentation gemäß den Bewertungskriterien: Bei der Nutzung von KI-Tools wird ein Chat-Protokoll angefertigt und ins Repository eingecheckt. Es hält fest, welches Werkzeug wann was beigetragen hat und was davon menschlich geprüft oder verändert wurde.

## Eingesetzte Werkzeuge

| Werkzeug | Rolle |
|---|---|
| DeepSeek | Konzeption / Ideenfindung, Erstellung des Issue-5-Umsetzungsplans |
| Claude | Code-Review und Root-Cause-Analyse (Identifikation der Pinch-Jitter-Ursache) |
| ZCode (KI-Agent) | Ausführung: Refactoring, Tests, CI-Workflow, Dokumentation |

## Format

Pro Eintrag: **was** erstellt wurde, **von wem** (Werkzeug) und **Status der menschlichen Prüfung**.

## Issue 5 – Pinch-Jitter-Stabilisierung (Weg B)

| Artefakt | Erstellt von | Menschlich geprüft? |
|---|---|---|
| Umsetzungsplan (DeepSeek + Claude synthetisiert) | DeepSeek, Claude | – (Ausgangspunkt) |
| `src/lib/BaseGesture.js` (`_stabilize`) | ZCode | ⏳ ausstehend |
| Refactoring `ThumbsUp`/`ThumbsDown`/`Peace`/`Pinch` | ZCode | ⏳ ausstehend |
| `test/*` (38 Unit-Tests inkl. Jitter-Messung) | ZCode | ⏳ ausstehend |
| `docs/issue5/0007-*.md` (ADR) | ZCode | ⏳ ausstehend |
| `.github/workflows/deploy.yml`, `package.json` | ZCode | ⏳ ausstehend |
| `LICENSE`, `THIRD_PARTY_LICENSES.md`, `CONTRIBUTING.md`, README-Update | ZCode | ⏳ ausstehend |

**Korrektur des Plans durch den Menschen/Agenten:** Der Ausgangsplan ging von „5 Gesten mit wortgleich duplizierter holdMs-Logik" aus. Bei der Umsetzung zeigte sich, dass nur **drei** Gesten (`ThumbsUp`, `ThumbsDown`, `Peace`) die `_activeStart`-Logik wortgleich teilen; `OpenHandStable` (stabilitäts-gated) und `TwoHandZoom` (Latching) haben abweichende Halte-Semantik. Die Extraktion wurde deshalb auf die kontinuierliche Halte-Familie begrenzt – dokumentiert in ADR 0007.

## Hinweis

Vor dem Merge sollte der Autor die von der KI erstellten Änderungen prüfen (insbesondere Verhalten der Library und die Zahlen in ADR 0007). Nicht erledigt durch KI und daher manuell ausstehend: die **Videoaufnahme** (YouTube) sowie das Setzen von **GitHub Pages → Source: GitHub Actions** in den Repository-Einstellungen.
