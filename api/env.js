// api/env.js
export default function handler(req,res) {
    const url = process.env.SUPABASE_URL || '';
    const anon = process.env.SUPABASE_ANON_KEY || '';
    if(!url || !url.startsWith('https://') || !anon) {
      return res.status(500).json({ error: 'Missing SUPABASE_URL or SUPABASE_ANON_KEY on server' });
    }
    res.setHeader('Content-Type','application/json');
    res.status(200).json({ SUPABASE_URL: url, SUPABASE_ANON_KEY: anon });
  }
  