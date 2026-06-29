# Auswahl der Gesten für die prototypische Implementierung

**Date:** 2026-05-25 
**Author:** Dongxin Wang
**Status:** Accepted

## Context and Problem Statement

Aus der Mapping-Tabelle (`gestenvokabular.md`) müssen ein bis zwei Gesten für die prototypische Umsetzung ausgewählt werden. Die Auswahl soll nicht nur technisch funktionieren, sondern möglichst unterschiedliche algorithmische Probleme abdecken.

## Considered Options

* Implementierbare Gesten (z.B. Pinch)
* Start + Zoom-out, jeweils für Nah- und Fernbereich (vier Varianten)

## Decision Outcome

Gewählt wurde **Start + Zoom-out** in je zwei Varianten (Nah und Fern).

Die vier Varianten decken vier fundamental unterschiedliche Erkennungsstrategien ab:

* Start (Nah): statische Posenerkennung innerhalb eines Frames (Thumbs-Up)
* Start (Fern): Intentionserkennung über Zeit – Hand muss offen und stabil gehalten werden
* Zoom-out (Nah): Schwellenwertvergleich auf Basis euklidischer Distanz (Pinch)
* Zoom-out (Fern): Bewegungsimpuls über Frame-Delta zweier Handgelenke

## Consequences

**Positiv:**
* Prototyp demonstriert mehrere Erkennungsstrategien
* Gute Diskussionsgrundlage für Stärken und Grenzen koordinatenbasierter Gestenerkennung

**Negativ:**
* Mehr Implementierungsaufwand als eine einzelne Geste
* Wechselwirkungen zwischen den Varianten erfordern explizite Priorisierungslogik
