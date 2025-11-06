// api/_utils.js
import { createClient } from '@supabase/supabase-js';

export function getSupabaseService() {
  const url = "https://dmjazdpluclinainckit.supabase.co";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!url || !key) throw new Error("Missing server SUPABASE env.");
  return createClient(url, key, { auth: { persistSession: false }});
}

export function parseSessionCookie(req) {
  const cookie = req.headers.cookie || '';
  const match = cookie.match(/session=([^;]+)/);
  if(!match) return null;
  try {
    return JSON.parse(decodeURIComponent(match[1]));
  } catch(e) { return null; }
}

export function setSessionCookie(res, obj) {
  const val = encodeURIComponent(JSON.stringify(obj));
  // httpOnly cookie for 7 days, path=/, sameSite=lax
  res.setHeader('Set-Cookie', `session=${val}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60*60*24*7}`);
}

export function clearSessionCookie(res) {
  res.setHeader('Set-Cookie', `session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`);
}
