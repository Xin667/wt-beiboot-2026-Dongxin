# Reibungspunkte beim Bauen der Präsentations-App (Issue #4)

Informelles Arbeitslog, geschrieben während des Baus von `src/presentation/`. Einzige Referenz: README.md (Abschnitt "Einführung in die Library" / "GestureLibrary: API-Referenz") — **kein Blick in `src/lib/`** während dieser Phase.

Format: Zeitpunkt, Beobachtung, Einordnung (blockierend / unschön / nur Anmerkung).

---

## 2026-07-10

**Beobachtung 1 – `onChange`-Payload vs. natives DOM-Event**
Beim Verdrahten von `lib.onChange(callback)` musste der Callback ein Objekt der Form `{type, gesture, result?}` selbst auswerten (`if (event.type === 'start') ...`). Das ist funktional völlig okay, aber es ist ein **eigenes** Objektformat, keine `Event`-Instanz. Kein `event.target`, kein `event.preventDefault()`, keine Kompatibilität mit generischen Event-Utilities.

**Beobachtung 2 – Zwei verschiedene Subscription-Mechanismen für dieselbe Aktion**
Für den Keyboard-Fallback (Pfeiltasten als Ersatz für die Gesten, nützlich zum Testen ohne Kamera) ist `window.addEventListener('keydown', handler)` der naheliegende Weg – natives DOM-Event, Standard-API. Für die Gesten-Seite gibt es aber **kein** `lib.addEventListener(...)`; stattdessen `lib.onChange(...)`, ein bibliothekseigenes Pub/Sub-System mit eigener Unsubscribe-Konvention (Rückgabewert statt `removeEventListener`).

Ergebnis: Zwei strukturell identische Eingabequellen (Taste, Geste) müssen über zwei unterschiedliche Registrierungs-APIs angebunden werden, obwohl beide konzeptionell "ein Ereignis ist eingetreten, reagiere darauf" bedeuten. Um sie im selben Action-Handler (`applyGesture`) zusammenzuführen, war ein manueller Adapter nötig – kein struktureller Fehler, aber genau die Art Reibung, die bei einer echten `EventTarget`-basierten API nicht entstünde (`lib.addEventListener('gesturestart', ...)` würde sich 1:1 wie `window.addEventListener('keydown', ...)` verhalten).

**Einordnung:** nicht blockierend (die App funktioniert), aber unschön und **stimmt nicht mit dem in `PROJECT.md` formulierten Projektziel überein** ("Körperdaten ... als Custom Browser Events bereitstellt ... mit einem simplen Event Listener reagieren"). Das ist der wahrscheinlichste Kandidat für die Library-Änderung in Phase B / ADR 0006.

**Beobachtung 3 – `onChange`/`onGesture` in README nicht als "Event", sondern als "Callback" beschrieben**
Die README-Methodentabelle listet `onGesture(callback)` / `onChange(callback)` neben `register()`/`update()` als gleichwertige Methoden – es gibt keinen Hinweis darauf, dass hier ein Event-artiges Konzept gemeint ist. Für jemanden, der nur die README liest (nicht `src/lib/`), ist nicht ersichtlich, dass man hier eigentlich "Events" abonniert und keine gewöhnliche Methode aufruft, die z.B. einmalig etwas zurückgibt.

**Beobachtung 4 – Unsubscribe-Konvention weicht vom Web-Standard ab**
`lib.onChange(callback)` gibt eine Unsubscribe-*Funktion* zurück (`const unsub = lib.onChange(cb); unsub();`), während der native Weg für den Keyboard-Fallback `removeEventListener('keydown', handler)` wäre (Handler-Referenz statt Rückgabewert). In der App wird aktuell kein Unsubscribe benötigt (App läuft bis zum Tab-Schließen), aber bei einer hypothetischen Aufräum-Funktion (`teardown()`) müssten zwei unterschiedliche Muster nebeneinander gepflegt werden – ein weiteres Symptom derselben Grundursache wie Beobachtung 2.

**Beobachtung 5 – App-seitige State-Gate-Logik statt Library-Unterstützung**
Für "Peace weckt auf, danach reagieren nur noch ThumbsUp/ThumbsDown" gibt es keine Library-Unterstützung (z.B. Gesten dynamisch pausieren). Die App filtert stattdessen selbst im `applyGesture`-Handler nach `appState`. Das ist einfach genug, dass keine Umgehung über `unregister()`/erneutes `register()` nötig war – wird hier explizit *nicht* als Problem gewertet, da eine App-seitige Lösung sauberer ist als Umregistrierung zur Laufzeit.

**Zwischenfazit nach Phase A:** Der klarste, wiederholt auftretende Reibungspunkt ist die Diskrepanz zwischen dem bibliothekseigenen `onGesture`/`onChange`-Callback-System und einem echten `EventTarget`/`CustomEvent`-basierten Ansatz (Beobachtungen 1, 2, 3, 4). Das deckt sich mit dem in `PROJECT.md` formulierten Ziel und wird in Phase B als das EINE zu behebende API-Problem ausgewählt (→ ADR 0006).

---

## 2026-07-14 – Echter Webcam-Test (Nutzer-Feedback)

Nach dem ersten funktionsfähigen Stand von `src/presentation/` per Webcam getestet (nicht nur Keyboard-Fallback). Zwei neue, diesmal aus echter Nutzung stammende Befunde – beide zeigen dieselbe Grundursache: **dem Event-Modell der Library fehlt eine zeitliche Dimension** (Cooldown / Debounce / Mindestabstand zwischen zwei Auslösungen derselben Geste).

**Beobachtung 6 – Wiederholtes Triggern unerwartet schwer**
Um zweimal hintereinander zu blättern (z.B. zwei Folien vor), reichte es in der Praxis nicht, den Daumen kurz einzuklappen und wieder hochzustellen. Zuverlässig funktionierte nur: Hand komplett aus dem Bild nehmen und wieder hineinbringen.

Ursache: `onChange` (bzw. `gesturestart`) feuert nur beim Übergang *nicht-erkannt → erkannt*. Damit ein zweites `thumbs-up`-Event feuert, muss die Geste zwischenzeitlich zuverlässig in den Zustand *nicht-erkannt* fallen. `ThumbsUpGesture.detect()` hat aber keine Hysterese um die eigene Erkennungsschwelle (z.B. „Daumenspitze über Zeigefingerbasis“) – ein leichtes Absenken des Daumens genügt oft nicht, um den Schwellenwert sauber zu unterschreiten, während MediaPipes Landmark-Rauschen gleichzeitig dafür sorgt, dass der erkannte Zustand knapp über der Schwelle "klebt". Das ist erwartbares Verhalten eines edge-triggered Modells – aber die Reibung war real und hätte man beim reinen Lesen der README nicht vorhergesehen.

**Beobachtung 7 – Flackern: mehrere Folien auf einmal**
In 1 von 3 Testläufen sprang die Präsentation bei einer einzigen gehaltenen Geste mehrere Folien weiter statt einer. Wahrscheinlichste Erklärung: Die Erkennung "flackerte" nahe der Schwelle (`detected: true → false → true` innerhalb weniger Frames, vermutlich durch Landmark-Jitter), wodurch die Library mehrere `end`/`start`-Übergänge in sehr kurzer Zeit registrierte – jede neue `start`-Flanke löst laut aktueller Logik sofort `applyGesture()` erneut aus. Es gibt keinerlei Mindestabstand zwischen zwei Transitions-Events derselben Geste.

**Root-Cause-Analyse (beide Befunde gemeinsam):** Beobachtung 6 und 7 sehen gegensätzlich aus (zu schwer erneut auslösen vs. zu leicht ungewollt erneut auslösen), sind aber zwei Symptome derselben fehlenden Eigenschaft: Es gibt keine erzwungene *Mindestzeitspanne*, weder (a) bevor ein `end`-Übergang als "wirklich beendet" zählt (würde Flackern/Beobachtung 7 dämpfen), noch (b) bevor zwei aufeinanderfolgende `start`-Events derselben Geste als zwei bewusste, unabhängige Nutzeraktionen gelten (würde ungewolltes Mehrfach-Blättern bei Beobachtung 7 zusätzlich abfedern und wäre orthogonal zu Beobachtung 6, die eher ein Detection-Schwellenwert-Problem ist als ein Event-Timing-Problem). Kurz: Sowohl "Debounce des Rohsignals" als auch "Cooldown zwischen Trigger-Events" fehlen komplett.

**Design-Entscheidung: Gehört ein Cooldown-Mechanismus in die Library oder in die App?**

Bewusst abgewogen, aber **nicht in diesem Issue implementiert** (Scope bleibt auf die EventTarget-Umstellung als das eine zu behebende Problem beschränkt, siehe ADR 0006). Empfehlung für zukünftige Arbeit:

- **Debounce des Rohsignals gegen Flackern (Beobachtung 7) gehört in die Library.** Begründung: Jeder Consumer, der `update()` pro Frame aufruft, wäre von genau demselben MediaPipe-Jitter betroffen — eine App-seitige Lösung müsste pro Gesture-Name eigene Zeitstempel mitführen und würde faktisch den internen Übergangs-Zustand der Library (`_activeGestures`-Diffing in `_emitChanges()`) duplizieren. Das ist bereits Library-Verantwortung (vgl. `holdMs` als bestehendes Präzedenzbeispiel für zeitbasierte Stabilisierung einzelner Gesten) und sollte daher als generischer Mechanismus auf Engine-Ebene gelöst werden, nicht pro App neu erfunden.
- **Ein bewusster Cooldown zwischen zwei beabsichtigten Trigger-Events (z.B. "frühestens alle 400ms erneut feuern") ist dagegen eine App-/Domänen-Policy und gehört in die App.** Begründung: Der sinnvolle Wert ist stark vom Use-Case abhängig (eine Präsentation will spürbare Pausen zwischen Folienwechseln; ein hypothetischer Zoom- oder Zeichen-Controller will dagegen möglichst kontinuierlich reagieren). Ein globaler, in der Library festverdrahteter Cooldown-Wert würde andere Consumer (z.B. `TwoHandZoomGesture`, die bereits ihr eigenes zeitbasiertes Delta-Tracking mitbringt) unnötig einschränken.
- Kurzum: **Signal-Debounce (Rauschen wegfiltern) = Library-Aufgabe, Trigger-Cooldown (UX-Taktung) = App-Aufgabe.** Diese Trennung wird im ADR unter "Weitere beobachtete Reibung (bewusst nicht behoben)" festgehalten, damit eine spätere Iteration nicht erneut bei null anfangen muss.

**Einordnung:** nicht blockierend für die Kernfunktion der App, aber ein zweiter, eigenständiger API-Befund neben der EventTarget-Frage – bewusst dokumentiert statt in diesem Issue mitbehoben, um den Scope auf ein Problem zu begrenzen (Akzeptanzkriterium: „mindestens ein" Problem beheben, nicht alle).

---

## 2026-07-14 – Regressionstest `src/demo` (Bestätigung von Beobachtung 7)

Nach der Library-Änderung (EventTarget, ADR 0006) wurde `src/demo/index.html` regressionsgeprüft (alle 6 Gesten über die `onChange`-Wrapper, kein Bezug zur Präsentations-App). Ergebnis: keine Konsolenfehler, alle Gesten funktionieren – aber **Pinch flackert im Event-Log (`#event-log`) auffällig stark**: mehrere START/END-Paare pro Sekunde bei durchgehend gehaltener Geste, deutlich mehr als bei den anderen fünf Gesten.

Beispielhafter Ausschnitt (Format wie im Demo-Log, `[${time}] ${TYPE} ${gesture}`; illustrativ nach der Beschreibung des Testers, keine exakt mitgeschnittenen Zeitstempel):

```
[14:22:03] START pinch
[14:22:03] END pinch
[14:22:03] START pinch
[14:22:04] END pinch
[14:22:04] START pinch
[14:22:04] END pinch
```

**Bedeutung:** Dieser Test lief vollständig unabhängig von `src/presentation/` – bestätigt damit, dass Beobachtung 7 (Flackern) kein Artefakt der Präsentations-App ist, sondern ein Signal-Problem auf Ebene der `PinchGesture`-Erkennung bzw. der library-internen Start/End-Diff-Logik (`_emitChanges()` in `GestureLibrary.js`). Stärkt die bereits getroffene Design-Entscheidung: Debounce des Rohsignals gehört in die Library, nicht in einzelne Consumer-Apps – jeder Consumer, der Pinch (oder eine andere schwellenwertbasierte Geste) über `onChange`/`gesturestart` als Trigger nutzt, wäre gleichermaßen betroffen.

Wahrscheinliche Ursache bei Pinch speziell: Der Schwellenwert (`threshold: 0.04`, Distanz LM4↔LM8) hat keine Hysterese. Liegt die tatsächliche Distanz nahe 0.04, kippt der Frame-für-Frame-Vergleich durch MediaPipe-Landmark-Jitter ständig zwischen „< Threshold" und „≥ Threshold" – jeder Kipp erzeugt ein neues START/END-Paar.

**Einordnung:** bestätigt (nicht mehr nur vermutet) blockierend für jede reale Nutzung von Pinch als Trigger-Quelle über `onChange`/`gesturestart`. Verstärkt die Empfehlung in ADR 0006 ("Weitere beobachtete Reibung"), Debounce in einer künftigen Iteration auf Library-Ebene zu lösen.
