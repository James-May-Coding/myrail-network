import { supabase } from './supabaseClient.js';

const loginBtn = document.getElementById('login-btn');

// set cookie helper
function setCookie(name, value, days = 7) {
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax;`;
}

// Listen for Supabase auth state changes and write tokens to cookies on sign-in.
// This prevents the race where frontend redirects before supabase restores the session.
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_IN' && session) {
    try {
      setCookie('sb-access-token', session.access_token, 7);
      setCookie('sb-refresh-token', session.refresh_token, 7);
      // optional small user cookie for server-side convenience
      if (session.user?.id) setCookie('user_id', session.user.id, 7);
      // redirect to dashboard once cookies are set
      window.location.href = '/dashboard.html';
    } catch (e) {
      console.error('Failed to set session cookies', e);
    }
  }
});

// Trigger OAuth via Supabase client. redirectTo dashboard so we handle session there.
loginBtn.addEventListener('click', async () => {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'discord',
    options: { redirectTo: `${window.location.origin}/dashboard.html` }
  });
  if (error) {
    console.error('OAuth start error', error);
    alert('Login failed: ' + error.message);
  }
});
