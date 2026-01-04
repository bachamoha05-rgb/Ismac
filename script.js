// ----------------------
// FIREBASE CONFIG (compat)
// ----------------------
const firebaseConfig = {
  apiKey: "AIzaSyA-VhnC4VBWXjl9POidNwGG8uLpibLqOwk",
  authDomain: "ismac-5c655.firebaseapp.com",
  databaseURL: "https://ismac-5c655-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "ismac-5c655",
  storageBucket: "ismac-5c655.firebasestorage.app",
  messagingSenderId: "601300390094",
  appId: "1:601300390094:web:ba2d320c258ba0fde0c09f"
};

const app = firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// ----------------------
// VARIABLES DU JEU
// ----------------------
let pseudo, codeSalle;
let joueursRef, salleRef;
let manche = 0;
let maxManches = 5;
let timerInterval;
let tempsRestant = 60;

let photos = [
  {src:"photo1.jpg", jour:12, mois:8, annee:2019, age:3, ville:"Paris"},
  {src:"photo2.jpg", jour:5, mois:6, annee:2020, age:4, ville:"Lyon"},
  {src:"photo3.jpg", jour:20, mois:3, annee:2018, age:2, ville:"Marseille"},
  {src:"photo4.jpg", jour:15, mois:12, annee:2021, age:5, ville:"Toulouse"},
  {src:"photo5.jpg", jour:1, mois:1, annee:2022, age:6, ville:"Nice"}
];

// ----------------------
// AFFICHAGE JOUEURS
// ----------------------
function afficherJoueurs() {
    joueursRef.on("value", snapshot => {
        const data = snapshot.val();
        let html = "<h3>Joueurs :</h3>";
        if(data){
            for(let key in data){
                html += `<div>${key} - Score: ${data[key].score} ${data[key].reponse? '| Réponse: ' + data[key].reponse : ''}</div>`;
            }
        }
        document.getElementById("joueurs").innerHTML = html;
    });
}

// ----------------------
// REJOINDRE LA SALLE
// ----------------------
document.getElementById("rejoindre").onclick = () => {
    pseudo = document.getElementById("pseudo").value.trim();
    codeSalle = document.getElementById("codeSalle").value.trim();
    if(!pseudo || !codeSalle) return alert("Pseudo et code requis !");

    document.getElementById("lobby").style.display = "none";
    document.getElementById("game").style.display = "block";

    // Réf salle et joueurs
    salleRef = db.ref("salles/" + codeSalle);
    joueursRef = salleRef.child("joueurs");

    // Ajouter joueur si pas déjà là
    joueursRef.child(pseudo).set({score:0, pret:false});

    // Ajouter bouton prêt
    const boutonPret = document.createElement("button");
    boutonPret.innerText = "Je suis prêt !";
    boutonPret.id = "boutonPret";
    boutonPret.onclick = () => {
        joueursRef.child(pseudo).update({pret:true});
    };
    document.getElementById("game").prepend(boutonPret);

    afficherJoueurs();

    // Vérifie si tous sont prêts
    salleRef.child("joueurs").on("value", snapshot => {
        const joueurs = snapshot.val();
        if(joueurs && Object.values(joueurs).every(j => j.pret)){
            document.getElementById("boutonPret").style.display = "none";
            demarrerManche();
        }
    });
}

// ----------------------
// DEMARRER MANCHE
// ----------------------
function demarrerManche() {
    if(manche >= maxManches){
        alert("Partie terminée !");
        return;
    }

    const photo = photos[manche];
    document.getElementById("photo").src = photo.src;
    document.getElementById("photoTitre").innerText = `Manche ${manche + 1}`;

    // Reset réponses
    ["jour","mois","annee","age","ville"].forEach(id => document.getElementById(id).value = "");

    tempsRestant = 60;
    document.getElementById("timer").innerText = tempsRestant;

    // Timer
    timerInterval = setInterval(() => {
        tempsRestant--;
        const timerDiv = document.getElementById("timer");
        timerDiv.innerText = tempsRestant;
        if(tempsRestant <= 10){
            timerDiv.classList.add("urgent");
        } else {
            timerDiv.classList.remove("urgent");
        }
        if(tempsRestant <= 0){
            clearInterval(timerInterval);
            verifierReponses();
        }
    }, 1000);
}

// ----------------------
// VERIFIER REPONSES ET CALCUL POINTS
// ----------------------
function verifierReponses() {
    clearInterval(timerInterval);
    const photo = photos[manche];

    const jour = parseInt(document.getElementById("jour").value);
    const mois = parseInt(document.getElementById("mois").value);
    const annee = parseInt(document.getElementById("annee").value);
    const age = parseInt(document.getElementById("age").value);
    const ville = document.getElementById("ville").value.trim().toLowerCase();

    let points = 0;

    function pointsTolere(reponse, vraieValeur){
        const diff = Math.abs(reponse - vraieValeur);
        if(diff === 0) return 10;
        if(diff === 1) return 7;
        if(diff === 2) return 5;
        if(diff === 3) return 3;
        return 0;
    }

    points += pointsTolere(jour, photo.jour);
    points += pointsTolere(mois, photo.mois);
    points += pointsTolere(annee, photo.annee);
    points += pointsTolere(age, photo.age);
    if(ville === photo.ville.toLowerCase()) points += 10;

    // Sauvegarde réponse + points
    joueursRef.child(pseudo).once("value").then(snapshot => {
        let ancienScore = snapshot.val().score || 0;
        joueursRef.child(pseudo).update({
            score: ancienScore + points,
            reponse: `${jour}/${mois}/${annee}, ${age} ans, ${ville}`
        });
    });

    // Affiche popup points
    let popup = document.createElement("div");
    popup.id = "pointsPopup";
    popup.innerText = `+${points} points !`;
    document.body.appendChild(popup);
    setTimeout(()=>popup.remove(), 1000);

    // Affiche les scores et réponses de tout le monde après manche
    setTimeout(() => {
        salleRef.child("joueurs").once("value").then(snapshot => {
            const data = snapshot.val();
            let html = "<h3>Scores & Réponses :</h3>";
            for(let key in data){
                html += `<div>${key} - Score: ${data[key].score} | Réponse: ${data[key].reponse || 'Aucune'}</div>`;
            }
            document.getElementById("scores").innerHTML = html;

            manche++;
            // Reset prêt pour la prochaine manche
            for(let key in data){
                joueursRef.child(key).update({pret:false});
            }
            // Ajouter bouton prêt pour la prochaine manche
            const boutonPret = document.createElement("button");
            boutonPret.innerText = "Je suis prêt !";
            boutonPret.id = "boutonPret";
            boutonPret.onclick = () => {
                joueursRef.child(pseudo).update({pret:true});
            };
            document.getElementById("game").prepend(boutonPret);
        });
    }, 1200); // attendre popup
}

// ----------------------
// BOUTON VALIDER
// ----------------------
document.getElementById("valider").onclick = () => {
    verifierReponses();
};
