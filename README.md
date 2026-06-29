# Issue #3: Von Einzelgesten zur wiederverwendbaren Bibliothek

## Überblick

Die vier prototypischen Gesten aus Issue #2 wurden zusammen mit zwei neuen Gesten in eine eigenständige, erweiterbare Gesture Library überführt. Die Library ist von der Demo-Anwendung getrennt und kann von Dritten genutzt werden.

## Akzeptanzkriterien

| Kriterium | Status | Nachweis |
|---|---|---|
| Gestenlogik in eigenständiger Library, getrennt von Demo | ✅ | `src/lib/` (Library) vs. `src/demo/` (Anwendung) |
| Mind. 4 Gesten (2 aus #2 + 2 neue) implementiert | ✅ | 6 Gesten: 4 aus #2 + 2 neue (Swipe, Peace) |
| Neue Gesten hinzufügbar ohne bestehenden Code zu ändern | ✅ | `BaseGesture` erben → `lib.register()`, Beispiel in API-Doku |
| Öffentliche API dokumentiert | ✅ | `docs/issue3/api-dokumentation.md` |
| Designentscheidungen in Decision Records | ✅ | ADR 0004 (Architektur), ADR 0005 (Gestenauswahl) |

## Was sich gegenüber Issue #2 geändert hat

| Issue #2 | Issue #3 |
|---|---|
| `detectGestures()` – eine Funktion mit if/else | Sechs eigenständige Klassen unter `src/lib/gestures/` |
| Schwellenwerte direkt im Code | Konfigurierbar per Konstruktor-Optionen |
| Gestenlogik und UI vermischt | Library (`src/lib/`) hat keine DOM-Abhängigkeiten |
| Nur 4 Gesten | 6 Gesten mit 4 verschiedenen Erkennungsparadigmen |

## Die sechs Gesten

| Geste | Interaktion | Paradigma | Herkunft |
|---|---|---|---|
| ThumbsUp | Start (Nah) | Statische Pose | Issue #2 |
| Pinch | Zoom-out (Nah) | Distanzbasiert | Issue #2 |
| OpenHandStable | Start (Fern) | Haltezeit-Stabilisierung | Issue #2 |
| TwoHandZoom | Zoom-out (Fern) | Zweihand-Tracking | Issue #2 |
| **Swipe** | **zurück/vor** | **Bewegungs-History** | **Issue #3** |
| **Peace** | **System aufwecken** | **Fingerkombination** | **Issue #3** |

## Lokal starten

```bash
cd src
python3 -m http.server 8080
# → http://localhost:8080/demo/
```

## Dokumentation

- [API-Dokumentation](api-dokumentation.md) – Schnellstart, alle Gesten, eigene Geste schreiben
- [ADR 0004: Library-Architektur](0004-library-architektur.md) – Registry-Pattern vs. Monolith
- [ADR 0005: Neue Gesten](0005-neue-gesten.md) – Warum Swipe und Peace, warum nicht Fist oder X
- [Zeiterfassung](time-tracking.md)
