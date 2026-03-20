'use strict';

function $(id) { return document.getElementById(id); }

function showMsg(id, msg, type = 'success') {
    const el = $(id);
    if (!el) return;
    el.className = `alert alert-${type} show`;
    el.textContent = msg;
    setTimeout(() => el.classList.remove('show'), 4000);
}

function openModal(id) { $(id)?.classList.add('open'); }
function closeModal(id) { $(id)?.classList.remove('open'); }

function renderProfile() {
    const user = Auth.getCurrentUser();
    if (!user) return;

    const { username, data } = user;
    const stats = data.stats;
    const global = stats.global || { total: 0, correct: 0, wrong: 0 };
    const pct = global.total > 0 ? Math.round((global.correct / global.total) * 100) : 0;

    // Info utente
    $('profile-username').textContent = username;

    // Statistiche globali
    $('stat-total').textContent = global.total;
    $('stat-correct').textContent = global.correct;
    $('stat-wrong').textContent = global.wrong;
    $('stat-pct').textContent = pct + '%';
    $('stat-pct-label').textContent = pct + '%';
    $('stat-progress-bar').style.width = pct + '%';

    // Calcolo errori totali (somma wrongAnswers di tutte le materie)
    const subjects = ['logica', 'matematica1', 'matematica2', 'scienze'];
    const totalErrors = subjects.reduce((acc, sub) => {
        return acc + (stats[sub]?.wrongAnswers?.length || 0);
    }, 0);
    $('stat-errors').textContent = totalErrors;

    renderErrorCategories(stats);
    renderHistory(data.history || []);
}

function renderErrorCategories(stats) {
    const el = $('error-categories');
    if (!el) return;

    const subjects = ['logica', 'matematica1', 'matematica2', 'scienze'];
    let totalErrors = 0;

    const html = subjects.map(sub => {
        const subStats = stats[sub] || { wrongAnswers: [] };
        const wrongAnswers = Array.isArray(subStats.wrongAnswers) ? subStats.wrongAnswers : [];
        const count = wrongAnswers.length;
        totalErrors += count;

        // Nome visualizzato per la materia
        const subNames = {
            logica: 'Logica',
            matematica1: 'Matematica 1',
            matematica2: 'Matematica 2',
            scienze: 'Scienze'
        };

        return `
            <div class="flex-between mb-sm">
                <span class="text-sm text-mono">${subNames[sub] || sub}</span>
                <span class="badge badge-danger">${count}</span>
            </div>
        `;
    }).join('');

    if (totalErrors === 0) {
        el.innerHTML = '<p class="text-sm text-muted text-center" style="padding:1rem">Nessun errore attivo 🎉</p>';
    } else {
        el.innerHTML = `
            <div class="flex-between mb-md">
                <span class="text-sm text-mono text-muted">Errori per materia</span>
                <span class="badge badge-danger">${totalErrors}</span>
            </div>
            ${html}
        `;
    }
}

function renderHistory(history) {
    const el = $('session-history');
    if (!el) return;

    if (!history || history.length === 0) {
        el.innerHTML = '<p class="text-sm text-muted text-center" style="padding:1rem">Nessuna sessione registrata.</p>';
        return;
    }

    el.innerHTML = history.slice(0, 10).map(s => {
        const date = new Date(s.date).toLocaleDateString('it-IT', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        const typeLabel = s.type === 'simulation' ? '⏱ Simulazione' : '📖 Allenamento';
        const pctColor = s.pct >= 70 ? 'var(--success)' : s.pct >= 50 ? 'var(--warn)' : 'var(--danger)';

        // Nome visualizzato per la materia
        const subNames = {
            logica: 'Logica',
            matematica1: 'Matematica 1',
            matematica2: 'Matematica 2',
            scienze: 'Scienze'
        };
        const subjectName = subNames[s.subject] || s.subject || 'generale';

        return `
            <div class="card mt-sm" style="padding:0.8rem 1rem">
                <div class="flex-between gap-sm">
                    <div>
                        <span class="text-sm text-mono">${typeLabel} · ${subjectName}</span>
                        <p class="text-sm text-muted mt-sm">${date}</p>
                    </div>
                    <div class="text-center">
                        <div style="font-family:var(--font-mono);font-size:1.2rem;font-weight:700;color:${pctColor}">${s.pct}%</div>
                        <div class="text-sm text-muted">${s.correct}✓ ${s.wrong}✗ ${s.skipped || 0}—</div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function initProfileEvents() {
    // Reset progresso
    $('btn-reset-progress')?.addEventListener('click', () => openModal('modal-reset-progress'));

    $('btn-confirm-reset-progress')?.addEventListener('click', () => {
        const success = Auth.resetProgress();
        closeModal('modal-reset-progress');
        if (success) {
            showMsg('profile-alert', 'Progresso resettato con successo.');
            renderProfile();
        } else {
            showMsg('profile-alert', 'Errore durante il reset.', 'error');
        }
    });

    $('btn-cancel-reset-progress')?.addEventListener('click', () => closeModal('modal-reset-progress'));

    // Reset errori
    $('btn-reset-errors')?.addEventListener('click', () => {
        if (confirm('Sei sicuro di voler resettare tutti gli errori?')) {
            const success = Auth.resetWrongAnswers();
            if (success) {
                showMsg('profile-alert', 'Lista errori azzerata.');
                renderProfile();
            } else {
                showMsg('profile-alert', 'Errore durante il reset.', 'error');
            }
        }
    });

    // Chiudi modali cliccando fuori
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', e => {
            if (e.target === overlay) overlay.classList.remove('open');
        });
    });

    // Logout
    $('btn-logout')?.addEventListener('click', () => Auth.logout());

    // Toggle tema
    $('theme-toggle')?.addEventListener('click', () => {
        Auth.toggleTheme();
        const toggle = $('theme-toggle');
        if (toggle) toggle.textContent = document.body.classList.contains('light') ? '☾' : '☀';
    });
}

document.addEventListener('DOMContentLoaded', () => {
    Auth.applyTheme();
    if (!Auth.requireAuth()) return;

    const user = Auth.getCurrentUser();
    const navUser = $('nav-username');
    if (navUser) navUser.textContent = user.username;

    const toggle = $('theme-toggle');
    if (toggle) toggle.textContent = document.body.classList.contains('light') ? '☾' : '☀';

    renderProfile();
    initProfileEvents();
});