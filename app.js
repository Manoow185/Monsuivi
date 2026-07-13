import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword,
  onAuthStateChanged, signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getFirestore, doc, setDoc, addDoc, collection, query, where,
  onSnapshot, deleteDoc, serverTimestamp, orderBy
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

showFormBtn.onclick = () => entryFormCard.classList.remove('hidden');
cancelEntryBtn.onclick = () => { entryFormCard.classList.add('hidden'); clearForm(); };

function clearForm(){
  document.getElementById('fEntreprise').value = '';
  document.getElementById('fTelEntreprise').value = '';
  document.getElementById('fType').value = 'Dépôt de CV';
  document.getElementById('fReponse').value = 'En attente';
  document.getElementById('fRelance').value = 'Non';
  document.getElementById('fRespNom').value = '';
  document.getElementById('fRespTel').value = '';
  document.getElementById('fRespEmail').value = '';
  document.getElementById('formError').textContent = '';
}

saveEntryBtn.onclick = async () => {
  const entreprise = document.getElementById('fEntreprise').value.trim();
  const telEntreprise = document.getElementById('fTelEntreprise').value.trim();
  const type = document.getElementById('fType').value;
  const reponse = document.getElementById('fReponse').value;
  const relance = document.getElementById('fRelance').value;
  const respNom = document.getElementById('fRespNom').value.trim();
  const respTel = document.getElementById('fRespTel').value.trim();
  const respEmail = document.getElementById('fRespEmail').value.trim();
  const errEl = document.getElementById('formError');
  errEl.textContent = '';

  if(!entreprise || !telEntreprise){
    errEl.textContent = "Le nom et le téléphone de l'entreprise sont obligatoires.";
    return;
  }

  try{
    await addDoc(collection(db, "entries"), {
      userId: currentUserId,
      entreprise, telEntreprise, type, reponse, relance,
      respNom, respTel, respEmail,
      createdAt: serverTimestamp()
    });
    entryFormCard.classList.add('hidden');
    clearForm();
  }catch(e){
    errEl.textContent = "Erreur lors de l'enregistrement.";
    console.error(e);
  }
};

// ---------- Listen & render entries ----------
function listenEntries(){
  const q = query(collection(db, "entries"), where("userId", "==", currentUserId), orderBy("createdAt", "desc"));
  unsubscribeEntries = onSnapshot(q, (snap) => {
    const entries = [];
    snap.forEach(d => entries.push({ id: d.id, ...d.data() }));
    renderEntries(entries);
    renderStats(entries);
  });
}

function badgeClass(reponse){
  const map = { 'En attente':'attente', 'Non':'non', 'Entretien':'entretien', 'Oui':'oui' };
  return map[reponse] || 'attente';
}

function formatWeek(ts){
  if(!ts || !ts.toDate) return '';
  const d = ts.toDate();
  const firstJan = new Date(d.getFullYear(),0,1);
  const week = Math.ceil((((d - firstJan) / 86400000) + firstJan.getDay()+1)/7);
  return `Semaine ${week} - ${d.getFullYear()}`;
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
        <div class="week-tag">${formatWeek(e.createdAt)}</div>
        <div class="entreprise">${escapeHtml(e.entreprise)}</div>
        <div class="meta">📞 ${escapeHtml(e.telEntreprise)} · ${escapeHtml(e.type)}</div>
        ${respLine}
      </div>
      <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
        <span class="badge ${badgeClass(e.reponse)}">${e.reponse}</span>
        <span class="badge ${e.relance==='Oui'?'relance-oui':'relance-non'}">Relance: ${e.relance}</span>
        <div class="actions">
          <button title="Supprimer" onclick="window.deleteEntry('${e.id}')">🗑️</button>
        </div>
      </div>
    `;
    list.appendChild(div);
  });
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