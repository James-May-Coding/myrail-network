import { supabase } from './supabase.js';

// DOM Elements
const userDisplay = document.getElementById('user-display');
const trainsContainer = document.getElementById('trains-container');
const invitesContainer = document.getElementById('invites-container');
const communitiesContainer = document.getElementById('communities-container');
const communityModal = document.getElementById('community-modal');
const createCommunityBtn = document.getElementById('create-community-btn');

// Current logged-in user
let currentUser = null;

// ------------------------
// 1️⃣ Get current user
// ------------------------
async function getCurrentUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    console.error('No user logged in', error);
    return;
  }
  currentUser = data.user;
  userDisplay.textContent = currentUser.email || 'Unknown User';
}

// ------------------------
// 2️⃣ Load Trains
// ------------------------
async function loadTrains() {
  const { data: trains, error } = await supabase
    .from('trains')
    .select('*')
    .order('id', { ascending: true });

  if (error) return console.error(error);

  trainsContainer.innerHTML = '';
  trains.forEach(t => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${t.code}</td>
      <td>${t.route}</td>
      <td>${t.engineer || '-'}</td>
      <td>${t.conductor || '-'}</td>
      <td>${t.status}</td>
      <td>
        ${t.status === 'open' ? `<button class="btn-claim" data-id="${t.id}">Claim</button>` : ''}
        ${currentUser?.role === 'admin' ? `<button class="edit-btn" data-id="${t.id}">Edit</button>` : ''}
      </td>
    `;
    trainsContainer.appendChild(tr);
  });

  // Add claim buttons event
  document.querySelectorAll('.btn-claim').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const trainId = e.target.dataset.id;
      await claimTrain(trainId);
    });
  });

  // Add edit buttons event (admins)
  document.querySelectorAll('.edit-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const trainId = e.target.dataset.id;
      editTrain(trainId);
    });
  });
}

// ------------------------
// 3️⃣ Claim Train
// ------------------------
async function claimTrain(trainId) {
  const field = currentUser.role === 'staff' ? 'engineer' : 'conductor';
  const updates = {};
  updates[field] = currentUser.email;

  const { error } = await supabase
    .from('trains')
    .update(updates)
    .eq('id', trainId);

  if (error) return console.error('Failed to claim train:', error);
}

// ------------------------
// 4️⃣ Edit Train (Admin Only)
// ------------------------
function editTrain(trainId) {
  const newEngineer = prompt('Enter Engineer username:');
  const newConductor = prompt('Enter Conductor username:');

  supabase
    .from('trains')
    .update({ engineer: newEngineer, conductor: newConductor })
    .eq('id', trainId)
    .then(({ error }) => {
      if (error) console.error(error);
    });
}

// ------------------------
// 5️⃣ Load Communities & Invites
// ------------------------
async function loadCommunities() {
  const { data: communities, error } = await supabase
    .from('communities')
    .select('*');

  if (error) return console.error(error);

  communitiesContainer.innerHTML = '';
  communities.forEach(c => {
    const div = document.createElement('div');
    div.className = 'community-card';
    div.innerHTML = `
      <img src="${c.pfp}" alt="PF">
      <span>${c.name}</span>
      ${c.members?.includes(currentUser?.id) ? '<span>Joined</span>' : `<button class="join-community-btn" data-id="${c.id}">Join</button>`}
    `;
    communitiesContainer.appendChild(div);
  });

  document.querySelectorAll('.join-community-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const communityId = e.target.dataset.id;
      await joinCommunity(communityId);
    });
  });
}

// ------------------------
// 6️⃣ Join Community
// ------------------------
async function joinCommunity(communityId) {
  const { data: community, error } = await supabase
    .from('communities')
    .select('members')
    .eq('id', communityId)
    .single();

  if (error) return console.error(error);

  const members = community.members || [];
  if (!members.includes(currentUser.id)) members.push(currentUser.id);

  await supabase.from('communities').update({ members }).eq('id', communityId);
}

// ------------------------
// 7️⃣ Real-Time Updates
// ------------------------
supabase
  .from('trains')
  .on('*', payload => loadTrains())
  .subscribe();

supabase
  .from('communities')
  .on('*', payload => loadCommunities())
  .subscribe();

// ------------------------
// 8️⃣ Create Community Modal
// ------------------------
createCommunityBtn.addEventListener('click', () => {
  communityModal.classList.add('show');
});

communityModal.querySelector('form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = e.target.name.value;
  const guildId = e.target.guildId.value;
  const pfp = e.target.pfp.value;

  await supabase.from('communities').insert([{ name, guild_id: guildId, pfp, members: [currentUser.id] }]);

  communityModal.classList.remove('show');
  e.target.reset();
});

// ------------------------
// 9️⃣ Initialize
// ------------------------
async function init() {
  await getCurrentUser();
  await loadTrains();
  await loadCommunities();
}

init();
