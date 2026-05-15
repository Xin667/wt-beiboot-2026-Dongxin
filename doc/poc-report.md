# PoC Observation Report: MediaPipe Hand Landmarker

## Koordinatensystem & Datenstruktur

Jeder der 21 Landmarks pro Hand wird als `{x, y, z}` ausgegeben:

- **x**: horizontale Position, normalisiert auf 0.0 (links) bis 1.0 (rechts)  
- **y**: vertikale Position, normalisiert auf 0.0 (oben) bis 1.0 (unten)  
- **z**: Tiefe relativ zum Handgelenk. 
  Negative Werte bedeuten: der Punkt liegt näher zur Kamera: positive Werte liegen weiter entfernt. Der Absolutwert ist nicht in Metern, sondern relativ zur Handgröße.

Hand Landmarks: 21 Landmarks (Handgelenk + 4 Punkte pro Finger). Beide Hände haben jeweils einen eigenen Eintrag. Die herstellerseitige Spiegelung der Frontkamera wurde softwareseitig invertiert, um korrekte Links/Rechts-Daten zu gewährleisten.

Face Landmarks: Für diesen PoC werden spezifische Key-Points extrahiert (Augen, Nasenspitze, Mundwinkel, Kinn).

## Stabilität

**Stabil:**
- Erkennung funktioniert zuverlässig bei normaler Raumbeleuchtung
- Beide Hände werden gleichzeitig korrekt erkannt
- Auch bei schlechter Beleuchtung/unterschiedlicher Distanz bleibt die Erkennung aktiv

**Rauschen:**
- Bei ruhig gehaltener Hand fluktuieren die Koordinatenwerte leicht weiter.  
  Die Schwankungen sind klein, aber messbar – für präzise Gesten-Erkennung. Wäre ein Smoothing-Filter (z.B. gleitender Durchschnitt) empfehlenswert?

**Verdeckung:**
- Werden Landmarks verdeckt (z.B. Daumen hinter der Hand), verschwinden die Punkte nicht.
- Dies kann zu falschen Positionsdaten führen, da verdeckte Punkte weiterhin mit (geschätzten) Koordinaten ausgegeben werden.

## Performance

- Es läuft flüssig im Browser ohne spürbaren Lag (Edge, WebGL 2.0 / GPU-Delegate)
- WebGL-Warnungen aber keine Fehler in der Konsole

## Fazit

- MediaPipe HandLandmarker liefert im Normalfall stabile, gut nutzbare Daten.  
- Kritisch zu beachten: verdeckte Landmarks werden geschätzt, nicht als fehlend markiert.