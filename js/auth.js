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
            logicaTutor: { ...materiaBase },
            matematica1Tutor: { ...materiaBase },
            matematica2Tutor: { ...materiaBase },
            scienzeTutor: { ...materiaBase },
            fisicaEsempio2: { ...materiaBase },
            logicaEsempio1: { ...materiaBase },
            logicaEsempio2: { ...materiaBase },
            matematicaEsempio1: { ...materiaBase },
            matematicaEsempio2: { ...materiaBase },
            scienzeEsempio1: { ...materiaBase }
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

    // Cambia password
    async changePassword(oldPassword, newPassword) {
        const user = this.getCurrentUser();
        if (!user) return { ok: false, error: 'Utente non trovato' };

        const users = getUsers();
        const userData = users[user.username];
        if (!userData) return { ok: false, error: 'Utente non trovato' };

        const oldHash = await sha256(oldPassword);
        if (oldHash !== userData.passwordHash) {
            return { ok: false, error: 'Password attuale errata' };
        }

        if (!newPassword || newPassword.length < 6) {
            return { ok: false, error: 'La nuova password deve avere almeno 6 caratteri' };
        }

        const newHash = await sha256(newPassword);
        userData.passwordHash = newHash;
        saveUsers(users);
        
        return { ok: true };
    },

    // Elimina account
    async deleteAccount(password) {
        const user = this.getCurrentUser();
        if (!user) return { ok: false, error: 'Utente non trovato' };

        const users = getUsers();
        const userData = users[user.username];
        if (!userData) return { ok: false, error: 'Utente non trovato' };

        const hash = await sha256(password);
        if (hash !== userData.passwordHash) {
            return { ok: false, error: 'Password errata' };
        }

        delete users[user.username];
        saveUsers(users);
        clearSession();
        
        return { ok: true };
    },

    // Reset progresso
    resetProgress() {
        const user = this.getCurrentUser();
        if (!user) return false;

        const users = getUsers();
        const userData = users[user.username];
        if (!userData) return false;

        const materiaBase = {
            total: 0,
            correct: 0,
            wrong: 0,
            progressPage: 1,
            wrongAnswers: []
        };

        userData.stats = {
            global: { total: 0, correct: 0, wrong: 0 },
            logicaTutor: { ...materiaBase },
            matematica1Tutor: { ...materiaBase },
            matematica2Tutor: { ...materiaBase },
            scienzeTutor: { ...materiaBase },
            fisicaEsempio2: { ...materiaBase },
            logicaEsempio1: { ...materiaBase },
            logicaEsempio2: { ...materiaBase },
            matematicaEsempio1: { ...materiaBase },
            matematicaEsempio2: { ...materiaBase },
            scienzeEsempio1: { ...materiaBase }
        };
        
        userData.history = [];
        
        saveUsers(users);
        return true;
    },

    // Reset errori
    resetWrongAnswers() {
        const user = this.getCurrentUser();
        if (!user) return false;

        const users = getUsers();
        const userData = users[user.username];
        if (!userData) return false;

        const subjects = ['logica-tutor', 'matematica1-tutor', 'matematica2-tutor', 'scienze-tutor', 'fisica-esempio2', 'logica-esempio1', 'logica-esempio2', 'matematica-esempio1', 'matematica-esempio2', 'scienze-esempio1'];
        
        subjects.forEach(sub => {
            if (userData.stats[sub]) {
                userData.stats[sub].wrongAnswers = [];
            }
        });
        
        saveUsers(users);
        return true;
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