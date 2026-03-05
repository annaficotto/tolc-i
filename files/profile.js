/**
 * profile.js — Logica pagina profilo utente
 * Mostra statistiche e gestisce azioni account.
 */

'use strict';

// ── Utility UI ────────────────────────────────────────────

function $(id) { return document.getElementById(id); }

function showMsg(id, msg, type = 'success') {
  const el = $(id);
  if (!el) return;
  el.className = `alert alert-${type} show`;
  el.textContent = msg;
  setTimeout(() => el.classList.remove('show'), 4000);
}

function openModal(id) {
  const overlay = $(id);
  if (overlay) overlay.classList.add('open');
}

function closeModal(id) {
  const overlay = $(id);
  if (overlay) overlay.classList.remove('open');
}

// ── Rendering profilo ─────────────────────────────────────

/**
 * Popola tutti i dati del profilo.
 */
function renderProfile() {
  const user = Auth.getCurrentUser();
  if (!user) return;

  const { username, data } = user;
  const { stats, wrongAnswers, createdAt, progressPage, history } = data;

  // Header
  const usernameEl = $('profile-username');
  if (usernameEl) usernameEl.textContent = username;

  const createdEl = $('profile-created');
  if (createdEl) {
    const date = createdAt ? new Date(createdAt).toLocaleDateString('it-IT') : '—';
    createdEl.textContent = date;
  }

  // Stats
  const totalEl = $('stat-total');
  if (totalEl) totalEl.textContent = stats?.totalAnswered || 0;

  const correctEl = $('stat-correct');
  if (correctEl) correctEl.textContent = stats?.correct || 0;

  const wrongEl = $('stat-wrong');
  if (wrongEl) wrongEl.textContent = stats?.wrong || 0;

  const pct = stats?.totalAnswered > 0
    ? Math.round((stats.correct / stats.totalAnswered) * 100)
    : 0;

  const pctEl = $('stat-pct');
  if (pctEl) pctEl.textContent = pct + '%';

  const progressEl = $('stat-progress-bar');
  if (progressEl) progressEl.style.width = pct + '%';

  const pageEl = $('stat-page');
  if (pageEl) pageEl.textContent = progressPage || 9;

  const errorsEl = $('stat-errors');
  if (errorsEl) errorsEl.textContent = (wrongAnswers || []).length;

  // Categoria con più errori
  renderErrorCategories(wrongAnswers || []);

  // Storico sessioni
  renderHistory(history || []);
}

/**
 * Analizza gli errori per categoria e mostra un breakdown.
 * @param {string[]} wrongIds
 */
function renderErrorCategories(wrongIds) {
  const el = $('error-categories');
  if (!el) return;

  if (wrongIds.length === 0) {
    el.innerHTML = '<p class="text-sm text-muted text-center" style="padding:1rem">Nessun errore attivo 🎉</p>';
    return;
  }

  // Recupera domande per gli id errati (da localStorage questions cache se disponibile)
  // Nota: senza il json caricato qui, mostriamo solo gli id
  // Questo è un graceful fallback
  el.innerHTML = `
    <div class="flex-between mb-md">
      <span class="text-sm text-mono text-muted">ID domande con errori</span>
      <span class="badge badge-danger">${wrongIds.length}</span>
    </div>
    <div style="display:flex;flex-wrap:wrap;gap:0.4rem">
      ${wrongIds.slice(0, 30).map(id =>
        `<span class="badge badge-muted">${escapeHtml(id)}</span>`
      ).join('')}
      ${wrongIds.length > 30 ? `<span class="badge badge-muted">+${wrongIds.length - 30} altri</span>` : ''}
    </div>
  `;
}

/**
 * Mostra storico delle sessioni.
 * @param {Array} history
 */
function renderHistory(history) {
  const el = $('session-history');
  if (!el) return;

  if (history.length === 0) {
    el.innerHTML = '<p class="text-sm text-muted text-center" style="padding:1rem">Nessuna sessione registrata.</p>';
    return;
  }

  el.innerHTML = history.slice(0, 10).map(s => {
    const date = new Date(s.date).toLocaleDateString('it-IT', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
    const typeLabel = s.type === 'simulation' ? '⏱ Simulazione' : '📖 Allenamento';
    const pctColor = s.pct >= 70 ? 'var(--success)' : s.pct >= 50 ? 'var(--warn)' : 'var(--danger)';

    return `
      <div class="card mt-sm" style="padding:0.8rem 1rem">
        <div class="flex-between gap-sm">
          <div>
            <span class="text-sm text-mono">${typeLabel}</span>
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

// ── Event Handlers ────────────────────────────────────────

/**
 * Inizializza tutti gli event listener della pagina.
 */
function initProfileEvents() {

  // Reset progresso
  $('btn-reset-progress')?.addEventListener('click', () => {
    openModal('modal-reset-progress');
  });

  $('btn-confirm-reset-progress')?.addEventListener('click', () => {
    Auth.resetProgress();
    closeModal('modal-reset-progress');
    showMsg('profile-alert', 'Progresso resettato con successo.');
    renderProfile();
  });

  $('btn-cancel-reset-progress')?.addEventListener('click', () => closeModal('modal-reset-progress'));

  // Reset errori
  $('btn-reset-errors')?.addEventListener('click', () => {
    Auth.resetWrongAnswers();
    showMsg('profile-alert', 'Lista errori azzerata.');
    renderProfile();
  });

  // Cambia password
  $('btn-change-password')?.addEventListener('click', () => {
    openModal('modal-change-password');
  });

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
      // Reset campi
      if ($('input-old-pwd'))  $('input-old-pwd').value  = '';
      if ($('input-new-pwd'))  $('input-new-pwd').value  = '';
      if ($('input-conf-pwd')) $('input-conf-pwd').value = '';
      showMsg('profile-alert', 'Password aggiornata con successo!');
    } else {
      showMsg('pwd-alert', result.error || 'Errore.', 'error');
    }
  });

  $('btn-cancel-change-pwd')?.addEventListener('click', () => closeModal('modal-change-password'));

  // Elimina account
  $('btn-delete-account')?.addEventListener('click', () => {
    openModal('modal-delete-account');
  });

  $('btn-confirm-delete')?.addEventListener('click', async () => {
    const pwd = $('input-delete-pwd')?.value || '';
    const result = await Auth.deleteAccount(pwd);
    if (result.ok) {
      window.location.href = 'index.html';
    } else {
      showMsg('delete-alert', result.error || 'Errore.', 'error');
    }
  });

  $('btn-cancel-delete')?.addEventListener('click', () => closeModal('modal-delete-account'));

  // Chiudi modal cliccando fuori
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', e => {
      if (e.target === overlay) overlay.classList.remove('open');
    });
  });

  // Logout
  $('btn-logout')?.addEventListener('click', () => Auth.logout());

  // Theme
  $('theme-toggle')?.addEventListener('click', () => Auth.toggleTheme());
}

// ── Bootstrap ─────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  Auth.applyTheme();

  if (!Auth.requireAuth()) return;

  const user = Auth.getCurrentUser();
  const navUsername = $('nav-username');
  if (navUsername) navUsername.textContent = user.username;

  renderProfile();
  initProfileEvents();
});

/**
 * Escapa HTML.
 * @param {string} str
 */
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
