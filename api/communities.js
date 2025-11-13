import { supabase } from '../utils/supabaseClient.js';

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const { data, error } = await supabase.from('communities').select('*');
      if (error) throw error;
      res.status(200).json(data);
    }

    else if (req.method === 'POST') {
      const buffers = [];
      for await (const chunk of req) buffers.push(chunk);
      const body = JSON.parse(Buffer.concat(buffers).toString());
      const { name, code } = body;

      if (!name) return res.status(400).json({ error: 'Missing name' });
      if (!code) return res.status(400).json({ error: 'Missing code' });

      const { data, error } = await supabase.from('communities').insert([{ name, code }]);
      if (error) throw error;
      res.status(200).json({ success: true, data });
    }

    else if (req.method === 'PUT') {
      const buffers = [];
      for await (const chunk of req) buffers.push(chunk);
      const body = JSON.parse(Buffer.concat(buffers).toString());
      const { code } = body;

      if (!code) return res.status(400).json({ error: 'Missing code' });

      const { data, error } = await supabase
        .from('communities')
        .select('*')
        .eq('code', code)
        .single();

      if (error || !data) return res.status(404).json({ error: 'Invalid community code' });

      // Optionally handle joining logic (e.g. add to members table)
      res.status(200).json({ success: true, joined: data });
    }

    else {
      res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (err) {
    console.error('Communities error:', err);
    res.status(500).json({ error: 'server error', details: err.message });
  }
}
