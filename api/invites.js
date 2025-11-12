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
        .select('group_id, role, groups(name)')
        .eq('user_id', user.id)
        .in('role', ['invite','pending']);
      if (error) throw error;
      return res.status(200).json(data);
    }

    if (req.method === 'PATCH') {
      const body = await req.json();
      const { group_id, accept } = body;
      if (accept) {
        await supabase.from('group_members').update({ role: 'member' }).eq('group_id', group_id).eq('user_id', user.id);
      } else {
        await supabase.from('group_members').delete().eq('group_id', group_id).eq('user_id', user.id);
      }
      return res.status(200).json({ success: true });
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('invites error', err);
    res.status(500).json({ error: err.message });
  }
}
