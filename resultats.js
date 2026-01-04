const codeSalle = sessionStorage.getItem("codeSalle");
const salleRef = db.ref("salles/" + codeSalle + "/joueurs");
const resultDiv = document.getElementById("resultats");

salleRef.once("value").then(snapshot=>{
    const data = snapshot.val();
    const classement = Object.entries(data).sort((a,b)=>b[1].score-a[1].score);
    classement.forEach((item,index)=>{
        const div = document.createElement("div");
        div.innerText = `${index+1} - ${item[0]} : ${item[1].score} pts`;
        if(index===0) div.classList.add("first-place");
        resultDiv.appendChild(div);
    });
});

