# Reibungspunkte beim Bauen der Präsentations-App (Issue #4)

Informelles Arbeitslog, geschrieben während des Baus von `src/presentation/`. Einzige Referenz: README.md (Abschnitt "Einführung in die Library" / "GestureLibrary: API-Referenz").

Format: Zeitpunkt, Beobachtung, Einordnung (blockierend / unschön / nur Anmerkung).

---

## Zusammenfassung: direkte Antworten auf die Kernfragen von Issue #4

**Was fehlte in der API?**
- Echte native Events (`EventTarget`/`CustomEvent`) statt eines bibliothekseigenen Callback-Systems (Beobachtungen 1, 2, 4). → behoben, ADR 0006.
- Eine zeitliche Dimension im Event-Modell: kein Debounce gegen Flackern, kein Trigger-Cooldown (Beobachtungen 6, 7). → bewusst nicht behoben, Zuordnung Library vs. App aber entschieden (ADR 0006).
- `unregister()`/`getRegisteredGestures()`/`getGesture()` fehlten in der README-API-Tabelle (Beobachtung 3b). → behoben per README-Ergänzung.

**Was war unintuitiv?**
- Dass `onGesture`/`onChange` konzeptionell "Events" sind, war aus der README nicht ersichtlich (Beobachtung 3); die Unsubscribe-Konvention weicht vom `removeEventListener`-Muster ab (Beobachtung 4).
- Wie schwer ein "sauberes Ende" der Geste – Voraussetzung für erneutes Triggern im edge-triggered Modell – in der Praxis zu erreichen ist, zeigte erst der Webcam-Test, nicht die Doku (Beobachtung 6).

**Was musste an der Library geändert/ergänzt werden?**
- `GestureLibrary extends EventTarget`, dispatcht `'gesture'`/`'gesturestart'`/`'gestureend'` als `CustomEvent`s; `onGesture`/`onChange` bleiben als kompatible Wrapper (ADR 0006). Dazu README-Ergänzungen (Events-Sektion, fehlende Methoden).
- Bewusst nicht geändert: Debounce/Cooldown – Abwägung dokumentiert in ADR 0006, "Weitere beobachtete Reibung".

---

## 2026-07-10

**Beobachtung 1 – `onChange`-Payload vs. natives DOM-Event**
Beim Verdrahten von `lib.onChange(callback)` musste der Callback ein Objekt der Form `{type, gesture, result?}` selbst auswerten (`if (event.type === 'start') ...`). Das ist funktional völlig okay, aber es ist ein **eigenes** Objektformat, keine `Event`-Instanz. Kein `event.target`, kein `event.preventDefault()`, keine Kompatibilität mit generischen Event-Utilities.

**Beobachtung 2 – Zwei verschiedene Subscription-Mechanismen für dieselbe Aktion**
Der Keyboard-Fallback (Pfeiltasten, zum Testen ohne Kamera) wird natürlich über `window.addEventListener('keydown', handler)` angebunden. Für Gesten gibt es aber kein `lib.addEventListener(...)` – nur `lib.onChange(...)` mit eigener Payload-Form und eigener Unsubscribe-Konvention. Zwei konzeptionell identische Eingabequellen ("Ereignis eingetreten → reagiere") brauchen also zwei verschiedene Registrierungs-APIs und einen manuellen Adapter, um im selben Action-Handler (`applyGesture`) zu landen.

**Einordnung:** nicht blockierend, aber unschön – und im Widerspruch zum Projektziel in `PROJECT.md` ("Körperdaten ... als Custom Browser Events ... mit einem simplen Event Listener"). Wahrscheinlichster Kandidat für die Library-Änderung in Phase B / ADR 0006.

**Beobachtung 3 – `onChange`/`onGesture` in README nicht als "Event", sondern als "Callback" beschrieben**
Die README-Methodentabelle listet `onGesture(callback)` / `onChange(callback)` neben `register()`/`update()` als gleichwertige Methoden – es gibt keinen Hinweis darauf, dass hier ein Event-artiges Konzept gemeint ist. Für jemanden, der nur die README liest (nicht `src/lib/`), ist nicht ersichtlich, dass man hier eigentlich "Events" abonniert und keine gewöhnliche Methode aufruft, die z.B. einmalig etwas zurückgibt.

**Beobachtung 3b – Öffentlich genutzte Methoden fehlten in der README-API-Tabelle**
Für eine Debug-Ausgabe (Anzeige der registrierten Gesten) bot die README-Methodentabelle keine Abfrage-Methode an. Tatsächlich existieren `unregister(name)`, `getRegisteredGestures()` und `getGesture(name)` längst und werden von der offiziellen Issue-#3-Demo genutzt – sie fehlten schlicht in der README. Reine Doku-Lücke: Wer strikt nur die README als Referenz nimmt, hält diese Methoden für nicht-existent. Behoben durch README-Ergänzung (kein Library-Code geändert).

**Beobachtung 4 – Unsubscribe-Konvention weicht vom Web-Standard ab**
`lib.onChange(callback)` gibt eine Unsubscribe-*Funktion* zurück (`const unsub = lib.onChange(cb); unsub();`), während der native Weg für den Keyboard-Fallback `removeEventListener('keydown', handler)` wäre (Handler-Referenz statt Rückgabewert). In der App wird aktuell kein Unsubscribe benötigt (App läuft bis zum Tab-Schließen), aber bei einer hypothetischen Aufräum-Funktion (`teardown()`) müssten zwei unterschiedliche Muster nebeneinander gepflegt werden – ein weiteres Symptom derselben Grundursache wie Beobachtung 2.

**Beobachtung 5 – App-seitige State-Gate-Logik statt Library-Unterstützung**
Für "Peace weckt auf, danach reagieren nur noch ThumbsUp/ThumbsDown" gibt es keine Library-Unterstützung (z.B. Gesten dynamisch pausieren). Die App filtert stattdessen selbst im `applyGesture`-Handler nach `appState`. Das ist einfach genug, dass keine Umgehung über `unregister()`/erneutes `register()` nötig war – wird hier explizit *nicht* als Problem gewertet, da eine App-seitige Lösung sauberer ist als Umregistrierung zur Laufzeit.

**Zwischenfazit nach Phase A:** Der klarste, wiederholt auftretende Reibungspunkt ist die Diskrepanz zwischen dem bibliothekseigenen `onGesture`/`onChange`-Callback-System und einem echten `EventTarget`/`CustomEvent`-basierten Ansatz (Beobachtungen 1, 2, 3, 4). Das deckt sich mit dem in `PROJECT.md` formulierten Ziel und wird in Phase B als das EINE zu behebende API-Problem ausgewählt (→ ADR 0006).

---

## 2026-07-14 – Echter Webcam-Test (Nutzer-Feedback)

Nach dem ersten funktionsfähigen Stand von `src/presentation/` per Webcam getestet (nicht nur Keyboard-Fallback). Zwei neue Befunde aus echter Nutzung:

**Beobachtung 6 – Wiederholtes Triggern unerwartet schwer**
Um zweimal hintereinander zu blättern, reichte kurzes Einklappen des Daumens nicht – zuverlässig funktionierte nur, die Hand komplett aus dem Bild zu nehmen. Ursache: `gesturestart` feuert nur beim Übergang *nicht-erkannt → erkannt*; die Erkennung hat aber keine Hysterese um ihre Schwelle, sodass der erkannte Zustand durch Landmark-Rauschen knapp über der Schwelle "klebt". Beim reinen Lesen der README nicht vorhersehbar.

**Beobachtung 7 – Flackern: mehrere Folien auf einmal**
In 1 von 3 Testläufen sprang die Präsentation bei einer einzigen gehaltenen Geste mehrere Folien weiter: Die Erkennung flackerte nahe der Schwelle (`detected: true → false → true` binnen weniger Frames), jede neue `start`-Flanke löste sofort erneut aus. Es gibt keinerlei Mindestabstand zwischen zwei Transitions-Events derselben Geste.

**Root Cause und Design-Entscheidung (Kurzfassung):** Beide Befunde sind Symptome derselben fehlenden Eigenschaft – dem Event-Modell fehlt eine zeitliche Dimension (weder Debounce des Rohsignals noch Cooldown zwischen Trigger-Events). Entschieden, aber in diesem Issue bewusst nicht implementiert: Signal-Debounce gehört in die Library, Trigger-Cooldown als UX-Policy in die App – ausführliche Begründung siehe ADR 0006, "Weitere beobachtete Reibung".

**Einordnung:** nicht blockierend für die Kernfunktion, aber ein zweiter, eigenständiger API-Befund – bewusst nur dokumentiert, um den Scope auf ein behobenes Problem zu begrenzen (Akzeptanzkriterium: „mindestens ein" Problem beheben, nicht alle).

---

## 2026-07-14 – Regressionstest `src/demo` (Bestätigung von Beobachtung 7)

Nach der Library-Änderung (EventTarget, ADR 0006) wurde `src/demo/index.html` regressionsgeprüft (alle 6 Gesten über die `onChange`-Wrapper, kein Bezug zur Präsentations-App). Ergebnis: keine Konsolenfehler, alle Gesten funktionieren – aber **Pinch flackert im Event-Log (`#event-log`) auffällig stark**: mehrere START/END-Paare pro Sekunde bei durchgehend gehaltener Geste, deutlich mehr als bei den anderen fünf Gesten.

Auszug aus dem Event-Log:

```
[17:14:09] START pinch
[17:14:09] END pinch
[17:14:09] START pinch
[17:14:09] END pinch
[17:14:09] START pinch
[17:14:09] END pinch
[17:14:10] START pinch
[17:14:10] END pinch
```

**Bedeutung:** Dieser Test lief vollständig unabhängig von `src/presentation/` – bestätigt damit, dass Beobachtung 7 (Flackern) kein Artefakt der Präsentations-App ist, sondern ein Signal-Problem auf Ebene der `PinchGesture`-Erkennung bzw. der library-internen Start/End-Diff-Logik. Wahrscheinliche Ursache bei Pinch speziell: Der Schwellenwert (`threshold: 0.04`, Distanz LM4↔LM8) hat keine Hysterese – liegt die tatsächliche Distanz nahe 0.04, kippt der Vergleich durch Landmark-Jitter ständig, jeder Kipp erzeugt ein neues START/END-Paar.

**Einordnung:** bestätigt (nicht mehr nur vermutet) blockierend für jede reale Nutzung von Pinch als Trigger-Quelle über `onChange`/`gesturestart`. Verstärkt die Empfehlung in ADR 0006, Debounce in einer künftigen Iteration auf Library-Ebene zu lösen.
