'use strict';

// Determina la materia in base al nome del file HTML
function getSubjectFromPath() {
    const path = window.location.pathname;
    const fileName = path.split('/').pop().replace('.html', '');
    
    const subjectMap = {
        'logica-tutor': 'logica-tutor',
        'matematica1-tutor': 'matematica1-tutor',
        'matematica2-tutor': 'matematica2-tutor',
        'scienze-tutor': 'scienze-tutor',
        'fisica-esempio2': 'fisica-esempio2',
        'logica-esempio1': 'logica-esempio1',
        'logica-esempio2': 'logica-esempio2',
        'matematica-esempio1': 'matematica-esempio1',
        'matematica-esempio2': 'matematica-esempio2',
        'scienze-esempio1': 'scienze-esempio1'
    };
    
    return subjectMap[fileName] || 'logica-tutor'; // default logica
}

const SUBJECT = getSubjectFromPath();
const DATA_FILE = `../data/${SUBJECT}.json`;

console.log(`🎯 Caricata materia: ${SUBJECT}`);

const AppState = {
    questions: [],
    mode: null,
    currentQuestion: null,
    answered: false,
    sim: { questions: [], index: 0, answers: [], timerSeconds: 0, timerInterval: null, penalty: 0 },
    review: { queue: [], index: 0 }
};

// UI references
const UI = {
    welcome: document.getElementById('section-welcome'),
    quiz: document.getElementById('section-quiz'),
    result: document.getElementById('section-result'),
    simConfig: document.getElementById('section-sim-config'),
    modeBadge: document.getElementById('mode-badge'),
    questionCounter: document.getElementById('question-counter'),
    progressFill: document.getElementById('progress-fill'),
    progressText: document.getElementById('progress-text'),
    questionText: document.getElementById('question-text'),
    categoryBadge: document.getElementById('category-badge'),
    choicesList: document.getElementById('choices-list'),
    explanationBox: document.getElementById('explanation-box'),
    explanationText: document.getElementById('explanation-text'),
    explanationImage: document.getElementById('explanation-image'),
    explanationImageWrap: document.getElementById('explanation-image-wrap'),
    btnContinue: document.getElementById('btn-continue'),
    btnSkip: document.getElementById('btn-skip'),
    timerWrap: document.getElementById('timer-wrap'),
    timerDisplay: document.getElementById('timer-display'),
    reviewCounter: document.getElementById('review-counter'),
    pageId: document.getElementById('page-id'),
    resultPct: document.getElementById('result-pct'),
    resultCorrect: document.getElementById('result-correct'),
    resultWrong: document.getElementById('result-wrong'),
    resultSkipped: document.getElementById('result-skipped'),
    resultTime: document.getElementById('result-time'),
    resultList: document.getElementById('result-list'),
    navUsername: document.getElementById('nav-username'),

    showSection(section) {
        [this.welcome, this.quiz, this.result, this.simConfig].forEach(s => s?.classList.add('hidden'));
        section?.classList.remove('hidden');
        section?.classList.add('fade-in');
    }
};

async function loadQuestions() {
    try {
        const resp = await fetch(DATA_FILE);
        if (!resp.ok) throw new Error(`File ${DATA_FILE} non trovato`);
        const data = await resp.json();
        if (!data.questions) throw new Error('Campo "questions" mancante');
        AppState.questions = data.questions;
        
        // Aggiorna il titolo della pagina
        const titleMap = {
            logica_tutor: 'Logica (Tutor)',
            matematica1_tutor: 'Matematica 1 (Tutor)',
            matematica2_tutor: 'Matematica 2 (Tutor)',
            scienze_tutor: 'Scienze (Tutor)',
            fisicaEsempio2: 'Fisica (Esempio 2)',
            logicaEsempio1: 'Logica (Esempio 1)',
            logicaEsempio2: 'Logica (Esempio 2)',
            matematicaEsempio1: 'Matematica (Esempio 1)',
            matematicaEsempio2: 'Matematica (Esempio 2)',
            scienzeEsempio1: 'Scienze (Esempio 1)'

        };
        document.title = `TOLC Trainer — ${titleMap[SUBJECT]}`;
        
        // Aggiorna il nome nella welcome
        const welcomeName = document.getElementById('welcome-name');
        if (welcomeName) welcomeName.textContent = titleMap[SUBJECT];
        
        return true;
    } catch (err) {
        console.error('Errore caricamento domande:', err);
        return false;
    }
}

function findQuestionById(id) {
    return AppState.questions.find(q => q.id === id) || null;
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

function escapeHtml(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function setupImage(imgElement, src, fallbackMessage = 'Immagine non disponibile') {
    if (!imgElement) return;

    if (!src) {
        imgElement.style.display = 'none';
        return;
    }

    imgElement.onload = () => {
        imgElement.style.display = 'inline-block';
    };

    imgElement.onerror = () => {
        imgElement.style.display = 'none';
        const parent = imgElement.parentElement;
        if (parent) {
            const fallback = document.createElement('span');
            fallback.className = 'text-sm text-muted';
            fallback.textContent = fallbackMessage;
            parent.appendChild(fallback);
        }
    };

    imgElement.src = src;
}

function updateStats(isCorrect) {
    const user = Auth.getCurrentUser();
    if (!user) return;

    const stats = user.data.stats;
    const sub = stats[SUBJECT] || { total: 0, correct: 0, wrong: 0, wrongAnswers: [] };
    if (!Array.isArray(sub.wrongAnswers)) {
        sub.wrongAnswers = [];
    }

    sub.total++;
    if (isCorrect) sub.correct++; else sub.wrong++;

    const global = stats.global || { total: 0, correct: 0, wrong: 0 };
    global.total++;
    if (isCorrect) global.correct++; else global.wrong++;

    if (!isCorrect) {
        const qId = AppState.currentQuestion?.id;
        if (qId && !sub.wrongAnswers.includes(qId)) {
            sub.wrongAnswers.push(qId);
        }
    }

    Auth.updateCurrentUser({
        stats: {
            [SUBJECT]: sub,
            global: global
        }
    });
}

function updateReviewQueue(qId, isCorrect) {
    const user = Auth.getCurrentUser();
    if (!user) return;
    const sub = user.data.stats[SUBJECT] || { wrongAnswers: [] };
    if (!Array.isArray(sub.wrongAnswers)) sub.wrongAnswers = [];
    let wrong = [...sub.wrongAnswers];
    if (isCorrect) {
        wrong = wrong.filter(id => id !== qId);
    } else if (!wrong.includes(qId)) {
        wrong.push(qId);
    }
    Auth.updateCurrentUser({ stats: { [SUBJECT]: { ...sub, wrongAnswers: wrong } } });
}

function updateProgressUI() {
    if (AppState.mode === 'simulation') {
        const { index, questions } = AppState.sim;
        const total = questions.length;
        const pct = total > 0 ? Math.round((index / total) * 100) : 0;
        if (UI.questionCounter) UI.questionCounter.textContent = `${index + 1} / ${total}`;
        if (UI.progressFill) UI.progressFill.style.width = pct + '%';
        if (UI.progressText) UI.progressText.textContent = pct + '%';
    } else if (AppState.mode === 'training') {
        const total = AppState.questions.length;
        const user = Auth.getCurrentUser();
        const sub = user?.data.stats[SUBJECT] || { total: 0 };
        const done = sub.total || 0;
        const pct = total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 0;
        if (UI.questionCounter) UI.questionCounter.textContent = `pag. ${AppState.currentQuestion?.sourcePage || '?'}`;
        if (UI.progressFill) UI.progressFill.style.width = pct + '%';
        if (UI.progressText) UI.progressText.textContent = `${pct}% completato`;
    } else if (AppState.mode === 'review') {
        const total = AppState.review.queue.length;
        const idx = AppState.review.index;
        const pct = total > 0 ? Math.round((idx / total) * 100) : 0;
        if (UI.questionCounter) UI.questionCounter.textContent = `${idx + 1} / ${total}`;
        if (UI.progressFill) UI.progressFill.style.width = pct + '%';
        if (UI.progressText) UI.progressText.textContent = `Errori: ${AppState.review.queue.length}`;
    }
}

function renderQuestion(question) {
    AppState.currentQuestion = question;
    AppState.answered = false;
    if (!UI.quiz) return;

    const modeLabels = { training: '📖 Allenamento', review: '🔁 Ripasso', simulation: '⏱ Simulazione' };
    if (UI.modeBadge) UI.modeBadge.textContent = modeLabels[AppState.mode] || '';
    if (UI.pageId) UI.pageId.textContent = `pag. ${question.sourcePage}`;
    if (UI.categoryBadge) {
        UI.categoryBadge.textContent = question.category || 'generale';
        UI.categoryBadge.className = 'badge badge-accent';
    }
    if (UI.questionText) UI.questionText.textContent = question.question;

    const imgWrap = document.getElementById('question-image-wrap');
    const imgEl = document.getElementById('question-image');

    if (imgWrap && imgEl) {
        if (question.image && question.image !== null) {
            imgWrap.classList.remove('hidden');
            imgEl.src = question.image;
            imgEl.alt = `Immagine per ${question.id}`;
            imgEl.onload = () => imgEl.style.display = 'inline-block';
            imgEl.onerror = () => {
                imgEl.style.display = 'none';
                const fallback = document.createElement('span');
                fallback.className = 'text-sm text-muted';
                fallback.textContent = '⚠ Immagine non disponibile';
                imgWrap.innerHTML = '';
                imgWrap.appendChild(fallback);
            };
        } else {
            imgWrap.classList.add('hidden');
            imgEl.src = '';
        }
    }

    updateProgressUI();

    if (UI.choicesList) {
        UI.choicesList.innerHTML = '';
        (question.choices || []).forEach(choice => {
            const li = document.createElement('li');
            const btn = document.createElement('button');
            btn.className = 'choice-btn';

            btn.innerHTML = `<span class="choice-label">${choice.label}</span><span>${escapeHtml(choice.text)}</span>`;

            if (choice.image) {
                btn.dataset.choiceImage = choice.image;
            }

            btn.addEventListener('click', () => handleChoiceClick(btn, choice));
            li.appendChild(btn);
            UI.choicesList.appendChild(li);
        });
    }

    const choiceImageContainer = document.getElementById('choice-image-container');
    if (choiceImageContainer) {
        choiceImageContainer.classList.add('hidden');
    }

    if (UI.explanationBox) UI.explanationBox.classList.add('hidden');
    if (UI.btnContinue) UI.btnContinue.classList.add('hidden');
    if (UI.timerWrap) UI.timerWrap.classList.toggle('hidden', AppState.mode !== 'simulation');
    if (UI.btnSkip) UI.btnSkip.classList.toggle('hidden', AppState.mode !== 'simulation');

    if (UI.reviewCounter) {
        if (AppState.mode === 'review') {
            const user = Auth.getCurrentUser();
            const remaining = user?.data.stats[SUBJECT]?.wrongAnswers?.length || 0;
            UI.reviewCounter.textContent = `Errori rimanenti: ${remaining}`;
            UI.reviewCounter.classList.remove('hidden');
        } else {
            UI.reviewCounter.classList.add('hidden');
        }
    }
}

function handleChoiceClick(btn, choice) {
    if (AppState.answered && AppState.mode !== 'training') return;

    const isCorrect = choice.soluzione === true;
    const feedback = choice.feedback || '';

    if (AppState.mode === 'simulation') {
        if (AppState.answered) return;
        AppState.answered = true;
        document.querySelectorAll('.choice-btn').forEach(b => b.disabled = true);
        const idx = AppState.sim.index;
        AppState.sim.answers[idx].choiceLabel = choice.label;
        AppState.sim.answers[idx].isCorrect = isCorrect;
        AppState.sim.answers[idx].answered = true;
        btn.classList.add(isCorrect ? 'correct' : 'wrong');
        setTimeout(() => { AppState.sim.index++; renderSimQuestion(); }, 500);
        return;
    }

    if (AppState.answered) return;

    if (isCorrect) {
        AppState.answered = true;
        document.querySelectorAll('.choice-btn').forEach(b => b.disabled = true);
        btn.classList.add('correct');
        updateStats(true);
        if (AppState.mode === 'review') updateReviewQueue(AppState.currentQuestion.id, true);

        if (UI.explanationBox && UI.explanationText) {
            UI.explanationText.textContent = feedback || 'Corretto! ✓';

            const choiceImageContainer = document.getElementById('choice-image-container');
            const choiceImageEl = document.getElementById('choice-image');

            if (choiceImageContainer && choiceImageEl) {
                if (choice.image) {
                    choiceImageContainer.classList.remove('hidden');
                    choiceImageEl.src = choice.image;
                    choiceImageEl.alt = `Immagine per risposta ${choice.label}`;
                    choiceImageEl.onload = () => choiceImageEl.style.display = 'inline-block';
                    choiceImageEl.onerror = () => {
                        choiceImageEl.style.display = 'none';
                        choiceImageContainer.innerHTML = '<span class="text-sm text-muted">⚠ Immagine non disponibile</span>';
                    };
                } else {
                    choiceImageContainer.classList.add('hidden');
                    choiceImageEl.src = '';
                }
            }

            const expImgWrap = document.getElementById('explanation-image-wrap');
            const expImgEl = document.getElementById('explanation-image');

            if (expImgWrap && expImgEl) {
                if (AppState.currentQuestion.imageExplanation) {
                    expImgWrap.classList.remove('hidden');
                    expImgEl.src = AppState.currentQuestion.imageExplanation;
                    expImgEl.alt = 'Immagine spiegazione';
                    expImgEl.onload = () => expImgEl.style.display = 'inline-block';
                    expImgEl.onerror = () => {
                        expImgEl.style.display = 'none';
                        expImgWrap.innerHTML = '<span class="text-sm text-muted">⚠ Immagine spiegazione non disponibile</span>';
                    };
                } else {
                    expImgWrap.classList.add('hidden');
                    expImgEl.src = '';
                }
            }

            UI.explanationBox.classList.remove('hidden');
            UI.explanationBox.className = 'explanation-box';
        }
        if (UI.btnContinue) UI.btnContinue.classList.remove('hidden');
    } else {
        btn.classList.add('wrong');

        updateStats(false);

        if (AppState.mode === 'review') {
            updateReviewQueue(AppState.currentQuestion.id, false);
        } else {
            const user = Auth.getCurrentUser();
            if (user) {
                const sub = user.data.stats[SUBJECT] || { wrongAnswers: [] };
                const wrongs = [...(sub.wrongAnswers || [])];
                if (!wrongs.includes(AppState.currentQuestion.id)) {
                    wrongs.push(AppState.currentQuestion.id);
                    Auth.updateCurrentUser({ stats: { [SUBJECT]: { ...sub, wrongAnswers: wrongs } } });
                }
            }
        }

        if (UI.explanationBox && UI.explanationText) {
            UI.explanationText.textContent = feedback || 'Sbagliato! Riprova.';

            const choiceImageContainer = document.getElementById('choice-image-container');
            const choiceImageEl = document.getElementById('choice-image');

            if (choiceImageContainer && choiceImageEl) {
                if (choice.image) {
                    choiceImageContainer.classList.remove('hidden');
                    choiceImageEl.src = choice.image;
                    choiceImageEl.alt = `Immagine per risposta ${choice.label}`;
                    choiceImageEl.onload = () => choiceImageEl.style.display = 'inline-block';
                    choiceImageEl.onerror = () => {
                        choiceImageEl.style.display = 'none';
                        choiceImageContainer.innerHTML = '<span class="text-sm text-muted">⚠ Immagine non disponibile</span>';
                    };
                } else {
                    choiceImageContainer.classList.add('hidden');
                    choiceImageEl.src = '';
                }
            }

            const expImgWrap = document.getElementById('explanation-image-wrap');
            const expImgEl = document.getElementById('explanation-image');

            if (expImgWrap && expImgEl) {
                if (AppState.currentQuestion.imageExplanation) {
                    expImgWrap.classList.remove('hidden');
                    expImgEl.src = AppState.currentQuestion.imageExplanation;
                    expImgEl.alt = 'Immagine spiegazione';
                    expImgEl.onload = () => expImgEl.style.display = 'inline-block';
                    expImgEl.onerror = () => {
                        expImgEl.style.display = 'none';
                        expImgWrap.innerHTML = '<span class="text-sm text-muted">⚠ Immagine spiegazione non disponibile</span>';
                    };
                } else {
                    expImgWrap.classList.add('hidden');
                    expImgEl.src = '';
                }
            }

            UI.explanationBox.classList.remove('hidden');
            UI.explanationBox.className = 'explanation-box wrong-expl';
        }

        setTimeout(() => {
            btn.classList.remove('wrong');
        }, 300);
    }
}

function advanceTraining() {
    const questions = AppState.questions;
    const currentId = AppState.currentQuestion?.id;
    const currentIndex = questions.findIndex(q => q.id === currentId);
    const nextQuestion = questions[currentIndex + 1];
    if (nextQuestion) {
        Auth.updateCurrentUser({ stats: { [SUBJECT]: { ...Auth.getCurrentUser().data.stats[SUBJECT], progressPage: nextQuestion.id } } });
        renderQuestion(nextQuestion);
    } else {
        showSuccess('Hai completato tutte le domande! 🎓');
        UI.showSection(UI.welcome);
    }
}

function startTraining(fromStart = false) {
    const user = Auth.getCurrentUser();
    if (!user) return;
    AppState.mode = 'training';
    let startQuestion;
    if (fromStart || !user.data.stats[SUBJECT]?.progressPage) {
        startQuestion = AppState.questions[0];
    } else {
        startQuestion = AppState.questions.find(q => q.id === user.data.stats[SUBJECT].progressPage);
    }
    if (!startQuestion) startQuestion = AppState.questions[0];
    Auth.updateCurrentUser({ stats: { [SUBJECT]: { ...user.data.stats[SUBJECT], progressPage: startQuestion.id } } });
    renderQuestion(startQuestion);
    UI.showSection(UI.quiz);
}

function startReview() {
    const user = Auth.getCurrentUser();
    if (!user) return;
    const wrongs = [...(user.data.stats[SUBJECT]?.wrongAnswers || [])];
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

function renderReviewQuestion() {
    const { queue, index } = AppState.review;
    if (index >= queue.length) {
        const user = Auth.getCurrentUser();
        const remaining = user?.data.stats[SUBJECT]?.wrongAnswers?.length || 0;
        if (remaining === 0) showSuccess('Hai corretto tutti gli errori! 🏆');
        else {
            AppState.review.queue = [...(user.data.stats[SUBJECT].wrongAnswers || [])];
            AppState.review.index = 0;
            renderReviewQuestion();
        }
        return;
    }
    const qId = queue[index];
    const question = findQuestionById(qId);
    if (!question) {
        AppState.review.index++;
        renderReviewQuestion();
        return;
    }
    renderQuestion(question);
}

function showSimConfig() {
    UI.showSection(UI.simConfig);
}

function startSimulation() {
    const numQ = parseInt(document.getElementById('sim-num-questions').value, 10) || 20;
    const mins = parseInt(document.getElementById('sim-minutes').value, 10) || 90;
    const pen = parseFloat(document.getElementById('sim-penalty').value) || 0;
    const allQ = [...AppState.questions];
    if (allQ.length === 0) { showError('Nessuna domanda disponibile.'); return; }
    const shuffled = allQ.sort(() => Math.random() - 0.5).slice(0, Math.min(numQ, allQ.length));
    AppState.mode = 'simulation';
    AppState.sim.questions = shuffled;
    AppState.sim.index = 0;
    AppState.sim.answers = shuffled.map(q => ({ questionId: q.id, choiceLabel: null, isCorrect: null, answered: false }));
    AppState.sim.timerSeconds = mins * 60;
    AppState.sim.penalty = pen;
    if (AppState.sim.timerInterval) clearInterval(AppState.sim.timerInterval);
    AppState.sim.timerInterval = setInterval(tickTimer, 1000);
    renderSimQuestion();
    UI.showSection(UI.quiz);
}

function tickTimer() {
    AppState.sim.timerSeconds--;
    if (UI.timerDisplay) {
        const m = Math.floor(AppState.sim.timerSeconds / 60);
        const s = AppState.sim.timerSeconds % 60;
        UI.timerDisplay.textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
        UI.timerDisplay.className = 'timer-display';
        if (AppState.sim.timerSeconds <= 300) UI.timerDisplay.classList.add('warn');
        if (AppState.sim.timerSeconds <= 60) UI.timerDisplay.classList.add('danger');
    }
    if (AppState.sim.timerSeconds <= 0) {
        clearInterval(AppState.sim.timerInterval);
        endSimulation();
    }
}

function renderSimQuestion() {
    const { questions, index } = AppState.sim;
    if (index >= questions.length) {
        endSimulation();
        return;
    }
    renderQuestion(questions[index]);
}

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
    const pct = questions.length > 0 ? Math.round((correct / questions.length) * 100) : 0;
    const user = Auth.getCurrentUser();
    if (user) {
        const sub = user.data.stats[SUBJECT] || { total: 0, correct: 0, wrong: 0 };
        sub.total += answers.filter(a => a.answered).length;
        sub.correct += correct;
        sub.wrong += wrong;
        const global = user.data.stats.global || { total: 0, correct: 0, wrong: 0 };
        global.total += answers.filter(a => a.answered).length;
        global.correct += correct;
        global.wrong += wrong;
        const history = user.data.history || [];
        history.unshift({
            type: 'simulation',
            subject: SUBJECT,
            date: new Date().toISOString(),
            correct, wrong, skipped,
            total: questions.length,
            pct
        });
        Auth.updateCurrentUser({ stats: { [SUBJECT]: sub, global: global }, history: history.slice(0, 50) });
    }
    renderResults({ correct, wrong, skipped, pct, totalTime, answers });
}

function renderResults({ correct, wrong, skipped, pct, totalTime, answers }) {
    if (UI.resultPct) UI.resultPct.textContent = pct + '%';
    if (UI.resultCorrect) UI.resultCorrect.textContent = correct;
    if (UI.resultWrong) UI.resultWrong.textContent = wrong;
    if (UI.resultSkipped) UI.resultSkipped.textContent = skipped;
    const mins = Math.floor(totalTime / 60);
    const secs = totalTime % 60;
    if (UI.resultTime) UI.resultTime.textContent = `${mins}:${String(secs).padStart(2, '0')}`;

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

            let answerPreview = '';
            if (a.choiceLabel) {
                const choice = q.choices.find(c => c.label === a.choiceLabel);
                if (choice && choice.image) {
                    answerPreview = `<img src="${choice.image}" alt="Risposta ${a.choiceLabel}" class="choice-image-small" style="max-height:30px;margin-right:0.5rem;">`;
                }
            }

            div.innerHTML = `
        <div class="flex-between gap-sm">
          <span class="text-sm text-mono text-muted">Q${i + 1} · ${q.category || 'generale'}</span>
          <span style="font-family:var(--font-mono);font-weight:700;color:${iconColor}">${icon}</span>
        </div>
        <div class="flex align-center mt-sm" style="gap:0.5rem;">
          ${answerPreview}
          <p class="text-sm" style="color:var(--text);flex:1;">${escapeHtml(q.question.substring(0, 120))}${q.question.length > 120 ? '…' : ''}</p>
        </div>
        ${a.choiceLabel ? `<span class="badge badge-muted mt-sm">Risposta: ${a.choiceLabel}</span>` : '<span class="badge badge-muted mt-sm">Non risposta</span>'}
      `;
            UI.resultList.appendChild(div);
        });
    }
    UI.showSection(UI.result);
}

function renderWelcomeInfo() {
    const user = Auth.getCurrentUser();
    if (!user) return;
    const statsEl = document.getElementById('welcome-stats');
    if (!statsEl) return;
    const sub = user.data.stats[SUBJECT] || { total: 0, correct: 0, wrong: 0, wrongAnswers: [] };
    const pct = sub.total > 0 ? Math.round((sub.correct / sub.total) * 100) : 0;
    statsEl.innerHTML = `
    <div class="stat-grid">
      <div class="stat-item"><div class="stat-value">${sub.total}</div><div class="stat-label">Risposte</div></div>
      <div class="stat-item"><div class="stat-value text-accent">${pct}%</div><div class="stat-label">Precisione</div></div>
      <div class="stat-item"><div class="stat-value" style="color:var(--danger)">${(sub.wrongAnswers || []).length}</div><div class="stat-label">Errori attivi</div></div>
    </div>
  `;
}

document.addEventListener('DOMContentLoaded', async () => {
    Auth.applyTheme();
    if (!Auth.requireAuth()) return;
    const user = Auth.getCurrentUser();
    if (UI.navUsername) UI.navUsername.textContent = user.username;
    
    const loaded = await loadQuestions();
    if (!loaded) { showError('Errore nel caricamento delle domande'); return; }

    document.getElementById('btn-train-new')?.addEventListener('click', () => startTraining(true));
    document.getElementById('btn-train-resume')?.addEventListener('click', () => startTraining(false));
    document.getElementById('btn-review')?.addEventListener('click', startReview);
    document.getElementById('btn-sim')?.addEventListener('click', showSimConfig);
    document.getElementById('btn-sim-start')?.addEventListener('click', startSimulation);
    document.getElementById('btn-sim-cancel')?.addEventListener('click', () => UI.showSection(UI.welcome));

    if (UI.btnContinue) {
        UI.btnContinue.addEventListener('click', () => {
            if (AppState.mode === 'training') advanceTraining();
            else if (AppState.mode === 'review') { AppState.review.index++; renderReviewQuestion(); }
        });
    }

    if (UI.btnSkip) {
        UI.btnSkip.addEventListener('click', () => {
            if (AppState.mode !== 'simulation') return;
            AppState.sim.index++;
            renderSimQuestion();
        });
    }

    document.getElementById('btn-back-home')?.addEventListener('click', () => window.location.href = '../dashboard.html');
    document.getElementById('btn-logout')?.addEventListener('click', () => Auth.logout());
    document.getElementById('theme-toggle')?.addEventListener('click', () => Auth.toggleTheme());

    renderWelcomeInfo();
    UI.showSection(UI.welcome);
});

window.AppState = AppState;