# Klassenblitz – Anleitung zum Online-Stellen

Klassenblitz ist ein Live-Quiz für den Unterricht. Die Schüler öffnen einen Link im Browser (kein Konto, keine App),
geben eine PIN und einen Namen ein und beantworten deine Fragen. Nach jeder Frage siehst du die Statistik.

## So benutzt du es (nach dem Online-Stellen)

1. Öffne `https://DEINE-ADRESSE/host`
2. Lade deine Fragen als CSV hoch (Vorlage: `public/beispiel.csv`) oder füge sie ein.
3. Stelle die Standard-Zeit ein. In der Tabelle kannst du pro Frage eine eigene Zeit festlegen.
4. Klicke auf **Quiz erstellen**. Du siehst eine 6-stellige PIN.
5. Die Schüler öffnen `https://DEINE-ADRESSE`, geben PIN und Namen ein.
6. **Los geht’s** → Frage läuft → nach Ablauf (oder wenn alle geantwortet haben) erscheint die Statistik → **Nächste Frage**.

### Tabellenformat (Excel → „CSV (Trennzeichen-getrennt)“)

| Frage | Sekunden | Richtig | Antwort A | Antwort B | Antwort C | Antwort D |
|---|---|---|---|---|---|---|
| Wie viel ist 7 mal 8? | 20 | C | 48 | 54 | 56 | 64 |

- „Richtig“ ist der Buchstabe der richtigen Antwort (A–F), 2 bis 6 Antworten möglich.
- „Sekunden“ darf leer bleiben, dann gilt die Standard-Zeit.
- Keine Semikolons im Fragetext verwenden.

## Online stellen mit Render.com (kostenlos)

Du brauchst: ein kostenloses GitHub-Konto und ein kostenloses Render-Konto.

### Schritt 1: Code zu GitHub hochladen
1. Auf https://github.com anmelden → **New repository** → Name `klassenblitz` → **Create repository**.
2. Auf der neuen Seite **uploading an existing file** anklicken.
3. Den **Inhalt** des entpackten Ordners hineinziehen (`server.js`, `package.json`, Ordner `public`, …).
   Den Ordner `node_modules` gibt es nicht und wird auch nicht gebraucht.
4. **Commit changes** klicken.

### Schritt 2: Bei Render veröffentlichen
1. Auf https://render.com mit GitHub anmelden.
2. **New +** → **Web Service** → dein Repository `klassenblitz` auswählen.
3. Einstellungen:
   - Runtime: **Node**
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Instance Type: **Free**
4. Unter **Environment Variables** hinzufügen: `LEHRER_PASSWORT` = ein Passwort deiner Wahl.
   Damit können nur du (und wer das Passwort kennt) Quizze erstellen.
5. **Create Web Service**. Nach 2–3 Minuten steht oben dein Link, z. B. `https://klassenblitz-abcd.onrender.com`.

Diesen Link geben die Schüler ein. Dein Lehrerbereich ist der Link plus `/host`.

### Wichtig beim kostenlosen Render-Tarif
- Nach ca. 15 Minuten ohne Besuch schläft der Dienst ein. Der erste Aufruf dauert dann bis zu einer Minute.
  **Öffne `/host` also 2–3 Minuten vor der Stunde**, dann ist alles bereit.
- Bei einem Neustart des Dienstes gehen laufende Quizze verloren (Quizze liegen nur im Arbeitsspeicher).
- Eigene Adresse (z. B. quiz.deineschule.de): in Render unter **Settings → Custom Domains**.

## Alternativen
- **Railway / Fly.io / eigener Server:** `npm install` und `npm start` genügen. Der Port kommt aus der Umgebungsvariable `PORT`.
- **Zum Testen auf deinem Rechner:** Node.js 18+ installieren, im Ordner `npm install`, dann `npm start` und `http://localhost:3000/host` öffnen.
  Schüler im selben WLAN erreichen dich über `http://DEINE-LOKALE-IP:3000`.

## Hinweise zum Datenschutz
Es werden keine Daten dauerhaft gespeichert. Namen und Antworten liegen nur während des Quizzes im Arbeitsspeicher.
Lass die Schüler Spitznamen verwenden.
