# TOLC Trainer 📚

Web app statica per l'allenamento ai test di ingresso universitari (TOLC-I).
Funziona interamente su **GitHub Pages** — zero backend, zero librerie esterne.

---

## 🚀 Deploy su GitHub Pages

1. Crea una repository pubblica su GitHub
2. Carica tutti i file mantenendo la struttura:
   ```
   /
   ├── index.html
   ├── app.html
   ├── profile.html
   ├── style.css
   ├── questions.json
   └── js/
       ├── auth.js
       ├── app.js
       └── profile.js
   ```
3. Vai su **Settings → Pages → Branch: main → / (root)**
4. L'app sarà disponibile su `https://<username>.github.io/<repo>/`

---

## 📚 Aggiungere domande reali

Modifica `questions.json` seguendo questa struttura:

```json
{
  "questions": [
    {
      "id": "Q1",
      "sourcePage": 9,
      "question": "Testo della domanda?",
      "category": "logica",
      "choices": [
        { "label": "A", "text": "Prima risposta", "nextPage": 76 },
        { "label": "B", "text": "Seconda risposta", "nextPage": 77 }
      ]
    }
  ],
  "explanations": [
    {
      "sourcePage": 76,
      "isCorrect": true,
      "text": "Spiegazione della risposta corretta.",
      "nextPage": 30
    },
    {
      "sourcePage": 77,
      "isCorrect": false,
      "text": "Spiegazione perché questa risposta è sbagliata.",
      "nextPage": 30
    }
  ]
}
```

### Categorie disponibili
- `matematica`
- `logica`
- `fisica`
- `informatica`
- `geometria`
- (qualsiasi stringa personalizzata)

---

## 🎯 Modalità di allenamento

| Modalità | Descrizione |
|---|---|
| **Allenamento** | Segue il grafo originale delle domande con spiegazioni immediate |
| **Ripasso Errori** | Mostra solo le domande sbagliate, cicla finché non sono tutte corrette |
| **Simulazione** | Timer configurabile, nessuna spiegazione, risultati a fine test |

---

## 🔐 Sistema utente

- Password hashata con **SHA-256** (Web Crypto API nativa)
- Sessione persistente in `localStorage`
- Cambio password con verifica vecchia password
- Eliminazione account con conferma password
- Reset progresso e reset errori indipendenti

---

## 🛠 Struttura file

```
js/auth.js      — Autenticazione, sessione, gestione utenti
js/app.js       — Logica quiz, tre modalità, statistiche
js/profile.js   — Dashboard profilo, azioni account
style.css       — Stili globali, tema scuro/chiaro, responsive
index.html      — Pagina login/registrazione
app.html        — Interfaccia quiz principale
profile.html    — Pagina profilo utente
questions.json  — Database domande e spiegazioni
```

---

## 📦 LocalStorage schema

```js
// Chiave: 'tolc_users'
{
  "nomeutente": {
    "passwordHash": "sha256...",
    "createdAt": "2025-01-01T00:00:00.000Z",
    "progressPage": 9,
    "stats": {
      "totalAnswered": 0,
      "correct": 0,
      "wrong": 0
    },
    "wrongAnswers": ["Q1", "Q3"],
    "history": [{ "type": "simulation", "date": "...", "pct": 75 }]
  }
}

// Chiave: 'tolc_session' → username corrente
// Chiave: 'tolc_theme'   → 'dark' | 'light'
```

---

*Buono studio! 🎓*
