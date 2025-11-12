import { supabase } from './supabaseClient.js';

// --- ELEMENTS ---
const dropdown = document.getElementById('community-dropdown');
const refreshBtn = document.getElementById('refresh-communities');
const joinBtn = document.getElementById('join-community');
const joinInput = document.getElementById('join-code-input');
const logoutBtn = document.getElementById('logout-btn');
const createCommunityBtn = document.getElementById('create-community');
const invitesContainer = document.getElementById('invites-container');
const trainsBody = document.getElementById('trains-body');
const userInfo = document.getElementById('user-info');
const popup = document.getElementById('train-popup');
const popupTitle = document.getElementById('popup-title');
const popupList = document.getElementById('train-crew-list');
const closePopup = document.getElementById('close-popup');

// --- COOKIE HELPERS ---
function setCookie(name, value, days = 7) {
  const expires = new Date(Date.now() + days*864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
}
function getCookie(name) {
  const v = document.cookie.split('; ').find(r => r.startsWith(name + '='));
  return v ? decodeURIComponent(v.split('=')[1]) : null;
}
function clearCookie(name) { document.cookie = `${name}=; Max-Age=0; path=/`; }

// --- FETCH JSON ---
async function fetchJson(url, opts = {}) {
  const res = await fetch(url, { credentials: 'include', ...opts });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Error ${res.status}: ${text}`);
  }
  return res.json();
}

// --- SESSION ---
async function getSession() {
  const { data } = await supabase.auth.getSession();
  return data.session?.user || null;
}

async function loadSession() {
  const user = await getSession();
  if (!user) return window.location.href = '/'; // redirect if no session
  if (userInfo) userInfo.textContent = user.email || user.user_metadata?.name || user.id;
  return user;
}

// --- COMMUNITIES ---
async function loadCommunities() {
  const list = await fetchJson('/api/communities.js');
  if (!dropdown) return;
  dropdown.innerHTML = '';

  if (!list || list.length === 0) {
    const opt = document.createElement('option');
    opt.textContent = 'No communities';
    opt.disabled = true;
    dropdown.appendChild(opt);
    return;
  }

  list.forEach(g => {
    const opt = document.createElement('option');
    opt.value = g.id;
    opt.textContent = g.name;
    dropdown.appendChild(opt);
  });

  const active = getCookie('activeCommunity');
  if (active && list.some(c => c.id === active)) dropdown.value = active;
}

// --- INVITES ---
async function loadInvites() {
  if (!invitesContainer) return;
  const data = await fetchJson('/api/invites.js');
  invitesContainer.innerHTML = '';
  (data || []).forEach(inv => {
    const div = document.createElement('div');
    div.className = 'invite-item';
    div.innerHTML = `
      <div>${inv.groups.name}</div>
      <div>
        <button class="btn accept" data-group="${inv.group_id}">Accept</button>
        <button class="btn deny" data-group="${inv.group_id}">Deny</button>
      </div>
    `;
    invitesContainer.appendChild(div);
  });

  invitesContainer.querySelectorAll('.accept').forEach(b => {
    b.addEventListener('click', async () => {
      await fetchJson('/api/invites.js', {
        method: 'PATCH',
        body: JSON.stringify({ group_id: b.dataset.group, accept: true })
      });
      await loadInvites();
      await loadCommunities();
    });
  });
  invitesContainer.querySelectorAll('.deny').forEach(b => {
    b.addEventListener('click', async () => {
      await fetchJson('/api/invites.js', {
        method: 'PATCH',
        body: JSON.stringify({ group_id: b.dataset.group, accept: false })
      });
      await loadInvites();
    });
  });
}

// --- TRAINS ---
async function loadTrains() {
  if (!trainsBody) return;
  const active = getCookie('activeCommunity');
  trainsBody.innerHTML = '';
  if (!active) {
    trainsBody.innerHTML = '<tr><td colspan="6">Pick a community to view trains</td></tr>';
    return;
  }
  const rows = await fetchJson(`/api/trains.js?community_id=${active}`);
  (rows || []).forEach(t => {
    const tr = document.createElement('tr');
    const crew = (t.assignments || []).map(a => `${a.assignment_role}: ${a.username || a.email || 'Unknown'}`).join(', ');
    tr.innerHTML = `<td>${t.code}</td><td>${t.description || ''}</td><td>${t.direction || ''}</td><td>${t.yard || ''}</td><td>${crew}</td><td></td>`;
    
    const viewBtn = document.createElement('button');
    viewBtn.textContent = 'View Crew';
    viewBtn.className = 'btn';
    viewBtn.addEventListener('click', () => showTrainCrew(t));
    tr.cells[5].appendChild(viewBtn);

    trainsBody.appendChild(tr);
  });
}

function showTrainCrew(t) {
  if (!popup || !popupTitle || !popupList) return;
  popupTitle.textContent = `${t.code} Crew`;
  popupList.innerHTML = '';
  (t.assignments || []).forEach(a => {
    const d = document.createElement('div');
    d.textContent = `${a.assignment_role}: ${a.username || a.email || 'Unknown'}`;
    popupList.appendChild(d);
  });
  popup.classList.remove('hidden');
}

if (closePopup) closePopup.addEventListener('click', () => popup?.classList.add('hidden'));

// --- EVENTS ---
if (joinBtn) joinBtn.addEventListener('click', async () => {
  const code = joinInput.value.trim();
  if (!code) return alert('Enter join code');
  await fetchJson('/api/communities.js', { method: 'PATCH', body: JSON.stringify({ join_code: code }) });
  joinInput.value = '';
  await loadCommunities();
});

if (dropdown) dropdown.addEventListener('change', async () => {
  const id = dropdown.value;
  setCookie('activeCommunity', id);
  await loadTrains();
});

if (refreshBtn) refreshBtn.addEventListener('click', async () => {
  await loadCommunities();
  await loadTrains();
});

if (createCommunityBtn) createCommunityBtn.addEventListener('click', async () => {
  const name = prompt('Community Name:');
  if (!name) return;
  await fetchJson('/api/communities.js', { method: 'POST', body: JSON.stringify({ name }) });
  await loadCommunities();
});

if (logoutBtn) logoutBtn.addEventListener('click', async () => {
  await supabase.auth.signOut();
  ['user_id','activeCommunity','sb-access-token','sb-refresh-token'].forEach(clearCookie);
  window.location.href = '/';
});

// --- INIT ---
(async () => {
  try {
    await loadSession();
    await loadCommunities();
    await loadInvites();
    await loadTrains();
  } catch(e) {
    console.error('Dashboard init error:', e);
  }
})();
