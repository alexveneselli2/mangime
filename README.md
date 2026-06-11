# NutrIA 🥗

**Diario alimentare intelligente.** Descrivi cosa hai mangiato in linguaggio naturale e l'AI calcola automaticamente calorie e valori nutrizionali, giorno per giorno.

> *"Un piatto di pasta al pomodoro, un'insalata mista e una mela"* → **~620 kcal · P 18g · C 105g · G 14g**

## Come funziona

- **Zero installazione, zero server, zero database**: è un singolo file `index.html`
- I pasti vengono analizzati dall'AI di Anthropic (Claude)
- I dati restano salvati **solo sul tuo dispositivo** (localStorage del browser)
- Naviga tra i giorni con le frecce per vedere lo storico

## Avvio

1. Apri `index.html` nel browser (doppio click) oppure visita la versione pubblicata su GitHub Pages
2. Alla prima apertura inserisci la tua **API key Anthropic**
   - Creala su [console.anthropic.com](https://console.anthropic.com) → Settings → API Keys
   - Viene salvata solo in locale, non lascia mai il tuo dispositivo (a parte le chiamate dirette ad Anthropic)
3. Scrivi cosa hai mangiato e premi ➤

## Pubblicazione su GitHub Pages

1. Repo → **Settings → Pages**
2. Source: **Deploy from a branch**, scegli il branch e la cartella `/ (root)`
3. L'app sarà disponibile su `https://<utente>.github.io/<repo>/`

## Funzionalità

- ✍️ Inserimento pasti tramite descrizione testuale libera (in italiano)
- 🤖 Stima AI di calorie, proteine, carboidrati, grassi e fibre — con dettaglio per alimento
- 📊 Totali giornalieri con barra di progresso verso l'obiettivo calorico
- 📅 Storico per giorno con navigazione
- 🎯 Obiettivo calorico personalizzabile nelle impostazioni
- 📱 Design minimal, mobile-first
