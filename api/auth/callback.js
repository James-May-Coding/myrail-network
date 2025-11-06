// api/auth/callback.js
import fetch from 'node-fetch';
import { getSupabaseService, setSessionCookie } from '../_utils.js';

export default async function handler(req,res) {
  try {
    const code = req.query.code;
    if(!code) return res.status(400).send('Missing code');
    // Exchange code for token with Discord
    const params = new URLSearchParams({
      client_id: process.env.DISCORD_CLIENT_ID,
      client_secret: process.env.DISCORD_CLIENT_SECRET,
      grant_type: 'authorization_code',
      code,
      redirect_uri: process.env.DISCORD_REDIRECT_URI
    });
    const tokenRes = await fetch('https://discord.com/api/oauth2/token', { method:'POST', headers:{ 'Content-Type':'application/x-www-form-urlencoded' }, body: params });
    const tokenData = await tokenRes.json();
    if(tokenData.error) return res.status(400).send(JSON.stringify(tokenData));
    const userRes = await fetch('https://discord.com/api/users/@me', { headers: { Authorization: `Bearer ${tokenData.access_token}` }});
    const discordUser = await userRes.json();
    // Upsert into Supabase users table
    const supa = getSupabaseService();
    const { data, error } = await supa.from('users').upsert({ discord_id: discordUser.id, username: discordUser.username, email: discordUser.email }, { onConflict: 'discord_id' }).select().single();
    if(error) {
      console.error('Supabase upsert error', error);
      return res.status(500).send('DB error');
    }
    // set session cookie (only user id and username)
    setSessionCookie(res, { id: data.id, username: data.username, discord_id: discordUser.id });
    // redirect to dashboard
    res.writeHead(302, { Location: '/dashboard.html' });
    res.end();
  } catch (e) {
    console.error(e);
    res.status(500).send('Internal Server Error');
  }
}
