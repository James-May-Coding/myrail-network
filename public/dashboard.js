import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// --- Supabase init ---
const supabase = createClient('YOUR_SUPABASE_URL', 'YOUR_SUPABASE_ANON_KEY');
let currentUser = null;

// --- Load session ---
async function loadSession() {
  const res = await fetch('/api/auth/session');
  const data = await res.json();
  if (!data.user) window.location.href = '/index.html';
  else currentUser = data.user;
}
await loadSession();

// --- Load invites ---
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
      await loadInvites(); loadCommunities();
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

// --- Load communities ---
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

// --- Create community ---
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

// --- Load trains/jobs ---
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
      <td>${t.status === 'open' ? `<button class="btn btn-claim" data-id="${t.id}">Claim</button>` : '-'}</td>
    `;
    tbody.appendChild(tr);
  });

  document.querySelectorAll('.btn-claim').forEach(btn =>
    btn.addEventListener('click', async e => {
      const id = e.target.dataset.id;
      await supabase.from('trains').update({ status: 'claimed', engineer: currentUser.username }).eq('id', id);
      await loadTrains();
    })
  );
}

// --- Initial load ---
loadInvites();
loadCommunities();
loadTrains();

// --- Live updates (optional) ---
supabase.from(`community_invites:user_id=eq.${currentUser.id}`).on('*', loadInvites).subscribe();
supabase.from('trains').on('*', loadTrains).subscribe();
