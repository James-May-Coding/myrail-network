import { supabase } from './supabaseClient.js';

// DOM Elements
const communitiesContainer = document.getElementById('communities-container');
const invitesContainer = document.getElementById('invites-container');
const trainsBody = document.getElementById('trains-body');
const createCommunityBtn = document.getElementById('create-community');

const popup = document.getElementById('train-popup');
const crewList = document.getElementById('train-crew-list');
const closePopupBtn = document.getElementById('close-popup');
const logoutBtn = document.getElementById('logout');

// ----------------------
// Utility Functions
// ----------------------
function getUserFromCookie() {
  const cookieString = document.cookie
    .split('; ')
    .find(row => row.startsWith('session='));
  if (!cookieString) return null;

  try {
    return JSON.parse(decodeURIComponent(cookieString.split('=')[1]));
  } catch (err) {
    console.error('Failed to parse session cookie:', err);
    return null;
  }
}

async function fetchJson(url, options = {}) {
  const res = await fetch(url, options);
  if (!res.ok) throw new Error(`API error ${url} ${res.status}`);
  return res.json();
}

// ----------------------
// Load Session
// ----------------------
const user = getUserFromCookie();
if (!user) window.location.href = '/index.html';

// Headers with user id
const headers = {
  'Content-Type': 'application/json',
  'x-user-id': user.id
};

// ----------------------
// Invites
// ----------------------
async function loadInvites() {
  const invites = await fetchJson('/api/invites', { headers });
  invitesContainer.innerHTML = '';

  invites.forEach(inv => {
    const div = document.createElement('div');
    div.classList.add('invite-item', 'p-2', 'bg-yellow-100', 'rounded', 'mb-1', 'flex', 'justify-between');
    div.innerHTML = `
      <span>${inv.groups.name}</span>
      <div>
        <button data-id="${inv.group_id}" class="accept-btn px-2 py-1 bg-green-600 text-white rounded">Accept</button>
        <button data-id="${inv.group_id}" class="deny-btn px-2 py-1 bg-red-600 text-white rounded">Deny</button>
      </div>
    `;
    invitesContainer.appendChild(div);
  });

  document.querySelectorAll('.accept-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      await fetchJson('/api/invites', {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ group_id: btn.dataset.id, accept: true })
      });
      await loadInvites();
      await loadCommunities();
    });
  });

  document.querySelectorAll('.deny-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      await fetchJson('/api/invites', {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ group_id: btn.dataset.id, accept: false })
      });
      await loadInvites();
    });
  });
}

// ----------------------
// Communities
// ----------------------
async function loadCommunities() {
  const communities = await fetchJson('/api/communities', { headers });
  communitiesContainer.innerHTML = '';

  communities.forEach(c => {
    const div = document.createElement('div');
    div.textContent = c.name;
    div.classList.add('p-2', 'bg-blue-100', 'rounded', 'mb-1');
    communitiesContainer.appendChild(div);
  });
}

// ----------------------
// Trains
// ----------------------
async function loadTrains() {
  const trains = await fetchJson('/api/trains', { headers });
  trainsBody.innerHTML = '';

  trains.forEach(t => {
    const tr = document.createElement('tr');
    tr.trainData = t;
    tr.innerHTML = `
      <td class="p-2">${t.code}</td>
      <td class="p-2">${t.description || ''}</td>
      <td class="p-2">${t.direction || ''}</td>
      <td class="p-2">${t.yard || ''}</td>
      <td class="p-2">${t.assignments.map(a => a.assignment_role + ': ' + (a.username || 'Unknown')).join(', ')}</td>
      <td class="p-2"></td>
    `;
    const btn = document.createElement('button');
    btn.textContent = 'View Crew';
    btn.className = 'px-2 py-1 bg-blue-600 text-white rounded';
    btn.addEventListener('click', () => showTrainCrew(t));
    tr.cells[5].appendChild(btn);
    trainsBody.appendChild(tr);
  });
}

// ----------------------
// Popup: Train Crew
// ----------------------
function showTrainCrew(train) {
  crewList.innerHTML = '';
  train.assignments.forEach(a => {
    const div = document.createElement('div');
    div.textContent = `${a.assignment_role}: ${a.username || 'Unknown'}`;
    crewList.appendChild(div);
  });
  popup.classList.remove('hidden');
}

closePopupBtn.addEventListener('click', () => popup.classList.add('hidden'));

// ----------------------
// Create Community
// ----------------------
createCommunityBtn.addEventListener('click', async () => {
  const name = prompt('Community Name:');
  if (!name) return;
  await fetchJson('/api/communities', {
    method: 'POST',
    headers,
    body: JSON.stringify({ name })
  });
  await loadCommunities();
});

// ----------------------
// Logout
// ----------------------
logoutBtn.addEventListener('click', () => {
  document.cookie = 'session=;path=/;expires=Thu, 01 Jan 1970 00:00:00 UTC';
  window.location.href = '/index.html';
});

// ----------------------
// Initial Load + Real-time polling
// ----------------------
(async () => {
  await loadInvites();
  await loadCommunities();
  await loadTrains();

  setInterval(async () => {
    await loadInvites();
    await loadCommunities();
    await loadTrains();
  }, 5000);
})();
