import fetch from 'node-fetch';
import { serialize } from 'cookie';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  // parse the path
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname;

  // -------------------------------
  // /api/auth/discord -> login redirect
  // -------------------------------
  if (pathname === '/api/auth/discord') {
    const clientId = process.env.DISCORD_CLIENT_ID;
    const redirect = encodeURIComponent(process.env.DISCORD_REDIRECT_URI);
    const scope = encodeURIComponent('identify email');
    const oauthUrl = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&redirect_uri=${redirect}&response_type=code&scope=${scope}`;
    
    res.writeHead(302, { Location: oauthUrl });
    return res.end();
  }

  // -------------------------------
  // /api/auth/callback -> handle Discord OAuth
  // -------------------------------
  if (pathname === '/api/auth/callback') {
    const { code } = req.query;
    if (!code) return res.status(400).send('Missing code');

    // exchange code for access token
    const tokenRes = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.DISCORD_CLIENT_ID,
        client_secret: process.env.DISCORD_CLIENT_SECRET,
        grant_type: 'authorization_code',
        code,
        redirect_uri: process.env.DISCORD_REDIRECT_URI,
        scope: 'identify email'
      })
    });
    const tokenData = await tokenRes.json();

    // get user info
    const userRes = await fetch('https://discord.com/api/users/@me', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` }
    });
    const discordUser = await userRes.json();

    // upsert into Supabase
    const { data } = await supabase.from('users').upsert({
      discord_id: discordUser.id,
      username: discordUser.username,
      email: discordUser.email
    }, { onConflict: 'discord_id' }).select().single();

    // set cookie
    res.setHeader(
      'Set-Cookie',
      serialize('session', JSON.stringify({ id: data.id, username: data.username }), {
        path: '/',
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 // 1 day
      })
    );

    // redirect to dashboard
    res.writeHead(302, { Location: '/dashboard.html' });
    return res.end();
  }

  // -------------------------------
  // /api/auth/session -> get current session
  // -------------------------------
  if (pathname === '/api/auth/session') {
    const cookie = req.headers.cookie;
    if (!cookie) return res.json({ user: null });
    const match = cookie.match(/session=([^;]+)/);
    if (!match) return res.json({ user: null });
    return res.json({ user: JSON.parse(decodeURIComponent(match[1])) });
  }

  // 404 fallback
  res.status(404).send('Not found');
}
