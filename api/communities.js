import { supabase } from './utils/supabaseClient.js';

export default async function handler(req, res) {
  const body = await parseJson(req);
  try {
    if (req.method === 'GET') {
      const { data, error } = await supabase.from('communities').select('*');
      if (error) throw error;
      return res.status(200).json(data);
    }
    if (req.method === 'POST') {
      if (!body.name) return res.status(400).json({ error:'Missing name' });
      const { data, error } = await supabase.from('communities').insert([{ name: body.name }]);
      if (error) throw error;
      return res.status(201).json(data[0]);
    }
    if (req.method === 'PATCH') {
      if (!body.join_code) return res.status(400).json({ error:'Missing join_code' });
      // handle join logic (user-community join)
      return res.status(200).json({ success:true });
    }
    return res.status(405).json({ error:'method not allowed' });
  } catch(e) {
    return res.status(500).json({ error:'server error', details: e.message });
  }
}

// parse JSON
async function parseJson(req){
  return new Promise((resolve,reject)=>{
    let body='';
    req.on('data',c=>body+=c.toString());
    req.on('end',()=>resolve(JSON.parse(body||'{}')));
    req.on('error',reject);
  });
}
