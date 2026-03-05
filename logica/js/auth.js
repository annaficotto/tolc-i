// auth.js – Gestione utenti con localStorage e Web Crypto API

// Chiavi localStorage
const STORAGE_USERS = 'mentor_users';
const STORAGE_CURRENT = 'mentor_current';

// Funzione per ottenere la lista utenti
function getUsers() {
    const users = localStorage.getItem(STORAGE_USERS);
    return users ? JSON.parse(users) : {};
}

// Salva utenti
function saveUsers(users) {
    localStorage.setItem(STORAGE_USERS, JSON.stringify(users));
}

// Hash password con SHA-256
async function hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Registrazione
async function register(username, password) {
    if (!username || !password) throw new Error('Dati mancanti');
    const users = getUsers();
    if (users[username]) return false; // già esistente
    const passwordHash = await hashPassword(password);
    users[username] = {
        passwordHash,
        createdAt: new Date().toISOString(),
        progressPage: 67, // pagina iniziale dal mentor
        stats: {
            totalAnswered: 0,
            correct: 0,
            wrong: 0
        },
        wrongAnswers: [], // lista di id domande sbagliate
        history: [] // potrebbe essere usato in futuro
    };
    saveUsers(users);
    return true;
}

// Login
async function login(username, password) {
    const users = getUsers();
    const user = users[username];
    if (!user) return false;
    const hash = await hashPassword(password);
    if (hash === user.passwordHash) {
        localStorage.setItem(STORAGE_CURRENT, username);
        return true;
    }
    return false;
}

// Logout
function logout() {
    localStorage.removeItem(STORAGE_CURRENT);
}

// Ottieni utente corrente
function getCurrentUser() {
    return localStorage.getItem(STORAGE_CURRENT);
}

// Ottieni dati utente corrente
function getCurrentUserData() {
    const username = getCurrentUser();
    if (!username) return null;
    const users = getUsers();
    return users[username] || null;
}

// Aggiorna dati utente corrente
function updateCurrentUserData(updater) {
    const username = getCurrentUser();
    if (!username) return false;
    const users = getUsers();
    if (!users[username]) return false;
    users[username] = updater(users[username]);
    saveUsers(users);
    return true;
}

// Cambio password
async function changePassword(oldPwd, newPwd) {
    const username = getCurrentUser();
    if (!username) return false;
    const users = getUsers();
    const user = users[username];
    if (!user) return false;
    const oldHash = await hashPassword(oldPwd);
    if (oldHash !== user.passwordHash) return false;
    user.passwordHash = await hashPassword(newPwd);
    saveUsers(users);
    return true;
}

// Elimina account
function deleteAccount() {
    const username = getCurrentUser();
    if (!username) return false;
    const users = getUsers();
    delete users[username];
    saveUsers(users);
    logout();
    return true;
}

// Reset progresso (torna a pagina iniziale, azzera stats, mantiene errori)
function resetProgress() {
    return updateCurrentUserData(user => {
        user.progressPage = 67;
        user.stats = { totalAnswered: 0, correct: 0, wrong: 0 };
        // non resettiamo wrongAnswers? Dipende, qui lo lasciamo
        return user;
    });
}

// Reset errori (svuota lista)
function resetErrors() {
    return updateCurrentUserData(user => {
        user.wrongAnswers = [];
        return user;
    });
}