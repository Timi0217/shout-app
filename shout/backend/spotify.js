const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
require('dotenv').config();

let cachedToken = null;
let tokenExpires = 0;

async function getSpotifyToken() {
  if (cachedToken && Date.now() < tokenExpires) return cachedToken;
  const creds = Buffer.from(`${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`).toString('base64');
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${creds}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });
  const data = await res.json();
  cachedToken = data.access_token;
  tokenExpires = Date.now() + (data.expires_in - 60) * 1000; // buffer 1 min
  return cachedToken;
}

async function spotifySearch(query) {
  const token = await getSpotifyToken();
  const res = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track,artist&limit=10`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  return res.json();
}

module.exports = { spotifySearch }; 