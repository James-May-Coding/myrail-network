// api/auth/session.js
import { parseSessionCookie, clearSessionCookie } from '../_utils.js';

export default function handler(req,res) {
  if(req.method === 'DELETE') {
    clearSessionCookie(res);
    return res.status(200).json({ ok: true });
  }
  const s = parseSessionCookie(req);
  if(!s) return res.status(200).json({ user: null });
  // return user object
  return res.status(200).json({ user: s });
}
