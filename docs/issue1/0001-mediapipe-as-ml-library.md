# ADR 0001: MediaPipe als ML-Library für Körperdaten-Erkennung

**Date:** 2026-05-15 
**Author:** Dongxin Wang
**Status:** Accepted

## Context

Das Projekt benötigt eine ML-Library, die Körperdaten (Hände, Pose, Gesten) in Echtzeit im Browser erkennt, zwar ohne Server, nur clientseitig.  

Zur Wahl standen:
- **MediaPipe (Google):** 
1. Umfassendes Vision-Framework, WebAssembly (WASM), GPU-Delegate
2. Breite Abdeckung (Hand, Pose, Gesicht)
3. Apache 2.0 Lizenz (Open source)

- **TensorFlow.js:** 
Allgemeines ML-Framework, größerer Konfigurationsaufwand, weniger spezialisiert auf Vision-Tasks

- **hand-pose-detection:** 
Leichtgewichtig, aber nur für Hände. Zu eingeschränkt für den geplanten Funktionsumfang der Library

## Decision

Ich verwende **MediaPipe Tasks Vision** als primäre ML-Library.

## Consequences

**Positiv:**
- Einheitliche API für verschiedene Körperdaten-Typen 
- Gute Performance durch WebAssembly und GPU-Delegate im Browser
- Klare, entwicklerfreundliche Initialisierung
- Open-Source-kompatible Lizenz (Apache 2.0)

**Negativ:**
- Größere initiale Ladezeit
- Verdeckte Landmarks werden interpoliert statt als fehlend markiert, die Library-Schicht muss später Konfidenzwerte berücksichtigen