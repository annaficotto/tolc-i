/**
 * auth.js — Gestione autenticazione utenti
 * Usa Web Crypto API per SHA-256, localStorage per persistenza.
 */

'use strict';

// ── Costanti ─────────────────────────────────────────────
const STORAGE_USERS_KEY  = 'tolc_users';
const STORAGE_SESSION_KEY = 'tolc_session';

// ── Hashing ───────────────────────────────────────────────

/**
 * Calcola SHA-256 di una stringa e restituisce hex.
 * @param {string} message
 * @returns {Promise<string>}
 */
async function sha256(message) {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// ── Storage helpers ───────────────────────────────────────

/**
 * Legge il database utenti dal localStorage.
 * @returns {Object}
 */
function getUsers() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_USERS_KEY) || '{}');
  } catch {
    return {};
  }
}

/**
 * Salva il database utenti nel localStorage.
 * @param {Object} users
 */
function saveUsers(users) {
  localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(users));
}

/**
 * Crea la struttura dati iniziale per un nuovo utente.
 * @param {string} passwordHash
 * @returns {Object}
 */
function createUserData(passwordHash) {
  return {
    passwordHash,
    createdAt: new Date().toISOString(),
    progressPage: 9,        // pagina di partenza del grafo TOLC
    stats: {
      totalAnswered: 0,
      correct: 0,
      wrong: 0
    },
    wrongAnswers: [],        // array di id domande sbagliate
    history: []              // storico sessioni
  };
}

// ── Sessione ──────────────────────────────────────────────

/**
 * Salva la sessione corrente (username loggato).
 * @param {string} username
 */
function setSession(username) {
  localStorage.setItem(STORAGE_SESSION_KEY, username);
}

/**
 * Legge l'utente loggato corrente o null.
 * @returns {string|null}
 */
function getSession() {
  return localStorage.getItem(STORAGE_SESSION_KEY);
}

/**
 * Distrugge la sessione corrente.
 */
function clearSession() {
  localStorage.removeItem(STORAGE_SESSION_KEY);
}

// ── API pubblica ──────────────────────────────────────────

const Auth = {

  /**
   * Registra un nuovo utente.
   * @param {string} username
   * @param {string} password
   * @returns {Promise<{ok: boolean, error?: string}>}
   */
  async register(username, password) {
    username = username.trim().toLowerCase();

    if (!username || username.length < 3)
      return { ok: false, error: 'Username deve avere almeno 3 caratteri.' };

    if (!/^[a-z0-9_]+$/.test(username))
      return { ok: false, error: 'Username: solo lettere, numeri e _.' };

    if (!password || password.length < 6)
      return { ok: false, error: 'Password deve avere almeno 6 caratteri.' };

    const users = getUsers();
    if (users[username])
      return { ok: false, error: 'Username già in uso.' };

    const hash = await sha256(password);
    users[username] = createUserData(hash);
    saveUsers(users);
    setSession(username);

    return { ok: true };
  },

  /**
   * Effettua il login.
   * @param {string} username
   * @param {string} password
   * @returns {Promise<{ok: boolean, error?: string}>}
   */
  async login(username, password) {
    username = username.trim().toLowerCase();

    const users = getUsers();
    const user = users[username];

    if (!user)
      return { ok: false, error: 'Utente non trovato.' };

    const hash = await sha256(password);
    if (hash !== user.passwordHash)
      return { ok: false, error: 'Password errata.' };

    setSession(username);
    return { ok: true };
  },

  /**
   * Effettua il logout.
   */
  logout() {
    clearSession();
    window.location.href = 'index.html';
  },

  /**
   * Ritorna i dati dell'utente corrente o null.
   * @returns {{username: string, data: Object}|null}
   */
  getCurrentUser() {
    const username = getSession();
    if (!username) return null;

    const users = getUsers();
    if (!users[username]) {
      clearSession();
      return null;
    }

    return { username, data: users[username] };
  },

  /**
   * Aggiorna i dati dell'utente corrente.
   * @param {Object} newData  — solo i campi da aggiornare (merge)
   * @returns {boolean}
   */
  updateCurrentUser(newData) {
    const username = getSession();
    if (!username) return false;

    const users = getUsers();
    if (!users[username]) return false;

    // Deep-merge stats se presenti
    if (newData.stats) {
      users[username].stats = { ...users[username].stats, ...newData.stats };
      delete newData.stats;
    }

    users[username] = { ...users[username], ...newData };
    saveUsers(users);
    return true;
  },

  /**
   * Cambia password dell'utente corrente.
   * @param {string} oldPassword
   * @param {string} newPassword
   * @returns {Promise<{ok: boolean, error?: string}>}
   */
  async changePassword(oldPassword, newPassword) {
    const user = this.getCurrentUser();
    if (!user) return { ok: false, error: 'Non autenticato.' };

    const oldHash = await sha256(oldPassword);
    if (oldHash !== user.data.passwordHash)
      return { ok: false, error: 'Vecchia password errata.' };

    if (!newPassword || newPassword.length < 6)
      return { ok: false, error: 'La nuova password deve avere almeno 6 caratteri.' };

    const newHash = await sha256(newPassword);
    const users = getUsers();
    users[user.username].passwordHash = newHash;
    saveUsers(users);

    return { ok: true };
  },

  /**
   * Elimina l'account corrente.
   * @param {string} password  — richiesta per conferma
   * @returns {Promise<{ok: boolean, error?: string}>}
   */
  async deleteAccount(password) {
    const user = this.getCurrentUser();
    if (!user) return { ok: false, error: 'Non autenticato.' };

    const hash = await sha256(password);
    if (hash !== user.data.passwordHash)
      return { ok: false, error: 'Password errata.' };

    const users = getUsers();
    delete users[user.username];
    saveUsers(users);
    clearSession();

    return { ok: true };
  },

  /**
   * Reset completo del progresso (mantiene account).
   */
  resetProgress() {
    const user = this.getCurrentUser();
    if (!user) return;

    const users = getUsers();
    users[user.username].progressPage = 9;
    users[user.username].stats = { totalAnswered: 0, correct: 0, wrong: 0 };
    users[user.username].wrongAnswers = [];
    users[user.username].history = [];
    saveUsers(users);
  },

  /**
   * Reset solo degli errori attivi.
   */
  resetWrongAnswers() {
    const user = this.getCurrentUser();
    if (!user) return;

    const users = getUsers();
    users[user.username].wrongAnswers = [];
    saveUsers(users);
  },

  /**
   * Controlla se l'utente è autenticato, altrimenti reindirizza.
   * @param {string} [redirectTo='index.html']
   * @returns {boolean}
   */
  requireAuth(redirectTo = 'index.html') {
    const user = this.getCurrentUser();
    if (!user) {
      window.location.href = redirectTo;
      return false;
    }
    return true;
  },

  /**
   * Se già loggato, reindirizza alla app.
   */
  redirectIfLoggedIn() {
    const user = this.getCurrentUser();
    if (user) window.location.href = 'app.html';
  },

  /**
   * Applica / rimuove tema scuro in base a localStorage.
   */
  applyTheme() {
    const dark = localStorage.getItem('tolc_theme') !== 'light';
    document.body.classList.toggle('light', !dark);
  },

  /**
   * Toggle tema scuro/chiaro.
   */
  toggleTheme() {
    const isLight = document.body.classList.contains('light');
    if (isLight) {
      document.body.classList.remove('light');
      localStorage.setItem('tolc_theme', 'dark');
    } else {
      document.body.classList.add('light');
      localStorage.setItem('tolc_theme', 'light');
    }
  }
};

// Esponi globalmente
window.Auth = Auth;
