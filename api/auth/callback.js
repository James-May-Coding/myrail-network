import fetch from 'node-fetch';
import { serialize } from 'cookie';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export default async function handler(req, res) {
  try {
    const code = req.query.code;
    if (!code) return res.status(400).send('Missing code');

    // Exchange code for token
    const tokenRes = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.DISCORD_CLIENT_ID,
        client_secret: process.env.DISCORD_CLIENT_SECRET,
        grant_type: 'authorization_code',
        code,
        redirect_uri: process.env.DISCORD_REDIRECT_URI,
      }),
    });
    const tokenData = await tokenRes.json();
    const userRes = await fetch('https://discord.com/api/users/@me', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` }
    });
    const userData = await userRes.json();

    // Upsert user in Supabase
    const { data: user } = await supabase
      .from('users')
      .upsert({
        discord_id: userData.id,
        username: userData.username,
        discriminator: userData.discriminator,
        avatar: userData.avatar,
        email: userData.email
      }, { onConflict: 'discord_id', returning: 'representation' })
      .single();

    // Set session cookie
    res.setHeader('Set-Cookie', serialize('user', JSON.stringify({ id: user.id, discord_id: user.discord_id, username: user.username }), {
      path: '/',
      httpOnly: true,
      maxAge: 60*60*24*7, // 7 days
    }));

    res.redirect('/dashboard.html');
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'OAuth callback failed', details: err.message });
  }
}
