// api/trains.js
import { getSupabaseService, parseSessionCookie } from './_utils.js';
export default async function handler(req,res) {
  const supa = getSupabaseService();
  const session = parseSessionCookie(req);
  if(!session) return res.status(401).json({ error: 'Unauthorized' });

  try {
    if(req.method === 'GET') {
      // return trains user can see: for simplicity return all
      const { data } = await supa.from('trains').select('*');
      // determine editable rights: if user is owner/admin in community_members
      const membership = (await supa.from('community_members').select('*').eq('user_id', session.id)).data || [];
      const adminCommunities = new Set(membership.filter(m=>m.role==='owner' || m.role==='admin').map(m=>m.community_id));
      const out = (data||[]).map(t => ({ ...t, can_edit: adminCommunities.has(t.community_id) }));
      return res.json(out);
    }
    if(req.method === 'PATCH') {
      const body = await readBody(req);
      if(body.action === 'claim') {
        // claim: set engineer/conductor depending on body.role or default engineer
        const updates = {};
        // if no engineer set, set engineer to session username, else set conductor
        const train = (await supa.from('trains').select('*').eq('id', body.id).single()).data;
        if(!train.engineer) updates.engineer = session.username || session.id;
        else if(!train.conductor) updates.conductor = session.username || session.id;
        updates.status = 'claimed';
        await supa.from('trains').update(updates).eq('id', body.id);
        return res.json({ ok: true });
      } else if(body.action === 'edit') {
        // check admin rights
        const train = (await supa.from('trains').select('*').eq('id', body.id).single()).data;
        const member = (await supa.from('community_members').select('*').eq('community_id', train.community_id).eq('user_id', session.id).single()).data;
        if(!member || (member.role !== 'owner' && member.role !== 'admin')) return res.status(403).json({ error: 'Forbidden' });
        await supa.from('trains').update(body.updates).eq('id', body.id);
        return res.json({ ok: true });
      }
    }
    if(req.method === 'POST') {
      const body = await readBody(req);
      // create train (admin only)
      const { code, route, community_id } = body;
      const member = (await supa.from('community_members').select('*').eq('community_id', community_id).eq('user_id', session.id).single()).data;
      if(!member || (member.role !== 'owner' && member.role !== 'admin')) return res.status(403).json({ error: 'Forbidden' });
      const { data } = await supa.from('trains').insert({ code, route, community_id }).select().single();
      return res.json(data);
    }
    res.status(405).json({ error: 'method not allowed' });
  } catch(e){ console.error(e); res.status(500).json({ error: 'server error' }); }
}

function readBody(req){ return new Promise((resolve,reject)=>{ let s=''; req.on('data',c=>s+=c); req.on('end',()=>resolve(s?JSON.parse(s):{})); req.on('error',reject); }); }
