import { supabase } from './supabaseClient.js';

// Elements
const dropdown = document.getElementById('community-dropdown');
const joinInput = document.getElementById('join-code-input');
const joinBtn = document.getElementById('join-community');
const createBtn = document.getElementById('create-community');
const refreshBtn = document.getElementById('refresh-communities');
const logoutBtn = document.getElementById('logout-btn');
const trainsBody = document.getElementById('trains-body');
const invitesContainer = document.getElementById('invites-container');
const userInfo = document.getElementById('user-info');

// Cookies
function getCookie(name) {
  return document.cookie.split('; ').find(r => r.startsWith(name+'='))?.split('=')[1] || null;
}
function setCookie(name, value) {
  document.cookie = `${name}=${value}; path=/; SameSite=Lax`;
}
function clearCookie(name) {
  document.cookie = `${name}=; Max-Age=0; path=/`;
}

// Fetch helper
async function fetchJson(url, options={}) {
  const res = await fetch(url, { credentials: 'include', ...options });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// Session
async function loadSession() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session || !session.user) window.location.href = '/';
  userInfo.textContent = session.user.email || session.user.user_metadata?.name;
  return session.user;
}

// Communities
async function loadCommunities() {
  const list = await fetchJson('/api/communities.js');
  dropdown.innerHTML = '';
  if (!list || list.length === 0) {
    const opt = document.createElement('option');
    opt.textContent = 'No communities';
    opt.disabled = true;
    dropdown.appendChild(opt);
    return;
  }
  list.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c.id;
    opt.textContent = c.name;
    dropdown.appendChild(opt);
  });
  const active = getCookie('activeCommunity');
  if (active && list.find(x=>x.id===active)) dropdown.value = active;
}

// Join
joinBtn.addEventListener('click', async () => {
  const code = joinInput.value.trim();
  if (!code) return alert('Enter code');
  await fetchJson('/api/communities.js', { 
    method:'PATCH', 
    body: JSON.stringify({ join_code: code })
  });
  joinInput.value = '';
  await loadCommunities();
  alert('Joined community!');
});

// Create
createBtn.addEventListener('click', async () => {
  const name = prompt('Community Name');
  if (!name) return;
  await fetchJson('/api/communities.js', {
    method: 'POST',
    body: JSON.stringify({ name })
  });
  await loadCommunities();
  alert('Community created!');
});

// Switch active community
dropdown.addEventListener('change', () => {
  setCookie('activeCommunity', dropdown.value);
  loadTrains();
});

// Refresh
refreshBtn.addEventListener('click', async () => {
  await loadCommunities();
  await loadTrains();
});

// Trains
async function loadTrains() {
  const community_id = getCookie('activeCommunity');
  trainsBody.innerHTML = '';
  if (!community_id) {
    trainsBody.innerHTML = '<tr><td colspan="6">Pick a community</td></tr>';
    return;
  }
  const trains = await fetchJson(`/api/trains.js?community_id=${community_id}`);
  trains.forEach(t => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${t.code}</td><td>${t.description||''}</td><td>${t.direction||''}</td><td>${t.yard||''}</td><td>${t.assignments.map(a=>`${a.assignment_role}: ${a.username||'Unknown'}`).join(', ')}</td><td></td>`;
    const btn = document.createElement('button');
    btn.textContent = 'View Crew';
    btn.className = 'btn';
    btn.addEventListener('click', ()=>alert(JSON.stringify(t.assignments)));
    tr.cells[5].appendChild(btn);
    trainsBody.appendChild(tr);
  });
}

// Invites
async function loadInvites() {
  const data = await fetchJson('/api/invites.js');
  invitesContainer.innerHTML = '';
  (data || []).forEach(inv => {
    const el = document.createElement('div');
    el.innerHTML = `<span>${inv.groups.name}</span><button class="accept" data-id="${inv.group_id}">Accept</button>`;
    invitesContainer.appendChild(el);
    el.querySelector('.accept').addEventListener('click', async ()=> {
      await fetchJson('/api/invites.js', { method:'PATCH', body:JSON.stringify({ group_id: inv.group_id, accept:true }) });
      await loadInvites();
      await loadCommunities();
    });
  });
}

// Logout
logoutBtn.addEventListener('click', async ()=>{
  await supabase.auth.signOut();
  clearCookie('activeCommunity');
  window.location.href = '/';
});

// Boot
(async ()=>{
  await loadSession();
  await loadCommunities();
  await loadTrains();
  await loadInvites();
})();
