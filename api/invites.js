import cookie from 'cookie';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export default async function handler(req, res) {
  try {
    const cookies = cookie.parse(req.headers.cookie || '');
    const sessionUser = cookies.user ? JSON.parse(cookies.user) : null;
    if (!sessionUser) return res.status(401).json({ error: 'Not authenticated' });

    if (req.method === 'GET') {
      // fetch invites for this user where not yet accepted
      const { data } = await supabase
        .from('group_members')
        .select('group_id, role, groups(name)')
        .eq('user_id', sessionUser.id)
        .is('role', 'invite'); // temporary role = 'invite'
      res.status(200).json(data || []);
    } else if (req.method === 'PATCH') {
      const { group_id, accept } = req.body;
      if (!group_id) return res.status(400).json({ error: 'Missing group_id' });

      const newRole = accept ? 'member' : 'denied';
      await supabase
        .from('group_members')
        .update({ role: newRole })
        .eq('group_id', group_id)
        .eq('user_id', sessionUser.id);

      res.status(200).json({ success: true });
    } else {
      res.setHeader('Allow', ['GET','PATCH']);
      res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch(err) {
    console.error(err);
    res.status(500).json({ error: 'server error', details: err.message });
  }
}
