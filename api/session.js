import { supabase } from '../utils/supabaseClient.js';

export default async function handler(req, res) {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return res.status(200).json({ user: null });
    }

    // Return stable cookie info
    res.status(200).json({
      user: {
        id: user.id,
        username: user.user_metadata?.full_name || user.email,
      }
    });
  } catch (err) {
    console.error('Session error:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}
