import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword,
  onAuthStateChanged, signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getFirestore, doc, setDoc, getDoc, addDoc, updateDoc, deleteDoc, collection, query, where,
  onSnapshot, serverTimestamp, getDocs
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
const bannedScreen = document.getElementById('bannedScreen');
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
  const phone = document.getElementById('signupPhone').value.trim();
  const email = document.getElementById('signupEmail').value.trim();
  const password = document.getElementById('signupPassword').value;
  const errEl = document.getElementById('signupError');
  errEl.textContent = '';
  if(!firstname || !lastname || !birthdate || !phone || !email || !password){
    errEl.textContent = "Merci de remplir tous les champs.";
    return;
  }
  try{
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await setDoc(doc(db, "users", cred.user.uid), {
      firstname, lastname, birthdate, phone, email,
      role: "user", banned: false, referentId: null,
      createdAt: serverTimestamp()
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
let currentUserData = null;
let unsubscribeEntries = null;

const btnTabEntries = document.getElementById('btnTabEntries');
const btnTabAccount = document.getElementById('btnTabAccount');
const btnTabReferes = document.getElementById('btnTabReferes');
const btnTabAdmin = document.getElementById('btnTabAdmin');
const viewEntries = document.getElementById('viewEntries');
const viewAccount = document.getElementById('viewAccount');
const viewReferes = document.getElementById('viewReferes');
const viewAdmin = document.getElementById('viewAdmin');

function switchView(view){
  [btnTabEntries, btnTabAccount, btnTabReferes, btnTabAdmin].forEach(b => b.classList.remove('active'));
  [viewEntries, viewAccount, viewReferes, viewAdmin].forEach(v => v.classList.add('hidden'));
  if(view === 'entries'){ btnTabEntries.classList.add('active'); viewEntries.classList.remove('hidden'); }
  if(view === 'account'){ btnTabAccount.classList.add('active'); viewAccount.classList.remove('hidden'); loadAccount(); }
  if(view === 'referes'){ btnTabReferes.classList.add('active'); viewReferes.classList.remove('hidden'); loadReferes(); }
  if(view === 'admin'){ btnTabAdmin.classList.add('active'); viewAdmin.classList.remove('hidden'); loadAdmin(); }
}
btnTabEntries.onclick = () => switchView('entries');
btnTabAccount.onclick = () => switchView('account');
btnTabReferes.onclick = () => switchView('referes');
btnTabAdmin.onclick = () => switchView('admin');

function loadAccount(){
  document.getElementById('accFirstname').value = currentUserData.firstname || '';
  document.getElementById('accLastname').value = currentUserData.lastname || '';
  document.getElementById('accBirthdate').value = currentUserData.birthdate || '';
  document.getElementById('accPhone').value = currentUserData.phone || '';
  document.getElementById('accEmail').value = currentUserData.email || '';
  document.getElementById('accountMsg').textContent = '';
}

document.getElementById('saveAccountBtn').onclick = async () => {
  const firstname = document.getElementById('accFirstname').value.trim();
  const lastname = document.getElementById('accLastname').value.trim();
  const birthdate = document.getElementById('accBirthdate').value;
  const phone = document.getElementById('accPhone').value.trim();
  const msgEl = document.getElementById('accountMsg');
  if(!firstname || !lastname || !birthdate || !phone){
    msgEl.style.color = '#E63946';
    msgEl.textContent = "Merci de remplir tous les champs.";
    return;
  }
  try{
    await updateDoc(doc(db, "users", currentUserId), { firstname, lastname, birthdate, phone });
    currentUserData = { ...currentUserData, firstname, lastname, birthdate, phone };
    welcomeMsg.textContent = `${firstname} (${currentUserData.email})`;
    msgEl.style.color = '#2EC4B6';
    msgEl.textContent = "Informations enregistrées ✅";
  }catch(e){
    msgEl.style.color = '#E63946';
    msgEl.textContent = "Erreur lors de l'enregistrement.";
  }
};

onAuthStateChanged(auth, async (user) => {
  if(user){
    const uRef = doc(db, "users", user.uid);
    const snap = await getDoc(uRef);
    let udata = snap.exists() ? snap.data() : {};

    // Auto-réparation : crée les champs manquants (utile pour les comptes créés avant l'ajout des rôles)
    const patch = {};
    if(udata.role === undefined) patch.role = 'user';
    if(udata.banned === undefined) patch.banned = false;
    if(udata.referentId === undefined) patch.referentId = null;
    if(udata.phone === undefined) patch.phone = '';
    if(Object.keys(patch).length > 0){
      await setDoc(uRef, patch, { merge: true });
      udata = { ...udata, ...patch };
    }

    if(udata.banned){
      authScreen.classList.add('hidden');
      appScreen.classList.add('hidden');
      bannedScreen.classList.remove('hidden');
      logoutBtn.classList.remove('hidden');
      welcomeMsg.textContent = user.email;
      return;
    }

    currentUserId = user.uid;
    currentUserData = udata;
    authScreen.classList.add('hidden');
    bannedScreen.classList.add('hidden');
    appScreen.classList.remove('hidden');
    logoutBtn.classList.remove('hidden');
    welcomeMsg.textContent = `${udata.firstname || ''} (${user.email})`;

    btnTabReferes.classList.toggle('hidden', udata.role !== 'referant');
    btnTabAdmin.classList.toggle('hidden', udata.role !== 'admin');
    switchView('entries');
    listenEntries();
  } else {
    currentUserId = null;
    currentUserData = null;
    authScreen.classList.remove('hidden');
    appScreen.classList.add('hidden');
    bannedScreen.classList.add('hidden');
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

let editingId = null;

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
  document.getElementById('fComment').value = '';
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
  const comment = document.getElementById('fComment').value.trim();
  const errEl = document.getElementById('formError');
  errEl.textContent = '';

  if(!entreprise || !telEntreprise || !date || !heure){
    errEl.textContent = "Le nom, le téléphone, la date et l'heure sont obligatoires.";
    return;
  }

  const data = {
    userId: currentUserId,
    entreprise, telEntreprise, date, heure, type, reponse, relance,
    respNom, respTel, respEmail, comment
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

window.editEntry = (id) => {
  const e = (window.__entries || []).find(x => x.id === id);
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
  document.getElementById('fComment').value = e.comment || '';
  document.getElementById('fRespNom').value = e.respNom || '';
  document.getElementById('fRespTel').value = e.respTel || '';
  document.getElementById('fRespEmail').value = e.respEmail || '';
  document.getElementById('formError').textContent = '';
  entryFormCard.classList.remove('hidden');
  entryFormCard.scrollIntoView({ behavior:'smooth', block:'start' });
};

// ---------- Listen & render entries (utilisateur courant) ----------
function listenEntries(){
  const q = query(collection(db, "entries"), where("userId", "==", currentUserId));
  unsubscribeEntries = onSnapshot(q, (snap) => {
    const entries = [];
    snap.forEach(d => entries.push({ id: d.id, ...d.data() }));
    entries.sort((a, b) => `${b.date||''} ${b.heure||''}`.localeCompare(`${a.date||''} ${a.heure||''}`));
    window.__entries = entries;
    renderEntries(entries, document.getElementById('entriesList'), document.getElementById('emptyState'), true);
    renderStats(entries);
  }, (error) => console.error("Erreur de lecture des démarches :", error));
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

function escapeHtml(str){
  const d = document.createElement('div');
  d.textContent = str || '';
  return d.innerHTML;
}

function renderEntries(entries, listEl, emptyEl, editable, referantMode){
  listEl.innerHTML = '';
  if(entries.length === 0){
    if(emptyEl) emptyEl.classList.remove('hidden');
    return;
  }
  if(emptyEl) emptyEl.classList.add('hidden');

  entries.forEach(e => {
    const div = document.createElement('div');
    div.className = 'entry';
    let respLine = '';
    if(e.respNom || e.respTel || e.respEmail){
      respLine = `<div class="meta">👤 ${e.respNom||'—'} ${e.respTel? '· 📞 '+e.respTel:''} ${e.respEmail? '· ✉️ '+e.respEmail:''}</div>`;
    }
    let proofLine = '';
    if(e.comment){
      proofLine += `<div class="comment-box user-comment">💬 <strong>Toi :</strong> ${escapeHtml(e.comment)}</div>`;
    }
    if(e.referantComment){
      proofLine += `<div class="comment-box">🗨️ <strong>Référant :</strong> ${escapeHtml(e.referantComment)}</div>`;
    }
    if(referantMode){
      proofLine += `<div style="margin-top:8px;">
        <textarea rows="2" placeholder="Ajouter un commentaire..." id="refComment_${e.id}">${escapeHtml(e.referantComment||'')}</textarea>
        <button class="btn-secondary" style="margin-top:6px; padding:6px 12px; font-size:13px;" onclick="window.saveReferantComment('${e.id}')">💾 Enregistrer le commentaire</button>
      </div>`;
    }
    const actions = editable
      ? `<div class="actions">
          <button title="Modifier" onclick='window.editEntry("${e.id}")'>✏️</button>
          <button title="Supprimer" onclick="window.deleteEntry('${e.id}')">🗑️</button>
        </div>`
      : '';
    const seenBadge = referantMode
      ? `<span class="badge ${e.seen?'seen':'unseen'}" style="cursor:pointer;" onclick="window.toggleSeen('${e.id}', ${!!e.seen})">${e.seen?'✅ Vu':'👁️ Marquer vu'}</span>`
      : (e.seen ? `<span class="badge seen">✅ Vu par le référant</span>` : '');
    div.innerHTML = `
      <div class="main">
        <div class="week-tag">${formatWeek(e.date)}</div>
        <div class="entreprise">${escapeHtml(e.entreprise)}</div>
        <div class="meta">📅 ${formatDateFr(e.date)} à ${escapeHtml(e.heure||'')} · 📞 ${escapeHtml(e.telEntreprise)} · ${escapeHtml(e.type)}</div>
        ${respLine}
        ${proofLine}
      </div>
      <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
        <span class="badge ${badgeClass(e.reponse)}">${e.reponse}</span>
        <span class="badge ${e.relance==='Oui'?'relance-oui':'relance-non'}">Relance: ${e.relance}</span>
        ${seenBadge}
        ${actions}
      </div>
    `;
    listEl.appendChild(div);
  });
}

function renderStats(entries){
  document.getElementById('statTotal').textContent = entries.length;
  document.getElementById('statEntretien').textContent = entries.filter(e=>e.reponse==='Entretien').length;
  document.getElementById('statOui').textContent = entries.filter(e=>e.reponse==='Oui').length;
  document.getElementById('statAttente').textContent = entries.filter(e=>e.reponse==='En attente').length;
}

window.deleteEntry = async (id) => {
  if(confirm('Supprimer cette démarche ?')){
    await deleteDoc(doc(db, "entries", id));
  }
};

// ---------- VUE REFERANT : mes référés ----------
async function loadReferes(){
  const container = document.getElementById('referesList');
  container.innerHTML = '<p class="meta">Chargement…</p>';
  const usersSnap = await getDocs(query(collection(db, "users"), where("referentId","==", currentUserId)));
  const users = [];
  usersSnap.forEach(d => users.push({ id:d.id, ...d.data() }));

  if(users.length === 0){
    container.innerHTML = '<div class="empty-state"><div class="emoji">👥</div><p>Aucune personne ne t\'est encore affiliée.</p></div>';
    return;
  }

  container.innerHTML = '';
  for(const u of users){
    const entriesSnap = await getDocs(query(collection(db, "entries"), where("userId","==", u.id)));
    const entries = [];
    entriesSnap.forEach(d => entries.push({ id:d.id, ...d.data() }));
    entries.sort((a,b) => `${b.date||''} ${b.heure||''}`.localeCompare(`${a.date||''} ${a.heure||''}`));

    const block = document.createElement('div');
    block.className = 'card-form';
    block.innerHTML = `<h3 style="margin-top:0;">${escapeHtml(u.firstname)} ${escapeHtml(u.lastname)} <span class="meta">(${escapeHtml(u.email)})</span></h3>
      <div class="meta" style="margin-bottom:10px;">🎂 Né(e) le ${u.birthdate || '—'} · 📞 ${escapeHtml(u.phone || '—')} · ${entries.length} démarche(s)</div>
      <div class="entries" id="refEntries_${u.id}"></div>`;
    container.appendChild(block);
    renderEntries(entries, block.querySelector(`#refEntries_${u.id}`), null, false, true);
  }
}

window.toggleSeen = async (id, currentlySeen) => {
  await updateDoc(doc(db, "entries", id), { seen: !currentlySeen });
  loadReferes();
};

window.saveReferantComment = async (id) => {
  const val = document.getElementById(`refComment_${id}`).value.trim();
  await updateDoc(doc(db, "entries", id), { referantComment: val });
  loadReferes();
};

// ---------- VUE ADMIN ----------
async function loadAdmin(){
  const container = document.getElementById('adminList');
  container.innerHTML = '<p class="meta">Chargement…</p>';
  const usersSnap = await getDocs(collection(db, "users"));
  const users = [];
  usersSnap.forEach(d => users.push({ id:d.id, ...d.data() }));
  const referants = users.filter(u => u.role === 'referant');

  container.innerHTML = '';
  users.forEach(u => {
    const div = document.createElement('div');
    div.className = 'entry';
    const roleOptions = ['user','referant','admin'].map(r =>
      `<option value="${r}" ${u.role===r?'selected':''}>${r}</option>`).join('');
    const referantOptions = ['<option value="">— aucun —</option>'].concat(
      referants.map(r => `<option value="${r.id}" ${u.referentId===r.id?'selected':''}>${escapeHtml(r.firstname)} ${escapeHtml(r.lastname)}</option>`)
    ).join('');

    div.innerHTML = `
      <div class="main">
        <div class="entreprise">${escapeHtml(u.firstname)} ${escapeHtml(u.lastname)}</div>
        <div class="meta">✉️ ${escapeHtml(u.email)} · 🎂 ${u.birthdate || '—'} · 📞 ${escapeHtml(u.phone || '—')}</div>
        <div style="margin-top:8px; display:flex; gap:8px; flex-wrap:wrap; align-items:center;">
          <span class="badge role-${u.role||'user'}">${u.role||'user'}</span>
          ${u.banned ? '<span class="badge banned">banni</span>' : ''}
          <label style="margin:0; font-size:12px;">Rôle :</label>
          <select class="admin-select" onchange="window.setRole('${u.id}', this.value)">${roleOptions}</select>
          <label style="margin:0; font-size:12px;">Référant :</label>
          <select class="admin-select" onchange="window.setReferent('${u.id}', this.value)">${referantOptions}</select>
        </div>
      </div>
      <div class="actions">
        <button title="${u.banned?'Débannir':'Bannir'}" onclick="window.toggleBan('${u.id}', ${!!u.banned})">${u.banned?'✅':'⛔'}</button>
        <button title="Supprimer les données" onclick="window.deleteUserData('${u.id}')">🗑️</button>
      </div>
    `;
    container.appendChild(div);
  });
}

window.setRole = async (uid, role) => {
  await updateDoc(doc(db, "users", uid), { role });
  loadAdmin();
};

window.setReferent = async (uid, referentId) => {
  await updateDoc(doc(db, "users", uid), { referentId: referentId || null });
  loadAdmin();
};

window.toggleBan = async (uid, currentlyBanned) => {
  await updateDoc(doc(db, "users", uid), { banned: !currentlyBanned });
  loadAdmin();
};

window.deleteUserData = async (uid) => {
  if(!confirm("Supprimer toutes les données de ce compte (démarches + profil) ? L'accès Authentification devra être supprimé séparément dans la console Firebase.")) return;
  const entriesSnap = await getDocs(query(collection(db, "entries"), where("userId","==", uid)));
  for(const d of entriesSnap.docs){ await deleteDoc(d.ref); }
  await deleteDoc(doc(db, "users", uid));
  loadAdmin();
};
