import fetch from 'node-fetch';
import { supabase } from '../utils/supabaseClient.js';

export default async function handler(req, res) {
  try {
    const { code } = req.query;
    if (!code) return res.status(400).send('Missing code');

    const data = new URLSearchParams();
    data.append('client_id', process.env.DISCORD_CLIENT_ID);
    data.append('client_secret', process.env.DISCORD_CLIENT_SECRET);
    data.append('grant_type', 'authorization_code');
    data.append('code', code);
    data.append('redirect_uri', process.env.DISCORD_REDIRECT_URI);
    data.append('scope', 'identify email guilds');

    // Exchange code for token
    const tokenRes = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      body: data,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) throw new Error(JSON.stringify(tokenData));

    // Get user info
    const userRes = await fetch('https://discord.com/api/users/@me', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` }
    });
    const discordUser = await userRes.json();

    // Upsert user in Supabase
    const { data: userDB } = await supabase
      .from('users')
      .upsert({
        discord_id: discordUser.id,
        username: discordUser.username,
        discriminator: discordUser.discriminator,
        avatar: discordUser.avatar,
        email: discordUser.email
      }, { onConflict: 'discord_id', returning: 'representation' })
      .single();

    // Set session cookie
    res.setHeader('Set-Cookie', `session=${encodeURIComponent(JSON.stringify(userDB))}; Path=/; Max-Age=86400; SameSite=Lax`);

    // Redirect to dashboard
    res.writeHead(302, { Location: '/dashboard.html' });
    res.end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'OAuth callback failed', details: err.message || err });
  }
}
