# ADR 0005: Auswahl der neuen Gesten für Issue #3

**Date:** 2026-07-XX  
**Author:** Dongxin Wang  
**Status:** Accepted

## Context and Problem Statement

Issue #3 verlangt mindestens zwei weitere Gesten aus der Mapping-Tabelle (`gestenvokabular.md`), zusätzlich zu den vier aus Issue #2 übernommenen Gesten (Pinch, ThumbsUp, OpenHandStable, TwoHandZoom).

Die Auswahl soll möglichst unterschiedliche algorithmische Ansätze abdecken – analog zur Begründung in ADR 0002.

## Betrachtete Kandidaten

Aus der Mapping-Tabelle (noch nicht implementiert):

| Interaktion | Geste | Neue Konzepte? | Reliabilität |
|---|---|---|---|
| zurück/vor | Swipe (Wischbewegung) | Ja: zeitbasiert, History | Hoch (große Deltas) |
| System aufwecken | Peace / V-Geste | Ja: neue Fingerkombination | Hoch |
| stop | Thumbs-Down | Nein: invertiertes ThumbsUp | Hoch |
| stop (Fern) | Faust | Teilweise: alle Finger eingeklappt | Hoch |
| zoom-in | Spreizen | Nein: invertierter Pinch | Hoch |
| System schlafen | X mit zwei Zeigefingern | Ja, aber: braucht zwei Hände | Mittel |

## Decision Outcome

Gewählt wurden **Swipe** und **Peace**.

### Swipe (zurück/vor)
**Begründung:** Die vier Issue-#2-Gesten erkennen alle statische Zustände innerhalb eines Frames (auch OpenHandStable, deren Zeitfenster nur der Stabilisierung dient). Swipe führt ein fundamental neues Paradigma ein: **Bewegungsanalyse über mehrere Frames hinweg**. Der Algorithmus speichert eine Positions-History und berechnet die Netto-Verschiebung über ein gleitendes Zeitfenster. Das ist eine qualitativ andere Art der Erkennung als Schwellenwertvergleiche auf statischen Koordinaten.

Implementierungsdetails:
- History: Speichert die letzten 30 Handgelenkpositionen (LM 0) mit Timestamp
- Zeitfenster: 300ms – Verschiebung = aktuelle Position minus Position vor 300ms
- Threshold: 0.12 (normalisiert) – bei normaler Armlänge ca. 12% der Bildbreite
- Richtung: dominante Achse gewinnt (|dx| > |dy| → horizontal)
- Display-Phase: 500ms – nach Erkennung bleibt die Geste für die UI sichtbar aktiv
- Cooldown: 600ms NACH der Display-Phase bis zur nächsten möglichen Erkennung
- Swipe ist eine Ereignis-Geste (einmalig ausgelöst), keine Pose (durchgehend gehalten)

### Peace (System aufwecken)
**Begründung:** Die bisherigen Gesten prüfen entweder „alle Finger eingeklappt" (ThumbsUp), „alle Finger gestreckt" (OpenHandStable), oder zwei spezifische Finger gegeneinander (Pinch). Peace bringt eine neue Kombination: **genau zwei bestimmte Finger gestreckt, der Rest eingeklappt**. Das testet die Fähigkeit der Library, differenzierte Fingerzustandsprüfungen auszudrücken. Die Geste ist laut Mapping-Tabelle als „bewusste Geste" mit hoher Reliabilität eingestuft.

Implementierungsdetails:
- Zeige- und Mittelfinger gestreckt (tip.y < mcp.y)
- Ring- und kleiner Finger eingeklappt (tip.y > mcp.y)
- Daumen wird bewusst NICHT geprüft: Bei der V-Geste variiert die Daumenposition stark (eingeklappt, abgespreizt, neutral). Die Kombination Index+Middle gestreckt + Ring+Pinky eingeklappt ist bereits ausreichend eindeutig.
- Haltezeit: 400ms Stabilisierung

### Nicht gewählt

**Thumbs-Down** und **Zoom-in (Spreizen)** wurden nicht gewählt, weil sie algorithmisch invertierte Versionen bestehender Gesten wären und keine neuen Erkennungskonzepte einbringen.

**X-Geste (System schlafen)** wurde nicht gewählt, weil sie zwei Hände erfordert und MediaPipe bei sich kreuzenden Händen bekannte Stabilitätsprobleme hat (dokumentiert in ADR 0003).

## Consequences

Die Library hat jetzt sechs Gesten mit vier Erkennungsparadigmen:

| Paradigma | Gesten |
|---|---|
| Statische Pose (Fingervergleiche) | ThumbsUp, Peace |
| Distanzbasiert (Punkt-zu-Punkt) | Pinch |
| Zustandsbehaftet (Haltezeit) | OpenHandStable |
| Bewegungsbasiert (History + Zeitfenster) | Swipe |
| Zweihand-Tracking | TwoHandZoom |

Das zeigt, dass die Library-Architektur (ADR 0004) flexibel genug ist, um konzeptionell verschiedene Gestentypen zu unterstützen.
