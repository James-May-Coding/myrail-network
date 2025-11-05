import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export default async function handler(req, res) {
  const user = req.headers['x-user-id'];
  const role = req.headers['x-user-role'];
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  try {
    switch(req.method) {
      case 'GET': {
        const { data, error } = await supabase
          .from('community_members')
          .select('community_id, role, communities(name, pfp)')
          .eq('user_id', user);
        if (error) throw error;
        return res.json(data);
      }
      case 'POST': {
        const { name, guild_id, pfp } = req.body;
        const { data, error } = await supabase
          .from('communities')
          .insert({ name, guild_id, pfp, owner_id: user });
        if (error) throw error;
        return res.json(data);
      }
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
}
