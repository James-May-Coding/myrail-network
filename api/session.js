export default async function handler(req, res) {
  const cookie = req.headers.cookie?.split('; ').find(c => c.startsWith('session='));
  if (!cookie) return res.status(200).json({ user: null });

  try {
    const session = JSON.parse(decodeURIComponent(cookie.split('=')[1]));
    res.status(200).json({ user: session });
  } catch (err) {
    res.status(200).json({ user: null });
  }
}
