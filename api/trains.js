// /api/trains.js
import { supabase } from './utils/supabaseClient.js';
import { parse } from 'cookie';

export default async function handler(req, res) {
  try {
    const method = req.method.toUpperCase();

    // 🔹 Get community ID from cookie (set when user picks community)
    const cookies = parse(req.headers.cookie || '');
    const communityId = cookies.community_id;

    if (!communityId && method !== 'GET') {
      return res.status(400).json({ error: 'No community selected' });
    }

    if (method === 'GET') {
      if (!communityId) {
        return res.status(400).json({ error: 'No community selected' });
      }

      const { data, error } = await supabase
        .from('trains')
        .select('*')
        .eq('community_id', communityId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return res.status(200).json(data);
    }

    if (method === 'POST') {
      const body = await req.json?.() || (await getBody(req));
      const { train_id, title } = body;

      if (!train_id || !title) {
        return res.status(400).json({ error: 'Missing train_id or title' });
      }

      const { data, error } = await supabase
        .from('trains')
        .insert([{ train_id, title, community_id: communityId }])
        .select()
        .single();

      if (error) throw error;
      return res.status(201).json(data);
    }

    if (method === 'PATCH') {
      const body = await req.json?.() || (await getBody(req));
      const { train_id, role, user } = body;

      if (!train_id || !role || !user) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      const roleColumn = role === 'engineer' ? 'engineer' : 'conductor';
      const { data, error } = await supabase
        .from('trains')
        .update({ [roleColumn]: user })
        .eq('train_id', train_id)
        .eq('community_id', communityId)
        .select()
        .single();

      if (error) throw error;
      return res.status(200).json(data);
    }

    return res.status(405).json({ error: 'method not allowed' });
  } catch (err) {
    console.error('Trains API error:', err);
    return res.status(500).json({ error: 'server error', details: err.message });
  }
}

async function getBody(req) {
  const buffers = [];
  for await (const chunk of req.body) buffers.push(chunk);
  try {
    return JSON.parse(Buffer.concat(buffers).toString());
  } catch {
    return {};
  }
}
