import { supabase } from './supabaseClient.js';

const dropdown = document.getElementById('community-dropdown');
const refreshBtn = document.getElementById('refresh-communities');
const joinBtn = document.getElementById('join-community');
const joinInput = document.getElementById('join-code-input');
const logoutBtn = document.getElementById('logout-btn');
const dashboardContent = document.getElementById('dashboard-content');

// Simple helper for cookies
function getCookie(name) {
  return document.cookie.split('; ').find(r => r.startsWith(name + '='))?.split('=')[1];
}
function setCookie(name, value) {
  document.cookie = `${name}=${value}; path=/; SameSite=Lax;`;
}

// Fetch JSON helper
async function fetchJson(url, options) {
  const res = await fetch(url, options);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Error ${res.status}: ${text}`);
  }
  return res.json();
}

// Load session (redirect if none)
async function loadSession() {
  const session = await fetchJson('/api/auth/session');
  if (!session.user) window.location.href = '/';
  return session.user;
}

// Load communities
async function loadCommunities() {
  dropdown.innerHTML = '';
  const communities = await fetchJson('/api/communities');
  if (communities.length === 0) {
    const opt = document.createElement('option');
    opt.textContent = 'No communities joined yet';
    opt.disabled = true;
    dropdown.appendChild(opt);
  } else {
    for (const c of communities) {
      const opt = document.createElement('option');
      opt.value = c.id;
      opt.textContent = c.name;
      dropdown.appendChild(opt);
    }
  }

  const active = getCookie('activeCommunity');
  if (active && communities.some(c => c.id === active)) dropdown.value = active;
}

// Join via code
joinBtn.addEventListener('click', async () => {
  const code = joinInput.value.trim();
  if (!code) return alert('Please enter a join code.');
  try {
    await fetchJson('/api/communities', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ join_code: code })
    });
    joinInput.value = '';
    await loadCommunities();
    alert('Successfully joined new community!');
  } catch (err) {
    alert('Failed to join community: ' + err.message);
  }
});

// Switch community
dropdown.addEventListener('change', async () => {
  const id = dropdown.value;
  if (!id) return;
  setCookie('activeCommunity', id);
  const selected = dropdown.options[dropdown.selectedIndex].textContent;
  dashboardContent.innerHTML = `<h2 class="text-lg font-bold mb-2">${selected}</h2><p>Active community set.</p>`;
});

// Refresh
refreshBtn.addEventListener('click', loadCommunities);

// Logout
logoutBtn.addEventListener('click', async () => {
  await supabase.auth.signOut();
  document.cookie = 'user_id=; path=/; Max-Age=0;';
  document.cookie = 'activeCommunity=; path=/; Max-Age=0;';
  window.location.href = '/';
});

// Initialize
(async () => {
  await loadSession();
  await loadCommunities();
})();
