import { supabase } from '../../supabaseClient.js';

export default async function handler(req, res) {
  const code = req.query.code;
  if (!code) return res.status(400).json({ error: 'No code provided' });

  const params = new URLSearchParams({
    client_id: process.env.DISCORD_CLIENT_ID,
    client_secret: process.env.DISCORD_CLIENT_SECRET,
    grant_type: 'authorization_code',
    code,
    redirect_uri: process.env.DISCORD_REDIRECT_URI,
    scope: 'identify email'
  });

  const tokenRes = await fetch('https://discord.com/api/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString()
  });

  if (!tokenRes.ok) return res.status(500).json({ error: 'Failed to fetch token' });

  const tokenData = await tokenRes.json();

  const userRes = await fetch('https://discord.com/api/users/@me', {
    headers: { Authorization: `Bearer ${tokenData.access_token}` }
  });

  if (!userRes.ok) return res.status(500).json({ error: 'Failed to fetch user' });

  const user = await userRes.json();
  if (!user.id) return res.status(500).json({ error: 'OAuth callback failed', details: user });

  // Save or update in Supabase
  await supabase.from('users').upsert({
    discord_id: user.id,
    username: user.username,
    discriminator: user.discriminator,
    avatar: user.avatar,
    email: user.email
  }).eq('discord_id', user.id);

  // Set session cookie
  res.setHeader('Set-Cookie', `user=${JSON.stringify(user)}; HttpOnly; Path=/; Max-Age=86400`);
  res.redirect('/dashboard.html');
}
