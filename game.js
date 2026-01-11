// --- CONFIGURATION FIREBASE ---
const firebaseConfig = {
    apiKey: "AlzaSyA-VhnC4VBWXjl9POidNwGG8uLpi-bLaOwk",
    authDomain: "ismac-5c655.firebaseapp.com",
    databaseURL: "https://ismac-5c655-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "ismac-5c655",
    storageBucket: "ismac-5c655.firebasesto-rage.app",
    messagingSenderId: "601300390094",
    appId: "1:601300390094:web:ba2d320c258ba0fde0c09f"
};
if (!firebase.apps.length) { firebase.initializeApp(firebaseConfig); }
const db = firebase.database();

// --- DONNÉES PHOTOS ---
// Note : Le premier chiffre de "answers" correspond maintenant au nombre de mois
const DB_PHOTOS = [
    { src: "DB_PHOTOS/photo1.jpg", answers: { moisRelatif: 6, day: 22, month: 11, year: 2025, city: "Avignon" } },
    { src: "DB_PHOTOS/photo2.jpg", answers: { moisRelatif: 3, day: 29, month: 8, year: 2025, city: "Firminy" } },
    { src: "DB_PHOTOS/photo3.jpg", answers: { moisRelatif: 5, day: 13, month: 10, year: 2025, city: "Avignon" } },
    { src: "DB_PHOTOS/photo4.jpg", answers: { moisRelatif: 5, day: 1, month: 10, year: 2025, city: "Marseille" } },
    { src: "DB_PHOTOS/photo5.jpg", answers: { moisRelatif: 2, day: 31, month: 7, year: 2025, city: "Cannes" } },
    { src: "DB_PHOTOS/photo6.jpg", answers: { moisRelatif: 2, day: 31, month: 7, year: 2025, city: "Cannes" } },
    { src: "DB_PHOTOS/photo7.jpg", answers: { moisRelatif: 1, day: 29, month: 5, year: 2025, city: "Avignon" } },
    { src: "DB_PHOTOS/photo8.jpg", answers: { moisRelatif: 2, day: 30, month: 7, year: 2025, city: "Nice" } },
    { src: "DB_PHOTOS/photo9.jpg", answers: { moisRelatif: 6, day: 4, month: 11, year: 2025, city: "Avignon" } },
    { src: "DB_PHOTOS/photo10.jpg", answers: { moisRelatif: 7, day: 13, month: 12, year: 2025, city: "Avignon" } },
    { src: "DB_PHOTOS/photo11.jpg", answers: { moisRelatif: 6, day: 8, month: 11, year: 2025, city: "Avignon" } },
    { src: "DB_PHOTOS/photo12.jpg", answers: { moisRelatif: 5, day: 31, month: 10, year: 2025, city: "Avignon" } },
    { src: "DB_PHOTOS/photo14.jpg", answers: { moisRelatif: 5, day: 5, month: 10, year: 2025, city: "Maroc" } },
    { src: "DB_PHOTOS/photo15.jpg", answers: { moisRelatif: 4, day: 9, month: 9, year: 2025, city: "Avignon" } }
];

let myPlayerId = 'p_' + Math.random().toString(36).substr(2, 9);
let myName = "";
let currentRoomCode = "";
let isHost = false;
let roomRef = null;
let timerInterval = null;
const monthsText = ["", "Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];

function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(id).classList.add('active');
}

document.getElementById('btn-go-create').onclick = () => showScreen('screen-create');
document.getElementById('btn-go-join').onclick = () => showScreen('screen-join');

document.getElementById('btn-create-room').onclick = async () => {
    myName = document.getElementById('host-name').value.trim();
    if (!myName) return alert("Pseudo requis");
    isHost = true;
    currentRoomCode = "ISMAC-" + Math.random().toString(36).substring(2, 6).toUpperCase();
    roomRef = db.ref('rooms/' + currentRoomCode);
    let indices = [...Array(DB_PHOTOS.length).keys()].sort(() => 0.5 - Math.random()).slice(0, 5);
    await roomRef.set({ gameState: 'LOBBY', currentRound: 0, photoIndices: indices, roundEndTime: 0, players: { [myPlayerId]: { name: myName, score: 0, isHost: true, hasSubmitted: false } } });
    listenToRoom();
};

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

function listenToRoom() {
    roomRef.on('value', snap => {
        const data = snap.val();
        if (!data) return;
        const players = Object.values(data.players || {});
        if (data.gameState === 'LOBBY') {
            showScreen('screen-lobby');
            document.getElementById('display-room-code').innerText = currentRoomCode;
            document.getElementById('lobby-player-list').innerHTML = players.map(p => `<li>${p.name} ${p.isHost?'👑':''}</li>`).join('');
            document.getElementById(isHost ? 'host-controls' : 'guest-waiting').classList.remove('hidden');
        } 
        else if (data.gameState === 'PLAYING') {
            showScreen('screen-game');
            const round = data.currentRound;
            const photo = DB_PHOTOS[data.photoIndices[round]];
            document.getElementById('game-image').src = photo.src;
            document.getElementById('round-indicator').innerText = `Manche ${round + 1}/5`;
            if (timerInterval) clearInterval(timerInterval);
            timerInterval = setInterval(() => {
                const timeLeft = Math.max(0, Math.floor((data.roundEndTime - Date.now()) / 1000));
                document.getElementById('timer').innerText = `00:${timeLeft < 10 ? '0'+timeLeft : timeLeft}`;
                if (isHost && timeLeft <= 0) endRound();
            }, 1000);
            const me = data.players[myPlayerId];
            document.getElementById('btn-submit-answer').classList.toggle('hidden', me.hasSubmitted);
            document.getElementById('waiting-msg').classList.toggle('hidden', !me.hasSubmitted);
            if (isHost && players.some(p => p.hasSubmitted)) endRound();
        } 
        else if (data.gameState === 'LEADERBOARD') {
            showScreen('screen-leaderboard');
            const photo = DB_PHOTOS[data.photoIndices[data.currentRound]];
            const c = photo.answers;
            document.getElementById('correct-answer-text').innerText = `${c.moisRelatif} mois, le ${c.day} ${monthsText[c.month]} ${c.year} à ${c.city}`;
            renderList(players, 'leaderboard-list');
            if (isHost && !window.nextTimer) window.nextTimer = setTimeout(() => { nextRound(data.currentRound); window.nextTimer = null; }, 7000);
        } 
        else if (data.gameState === 'FINISHED') {
            showScreen('screen-final');
            players.sort((a,b) => b.score - a.score);
            document.getElementById('winner-name').innerText = players[0].name;
            renderList(players, 'final-list');
            if (isHost) document.getElementById('btn-restart').classList.remove('hidden');
        }
    });
}

document.getElementById('btn-start-game').onclick = () => startRound(0);

function startRound(idx) {
    roomRef.child('players').once('value', snap => {
        let updates = {};
        snap.forEach(p => updates[p.key + '/hasSubmitted'] = false);
        roomRef.child('players').update(updates);
        roomRef.update({ gameState: 'PLAYING', currentRound: idx, roundEndTime: Date.now() + 60000 });
    });
}

document.getElementById('btn-submit-answer').onclick = () => {
    const moisRelatif = parseInt(document.getElementById('ans-mois-relatif').value) || 0;
    const day = parseInt(document.getElementById('ans-day').value) || 0;
    const month = parseInt(document.getElementById('ans-month').value) || 0;
    const year = parseInt(document.getElementById('ans-year').value) || 0;
    const city = document.getElementById('ans-city').value.trim().toLowerCase();
    roomRef.once('value', snap => {
        const data = snap.val();
        const correct = DB_PHOTOS[data.photoIndices[data.currentRound]].answers;
        let p = 0;
        if (moisRelatif === correct.moisRelatif) p += 10;
        if (day === correct.day) p += 10;
        if (month === correct.month) p += 10;
        if (year === correct.year) p += 10;
        if (city === correct.city.toLowerCase()) p += 20;
        roomRef.child('players/' + myPlayerId).update({ score: (data.players[myPlayerId].score || 0) + p, hasSubmitted: true });
        document.querySelectorAll('.inputs-grid input').forEach(i => i.value = '');
    });
};

function endRound() { roomRef.update({ gameState: 'LEADERBOARD' }); }
function nextRound(curr) { if (curr < 4) startRound(curr + 1); else roomRef.update({ gameState: 'FINISHED' }); }
function renderList(users, elId) {
    const sorted = users.sort((a,b) => b.score - a.score);
    document.getElementById(elId).innerHTML = sorted.map(u => {
        const stopTag = u.hasSubmitted ? '<span class="stop-badge">STOP</span>' : '';
        return `<li>${u.name}${stopTag} <span>${u.score} pts</span></li>`;
    }).join('');
}
document.getElementById('btn-restart').onclick = () => location.reload();