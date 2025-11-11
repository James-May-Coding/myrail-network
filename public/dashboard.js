import { supabase } from './supabaseClient.js';

let sessionChecked = false;

// Simple cookie helper
function eraseCookie(name) {
  document.cookie = `${name}=; Max-Age=0; path=/;`;
}

async function getSessionSafe() {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session && session.user) return session.user;

    const res = await fetch('/api/session.js', { credentials: 'include' });
    const data = await res.json();
    return data.user || null;
  } catch (e) {
    console.error('Session load failed', e);
    return null;
  }
}

async function init() {
  const user = await getSessionSafe();

  if (!user) {
    console.warn('No active session — redirecting to login...');
    window.location.href = '/';
    return;
  }

  console.log('✅ Logged in as', user.email || user.user_metadata?.name);
  document.getElementById('dashboard-content').innerHTML = `
    <h2>Welcome, ${user.email || user.user_metadata?.name}</h2>
    <p>You are now logged into the FEC Railways Dashboard.</p>
  `;

  sessionChecked = true;
}

// Watch Supabase auth events
supabase.auth.onAuthStateChange(async (event, session) => {
  if (!session && sessionChecked) {
    console.warn('Session ended, logging out.');
    eraseCookie('sb-access-token');
    eraseCookie('sb-refresh-token');
    window.location.href = '/';
  }
});

init();
