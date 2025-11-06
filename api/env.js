// api/env.js
export default function handler(req,res) {
    const url = process.env.SUPABASE_URL || 'https://dmjazdpluclinainckit.supabase.co';
    const anon = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRtamF6ZHBsdWNsaW5haW5ja2l0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIyOTYyNDEsImV4cCI6MjA3Nzg3MjI0MX0.BtKwm3wds62gOrabC5lY4561zawTdT_f-o9_frO2TRk';
    if(!url || !url.startsWith('https://') || !anon) {
      return res.status(500).json({ error: 'Missing SUPABASE_URL or SUPABASE_ANON_KEY on server' });
    }
    res.setHeader('Content-Type','application/json');
    res.status(200).json({ SUPABASE_URL: url, SUPABASE_ANON_KEY: anon });
  }
  