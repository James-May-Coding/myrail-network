// dashboard.js
import { supabase } from './supabaseClient.js';

document.addEventListener('DOMContentLoaded', async () => {

  // ---------------- DOM ELEMENTS ----------------
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

  // ---------------- HELPERS ----------------
  const setCookie = (name, value, days = 7) => {
    const expires = new Date(Date.now() + days * 864e5).toUTCString();
    document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax;`;
  };
  const getCookie = (name) => {
    const v = document.cookie.split('; ').find(r => r.startsWith(name + '='));
    return v ? decodeURIComponent(v.split('=')[1]) : null;
  };
  const clearCookie = (name) => { document.cookie = `${name}=; Max-Age=0; path=/`; };
  const fetchJson = async (url, opts = {}) => {
    const res = await fetch(url, { credentials: 'include', ...opts });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  };

  // ---------------- SESSION ----------------
  async function loadSession() {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) throw error;
    if (!session || !session.user) {
      window.location.href = '/';
      return null;
    }
    return session.user;
  }

  const user = await loadSession();
  userInfo.textContent = user.email || user.user_metadata?.name || user.id;

  // ---------------- COMMUNITIES ----------------
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
    list.forEach(g => {
      const opt = document.createElement('option');
      opt.value = g.id;
      opt.textContent = g.name;
      dropdown.appendChild(opt);
    });
    const active = getCookie('activeCommunity');
    if (active && list.find(x => x.id === active)) dropdown.value = active;
  }

  dropdown.addEventListener('change', async () => {
    const id = dropdown.value;
    setCookie('activeCommunity', id);
    await loadTrainsForActiveCommunity();
  });

  joinBtn.addEventListener('click', async () => {
    const code = joinInput.value.trim();
    if (!code) return alert('Enter join code');
    await fetchJson('/api/communities.js', {
      method: 'PATCH',
      body: JSON.stringify({ join_code: code })
    });
    joinInput.value = '';
    await loadCommunities();
    alert('Joined new community!');
  });

  createCommunityBtn.addEventListener('click', async () => {
    const name = prompt('Community name');
    if (!name) return;
    await fetchJson('/api/communities.js', {
      method: 'POST',
      body: JSON.stringify({ name })
    });
    await loadCommunities();
  });

  refreshBtn.addEventListener('click', async () => {
    await loadCommunities();
    await loadTrainsForActiveCommunity();
  });

  // ---------------- INVITES ----------------
  async function loadInvites() {
    const data = await fetchJson('/api/invites.js');
    invitesContainer.innerHTML = '';
    (data || []).forEach(inv => {
      const el = document.createElement('div');
      el.className = 'invite-item';
      el.innerHTML = `<div>${inv.groups.name}</div>
        <div>
          <button class="btn small accept" data-group="${inv.group_id}">Accept</button>
          <button class="btn small deny" data-group="${inv.group_id}">Deny</button>
        </div>`;
      invitesContainer.appendChild(el);
    });
    invitesContainer.querySelectorAll('.accept').forEach(b => {
      b.addEventListener('click', async () => {
        await fetchJson('/api/invites.js', { method: 'PATCH', body: JSON.stringify({ group_id: b.dataset.group, accept: true }) });
        await loadInvites();
        await loadCommunities();
      });
    });
    invitesContainer.querySelectorAll('.deny').forEach(b => {
      b.addEventListener('click', async () => {
        await fetchJson('/api/invites.js', { method: 'PATCH', body: JSON.stringify({ group_id: b.dataset.group, accept: false }) });
        await loadInvites();
      });
    });
  }

  // ---------------- TRAINS ----------------
  async function loadTrainsForActiveCommunity() {
    const active = getCookie('activeCommunity');
    trainsBody.innerHTML = '';
    if (!active) {
      trainsBody.innerHTML = `<tr><td colspan="6">Pick a community to view trains</td></tr>`;
      return;
    }
    const rows = await fetchJson(`/api/trains.js?community_id=${active}`);
    (rows || []).forEach(t => {
      const tr = document.createElement('tr');
      const crew = (t.assignments || []).map(a => `${a.assignment_role}: ${a.username || a.email || 'Unknown'}`).join(', ');
      tr.innerHTML = `<td>${t.code}</td><td>${t.description || ''}</td><td>${t.direction || ''}</td><td>${t.yard || ''}</td><td>${crew}</td><td></td>`;
      // view crew
      const viewBtn = document.createElement('button'); viewBtn.textContent = 'View Crew'; viewBtn.className = 'btn small';
      viewBtn.addEventListener('click', () => showTrainCrew(t));
      tr.cells[5].appendChild(viewBtn);
      trainsBody.appendChild(tr);
    });
  }

  function showTrainCrew(t) {
    popupTitle.textContent = `${t.code} Crew`;
    popupList.innerHTML = '';
    (t.assignments || []).forEach(a => {
      const d = document.createElement('div');
      d.textContent = `${a.assignment_role}: ${a.username || a.email || 'Unknown'}`;
      popupList.appendChild(d);
    });
    popup.classList.remove('hidden');
  }
  closePopup.addEventListener('click', () => popup.classList.add('hidden'));

  // ---------------- LOGOUT ----------------
  logoutBtn.addEventListener('click', async () => {
    await supabase.auth.signOut();
    clearCookie('sb-access-token'); clearCookie('sb-refresh-token'); clearCookie('user_id'); clearCookie('activeCommunity');
    window.location.href = '/';
  });

  // ---------------- BOOT ----------------
  await loadCommunities();
  await loadInvites();
  await loadTrainsForActiveCommunity();

});
