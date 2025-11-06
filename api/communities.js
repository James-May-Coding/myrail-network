// api/communities.js
import { getSupabaseService, parseSessionCookie } from './_utils.js';

export default async function handler(req,res) {
  const supa = getSupabaseService();
  const session = parseSessionCookie(req);
  if(!session) return res.status(401).json({ error: 'Unauthorized' });

  try {
    if(req.method === 'GET') {
      // return communities with membership flag
      const { data } = await supa.from('communities').select('*');
      const { data: members } = await supa.from('community_members').select('*').eq('user_id', session.id);
      const memberSet = new Set((members||[]).map(m=>m.community_id));
      const out = (data||[]).map(c => ({ ...c, is_member: memberSet.has(c.id) }));
      return res.json(out);
    }

    if(req.method === 'POST') {
      const body = await readBody(req);
      if(body.action === 'create') {
        const { name, guild_id, pfp } = body;
        const { data } = await supa.from('communities').insert({ name, guild_id, pfp }).select().single();
        // add creator as owner/member
        await supa.from('community_members').insert({ community_id: data.id, user_id: session.id, role: 'owner' });
        return res.json(data);
      }
      if(body.action === 'join') {
        const { community_id } = body;
        await supa.from('community_members').insert({ community_id, user_id: session.id, role: 'member' });
        return res.json({ ok: true });
      }
    }

    return res.status(405).json({ error: 'method not allowed' });
  } catch(e) { console.error(e); res.status(500).json({ error: 'server error' }); }
}

function readBody(req){ return new Promise((resolve,reject)=>{ let s=''; req.on('data',c=>s+=c); req.on('end',()=>resolve(s?JSON.parse(s):{})); req.on('error',reject); }); }
