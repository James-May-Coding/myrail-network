import { supabase } from './supabaseClient.js';

// Elements
const dropdown = document.getElementById('community-dropdown');
const refreshBtn = document.getElementById('refresh-communities');
const joinBtn = document.getElementById('join-community');
const joinInput = document.getElementById('join-code-input');
const logoutBtn = document.getElementById('logout-btn');
const dashboardContent = document.getElementById('dashboard-content');

// =============================
// Cookie Helpers
// =============================
function getCookie(name) {
  const value = document.cookie
    .split('; ')
    .find(r => r.startsWith(name + '='));
  return value ? decodeURIComponent(value.split('=')[1]) : null;
}

function setCookie(name, value, days = 7) {
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax;`;
}

function clearCookie(name) {
  document.cookie = `${name}=; Max-Age=0; path=/;`;
}

// =============================
// Fetch Helper
// =============================
async function fetchJson(url, options = {}) {
  const res = await fetch(url, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...options
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status}: ${text}`);
  }
  return res.json();
}

// =============================
// Session Loading
// =============================
async function loadSession() {
  try {
    const session = await fetchJson('/api/session.js');
    if (!session?.user) {
      console.warn('No user session found. Redirecting to login...');
      window.location.href = '/';
      return null;
    }
    console.log('✅ Logged in as', session.user.username || session.user.id);
    return session.user;
  } catch (err) {
    console.error('Session load error:', err);
    window.location.href = '/';
  }
}

// =============================
// Communities
// =============================
async function loadCommunities() {
  dropdown.innerHTML = '';
  try {
    const communities = await fetchJson('/api/communities.js');
    if (!Array.isArray(communities) || communities.length === 0) {
      const opt = document.createElement('option');
      opt.textContent = 'No communities joined yet';
      opt.disabled = true;
      dropdown.appendChild(opt);
      return;
    }

    communities.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.id;
      opt.textContent = c.name;
      dropdown.appendChild(opt);
    });

    const active = getCookie('activeCommunity');
    if (active && communities.some(c => c.id === active)) dropdown.value = active;
  } catch (err) {
    console.error('Failed to load communities:', err);
    alert('Error loading communities. Please try again.');
  }
}

// =============================
// Join Community
// =============================
joinBtn.addEventListener('click', async () => {
  const code = joinInput.value.trim();
  if (!code) return alert('Please enter a join code.');

  try {
    await fetchJson('/api/communities.js', {
      method: 'PATCH',
      body: JSON.stringify({ join_code: code })
    });
    joinInput.value = '';
    await loadCommunities();
    alert('✅ Successfully joined community!');
  } catch (err) {
    alert('❌ Failed to join: ' + err.message);
  }
});

// =============================
// Switch Active Community
// =============================
dropdown.addEventListener('change', async () => {
  const id = dropdown.value;
  if (!id) return;
  setCookie('activeCommunity', id);
  const selected = dropdown.options[dropdown.selectedIndex].textContent;
  dashboardContent.innerHTML = `
    <h2 class="text-lg font-semibold mb-2">${selected}</h2>
    <p>Active community set.</p>`;
});

// =============================
// Refresh Button
// =============================
refreshBtn.addEventListener('click', loadCommunities);

// =============================
// Logout
// =============================
logoutBtn.addEventListener('click', async () => {
  try {
    await supabase.auth.signOut();
  } catch {}
  clearCookie('user');
  clearCookie('activeCommunity');
  window.location.href = '/';
});

// =============================
// Init
// =============================
(async () => {
  const user = await loadSession();
  if (!user) return;
  await loadCommunities();
})();
