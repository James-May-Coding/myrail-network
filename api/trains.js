import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  try {
    const user = req.headers['x-user-id'];
    const role = req.headers['x-user-role']; // sent from frontend cookie/session

    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    switch(req.method) {
      case 'GET': {
        // Admin sees all, staff/member sees only allowed trains
        let query = supabase.from('trains').select('*');
        if (role !== 'admin') {
          query = query.eq('status', 'open'); // members/staff see only open trains
        }
        const { data, error } = await query;
        if (error) throw error;
        return res.json(data);
      }
      case 'PATCH': {
        const { id, updates } = req.body;
        if (!id) return res.status(400).json({ error: 'Missing train ID' });
        if (role !== 'admin') return res.status(403).json({ error: 'Forbidden' });

        const { data, error } = await supabase.from('trains').update(updates).eq('id', id);
        if (error) throw error;
        return res.json(data);
      }
      case 'POST': {
        if (role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
        const { code, route } = req.body;
        const { data, error } = await supabase.from('trains').insert({ code, route });
        if (error) throw error;
        return res.json(data);
      }
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
}
