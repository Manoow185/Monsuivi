import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword,
  onAuthStateChanged, signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getFirestore, doc, setDoc, addDoc, updateDoc, collection, query, where,
  onSnapshot, deleteDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ⚠️ Remplace ces valeurs par celles de TON projet Firebase (Paramètres du projet > Config web)
const firebaseConfig = {
  apiKey: "AIzaSyCwkWEDG1Mdk0V_Px1Ev8TqnCOUhWEpk9o",
  authDomain: "monsuivi-3c42a.firebaseapp.com",
  projectId: "monsuivi-3c42a",
  storageBucket: "monsuivi-3c42a.firebasestorage.app",
  messagingSenderId: "293651588161",
  appId: "1:293651588161:web:5ea3616146f5413d9c12c0"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// ---------- UI Elements ----------
const authScreen = document.getElementById('authScreen');
const appScreen = document.getElementById('appScreen');
const welcomeMsg = document.getElementById('welcomeMsg');
const logoutBtn = document.getElementById('logoutBtn');

const tabLogin = document.getElementById('tabLogin');
const tabSignup = document.getElementById('tabSignup');
const loginForm = document.getElementById('loginForm');
const signupForm = document.getElementById('signupForm');

tabLogin.onclick = () => { tabLogin.classList.add('active'); tabSignup.classList.remove('active'); loginForm.classList.remove('hidden'); signupForm.classList.add('hidden'); };
tabSignup.onclick = () => { tabSignup.classList.add('active'); tabLogin.classList.remove('active'); signupForm.classList.remove('hidden'); loginForm.classList.add('hidden'); };

// ---------- Signup ----------
document.getElementById('signupBtn').onclick = async () => {
  const firstname = document.getElementById('signupFirstname').value.trim();
  const lastname = document.getElementById('signupLastname').value.trim();
  const birthdate = document.getElementById('signupBirthdate').value;
  const email = document.getElementById('signupEmail').value.trim();
  const password = document.getElementById('signupPassword').value;
  const errEl = document.getElementById('signupError');
  errEl.textContent = '';

  if(!firstname || !lastname || !birthdate || !email || !password){
    errEl.textContent = "Merci de remplir tous les champs.";
    return;
  }
  try{
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await setDoc(doc(db, "users", cred.user.uid), {
      firstname, lastname, birthdate, email, createdAt: serverTimestamp()
    });
  }catch(e){
    errEl.textContent = translateError(e.code);
  }
};

// ---------- Login ----------
document.getElementById('loginBtn').onclick = async () => {
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;
  const errEl = document.getElementById('loginError');
  errEl.textContent = '';
  try{
    await signInWithEmailAndPassword(auth, email, password);
  }catch(e){
    errEl.textContent = translateError(e.code);
  }
};

logoutBtn.onclick = () => signOut(auth);

function translateError(code){
  const map = {
    'auth/email-already-in-use': "Cet email est déjà utilisé.",
    'auth/invalid-email': "Email invalide.",
    'auth/weak-password': "Mot de passe trop faible (6 caractères min.).",
    'auth/user-not-found': "Aucun compte avec cet email.",
    'auth/wrong-password': "Mot de passe incorrect.",
    'auth/invalid-credential': "Identifiants incorrects."
  };
  return map[code] || "Une erreur est survenue. Réessaie.";
}

// ---------- Auth state ----------
let currentUserId = null;
let unsubscribeEntries = null;

onAuthStateChanged(auth, async (user) => {
  if(user){
    currentUserId = user.uid;
    authScreen.classList.add('hidden');
    appScreen.classList.remove('hidden');
    logoutBtn.classList.remove('hidden');
    welcomeMsg.textContent = user.email;
    listenEntries();
  } else {
    currentUserId = null;
    authScreen.classList.remove('hidden');
    appScreen.classList.add('hidden');
    logoutBtn.classList.add('hidden');
    welcomeMsg.textContent = '';
    if(unsubscribeEntries) unsubscribeEntries();
  }
});

// ---------- Entry form ----------
const showFormBtn = document.getElementById('showFormBtn');
const entryFormCard = document.getElementById('entryFormCard');
const cancelEntryBtn = document.getElementById('cancelEntryBtn');
const saveEntryBtn = document.getElementById('saveEntryBtn');

cancelEntryBtn.onclick = () => { entryFormCard.classList.add('hidden'); clearForm(); };

let editingId = null; // null = ajout, sinon id de la démarche en cours de modification

function nowDateTime(){
  const d = new Date();
  const pad = n => String(n).padStart(2,'0');
  return {
    date: `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}`
  };
}

function clearForm(){
  editingId = null;
  document.getElementById('formTitle').textContent = 'Nouvelle démarche';
  document.getElementById('fEntreprise').value = '';
  document.getElementById('fTelEntreprise').value = '';
  const { date, time } = nowDateTime();
  document.getElementById('fDate').value = date;
  document.getElementById('fHeure').value = time;
  document.getElementById('fType').value = 'Dépôt de CV';
  document.getElementById('fReponse').value = 'En attente';
  document.getElementById('fRelance').value = 'Non';
  document.getElementById('fRespNom').value = '';
  document.getElementById('fRespTel').value = '';
  document.getElementById('fRespEmail').value = '';
  document.getElementById('formError').textContent = '';
}

showFormBtn.onclick = () => { clearForm(); entryFormCard.classList.remove('hidden'); };

saveEntryBtn.onclick = async () => {
  const entreprise = document.getElementById('fEntreprise').value.trim();
  const telEntreprise = document.getElementById('fTelEntreprise').value.trim();
  const date = document.getElementById('fDate').value;
  const heure = document.getElementById('fHeure').value;
  const type = document.getElementById('fType').value;
  const reponse = document.getElementById('fReponse').value;
  const relance = document.getElementById('fRelance').value;
  const respNom = document.getElementById('fRespNom').value.trim();
  const respTel = document.getElementById('fRespTel').value.trim();
  const respEmail = document.getElementById('fRespEmail').value.trim();
  const errEl = document.getElementById('formError');
  errEl.textContent = '';

  if(!entreprise || !telEntreprise || !date || !heure){
    errEl.textContent = "Le nom, le téléphone, la date et l'heure sont obligatoires.";
    return;
  }

  const data = {
    userId: currentUserId,
    entreprise, telEntreprise, date, heure, type, reponse, relance,
    respNom, respTel, respEmail
  };

  try{
    if(editingId){
      await updateDoc(doc(db, "entries", editingId), data);
    } else {
      data.createdAt = serverTimestamp();
      await addDoc(collection(db, "entries"), data);
    }
    entryFormCard.classList.add('hidden');
    clearForm();
  }catch(e){
    errEl.textContent = "Erreur : " + (e.message || "l'enregistrement a échoué.");
    console.error(e);
  }
};

window.editEntry = (id, entries) => {
  const e = entries.find(x => x.id === id);
  if(!e) return;
  editingId = id;
  document.getElementById('formTitle').textContent = 'Modifier la démarche';
  document.getElementById('fEntreprise').value = e.entreprise || '';
  document.getElementById('fTelEntreprise').value = e.telEntreprise || '';
  document.getElementById('fDate').value = e.date || nowDateTime().date;
  document.getElementById('fHeure').value = e.heure || nowDateTime().time;
  document.getElementById('fType').value = e.type || 'Dépôt de CV';
  document.getElementById('fReponse').value = e.reponse || 'En attente';
  document.getElementById('fRelance').value = e.relance || 'Non';
  document.getElementById('fRespNom').value = e.respNom || '';
  document.getElementById('fRespTel').value = e.respTel || '';
  document.getElementById('fRespEmail').value = e.respEmail || '';
  document.getElementById('formError').textContent = '';
  entryFormCard.classList.remove('hidden');
  entryFormCard.scrollIntoView({ behavior:'smooth', block:'start' });
};

// ---------- Listen & render entries ----------
function listenEntries(){
  const q = query(collection(db, "entries"), where("userId", "==", currentUserId));
  unsubscribeEntries = onSnapshot(q, (snap) => {
    const entries = [];
    snap.forEach(d => entries.push({ id: d.id, ...d.data() }));
    // Tri du plus récent au plus ancien selon date + heure de la démarche
    entries.sort((a, b) => `${b.date||''} ${b.heure||''}`.localeCompare(`${a.date||''} ${a.heure||''}`));
    renderEntries(entries);
    renderStats(entries);
  }, (error) => {
    console.error("Erreur de lecture des démarches :", error);
  });
}

function badgeClass(reponse){
  const map = { 'En attente':'attente', 'Non':'non', 'Entretien':'entretien', 'Oui':'oui' };
  return map[reponse] || 'attente';
}

function formatWeek(dateStr){
  if(!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  if(isNaN(d)) return '';
  const firstJan = new Date(d.getFullYear(),0,1);
  const week = Math.ceil((((d - firstJan) / 86400000) + firstJan.getDay()+1)/7);
  return `Semaine ${week} - ${d.getFullYear()}`;
}

function formatDateFr(dateStr){
  if(!dateStr) return '';
  const [y,m,d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
}

function renderEntries(entries){
  const list = document.getElementById('entriesList');
  const empty = document.getElementById('emptyState');
  list.innerHTML = '';
  if(entries.length === 0){
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');

  entries.forEach(e => {
    const div = document.createElement('div');
    div.className = 'entry';
    let respLine = '';
    if(e.respNom || e.respTel || e.respEmail){
      respLine = `<div class="meta">👤 ${e.respNom||'—'} ${e.respTel? '· 📞 '+e.respTel:''} ${e.respEmail? '· ✉️ '+e.respEmail:''}</div>`;
    }
    div.innerHTML = `
      <div class="main">
        <div class="week-tag">${formatWeek(e.date)}</div>
        <div class="entreprise">${escapeHtml(e.entreprise)}</div>
        <div class="meta">📅 ${formatDateFr(e.date)} à ${escapeHtml(e.heure||'')} · 📞 ${escapeHtml(e.telEntreprise)} · ${escapeHtml(e.type)}</div>
        ${respLine}
      </div>
      <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
        <span class="badge ${badgeClass(e.reponse)}">${e.reponse}</span>
        <span class="badge ${e.relance==='Oui'?'relance-oui':'relance-non'}">Relance: ${e.relance}</span>
        <div class="actions">
          <button title="Modifier" onclick='window.editEntry("${e.id}", window.__entries)'>✏️</button>
          <button title="Supprimer" onclick="window.deleteEntry('${e.id}')">🗑️</button>
        </div>
      </div>
    `;
    list.appendChild(div);
  });
  window.__entries = entries;
}

function renderStats(entries){
  document.getElementById('statTotal').textContent = entries.length;
  document.getElementById('statEntretien').textContent = entries.filter(e=>e.reponse==='Entretien').length;
  document.getElementById('statOui').textContent = entries.filter(e=>e.reponse==='Oui').length;
  document.getElementById('statAttente').textContent = entries.filter(e=>e.reponse==='En attente').length;
}

function escapeHtml(str){
  const d = document.createElement('div');
  d.textContent = str || '';
  return d.innerHTML;
}

window.deleteEntry = async (id) => {
  if(confirm('Supprimer cette démarche ?')){
    await deleteDoc(doc(db, "entries", id));
  }
};