require('dotenv').config();

const axios = require('axios');
const fs = require('fs');

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function analyzeImage(imageBuffer) {
  try {
    const startTime = Date.now();
    const base64Image = imageBuffer.toString('base64');
    const response = await axios.post(`http://${process.env.FLASK_ADDRESS}:${process.env.FLASK_PORT}/image-analysis/ptp`, { image: base64Image });
    const endTime = Date.now();  // Record the end time
    const elapsedTime = endTime - startTime;  // Calculate elapsed time
    console.log(`Image analysis took ${elapsedTime} ms`);
    return response.data;
  } catch (error) {
    console.error('Error analyzing image:', error);
    throw error;
  }
}

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

const requestTimestamps = [];
const RATE_WINDOW_MS = 60000; // 60 seconds
const MAX_REQUESTS_PER_MIN = 75; // Safe threshold
const BASE_SLEEP_MS = 250; // Minimum delay
const MAX_SLEEP_MS = 2500; // Max delay backoff

async function fetchPreviewFromSpotifyEmbed(trackId) {
  try {
    // Record timestamp
    const now = Date.now();
    requestTimestamps.push(now);

    // Remove timestamps older than 1 minute
    while (requestTimestamps.length > 0 && requestTimestamps[0] < now - RATE_WINDOW_MS) {
      requestTimestamps.shift();
    }

    // Calculate request rate
    const recentRequestRate = requestTimestamps.length;
    let dynamicSleep = BASE_SLEEP_MS;

    // If too many requests, increase delay exponentially
    if (recentRequestRate > MAX_REQUESTS_PER_MIN) {
      const overloadFactor = (recentRequestRate - MAX_REQUESTS_PER_MIN) / MAX_REQUESTS_PER_MIN;
      dynamicSleep = Math.min(BASE_SLEEP_MS + overloadFactor * 1000, MAX_SLEEP_MS);
    }
    console.log(dynamicSleep);
    await sleep(dynamicSleep);

    const response = await axios.get(`https://open.spotify.com/embed/track/${trackId}`, {
      timeout: 5000,
    });

    // Extract JSON from embed HTML
    const regex = /<script id="__NEXT_DATA__" type="application\/json">(.+?)<\/script>/s;
    const match = response.data.match(regex);

    if (match) {
      const jsonData = JSON.parse(match[1]);
      return jsonData?.props?.pageProps?.state?.data?.entity?.audioPreview || null;
    }

    return null;
  } catch (error) {
    if (error.response?.status === 429) {
      console.warn(`Rate limited by Spotify for track ${trackId}`);
      return null;
    } else {
      console.error(`Error fetching preview from Spotify embed for track ${trackId}:`, error.message);
      return '';
    }
  }
}

async function generatePlaylist(search_string, retries = 3, backoffMs = 1000) {
  const accessToken = await getSpotifyAccessToken();

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
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
        timeout: 7000,
      });
      
      const tracks = response.data.tracks.items || [];
      if (tracks.length === 0) {
        console.warn(`No tracks found for "${search_string}"`);
        return [];
      }

      const playlist = await Promise.all(
        tracks.map(async (track) => {
          // If Spotify API does not provide a preview, fetch from embed page
          // let previewUrl = '';
          let previewUrl = await fetchPreviewFromSpotifyEmbed(track.id);
          // let previewUrl = await fetchPreviewFromSpotifyEmbed("3t1Sx9Trm89GEtdJpfTLea");
          // let previewUrl = await fetchPreviewFromSpotifyEmbed("2B5UvKZwrYCbDED161d1P4");
          // let previewUrl = await fetchPreviewFromSpotifyEmbed("4Tm5Y5MsQbfZPp6TGUvs33");
          // let previewUrl = await fetchPreviewFromSpotifyEmbed("2rrPQlivP17rTDAaRopUsE");
          if (previewUrl.url == null) {
            console.log(track.id);
            console.log(track.name);
          }
          return {
            name: track.name,
            coverImage: track.album?.images?.[0]?.url || null,
            artist: track.artists?.[0]?.name || "Unknown Artist",
            link: track.external_urls?.spotify || "#",
            audio: `${previewUrl.url}.mp3` || null, 
            caption: search_string,
          };
        })
      );

      return playlist;

    } catch (error) {
      const status = error.response?.status;
      if (status === 504 || error.code === 'ECONNABORTED' || status >= 500) {
        // Retry on Gateway Timeout, timeout error, or 5xx errors
        console.warn(`Spotify API request failed with status ${status || error.code}, attempt ${attempt} of ${retries}`);
        if (attempt < retries) {
          await sleep(backoffMs * attempt);  // exponential backoff
          continue;
        }
        console.error(`Spotify API request failed after ${retries} attempts.`);
        return [];  // fail gracefully with empty playlist
      }
      // Other errors are unexpected - rethrow
      throw error;
    }
  }
};

module.exports = {
  analyzeImage,
  generatePlaylist
};
