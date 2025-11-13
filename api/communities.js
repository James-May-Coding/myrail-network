import { supabase } from '../utils/supabaseClient.js';

export default async function handler(req, res) {
  try {
    const method = req.method?.toUpperCase();

    // --- GET: List communities ---
    if (method === 'GET') {
      const { data, error } = await supabase.from('communities').select('*');
      if (error) throw error;
      return res.status(200).json(data);
    }

    // --- POST: Create community ---
    if (method === 'POST') {
      let body = {};
      try {
        body = typeof req.body === 'object' ? req.body : JSON.parse(req.body);
      } catch {
        return res.status(400).json({ error: 'Invalid JSON body' });
      }

      const { name } = body;
      if (!name) return res.status(400).json({ error: 'Missing name' });

      // Auto-generate join code
      const code = Math.random().toString(36).substring(2, 8).toUpperCase();

      const { data, error } = await supabase
        .from('communities')
        .insert([{ name, code }])
        .select()
        .single();

      if (error) throw error;
      return res.status(200).json({ message: 'Community created', data });
    }

    // --- PATCH: Join via join code ---
    if (method === 'PATCH') {
      let body = {};
      try {
        body = typeof req.body === 'object' ? req.body : JSON.parse(req.body);
      } catch {
        return res.status(400).json({ error: 'Invalid JSON body' });
      }

      const { join_code } = body;
      if (!join_code)
        return res.status(400).json({ error: 'Missing join code' });

      const { data, error } = await supabase
        .from('communities')
        .select('*')
        .eq('code', join_code)
        .maybeSingle();

      if (error) throw error;
      if (!data)
        return res.status(404).json({ error: 'Community not found' });

      return res.status(200).json({ message: 'Joined community', data });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('communities.js failed:', err);
    return res.status(500).json({
      error: 'Server error',
      details: err.message,
    });
  }
}
