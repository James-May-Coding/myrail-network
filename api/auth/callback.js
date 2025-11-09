import cookie from 'cookie';
import { supabase } from '../utils/supabaseClient.js';

export default async function handler(req, res) {
  const { code } = req.query;

  try {
    const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.DISCORD_CLIENT_ID,
        client_secret: process.env.DISCORD_CLIENT_SECRET,
        code,
        grant_type: 'authorization_code',
        redirect_uri: process.env.DISCORD_REDIRECT_URI,
        scope: 'identify email'
      })
    });

    const tokenData = await tokenResponse.json();
    if (!tokenData.access_token) throw new Error('No access token');

    const userRes = await fetch('https://discord.com/api/users/@me', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` }
    });
    const discordUser = await userRes.json();

    // Upsert with conflict resolution
    const { data, error } = await supabase
      .from('users')
      .upsert({
        discord_id: discordUser.id,
        username: discordUser.username,
        discriminator: discordUser.discriminator,
        avatar: discordUser.avatar,
        email: discordUser.email
      }, { onConflict: 'discord_id' })
      .select()
      .single();

    if (error) throw error;

    // Set HTTP-only cookie
    res.setHeader('Set-Cookie', cookie.serialize('session', JSON.stringify({
      id: data.id,
      discord_id: data.discord_id,
      username: data.username
    }), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24,
      path: '/'
    }));

    // Redirect to dashboard
    res.writeHead(302, { Location: '/dashboard.html' });
    res.end();

  } catch (err) {
    console.error(
