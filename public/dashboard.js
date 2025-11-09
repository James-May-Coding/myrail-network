import { supabase } from './supabaseClient.js';

/* DOM */
const userInfoEl = document.getElementById('user-info');
const logoutBtn = document.getElementById('logout');
const invitesContainer = document.getElementById('invites-container');
const communitiesContainer = document.getElementById('communities-container');
const trainsBody = document.getElementById('trains-body');
const createCommunityBtn = document.getElementById('create-community');
const refreshBtn = document.getElementById('refresh-btn');

const adminModal = document.getElementById('admin-modal');
const adminOpenBtn = document.getElementById('open-admin');
const adminCloseBtn = document.getElementById('admin-close');
const adminGroupSelect = document.getElementById('admin-group');
const adminCode = document.getElementById('admin-code');
const adminDesc = document.getElementById('admin-desc');
const adminDirection = document.getElementById('admin-direction');
const adminYard = document.getElementById('admin-yard');
const adminSave = document.getElementById('admin-save');
const adminDelete = document.getElementById('admin-delete');
const adminAssignments = document.getElementById('admin-assignments');
const assignEmail = document.getElementById('assign-email');
const assignRole = document.getElementById('assign-role');
const assignAdd = document.getElementById('assign-add');

const popup = document.getElementById('train-popup');
const crewList = document.getElementById('train-crew-list');
const closePopupBtn = document.getElementById('close-popup');

let currentUser = null;
let currentUserRow = null; // row in users table (if found)
let groupsCache = [];
let trainsCache = [];
let editingTrainId = null;

/* UTIL: read cookie helpers (access/refresh tokens handled elsewhere) */
function getCookie(name) {
  return document.cookie.split('; ').reduce((r, v) => {
    const [k, ...rest] = v.split('=');
    return k === name ? decodeURIComponent(rest.join('=')) : r;
  }, '');
}

/* SESSION: restore Supabase session from cookies */
async function ensureSession() {
  // If supabase already has session, ok:
  const { data: sessionData } = await supabase.auth.getSession();
  let session = sessionData?.session;
  if (!session) {
    const access = getCookie('access_token');
    const refresh = getCookie('refresh_token');
    if (access && refresh) {
      const { data, error } = await supabase.auth.setSession({ access_token: access, refresh_token: refresh });
      if (error || !data.session) {
        // not logged in
        window.location.href = '/login.html';
        return;
      }
      session = data.session;
    } else {
      window.location.href = '/login.html';
      return;
    }
  }

  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    window.location.href = '/login.html';
    return;
  }
  currentUser = user;

  // Try to find matching row in users table (by discord id or email)
  // It's okay if this fails; some features require this row to exist.
  let discordId = null;
  // Attempt to detect Discord provider id in identities (works in many Supabase setups)
  if (user.identities && user.identities.length > 0) {
    discordId = user.identities[0].identity_data?.id || user.identities[0].id || null;
  }
  // some builds put provider id in user.user_metadata?.sub
  if (!discordId && user.user_metadata?.sub) discordId = user.user_metadata.sub;

  // Query users table to find matching user row
  let q;
  if (discordId) {
    q = supabase.from('users').select('*').eq('discord_id', discordId).limit(1).single();
  } else if (user.email) {
    q = supabase.from('users').select('*').eq('email', user.email).limit(1).single();
  }
  if (q) {
    const { data, error: userErr } = await q;
    if (!userErr && data) currentUserRow = data;
  }

  userInfoEl.textContent = `${currentUserRow?.username || currentUser.email || currentUser.user_metadata?.name || 'User'}`;
}

/* --- DATA LOADERS --- */

async function loadGroups() {
  // groups where currentUserRow is a member. If no local row, fetch groups where group_members.user_id is null - won't return anything.
  if (!currentUserRow) {
    // fallback: show groups where discord_guild_id is null? just show all groups as fallback
    const { data, error } = await supabase.from('groups').select('*').order('created_at', { ascending: false });
    groupsCache = data || [];
  } else {
    const { data, error } = await supabase
      .from('group_members')
      .select('role, groups(id,name,discord_guild_id)')
      .eq('user_id', currentUserRow.id);
    groupsCache = (data || []).map(r => ({ id: r.groups.id, name: r.groups.name, role: r.role }));
  }
  renderGroups();
  populateAdminGroupSelect();
}

function renderGroups() {
  communitiesContainer.innerHTML = '';
  groupsCache.forEach(g => {
    const el = document.createElement('div');
    el.className = 'p-2 bg-blue-100 rounded mb-1';
    el.textContent = `${g.name} ${g.role ? '(' + g.role + ')' : ''}`;
    communitiesContainer.appendChild(el);
  });
}

async function loadInvites() {
  // invites represented as group_members rows where role='invite' or role='pending' depending on your table
  if (!currentUserRow) { invitesContainer.innerHTML = ''; return; }
  const { data, error } = await supabase
    .from('group_members')
    .select('group_id, role, groups(name)')
    .eq('user_id', currentUserRow.id)
    .in('role', ['invite','pending']);
  invitesContainer.innerHTML = '';
  (data || []).forEach(inv => {
    const wrapper = document.createElement('div');
    wrapper.className = 'invite-item p-2 bg-yellow-100 rounded mb-1 flex justify-between';
    wrapper.innerHTML = `<span>${inv.groups.name}</span>
      <div>
        <button class="btn accept small" data-group="${inv.group_id}">Accept</button>
        <button class="btn btn-danger deny small" data-group="${inv.group_id}">Deny</button>
      </div>`;
    invitesContainer.appendChild(wrapper);
  });
  // wire buttons
  invitesContainer.querySelectorAll('.accept').forEach(btn => btn.addEventListener('click', async e => {
    const gid = btn.dataset.group;
    await supabase.from('group_members').update({ role: 'member' }).eq('group_id', gid).eq('user_id', currentUserRow.id);
    await loadInvites();
    await loadGroups();
  }));
  invitesContainer.querySelectorAll('.deny').forEach(btn => btn.addEventListener('click', async e => {
    const gid = btn.dataset.group;
    await supabase.from('group_members').delete().eq('group_id', gid).eq('user_id', currentUserRow.id);
    await loadInvites();
  }));
}

async function loadTrains() {
  // fetch trains in groups user is in
  let groupIds = groupsCache.map(g => g.id);
  if (!groupIds || groupIds.length === 0) {
    // fallback: fetch all trains (if you want stricter behavior, return empty)
    const { data } = await supabase.from('trains').select('*').order('created_at', { ascending: false });
    trainsCache = (data || []).map(t => ({ ...t, assignments: [] }));
  } else {
    // select trains and their assignments + user info
    const { data, error } = await supabase
      .from('trains')
      .select(`
         *,
         assignments (
           id, assignment_role, joined_at, meta,
           users:user_id ( id, discord_id, username, email )
         )
      `)
      .in('group_id', groupIds)
      .order('created_at', { ascending: false });
    trainsCache = data || [];
  }
  renderTrains();
}

function renderTrains() {
  trainsBody.innerHTML = '';
  trainsCache.forEach(t => {
    const tr = document.createElement('tr');
    const crew = (t.assignments || []).map(a => `${a.assignment_role}: ${a.users?.username || a.users?.email || 'Unknown'}`).join(', ');
    tr.innerHTML = `
      <td class="p-2">${t.code}</td>
      <td class="p-2">${t.description || ''}</td>
      <td class="p-2">${t.direction || ''}</td>
      <td class="p-2">${t.yard || ''}</td>
      <td class="p-2">${crew}</td>
      <td class="p-2"></td>
    `;
    const viewBtn = document.createElement('button');
    viewBtn.className = 'btn small';
    viewBtn.textContent = 'View Crew';
    viewBtn.addEventListener('click', () => showTrainCrew(t));
    tr.cells[5].appendChild(viewBtn);

    const claimBtn = document.createElement('button');
    claimBtn.className = 'btn small';
    claimBtn.style.marginLeft = '8px';
    claimBtn.textContent = 'Claim (E)';
    claimBtn.addEventListener('click', async () => {
      // create assignment for current user
      if (!currentUserRow) return alert('Your account is not linked in users table; ask admin to link your account.');
      await supabase.from('assignments').insert([{ train_id: t.id, user_id: currentUserRow.id, assignment_role: 'E' }]);
      await loadTrains();
    });
    tr.cells[5].appendChild(claimBtn);

    // If user is admin in this group, show quick edit button
    const gm = groupsCache.find(g => g.id === t.group_id);
    if (gm && (gm.role === 'owner' || gm.role === 'admin' || gm.role === 'staff')) {
      const editBtn = document.createElement('button');
      editBtn.className = 'btn small';
      editBtn.style.marginLeft = '8px';
      editBtn.textContent = 'Edit';
      editBtn.addEventListener('click', () => openAdminForTrain(t));
      tr.cells[5].appendChild(editBtn);
    }

    trainsBody.appendChild(tr);
  });
}

/* POPUPS */
function showTrainCrew(train) {
  crewList.innerHTML = '';
  (train.assignments || []).forEach(a => {
    const el = document.createElement('div');
    el.textContent = `${a.assignment_role}: ${a.users?.username || a.users?.email || 'Unknown'}`;
    // If admin, add unassign button
    const gm = groupsCache.find(g => g.id === train.group_id);
    if (gm && (gm.role === 'owner' || gm.role === 'admin')) {
      const unbtn = document.createElement('button');
      unbtn.className = 'btn btn-danger small';
      unbtn.textContent = 'Remove';
      unbtn.style.marginLeft = '8px';
      unbtn.addEventListener('click', async () => {
        await supabase.from('assignments').delete().eq('id', a.id);
        await loadTrains();
        showTrainCrew(train); // refresh popup
      });
      el.appendChild(unbtn);
    }
    crewList.appendChild(el);
  });
  popup.style.display = 'block';
}

closePopupBtn?.addEventListener('click', () => popup.style.display = 'none');

/* ADMIN PANEL */
function populateAdminGroupSelect() {
  adminGroupSelect.innerHTML = '';
  groupsCache.forEach(g => {
    const opt = document.createElement('option');
    opt.value = g.id;
    opt.textContent = g.name;
    adminGroupSelect.appendChild(opt);
  });
}

function openAdminModal() {
  adminModal.style.display = 'flex';
}

function closeAdminModal() {
  adminModal.style.display = 'none';
  editingTrainId = null;
  adminCode.value = adminDesc.value = adminDirection.value = adminYard.value = '';
  adminAssignments.innerHTML = '';
}

adminOpenBtn.addEventListener('click', () => {
  // only show admin if user is owner/admin in at least one group
  const isAdmin = groupsCache.some(g => ['owner','admin'].includes(g.role));
  if (!isAdmin) return alert('You must be owner/admin of a group to open the admin panel.');
  populateAdminGroupSelect();
  openAdminModal();
});
adminCloseBtn.addEventListener('click', closeAdminModal);

async function openAdminForTrain(train) {
  // open modal and fill with train data
  editingTrainId = train.id;
  adminCode.value = train.code || '';
  adminDesc.value = train.description || '';
  adminDirection.value = train.direction || '';
  adminYard.value = train.yard || '';
  // set group
  adminGroupSelect.value = train.group_id;

  // load assignments
  const { data: assigns } = await supabase
    .from('assignments')
    .select('*, users:user_id(id,username,email)')
    .eq('train_id', train.id);

  adminAssignments.innerHTML = '';
  (assigns || []).forEach(a => {
    const row = document.createElement('div');
    row.style.display = 'flex';
    row.style.justifyContent = 'space-between';
    row.style.alignItems = 'center';
    row.style.padding = '6px 0';
    row.innerHTML = `<div>${a.assignment_role}: ${a.users?.username || a.users?.email}</div>`;
    const rem = document.createElement('button');
    rem.className = 'btn btn-danger small';
    rem.textContent = 'Remove';
    rem.addEventListener('click', async () => {
      await supabase.from('assignments').delete().eq('id', a.id);
      openAdminForTrain(train); // refresh
      await loadTrains();
    });
    row.appendChild(rem);
    adminAssignments.appendChild(row);
  });

  openAdminModal();
}

// Save (create or update)
adminSave.addEventListener('click', async () => {
  const payload = {
    group_id: adminGroupSelect.value,
    code: adminCode.value.trim(),
    description: adminDesc.value.trim(),
    direction: adminDirection.value.trim(),
    yard: adminYard.value.trim()
  };
  if (!payload.code) return alert('Train code required');

  if (editingTrainId) {
    await supabase.from('trains').update(payload).eq('id', editingTrainId);
  } else {
    const { data } = await supabase.from('trains').insert([payload]).select().single();
    editingTrainId = data?.id;
  }
  await loadTrains();
  if (editingTrainId) openAdminForTrain(trainsCache.find(t=>t.id===editingTrainId) || {});
});

// Delete
adminDelete.addEventListener('click', async () => {
  if (!editingTrainId) return alert('No train selected');
  if (!confirm('Delete this train?')) return;
  await supabase.from('trains').delete().eq('id', editingTrainId);
  closeAdminModal();
  await loadTrains();
});

// Assign user by email
assignAdd.addEventListener('click', async () => {
  const email = assignEmail.value.trim();
  const role = assignRole.value.trim() || 'E';
  if (!email) return alert('Email required');
  // find user in users table
  const { data: usr, error } = await supabase.from('users').select('*').eq('email', email).single();
  if (!usr) return alert('User not found in users table. Ask them to login or ask admin to add them.');
  if (!editingTrainId) return alert('No train selected');
  await supabase.from('assignments').insert([{ train_id: editingTrainId, user_id: usr.id, assignment_role: role }]);
  openAdminForTrain(trainsCache.find(t=>t.id===editingTrainId) || {});
  await loadTrains();
});

/* CREATE COMMUNITY */
createCommunityBtn.addEventListener('click', async () => {
  const name = prompt('Community Name:');
  if (!name) return;
  const { data, error } = await supabase.from('groups').insert([{ name }]).select().single();
  if (error) return alert('Failed to create: ' + error.message);
  // add member as owner if we have a users row for current user
  if (currentUserRow) {
    await supabase.from('group_members').insert([{ group_id: data.id, user_id: currentUserRow.id, role: 'owner' }]);
  }
  await loadGroups();
});

/* REFRESH */
refreshBtn.addEventListener('click', async () => {
  await reloadAll();
});

/* LOGOUT */
logoutBtn.addEventListener('click', async () => {
  await supabase.auth.signOut();
  // clear cookies
  document.cookie = 'access_token=; Max-Age=0; path=/';
  document.cookie = 'refresh_token=; Max-Age=0; path=/';
  window.location.href = '/login.html';
});

/* BOOT */
async function reloadAll() {
  await ensureSession();
  await loadGroups();
  await loadInvites();
  await loadTrains();
  // after loads, keep local caches up to date
}
(async () => {
  await reloadAll();
  setInterval(async () => {
    await loadInvites();
    await loadTrains();
    await loadGroups();
  }, 5000);
})();
