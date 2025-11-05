import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export default async function handler(req, res) {
  const user = req.headers['x-user-id'];
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  try {
    switch(req.method) {
      case 'GET': {
        const { data, error } = await supabase
          .from('community_invites')
          .select('id, community_id, status, communities(name, pfp)')
          .eq('user_id', user)
          .eq('status', 'pending');
        if (error) throw error;
        return res.json(data);
      }
      case 'PATCH': {
        const { id, status } = req.body;
        if (!id || !status) return res.status(400).json({ error: 'Missing fields' });
        const { data, error } = await supabase.from('community_invites').update({ status }).eq('id', id);
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
