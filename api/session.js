import cookie from 'cookie';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export default async function handler(req, res) {
  try {
    const cookies = cookie.parse(req.headers.cookie || '');
    if (!cookies.user) return res.status(200).json({ user: null });

    const sessionUser = JSON.parse(cookies.user);

    const { data: user } = await supabase
      .from('users')
      .select('*')
      .eq('id', sessionUser.id)
      .single();

    res.status(200).json({ user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to get session' });
  }
}
