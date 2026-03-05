// profile.js – Gestione profilo utente

document.addEventListener('DOMContentLoaded', () => {
    const username = getCurrentUser();
    if (!username) {
        window.location.href = 'index.html';
        return;
    }

    const user = getCurrentUserData();
    if (!user) return;

    // Popola dati
    document.getElementById('profUsername').textContent = username;
    document.getElementById('profCreated').textContent = new Date(user.createdAt).toLocaleString();
    document.getElementById('profLastPage').textContent = user.progressPage;
    document.getElementById('profTotal').textContent = user.stats.totalAnswered;
    document.getElementById('profCorrect').textContent = user.stats.correct;
    document.getElementById('profWrong').textContent = user.stats.wrong;
    const percent = user.stats.totalAnswered > 0 ? ((user.stats.correct / user.stats.totalAnswered) * 100).toFixed(1) : '0';
    document.getElementById('profPercent').textContent = percent;
    document.getElementById('profErrors').textContent = user.wrongAnswers.length;

    // Pulsanti azioni
    document.getElementById('backToApp').addEventListener('click', () => {
        window.location.href = 'app.html';
    });

    document.getElementById('resetProgress').addEventListener('click', () => {
        if (confirm('Resettare il progresso? Tutte le statistiche verranno azzerate.')) {
            resetProgress();
            alert('Progresso resettato.');
            location.reload();
        }
    });

    document.getElementById('resetErrors').addEventListener('click', () => {
        if (confirm('Cancellare la lista degli errori?')) {
            resetErrors();
            alert('Errori cancellati.');
            location.reload();
        }
    });

    // Cambio password
    const modal = document.getElementById('changePwdModal');
    document.getElementById('changePassword').addEventListener('click', () => {
        modal.classList.remove('hidden');
    });
    document.getElementById('cancelPwdChange').addEventListener('click', () => {
        modal.classList.add('hidden');
    });
    document.getElementById('submitPwdChange').addEventListener('click', async () => {
        const old = document.getElementById('oldPwd').value;
        const newPwd = document.getElementById('newPwd').value;
        const confirm = document.getElementById('confirmPwd').value;
        const errorEl = document.getElementById('pwdError');
        if (newPwd !== confirm) {
            errorEl.textContent = 'Le nuove password non coincidono.';
            return;
        }
        try {
            const ok = await changePassword(old, newPwd);
            if (ok) {
                alert('Password cambiata con successo.');
                modal.classList.add('hidden');
            } else {
                errorEl.textContent = 'Vecchia password errata.';
            }
        } catch (err) {
            errorEl.textContent = 'Errore: ' + err.message;
        }
    });

    // Elimina account
    document.getElementById('deleteAccount').addEventListener('click', () => {
        if (confirm('Sei sicuro di voler eliminare definitivamente il tuo account? Tutti i dati andranno persi.')) {
            deleteAccount();
            window.location.href = 'index.html';
        }
    });
});