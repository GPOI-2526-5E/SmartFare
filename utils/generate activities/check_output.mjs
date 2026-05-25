import fs from "node:fs";

// Prime 5 righe Activity
const actRaw = fs.readFileSync("./Activity_rows.csv","utf8").split("\n");
console.log("=== ACTIVITY (intestazione + 5 esempi) ===");
actRaw.slice(0,6).forEach(l => console.log(l));

// Prime 5 righe Accommodation
const accRaw = fs.readFileSync("./Accommodation_rows.csv","utf8").split("\n");
console.log("\n=== ACCOMMODATION (intestazione + 5 esempi) ===");
accRaw.slice(0,6).forEach(l => console.log(l));

// Statistiche
const actLines = actRaw.filter(Boolean);
let noDesc=0, noImg=0, noStreet=0, total=actLines.length-1;
for(let i=1;i<actLines.length;i++){
  const line = actLines[i];
  // parsing semplice: conto le virgole fuori dalle virgolette
  const parts = [];
  let token="", inQ=false;
  for(let c=0;c<line.length;c++){
    if(line[c]==='"'){ inQ=!inQ; }
    else if(line[c]===',' && !inQ){ parts.push(token); token=""; }
    else token+=line[c];
  }
  parts.push(token);
  // id,name,description,street,latitude,longitude,imageUrl,locationId,categoryId
  if(!parts[2] || parts[2].trim()==="") noDesc++;
  if(!parts[6] || parts[6].trim()==="") noImg++;
  if(!parts[3] || parts[3].trim()==="") noStreet++;
}
console.log("\n=== STATISTICHE ACTIVITY ===");
console.log("Totale righe     :", total);
console.log("Senza descrizione:", noDesc, `(${((noDesc/total)*100).toFixed(1)}%)`);
console.log("Senza immagine   :", noImg,  `(${((noImg/total)*100).toFixed(1)}%)`);
console.log("Senza strada     :", noStreet, `(${((noStreet/total)*100).toFixed(1)}%)`);

// Esempio di riga con descrizione lunga
const sample = actLines.slice(1,20).find(l => {
  const p = l.split(",");
  return p[2] && p[2].length > 30;
});
if(sample) { console.log("\nEsempio riga con descrizione:"); console.log(sample.slice(0,300)); }
