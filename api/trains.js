import cookie from 'cookie';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export default async function handler(req, res) {
  try {
    const cookies = cookie.parse(req.headers.cookie || '');
    const sessionUser = cookies.user ? JSON.parse(cookies.user) : null;
    if (!sessionUser) return res.status(401).json({ error: 'Not authenticated' });

    if (req.method === 'GET') {
      // fetch trains for user's groups
      const { data: groups } = await supabase
        .from('group_members')
        .select('group_id')
        .eq('user_id', sessionUser.id);

      const groupIds = groups.map(g => g.group_id);
      const { data: trains } = await supabase
        .from('trains')
        .select('*, assignments!left(*)')
        .in('group_id', groupIds);

      // attach whether current user can edit/claim
      const enriched = trains.map(t => {
        return {
          ...t,
          assignments: t.assignments || [],
          can_edit: true // optional: can add role check here
        };
      });

      res.status(200).json(enriched);
    } else if (req.method === 'POST') {
      const { group_id, code, description, direction, yard } = req.body;
      const { data } = await supabase
        .from('trains')
        .insert({ group_id, code, description, direction, yard })
        .select()
        .single();
      res.status(200).json(data);
    } else if (req.method === 'PATCH') {
      const { action, train_id, assignment_role } = req.body;
      if (action === 'claim') {
        await supabase.from('assignments').insert({
          train_id,
          user_id: sessionUser.id,
          assignment_role: assignment_role || 'E'
        });
        res.status(200).json({ success: true });
      } else {
        res.status(400).json({ error: 'Unknown action' });
      }
    } else {
      res.setHeader('Allow', ['GET','POST','PATCH']);
      res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server error', details: err.message });
  }
}
