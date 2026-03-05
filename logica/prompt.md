Voglio che tu generi il codice completo di una web app statica per l’allenamento ai test di ingresso di Ingegneria e Informatica.

L’app deve funzionare interamente su GitHub Pages (solo frontend).

## ⚙️ Vincoli tecnici obbligatori

* Solo HTML, CSS, JavaScript vanilla
* Nessun backend
* Nessuna libreria esterna
* Compatibile con GitHub Pages
* Tutti i dati utente salvati in localStorage
* Codice modulare e leggibile
* Separazione file:
  * index.html
  * app.html
  * profile.html
  * style.css
  * js/auth.js
  * js/app.js
  * js/profile.js

---

# 📚 Struttura del file questions.json

Il file contiene:

```json
{
  "questions": [
    {
      "id": "Q1",
      "sourcePage": 9,
      "question": "...",
      "category": "logica",
      "choices": [
        { "label": "A", "text": "...", "nextPage": 76 }
      ]
    }
  ],
  "explanations": [
    {
      "sourcePage": 76,
      "isCorrect": true,
      "text": "...",
      "nextPage": 30
    }
  ]
}
```

La navigazione deve seguire il grafo usando `nextPage` e `sourcePage`.

---

# 🔐 Sistema Utente

Implementare:

* Registrazione
* Login
* Logout
* Password hashata con SHA-256 (Web Crypto API)
* Sessione persistente
* Cambio password
* Eliminazione account
* Reset dati

Struttura dati utente in localStorage:

```js
{
  username: {
    passwordHash: "...",
    createdAt: "...",
    progressPage: 9,
    stats: {
      totalAnswered: 0,
      correct: 0,
      wrong: 0
    },
    wrongAnswers: [],
    history: []
  }
}
```

---

# 🎯 Modalità richieste

## 1️⃣ Modalità Allenamento (Grafo originale)

* Mostra domanda
* Mostra scelte
* Clic → mostra spiegazione
* Continua → vai a nextPage
* Salva progresso automatico
* Aggiorna statistiche
* Se risposta errata:

  * salva id domanda in wrongAnswers (senza duplicati)

---

## 2️⃣ Modalità Ripasso Errori

* Mostra solo domande presenti in wrongAnswers
* Se risposta corretta → rimuovi dalla lista errori
* Se errata → resta nella lista
* Modalità ciclica finché errori non sono 0
* Mostra contatore errori rimanenti

---

## 3️⃣ Modalità Simulazione Test

* Domande random
* Timer configurabile (es. 90 minuti)
* Nessuna spiegazione immediata
* Mostra risultati solo alla fine
* Punteggio:

  * +1 corretto
  * 0 non risposto
  * 0 o penalità configurabile per errato
* Mostra riepilogo finale con:

  * corrette
  * errate
  * percentuale
  * tempo impiegato

---

# 📊 Dashboard Utente

In profile.html mostra:

* Username
* Data creazione
* Ultima pagina visitata
* Percentuale media
* Numero errori attivi
* Totale domande fatte
* Pulsanti:

  * Reset progresso
  * Reset errori
  * Cambia password
  * Elimina account

---

# 🧠 Funzionalità intelligenti aggiuntive

Implementare anche:

* Barra di progresso
* Evidenziazione risposta selezionata
* Modalità scura attivabile
* Sistema anti-loop nel grafo
* Validazione nodi mancanti
* Fallback se nextPage non esiste
* Pulsante "Ricominicia dal principio"
* Pulsante "Riprendi da dove eri"

---

# 📦 Requisiti di qualità

* Codice robusto
* Nessun errore console
* Controlli su dati undefined
* Validazione input utente
* Commenti chiari nel codice
* UX semplice e moderna ma ordinata

---

# 🚫 Non includere

* Backend
* Database online
* Librerie esterne
* Sistema di ranking globale
* Autenticazione OAuth

---

# 🎯 Output richiesto

Fornisci:

* Tutti i file completi
* Codice commentato
* Nessuna spiegazione fuori dal codice
* Struttura pronta da copiare in una repository GitHub Pages

---

# 🧭 Obiettivo finale

L’app deve essere realmente utilizzabile da studenti che si preparano al TOLC-I di Ingegneria e Informatica.

Deve essere stabile, utile per migliorare, e semplice da mantenere.