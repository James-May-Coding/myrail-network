// /api/communities.js
import { supabase } from './utils/supabaseClient.js';

export default async function handler(req, res) {
  try {
    const method = req.method.toUpperCase();

    if (method === 'GET') {
      // Fetch all communities
      const { data, error } = await supabase
        .from('communities')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return res.status(200).json(data);
    }

    if (method === 'POST') {
      const body = await req.json?.() || (await getBody(req));
      const { name, description } = body;

      if (!name) {
        return res.status(400).json({ error: 'Missing name' });
      }

      const joinCode = Math.random().toString(36).substring(2, 8).toUpperCase();

      const { data, error } = await supabase
        .from('communities')
        .insert([{ name, description, join_code: joinCode }])
        .select()
        .single();

      if (error) throw error;
      return res.status(201).json(data);
    }

    if (method === 'PATCH') {
      const body = await req.json?.() || (await getBody(req));
      const { join_code } = body;
      if (!join_code) return res.status(400).json({ error: 'Missing join_code' });

      // Find the community by code
      const { data: community, error: findErr } = await supabase
        .from('communities')
        .select('*')
        .eq('join_code', join_code)
        .single();

      if (findErr || !community) return res.status(404).json({ error: 'Invalid join code' });

      return res.status(200).json({ success: true, community });
    }

    // If we got here → unsupported method
    return res.status(405).json({ error: 'method not allowed' });
  } catch (err) {
    console.error('Communities error:', err);
    return res.status(500).json({ error: 'server error', details: err.message });
  }
}

// Helper to handle body parsing for non-standard requests
async function getBody(req) {
  const buffers = [];
  for await (const chunk of req.body) buffers.push(chunk);
  try {
    return JSON.parse(Buffer.concat(buffers).toString());
  } catch {
    return {};
  }
}
