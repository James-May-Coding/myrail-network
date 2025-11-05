// /api/auth/session.js
export default function handler(req, res) {
    const cookie = req.headers.cookie;
    if (!cookie) return res.json({ user: null });
  
    const match = cookie.match(/session=([^;]+)/);
    if (!match) return res.json({ user: null });
  
    res.json({ user: JSON.parse(decodeURIComponent(match[1])) });
  }
  