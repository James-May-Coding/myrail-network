export default function handler(req, res) {
  try {
    const cookies = req.headers.cookie || '';
    const sessionCookie = cookies.split(';').find(c => c.trim().startsWith('session='));
    if (!sessionCookie) return res.json({ user: null });

    const sessionData = decodeURIComponent(sessionCookie.split('=')[1]);
    const user = JSON.parse(sessionData);
    res.json({ user });
  } catch (err) {
    res.json({ user: null });
  }
}
