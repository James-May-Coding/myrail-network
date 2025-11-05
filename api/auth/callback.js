// /api/auth/callback.js
import fetch from 'node-fetch';
import { serialize } from 'cookie';
import { createClient } from '@supabase/supabase-js';


const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  try {
    const code = req.query.code;
    if (!code) return res.status(400).send('Missing code');

    // 1️⃣ Exchange code for access token
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
    if (tokenData.error) throw new Error(JSON.stringify(tokenData));

    // 2️⃣ Get user info from Discord
    const userRes = await fetch('https://discord.com/api/users/@me', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` }
    });
    const discordUser = await userRes.json();

    // 3️⃣ Upsert user into Supabase
    const { data, error } = await supabase
      .from('users')
      .upsert({
        discord_id: discordUser.id,
        username: discordUser.username,
        email: discordUser.email
      }, { onConflict: 'discord_id' })
      .select()
      .single();

    if (error) throw error;

    // 4️⃣ Set session cookie
    res.setHeader(
      'Set-Cookie',
      serialize('session', JSON.stringify({ id: data.id, username: data.username }), {
        path: '/',
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 // 1 day
      })
    );

    // 5️⃣ Redirect to dashboard
    res.writeHead(302, { Location: '/dashboard.html' });
    res.end();

  } catch (err) {
    console.error('Callback error:', err);
    res.status(500).send('Internal Server Error');
  }
}
