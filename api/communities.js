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
      const { data, error } = await supabase
        .from('group_members')
        .select('groups(id,name,join_code)')
        .eq('user_id', user.id);
      if (error) throw error;
      return res.status(200).json((data || []).map(r => r.groups));
    }

    if (req.method === 'POST') {
      const body = await req.json();
      const { name } = body;
      const { data, error } = await supabase.from('groups').insert([{ name }]).select().single();
      if (error) throw error;
      await supabase.from('group_members').insert([{ group_id: data.id, user_id: user.id, role: 'owner' }]);
      return res.status(200).json(data);
    }

    if (req.method === 'PATCH') {
      const body = await req.json();
      const { join_code } = body;
      const { data: group, error: findErr } = await supabase.from('groups').select('id,name').eq('join_code', join_code).maybeSingle();
      if (!group) return res.status(404).json({ error: 'Invalid join code' });
      await supabase.from('group_members').insert([{ group_id: group.id, user_id: user.id, role: 'member' }]);
      return res.status(200).json({ success: true, group });
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('communities error', err);
    res.status(500).json({ error: err.message });
  }
}
