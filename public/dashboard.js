import { supabase } from './supabaseClient.js';

// DOM Elements
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

// 🧠 Cookie Utilities
function setCookie(name, value, days = 7) {
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax;`;
}
function getCookie(name) {
  const v = document.cookie.split('; ').find(r => r.startsWith(name + '='));
  return v ? decodeURIComponent(v.split('=')[1]) : null;
}
function clearCookie(name) {
  document.cookie = `${name}=; Max-Age=0; path=/;`;
}

// 🔄 Helper for consistent fetch JSON
async function fetchJson(url, opts = {}) {
  const res = await fetch(url, { credentials: 'include', ...opts });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Request failed: ${res.status}`);
  }
  return res.json();
}

// 🕐 Supabase Session Loader (Prevents redirect loops)
async function getActiveSession(timeout = 4000) {
  const start = Date.now();
  let { data: { session } } = await supabase.auth.getSession();
  if (session?.user) return session.user;

  return new Promise(resolve => {
    const unsub = supabase.auth.onAuthStateChange((_, s) => {
      if (s?.user) {
        unsub?.data?.subscription?.unsubscribe?.();
        resolve(s.user);
      }
    });
    setTimeout(async () => {
      unsub?.data?.subscription?.unsubscribe?.();
      try {
        const fallback = await fetchJson('/api/session.js');
        resolve(fallback.user || null);
      } catch {
        resolve(null);
      }
    }, Math.max(1000, timeout - (Date.now() - start)));
  });
}

// 🚀 Boot Sequence
async function initDashboard() {
  const user = await getActiveSession(4500);
  if (!user) {
    console.warn('No Supabase session, redirecting to login...');
    window.location.href = '/';
    return;
  }

  userInfo.textContent = user.email || user.user_metadata?.name || 'User';

  await loadCommunities();
  await loadInvites();
  await loadTrains();
}

// 🏘️ Communities
async function loadCommunities() {
  try {
    const list = await fetchJson('/api/communities.js');
    dropdown.innerHTML = '';

    if (!list?.length) {
      const opt = document.createElement('option');
      opt.textContent = 'No communities joined';
      opt.disabled = true;
      dropdown.appendChild(opt);
      return;
    }

    for (const c of list) {
      const opt = document.createElement('option');
      opt.value = c.id;
      opt.textContent = c.name;
      dropdown.appendChild(opt);
    }

    const active = getCookie('activeCommunity');
    if (active && list.some(c => c.id === active)) dropdown.value = active;

  } catch (err) {
    console.error('Error loading communities:', err);
  }
}

// ✉️ Invites
async function loadInvites() {
  try {
    const invites = await fetchJson('/api/invites.js');
    invitesContainer.innerHTML = '';

    if (!invites?.length) {
      invitesContainer.innerHTML = '<p>No pending invites.</p>';
      return;
    }

    invites.forEach(inv => {
      const item = document.createElement('div');
      item.className = 'invite-item';
      item.innerHTML = `
        <div>${inv.groups?.name || 'Unknown Community'}</div>
        <div>
          <button class="btn small accept" data-id="${inv.group_id}">Accept</button>
          <button class="btn small deny" data-id="${inv.group_id}" style="background:#ef4444">Deny</button>
        </div>
      `;
      invitesContainer.appendChild(item);
    });

    invitesContainer.querySelectorAll('.accept').forEach(btn => {
      btn.addEventListener('click', async () => {
        await fetchJson('/api/invites.js', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ group_id: btn.dataset.id, accept: true })
        });
        await loadInvites();
        await loadCommunities();
      });
    });

    invitesContainer.querySelectorAll('.deny').forEach(btn => {
      btn.addEventListener('click', async () => {
        await fetchJson('/api/invites.js', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ group_id: btn.dataset.id, accept: false })
        });
        await loadInvites();
      });
    });
  } catch (err) {
    console.error('Error loading invites:', err);
  }
}

// 🚂 Trains
async function loadTrains() {
  const communityId = getCookie('activeCommunity');
  trainsBody.innerHTML = '';

  if (!communityId) {
    trainsBody.innerHTML = `<tr><td colspan="6">Select a community to view trains</td></tr>`;
    return;
  }

  try {
    const trains = await fetchJson(`/api/trains.js?community_id=${communityId}`);
    if (!trains?.length) {
      trainsBody.innerHTML = `<tr><td colspan="6">No trains available</td></tr>`;
      return;
    }

    trains.forEach(train => {
      const row = document.createElement('tr');
      const crewList = (train.assignments || [])
        .map(a => `${a.assignment_role}: ${a.username || 'Unknown'}`)
        .join(', ');

      row.innerHTML = `
        <td>${train.code}</td>
        <td>${train.description || ''}</td>
        <td>${train.direction || ''}</td>
        <td>${train.yard || ''}</td>
        <td>${crewList || '—'}</td>
        <td></td>
      `;

      const viewBtn = document.createElement('button');
      viewBtn.textContent = 'View Crew';
      viewBtn.className = 'btn small';
      viewBtn.addEventListener('click', () => showTrainCrew(train));

      const claimBtn = document.createElement('button');
      claimBtn.textContent = 'Claim (Engineer)';
      claimBtn.className = 'btn small';
      claimBtn.style.marginLeft = '8px';
      claimBtn.addEventListener('click', async () => {
        await fetchJson('/api/trains.js', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'claim', train_id: train.id, role: 'Engineer' })
        });
        await loadTrains();
      });

      row.cells[5].append(viewBtn, claimBtn);
      trainsBody.appendChild(row);
    });
  } catch (err) {
    console.error('Error loading trains:', err);
    trainsBody.innerHTML = `<tr><td colspan="6">Error loading trains</td></tr>`;
  }
}

// 👥 Train Crew Popup
function showTrainCrew(train) {
  popupTitle.textContent = `${train.code} Crew`;
  popupList.innerHTML = '';

  if (!train.assignments?.length) {
    popupList.innerHTML = '<p>No crew assigned yet.</p>';
  } else {
    train.assignments.forEach(a => {
      const div = document.createElement('div');
      div.textContent = `${a.assignment_role}: ${a.username || 'Unknown'}`;
      popupList.appendChild(div);
    });
  }

  popup.classList.remove('hidden');
}
closePopup.addEventListener('click', () => popup.classList.add('hidden'));

// ⚙️ UI Actions
joinBtn.addEventListener('click', async () => {
  const code = joinInput.value.trim();
  if (!code) return alert('Enter a join code');
  await fetchJson('/api/communities.js', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ join_code: code })
  });
  joinInput.value = '';
  await loadCommunities();
  alert('Joined successfully!');
});

dropdown.addEventListener('change', async () => {
  setCookie('activeCommunity', dropdown.value);
  await loadTrains();
});

refreshBtn.addEventListener('click', async () => {
  await loadCommunities();
  await loadTrains();
});

createCommunityBtn.addEventListener('click', async () => {
  const name = prompt('Enter community name:');
  if (!name) return;
  await fetchJson('/api/communities.js', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name })
  });
  await loadCommunities();
});

logoutBtn.addEventListener('click', async () => {
  await supabase.auth.signOut();
  ['sb-access-token', 'sb-refresh-token', 'user_id', 'activeCommunity'].forEach(clearCookie);
  window.location.href = '/';
});

// 🧩 Initialize Dashboard
(async () => {
  try {
    await initDashboard();
  } catch (err) {
    console.error('Dashboard init failed:', err);
    window.location.href = '/';
  }
})();
