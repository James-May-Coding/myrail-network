import { supabase } from './utils/supabaseClient.js';

export default async function handler(req, res) {
  try {
    const token = req.headers.cookie?.match(/sb-access-token=([^;]+)/)?.[1];
    if (!token) return res.status(401).json({ error: 'not logged in' });

    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError) throw userError;

    // ✅ GET: fetch user’s communities
    if (req.method === 'GET') {
      const { data, error } = await supabase
        .from('communities')
        .select('id, name, members')
        .contains('members', [user.id]);

      if (error) throw error;
      return res.status(200).json(data);
    }

    // ✅ PATCH: join via code
    if (req.method === 'PATCH') {
      // FIX: properly parse JSON for Node/Vercel API
      const buffers = [];
      for await (const chunk of req) buffers.push(chunk);
      const body = JSON.parse(Buffer.concat(buffers).toString() || '{}');
      const { join_code } = body;

      if (!join_code) return res.status(400).json({ error: 'missing join_code' });

      const { data: community, error: findError } = await supabase
        .from('communities')
        .select('*')
        .eq('join_code', join_code)
        .single();

      if (findError || !community) {
        return res.status(404).json({ error: 'Invalid join code' });
      }

      const currentMembers = community.members || [];
      const newMembers = currentMembers.includes(user.id)
        ? currentMembers
        : [...currentMembers, user.id];

      const { error: updateError } = await supabase
        .from('communities')
        .update({ members: newMembers })
        .eq('id', community.id);

      if (updateError) throw updateError;

      return res.status(200).json({ success: true, community: community.name });
    }

    res.status(405).json({ error: 'method not allowed' });
  } catch (err) {
    console.error('communities error:', err.message);
    res.status(500).json({ error: 'server error', details: err.message });
  }
}
