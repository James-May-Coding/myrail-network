import { supabase } from './supabaseClient.js';

let isRedirecting = false;

// Check Supabase first, fallback to API
async function loadSession() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) return user;

    // fallback to API cookie check
    const res = await fetch('/api/session.js', { credentials: 'include' });
    const data = await res.json();
    return data.user;
  } catch (err) {
    console.error('Session check failed:', err);
    return null;
  }
}

async function initDashboard() {
  const user = await loadSession();

  if (!user && !isRedirecting) {
    isRedirecting = true;
    console.warn('No session found — redirecting...');
    window.location.href = '/';
    return;
  }

  console.log('✅ Logged in as', user?.username || user?.id);
  // continue with loading communities
  await loadCommunities();
}

supabase.auth.onAuthStateChange(async (event, session) => {
  if (event === 'SIGNED_OUT' && !isRedirecting) {
    console.warn('Signed out detected.');
    isRedirecting = true;
    window.location.href = '/';
  } else if (event === 'SIGNED_IN' && session) {
    console.log('Signed in via Supabase, session restored.');
    isRedirecting = false;
  }
});

initDashboard();
