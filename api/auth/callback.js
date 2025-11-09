import { supabase } from '../utils/supabaseClient.js';

export default async function handler(req, res) {
  try {
    const { code } = req.query;
    if (!code) return res.status(400).json({ error: 'Missing code' });

    // Exchange code for Discord token
    const discordRes = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.DISCORD_CLIENT_ID,
        client_secret: process.env.DISCORD_CLIENT_SECRET,
        code,
        grant_type: 'authorization_code',
        redirect_uri: process.env.DISCORD_REDIRECT_URI
      })
    });
    const tokenData = await discordRes.json();
    if (!tokenData.access_token) throw new Error('Invalid token');

    // Get Discord user
    const userRes = await fetch('https://discord.com/api/users/@me', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` }
    });
    const discordUser = await userRes.json();

    // Upsert user in Supabase
    const { data: userDB, error } = await supabase
      .from('users')
      .upsert({
        discord_id: discordUser.id,
        username: discordUser.username,
        discriminator: discordUser.discriminator,
        avatar: discordUser.avatar,
        email: discordUser.email
      }, { onConflict: 'discord_id', returning: 'representation' })
      .single();

    if (error) throw error;

    // Set JS-readable session cookie
    res.setHeader('Set-Cookie', `session=${encodeURIComponent(JSON.stringify(userDB))}; Path=/; Max-Age=86400; SameSite=Lax`);
    res.redirect('/dashboard.html');

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'OAuth callback failed', details: err.message });
  }
}
