import { supabase } from './_utils/supabaseClient.js';

export default async function handler(req, res) {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) return res.status(401).json({ error: 'Not logged in' });

  const user_id = session.user.id;

  // GET — list invites
  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('community_invites')
      .select('id, community_id, communities(name)')
      .eq('user_id', user_id);

    if (error) return res.status(500).json({ error: error.message });

    return res.json(data);
  }

  // PATCH — accept invite
  if (req.method === 'PATCH') {
    const body = JSON.parse(req.body || '{}');
    if (!body.community_id)
      return res.status(400).json({ error: 'Missing community_id' });

    // Add user to community_members
    await supabase.from('community_members').upsert({
      community_id: body.community_id,
      user_id,
      role: 'member',
      accepted: true
    });

    // Delete invite
    await supabase
      .from('community_invites')
      .delete()
      .eq('community_id', body.community_id)
      .eq('user_id', user_id);

    return res.json({ success: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
