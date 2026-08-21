require('dotenv').config();

const axios = require('axios');

const DEFAULT_IMAGE_ANALYSIS_TIMEOUT_MS = 120000;
const DEFAULT_SPOTIFY_TIMEOUT_MS = 7000;
const DEFAULT_PREVIEW_INTERVAL_MS = 250;

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function normalizePreviewUrl(preview) {
  if (!preview) {
    return null;
  }

  if (typeof preview === 'string') {
    return preview;
  }

  if (typeof preview.url !== 'string' || preview.url.length === 0) {
    return null;
  }

  return /\.mp3(?:$|\?)/.test(preview.url)
    ? preview.url
    : `${preview.url}.mp3`;
}

function isRetryable(error) {
  const status = error.response?.status;
  return status === 429 || status >= 500 || error.code === 'ECONNABORTED';
}

function createHelpers({
  httpClient = axios,
  wait = delay,
  logger = console,
  now = () => Date.now(),
} = {}) {
  let spotifyToken = null;
  let spotifyTokenExpiresAt = 0;
  let previewTail = Promise.resolve();

  async function requestWithRetry(request, retries = 3, baseDelayMs = 1000) {
    let lastError;

    for (let attempt = 1; attempt <= retries; attempt += 1) {
      try {
        return await request();
      } catch (error) {
        lastError = error;
        if (!isRetryable(error) || attempt === retries) {
          throw error;
        }

        const retryAfterSeconds = Number(error.response?.headers?.['retry-after']);
        const retryDelay = Number.isFinite(retryAfterSeconds)
          ? retryAfterSeconds * 1000
          : baseDelayMs * attempt;
        logger.warn(`Request failed, retrying in ${retryDelay} ms`);
        await wait(retryDelay);
      }
    }

    throw lastError;
  }

  function getImageAnalysisUrl() {
    if (process.env.IMAGE_ANALYSIS_URL) {
      return process.env.IMAGE_ANALYSIS_URL;
    }

    const host = process.env.FLASK_ADDRESS || '127.0.0.1';
    const port = process.env.FLASK_PORT || '52525';
    return `http://${host}:${port}/image-analysis/ptp`;
  }

  async function analyzeImage(imageBuffer) {
    const startedAt = now();
    const response = await httpClient.post(
      getImageAnalysisUrl(),
      { image: imageBuffer.toString('base64') },
      {
        timeout: Number(
          process.env.IMAGE_ANALYSIS_TIMEOUT_MS
          || DEFAULT_IMAGE_ANALYSIS_TIMEOUT_MS
        ),
      }
    );

    if (!Array.isArray(response.data)) {
      throw new Error('Image analysis returned an invalid response');
    }

    logger.info(`Image analysis took ${now() - startedAt} ms`);
    return response.data;
  }

  async function getSpotifyAccessToken() {
    if (spotifyToken && now() < spotifyTokenExpiresAt) {
      return spotifyToken;
    }

    const response = await requestWithRetry(() => httpClient.post(
      'https://accounts.spotify.com/api/token',
      new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: process.env.SPOTIFY_CLIENT_ID,
        client_secret: process.env.SPOTIFY_CLIENT_SECRET,
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        timeout: DEFAULT_SPOTIFY_TIMEOUT_MS,
      }
    ));

    spotifyToken = response.data.access_token;
    const expiresInSeconds = Number(response.data.expires_in || 3600);
    spotifyTokenExpiresAt = now() + Math.max(0, expiresInSeconds - 60) * 1000;
    return spotifyToken;
  }

  function schedulePreviewRequest(request) {
    const run = previewTail
      .catch(() => undefined)
      .then(() => wait(Number(
        process.env.SPOTIFY_PREVIEW_INTERVAL_MS
        || DEFAULT_PREVIEW_INTERVAL_MS
      )))
      .then(request);

    previewTail = run.catch(() => undefined);
    return run;
  }

  async function fetchPreviewFromSpotifyEmbed(trackId) {
    try {
      return await schedulePreviewRequest(async () => {
        const response = await requestWithRetry(() => httpClient.get(
          `https://open.spotify.com/embed/track/${trackId}`,
          { timeout: DEFAULT_SPOTIFY_TIMEOUT_MS }
        ));
        const match = response.data.match(
          /<script id="__NEXT_DATA__" type="application\/json">(.+?)<\/script>/s
        );

        if (!match) {
          return null;
        }

        const data = JSON.parse(match[1]);
        const preview = data?.props?.pageProps?.state?.data?.entity?.audioPreview;
        return normalizePreviewUrl(preview);
      });
    } catch (error) {
      logger.warn(
        `Could not fetch Spotify preview for track ${trackId}: ${error.message}`
      );
      return null;
    }
  }

  async function generatePlaylist(searchString) {
    if (typeof searchString !== 'string' || searchString.trim().length === 0) {
      return [];
    }

    const accessToken = await getSpotifyAccessToken();
    const response = await requestWithRetry(() => httpClient.get(
      'https://api.spotify.com/v1/search',
      {
        params: {
          q: searchString,
          type: 'track',
          limit: 5,
        },
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        timeout: DEFAULT_SPOTIFY_TIMEOUT_MS,
      }
    ));

    const tracks = response.data?.tracks?.items || [];
    const playlist = [];

    for (const track of tracks) {
      const previewUrl = normalizePreviewUrl(track.preview_url)
        || await fetchPreviewFromSpotifyEmbed(track.id);

      playlist.push({
        name: track.name,
        coverImage: track.album?.images?.[0]?.url || null,
        artist: track.artists?.[0]?.name || 'Unknown Artist',
        link: track.external_urls?.spotify || '#',
        audio: previewUrl,
        caption: searchString,
      });
    }

    return playlist;
  }

  return {
    analyzeImage,
    fetchPreviewFromSpotifyEmbed,
    generatePlaylist,
    normalizePreviewUrl,
  };
}

const defaultHelpers = createHelpers();

module.exports = {
  ...defaultHelpers,
  createHelpers,
  normalizePreviewUrl,
};
