'use strict';

const STORAGE_USERS_KEY = 'tolc_users';
const STORAGE_SESSION_KEY = 'tolc_session';

async function sha256(message) {
    if (crypto && crypto.subtle) {
        const msgBuffer = new TextEncoder().encode(message);
        const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }
    return fallbackHash(message);
}

function fallbackHash(str) {
    let hash = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) {
        hash ^= str.charCodeAt(i);
        hash = (hash * 0x01000193) >>> 0;
    }
    let h = hash.toString(16).padStart(8, '0');
    let seed = hash;
    for (let i = 0; i < 7; i++) {
        seed = (seed * 0x41c64e6d + 0x3039) >>> 0;
        h += seed.toString(16).padStart(8, '0');
    }
    return h;
}

function getUsers() {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_USERS_KEY) || '{}');
    } catch {
        return {};
    }
}

function saveUsers(users) {
    localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(users));
}

function createUserData(passwordHash) {
    const materiaBase = {
        total: 0,
        correct: 0,
        wrong: 0,
        progressPage: 1,        // ID della prima domanda (non più pagina 9 generica)
        wrongAnswers: []
    };

    return {
        passwordHash,
        createdAt: new Date().toISOString(),
        stats: {
            global: { total: 0, correct: 0, wrong: 0 },
            logica: { ...materiaBase },
            matematica1: { ...materiaBase },
            matematica2: { ...materiaBase },
            scienze: { ...materiaBase }
        },
        history: []
    };
}

function setSession(username) {
    localStorage.setItem(STORAGE_SESSION_KEY, username);
}

function getSession() {
    return localStorage.getItem(STORAGE_SESSION_KEY);
}

function clearSession() {
    localStorage.removeItem(STORAGE_SESSION_KEY);
}

const Auth = {
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

    async login(username, password) {
        username = username.trim().toLowerCase();
        const users = getUsers();
        const user = users[username];
        if (!user) return { ok: false, error: 'Utente non trovato.' };

        const hash = await sha256(password);
        if (hash !== user.passwordHash) return { ok: false, error: 'Password errata.' };

        setSession(username);
        return { ok: true };
    },

    logout() {
        clearSession();
        window.location.href = 'index.html';
    },

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

    updateCurrentUser(newData) {
        const username = getSession();
        if (!username) return false;
        const users = getUsers();
        if (!users[username]) return false;

        // Deep merge stats se presenti
        if (newData.stats) {
            const currentStats = users[username].stats;
            for (let key in newData.stats) {
                if (currentStats[key]) {
                    currentStats[key] = { ...currentStats[key], ...newData.stats[key] };
                } else {
                    currentStats[key] = newData.stats[key];
                }
            }
            delete newData.stats;
        }

        users[username] = { ...users[username], ...newData };
        saveUsers(users);
        return true;
    },

    async changePassword(oldPassword, newPassword) {
        const user = this.getCurrentUser();
        if (!user) return { ok: false, error: 'Non autenticato.' };
        const oldHash = await sha256(oldPassword);
        if (oldHash !== user.data.passwordHash) return { ok: false, error: 'Vecchia password errata.' };
        if (!newPassword || newPassword.length < 6) return { ok: false, error: 'La nuova password deve avere almeno 6 caratteri.' };
        const newHash = await sha256(newPassword);
        const users = getUsers();
        users[user.username].passwordHash = newHash;
        saveUsers(users);
        return { ok: true };
    },

    async deleteAccount(password) {
        const user = this.getCurrentUser();
        if (!user) return { ok: false, error: 'Non autenticato.' };
        const hash = await sha256(password);
        if (hash !== user.data.passwordHash) return { ok: false, error: 'Password errata.' };
        const users = getUsers();
        delete users[user.username];
        saveUsers(users);
        clearSession();
        return { ok: true };
    },

    resetProgress(subject) {
        const user = this.getCurrentUser();
        if (!user) return;
        const users = getUsers();
        if (subject && users[user.username].stats[subject]) {
            // Reset solo per una materia
            const base = { total: 0, correct: 0, wrong: 0, progressPage: 1, wrongAnswers: [] };
            users[user.username].stats[subject] = base;
        } else {
            // Reset completo
            const base = { total: 0, correct: 0, wrong: 0, progressPage: 1, wrongAnswers: [] };
            users[user.username].stats = {
                global: { total: 0, correct: 0, wrong: 0 },
                logica: { ...base },
                matematica1: { ...base },
                matematica2: { ...base },
                scienze: { ...base }
            };
            users[user.username].history = [];
        }
        saveUsers(users);
    },

    resetWrongAnswers(subject) {
        const user = this.getCurrentUser();
        if (!user) return;
        const users = getUsers();
        if (subject && users[user.username].stats[subject]) {
            users[user.username].stats[subject].wrongAnswers = [];
        } else {
            for (let key in users[user.username].stats) {
                if (key !== 'global' && users[user.username].stats[key]?.wrongAnswers) {
                    users[user.username].stats[key].wrongAnswers = [];
                }
            }
        }
        saveUsers(users);
    },

    requireAuth(redirectTo = 'index.html') {
        const user = this.getCurrentUser();
        if (!user) {
            window.location.href = redirectTo;
            return false;
        }
        return true;
    },

    redirectIfLoggedIn(redirectTo = 'dashboard.html') {
        const user = this.getCurrentUser();
        if (user) window.location.href = redirectTo;
    },

    applyTheme() {
        const dark = localStorage.getItem('tolc_theme') !== 'light';
        document.body.classList.toggle('light', !dark);
    },

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

window.Auth = Auth;