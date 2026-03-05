/**
 * app.js — Logica principale del quiz
 * Gestisce: Allenamento, Ripasso Errori, Simulazione Test
 */

'use strict';

// ── Stato applicazione ────────────────────────────────────
const AppState = {
  questions: [],       // array domande da questions.json
  explanations: [],    // array spiegazioni da questions.json
  mode: null,          // 'training' | 'review' | 'simulation'
  currentQuestion: null,
  currentExplanation: null,
  answered: false,
  visitedPages: new Set(), // anti-loop

  // Simulazione
  sim: {
    questions: [],       // domande della sessione simulazione
    index: 0,
    answers: [],         // {questionId, choiceLabel, isCorrect, answered}
    timerSeconds: 0,
    timerInterval: null,
    penalty: 0
  },

  // Ripasso
  review: {
    queue: [],           // copia di wrongAnswers
    index: 0
  }
};

// ── Caricamento dati ──────────────────────────────────────

/**
 * Carica questions.json e popola AppState.
 * @returns {Promise<boolean>}
 */
async function loadQuestions() {
  try {
    const resp = await fetch('questions.json');
    if (!resp.ok) throw new Error('File non trovato');
    const data = await resp.json();

    if (!data.questions || !data.explanations)
      throw new Error('Formato questions.json non valido');

    AppState.questions    = data.questions;
    AppState.explanations = data.explanations;
    return true;
  } catch (err) {
    console.error('Errore caricamento domande:', err);
    return false;
  }
}

// ── Ricerca nel grafo ─────────────────────────────────────

/**
 * Trova una domanda dato il suo sourcePage.
 * @param {number} page
 * @returns {Object|null}
 */
function findQuestion(page) {
  return AppState.questions.find(q => q.sourcePage === page) || null;
}

/**
 * Trova una spiegazione dato il suo sourcePage.
 * @param {number} page
 * @returns {Object|null}
 */
function findExplanation(page) {
  return AppState.explanations.find(e => e.sourcePage === page) || null;
}

/**
 * Trova una domanda per id.
 * @param {string} id
 * @returns {Object|null}
 */
function findQuestionById(id) {
  return AppState.questions.find(q => q.id === id) || null;
}

// ── Rendering UI ─────────────────────────────────────────

const UI = {
  // Sezioni principali
  welcome:    document.getElementById('section-welcome'),
  quiz:       document.getElementById('section-quiz'),
  result:     document.getElementById('section-result'),
  simConfig:  document.getElementById('section-sim-config'),

  // Quiz
  modeBadge:      document.getElementById('mode-badge'),
  questionCounter: document.getElementById('question-counter'),
  progressFill:   document.getElementById('progress-fill'),
  progressText:   document.getElementById('progress-text'),
  questionText:   document.getElementById('question-text'),
  categoryBadge:  document.getElementById('category-badge'),
  choicesList:    document.getElementById('choices-list'),
  explanationBox: document.getElementById('explanation-box'),
  explanationText: document.getElementById('explanation-text'),
  btnContinue:    document.getElementById('btn-continue'),
  btnSkip:        document.getElementById('btn-skip'),
  timerWrap:      document.getElementById('timer-wrap'),
  timerDisplay:   document.getElementById('timer-display'),
  reviewCounter:  document.getElementById('review-counter'),
  pageId:         document.getElementById('page-id'),

  // Result
  resultPct:    document.getElementById('result-pct'),
  resultCorrect: document.getElementById('result-correct'),
  resultWrong:   document.getElementById('result-wrong'),
  resultSkipped: document.getElementById('result-skipped'),
  resultTime:    document.getElementById('result-time'),
  resultList:    document.getElementById('result-list'),

  // Username nav
  navUsername: document.getElementById('nav-username'),

  /**
   * Mostra una sola sezione, nasconde le altre.
   * @param {HTMLElement} section
   */
  showSection(section) {
    [this.welcome, this.quiz, this.result, this.simConfig].forEach(s => {
      if (s) s.classList.add('hidden');
    });
    if (section) {
      section.classList.remove('hidden');
      section.classList.add('fade-in');
    }
  }
};

// ── Modalità Allenamento ──────────────────────────────────

/**
 * Avvia la modalità allenamento dalla pagina salvata o dall'inizio.
 * @param {boolean} fromStart — se true riparte da pagina 9
 */
function startTraining(fromStart = false) {
  const user = Auth.getCurrentUser();
  if (!user) return;

  AppState.mode = 'training';
  AppState.visitedPages.clear();

  const startPage = fromStart ? 9 : (user.data.progressPage || 9);

  const question = findQuestion(startPage);
  if (!question) {
    showError('Nessuna domanda trovata per la pagina ' + startPage);
    return;
  }

  Auth.updateCurrentUser({ progressPage: startPage });
  renderQuestion(question);
  UI.showSection(UI.quiz);
}

// ── Modalità Ripasso Errori ───────────────────────────────

/**
 * Avvia la modalità ripasso errori.
 */
function startReview() {
  const user = Auth.getCurrentUser();
  if (!user) return;

  const wrongs = [...(user.data.wrongAnswers || [])];
  if (wrongs.length === 0) {
    showInfo('Nessun errore da ripassare! 🎉');
    return;
  }

  AppState.mode = 'review';
  AppState.review.queue = wrongs;
  AppState.review.index = 0;

  renderReviewQuestion();
  UI.showSection(UI.quiz);
}

/**
 * Renderizza la domanda corrente del ripasso.
 */
function renderReviewQuestion() {
  const { queue, index } = AppState.review;

  if (index >= queue.length) {
    // Ripasso completato
    const user = Auth.getCurrentUser();
    const remaining = user ? (user.data.wrongAnswers || []).length : 0;
    if (remaining === 0) {
      showSuccess('Hai corretto tutti gli errori! 🏆');
    } else {
      // Ricicla
      AppState.review.queue = [...(user.data.wrongAnswers || [])];
      AppState.review.index = 0;
      renderReviewQuestion();
    }
    return;
  }

  const qId = queue[index];
  const question = findQuestionById(qId);
  if (!question) {
    // Domanda non trovata, skippa
    AppState.review.index++;
    renderReviewQuestion();
    return;
  }

  renderQuestion(question);
}

// ── Modalità Simulazione ──────────────────────────────────

/**
 * Mostra la schermata di configurazione simulazione.
 */
function showSimConfig() {
  UI.showSection(UI.simConfig);
}

/**
 * Avvia la simulazione con i parametri configurati.
 */
function startSimulation() {
  const numQ   = parseInt(document.getElementById('sim-num-questions').value, 10) || 20;
  const mins   = parseInt(document.getElementById('sim-minutes').value, 10) || 90;
  const pen    = parseFloat(document.getElementById('sim-penalty').value) || 0;

  const allQ = [...AppState.questions];
  if (allQ.length === 0) { showError('Nessuna domanda disponibile.'); return; }

  // Shuffle + slice
  const shuffled = allQ.sort(() => Math.random() - 0.5).slice(0, Math.min(numQ, allQ.length));

  AppState.mode = 'simulation';
  AppState.sim.questions = shuffled;
  AppState.sim.index = 0;
  AppState.sim.answers = shuffled.map(q => ({
    questionId: q.id,
    choiceLabel: null,
    isCorrect: null,
    answered: false
  }));
  AppState.sim.timerSeconds = mins * 60;
  AppState.sim.penalty = pen;

  // Avvia timer
  if (AppState.sim.timerInterval) clearInterval(AppState.sim.timerInterval);
  AppState.sim.timerInterval = setInterval(tickTimer, 1000);

  renderSimQuestion();
  UI.showSection(UI.quiz);
}

/**
 * Tick del timer simulazione.
 */
function tickTimer() {
  AppState.sim.timerSeconds--;

  if (UI.timerDisplay) {
    const m = Math.floor(AppState.sim.timerSeconds / 60);
    const s = AppState.sim.timerSeconds % 60;
    UI.timerDisplay.textContent = `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;

    UI.timerDisplay.className = 'timer-display';
    if (AppState.sim.timerSeconds <= 300) UI.timerDisplay.classList.add('warn');
    if (AppState.sim.timerSeconds <= 60)  UI.timerDisplay.classList.add('danger');
  }

  if (AppState.sim.timerSeconds <= 0) {
    clearInterval(AppState.sim.timerInterval);
    endSimulation();
  }
}

/**
 * Renderizza la domanda simulazione corrente.
 */
function renderSimQuestion() {
  const { questions, index } = AppState.sim;
  if (index >= questions.length) {
    endSimulation();
    return;
  }
  renderQuestion(questions[index]);
}

/**
 * Termina la simulazione e mostra i risultati.
 */
function endSimulation() {
  if (AppState.sim.timerInterval) clearInterval(AppState.sim.timerInterval);

  const { answers, timerSeconds, questions } = AppState.sim;
  const totalTime = (parseInt(document.getElementById('sim-minutes')?.value, 10) || 90) * 60 - timerSeconds;

  let correct = 0, wrong = 0, skipped = 0;
  answers.forEach(a => {
    if (!a.answered) skipped++;
    else if (a.isCorrect) correct++;
    else wrong++;
  });

  const score = correct * 1 + wrong * (-AppState.sim.penalty);
  const pct = questions.length > 0 ? Math.round((correct / questions.length) * 100) : 0;

  // Aggiorna stats utente
  Auth.updateCurrentUser({
    stats: {
      totalAnswered: (Auth.getCurrentUser()?.data.stats.totalAnswered || 0) + answers.filter(a=>a.answered).length,
      correct: (Auth.getCurrentUser()?.data.stats.correct || 0) + correct,
      wrong: (Auth.getCurrentUser()?.data.stats.wrong || 0) + wrong
    }
  });

  // Aggiunge alla history
  const user = Auth.getCurrentUser();
  if (user) {
    const history = user.data.history || [];
    history.unshift({
      type: 'simulation',
      date: new Date().toISOString(),
      correct, wrong, skipped,
      total: questions.length,
      score: Math.max(0, score).toFixed(2),
      pct
    });
    Auth.updateCurrentUser({ history: history.slice(0, 50) }); // max 50 sessioni
  }

  renderResults({ correct, wrong, skipped, pct, totalTime, answers, score });
}

// ── Rendering domanda ─────────────────────────────────────

/**
 * Renderizza una domanda nella sezione quiz.
 * @param {Object} question
 */
function renderQuestion(question) {
  AppState.currentQuestion = question;
  AppState.currentExplanation = null;
  AppState.answered = false;

  if (!UI.quiz) return;

  // Mode badge
  const modeLabels = { training: '📖 Allenamento', review: '🔁 Ripasso', simulation: '⏱ Simulazione' };
  if (UI.modeBadge) UI.modeBadge.textContent = modeLabels[AppState.mode] || '';

  // Page id
  if (UI.pageId) UI.pageId.textContent = `pag. ${question.sourcePage}`;

  // Category
  if (UI.categoryBadge) {
    UI.categoryBadge.textContent = question.category || 'generale';
    UI.categoryBadge.className = 'badge badge-accent';
  }

  // Question text
  if (UI.questionText) UI.questionText.textContent = question.question;

  // Counter & Progress
  updateProgressUI();

  // Choices
  if (UI.choicesList) {
    UI.choicesList.innerHTML = '';
    (question.choices || []).forEach(choice => {
      const li = document.createElement('li');
      const btn = document.createElement('button');
      btn.className = 'choice-btn';
      btn.setAttribute('data-next', choice.nextPage);
      btn.setAttribute('data-label', choice.label);

      btn.innerHTML = `<span class="choice-label">${choice.label}</span><span>${escapeHtml(choice.text)}</span>`;
      btn.addEventListener('click', () => handleChoiceClick(btn, choice));
      li.appendChild(btn);
      UI.choicesList.appendChild(li);
    });
  }

  // Nascondi spiegazione e continua
  if (UI.explanationBox) UI.explanationBox.classList.add('hidden');
  if (UI.btnContinue)   UI.btnContinue.classList.add('hidden');

  // Timer visibilità
  if (UI.timerWrap) {
    UI.timerWrap.classList.toggle('hidden', AppState.mode !== 'simulation');
  }

  // Skip button (solo simulazione)
  if (UI.btnSkip) {
    UI.btnSkip.classList.toggle('hidden', AppState.mode !== 'simulation');
  }

  // Ripasso counter
  if (UI.reviewCounter) {
    if (AppState.mode === 'review') {
      const user = Auth.getCurrentUser();
      const remaining = user ? (user.data.wrongAnswers || []).length : 0;
      UI.reviewCounter.textContent = `Errori rimanenti: ${remaining}`;
      UI.reviewCounter.classList.remove('hidden');
    } else {
      UI.reviewCounter.classList.add('hidden');
    }
  }
}

/**
 * Gestisce il clic su una scelta.
 * @param {HTMLButtonElement} btn
 * @param {Object} choice
 */
function handleChoiceClick(btn, choice) {
  if (AppState.answered) return;
  AppState.answered = true;

  // Disabilita tutti i bottoni
  const allBtns = UI.choicesList.querySelectorAll('.choice-btn');
  allBtns.forEach(b => b.disabled = true);

  // Trova spiegazione tramite nextPage
  const explanation = findExplanation(choice.nextPage);

  if (AppState.mode === 'simulation') {
    // Simulazione: registra risposta senza mostrare spiegazione
    const idx = AppState.sim.index;
    const isCorrect = explanation ? explanation.isCorrect : false;

    AppState.sim.answers[idx].choiceLabel = choice.label;
    AppState.sim.answers[idx].isCorrect = isCorrect;
    AppState.sim.answers[idx].answered = true;

    // Visual feedback leggero
    btn.classList.add(isCorrect ? 'correct' : 'wrong');

    // Vai alla prossima
    setTimeout(() => {
      AppState.sim.index++;
      renderSimQuestion();
    }, 500);
    return;
  }

  // Allenamento / Ripasso
  if (!explanation) {
    // Pagina non trovata: fallback
    btn.style.borderColor = 'var(--warn)';
    showError(`Spiegazione per pagina ${choice.nextPage} non trovata. Salto avanti.`);
    setTimeout(() => advanceTraining(null), 1500);
    return;
  }

  AppState.currentExplanation = explanation;

  // Evidenzia risposta
  btn.classList.add(explanation.isCorrect ? 'correct' : 'wrong');

  // Se allenamento: evidenzia anche la corretta se sbagliato
  if (!explanation.isCorrect && AppState.mode !== 'simulation') {
    // Cerca quale scelta porta alla spiegazione corretta
    const correctChoice = (AppState.currentQuestion.choices || []).find(c => {
      const exp = findExplanation(c.nextPage);
      return exp && exp.isCorrect;
    });
    if (correctChoice) {
      allBtns.forEach(b => {
        if (b.getAttribute('data-label') === correctChoice.label) {
          b.classList.add('correct');
        }
      });
    }
  }

  // Aggiorna stats
  updateStats(explanation.isCorrect);

  // Mostra spiegazione
  if (UI.explanationBox && UI.explanationText) {
    UI.explanationText.textContent = explanation.text || '';
    UI.explanationBox.className = `explanation-box${explanation.isCorrect ? '' : ' wrong-expl'}`;
    UI.explanationBox.classList.remove('hidden');
  }

  // Mostra bottone continua
  if (UI.btnContinue) {
    UI.btnContinue.classList.remove('hidden');
    UI.btnContinue.textContent = explanation.isCorrect ? '→ Continua' : '→ Continua (errore registrato)';
  }

  // Ripasso: aggiorna coda errori
  if (AppState.mode === 'review') {
    updateReviewQueue(AppState.currentQuestion.id, explanation.isCorrect);
  }
}

/**
 * Procedi alla prossima domanda (allenamento).
 */
function advanceTraining(explanation) {
  const nextPage = explanation ? explanation.nextPage : null;

  if (!nextPage) {
    showSuccess('Hai completato tutte le domande disponibili! 🎓');
    UI.showSection(UI.welcome);
    return;
  }

  // Anti-loop
  if (AppState.visitedPages.has(nextPage)) {
    showSuccess('Hai completato il percorso di allenamento! 🎓');
    UI.showSection(UI.welcome);
    return;
  }
  AppState.visitedPages.add(nextPage);

  // Cerca se nextPage è una domanda o una spiegazione
  const nextQuestion = findQuestion(nextPage);
  if (nextQuestion) {
    Auth.updateCurrentUser({ progressPage: nextPage });
    renderQuestion(nextQuestion);
    return;
  }

  // Potrebbe essere un'altra spiegazione (grafo lineare)
  const nextExp = findExplanation(nextPage);
  if (nextExp) {
    advanceTraining(nextExp);
    return;
  }

  // Fallback: pagina non trovata
  showSuccess('Fine del percorso disponibile! 🎓');
  UI.showSection(UI.welcome);
}

/**
 * Aggiorna statistiche utente dopo una risposta.
 * @param {boolean} isCorrect
 */
function updateStats(isCorrect) {
  const user = Auth.getCurrentUser();
  if (!user) return;

  const stats = user.data.stats || { totalAnswered: 0, correct: 0, wrong: 0 };
  stats.totalAnswered++;
  if (isCorrect) stats.correct++;
  else stats.wrong++;

  let wrongAnswers = [...(user.data.wrongAnswers || [])];

  if (!isCorrect) {
    const qId = AppState.currentQuestion?.id;
    if (qId && !wrongAnswers.includes(qId)) wrongAnswers.push(qId);
  }

  Auth.updateCurrentUser({ stats, wrongAnswers });
}

/**
 * Aggiorna la coda del ripasso dopo una risposta.
 * @param {string} qId
 * @param {boolean} isCorrect
 */
function updateReviewQueue(qId, isCorrect) {
  const user = Auth.getCurrentUser();
  if (!user) return;

  let wrongAnswers = [...(user.data.wrongAnswers || [])];

  if (isCorrect) {
    // Rimuovi dagli errori
    wrongAnswers = wrongAnswers.filter(id => id !== qId);
    Auth.updateCurrentUser({ wrongAnswers });
  } else {
    // Già presente, nessuna modifica
  }
}

/**
 * Aggiorna progress bar e contatore.
 */
function updateProgressUI() {
  if (AppState.mode === 'simulation') {
    const { index, questions } = AppState.sim;
    const total = questions.length;
    const pct = total > 0 ? Math.round(((index) / total) * 100) : 0;

    if (UI.questionCounter) UI.questionCounter.textContent = `${index + 1} / ${total}`;
    if (UI.progressFill)    UI.progressFill.style.width = pct + '%';
    if (UI.progressText)    UI.progressText.textContent = pct + '%';

  } else if (AppState.mode === 'training') {
    const total = AppState.questions.length;
    const user = Auth.getCurrentUser();
    const done = user ? (user.data.stats?.totalAnswered || 0) : 0;
    const pct = total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 0;

    if (UI.questionCounter) UI.questionCounter.textContent = `pag. ${AppState.currentQuestion?.sourcePage || '?'}`;
    if (UI.progressFill)    UI.progressFill.style.width = pct + '%';
    if (UI.progressText)    UI.progressText.textContent = `${pct}% completato`;

  } else if (AppState.mode === 'review') {
    const user = Auth.getCurrentUser();
    const total = AppState.review.queue.length;
    const idx = AppState.review.index;
    const pct = total > 0 ? Math.round((idx / total) * 100) : 0;

    if (UI.questionCounter) UI.questionCounter.textContent = `${idx + 1} / ${total}`;
    if (UI.progressFill)    UI.progressFill.style.width = pct + '%';
    if (UI.progressText)    UI.progressText.textContent = `Errori: ${(user?.data.wrongAnswers || []).length}`;
  }
}

// ── Risultati ─────────────────────────────────────────────

/**
 * Mostra la schermata risultati.
 * @param {Object} data
 */
function renderResults({ correct, wrong, skipped, pct, totalTime, answers, score }) {
  if (UI.resultPct)    UI.resultPct.textContent = pct + '%';
  if (UI.resultCorrect) UI.resultCorrect.textContent = correct;
  if (UI.resultWrong)   UI.resultWrong.textContent = wrong;
  if (UI.resultSkipped) UI.resultSkipped.textContent = skipped;

  const mins = Math.floor(totalTime / 60);
  const secs = totalTime % 60;
  if (UI.resultTime) UI.resultTime.textContent = `${mins}:${String(secs).padStart(2,'0')}`;

  // Elenco risposte
  if (UI.resultList) {
    UI.resultList.innerHTML = '';
    answers.forEach((a, i) => {
      const q = AppState.sim.questions[i];
      if (!q) return;

      const div = document.createElement('div');
      div.className = 'card mt-sm';
      div.style.padding = '0.8rem 1rem';
      div.style.borderLeft = `3px solid ${a.isCorrect ? 'var(--success)' : a.answered ? 'var(--danger)' : 'var(--text-dim)'}`;

      const icon = a.isCorrect ? '✓' : (a.answered ? '✗' : '—');
      const iconColor = a.isCorrect ? 'var(--success)' : (a.answered ? 'var(--danger)' : 'var(--text-dim)');

      div.innerHTML = `
        <div class="flex-between gap-sm">
          <span class="text-sm text-mono text-muted">Q${i+1} · ${q.category || 'generale'}</span>
          <span style="font-family:var(--font-mono);font-weight:700;color:${iconColor}">${icon}</span>
        </div>
        <p class="text-sm mt-sm" style="color:var(--text)">${escapeHtml(q.question.substring(0, 120))}${q.question.length > 120 ? '…' : ''}</p>
        ${a.choiceLabel ? `<span class="badge badge-muted mt-sm">Risposta: ${a.choiceLabel}</span>` : '<span class="badge badge-muted mt-sm">Non risposta</span>'}
      `;
      UI.resultList.appendChild(div);
    });
  }

  UI.showSection(UI.result);
}

// ── Utility ───────────────────────────────────────────────

/**
 * Escapa HTML per prevenire XSS.
 * @param {string} str
 * @returns {string}
 */
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function showError(msg) {
  const el = document.getElementById('app-alert');
  if (!el) return;
  el.className = 'alert alert-error show';
  el.textContent = msg;
  setTimeout(() => el.classList.remove('show'), 4000);
}

function showSuccess(msg) {
  const el = document.getElementById('app-alert');
  if (!el) return;
  el.className = 'alert alert-success show';
  el.textContent = msg;
  setTimeout(() => el.classList.remove('show'), 4000);
}

function showInfo(msg) {
  const el = document.getElementById('app-alert');
  if (!el) return;
  el.className = 'alert alert-info show';
  el.textContent = msg;
  setTimeout(() => el.classList.remove('show'), 4000);
}

// ── Bootstrap ─────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
  // Applica tema
  Auth.applyTheme();

  // Controlla auth
  if (!Auth.requireAuth()) return;

  const user = Auth.getCurrentUser();

  // Mostra username nella navbar
  if (UI.navUsername) UI.navUsername.textContent = user.username;

  // Carica domande
  const loaded = await loadQuestions();
  if (!loaded) {
    showError('Errore nel caricamento di questions.json');
    return;
  }

  // Event listeners — modalità
  document.getElementById('btn-train-new')?.addEventListener('click', () => startTraining(true));
  document.getElementById('btn-train-resume')?.addEventListener('click', () => startTraining(false));
  document.getElementById('btn-review')?.addEventListener('click', startReview);
  document.getElementById('btn-sim')?.addEventListener('click', showSimConfig);

  // Simulazione config
  document.getElementById('btn-sim-start')?.addEventListener('click', startSimulation);
  document.getElementById('btn-sim-cancel')?.addEventListener('click', () => UI.showSection(UI.welcome));

  // Continua
  UI.btnContinue?.addEventListener('click', () => {
    if (AppState.mode === 'training') {
      advanceTraining(AppState.currentExplanation);
    } else if (AppState.mode === 'review') {
      AppState.review.index++;
      renderReviewQuestion();
    }
  });

  // Skip (simulazione)
  UI.btnSkip?.addEventListener('click', () => {
    if (AppState.mode !== 'simulation') return;
    // Non risposta
    AppState.sim.index++;
    renderSimQuestion();
  });

  // Risultati — torna a home
  document.getElementById('btn-back-home')?.addEventListener('click', () => UI.showSection(UI.welcome));

  // Logout
  document.getElementById('btn-logout')?.addEventListener('click', () => Auth.logout());

  // Theme toggle
  document.getElementById('theme-toggle')?.addEventListener('click', () => Auth.toggleTheme());

  // Info utente nella welcome
  renderWelcomeInfo();

  UI.showSection(UI.welcome);
});

/**
 * Mostra info utente nella schermata welcome.
 */
function renderWelcomeInfo() {
  const user = Auth.getCurrentUser();
  if (!user) return;

  const statsEl = document.getElementById('welcome-stats');
  if (!statsEl) return;

  const { stats, wrongAnswers } = user.data;
  const pct = stats.totalAnswered > 0
    ? Math.round((stats.correct / stats.totalAnswered) * 100)
    : 0;

  statsEl.innerHTML = `
    <div class="stat-grid">
      <div class="stat-item">
        <div class="stat-value">${stats.totalAnswered}</div>
        <div class="stat-label">Risposte</div>
      </div>
      <div class="stat-item">
        <div class="stat-value text-accent">${pct}%</div>
        <div class="stat-label">Precisione</div>
      </div>
      <div class="stat-item">
        <div class="stat-value" style="color:var(--danger)">${(wrongAnswers || []).length}</div>
        <div class="stat-label">Errori attivi</div>
      </div>
    </div>
  `;
}

// Esponi funzioni necessarie globalmente
window.AppState = AppState;
