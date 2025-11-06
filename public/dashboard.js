// ✅ Load Supabase client from CDN (works in plain/public deployments)
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

// ✅ Load project environment variables passed via injected script tag
const SUPABASE_URL = window._env?.SUPABASE_URL;
const SUPABASE_ANON_KEY = window._env?.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
	console.error("❌ Missing Supabase environment variables!");
	alert("Supabase config missing — contact admin.");
}

// ✅ init supabase
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);


// 🎯 PAGE ELEMENTS
const communitiesList = document.getElementById("communitiesList");
const invitesList = document.getElementById("invitesList");
const createCommunityBtn = document.getElementById("createCommunityBtn");
const logoutBtn = document.getElementById("logoutBtn");

// ✅ Get Current Auth User (session)
async function getUser() {
	const { data } = await supabase.auth.getUser();
	return data.user;
}


// ✅ Fetch Communities Assigned To User
async function loadCommunities() {
	const user = await getUser();
	if (!user) return;

	const { data, error } = await supabase
		.from("communities")
		.select("*")
		.eq("owner_id", user.id);

	if (error) console.error(error);

	communitiesList.innerHTML = "";

	data.forEach(comm => {
		let div = document.createElement("div");
		div.className = "community-card";
		div.innerHTML = `
			<img src="${comm.icon_url || '/placeholder.png'}" class="icon"/>
			<h3>${comm.name}</h3>
			<p>Guild ID: ${comm.guild_id}</p>
		`;
		communitiesList.appendChild(div);
	});
}


// ✅ Fetch Community Invites
async function loadInvites() {
	const user = await getUser();
	if (!user) return;

	const { data, error } = await supabase
		.from("community_invites")
		.select("*, communities(name, icon_url)")
		.eq("invitee_id", user.id);

	if (error) return console.error(error);

	invitesList.innerHTML = "";

	data.forEach(invite => {
		let div = document.createElement("div");
		div.className = "invite-card";
		div.innerHTML = `
			<img src="${invite.communities.icon_url || '/placeholder.png'}" class="icon"/>
			<p>${invite.communities.name}</p>
			<button class="accept" data-id="${invite.id}">Accept</button>
			<button class="deny" data-id="${invite.id}">Deny</button>
		`;
		invitesList.appendChild(div);
	});
}


// ✅ Add Real-Time Listener — auto update dashboard
supabase
	.channel("realtime-communities")
	.on("postgres_changes", { event: "*", schema: "public" }, payload => {
		loadCommunities();
		loadInvites();
	})
	.subscribe();


// ✅ Accept / Deny Invite
invitesList.addEventListener("click", async e => {
	if (!e.target.dataset.id) return;
	const id = e.target.dataset.id;

	if (e.target.classList.contains("accept")) {
		await supabase.from("community_members").insert({
			invite_id: id
		});
	}

	await supabase.from("community_invites").delete().eq("id", id);
	loadInvites();
	loadCommunities();
});


// ✅ Create Community
createCommunityBtn.addEventListener("click", async () => {
	const name = prompt("Enter community name:");
	const guildID = prompt("Enter Guild ID:");
	const icon = prompt("Image URL? (optional)");

	if (!name || !guildID) return alert("Missing data!");

	const user = await getUser();

	await supabase.from("communities").insert({
		name,
		guild_id: guildID,
		icon_url: icon,
		owner_id: user.id
	});

	loadCommunities();
});


// ✅ Logout
logoutBtn.addEventListener("click", async () => {
	await supabase.auth.signOut();
	window.location = "/"; // Back to home
});


// ✅ Initial Load
loadCommunities();
loadInvites();
