document.addEventListener('DOMContentLoaded', async () => {
  const userNameEl = document.getElementById('user-name');
  const communityList = document.getElementById('community-list');
  const createForm = document.getElementById('create-form');
  const communityNameInput = document.getElementById('community-name');
  const communityCodeInput = document.getElementById('community-code');
  const joinForm = document.getElementById('join-form');
  const joinCodeInput = document.getElementById('join-code');

  async function fetchJson(url, options = {}) {
    const res = await fetch(url, options);
    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = { error: text };
    }
    if (!res.ok) throw new Error(JSON.stringify(data));
    return data;
  }

  async function loadSession() {
    const res = await fetch('/api/session.js');
    if (!res.ok) {
      window.location.href = '/';
      return;
    }
    const data = await res.json();
    userNameEl.textContent = data.user?.email || 'Unknown user';
  }

  async function loadCommunities() {
    communityList.innerHTML = '';
    try {
      const communities = await fetchJson('/api/communities.js');
      if (communities.length === 0) {
        communityList.innerHTML = '<p>No communities yet.</p>';
        return;
      }
      communities.forEach(c => {
        const div = document.createElement('div');
        div.className = 'community-item';
        div.textContent = `${c.name} (${c.code})`;
        communityList.appendChild(div);
      });
    } catch (err) {
      console.error(err);
      communityList.innerHTML = '<p class="error">Error loading communities.</p>';
    }
  }

  createForm.addEventListener('submit', async e => {
    e.preventDefault();
    const name = communityNameInput.value.trim();
    const code = communityCodeInput.value.trim();
    if (!name || !code) {
      alert('Please enter both name and code.');
      return;
    }

    try {
      await fetchJson('/api/communities.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, code })
      });
      alert('Community created!');
      communityNameInput.value = '';
      communityCodeInput.value = '';
      loadCommunities();
    } catch (err) {
      console.error(err);
      alert('Error creating community.');
    }
  });

  joinForm.addEventListener('submit', async e => {
    e.preventDefault();
    const code = joinCodeInput.value.trim();
    if (!code) {
      alert('Please enter a community code.');
      return;
    }

    try {
      await fetchJson('/api/communities.js', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code })
      });
      alert('Joined community!');
      joinCodeInput.value = '';
      loadCommunities();
    } catch (err) {
      console.error(err);
      alert('Error joining community.');
    }
  });

  await loadSession();
  await loadCommunities();
});
