import { supabase } from './supabaseClient.js';

async function fetchJson(url, options = {}) {
  const res = await fetch(url, options);
  const text = await res.text();
  if (!res.ok) throw new Error(text);
  return text ? JSON.parse(text) : {};
}

async function loadCommunities() {
  const data = await fetchJson('/api/communities');
  const list = document.getElementById('communities-list');
  list.innerHTML = '';

  data.forEach(c => {
    const div = document.createElement('div');
    div.className = 'community-card';
    div.innerHTML = `<strong>${c.name}</strong><br><small>Code: ${c.code}</small>`;
    list.appendChild(div);
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  const createBtn = document.getElementById('create-community');
  const joinBtn = document.getElementById('join-community');

  createBtn.addEventListener('click', async () => {
    const name = document.getElementById('community-name').value.trim();
    if (!name) return alert('Enter a name first!');
    const user = supabase.auth.getUser ? (await supabase.auth.getUser()).data.user : null;
    const owner_id = user ? user.id : '00000000-0000-0000-0000-000000000000';

    await fetchJson('/api/communities', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, owner_id })
    });

    await loadCommunities();
    alert('Community created successfully!');
  });

  joinBtn.addEventListener('click', async () => {
    const code = document.getElementById('join-code').value.trim().toUpperCase();
    if (!code) return alert('Enter a join code!');
    const user = supabase.auth.getUser ? (await supabase.auth.getUser()).data.user : null;
    const user_id = user ? user.id : '00000000-0000-0000-0000-000000000000';

    await fetchJson('/api/communities', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id, code })
    });

    await loadCommunities();
    alert('Joined community!');
  });

  await loadCommunities();
});
