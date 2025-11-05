import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// --- Use Vite/Vercel frontend env ---
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

let currentUser = null;

// --- Load Discord session ---
async function loadSession() {
  const res = await fetch('/api/auth/session');
  const data = await res.json();
  if (!data.user) window.location.href = '/index.html';
  currentUser = data.user;
  // Optional: fetch role from community_members for admin
  const { data: member } = await supabase.from('community_members').select('role').eq('user_id', currentUser.id).single();
  currentUser.role = member?.role || 'member';
}
await loadSession();

// --- Pending Invites ---
async function loadInvites() {
  const { data: invites } = await supabase
    .from('community_invites')
    .select('id, community_id, status, communities(name, pfp)')
    .eq('user_id', currentUser.id)
    .eq('status', 'pending');

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

  // --- Accept/Deny handlers ---
  document.querySelectorAll('.btn-accept').forEach(btn =>
    btn.addEventListener('click', async e => {
      const inviteId = e.target.dataset.id;
      const { data: invite } = await supabase
        .from('community_invites')
        .update({ status: 'accepted' })
        .eq('id', inviteId)
        .select()
        .single();
      await supabase.from('community_members').insert({ community_id: invite.community_id, user_id: currentUser.id, role: 'member' });
      await loadInvites(); await loadCommunities();
    })
  );

  document.querySelectorAll('.btn-deny').forEach(btn =>
    btn.addEventListener('click', async e => {
      const inviteId = e.target.dataset.id;
      await supabase.from('community_invites').update({ status: 'denied' }).eq('id', inviteId);
      await loadInvites();
    })
  );
}

// --- Communities ---
async function loadCommunities() {
  const { data: communities } = await supabase
    .from('community_members')
    .select('community_id, role, communities(name, pfp)')
    .eq('user_id', currentUser.id);

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

// --- Create new community ---
document.getElementById('new-community-btn').addEventListener('click', () => {
  document.getElementById('community-modal').classList.toggle('hidden');
});
document.getElementById('create-community-btn').addEventListener('click', async () => {
  const name = document.getElementById('community-name').value;
  const guildId = document.getElementById('community-guild').value;
  const pfp = document.getElementById('community-pfp').value;
  if (!name || !guildId) return alert('Name and Guild ID required');
  await supabase.from('communities').insert({ name, guild_id: guildId, pfp, owner_id: currentUser.id });
  document.getElementById('community-modal').classList.add('hidden');
  await loadCommunities();
});

// --- Load Trains ---
async function loadTrains() {
  const { data: trains } = await supabase.from('trains').select('*');
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

  // --- Claim trains ---
  document.querySelectorAll('.btn-claim').forEach(btn =>
    btn.addEventListener('click', async e => {
      const id = e.target.dataset.id;
      await supabase.from('trains').update({ status: 'claimed', engineer: currentUser.username }).eq('id', id);
      await loadTrains();
    })
  );

  // --- Admin edit train ---
  document.querySelectorAll('.edit-btn').forEach(btn =>
    btn.addEventListener('click', async e => {
      const id = e.target.dataset.id;
      const { data: train } = await supabase.from('trains').select('*').eq('id', id).single();
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
  const code = document.getElementById('train-code').value;
  const route = document.getElementById('train-route').value;
  const engineer = document.getElementById('train-engineer').value;
  const conductor = document.getElementById('train-conductor').value;
  const status = document.getElementById('train-status').value;

  await supabase.from('trains').update({ code, route, engineer, conductor, status }).eq('id', id);
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

// --- Live updates ---
supabase.from(`community_invites:user_id=eq.${currentUser.id}`).on('*', loadInvites).subscribe();
supabase.from('trains').on('*', loadTrains).subscribe();
