import { supabase } from './supabaseClient.js';

// Cookie helpers
function setCookie(name, value, days = 7) {
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; Secure; SameSite=Lax`;
}
function getCookie(name) {
  return document.cookie.split('; ').reduce((r, v) => {
    const parts = v.split('=');
    return parts[0] === name ? decodeURIComponent(parts[1]) : r;
  }, '');
}

// Login button handler
document.getElementById('login').addEventListener('click', async () => {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'discord',
    options: { redirectTo: `https://myrail-network.vercel.app/dashboard.html` }
  });
  if (error) alert(error.message);
});

// On load: check if session or cookies exist
(async () => {
  const { data } = await supabase.auth.getSession();
  if (data.session) {
    setCookie('access_token', data.session.access_token);
    setCookie('refresh_token', data.session.refresh_token);
    window.location.href = '/dashboard.html';
    return;
  }

  const access = getCookie('access_token');
  const refresh = getCookie('refresh_token');
  if (access && refresh) {
    await supabase.auth.setSession({ access_token: access, refresh_token: refresh });
    window.location.href = '/dashboard.html';
  }
})();
