# Video-Skript (≤ 10 min) – Issue 5

Ziel des Videos: die Behebung des Pinch-Flackerns nachvollziehbar machen – Vorher/Nachher als Kern – und die restlichen Issue-5-Akzeptanzkriterien (Tests, CI/Deployment, lokaler Start) kurz zeigen.

## Struktur

| # | Abschnitt | Dauer | Inhalt |
|---|---|---|---|
| 1 | Projektziel | ~1 min | Ein Satz: Körperdaten als native Browser-Events (`PROJECT.md`). Kurzer Blick auf die Library-Struktur. |
| 2 | Problem | ~1 min | Event-Log der Demo zeigen: gehaltene Pinch-Geste erzeugt mehrere `START`/`END`-Paare pro Sekunde (Bezug `docs/issue4/friction-notes.md`). |
| 3 | **Vorher/Nachher (Kern)** | ~2 min | Gleiche Geste zweimal zeigen: **vorher** flackert der Event-Log, **nachher** eine einzige `START`-Flanke. Optional: den Pinch-Jitter-Test laufen lassen und die Flankenzählung (4→0 / 2→1) einblenden. |
| 4 | Tests & CI | ~2 min | `npm test` (38 Tests) laufen lassen; `npm run check`; Blick auf `.github/workflows/deploy.yml` (Test-Gate vor Deploy). |
| 5 | Deployment | ~1 min | Die öffentliche Pages-URL öffnen (`…/demo/`), Kamera freigeben, eine Geste auslösen. |
| 6 | Lokaler Start | ~1 min | `npx serve src` bzw. VS Code Go Live zeigen. |
| 7 | Zusammenfassung | ~1 min | Was geändert wurde (ADR 0007), Trade-off (150 ms Latenz vs. Stabilität), Ausblick. |

## Tipps

- Abschnitt 3 ist das Herzstück: die **gleiche** Handbewegung in beiden Zuständen zeigen, idealerweise als Bild-im-Bild oder direkt hintereinander, damit der Kontrast klar wird.
- Für eine reproduzierbare Aufnahme kann statt der Kamera der Pinch-Jitter-Test als „simulierter Vorher/Nachher"-Beweis eingeblendet werden (`node --test test/library-pinch-jitter.test.js`).

## Nach dem Upload

- YouTube-Link in `README.md` unter „## Video" eintragen (aktuell Platzhalter).
- Ggf. als „unlisted" veröffentlichen, falls nur für die Abgabe bestimmt.
