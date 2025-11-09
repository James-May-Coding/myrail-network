// /api/communities.js
import { supabase } from './utils/supabaseClient.js';

export default async function handler(req, res) {
  try {
    const userId = req.headers['x-user-id'];
    if (!userId) return res.status(401).json({ error: 'Not logged in' });

    // Fetch groups the user belongs to
    const { data, error } = await supabase
      .from('group_members')
      .select('group_id, groups(name, discord_guild_id)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.status(200).json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server error' });
  }
}
