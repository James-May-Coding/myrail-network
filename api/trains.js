import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.REACT_APP_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export default async function handler(req, res) {
  const cookie = req.headers.cookie;
  if (!cookie) return res.status(403).json({ error: 'Not logged in' });
  const match = cookie.match(/session=([^;]+)/);
  if (!match) return res.status(403).json({ error: 'Not logged in' });
  const user = JSON.parse(decodeURIComponent(match[1]));

  if (req.method === 'GET') {
    const { data } = await supabase.from('trains').select('*');
    return res.json(data.map(t => ({ ...t, crew: t.crew || [] })));
  }

  if (req.method === 'POST') {
    const { trainId } = req.body;
    const { data } = await supabase.from('trains').select('*').eq('id', trainId).single();
    const updatedCrew = [...(data.crew || []), user.username];
    await supabase.from('trains').update({ crew: updatedCrew }).eq('id', trainId);
    return res.json({ success: true });
  }

  if (req.method === 'PUT') {
    const { trainId, name, direction } = req.body;
    await supabase.from('trains').update({ name, direction }).eq('id', trainId);
    return res.json({ success: true });
  }

  if (req.method === 'DELETE') {
    const { trainId } = req.body;
    const { data } = await supabase.from('trains').select('*').eq('id', trainId).single();
    const updatedCrew = (data.crew || []).filter(u => u !== user.username);
    await supabase.from('trains').update({ crew: updatedCrew }).eq('id', trainId);
    return res.json({ success: true });
  }
}
