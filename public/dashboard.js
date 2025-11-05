// --- Dashboard.js for Vercel + API routes ---
let currentUser = null;

// --- Load Discord session ---
async function loadSession() {
  const res = await fetch('/api/auth/session');
  const data = await res.json();
  if (!data.user) window.location.href = '/index.html';
  currentUser = data.user;
}
await loadSession();

// --- ---------------- Pending Invites ---------------- ---
async function loadInvites() {
  const res = await fetch('/api/invites', {
    headers: { 'x-user-id': currentUser.id }
  });
  const invites = await res.json();
  const container = document.getElementById('invites-container');
  container.innerHTML = '';

  invites.forEach(invite => {
    const div = document.createElement('div');
    div.classList.add('card');
    div.innerHTML = `
      <img src="${invite.communities.pfp}" />
      <span>${invite.communities.name}</span>
      <div>
        <button class="btn btn-accept" data-id="${invite.id}">Accept</button>
        <button class="btn btn-deny" data-id="${invite.id}">Deny</button>
      </div>
    `;
    container.appendChild(div);
  });

  document.querySelectorAll('.btn-accept').forEach(btn =>
    btn.addEventListener('click', async e => {
      const id = e.target.dataset.id;
      await fetch('/api/invites', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-user-id': currentUser.id },
        body: JSON.stringify({ id, status: 'accepted' })
      });
      await loadInvites();
      await loadCommunities();
    })
  );

  document.querySelectorAll('.btn-deny').forEach(btn =>
    btn.addEventListener('click', async e => {
      const id = e.target.dataset.id;
      await fetch('/api/invites', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-user-id': currentUser.id },
        body: JSON.stringify({ id, status: 'denied' })
      });
      await loadInvites();
    })
  );
}

// --- ---------------- Communities ---------------- ---
async function loadCommunities() {
  const res = await fetch('/api/communities', {
    headers: { 'x-user-id': currentUser.id, 'x-user-role': currentUser.role }
  });
  const communities = await res.json();
  const container = document.getElementById('communities-container');
  container.innerHTML = '';

  communities.forEach(c => {
    const div = document.createElement('div');
    div.classList.add('card');
    div.innerHTML = `
      <img src="${c.communities.pfp}" />
      <span>${c.communities.name} (${c.role})</span>
      ${c.role === 'admin' ? '<button class="btn btn-admin">Admin</button>' : ''}
    `;
    container.appendChild(div);
  });
}

// --- Create new community modal ---
document.getElementById('new-community-btn').addEventListener('click', () => {
  document.getElementById('community-modal').classList.toggle('hidden');
});
document.getElementById('create-community-btn').addEventListener('click', async () => {
  const name = document.getElementById('community-name').value;
  const guild_id = document.getElementById('community-guild').value;
  const pfp = document.getElementById('community-pfp').value;
  if (!name || !guild_id) return alert('Name and Guild ID required');

  await fetch('/api/communities', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-user-id': currentUser.id, 'x-user-role': currentUser.role },
    body: JSON.stringify({ name, guild_id, pfp })
  });

  document.getElementById('community-modal').classList.add('hidden');
  await loadCommunities();
});

// --- ---------------- Trains ---------------- ---
async function fetchTrains() {
  const res = await fetch('/api/trains', {
    headers: { 'x-user-id': currentUser.id, 'x-user-role': currentUser.role }
  });
  return await res.json();
}

async function loadTrains() {
  const trains = await fetchTrains();
  const tbody = document.getElementById('trains-container');
  tbody.innerHTML = '';

  trains.forEach(t => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${t.code}</td>
      <td>${t.route}</td>
      <td>${t.engineer || '-'}</td>
      <td>${t.conductor || '-'}</td>
      <td>${t.status}</td>
      <td>
        ${t.status === 'open' ? `<button class="btn btn-claim" data-id="${t.id}">Claim</button>` : '-'}
        ${currentUser.role === 'admin' ? `<button class="btn btn-admin edit-btn" data-id="${t.id}">Edit</button>` : ''}
      </td>
    `;
    tbody.appendChild(tr);
  });

  // Claim train
  document.querySelectorAll('.btn-claim').forEach(btn =>
    btn.addEventListener('click', async e => {
      const id = e.target.dataset.id;
      await fetch('/api/trains', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-user-id': currentUser.id, 'x-user-role': currentUser.role },
        body: JSON.stringify({ id, updates: { status: 'claimed', engineer: currentUser.username } })
      });
      await loadTrains();
    })
  );

  // Admin edit train
  document.querySelectorAll('.edit-btn').forEach(btn =>
    btn.addEventListener('click', async e => {
      const id = e.target.dataset.id;
      const train = (await fetch('/api/trains', {
        headers: { 'x-user-id': currentUser.id, 'x-user-role': currentUser.role }
      }).then(r => r.json())).find(t => t.id === parseInt(id));

      document.getElementById('train-id').value = train.id;
      document.getElementById('train-code').value = train.code;
      document.getElementById('train-route').value = train.route;
      document.getElementById('train-engineer').value = train.engineer || '';
      document.getElementById('train-conductor').value = train.conductor || '';
      document.getElementById('train-status').value = train.status;
      document.getElementById('train-modal').classList.remove('hidden');
    })
  );
}

// --- Save admin train changes ---
document.getElementById('save-train-btn').addEventListener('click', async () => {
  const id = document.getElementById('train-id').value;
  const updates = {
    code: document.getElementById('train-code').value,
    route: document.getElementById('train-route').value,
    engineer: document.getElementById('train-engineer').value,
    conductor: document.getElementById('train-conductor').value,
    status: document.getElementById('train-status').value
  };

  await fetch('/api/trains', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'x-user-id': currentUser.id, 'x-user-role': currentUser.role },
    body: JSON.stringify({ id, updates })
  });

  document.getElementById('train-modal').classList.add('hidden');
  await loadTrains();
});

// --- Close train modal ---
document.getElementById('close-train-modal').addEventListener('click', () => {
  document.getElementById('train-modal').classList.add('hidden');
});

// --- Initial load ---
loadInvites();
loadCommunities();
loadTrains();
