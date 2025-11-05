import fetch from 'node-fetch';
import { serialize } from 'cookie';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.REACT_APP_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export default async function handler(req, res) {
  const { pathname } = new URL(req.url, `http://${req.headers.host}`);
  
  if (pathname.endsWith('/discord')) {
    const clientId = process.env.DISCORD_CLIENT_ID;
    const redirect = encodeURIComponent(process.env.DISCORD_REDIRECT_URI);
    const scope = encodeURIComponent('identify email');
    res.writeHead(302, { Location: `https://discord.com/api/oauth2/authorize?client_id=${clientId}&redirect_uri=${redirect}&response_type=code&scope=${scope}` });
    return res.end();
  }

  if (pathname.endsWith('/callback')) {
    const { code } = req.query;
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
    const userRes = await fetch('https://discord.com/api/users/@me', { headers: { Authorization: `Bearer ${tokenData.access_token}` } });
    const discordUser = await userRes.json();

    const { data } = await supabase.from('users').upsert({
      discord_id: discordUser.id,
      username: discordUser.username,
      email: discordUser.email
    }, { onConflict: 'discord_id' }).select().single();

    res.setHeader('Set-Cookie', serialize('session', JSON.stringify({ id: data.id, username: data.username }), { path: '/', httpOnly: true }));
    res.writeHead(302, { Location: '/dashboard.html' });
    return res.end();
  }

  if (pathname.endsWith('/session')) {
    const cookie = req.headers.cookie;
    if (!cookie) return res.json({ user: null });
    const match = cookie.match(/session=([^;]+)/);
    if (!match) return res.json({ user: null });
    return res.json({ user: JSON.parse(decodeURIComponent(match[1])) });
  }

  res.status(404).send('Not found');
}
