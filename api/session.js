import { supabase } from './utils/supabaseClient.js';

export default async function handler(req, res) {
  try {
    const cookies = Object.fromEntries((req.headers.cookie || '').split('; ').map(c => {
      const [k,v] = c.split('='); return [k, v];
    }));
    const token = cookies['sb-access-token'];
    if (!token) return res.status(200).json({ user: null });

    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data?.user) return res.status(200).json({ user: null });

    // return minimal user
    return res.status(200).json({ user: { id: data.user.id, email: data.user.email, user_metadata: data.user.user_metadata }});
  } catch (e) {
    console.error('session error', e);
    res.status(500).json({ error: 'server error' });
  }
}
