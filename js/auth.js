'use strict';

// ============================================================
// auth.js — versione senza password, solo nome utente
// ============================================================

const STORAGE_ANON_KEY  = 'tolc_anon_user';
const STORAGE_NAME_KEY  = 'tolc_name';

function getAnonData() {
    try { return JSON.parse(localStorage.getItem(STORAGE_ANON_KEY) || 'null'); }
    catch { return null; }
}

function saveAnonData(data) {
    localStorage.setItem(STORAGE_ANON_KEY, JSON.stringify(data));
}

function createAnonData() {
    const materiaBase = { total: 0, correct: 0, wrong: 0, progressPage: 1, wrongAnswers: [] };
    return {
        createdAt: new Date().toISOString(),
        stats: {
            global: { total: 0, correct: 0, wrong: 0 },
            'logica-tutor':        { ...materiaBase },
            'matematica1-tutor':   { ...materiaBase },
            'matematica2-tutor':   { ...materiaBase },
            'scienze-tutor':       { ...materiaBase },
            'fisica-esempio2':     { ...materiaBase },
            'logica-esempio1':     { ...materiaBase },
            'logica-esempio2':     { ...materiaBase },
            'matematica-esempio1': { ...materiaBase },
            'matematica-esempio2': { ...materiaBase },
            'scienze-esempio1':    { ...materiaBase }
        },
        history: []
    };
}

(function bootstrap() {
    if (!getAnonData()) saveAnonData(createAnonData());
})();

const Auth = {
    // ── Nome ─────────────────────────────────────────────────
    getName() {
        return localStorage.getItem(STORAGE_NAME_KEY) || '';
    },
    setName(name) {
        localStorage.setItem(STORAGE_NAME_KEY, name.trim());
    },
    clearName() {
        localStorage.removeItem(STORAGE_NAME_KEY);
    },

    // ── Dati / stats ──────────────────────────────────────────
    getCurrentUser() {
        let data = getAnonData();
        if (!data) { data = createAnonData(); saveAnonData(data); }
        const name = this.getName() || 'utente';
        return { username: name, data };
    },

    updateCurrentUser(newData) {
        let data = getAnonData();
        if (!data) data = createAnonData();
        if (newData.stats) {
            for (let key in newData.stats) {
                data.stats[key] = data.stats[key]
                    ? { ...data.stats[key], ...newData.stats[key] }
                    : newData.stats[key];
            }
            delete newData.stats;
        }
        if (newData.history) { data.history = newData.history; delete newData.history; }
        Object.assign(data, newData);
        saveAnonData(data);
        return true;
    },

    resetProgress() { saveAnonData(createAnonData()); return true; },

    resetWrongAnswers() {
        const data = getAnonData();
        if (!data) return false;
        for (let key in data.stats) {
            if (data.stats[key].wrongAnswers) data.stats[key].wrongAnswers = [];
        }
        saveAnonData(data);
        return true;
    },

    // ── Navigazione ───────────────────────────────────────────
    // "logout" = dimentica il nome e torna alla schermata iniziale
    logout() {
        this.clearName();
        window.location.href = 'index.html';
    },

    // Blocca l'accesso se non c'è un nome impostato
    requireAuth(redirectTo = 'index.html') {
        if (!this.getName()) {
            window.location.href = redirectTo;
            return false;
        }
        return true;
    },

    redirectIfLoggedIn(redirectTo = 'dashboard.html') {
        if (this.getName()) window.location.href = redirectTo;
    },

    // ── Tema ──────────────────────────────────────────────────
    applyTheme() {
        document.body.classList.toggle('light', localStorage.getItem('tolc_theme') === 'light');
    },
    toggleTheme() {
        const isLight = document.body.classList.contains('light');
        document.body.classList.toggle('light', !isLight);
        localStorage.setItem('tolc_theme', !isLight ? 'light' : 'dark');
    },

    // ── Stub metodi non più usati ─────────────────────────────
    async register() { return { ok: true }; },
    async login()    { return { ok: true }; },
    async changePassword() { return { ok: true }; },
    async deleteAccount() { saveAnonData(createAnonData()); this.logout(); return { ok: true }; }
};

window.Auth = Auth;
window.closeModal = (id) => document.getElementById(id)?.classList.remove('open');