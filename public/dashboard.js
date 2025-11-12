// dashboard.js
import { supabase } from './supabaseClient.js';

// ====== ELEMENTS ======
const dropdown = document.getElementById('community-dropdown');
const refreshBtn = document.getElementById('refresh-communities');
const joinBtn = document.getElementById('join-community');
const joinInput = document.getElementById('join-code-input');
const logoutBtn = document.getElementById('logout-btn');
const createBtn = document.getElementById('create-community');
const invitesContainer = document.getElementById('invites-container');
const trainsBody = document.getElementById('trains-body');
const userInfo = document.getElementById('user-info');

// Popup UI for creating communities
const popup = document.createElement('div');
popup.className = 'popup hidden';
popup.innerHTML = `
  <div class="popup-content">
    <h2>Create Community</h2>
    <input id="community-name" type="text" placeholder="Community name" class="input"/>
    <div class="popup-buttons">
      <button id="create-confirm" class="btn">Create</button>
      <button id="create-cancel" class="btn red">Cancel</button>
    </div>
  </div>
`;
document.body.appendChild(popup);

function showPopup() { popup.classList.remove('hidden'); }
function hidePopup() { popup.classList.add('hidden'); }

popup.querySelector('#create-cancel').addEventListener('click', hidePopup);
popup.querySelector('#create-confirm').addEventListener('click', async () => {
  const name = document.getElementById('community-name').value.trim();
  if (!name) return alert('Enter a name');
  await fetchJson('/api/communities.js', { method: 'POST', body: JSON.stringify({ name }) });
  hidePopup();
  await loadCommunities();
});

// ====== HELPERS ======
function setCookie(n, v, days = 7) {
  const exp = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${n}=${encodeURIComponent(v)}; expires=${exp}; path=/`;
}
function getCookie(n) {
  const v = document.cookie.split('; ').find(r => r.startsWith(n + '='));
  return v ? decodeURIComponent(v.split('=')[1]) : null;
}
function clearCookie(n) {
  document.cookie = `${n}=; Max-Age=0; path=/`;
}

async function fetchJson(url, opts = {}) {
  const res = await fetch(url, { credentials: 'include', ...opts });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// ====== SESSION ======
async function getSession() {
  let { data: { session } } = await supabase.auth.getSession();
  if (session?.user) return session.user;

  return new Promise(resolve => {
    const unsub = supabase.auth.onAuthStateChange((event, sess) => {
      if (sess?.user) {
        unsub?.data?.subscription?.unsubscribe?.();
        resolve(sess.user);
      }
    });
    setTimeout(async () => {
      unsub?.data?.subscription?.unsubscribe?.();
      try {
        const server = await fetchJson('/api/session.js');
        resolve(server.user || null);
      } catch {
        resolve(null);
      }
    }, 4000);
  });
}

async function boot() {
  const user = await getSession();
  if (!user) return (window.location.href = '/');
  userInfo.textContent = user.email || user.user_metadata?.name || 'Unknown';
  await loadCommunities();
  await loadInvites();
  await loadTrains();
}

// ====== LOADERS ======
async function loadCommunities() {
  const list = await fetchJson('/api/communities.js');
  dropdown.innerHTML = '';
  if (!list?.length) {
    const opt = document.createElement('option');
    opt.textContent = 'No communities found';
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
  if (active && list.some(x => x.id === active)) dropdown.value = active;
}

async function loadInvites() {
  const invites = await fetchJson('/api/invites.js');
  invitesContainer.innerHTML = '';
  if (!invites?.length) {
    invitesContainer.innerHTML = '<div class="dim">No invites</div>';
    return;
  }
  invites.forEach(inv => {
    const el = document.createElement('div');
    el.className = 'invite-item';
    el.innerHTML = `
      <div>${inv.groups.name}</div>
      <div>
        <button class="btn small accept" data-id="${inv.group_id}">Accept</button>
        <button class="btn small red deny" data-id="${inv.group_id}">Deny</button>
      </div>
    `;
    invitesContainer.appendChild(el);
  });

  invitesContainer.querySelectorAll('.accept').forEach(b => {
    b.onclick = async () => {
      await fetchJson('/api/invites.js', {
        method: 'PATCH',
        body: JSON.stringify({ group_id: b.dataset.id, accept: true }),
      });
      await loadInvites();
      await loadCommunities();
    };
  });
  invitesContainer.querySelectorAll('.deny').forEach(b => {
    b.onclick = async () => {
      await fetchJson('/api/invites.js', {
        method: 'PATCH',
        body: JSON.stringify({ group_id: b.dataset.id, accept: false }),
      });
      await loadInvites();
    };
  });
}

async function loadTrains() {
  const active = getCookie('activeCommunity');
  trainsBody.innerHTML = '';
  if (!active) {
    trainsBody.innerHTML = '<tr><td colspan="5">Select a community</td></tr>';
    return;
  }
  const rows = await fetchJson(`/api/trains.js?community_id=${active}`);
  if (!rows.length) {
    trainsBody.innerHTML = '<tr><td colspan="5">No trains found</td></tr>';
    return;
  }

  rows.forEach(t => {
    const tr = document.createElement('tr');
    const crew = (t.assignments || [])
      .map(a => `${a.assignment_role}: ${a.username || 'Unknown'}`)
      .join(', ');
    tr.innerHTML = `
      <td>${t.code}</td>
      <td>${t.description || ''}</td>
      <td>${t.direction || ''}</td>
      <td>${crew}</td>
      <td><button class="btn small claim" data-id="${t.id}">Claim (E)</button></td>
    `;
    trainsBody.appendChild(tr);
  });

  trainsBody.querySelectorAll('.claim').forEach(b => {
    b.onclick = async () => {
      await fetchJson('/api/trains.js', {
        method: 'POST',
        body: JSON.stringify({ action: 'claim', train_id: b.dataset.id, role: 'E' }),
      });
      await loadTrains();
    };
  });
}

// ====== EVENTS ======
dropdown.addEventListener('change', () => {
  setCookie('activeCommunity', dropdown.value);
  loadTrains();
});
refreshBtn.onclick = () => { loadCommunities(); loadTrains(); };
createBtn.onclick = showPopup;

joinBtn.onclick = async () => {
  const code = joinInput.value.trim();
  if (!code) return alert('Enter join code');
  await fetchJson('/api/communities.js', {
    method: 'PATCH',
    body: JSON.stringify({ join_code: code }),
  });
  joinInput.value = '';
  await loadCommunities();
  alert('Joined successfully');
};

logoutBtn.onclick = async () => {
  await supabase.auth.signOut();
  ['sb-access-token','sb-refresh-token','user_id','activeCommunity']
    .forEach(clearCookie);
  window.location.href = '/';
};

// ====== INIT ======
boot();
