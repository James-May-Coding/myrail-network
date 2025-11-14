import { supabase } from './supabaseClient.js';

// ===== ELEMENT REFERENCES =====
const communityNameInput = document.getElementById("community-name");
const createCommunityBtn = document.getElementById("create-community");
const joinCodeInput = document.getElementById("join-code");
const joinCommunityBtn = document.getElementById("join-community");
const dropdown = document.getElementById("community-dropdown");
const refreshBtn = document.getElementById("refresh-communities");
const trainsBody = document.getElementById("trains-body");
const invitesContainer = document.getElementById("invites-container");
const logoutBtn = document.getElementById("logout-btn");
const userInfo = document.getElementById("user-info");

// ===== COOKIE HELPERS =====
function getCookie(name) {
  return document.cookie.split("; ").find(r => r.startsWith(name + "="))?.split("=")[1] || null;
}
function setCookie(name, value) {
  document.cookie = `${name}=${value}; path=/; SameSite=Lax`;
}
function clearCookie(name) {
  document.cookie = `${name}=; Max-Age=0; path=/`;
}

// ===== FETCH HELPER =====
async function fetchJson(url, options = {}) {
  const res = await fetch(url, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    ...options
  });

  const text = await res.text();
  if (!res.ok) throw new Error(text);
  return JSON.parse(text);
}

// ===== SESSION =====
async function loadSession() {
  const { data: { session }} = await supabase.auth.getSession();
  if (!session) {
    window.location.href = "/";
    return;
  }
  userInfo.textContent = `Logged in as: ${session.user.email}`;
  return session.user;
}

// ===== LOAD COMMUNITIES =====
async function loadCommunities() {
  const list = await fetchJson("/api/communities.js");

  dropdown.innerHTML = "";

  if (!list.length) {
    let opt = document.createElement("option");
    opt.textContent = "No communities yet";
    opt.disabled = true;
    dropdown.appendChild(opt);
    return;
  }

  list.forEach(c => {
    const opt = document.createElement("option");
    opt.value = c.id;
    opt.textContent = c.name;
    dropdown.appendChild(opt);
  });

  const active = getCookie("activeCommunity");
  if (active && list.some(c => c.id === active)) {
    dropdown.value = active;
  }
}

// ===== CREATE COMMUNITY =====
createCommunityBtn.addEventListener("click", async () => {
  const name = communityNameInput.value.trim();
  if (!name) return alert("Enter a community name");

  await fetchJson("/api/communities.js", {
    method: "POST",
    body: JSON.stringify({ name })
  });

  communityNameInput.value = "";
  await loadCommunities();
  alert("Community created!");
});

// ===== JOIN COMMUNITY =====
joinCommunityBtn.addEventListener("click", async () => {
  const code = joinCodeInput.value.trim();
  if (!code) return alert("Enter a join code");

  await fetchJson("/api/communities.js", {
    method: "PATCH",
    body: JSON.stringify({ join_code: code })
  });

  joinCodeInput.value = "";
  await loadCommunities();
  alert("Joined!");
});

// ===== SWITCH ACTIVE COMMUNITY =====
dropdown.addEventListener("change", () => {
  setCookie("activeCommunity", dropdown.value);
  loadTrains();
});

// ===== REFRESH =====
refreshBtn.addEventListener("click", async () => {
  await loadCommunities();
  await loadTrains();
});

// ===== TRAINS =====
async function loadTrains() {
  const community_id = getCookie("activeCommunity");

  trainsBody.innerHTML = "";

  if (!community_id) {
    trainsBody.innerHTML = `<tr><td colspan="6">Select a community</td></tr>`;
    return;
  }

  const trains = await fetchJson(`/api/trains.js?community_id=${community_id}`);

  trains.forEach(t => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${t.code}</td>
      <td>${t.description || ""}</td>
      <td>${t.direction || ""}</td>
      <td>${t.yard || ""}</td>
      <td>${t.assignments.map(a => `${a.assignment_role}: ${a.username}`).join("<br>")}</td>
      <td><button class="btn view-btn">View Crew</button></td>
    `;

    tr.querySelector(".view-btn").addEventListener("click", () => {
      alert(JSON.stringify(t.assignments, null, 2));
    });

    trainsBody.appendChild(tr);
  });
}

// ===== INVITES =====
async function loadInvites() {
  const invites = await fetchJson("/api/invites.js");

  invitesContainer.innerHTML = "";

  invites.forEach(inv => {
    const row = document.createElement("div");
    row.innerHTML = `
      ${inv.groups.name}
      <button data-id="${inv.group_id}" class="accept-btn">Accept</button>
    `;

    row.querySelector(".accept-btn").addEventListener("click", async () => {
      await fetchJson("/api/invites.js", {
        method: "PATCH",
        body: JSON.stringify({ group_id: inv.group_id, accept: true })
      });
      await loadInvites();
      await loadCommunities();
    });

    invitesContainer.appendChild(row);
  });
}

// ===== LOGOUT =====
logoutBtn.addEventListener("click", async () => {
  await supabase.auth.signOut();
  clearCookie("activeCommunity");
  window.location.href = "/";
});

// ===== BOOT =====
(async () => {
  await loadSession();
  await loadCommunities();
  await loadTrains();
  await loadInvites();
})();
