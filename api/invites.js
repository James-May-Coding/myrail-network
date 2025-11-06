// api/invites.js
import { getSupabaseService, parseSessionCookie } from './_utils.js';
export default async function handler(req,res) {
  const supa = getSupabaseService();
  const session = parseSessionCookie(req);
  if(!session) return res.status(401).json({ error: 'Unauthorized' });

  try {
    if(req.method === 'GET') {
      const { data } = await supa.from('community_invites').select('id,community_id,status,communities(name)').eq('invitee_id', session.id).eq('status','pending');
      const out = (data||[]).map(i => ({ id:i.id, community_name: i.communities?.name || 'Unknown' }));
      return res.json(out);
    }
    if(req.method === 'PATCH') {
      const body = await readBody(req);
      const { id, status } = body;
      await supa.from('community_invites').update({ status }).eq('id', id);
      if(status === 'accepted') {
        const inv = (await supa.from('community_invites').select('*').eq('id', id).single()).data;
        await supa.from('community_members').insert({ community_id: inv.community_id, user_id: session.id, role: 'member' });
      }
      return res.json({ ok: true });
    }
    if(req.method === 'POST') {
      // create invite (admin only)  body: {community_id, invitee_id}
      const body = await readBody(req);
      // optional: check if session user is admin/owner of the community
      await supa.from('community_invites').insert({ community_id: body.community_id, invitee_id: body.invitee_id, status: 'pending' });
      return res.json({ ok: true });
    }
    res.status(405).json({ error: 'method not allowed' });
  } catch(e){ console.error(e); res.status(500).json({ error: 'server error' }); }
}

function readBody(req){ return new Promise((resolve,reject)=>{ let s=''; req.on('data',c=>s+=c); req.on('end',()=>resolve(s?JSON.parse(s):{})); req.on('error',reject); }); }
