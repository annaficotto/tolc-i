// app.js – Logica principale dell'applicazione

// Riferimenti DOM
const contentArea = document.getElementById('contentArea');
const navButtons = document.getElementById('navButtons');
const continueBtn = document.getElementById('continueBtn');
const modeTraining = document.getElementById('modeTraining');
const modeReview = document.getElementById('modeReview');
const modeTest = document.getElementById('modeTest');
const testConfig = document.getElementById('testConfig');
const startTestBtn = document.getElementById('startTestBtn');
const testInfo = document.getElementById('testInfo');
const timerDisplay = document.getElementById('timerDisplay');
const testProgress = document.getElementById('testProgress');
const usernameDisplay = document.getElementById('usernameDisplay');
const logoutBtn = document.getElementById('logoutBtn');
const profileBtn = document.getElementById('profileBtn');

// Stato globale
let currentMode = 'training'; // training, review, test
let currentPage = 67; // pagina corrente (da caricare)
let currentQuestion = null; // oggetto domanda corrente
let currentExplanation = null; // spiegazione corrente
let selectedChoice = null; // scelta selezionata
let testQuestions = []; // lista di pagine di domande per il test
let testIndex = 0;
let testAnswers = []; // risposte date nel test { page, choice, isCorrect? }
let testTimer = null;
let testTimeLeft = 0; // in secondi
let testTotal = 0;
let testPenalty = 0;

// Mappe costruite direttamente dai dati strutturati
let questionsByPage = new Map(); // sourcePage -> question object
let explanationsByPage = new Map(); // sourcePage -> array di spiegazioni
let allQuestionPages = []; // lista di pagine che sono domande

function loadData() {
    // Popola questionsByPage
    mentorData.questions.forEach(q => {
        questionsByPage.set(q.sourcePage, q);
        allQuestionPages.push(q.sourcePage);
    });

    // Popola explanationsByPage (possono essercene più di una per pagina)
    mentorData.explanations.forEach(exp => {
        if (!explanationsByPage.has(exp.sourcePage)) {
            explanationsByPage.set(exp.sourcePage, []);
        }
        explanationsByPage.get(exp.sourcePage).push(exp);
    });
}

// Chiama loadData() all'inizio dell'inizializzazione
loadData();

// Ottieni spiegazione per una data pagina, domanda e scelta
function getExplanationForChoice(page, qId, choiceLabel) {
    const exps = explanationsByPage.get(page) || [];
    return exps.find(e => e.qId === qId && e.answerLabel === choiceLabel);
}

// Carica una pagina (domanda o spiegazione)
function loadPage(pageNum) {
    // Salva progresso utente
    updateCurrentUserData(user => {
        user.progressPage = pageNum;
        return user;
    });

    // Controlla se è una domanda
    const question = questionsByPage.get(pageNum);
    if (question) {
        showQuestion(question);
        return;
    }

    // Altrimenti potrebbe essere una spiegazione? Ma di solito le spiegazioni sono raggiunte da choice.nextPage
    // Se è una spiegazione, dobbiamo sapere a quale domanda appartiene. Tuttavia non abbiamo contesto.
    // In pratica, quando si arriva a una spiegazione, abbiamo già il contesto (dalla scelta).
    // Qui gestiamo il caso in cui si arrivi direttamente a una pagina di spiegazione (es. da continue)
    // Ma nel grafo, le spiegazioni puntano sempre a domande. Quindi se arriviamo qui, forse è un errore.
    // Fallback: mostra un messaggio.
    contentArea.innerHTML = `<p>Pagina ${pageNum} non riconosciuta.</p>`;
}

// Mostra una domanda
function showQuestion(question) {
    currentQuestion = question;
    currentExplanation = null;
    selectedChoice = null;
    let html = `<div class="question-text">${question.question}</div>`;
    html += '<div class="choices">';
    question.choices.forEach(choice => {
        html += `<button class="choice-btn" data-label="${choice.label}" data-next="${choice.nextPage}">${choice.label}. ${choice.text}</button>`;
    });
    html += '</div>';
    contentArea.innerHTML = html;

    // Aggiungi event listener alle scelte
    document.querySelectorAll('.choice-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            // Se siamo in modalità test, gestiamo diversamente
            if (currentMode === 'test') {
                // In test, non mostriamo spiegazione, registriamo la risposta e passiamo alla prossima
                handleTestAnswer(question, btn.dataset.label);
            } else {
                // Modalità training/review: mostra spiegazione
                const nextPage = parseInt(btn.dataset.next);
                const choiceLabel = btn.dataset.label;
                const explanation = getExplanationForChoice(nextPage, question.id, choiceLabel);
                if (explanation) {
                    showExplanation(explanation, question.id, choiceLabel, nextPage);
                } else {
                    // Fallback: vai direttamente alla pagina successiva se non trovata spiegazione
                    loadPage(nextPage);
                }
            }
        });
    });

    // Nascondi pulsante continua
    continueBtn.classList.add('hidden');
}

// Mostra una spiegazione
function showExplanation(explanation, qId, choiceLabel, nextPageFromChoice) {
    currentExplanation = explanation;
    // Aggiorna statistiche
    updateStats(qId, explanation.isCorrect, choiceLabel);

    let html = `<div class="explanation ${explanation.isCorrect ? 'correct' : 'wrong'}">`;
    html += `<strong>${explanation.isCorrect ? '✅ Corretta' : '❌ Sbagliata'}</strong><br>`;
    html += explanation.text;
    html += '</div>';
    contentArea.innerHTML = html;

    // Mostra pulsante continua
    continueBtn.classList.remove('hidden');
    // Imposta il nextPage dal explanation (se presente) altrimenti dalla choice
    const nextPage = explanation.nextPage !== null ? explanation.nextPage : nextPageFromChoice;
    continueBtn.onclick = () => {
        if (nextPage) {
            loadPage(nextPage);
        } else {
            // Se non c'è nextPage, probabilmente fine mentor
            contentArea.innerHTML = '<p>Fine del percorso.</p>';
            continueBtn.classList.add('hidden');
        }
    };
}

// Aggiorna statistiche utente dopo una risposta
function updateStats(qId, isCorrect, choiceLabel) {
    updateCurrentUserData(user => {
        user.stats.totalAnswered++;
        if (isCorrect) {
            user.stats.correct++;
            // Se era in wrongAnswers, rimuovilo
            const idx = user.wrongAnswers.indexOf(qId);
            if (idx !== -1) user.wrongAnswers.splice(idx, 1);
        } else {
            user.stats.wrong++;
            // Aggiungi a wrongAnswers se non già presente
            if (!user.wrongAnswers.includes(qId)) {
                user.wrongAnswers.push(qId);
            }
        }
        return user;
    });
}

// Gestione cambio modalità
modeTraining.addEventListener('click', () => {
    setActiveMode('training');
    testConfig.classList.add('hidden');
    testInfo.classList.add('hidden');
    if (testTimer) clearInterval(testTimer);
    const user = getCurrentUserData();
    if (user) loadPage(user.progressPage);
});

modeReview.addEventListener('click', () => {
    setActiveMode('review');
    testConfig.classList.add('hidden');
    testInfo.classList.add('hidden');
    if (testTimer) clearInterval(testTimer);
    startReviewMode();
});

modeTest.addEventListener('click', () => {
    setActiveMode('test');
    testConfig.classList.remove('hidden');
    testInfo.classList.add('hidden');
    // Nascondi contenuto
    contentArea.innerHTML = '<p>Imposta i parametri del test e clicca "Avvia test".</p>';
    continueBtn.classList.add('hidden');
});

function setActiveMode(mode) {
    currentMode = mode;
    [modeTraining, modeReview, modeTest].forEach(btn => btn.classList.remove('active'));
    if (mode === 'training') modeTraining.classList.add('active');
    if (mode === 'review') modeReview.classList.add('active');
    if (mode === 'test') modeTest.classList.add('active');
}

// Modalità ripasso errori
function startReviewMode() {
    const user = getCurrentUserData();
    if (!user) return;
    const wrongList = user.wrongAnswers;
    if (wrongList.length === 0) {
        contentArea.innerHTML = '<p>🎉 Nessun errore da ripassare!</p>';
        return;
    }
    // Mappa gli ID alle pagine delle domande
    // Dobbiamo trovare la pagina per ogni id. questionsByPage ha sourcePage, ma l'id è Qn. Dobbiamo cercare la domanda con quell'id.
    const wrongPages = [];
    for (let [page, q] of questionsByPage.entries()) {
        if (wrongList.includes(q.id)) {
            wrongPages.push(page);
        }
    }
    if (wrongPages.length === 0) {
        contentArea.innerHTML = '<p>Nessuna domanda corrispondente agli errori.</p>';
        return;
    }
    // Avvia una sessione di ripasso sequenziale
    // Per semplicità, mostriamo la prima
    currentReviewList = wrongPages;
    currentReviewIndex = 0;
    loadReviewQuestion();
}

let currentReviewList = [];
let currentReviewIndex = 0;

function loadReviewQuestion() {
    if (currentReviewIndex >= currentReviewList.length) {
        contentArea.innerHTML = '<p>Hai ripassato tutti gli errori! 🎉</p>';
        return;
    }
    const page = currentReviewList[currentReviewIndex];
    const question = questionsByPage.get(page);
    if (question) {
        showQuestion(question);
        // Sovrascriviamo il comportamento delle scelte per gestire il ripasso
        document.querySelectorAll('.choice-btn').forEach(btn => {
            btn.removeEventListener('click', handleReviewChoice);
            btn.addEventListener('click', handleReviewChoice);
        });
    } else {
        currentReviewIndex++;
        loadReviewQuestion();
    }
}

async function handleReviewChoice(e) {
    const btn = e.currentTarget;
    const nextPage = parseInt(btn.dataset.next);
    const choiceLabel = btn.dataset.label;
    const question = currentQuestion;
    const explanation = getExplanationForChoice(nextPage, question.id, choiceLabel);
    if (explanation) {
        // Aggiorna stats (e rimuove da wrong se corretto)
        await updateStats(question.id, explanation.isCorrect, choiceLabel);
        // Se corretto, rimuoviamo questa domanda dalla lista corrente e non incrementiamo indice
        if (explanation.isCorrect) {
            currentReviewList.splice(currentReviewIndex, 1);
        } else {
            currentReviewIndex++;
        }
        // Mostra spiegazione breve e poi prossima domanda
        showExplanation(explanation, question.id, choiceLabel, nextPage);
        // Modifica il pulsante continua per andare alla prossima domanda di ripasso
        continueBtn.onclick = () => {
            loadReviewQuestion();
        };
    } else {
        loadPage(nextPage); // fallback
    }
}

// Modalità test
startTestBtn.addEventListener('click', () => {
    const num = parseInt(document.getElementById('testNum').value) || 20;
    const time = parseInt(document.getElementById('testTime').value) || 90;
    const penalty = parseFloat(document.getElementById('testPenalty').value) || 0;
    startTest(num, time, penalty);
});

function startTest(numQuestions, timeMinutes, penalty) {
    testPenalty = penalty;
    // Seleziona numQuestions casuali da allQuestionPages
    const shuffled = [...allQuestionPages].sort(() => Math.random() - 0.5);
    testQuestions = shuffled.slice(0, Math.min(numQuestions, allQuestionPages.length));
    testIndex = 0;
    testAnswers = [];
    testTimeLeft = timeMinutes * 60;
    testTotal = testQuestions.length;

    // Mostra timer e progresso
    testInfo.classList.remove('hidden');
    updateTimerDisplay();
    if (testTimer) clearInterval(testTimer);
    testTimer = setInterval(() => {
        testTimeLeft--;
        updateTimerDisplay();
        if (testTimeLeft <= 0) {
            clearInterval(testTimer);
            endTest();
        }
    }, 1000);

    loadTestQuestion();
}

function updateTimerDisplay() {
    const mins = Math.floor(testTimeLeft / 60);
    const secs = testTimeLeft % 60;
    timerDisplay.textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    testProgress.textContent = `${testIndex}/${testTotal}`;
}

function loadTestQuestion() {
    if (testIndex >= testQuestions.length) {
        endTest();
        return;
    }
    const page = testQuestions[testIndex];
    const question = questionsByPage.get(page);
    if (!question) {
        testIndex++;
        loadTestQuestion();
        return;
    }
    showQuestion(question);
    // Disabilita il normale comportamento delle scelte
    document.querySelectorAll('.choice-btn').forEach(btn => {
        btn.removeEventListener('click', handleTestAnswer);
        btn.addEventListener('click', handleTestAnswer);
    });
}

function handleTestAnswer(e) {
    const btn = e.currentTarget;
    const choiceLabel = btn.dataset.label;
    const question = currentQuestion;
    // Registra risposta
    testAnswers.push({
        page: question.sourcePage,
        choice: choiceLabel,
        question: question
    });
    testIndex++;
    loadTestQuestion();
}

function endTest() {
    clearInterval(testTimer);
    testInfo.classList.add('hidden');
    // Calcola punteggio
    let correct = 0;
    let wrong = 0;
    testAnswers.forEach(ans => {
        const nextPage = ans.question.choices.find(c => c.label === ans.choice)?.nextPage;
        if (nextPage) {
            const exp = getExplanationForChoice(nextPage, ans.question.id, ans.choice);
            if (exp && exp.isCorrect) correct++;
            else wrong++;
        }
    });
    const unanswered = testTotal - testAnswers.length;
    const score = correct - wrong * testPenalty;
    contentArea.innerHTML = `
        <h2>Risultati test</h2>
        <p>Domande: ${testTotal}</p>
        <p>Risposte: ${testAnswers.length}</p>
        <p>Corrette: ${correct}</p>
        <p>Errate: ${wrong}</p>
        <p>Non risposte: ${unanswered}</p>
        <p>Punteggio: ${score}</p>
    `;
    continueBtn.classList.add('hidden');
}

// Logout e navigazione
logoutBtn.addEventListener('click', () => {
    logout();
    window.location.href = 'index.html';
});

profileBtn.addEventListener('click', () => {
    window.location.href = 'profile.html';
});

// Inizializzazione
(async function init() {
    // Costruisci grafo dai dati
    buildGraphFromPages();

    // Verifica utente loggato
    const username = getCurrentUser();
    if (!username) {
        window.location.href = 'index.html';
        return;
    }
    usernameDisplay.textContent = username;

    // Carica progresso
    const user = getCurrentUserData();
    if (user) {
        currentPage = user.progressPage || 67;
        loadPage(currentPage);
    } else {
        loadPage(67);
    }
})();