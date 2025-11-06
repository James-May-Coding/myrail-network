// public/dashboard.js
// Strict: uses ONLY /api endpoints for sensitive ops
// Fetches env via /api/env (frontend-safe keys) to enable realtime subscriptions
const $ = id => document.getElementById(id);

// UI elements
const userInfo = $('user-info');
const logoutBtn = $('logout');
const invitesContainer = $('invites-container');
const communitiesContainer = $('communities-container');
const trainsBody = $('trains-body');
const createCommunityBtn = $('create-community');
const modal = $('modal');
const mSave = $('m-save');
const mCancel = $('m-cancel');

let currentUser = null;
let supabaseClient = null; // will be set for realtime only

async function fetchJson(url, opts) {
  const r = await fetch(url, opts || {});
  if (!r.ok) {
    const t = await r.text().catch(()=>null);
    console.error('API error', url, r.status, t);
    throw new Error('API error ' + url + ' ' + r.status);
  }
  return r.json();
}

// 1) get session (cookie-based)
async function loadSession() {
  try {
    const data = await fetchJson('/api/auth/session');
    if (!data.user) {
      window.location.href = '/index.html';
      return false;
    }
    currentUser = data.user;
    userInfo.innerHTML = `<strong>${escapeHtml(currentUser.username)}</strong>`;
    return true;
  } catch (e) {
    console.error('Session load failed', e);
    window.location.href = '/index.html';
    return false;
  }
}

// 2) get env for realtime (anon key)
async function initRealtime() {
  try {
    const env = await fetchJson('/api/env');
    // use CDN ESM createClient already loaded by script tag; create via global
    // but import path may be ESM; to avoid bundler issues, use dynamic import:
    const module = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm');
    supabaseClient = module.createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
    // optional: subscribe to tables
    supabaseClient
      .channel('realtime-trains')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trains' }, ()=> loadTrains())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'communities' }, ()=> loadCommunities())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'community_invites' }, ()=> loadInvites())
      .subscribe();
  } catch (e) {
    console.warn('Realtime init failed, continuing without realtime', e);
    supabaseClient = null;
  }
}

// 3) load invites (from API)
async function loadInvites() {
  const invites = await fetchJson('/api/invites');
  invitesContainer.innerHTML = '';
  invites.forEach(inv => {
    const div = document.createElement('div');
    div.className = 'invite-card';
    div.innerHTML = `<div><strong>${escapeHtml(inv.community_name)}</strong></div>
      <div><button class="btn accept" data-id="${inv.id}">Accept</button> <button class="btn" data-id="${inv.id}" data-action="deny">Deny</button></div>`;
    invitesContainer.appendChild(div);
  });
  // bind
  invitesContainer.querySelectorAll('button.accept').forEach(b=>b.onclick = async e=>{
    const id = e.target.dataset.id;
    await fetchJson('/api/invites', {method:'PATCH', headers:{'content-type':'application/json'}, body:JSON.stringify({id, status:'accepted'})});
    await loadInvites(); await loadCommunities();
  });
  invitesContainer.querySelectorAll('button[data-action="deny"]').forEach(b=>b.onclick = async e=>{
    const id = e.target.dataset.id;
    await fetchJson('/api/invites', {method:'PATCH', headers:{'content-type':'application/json'}, body:JSON.stringify({id, status:'denied'})});
    await loadInvites();
  });
}

// 4) load communities (from API)
async function loadCommunities() {
  const communities = await fetchJson('/api/communities');
  communitiesContainer.innerHTML = '';
  communities.forEach(c => {
    const div = document.createElement('div');
    div.className = 'community-card';
    div.innerHTML = `<div><strong>${escapeHtml(c.name)}</strong><div>Guild: ${escapeHtml(c.guild_id)}</div></div>
      <div>${c.is_member ? '<span>Member</span>' : `<button class="btn join" data-id="${c.id}">Join</button>`}</div>`;
    communitiesContainer.appendChild(div);
  });
  // bind join
  communitiesContainer.querySelectorAll('button.join').forEach(b => b.onclick = async e=>{
    await fetchJson('/api/communities', {method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify({action:'join', community_id:e.target.dataset.id})});
    await loadCommunities();
  });
}

// 5) load trains
async function loadTrains() {
  const trains = await fetchJson('/api/trains');
  trainsBody.innerHTML = '';
  trains.forEach(t => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${escapeHtml(t.code)}</td><td>${escapeHtml(t.route)}</td><td>${escapeHtml(t.engineer||'-')}</td><td>${escapeHtml(t.conductor||'-')}</td><td>${escapeHtml(t.status)}</td>
      <td>
        ${t.status==='open' ? `<button class="btn claim" data-id="${t.id}">Claim</button>` : ''}
        ${t.can_edit ? `<button class="btn edit" data-id="${t.id}">Edit</button>` : ''}
      </td>`;
    trainsBody.appendChild(tr);
  });
  // bind claim/edit
  trainsBody.querySelectorAll('button.claim').forEach(b => b.onclick = async e=>{
    const id = e.target.dataset.id;
    await fetchJson('/api/trains', {method:'PATCH', headers:{'content-type':'application/json'}, body:JSON.stringify({id, action:'claim'})});
    await loadTrains();
  });
  trainsBody.querySelectorAll('button.edit').forEach(b => b.onclick = async e=>{
    const id = e.target.dataset.id;
    const t = (await fetchJson('/api/trains?id=' + encodeURIComponent(id)))[0];
    $('m-id').value = t.id;
    $('m-code').value = t.code;
    $('m-route').value = t.route;
    $('m-engineer').value = t.engineer || '';
    $('m-conductor').value = t.conductor || '';
    $('m-status').value = t.status;
    modal.classList.remove('hidden');
  });
}

// modal handlers
mCancel.onclick = ()=> modal.classList.add('hidden');
mSave.onclick = async ()=>{
  const id = $('m-id').value;
  const updates = { code:$('m-code').value, route:$('m-route').value, engineer:$('m-engineer').value, conductor:$('m-conductor').value, status:$('m-status').value };
  await fetchJson('/api/trains', {method:'PATCH', headers:{'content-type':'application/json'}, body:JSON.stringify({id, action:'edit', updates})});
  modal.classList.add('hidden');
  await loadTrains();
};

// create community flow
createCommunityBtn.onclick = async ()=>{
  const name = prompt('Community name:');
  if (!name) return;
  const guild_id = prompt('Guild ID:');
  if (!guild_id) return;
  const pfp = prompt('Image URL (optional):') || '';
  await fetchJson('/api/communities', {method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify({action:'create', name, guild_id, pfp})});
  await loadCommunities();
};

logoutBtn.onclick = async ()=>{
  await fetch('/api/auth/session', {method:'DELETE'});
  window.location.href = '/index.html';
};

// escape helper
function escapeHtml(s){ if(s==null) return ''; return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

// bootstrap
(async function init(){
  const ok = await loadSession();
  if(!ok) return;
  await initRealtime();
  await loadInvites();
  await loadCommunities();
  await loadTrains();
  // periodic fallback polling every 12s if realtime not available
  setInterval(async ()=>{
    try { await loadTrains(); await loadCommunities(); await loadInvites(); } catch(e){}
  }, 12000);
})();
