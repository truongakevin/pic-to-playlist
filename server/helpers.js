require('dotenv').config();

const axios = require('axios');
const fs = require('fs');

async function getSpotifyAccessToken() {
  try {
    const response = await axios.post('https://accounts.spotify.com/api/token', new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: process.env.SPOTIFY_CLIENT_ID,
      client_secret: process.env.SPOTIFY_CLIENT_SECRET,
    }), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
    const { access_token, token_type, expires_in } = response.data;

    return access_token;
  } catch (error) {
    console.error('Error getting Spotify access token:', error);
    throw error;
  }
}

async function analyzeImage(imageBuffer) {
  try {
    const base64Image = imageBuffer.toString('base64');
    const response = await axios.post(`http://${process.env.FALSK_ADDRESS}:${process.env.FLASK_PORT}/analyze-image`, { image: base64Image });
    return response.data;
  } catch (error) {
    console.error('Error analyzing image:', error);
    throw error;
  }
}

const generatePlaylist = async (search_string) => {
  const accessToken = await getSpotifyAccessToken();
  const response = await axios.get(`https://api.spotify.com/v1/search`, {
    params: {
      q: search_string,
      type: 'track',
      limit: 5, 
    },
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  });
  const tracks = response.data.tracks.items;
  return tracks.map(track => ({
    name: track.name,
    coverImage: track.album.images[0].url,
    artist: track.artists[0].name,
    link: track.external_urls.spotify,
    audio: track.preview_url,
    caption: search_string,
  }));
};

module.exports = {
  analyzeImage,
  generatePlaylist
};