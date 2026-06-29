# Algorithmus und Stabilitätsmaßnahmen für die Gestenerkennung

**Date:** 2026-05-27 
**Author:** Dongxin Wang
**Status:** Accepted

## Context and Problem Statement

Die rohen Koordinaten von MediaPipe müssen in diskrete, benannte Events umgewandelt werden. Konkrete Schwellenwerte und Stabilitätsmaßnahmen sind nötig, um zufällige Bewegungen von bewussten Gesten zu trennen.

## Considered Options

* Feste Schwellenwerte ohne Zeitfenster
* Feste Schwellenwerte mit Zeitfenster und Prioritätslogik

## Decision Outcome

Gewählt wurden **feste Schwellenwerte kombiniert mit einem Zeitfenster und einer Prioritätsreihenfolge**. Die konkreten Werte wurden durch iteratives Testen ermittelt:

| Geste | Parameter | Wert |
| :--- | :--- | :--- |
| Zoom-out (Nah) | Maximale Pinch-Distanz (LM 4 & 8) | < 0.04 |
| Start (Nah) | Daumenspitze über Zeigefingerbasis (LM 5) | y(4) < y(5) |
| Start (Fern) | Minimale Haltedauer bei offener Hand | 1500 ms |
| Start (Fern) | Maximale Handbewegung pro Frame | < 0.015 |
| Zoom-out (Fern) | Minimale Annäherung pro Frame | > 0.01 |
| Zoom-out (Fern) | Mindestabstand beider Hände | > 0.2 |

Zusätzlich wurde eine feste Prioritätsreihenfolge eingeführt: Pinch → Thumbs-Up → Hand stabil. So kann immer nur eine Geste gleichzeitig aktiv sein.

### Positive Consequences

* Zuverlässige Erkennung unter kontrollierten Bedingungen
* Zeitfenster bei Start (Fern) verhindert unbeabsichtigte Auslösung durch kurze Armbewegungen
* Mindestabstand > 0.2 umgeht einen bekannten MediaPipe-Bug bei sich kreuzenden Händen

### Negative Consequences

* Start (Fern) erkennt auch bei mittlerer Entfernung, da der z-Wert von MediaPipe zu stark verrauscht ist für eine zuverlässige Tiefenschwelle
* Schwellenwerte sind auf normale Lichtverhältnisse und durchschnittliche Handgröße kalibriert – bei abweichenden Bedingungen kann die Erkennungsrate sinken
* Werte sind direkt im Code eingebettet und nicht zur Laufzeit konfigurierbar