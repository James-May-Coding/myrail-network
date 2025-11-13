import { supabase } from '../utils/supabaseClient.js';

export default async function handler(req, res) {
  try {
    // Normalize method
    const method = req.method?.toUpperCase();

    // Safely parse JSON body
    let body = {};
    if (req.headers['content-type']?.includes('application/json')) {
      try {
        const text = await new Promise((resolve) => {
          let data = '';
          req.on('data', chunk => data += chunk);
          req.on('end', () => resolve(data));
        });
        if (text) body = JSON.parse(text);
      } catch {
        // ignore malformed JSON
      }
    }

    // --- GET communities ---
    if (method === 'GET') {
      const { data, error } = await supabase.from('communities').select('*');
      if (error) throw error;
      return res.status(200).json(data);
    }

    // --- POST create community ---
    if (method === 'POST') {
      const { name, code } = body;
      if (!name || !code)
        return res.status(400).json({ error: 'Missing name or code' });

      const { data, error } = await supabase
        .from('communities')
        .insert([{ name, code }])
        .select()
        .single();

      if (error) throw error;
      return res.status(200).json(data);
    }

    // --- PATCH join via code ---
    if (method === 'PATCH') {
      const { join_code } = body;
      if (!join_code)
        return res.status(400).json({ error: 'Missing join code' });

      const { data, error } = await supabase
        .from('communities')
        .select('*')
        .eq('code', join_code)
        .single();

      if (error || !data)
        return res.status(404).json({ error: 'Community not found' });

      return res.status(200).json({ message: 'Joined community', data });
    }

    // --- Fallback ---
    return res.status(405).json({ error: 'method not allowed' });
  } catch (err) {
    console.error('communities error:', err);
    return res.status(500).json({ error: 'A server error has occurred', details: err.message });
  }
}
