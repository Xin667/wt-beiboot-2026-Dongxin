# Contributing

Danke für dein Interesse! Das ist ein Studienprojekt (Beiboot-Projekt, Modul *Webtechnologien*, TH Köln, SoSe 2026) – Beiträge sind willkommen, laufen aber über die üblichen GitHub-Mechanismen.

## Entwicklung

- **Runtime null npm-Abhängigkeiten.** Die Library ist reines ES-Module-JavaScript. `npm` wird nur für `node --test` und die Entwicklungswerkzeuge (ESLint als devDependency) genutzt; die devDependency-Versionen sind über das `package-lock.json` fixiert (siehe README).
- **Node >= 18.13** zum Ausführen der Tests.

## Workflow

1. Issue aufmachen bzw. ein bestehendes aufgreifen.
2. Branch `feature/issue-N` von `main` abzweigen.
3. Änderung umsetzen, Tests ergänzen/aktualisieren.
4. `npm run check && npm test` grün bekommen.
5. Pull Request mit inhaltlicher Beschreibung öffnen, Issue referenzieren (`Closes #N`).

## Konventionen

- Commits nach [Conventional Commits](https://www.conventionalcommits.org/) (z.B. `feat:`, `fix:`, `docs:`, `test:`, `refactor:`).
- Neue Gesten erben von `BaseGesture` und halten den in `README.md` dokumentierten Vertrag ein (`name`, `description`, `detect()`).
- Architekturentscheidungen werden als ADR unter `docs/` dokumentiert (Format: Context / Options / Decision / Consequences).

## Tests

```bash
npm test        # alle Unit-Tests (node:test)
npm run check   # Syntax-Check aller Source-Dateien (node --check)
```

Test-Hilfen für synthetische MediaPipe-Hände liegen in `test/helpers.js` (`makeHand`, `landmark`, `countTransitions`).
