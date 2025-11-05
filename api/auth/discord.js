export default function handler(req, res) {
    const clientId = process.env.DISCORD_CLIENT_ID;
    const redirect = encodeURIComponent(process.env.DISCORD_REDIRECT_URI);
    const scope = encodeURIComponent('identify email');
    const oauthUrl = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&redirect_uri=${redirect}&response_type=code&scope=${scope}`;
  
    res.writeHead(302, { Location: oauthUrl });
    res.end();
  }
  