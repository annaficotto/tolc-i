'use strict';

function $(id) { return document.getElementById(id); }

function showMsg(msg, type = 'success') {
    const el = $('dashboard-alert');
    if (!el) return;
    el.className = `alert alert-${type} show`;
    el.textContent = msg;
    setTimeout(() => el.classList.remove('show'), 4000);
}

function renderDashboard() {
    const user = Auth.getCurrentUser();
    if (!user) return;

    const { username, data } = user;
    const stats = data.stats;

    // Welcome name
    const nameEl = $('welcome-name');
    if (nameEl) nameEl.textContent = username;

    // Statistiche globali
    const global = stats.global || { total: 0, correct: 0, wrong: 0 };
    const pct = global.total > 0 ? Math.round((global.correct / global.total) * 100) : 0;
    const globalStatsEl = $('global-stats');
    if (globalStatsEl) {
        globalStatsEl.innerHTML = `
      <div class="stat-grid">
        <div class="stat-item">
          <div class="stat-value">${global.total}</div>
          <div class="stat-label">Totale risposte</div>
        </div>
        <div class="stat-item">
          <div class="stat-value" style="color:var(--success)">${global.correct}</div>
          <div class="stat-label">Corrette</div>
        </div>
        <div class="stat-item">
          <div class="stat-value" style="color:var(--danger)">${global.wrong}</div>
          <div class="stat-label">Errate</div>
        </div>
        <div class="stat-item">
          <div class="stat-value text-accent">${pct}%</div>
          <div class="stat-label">Precisione</div>
        </div>
      </div>
    `;
    }

    // Card materie
    const subjects = [
        { id: 'logica', name: 'Logica', icon: '🧠', file: 'logica.html' },
        { id: 'matematica1', name: 'Matematica 1', icon: '📐', file: 'matematica1.html' },
        { id: 'matematica2', name: 'Matematica 2', icon: '📏', file: 'matematica2.html' },
        { id: 'scienze', name: 'Scienze', icon: '🔬', file: 'scienze.html' }
    ];

    const cardsEl = $('subject-cards');
    if (cardsEl) {
        cardsEl.innerHTML = subjects.map(sub => {
            const subStats = stats[sub.id] || { total: 0, correct: 0, wrong: 0, wrongAnswers: [] };
            const subPct = subStats.total > 0 ? Math.round((subStats.correct / subStats.total) * 100) : 0;
            const errorsCount = subStats.wrongAnswers?.length || 0;
            return `
        <div class="mode-card" data-subject="${sub.id}" data-file="${sub.file}" tabindex="0" role="button">
          <span class="mode-icon">${sub.icon}</span>
          <h3>${sub.name}</h3>
          <p>Precisione: ${subPct}% · Errori: ${errorsCount}</p>
        </div>
      `;
        }).join('');

        // Aggiungi listener
        document.querySelectorAll('.mode-card').forEach(card => {
            card.addEventListener('click', () => {
                const file = card.dataset.file;
                if (file) window.location.href = `materie/${file}`;
            });
        });
    }

    // Storico recente (ultime 5 sessioni)
    const history = data.history || [];
    const historyEl = $('recent-history');
    if (historyEl) {
        if (history.length === 0) {
            historyEl.innerHTML = '<p class="text-sm text-muted text-center" style="padding:1rem">Nessuna sessione recente.</p>';
        } else {
            historyEl.innerHTML = history.slice(0, 5).map(s => {
                const date = new Date(s.date).toLocaleDateString('it-IT', {
                    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                });
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
    }

    // Navbar username
    const navUser = $('nav-username');
    if (navUser) navUser.textContent = username;
}

// Logout
$('btn-logout')?.addEventListener('click', () => Auth.logout());

// Theme toggle
$('theme-toggle')?.addEventListener('click', () => {
    Auth.toggleTheme();
    $('theme-toggle').textContent = document.body.classList.contains('light') ? '☾' : '☀';
});

document.addEventListener('DOMContentLoaded', () => {
    Auth.applyTheme();
    if (!Auth.requireAuth()) return;
    renderDashboard();
});