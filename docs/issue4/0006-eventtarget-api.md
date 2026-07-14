# GestureLibrary als EventTarget statt eigenem Callback-System

**Date:** 2026-07-14
**Author:** Dongxin Wang
**Status:** Accepted

## Context and Problem Statement

`PROJECT.md` formuliert das eigentliche Ziel des Gesamtprojekts explizit: Körperdaten sollen "als Custom Browser Events" bereitgestellt werden, sodass jede Web-Anwendung "mit einem simplen Event Listener" darauf reagieren kann. Die bis Issue #3 gebaute `GestureLibrary` erfüllt das nicht: `onGesture(callback)` und `onChange(callback)` sind ein bibliothekseigenes, `Set`-basiertes Pub/Sub-System – kein `EventTarget`, kein `addEventListener`, keine echten `Event`-Instanzen.

Beim Bau der Präsentations-App in Issue #4 (`src/presentation/`, ausschließlich gegen die in README.md dokumentierte öffentliche API gebaut) wurde diese Diskrepanz konkret spürbar (vollständiges Log: `docs/issue4/friction-notes.md`):

- Die App verdrahtet zwei strukturell identische Eingabequellen – Gesten und einen Keyboard-Fallback (Pfeiltasten/„W" zum Testen ohne Kamera). Für die Tastatur ist `window.addEventListener('keydown', ...)` der native, naheliegende Weg. Für Gesten gab es kein Äquivalent; `lib.onChange(...)` erwartet ein eigenes Payload-Format (`{type, gesture, result?}`) statt einer `Event`-Instanz und hat eine eigene Unsubscribe-Konvention (Rückgabewert statt `removeEventListener`).
- Die README-Methodentabelle listet `onGesture`/`onChange` unauffällig neben `register()`/`update()` – ohne Hinweis darauf, dass hier eigentlich ein Event-Konzept gemeint ist.

Diese Beobachtungen (Details: Beobachtungen 1–4 in `friction-notes.md`) treten wiederholt auf und lassen sich alle auf dieselbe Ursache zurückführen: fehlende `EventTarget`-Konformität.

## Considered Options

* **Option A – Status quo:** `onGesture`/`onChange` bleiben eigenständige Callback-Methoden.
* **Option B – Vollständiger Ersatz:** `onGesture`/`onChange` werden entfernt, alle Consumer müssen auf `addEventListener` umsteigen.
* **Option C – `EventTarget` + Kompatibilitäts-Wrapper (gewählt):** `GestureLibrary extends EventTarget`, dispatcht `CustomEvent`s (`gesture`, `gesturestart`, `gestureend`); `onGesture`/`onChange` bleiben als dünne Wrapper um `addEventListener`/`removeEventListener` erhalten.

## Decision Outcome

Gewählt: **Option C**.

- Löst die Diskrepanz zu `PROJECT.md` vollständig: `lib.addEventListener('gesturestart', cb)` verhält sich strukturell identisch zu `window.addEventListener('keydown', cb)` – im Präsentations-Code direkt nebeneinander sichtbar (`src/presentation/app.js`).
- Im Gegensatz zu Option B bricht **Option A**+**B** die bestehende Demo-Anwendung aus Issue #3 (`src/demo/app.js`) nicht: Diese nutzt ausschließlich `lib.onChange(...)`, was mit Option C unverändert weiterläuft, da der Wrapper exakt dieselbe Signatur und dasselbe Payload-Format zurückgibt.
- Kein neuer Abhängigkeits-Bedarf: `class X extends EventTarget` ist in allen evergreen Browsern (Chrome/Firefox/Safari 14+) nativ unterstützt, kein Polyfill nötig (KISS-Vorgabe bleibt erfüllt).

## Positive Consequences

* Gesten- und andere DOM-Events (Tastatur, Maus, …) lassen sich mit derselben, den Entwickler:innen bereits bekannten API kombinieren – erfüllt das in `PROJECT.md` formulierte Projektziel.
* Bestehende Consumer (`src/demo/app.js`) benötigen keine Änderung.
* Native `Event`-Semantik (z.B. `e.detail`) statt Ad-hoc-Objektform – besser erweiterbar (z.B. `once: true` bei `addEventListener` funktioniert automatisch mit).

## Negative Consequences

* **Reentrancy nicht behandelt (akzeptiert):** `dispatchEvent()` läuft synchron innerhalb der `update()`-Schleife. Ruft ein Listener synchron erneut `update()`/`resetAll()` auf, würde gemeinsamer State (`_activeGestures`, `_lastResults`) mitten in der äußeren Iteration mutiert. Bestand strukturell bereits vorher identisch mit dem `Set`-basierten Callback-System – keine neue Fehlerklasse, kein Consumer im Repo tut dies.
* **`dispose()` schwächer:** `EventTarget` kennt kein Bulk-Unsubscribe. Consumer, die `addEventListener` direkt statt `onGesture`/`onChange` nutzen, müssen sich selbst abmelden (Standard-EventTarget-Verhalten, aber eine Verhaltensänderung gegenüber der alten `dispose()`-Implementierung, die alle `_listeners`/`_changeListeners` leerte).
* **Leichte `detail`-Asymmetrie:** `gesture`/`gesturestart` tragen `result` im `detail`, `gestureend` nicht (spiegelt bewusst die bisherige `onChange`-Asymmetrie, um Abwärtskompatibilität zu wahren).

## Weitere beobachtete Reibung (bewusst nicht in diesem Issue behoben)

Beim echten Webcam-Test der Präsentations-App (siehe `friction-notes.md`, Abschnitt 2026-07-14) zeigten sich zwei weitere, unabhängige Befunde: (1) wiederholtes Triggern derselben Geste war unerwartet schwer (Hand musste komplett aus dem Bild und zurück), (2) vereinzeltes Flackern der Erkennung führte zu mehreren Folienwechseln pro gehaltener Geste. Beide Symptome lassen sich auf dieselbe fehlende Eigenschaft zurückführen: dem Event-Modell fehlt jede zeitliche Dimension (kein Debounce des Rohsignals, kein Cooldown zwischen zwei Trigger-Events).

Diese Änderung wird **bewusst nicht in Issue #4 umgesetzt** – das Akzeptanzkriterium verlangt die Behebung eines API-Problems, nicht aller gefundenen. Empfehlung für eine künftige Iteration (ausführliche Begründung in `friction-notes.md`):

- **Debounce des Rohsignals gegen Flackern gehört in die Library**, da jeder Consumer identisch von MediaPipe-Jitter betroffen wäre und die Library bereits mit `holdMs` ein Präzedenzbeispiel für zeitbasierte Stabilisierung liefert.
- **Ein bewusster Cooldown zwischen zwei beabsichtigten Trigger-Events ist App-/Domänen-Policy** (abhängig vom Use-Case, z.B. Präsentation vs. kontinuierlicher Zoom-Controller) und sollte in der App bleiben.

## Links

* `docs/issue4/friction-notes.md` – vollständiges Beobachtungslog, Grundlage dieser Entscheidung
* `docs/issue3/0004-library-architektur.md` – Registry-Pattern, auf dem `GestureLibrary` aufbaut
* `PROJECT.md` – Projektziel ("Custom Browser Events", "simpler Event Listener")
* `src/lib/GestureLibrary.js`, `src/presentation/app.js`
