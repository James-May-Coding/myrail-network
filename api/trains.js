import { supabase } from './utils/supabaseClient.js';

function parseCookies(header) {
  return Object.fromEntries((header || '').split('; ').map(c => {
    const [k,v] = c.split('='); return [k,v];
  }));
}

export default async function handler(req, res) {
  try {
    const cookies = parseCookies(req.headers.cookie || '');
    const token = cookies['sb-access-token'];
    if (!token) return res.status(401).json({ error: 'Not logged in' });

    const { data: userData } = await supabase.auth.getUser(token);
    const user = userData?.user;
    if (!user) return res.status(401).json({ error: 'Not logged in' });

    if (req.method === 'GET') {
      const community_id = req.query.community_id;
      if (!community_id) return res.status(400).json({ error: 'community_id required' });

      const { data, error } = await supabase
        .from('trains')
        .select(`
           *,
           assignments ( id, assignment_role, joined_at, user_id, users: user_id ( id, username, email ) )
        `)
        .eq('group_id', community_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      // normalize assignments to expose username/email
      const out = (data || []).map(t => {
        t.assignments = (t.assignments || []).map(a => ({
          id: a.id,
          assignment_role: a.assignment_role,
          joined_at: a.joined_at,
          user_id: a.user_id,
          username: a.users?.username,
          email: a.users?.email
        }));
        return t;
      });
      return res.status(200).json(out);
    }

    // POST actions: claim/unclaim/create/edit/delete via body.action
    if (req.method === 'POST') {
      const body = await req.json();
      const action = body.action || 'claim';

      if (action === 'claim') {
        const { train_id, role } = body;
        await supabase.from('assignments').insert([{ train_id, user_id: user.id, assignment_role: role || 'E' }]);
        return res.status(200).json({ success: true });
      }

      if (action === 'unclaim') {
        const { train_id } = body;
        await supabase.from('assignments').delete().eq('train_id', train_id).eq('user_id', user.id);
        return res.status(200).json({ success: true });
      }

      if (action === 'create') {
        const payload = { group_id: body.group_id, code: body.code, description: body.description || null, direction: body.direction || null, yard: body.yard || null };
        const { data, error } = await supabase.from('trains').insert([payload]).select().single();
        if (error) throw error;
        return res.status(200).json(data);
      }

      if (action === 'update') {
        const { train_id } = body;
        await supabase.from('trains').update(body.payload).eq('id', train_id);
        return res.status(200).json({ success: true });
      }

      if (action === 'delete') {
        await supabase.from('trains').delete().eq('id', body.train_id);
        return res.status(200).json({ success: true });
      }
    }

    res.status(405).json({ error: 'Method not allowed' });

  } catch (err) {
    console.error('trains error', err);
    res.status(500).json({ error: err.message });
  }
}
