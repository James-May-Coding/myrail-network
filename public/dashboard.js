import { supabase } from './supabaseClient.js';

const communitiesContainer = document.getElementById('communities-container');
const invitesContainer = document.getElementById('invites-container');
const trainsBody = document.getElementById('trains-body');
const createCommunityBtn = document.getElementById('create-community');

const popup = document.getElementById('train-popup');
const crewList = document.getElementById('train-crew-list');
const closePopupBtn = document.getElementById('close-popup');
const logoutBtn = document.getElementById('logout');

let currentUser;

async function loadSession() {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    window.location.href = '/index.html';
    return null;
  }
  currentUser = user;
  return user;
}

async function loadInvites() {
  const { data: invites, error } = await supabase
    .from('group_members')
    .select('group_id, role, groups(name)')
    .eq('discord_id', currentUser.id)
    .is('accepted', null); // pending invites

  if (error) console.error(error);

  invitesContainer.innerHTML = '';
  invites.forEach(inv => {
    const div = document.createElement('div');
    div.className = 'invite-item p-2 bg-yellow-100 rounded mb-1 flex justify-between';
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
      await supabase
        .from('group_members')
        .update({ accepted: true })
        .eq('group_id', btn.dataset.id)
        .eq('user_id', currentUser.id);
      await loadInvites();
      await loadCommunities();
    });
  });

  document.querySelectorAll('.deny-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      await supabase
        .from('group_members')
        .delete()
        .eq('group_id', btn.dataset.id)
        .eq('user_id', currentUser.id);
      await loadInvites();
    });
  });
}

async function loadCommunities() {
  const { data: communities, error } = await supabase
    .from('groups')
    .select('*')
    .in('id', supabase.rpc('get_user_group_ids', { discord_id: currentUser.id }));

  if (error) console.error(error);

  communitiesContainer.innerHTML = '';
  communities.forEach(c => {
    const div = document.createElement('div');
    div.textContent = c.name;
    div.className = 'p-2 bg-blue-100 rounded mb-1';
    communitiesContainer.appendChild(div);
  });
}

async function loadTrains() {
  const { data: trains, error } = await supabase
    .from('trains')
    .select('*, assignments(*, users(username))')
    .in('group_id', supabase.rpc('get_user_group_ids', { discord_id: currentUser.id }));

  if (error) console.error(error);

  trainsBody.innerHTML = '';
  trains.forEach(t => {
    const tr = document.createElement('tr');
    tr.trainData = t;
    tr.innerHTML = `
      <td class="p-2">${t.code}</td>
      <td class="p-2">${t.description || ''}</td>
      <td class="p-2">${t.direction || ''}</td>
      <td class="p-2">${t.yard || ''}</td>
      <td class="p-2">${t.assignments.map(a => a.assignment_role + ': ' + (a.users?.username || 'Unknown')).join(', ')}</td>
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

function showTrainCrew(train) {
  crewList.innerHTML = '';
  train.assignments.forEach(a => {
    const div = document.createElement('div');
    div.textContent = `${a.assignment_role}: ${a.users?.username || 'Unknown'}`;
    crewList.appendChild(div);
  });
  popup.classList.remove('hidden');
}

closePopupBtn.addEventListener('click', () => popup.classList.add('hidden'));

createCommunityBtn.addEventListener('click', async () => {
  const name = prompt('Community Name:');
  if (!name) return;
  const { data, error } = await supabase
    .from('groups')
    .insert([{ name }]);
  if (error) return console.error(error);
  await loadCommunities();
});

logoutBtn.addEventListener('click', async () => {
  await supabase.auth.signOut();
  window.location.href = '/index.html';
});

// Initial load
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
