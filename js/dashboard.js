'use strict';

function $(id) { return document.getElementById(id); }

function renderDashboard() {
    const user = Auth.getCurrentUser();
    if (!user) return;

    const { data } = user;
    const stats = data.stats;

    // Statistiche globali
    const global = stats.global || { total: 0, correct: 0, wrong: 0 };
    const pct = global.total > 0 ? Math.round((global.correct / global.total) * 100) : 0;
    const globalStatsEl = $('global-stats');
    if (globalStatsEl) {
        globalStatsEl.innerHTML = `
      <div class="stat-grid">
        <div class="stat-item blur">
          <div class="stat-value">${global.total}</div>
          <div class="stat-label">Totale risposte</div>
        </div>
        <div class="stat-item blur">
          <div class="stat-value" style="color:var(--success)">${global.correct}</div>
          <div class="stat-label">Corrette</div>
        </div>
        <div class="stat-item blur">
          <div class="stat-value" style="color:var(--danger)">${global.wrong}</div>
          <div class="stat-label">Errate</div>
        </div>
        <div class="stat-item blur">
          <div class="stat-value text-accent">${pct}%</div>
          <div class="stat-label">Precisione</div>
        </div>
      </div>
    `;
    }

    // Card materie
    const subjects = [
        { id: 'logica-tutor', name: 'Logica (tutor)', icon: '🧠', file: 'logica-tutor.html' },
        { id: 'matematica', name: 'Matematica (tutor)', icon: '📐', file: 'matematica-tutor.html' },
        { id: 'scienze-tutor', name: 'Scienze (tutor)', icon: '🔬', file: 'scienze-tutor.html' },
        { id: 'logica-esempio', name: 'Logica', icon: '🧩', file: 'logica.html' },
        { id: 'matematica', name: 'Matematica', icon: '🧮', file: 'matematicahtml' },
        { id: 'scienze', name: 'Scienze', icon: '🧪', file: 'scienze.html' },
        { id: 'fisica', name: 'Fisica', icon: '🧲', file: 'fisica.html' }
    ];

    const cardsEl = $('subject-cards');
    if (cardsEl) {
        cardsEl.innerHTML = subjects.map(sub => {
            const subStats = stats[sub.id] || { total: 0, correct: 0, wrong: 0, wrongAnswers: [] };
            const subPct = subStats.total > 0 ? Math.round((subStats.correct / subStats.total) * 100) : 0;
            const errorsCount = subStats.wrongAnswers?.length || 0;
            return `
        <div class="mode-card" data-file="${sub.file}" tabindex="0" role="button">
          <span class="mode-icon">${sub.icon}</span>
          <h3>${sub.name}</h3>
          <p>Precisione: ${subPct}% · Errori: ${errorsCount}</p>
        </div>
      `;
        }).join('');

        document.querySelectorAll('#subject-cards .mode-card').forEach(card => {
            card.addEventListener('click', () => {
                const file = card.dataset.file;
                if (file) window.location.href = `materie/${file}`;
            });
        });
    }

    // Storico recente
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
}

// Theme toggle
$('theme-toggle')?.addEventListener('click', () => {
    Auth.toggleTheme();
    $('theme-toggle').textContent = document.body.classList.contains('light') ? '☾' : '☀';
});

document.addEventListener('DOMContentLoaded', () => {
    Auth.applyTheme();
    renderDashboard();
});