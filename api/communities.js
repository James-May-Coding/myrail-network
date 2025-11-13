// /api/communities.js
import { supabase } from '../utils/supabaseClient.js';

export default async function handler(req, res) {
  try {
    // ✅ Get all communities
    if (req.method === 'GET') {
      const { data, error } = await supabase
        .from('communities')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return res.status(200).json(data);
    }

    // ✅ Create community
    if (req.method === 'POST') {
      const { name, owner_id } = req.body;
      if (!name || !owner_id)
        return res.status(400).json({ error: 'Missing name or owner_id' });

      const code = Math.random().toString(36).substring(2, 8).toUpperCase();

      const { data, error } = await supabase
        .from('communities')
        .insert([{ name, owner_id, code }])
        .select();

      if (error) throw error;
      return res.status(200).json(data[0]);
    }

    // ✅ Join via code
    if (req.method === 'PUT') {
      const { user_id, code } = req.body;
      if (!user_id || !code)
        return res.status(400).json({ error: 'Missing user_id or code' });

      const { data: community, error: findError } = await supabase
        .from('communities')
        .select('id')
        .eq('code', code)
        .single();

      if (findError || !community)
        return res.status(404).json({ error: 'Invalid community code' });

      const { error: joinError } = await supabase
        .from('memberships')
        .insert([{ user_id, community_id: community.id }]);

      if (joinError) throw joinError;
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Error in /api/communities.js:', error);
    return res.status(500).json({
      error: 'server error',
      details: error.message || error,
    });
  }
}
