# StudyAI

Ett studieverktyg som körs helt i webbläsaren: flashcards, quizgenerator, anteckningar med rich text, kalender, statistik med diagram, AI-liknande assistent och gamification. Ingen backend och ingen API-nyckel behövs.

## Funktioner

| Område | Innehåll |
|---|---|
| Profiler | Flera lokala profiler med användarnamn och PIN-kod |
| Dashboard | Studietimer, dagsmål, statistik, Chart.js-diagram, rekommendationer, badges |
| Flashcards | Skapa, redigera och ta bort kort. Klicka för att vända |
| Quiz | Flervalsfrågor genereras från dina anteckningar, poäng och resultatsida |
| Anteckningar | Rich text-editor, autospar, kategorier och sökning |
| Kalender | Planera studiepass per dag och bocka av dem för att logga tid och XP |
| AI-assistent | Svarar på frågor genom att söka i dina anteckningar (exempeldata, lokalt) |
| Gamification | XP, nivåer, badges och streak |
| Data | Export och import som JSON |
| Tillgänglighet | Tangentbordsnavigering, skärmläsarstöd, `prefers-reduced-motion`, högkontrast |

## Kom igång

Du behöver en modern webbläsare (Chrome, Edge, Firefox eller Safari) och internet första gången, eftersom Font Awesome, Chart.js och typsnittet hämtas från CDN.

### Alternativ 1: Dubbelklicka på `index.html`
Fungerar direkt. PIN-koden hashas då med en enklare reservmetod, eftersom SHA-256 kräver `https` eller `localhost`.

### Alternativ 2: Lokal server (rekommenderas)
Kräver [Python 3](https://www.python.org/downloads/).

- **Windows:** dubbelklicka på `start.bat`
- **macOS / Linux:** kör `./start.sh` i terminalen
- **Manuellt:** `python server.py` (valfri port: `python server.py 8080`)

Sidan öppnas på **http://localhost:8000**. Stoppa servern med `Ctrl+C`.

### Alternativ 3: Andra verktyg
- Node.js: `npx serve .`
- VS Code: tillägget *Live Server*, högerklicka på `index.html` och välj *Open with Live Server*

## Filstruktur

```
studyai/
├── index.html   # Struktur, inloggning, vyer
├── style.css    # Design, teman, responsivitet
├── script.js    # All logik (ES6+)
├── server.py    # Lokal utvecklingsserver
├── start.bat    # Startskript för Windows
├── start.sh     # Startskript för macOS/Linux
└── README.md
```

## Data och säkerhet

- All data sparas i webbläsarens `localStorage`, en nyckel per profil: `studyai_v1_<användarnamn>`. Profillistan ligger i `studyai_profiles`.
- **Inloggningen är lokal.** PIN-koden skyddar inte mot någon som har tillgång till enheten eller webbläsarens utvecklarverktyg. För verklig säkerhet behövs en backend.
- Data följer inte med mellan enheter eller webbläsare. Använd **Dashboard → Exportera / Importera** för att flytta den.
- Rensar du webbläsardata försvinner allt. Exportera regelbundet.
- Importerade filer valideras och HTML i anteckningar rensas från skript och farliga attribut.

## Publicera på nätet

Det är statiska filer, så vilken webbhost som helst fungerar:
- **Netlify Drop:** dra mappen till app.netlify.com/drop
- **GitHub Pages:** lägg filerna i ett repo och aktivera Pages under *Settings*

## Felsökning

| Problem | Lösning |
|---|---|
| "Port 8000 är upptagen" | Kör `python server.py 8080` |
| Ikoner eller diagram saknas | Kontrollera internetanslutningen (CDN) |
| Data saknas efter byte av webbläsare | Data är lokal per webbläsare. Importera en export |
| Glömd PIN-kod | Profilen kan tas bort i utvecklarverktygen (*Application → Local Storage*, ta bort `studyai_profiles`). Profildatan ligger kvar under `studyai_v1_<namn>` |
| `start.bat` säger att Python saknas | Installera Python och kryssa i *Add python.exe to PATH* |

## Vidareutveckling

- **Riktig AI:** koppla assistenten till en server som anropar en språkmodell. Lägg aldrig API-nycklar i frontend-koden.
- **Riktig inloggning och synk:** kräver backend och databas.
- **Fler diagram och rapporter:** `drawCharts()` i `script.js` är utgångspunkten.
