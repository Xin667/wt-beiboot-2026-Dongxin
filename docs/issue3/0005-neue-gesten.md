# ADR 0005: Auswahl der neuen Gesten für Issue #3

**Date:** 2026-06-29  
**Author:** Dongxin Wang  
**Status:** Accepted

## Context and Problem Statement

Issue #3 verlangt mindestens zwei weitere Gesten aus der Mapping-Tabelle, zusätzlich zu den aus Issue #2 übernommenen Gesten.

## Betrachtete Kandidaten

| Interaktion | Geste | Reliabilität | Gewählt? |
|---|---|---|---|
| System aufwecken | Peace / V-Geste | Hoch | Ja |
| stop (Nah) | Thumbs-Down | Hoch | Ja |
| zurück/vor | Swipe (Wischbewegung) | Mittel | Nein |
| System schlafen | Augen schließen (Face) | Mittel | Nein |
| stop (Fern) | Faust | Hoch | Nein |

## Decision Outcome

Gewählt wurden **Peace** und **ThumbsDown**.

### Peace (System aufwecken)
Genau zwei Finger gestreckt (Zeige- + Mittelfinger), Rest eingeklappt. Bringt eine neue Fingerkombination, die sich klar von ThumbsUp (nur Daumen) und OpenHandStable (alle Finger) unterscheidet.

### ThumbsDown (Stop, Nahbereich)
Invertierte ThumbsUp-Logik: Daumenspitze UNTER Daumen-IP und UNTER Index-Basis, alle anderen Finger eingeklappt. Einfach, zuverlässig, direkt aus der Mapping-Tabelle.

### Nicht gewählt

**Swipe** wurde zunächst implementiert, aber wieder entfernt: Die bewegungsbasierte Erkennung (Wrist-Position-History über 300ms) erzeugte zu viele False Positives – normale Handbewegungen zwischen Gesten wurden fälschlich als Wischbewegung erkannt. Die Trennschärfe zwischen „absichtlichem Wischen" und „Hand bewegt sich gerade" war in der Praxis nicht robust zu lösen.

**Augen schließen (Face)** wurde ebenfalls implementiert und wieder entfernt: In Issue #2 wurde keine Face-basierte Gestenerkennung entwickelt, daher passt eine Face-Geste nicht konsistent in den Projektaufbau.

**Faust** wurde nicht gewählt, da sie algorithmisch zu ähnlich zu OpenHandStable wäre (invertierte Bedingung: alle Finger eingeklappt statt gestreckt).

## Consequences

Die Library hat sechs Gesten, alle auf Hand-Landmarks basierend:

| Paradigma | Gesten |
|---|---|
| Statische Pose (Fingervergleiche) | ThumbsUp, ThumbsDown, Peace |
| Distanzbasiert | Pinch |
| Zustandsbehaftet (Haltezeit) | OpenHandStable |
| Zweihand-Tracking | TwoHandZoom |
