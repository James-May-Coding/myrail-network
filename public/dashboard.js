// Use type="module" in script tag in HTML
import { supabase } from './supabaseClient.js';

// Elements
const userInfo = document.getElementById('user-info');
const logoutBtn = document.getElementById('logout-btn');
const dropdown = document.getElementById('community-dropdown');
const refreshBtn = document.getElementById('refresh-communities');
const createCommunityBtn = document.getElementById('create-community');
const joinBtn = document.getElementById('join-community');
const joinInput = document.getElementById('join-code-input');
const invitesContainer = document.getElementById('invites-container');
const trainsBody = document.getElementById('trains-body');

// Modals
const createPopup = document.getElementById('create-popup');
const createInput = document.getElementById('create-name-input');
const createCancel = document.getElementById('create-cancel');
const createSubmit = document.getElementById('create-submit');

const trainPopup = document.getElementById('train-popup');
const popupTitle = document.getElementById('popup-title');
const popupList = document.getElementById('train-crew-list');
const closePopup = document.getElementById('close-popup');

// Cookies helpers
function setCookie(name, value, days=7) {
  const expires = new Date(Date.now() + days*864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax;`;
}
function getCookie(name) {
  const v = document.cookie.split('; ').find(r=>r.startsWith(name+'='));
  return v ? decodeURIComponent(v.split('=')[1]) : null;
}
function clearCookie(name) { document.cookie = `${name}=; Max-Age=0; path=/`; }

// Fetch helper
async function fetchJson(url, opts={}) {
  const res = await fetch(url, { credentials:'include', ...opts });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// Load Supabase session
async function getSession() {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.user || null;
}

// Load dashboard
async function loadDashboard() {
  const user = await getSession();
  if (!user) return window.location.href = '/';
  userInfo.textContent = user.email || user.id;

  await loadCommunities();
  await loadInvites();
  await loadTrains();
}

// --- Communities ---
async function loadCommunities() {
  const list = await fetchJson('/api/communities.js');
  dropdown.innerHTML = '';
  if (!list || list.length===0) {
    const opt = document.createElement('option'); opt.textContent='No communities'; opt.disabled=true;
    dropdown.appendChild(opt);
    return;
  }
  list.forEach(c=>{
    const opt = document.createElement('option'); opt.value=c.id; opt.textContent=c.name;
    dropdown.appendChild(opt);
  });
  const active = getCookie('activeCommunity');
  if (active && list.find(x=>x.id===active)) dropdown.value = active;
}

// Create community modal
createCommunityBtn.addEventListener('click', ()=>{
  createInput.value = '';
  createPopup.classList.remove('hidden');
  createInput.focus();
});
createCancel.addEventListener('click', ()=>createPopup.classList.add('hidden'));
createSubmit.addEventListener('click', async ()=>{
  const name = createInput.value.trim();
  if (!name) return alert('Enter community name');
  await fetchJson('/api/communities.js', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({name}) });
  createPopup.classList.add('hidden');
  await loadCommunities();
  alert('Community created!');
});

// Join via code
joinBtn.addEventListener('click', async ()=>{
  const code = joinInput.value.trim();
  if (!code) return alert('Enter join code');
  await fetchJson('/api/communities.js', { method:'PATCH', headers:{'Content-Type':'application/json'}, body:JSON.stringify({join_code: code}) });
  joinInput.value='';
  await loadCommunities();
  alert('Joined community!');
});

// Switch community
dropdown.addEventListener('change', ()=>{
  const id = dropdown.value;
  setCookie('activeCommunity', id);
  loadTrains();
});
refreshBtn.addEventListener('click', async ()=>{ await loadCommunities(); await loadTrains(); });

// --- Invites ---
async function loadInvites() {
  const data = await fetchJson('/api/invites.js');
  invitesContainer.innerHTML='';
  (data||[]).forEach(inv=>{
    const el = document.createElement('div'); el.className='invite-item';
    el.innerHTML=`<div>${inv.groups.name}</div><div>
      <button class="btn small accept" data-group="${inv.group_id}">Accept</button>
      <button class="btn small bg-red-600" data-group="${inv.group_id}">Deny</button>
    </div>`;
    invitesContainer.appendChild(el);
  });
  invitesContainer.querySelectorAll('.accept').forEach(b=>{
    b.addEventListener('click', async ()=>{
      await fetchJson('/api/invites.js', { method:'PATCH', headers:{'Content-Type':'application/json'}, body:JSON.stringify({group_id:b.dataset.group,accept:true}) });
      await loadInvites(); await loadCommunities();
    });
  });
}

// --- Trains ---
async function loadTrains() {
  const active = getCookie('activeCommunity');
  trainsBody.innerHTML='';
  if (!active) { trainsBody.innerHTML='<tr><td colspan="6">Select a community</td></tr>'; return; }
  const rows = await fetchJson(`/api/trains.js?community_id=${active}`);
  (rows||[]).forEach(t=>{
    const tr = document.createElement('tr');
    const crew = (t.assignments||[]).map(a=>`${a.assignment_role}: ${a.username||'Unknown'}`).join(', ');
    tr.innerHTML=`<td>${t.code}</td><td>${t.description||''}</td><td>${t.direction||''}</td><td>${t.yard||''}</td><td>${crew}</td><td></td>`;
    
    // View crew
    const viewBtn=document.createElement('button'); viewBtn.textContent='View Crew'; viewBtn.className='btn small';
    viewBtn.addEventListener('click', ()=>showTrainCrew(t));
    tr.cells[5].appendChild(viewBtn);

    // Claim engineer
    const claimBtn=document.createElement('button'); claimBtn.textContent='Claim (E)'; claimBtn.className='btn small ml-2';
    claimBtn.addEventListener('click', async ()=>{
      await fetchJson('/api/trains.js', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({action:'claim',train_id:t.id,role:'E'}) });
      await loadTrains();
    });
    tr.cells[5].appendChild(claimBtn);

    trainsBody.appendChild(tr);
  });
}

// Train popup
function showTrainCrew(t) {
  popupTitle.textContent=`${t.code} Crew`;
  popupList.innerHTML='';
  (t.assignments||[]).forEach(a=>{
    const d=document.createElement('div'); d.textContent=`${a.assignment_role}: ${a.username||'Unknown'}`; popupList.appendChild(d);
  });
  trainPopup.classList.remove('hidden');
}
closePopup.addEventListener('click', ()=>trainPopup.classList.add('hidden'));

// Logout
logoutBtn.addEventListener('click', async ()=>{
  await supabase.auth.signOut();
  clearCookie('sb-access-token'); clearCookie('sb-refresh-token'); clearCookie('activeCommunity');
  window.location.href='/';
});

// Boot
(async ()=>{ await loadDashboard(); })();
