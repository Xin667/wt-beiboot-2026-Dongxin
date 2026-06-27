# Web Technologies // Body Data PoC

Begleitprojekt zum Modul Web Technologies. Das Projekt wird von Issue zu Issue weiterentwickelt, wobei Fortschritte durch Code Reviews und Präsentationen begleitet werden.

Ziel ist die browserbasierte Erfassung und Verarbeitung von Körperdaten (Hand- und Gesichtsbewegungen) über die Kamera – sowie die Steuerung von Interaktionen durch Gestenerkennung.

## Team
Author: [Dongxin Wang](https://github.com/Xin667)

Reviewer: [Christian Noss](https://github.com/cnoss)

## Quick Start

Keine Installation notwendig. Die Anwendung läuft direkt im Browser.

1. Repository klonen
2. In `index.html` mit z.B VS Code "Go Live" starten
3. Kamerazugriff von der Browser erlauben

> Ein lokaler Webserver ist notwendig, da MediaPipe die Modelldateien per HTTP lädt. Das direkte Öffnen der Datei im Browser funktioniert nicht.

## Decision Records

Die Architekturentscheidungen sind nach Issue dokumentiert:

* [Issue 1 – ML-Library](./docs/issue1/0001-mediapipe-as-ml-library.md)
* [Issue 2 – Gestenauswahl](./docs/issue2/0002-gestenauswahl.md)
* [Issue 2 – Algorithmus & Stabilität](./docs/issue2/0003-algorithmus-und-stabilitaet.md)

## Process Documentation

* [Time Tracking Issue 1](./docs/issue1/time-tracking.md)
* [Time Tracking Issue 2](./docs/issue2/time-tracking.md)

## Notes

This implementation is a prototype.