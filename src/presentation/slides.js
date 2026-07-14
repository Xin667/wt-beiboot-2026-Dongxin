/**
 * Statischer Slide-Inhalt für die Präsentations-Demo (Issue #4).
 * Bewusst nur Daten, keine Logik – die Slides erklären zugleich die Gestensteuerung.
 */
export const slides = [
  {
    title: 'Präsentation per Geste',
    body: 'Bedienung: 👍 ThumbsUp = weiter, 👎 ThumbsDown = zurück. (Details zu den nächsten Folien.)',
  },
  {
    title: '✌️ Peace = Aufwecken',
    body: 'Solange keine Präsentation läuft, zeigt das Peace-Zeichen "Aufwecken" – danach reagiert die App auf ThumbsUp/ThumbsDown.',
  },
  {
    title: '👍 ThumbsUp = Weiter',
    body: 'Daumen hoch, kurz halten, um zur nächsten Folie zu springen.',
  },
  {
    title: '👎 ThumbsDown = Zurück',
    body: 'Daumen runter, kurz halten, um zur vorherigen Folie zurückzuspringen.',
  },
  {
    title: 'Keyboard-Fallback',
    body: 'Pfeiltasten (← →) navigieren ebenfalls, "W" weckt die Präsentation ohne Kamera auf – nützlich zum Testen.',
  },
  {
    title: 'Ende',
    body: 'Das war die letzte Folie. Danke fürs Zusehen!',
  },
];
