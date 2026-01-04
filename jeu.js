// --- Firebase ---
const firebaseConfig = {
  apiKey: "AIzaSyA-VhnC4VBWXjl9POidNwGG8uLpibLqOwk",
  authDomain: "ismac-5c655.firebaseapp.com",
  databaseURL: "https://ismac-5c655-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "ismac-5c655",
  storageBucket: "ismac-5c655.firebasestorage.app",
  messagingSenderId: "601300390094",
  appId: "1:601300390094:web:ba2d320c258ba0fde0c09f"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// --- Infos session ---
let pseudo = sessionStorage.getItem("pseudo");
let codeSalle = sessionStorage.getItem("codeSalle");
let manche = parseInt(sessionStorage.getItem("manche")) || 0;
document.getElementById("numManche").innerText = manche + 1;

// --- Photos / réponses ---
const photos = [
    {src:"photos/photo1.jpg", age:5, ville:"Paris", jour:1, mois:1, annee:2018},
    {src:"photos/photo2.jpg", age:6, ville:"Lyon", jour:12, mois:6, annee:2017},
    // ajoute les 20 photos ici
];

const photo = photos[manche];
document.getElementById("photo").src = photo.src;

// --- Timer ---
let tempsRestant = 60;
const timerEl = document.getElementById("timer");
let timerInterval = setInterval(()=>{
    tempsRestant--;
    timerEl.innerText = tempsRestant;
    if(tempsRestant>30) timerEl.className="green";
    else if(tempsRestant>10) timerEl.className="yellow";
    else timerEl.className="red";
    if(tempsRestant<=0){
        clearInterval(timerInterval);
        validerReponses();
    }
},1000);

// --- Calcul points tolérants ---
function calcPoints(input, reponse){
    if(typeof reponse === "number"){
        if(input===reponse) return 10;
        if(Math.abs(input-reponse)===1) return 5;
        return 0;
    } else {
        input = input.trim().toLowerCase();
        reponse = reponse.trim().toLowerCase();
        if(input===reponse) return 10;
        if(reponse.includes(input) || input.includes(reponse)) return 5;
        return 0;
    }
}

// --- Affichage popup ---
function showPoints(points){
    const popup = document.createElement("div");
    popup.className="point-popup";
    popup.innerText=`+${points}`;
    document.body.appendChild(popup);
    popup.style.left=Math.random()*window.innerWidth+"px";
    popup.style.top=Math.random()*window.innerHeight+"px";
    setTimeout(()=>popup.remove(),800);
}

// --- Valider réponses ---
function validerReponses(){
    clearInterval(timerInterval);

    const inputs = {
        age: parseInt(document.getElementById("inputAge").value),
        ville: document.getElementById("inputVille").value,
        jour: parseInt(document.getElementById("inputJour").value),
        mois: parseInt(document.getElementById("inputMois").value),
        annee: parseInt(document.getElementById("inputAnnee").value)
    };

    let totalPoints = 0;
    totalPoints += calcPoints(inputs.age, photo.age);
    totalPoints += calcPoints(inputs.ville, photo.ville);
    totalPoints += calcPoints(inputs.jour, photo.jour);
    totalPoints += calcPoints(inputs.mois, photo.mois);
    totalPoints += calcPoints(inputs.annee, photo.annee);

    showPoints(totalPoints);

    // --- Update Firebase ---
    const joueurRef = db.ref(`salles/${codeSalle}/joueurs/${pseudo}`);
    joueurRef.once("value").then(snap=>{
        const ancienScore = snap.val().score || 0;
        joueurRef.update({score:ancienScore + totalPoints});
        // --- Manche suivante ou résultats ---
        manche++;
        sessionStorage.setItem("manche", manche);
        if(manche < 5){
            window.location.reload();
        } else {
            window.location.href = "resultats.html";
        }
    });
}

// --- Bouton valider ---
document.getElementById("valider").onclick = validerReponses;
