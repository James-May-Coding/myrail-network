import { supabase } from '../utils/supabaseClient.js';

export default async function handler(req, res) {
  try {
    const access_token = req.headers.cookie
      ?.split('; ')
      .find(c => c.startsWith('sb-access-token='))
      ?.split('=')[1];

    if (!access_token) {
      return res.status(200).json({ user: null });
    }

    // Get the user from token
    const { data, error } = await supabase.auth.getUser(access_token);

    if (error || !data?.user) {
      return res.status(200).json({ user: null });
    }

    return res.status(200).json({ user: data.user });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Server Error' });
  }
}
