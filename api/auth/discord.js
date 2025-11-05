export default function handler(req, res) {
    const clientId = process.env.DISCORD_CLIENT_ID;
    const redirect = encodeURIComponent(process.env.DISCORD_REDIRECT_URI);
    const scope = encodeURIComponent('identify email');
    const oauthUrl = `https://discord.com/oauth2/authorize?client_id=1435440980210876520&response_type=code&redirect_uri=https%3A%2F%2Fmyrail-network.vercel.app%2Fapi%2Fauth%2Fcallback.js&scope=identify+email`;
  
    res.writeHead(302, { Location: oauthUrl });
    res.end();
  }
  