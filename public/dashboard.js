import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const supabaseUrl = "https://dmjazdpluclinainckit.supabase.co";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

let currentUser = null;

// --- Session ---
async function loadSession() {
  const res = await fetch('/api/auth/session');
  const data = await res.json();
  if (!data.user) window.location.href = '/index.html';
  currentUser = data.user;
  document.getElementById('user-display').innerText = currentUser.username;
}
await loadSession();

// --- Invites ---
async function loadInvites() {
  const res = await fetch('/api/invites', {
    headers: { 'x-user-id': currentUser.id }
  });
  const invites = await res.json();
  const container = document.getElementById('invites-container');
  container.innerHTML = '';

  invites.forEach(invite => {
    const div = document.createElement('div');
    div.classList.add('p-2', 'bg-white', 'rounded', 'flex', 'justify-between', 'items-center');
    div.innerHTML = `
      <div class="flex items-center gap-2">
        <img src="${invite.communities.pfp}" class="w-8 h-8 rounded"/>
        <span>${invite.communities.name}</span>
      </div>
      <div class="flex gap-2">
        <button class="btn-accept bg-green-500 text-white px-2 py-1 rounded" data-id="${invite.id}">Accept</button>
        <button class="btn-deny bg-red-500 text-white px-2 py-1 rounded" data-id="${invite.id}">Deny</button>
      </div>
    `;
    container.appendChild(div);
  });

  document.querySelectorAll('.btn-accept').forEach(btn =>
    btn.addEventListener('click', async e => {
      await fetch('/api/invites', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-user-id': currentUser.id },
        body: JSON.stringify({ id: e.target.dataset.id, status: 'accepted' })
      });
      await loadInvites();
      await loadCommunities();
    })
  );
  document.querySelectorAll('.btn-deny').forEach(btn =>
    btn.addEventListener('click', async e => {
      await fetch('/api/invites', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-user-id': currentUser.id },
        body: JSON.stringify({ id: e.target.dataset.id, status: 'denied' })
      });
      await loadInvites();
    })
  );
}

// --- Communities ---
async function loadCommunities() {
  const res = await fetch('/api/communities', {
    headers: { 'x-user-id': currentUser.id, 'x-user-role': currentUser.role }
  });
  const communities = await res.json();
  const container = document.getElementById('communities-container');
  container.innerHTML = '';
  communities.forEach(c => {
    const div = document.createElement('div');
    div.classList.add('p-2', 'bg-white', 'rounded', 'flex', 'justify-between', 'items-center');
    div.innerHTML = `
      <div class="flex items-center gap-2">
        <img src="${c.communities.pfp}" class="w-8 h-8 rounded"/>
        <span>${c.communities.name} (${c.role})</span>
      </div>
      ${c.role==='admin'?'<button class="btn-admin bg-blue-500 text-white px-2 py-1 rounded">Admin</button>':''}
    `;
    container.appendChild(div);
  });
}

// --- New Community ---
document.getElementById('new-community-btn').addEventListener('click', ()=>document.getElementById('community-modal').classList.toggle('hidden'));
document.getElementById('create-community-btn').addEventListener('click', async () => {
  const name = document.getElementById('community-name').value;
  const guild_id = document.getElementById('community-guild').value;
  const pfp = document.getElementById('community-pfp').value || '';
  if (!name || !guild_id) return alert('Name and Guild ID required');

  await fetch('/api/communities', {
    method:'POST',
    headers:{'Content-Type':'application/json','x-user-id':currentUser.id,'x-user-role':currentUser.role},
    body: JSON.stringify({name,guild_id,pfp})
  });

  document.getElementById('community-modal').classList.add('hidden');
  document.getElementById('community-name').value='';
  document.getElementById('community-guild').value='';
  document.getElementById('community-pfp').value='';
  await loadCommunities();
});

// --- Trains ---
async function loadTrains() {
  const res = await fetch('/api/trains', {
    headers:{'x-user-id':currentUser.id,'x-user-role':currentUser.role}
  });
  const trains = await res.json();
  const tbody = document.getElementById('trains-container');
  tbody.innerHTML = '';

  trains.forEach(t=>{
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="border px-2 py-1">${t.code}</td>
      <td class="border px-2 py-1">${t.route}</td>
      <td class="border px-2 py-1">${t.engineer||'-'}</td>
      <td class="border px-2 py-1">${t.conductor||'-'}</td>
      <td class="border px-2 py-1">${t.status}</td>
      <td class="border px-2 py-1">
        ${t.status==='open'?`<button class="btn-claim bg-green-500 text-white px-2 py-1 rounded" data-id="${t.id}">Claim</button>`:''}
        ${currentUser.role==='admin'?`<button class="edit-btn bg-blue-500 text-white px-2 py-1 rounded" data-id="${t.id}">Edit</button>`:''}
      </td>
    `;
    tbody.appendChild(tr);
  });

  // Claim
  document.querySelectorAll('.btn-claim').forEach(btn=>{
    btn.addEventListener('click', async e=>{
      await fetch('/api/trains',{
        method:'PATCH',
        headers:{'Content-Type':'application/json','x-user-id':currentUser.id,'x-user-role':currentUser.role},
        body: JSON.stringify({id:e.target.dataset.id, updates:{status:'claimed', engineer:currentUser.username}})
      });
      await loadTrains();
    })
  });

  // Admin edit
  document.querySelectorAll('.edit-btn').forEach(btn=>{
    btn.addEventListener('click', async e=>{
      const id=e.target.dataset.id;
      const train = trains.find(t=>t.id==id);
      document.getElementById('train-id').value=train.id;
      document.getElementById('train-code').value=train.code;
      document.getElementById('train-route').value=train.route;
      document.getElementById('train-engineer').value=train.engineer||'';
      document.getElementById('train-conductor').value=train.conductor||'';
      document.getElementById('train-status').value=train.status;
      document.getElementById('train-modal').classList.remove('hidden');
    })
  })
}

// --- Save Train ---
document.getElementById('save-train-btn').addEventListener('click', async ()=>{
  const id=document.getElementById('train-id').value;
  const updates={
    code:document.getElementById('train-code').value,
    route:document.getElementById('train-route').value,
    engineer:document.getElementById('train-engineer').value,
    conductor:document.getElementById('train-conductor').value,
    status:document.getElementById('train-status').value
  };
  await fetch('/api/trains',{
    method:'PATCH',
    headers:{'Content-Type':'application/json','x-user-id':currentUser.id,'x-user-role':currentUser.role},
    body:JSON.stringify({id, updates})
  });
  document.getElementById('train-modal').classList.add('hidden');
  await loadTrains();
});
document.getElementById('close-train-modal').addEventListener('click',()=>document.getElementById('train-modal').classList.add('hidden'));

// --- Real-time subscriptions ---
const trainsChannel = supabase.from('trains').on('*', payload=>{
  loadTrains();
}).subscribe();

const communitiesChannel = supabase.from('communities').on('*', payload=>{
  loadCommunities();
}).subscribe();

await loadInvites();
await loadCommunities();
await loadTrains();
