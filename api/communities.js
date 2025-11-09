import cookie from 'cookie';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export default async function handler(req, res) {
  try {
    const cookies = cookie.parse(req.headers.cookie || '');
    const sessionUser = cookies.user ? JSON.parse(cookies.user) : null;
    if (!sessionUser) return res.status(401).json({ error: 'Not authenticated' });

    if (req.method === 'GET') {
      const { data } = await supabase
        .from('groups')
        .select('*, group_members!inner(role, user_id)')
        .in('group_members.user_id', [sessionUser.id]);
      res.status(200).json(data);
    } else if (req.method === 'POST') {
      const { name, description, discord_guild_id } = req.body;
      if (!name) return res.status(400).json({ error: 'Missing name' });

      const { data: group } = await supabase
        .from('groups')
        .insert({ name, description, discord_guild_id })
        .select()
        .single();

      await supabase.from('group_members').insert({ group_id: group.id, user_id: sessionUser.id, role: 'owner' });

      res.status(200).json(group);
    } else {
      res.setHeader('Allow', ['GET','POST']);
      res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server error', details: err.message });
  }
}
