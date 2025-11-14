import { supabase } from './_utils/supabaseClient.js';

export default async function handler(req, res) {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) return res.status(401).json({ error: 'Not logged in' });

  const user_id = session.user.id;

  const community_id = req.query.community_id;

  if (!community_id)
    return res.status(400).json({ error: 'Missing community_id' });

  // GET — list trains
  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('trains')
      .select('id, code, description, direction, yard')
      .eq('community_id', community_id);

    if (error) return res.status(500).json({ error: error.message });
    return res.json(data);
  }

  // POST — create train
  if (req.method === 'POST') {
    const body = JSON.parse(req.body || '{}');

    const { data, error } = await supabase
      .from('trains')
      .insert({
        community_id,
        code: body.code,
        description: body.description,
        direction: body.direction,
        yard: body.yard
      })
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    return res.json(data);
  }

  // PATCH — update train
  if (req.method === 'PATCH') {
    const body = JSON.parse(req.body || '{}');

    const { data, error } = await supabase
      .from('trains')
      .update({
        code: body.code,
        description: body.description,
        direction: body.direction,
        yard: body.yard
      })
      .eq('id', body.id)
      .eq('community_id', community_id)
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    return res.json(data);
  }

  // DELETE — remove train
  if (req.method === 'DELETE') {
    const body = JSON.parse(req.body || '{}');

    const { error } = await supabase
      .from('trains')
      .delete()
      .eq('id', body.id)
      .eq('community_id', community_id);

    if (error) return res.status(500).json({ error: error.message });
    return res.json({ success: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
