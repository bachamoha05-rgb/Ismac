// --- CONFIGURATION FIREBASE ---
const firebaseConfig = {
    apiKey: "AlzaSyA-VhnC4VBWXjl9POidNwGG8uLpi-bLaOwk",
    authDomain: "ismac-5c655.firebaseapp.com",
    databaseURL: "https://ismac-5c655-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "ismac-5c655",
    storageBucket: "ismac-5c655.firebasestorage.app",
    messagingSenderId: "601300390094",
    appId: "1:601300390094:web:ba2d320c258ba0fde0c09f"
};

if (!firebase.apps.length) { firebase.initializeApp(firebaseConfig); }
const db = firebase.database();

// --- DONNÉES PHOTOS ---
const DB_PHOTOS = [
    { src: "DB_PHOTOS/photo1.jpg",  answers: { moisRelatif: 6, day: 22, month: 11, year: 2025, city: "Avignon" } },
    { src: "DB_PHOTOS/photo2.jpg",  answers: { moisRelatif: 3, day: 29, month: 8,  year: 2025, city: "Firminy" } },
    { src: "DB_PHOTOS/photo3.jpg",  answers: { moisRelatif: 5, day: 13, month: 10, year: 2025, city: "Avignon" } },
    { src: "DB_PHOTOS/photo4.jpg",  answers: { moisRelatif: 5, day: 1,  month: 10, year: 2025, city: "Marseille" } },
    { src: "DB_PHOTOS/photo5.jpg",  answers: { moisRelatif: 2, day: 31, month: 7,  year: 2025, city: "Cannes" } },
    { src: "DB_PHOTOS/photo6.jpg",  answers: { moisRelatif: 2, day: 31, month: 7,  year: 2025, city: "Cannes" } },
    { src: "DB_PHOTOS/photo7.jpg",  answers: { moisRelatif: 1, day: 29, month: 5,  year: 2025, city: "Avignon" } },
    { src: "DB_PHOTOS/photo8.jpg",  answers: { moisRelatif: 2, day: 30, month: 7,  year: 2025, city: "Nice" } },
    { src: "DB_PHOTOS/photo9.jpg",  answers: { moisRelatif: 6, day: 4,  month: 11, year: 2025, city: "Avignon" } },
    { src: "DB_PHOTOS/photo10.jpg", answers: { moisRelatif: 7, day: 13, month: 12, year: 2025, city: "Avignon" } },
    { src: "DB_PHOTOS/photo11.jpg", answers: { moisRelatif: 6, day: 8,  month: 11, year: 2025, city: "Avignon" } },
    { src: "DB_PHOTOS/photo12.jpg", answers: { moisRelatif: 5, day: 31, month: 10, year: 2025, city: "Avignon" } },
    { src: "DB_PHOTOS/photo14.jpg", answers: { moisRelatif: 5, day: 5,  month: 10, year: 2025, city: "Maroc" } },
    { src: "DB_PHOTOS/photo15.jpg", answers: { moisRelatif: 4, day: 9,  month: 9,  year: 2025, city: "Avignon" } }
];

const monthsText = ["", "Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];

// --- ÉTAT GLOBAL ---
let myPlayerId    = 'p_' + Math.random().toString(36).substr(2, 9);
let myName        = "";
let currentRoomCode = "";
let isHost        = false;
let roomRef       = null;
let timerInterval = null;
let nextRoundTimer = null;   // FIX : était window.nextTimer, source de collisions entre parties
let endRoundCalled = false;  // FIX : garde-fou contre les appels multiples à endRound()

// --- NAVIGATION ---
function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(id).classList.add('active');
}

document.getElementById('btn-go-create').onclick = () => showScreen('screen-create');
document.getElementById('btn-go-join').onclick   = () => showScreen('screen-join');

// --- CRÉATION DE SALLE ---
document.getElementById('btn-create-room').onclick = async () => {
    myName = document.getElementById('host-name').value.trim();
    if (!myName) return alert("Pseudo requis");

    isHost = true;
    currentRoomCode = "ISMAC-" + Math.random().toString(36).substring(2, 6).toUpperCase();
    roomRef = db.ref('rooms/' + currentRoomCode);

    const indices = [...Array(DB_PHOTOS.length).keys()]
        .sort(() => 0.5 - Math.random())
        .slice(0, 5);

    await roomRef.set({
        gameState: 'LOBBY',
        currentRound: 0,
        photoIndices: indices,
        roundEndTime: 0,
        players: {
            [myPlayerId]: { name: myName, score: 0, isHost: true, hasSubmitted: false }
        }
    });

    listenToRoom();
};

// --- REJOINDRE UNE SALLE ---
document.getElementById('btn-join-room').onclick = () => {
    myName = document.getElementById('player-name').value.trim();
    currentRoomCode = document.getElementById('room-code-input').value.trim().toUpperCase();
    if (!myName || !currentRoomCode) return alert("Infos manquantes");

    db.ref('rooms/' + currentRoomCode).once('value', snap => {
        if (!snap.exists()) return alert("Salle introuvable !");
        isHost = false;
        roomRef = db.ref('rooms/' + currentRoomCode);
        roomRef.child('players/' + myPlayerId).set({ name: myName, score: 0, isHost: false, hasSubmitted: false });
        listenToRoom();
    });
};

// --- ÉCOUTE TEMPS RÉEL ---
function listenToRoom() {
    roomRef.on('value', snap => {
        const data = snap.val();
        if (!data) return;

        const players = Object.values(data.players || {});

        // ---- LOBBY ----
        if (data.gameState === 'LOBBY') {
            showScreen('screen-lobby');
            document.getElementById('display-room-code').innerText = currentRoomCode;
            document.getElementById('lobby-player-list').innerHTML =
                players.map(p => `<li>${p.name} ${p.isHost ? '👑' : ''}</li>`).join('');
            document.getElementById(isHost ? 'host-controls' : 'guest-waiting').classList.remove('hidden');
        }

        // ---- PLAYING ----
        else if (data.gameState === 'PLAYING') {
            showScreen('screen-game');

            const round = data.currentRound;
            const photo = DB_PHOTOS[data.photoIndices[round]];
            document.getElementById('game-image').src = photo.src;
            document.getElementById('round-indicator').innerText = `Manche ${round + 1}/5`;

            // FIX : réinitialise le garde-fou à chaque nouvelle manche
            endRoundCalled = false;

            // FIX : nettoyage du timer précédent avant d'en créer un nouveau
            if (timerInterval) clearInterval(timerInterval);

            timerInterval = setInterval(() => {
                const timeLeft = Math.max(0, Math.floor((data.roundEndTime - Date.now()) / 1000));
                document.getElementById('timer').innerText =
                    `00:${timeLeft < 10 ? '0' + timeLeft : timeLeft}`;

                // FIX : appel protégé pour éviter les appels répétés quand timeLeft reste à 0
                if (isHost && timeLeft <= 0) {
                    clearInterval(timerInterval);
                    timerInterval = null;
                    endRound();
                }
            }, 1000);

            const me = data.players[myPlayerId];
            document.getElementById('btn-submit-answer').classList.toggle('hidden', me.hasSubmitted);
            document.getElementById('waiting-msg').classList.toggle('hidden', !me.hasSubmitted);

            // FIX : endRound déclenché seulement si TOUS les joueurs ont soumis
            if (isHost && players.length > 0 && players.every(p => p.hasSubmitted)) {
                endRound();
            }
        }

        // ---- LEADERBOARD ----
        else if (data.gameState === 'LEADERBOARD') {
            showScreen('screen-leaderboard');

            // FIX : nettoyage du timer de jeu
            if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }

            const photo = DB_PHOTOS[data.photoIndices[data.currentRound]];
            const c = photo.answers;
            document.getElementById('correct-answer-text').innerText =
                `${c.moisRelatif} mois, le ${c.day} ${monthsText[c.month]} ${c.year} à ${c.city}`;

            renderList(players, 'leaderboard-list');

            // FIX : utilise la variable locale nextRoundTimer au lieu de window.nextTimer
            if (isHost && !nextRoundTimer) {
                nextRoundTimer = setTimeout(() => {
                    nextRoundTimer = null;
                    nextRound(data.currentRound);
                }, 7000);
            }
        }

        // ---- FINISHED ----
        else if (data.gameState === 'FINISHED') {
            showScreen('screen-final');

            // FIX : nettoyage des timers résiduels
            if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
            if (nextRoundTimer) { clearTimeout(nextRoundTimer); nextRoundTimer = null; }

            players.sort((a, b) => b.score - a.score);
            document.getElementById('winner-name').innerText = players[0].name;
            renderList(players, 'final-list');
            if (isHost) document.getElementById('btn-restart').classList.remove('hidden');
        }
    });
}

// --- DÉMARRER UNE MANCHE ---
document.getElementById('btn-start-game').onclick = () => startRound(0);

function startRound(idx) {
    roomRef.child('players').once('value', snap => {
        const updates = {};
        snap.forEach(p => { updates[p.key + '/hasSubmitted'] = false; });
        roomRef.child('players').update(updates);
        roomRef.update({ gameState: 'PLAYING', currentRound: idx, roundEndTime: Date.now() + 60000 });
    });
}

// --- SOUMETTRE UNE RÉPONSE ---
document.getElementById('btn-submit-answer').onclick = () => {
    const moisRelatif = parseInt(document.getElementById('ans-mois-relatif').value) || 0;
    const day         = parseInt(document.getElementById('ans-day').value)         || 0;
    const month       = parseInt(document.getElementById('ans-month').value)       || 0;
    const year        = parseInt(document.getElementById('ans-year').value)        || 0;
    const city        = document.getElementById('ans-city').value.trim().toLowerCase();

    roomRef.once('value', snap => {
        const data    = snap.val();
        const correct = DB_PHOTOS[data.photoIndices[data.currentRound]].answers;

        let points = 0;
        if (moisRelatif === correct.moisRelatif)          points += 10;
        if (day   === correct.day)                        points += 10;
        if (month === correct.month)                      points += 10;
        if (year  === correct.year)                       points += 10;
        if (city  === correct.city.toLowerCase())         points += 20;

        roomRef.child('players/' + myPlayerId).update({
            score: (data.players[myPlayerId].score || 0) + points,
            hasSubmitted: true
        });

        document.querySelectorAll('.inputs-grid input').forEach(i => i.value = '');
    });
};

// --- FIN DE MANCHE ---
// FIX : garde-fou endRoundCalled pour éviter les écritures Firebase en double
function endRound() {
    if (endRoundCalled) return;
    endRoundCalled = true;
    roomRef.update({ gameState: 'LEADERBOARD' });
}

// --- MANCHE SUIVANTE ---
function nextRound(curr) {
    if (curr < 4) {
        startRound(curr + 1);
    } else {
        roomRef.update({ gameState: 'FINISHED' });
    }
}

// --- AFFICHAGE DU CLASSEMENT ---
function renderList(users, elId) {
    const sorted = [...users].sort((a, b) => b.score - a.score);
    document.getElementById(elId).innerHTML = sorted.map(u => {
        const stopTag = u.hasSubmitted ? '<span class="stop-badge">STOP</span>' : '';
        return `<li>${u.name}${stopTag} <span>${u.score} pts</span></li>`;
    }).join('');
}

// --- REJOUER (FIX : fonction complète) ---
document.getElementById('btn-restart').onclick = () => {
    if (!isHost) return;

    // Nettoyage des timers locaux
    if (timerInterval)  { clearInterval(timerInterval);  timerInterval  = null; }
    if (nextRoundTimer) { clearTimeout(nextRoundTimer);   nextRoundTimer = null; }

    // Remise à zéro des scores et génération de nouvelles photos
    roomRef.child('players').once('value', snap => {
        const updates = {};
        snap.forEach(p => {
            updates[p.key + '/score']        = 0;
            updates[p.key + '/hasSubmitted'] = false;
        });
        roomRef.child('players').update(updates);

        const indices = [...Array(DB_PHOTOS.length).keys()]
            .sort(() => 0.5 - Math.random())
            .slice(0, 5);

        roomRef.update({
            gameState:    'LOBBY',
            currentRound: 0,
            photoIndices: indices,
            roundEndTime: 0
        });
    });
};
