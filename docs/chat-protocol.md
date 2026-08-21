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
| `test/*` (51 Unit-Tests inkl. Jitter-Messung) | ZCode | ⏳ ausstehend |
| `docs/issue5/0007-*.md` (ADR) | ZCode | ⏳ ausstehend |
| `.github/workflows/deploy.yml`, `package.json` | ZCode | ⏳ ausstehend |
| `LICENSE`, `THIRD_PARTY_LICENSES.md`, `CONTRIBUTING.md`, README-Update | ZCode | ⏳ ausstehend |
| Nacharbeit: ESLint (devDependency), `library.test.js`, Grenzwert-Angleichung, OpenHandStable-vs-Pinch-Fix | ZCode | ⏳ ausstehend |

**Korrektur des Plans durch den Menschen/Agenten:** Der Ausgangsplan ging von „5 Gesten mit wortgleich duplizierter holdMs-Logik" aus. Bei der Umsetzung zeigte sich, dass nur **drei** Gesten (`ThumbsUp`, `ThumbsDown`, `Peace`) die `_activeStart`-Logik wortgleich teilen; `OpenHandStable` (stabilitäts-gated) und `TwoHandZoom` (Latching) haben abweichende Halte-Semantik. Die Extraktion wurde deshalb auf die kontinuierliche Halte-Familie begrenzt – dokumentiert in ADR 0007.

**Folge-Befunde aus dem Webcam-Test** (dokumentiert in ADR 0007, Update): OpenHandStable konkurrierte während langsamer Pinch-Bewegungen; Fix über `minThumbIndexDistance` (Eingabe/Beobachtung vom Autor, Implementierung ZCode). Außerdem wurden ESLint (Stufe-2-Kriterium „Statische Codeanalyse automatisiert") und ein Library-Integrationstest (`library.test.js`) ergänzt.

## Synthesizer-Demo (`src/synth/`) – Zusatz-Demo, nicht im Issue-5-Plan

| Artefakt | Erstellt von | Menschlich geprüft? |
|---|---|---|
| `audio.js` (Web-Audio-Engine: Looper, Synthese ohne Assets) | ZCode | Verhalten vom Autor per Webcam getestet; Code-Review offen |
| `app.js` (Gesten-Verdrahtung, Stabilisierungen, UI-Logik) | ZCode | Verhalten vom Autor per Webcam getestet; Code-Review offen |
| `index.html` (UI nach Mockup des Autors) | ZCode | Layout vom Autor per Screenshot/Webcam abgenommen |
| Design-Entscheidungen (Latching-Schalter, Kooldown, Delta-gated Volume, **Pinch entfernt**) | Autor + ZCode im Dialog | Entscheidungen vom Autor getroffen |

**Wichtige Design-Entscheidung (Autor):** Pinch wurde aus der Demo **entfernt** – trotz mehrfacher App-seitiger Stabilisierung (Hold-Zeit, Kooldown, Stufen-Quantisierung) war die schwellenwertbasierte Geste in der Live-Interaktion zu fehleranfällig. Die Demo läuft mit fünf posesbasierten Gesten (`peace`, `thumbs-up`, `thumbs-down`, `open-hand-stable`, `two-hand-zoom`). Die Library selbst bleibt unverändert – Pinch ist dort weiterhin enthalten und durch die Issue-5-Fixes stabilisiert (ADR 0007).

## Hinweis

Vor dem Merge sollte der Autor die von der KI erstellten Änderungen prüfen (insbesondere Verhalten der Library und die Zahlen in ADR 0007). **Videoaufnahme (YouTube)** ist weiterhin manuell ausstehend. GitHub Pages ist inzwischen aktiviert (Source: GitHub Actions, per API gesetzt) – die CI veröffentlicht `src/` unter `https://xin667.github.io/wt-beiboot-2026-Dongxin/` (Demo `/demo/`, Synthesizer `/synth/`).
