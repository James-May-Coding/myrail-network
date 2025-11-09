import { supabase } from './supabaseClient.js';

const communitiesContainer = document.getElementById('communities-container');
const invitesContainer = document.getElementById('invites-container');
const trainsBody = document.getElementById('trains-body');
const createCommunityBtn = document.getElementById('create-community');

const popup = document.getElementById('train-popup');
const crewList = document.getElementById('train-crew-list');
const closePopupBtn = document.getElementById('close-popup');

// Utility to fetch JSON with error handling
async function fetchJson(url, options = {}) {
  const res = await fetch(url, options);
  if (!res.ok) throw new Error(`API error ${url} ${res.status}`);
  return res.json();
}

// Load user session from cookie
async function loadSession() {
  const { user } = await fetchJson('/api/session');
  if (!user) window.location.href = '/index.html';
  return user;
}

// Load invites for current user
async function loadInvites() {
  const invites = await fetchJson('/api/invites');
  invitesContainer.innerHTML = '';
  invites.forEach(inv => {
    const div = document.createElement('div');
    div.className = 'invite-item p-2 bg-yellow-100 rounded mb-1 flex justify-between';
    div.innerHTML = `
      <span>${inv.group_name}</span>
      <div>
        <button data-id="${inv.group_id}" class="accept-btn px-2 py-1 bg-green-600 text-white rounded">Accept</button>
        <button data-id="${inv.group_id}" class="deny-btn px-2 py-1 bg-red-600 text-white rounded">Deny</button>
      </div>
    `;
    invitesContainer.appendChild(div);
  });

  // Accept / Deny buttons
  document.querySelectorAll('.accept-btn').forEach(btn =>
    btn.addEventListener('click', async () => {
      await fetchJson('/api/invites', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ group_id: btn.dataset.id, accept: true })
      });
      await loadInvites();
      await loadCommunities();
    })
  );

  document.querySelectorAll('.deny-btn').forEach(btn =>
    btn.addEventListener('click', async () => {
      await fetchJson('/api/invites', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ group_id: btn.dataset.id, accept: false })
      });
      await loadInvites();
    })
  );
}

// Load communities user is part of
async function loadCommunities() {
  const communities = await fetchJson('/api/communities');
  communitiesContainer.innerHTML = '';
  communities.forEach(c => {
    const div = document.createElement('div');
    div.textContent = c.name;
    div.className = 'p-2 bg-blue-100 rounded mb-1';
    communitiesContainer.appendChild(div);
  });
}

// Load trains for communities user is in
async function loadTrains() {
  const trains = await fetchJson('/api/trains');
  trainsBody.innerHTML = '';
  trains.forEach(train => {
    const tr = document.createElement('tr');
    tr.trainData = train;
    tr.innerHTML = `
      <td class="p-2">${train.code}</td>
      <td class="p-2">${train.description || ''}</td>
      <td class="p-2">${train.direction || ''}</td>
      <td class="p-2">${train.yard || ''}</td>
      <td class="p-2">${train.assignments.map(a => a.assignment_role + ': ' + (a.username || 'Unknown')).join(', ')}</td>
      <td class="p-2"></td>
    `;
    const btn = document.createElement('button');
    btn.textContent = 'View Crew';
    btn.className = 'px-2 py-1 bg-blue-600 text-white rounded';
    btn.addEventListener('click', () => showTrainCrew(train));
    tr.cells[5].appendChild(btn);

    // Join train button for staff
    const joinBtn = document.createElement('button');
    joinBtn.textContent = 'Join Train';
    joinBtn.className = 'ml-2 px-2 py-1 bg-green-600 text-white rounded';
    joinBtn.addEventListener('click', async () => {
      await fetchJson('/api/trains', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ train_id: train.id })
      });
      await loadTrains();
    });
    tr.cells[5].appendChild(joinBtn);

    trainsBody.appendChild(tr);
  });
}

// Show popup with train crew
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

// Create new community
createCommunityBtn.addEventListener('click', async () => {
  const name = prompt('Community Name:');
  if (!name) return;
  await fetchJson('/api/communities', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name })
  });
  await loadCommunities();
});

// Logout
document.getElementById('logout').addEventListener('click', () => {
  document.cookie = 'session=;path=/;expires=Thu, 01 Jan 1970 00:00:00 UTC';
  window.location.href = '/index.html';
});

// Initial load + polling every 5s
(async () => {
  await loadSession();
  await loadInvites();
  await loadCommunities();
  await loadTrains();

  setInterval(async () => {
    await loadInvites();
    await loadCommunities();
    await loadTrains();
  }, 5000);
})();
