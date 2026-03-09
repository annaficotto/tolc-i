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

    $('profile-username').textContent = username;
    $('profile-created').textContent = data.createdAt ? new Date(data.createdAt).toLocaleDateString('it-IT') : '—';
    $('stat-total').textContent = global.total;
    $('stat-correct').textContent = global.correct;
    $('stat-wrong').textContent = global.wrong;
    $('stat-pct').textContent = pct + '%';
    $('stat-progress-bar').style.width = pct + '%';
    $('stat-errors').textContent = Object.keys(stats).filter(k => k !== 'global').reduce((acc, k) => acc + (stats[k]?.wrongAnswers?.length || 0), 0);

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
        const count = subStats.wrongAnswers?.length || 0;
        totalErrors += count;
        return `
      <div class="flex-between mb-sm">
        <span class="text-sm text-mono">${sub}</span>
        <span class="badge badge-danger">${count}</span>
      </div>
    `;
    }).join('');

    if (totalErrors === 0) {
        el.innerHTML = '<p class="text-sm text-muted text-center" style="padding:1rem">Nessun errore attivo 🎉</p>';
    } else {
        el.innerHTML = `<div class="flex-between mb-md"><span class="text-sm text-mono text-muted">Errori per materia</span><span class="badge badge-danger">${totalErrors}</span></div>${html}`;
    }
}

function renderHistory(history) {
    const el = $('session-history');
    if (!el) return;
    if (history.length === 0) {
        el.innerHTML = '<p class="text-sm text-muted text-center" style="padding:1rem">Nessuna sessione registrata.</p>';
        return;
    }
    el.innerHTML = history.slice(0, 10).map(s => {
        const date = new Date(s.date).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
        const typeLabel = s.type === 'simulation' ? '⏱ Simulazione' : '📖 Allenamento';
        const pctColor = s.pct >= 70 ? 'var(--success)' : s.pct >= 50 ? 'var(--warn)' : 'var(--danger)';
        return `
      <div class="card mt-sm" style="padding:0.8rem 1rem">
        <div class="flex-between gap-sm">
          <div>
            <span class="text-sm text-mono">${typeLabel} · ${s.subject || 'generale'}</span>
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
    $('btn-reset-progress')?.addEventListener('click', () => openModal('modal-reset-progress'));
    $('btn-confirm-reset-progress')?.addEventListener('click', () => {
        Auth.resetProgress();
        closeModal('modal-reset-progress');
        showMsg('profile-alert', 'Progresso resettato con successo.');
        renderProfile();
    });
    $('btn-cancel-reset-progress')?.addEventListener('click', () => closeModal('modal-reset-progress'));

    $('btn-reset-errors')?.addEventListener('click', () => {
        Auth.resetWrongAnswers();
        showMsg('profile-alert', 'Lista errori azzerata.');
        renderProfile();
    });

    $('btn-change-password')?.addEventListener('click', () => openModal('modal-change-password'));
    $('btn-confirm-change-pwd')?.addEventListener('click', async () => {
        const oldPwd = $('input-old-pwd')?.value || '';
        const newPwd = $('input-new-pwd')?.value || '';
        const confPwd = $('input-conf-pwd')?.value || '';
        if (newPwd !== confPwd) {
            showMsg('pwd-alert', 'Le password non coincidono.', 'error');
            return;
        }
        const result = await Auth.changePassword(oldPwd, newPwd);
        if (result.ok) {
            closeModal('modal-change-password');
            $('input-old-pwd').value = '';
            $('input-new-pwd').value = '';
            $('input-conf-pwd').value = '';
            showMsg('profile-alert', 'Password aggiornata con successo!');
        } else {
            showMsg('pwd-alert', result.error || 'Errore.', 'error');
        }
    });
    $('btn-cancel-change-pwd')?.addEventListener('click', () => closeModal('modal-change-password'));

    $('btn-delete-account')?.addEventListener('click', () => openModal('modal-delete-account'));
    $('btn-confirm-delete')?.addEventListener('click', async () => {
        const pwd = $('input-delete-pwd')?.value || '';
        const result = await Auth.deleteAccount(pwd);
        if (result.ok) window.location.href = 'index.html';
        else showMsg('delete-alert', result.error || 'Errore.', 'error');
    });
    $('btn-cancel-delete')?.addEventListener('click', () => closeModal('modal-delete-account'));

    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', e => { if (e.target === overlay) overlay.classList.remove('open'); });
    });

    $('btn-logout')?.addEventListener('click', () => Auth.logout());
    $('theme-toggle')?.addEventListener('click', () => Auth.toggleTheme());
}

document.addEventListener('DOMContentLoaded', () => {
    Auth.applyTheme();
    if (!Auth.requireAuth()) return;
    const user = Auth.getCurrentUser();
    $('nav-username').textContent = user.username;
    renderProfile();
    initProfileEvents();
});