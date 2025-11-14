import { supabase } from './utils/supabaseClient.js';

export default async function handler(req, res) {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) return res.status(401).json({ error: 'Not logged in' });

  const user_id = session.user.id;

  // GET — list communities
  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('community_members')
      .select('community_id, communities(name)')
      .eq('user_id', user_id)
      .eq('accepted', true);

    if (error) return res.status(500).json({ error: error.message });
    return res.json(data.map(x => ({
      id: x.community_id,
      name: x.communities.name
    })));
  }

  // POST — create new community
  if (req.method === 'POST') {
    const body = JSON.parse(req.body || '{}');

    if (!body.name) return res.status(400).json({ error: 'Missing name' });

    const join_code = Math.random().toString(36).substring(2, 8).toUpperCase();

    const { data, error } = await supabase
      .from('communities')
      .insert({
        name: body.name,
        join_code,
        owner_id: user_id
      })
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });

    // Auto add creator as admin
    await supabase.from('community_members').insert({
      community_id: data.id,
      user_id,
      role: 'admin',
      accepted: true
    });

    return res.json(data);
  }

  // PATCH — join via join_code
  if (req.method === 'PATCH') {
    const body = JSON.parse(req.body || '{}');
    if (!body.join_code) return res.status(400).json({ error: 'Missing code' });

    const { data: community, error: e1 } = await supabase
      .from('communities')
      .select('id')
      .eq('join_code', body.join_code)
      .single();

    if (e1 || !community) return res.status(404).json({ error: 'Invalid code' });

    await supabase.from('community_members').upsert({
      community_id: community.id,
      user_id,
      role: 'member',
      accepted: true
    });

    return res.json({ success: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
