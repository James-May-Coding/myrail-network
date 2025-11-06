// ===================================================
// ✅ Dashboard.js – Final Clean Version (NO BUILD ERRORS)
// ===================================================

// ---- ✅ Load Supabase ----
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Make sure window._env exists before accessing it
const SUPABASE_URL = window._env?.SUPABASE_URL;
const SUPABASE_ANON_KEY = window._env?.SUPABASE_ANON_KEY;

console.log("✅ Dashboard loaded");
console.log("🔗 SUPABASE_URL:", SUPABASE_URL);
console.log("🔐 ANON KEY EXISTS:", !!SUPABASE_ANON_KEY);

if (!SUPABASE_URL || !SUPABASE_URL.startsWith("https://")) {
    alert("Supabase URL is invalid. Check dashboard.html window._env section.");
    throw new Error("❌ Invalid SUPABASE_URL: " + SUPABASE_URL);
}

if (!SUPABASE_ANON_KEY) {
    alert("Missing Supabase key.");
    throw new Error("❌ Missing SUPABASE_ANON_KEY.");
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ---- ✅ UI Elements ----
const loginStatus = document.getElementById("login-status");
const communitiesSection = document.getElementById("communities-section");
const jobBoardSection = document.getElementById("job-board-section");
const createCommunityBtn = document.getElementById("create-community");
const logoutButton = document.getElementById("logout-btn");

let currentUser = null;
let activeCommunityId = null;

// ===================================================
// ✅ Init - Check Auth & Load UI
// ===================================================
async function initDashboard() {
    const {
        data: { user }
    } = await supabase.auth.getUser();

    console.log("Logged-in user:", user);

    if (!user) {
        window.location.href = "/"; // redirect to login
        return;
    }

    currentUser = user;
    loginStatus.innerHTML = `✅ Logged in as <strong>${user.user_metadata?.full_name || user.email}</strong>`;

    await loadCommunities();
}

initDashboard();

// ===================================================
// ✅ Load communities the user is a part of
// ===================================================
async function loadCommunities() {
    console.log("Loading communities…");

    const { data, error } = await supabase
        .from("community_members")
        .select("community_id, communities (id, name, icon_url)")
        .eq("user_id", currentUser.id);

    if (error) {
        console.error("Error loading communities:", error);
        return;
    }

    communitiesSection.innerHTML = "";

    if (!data.length) {
        communitiesSection.innerHTML = "<p>No communities yet.</p>";
        jobBoardSection.style.display = "none";
        return;
    }

    data.forEach((item) => {
        const c = item.communities;
        const div = document.createElement("div");
        div.className = "community clickable";
        div.innerHTML = `
            <img src="${c.icon_url || "/default-icon.png"}" class="comm-icon"/>
            <span>${c.name}</span>
        `;

        div.onclick = () => {
            activeCommunityId = c.id;
            jobBoardSection.style.display = "block";
            loadJobs();
        };

        communitiesSection.appendChild(div);
    });
}

// ===================================================
// ✅ Load jobs for active community
// ===================================================
async function loadJobs() {
    console.log("Loading jobs for community:", activeCommunityId);

    const jobTable = document.getElementById("job-board-table");
    jobTable.innerHTML = `<tr><th>Train</th><th>Engineer</th><th>Conductor</th></tr>`;

    const { data, error } = await supabase
        .from("jobs")
        .select("*")
        .eq("community_id", activeCommunityId);

    if (error) {
        console.error("Error loading jobs:", error);
        return;
    }

    data.forEach(job => {
        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${job.train_name}</td>
            <td>${job.engineer_name || "-"}</td>
            <td>${job.conductor_name || "-"}</td>
        `;
        jobTable.appendChild(row);
    });
}

// ===================================================
// ✅ Create Community
// ===================================================
createCommunityBtn.addEventListener("click", async () => {
    const name = prompt("Community Name:");
    if (!name) return;

    const guild_id = prompt("Discord Guild ID:");
    if (!guild_id) return;

    const icon_url = prompt("Icon URL (optional):") || null;

    const { data, error } = await supabase
        .from("communities")
        .insert([{ name, guild_id, icon_url }])
        .select();

    if (error) {
        alert("Error: " + error.message);
        return;
    }

    const newComm = data[0];

    await supabase.from("community_members").insert([
        { user_id: currentUser.id, community_id: newComm.id, role: "owner" }
    ]);

    await loadCommunities();
});

// ===================================================
// ✅ Real-Time Updates: Auto-refresh job board
// ===================================================
supabase
    .channel("jobs-changes")
    .on("postgres_changes", { event: "*", schema: "public", table: "jobs" },
        () => {
            console.log("🔄 Job update detected — refreshing");
            if (activeCommunityId) loadJobs();
        }
    )
    .subscribe();

// ===================================================
// ✅ Logout
// ===================================================
logoutButton.addEventListener("click", async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
});
