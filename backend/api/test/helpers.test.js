const assert = require('node:assert/strict');
const test = require('node:test');
const { createHelpers, normalizePreviewUrl } = require('../helpers');

test('normalizePreviewUrl supports API strings and embed objects', () => {
  assert.equal(normalizePreviewUrl('https://cdn.example/preview.mp3'), 'https://cdn.example/preview.mp3');
  assert.equal(normalizePreviewUrl({ url: 'https://cdn.example/preview' }), 'https://cdn.example/preview.mp3');
  assert.equal(normalizePreviewUrl(null), null);
  assert.equal(normalizePreviewUrl({}), null);
});

test('analyzeImage posts base64 data to the configured backend', async () => {
  const previousUrl = process.env.IMAGE_ANALYSIS_URL;
  process.env.IMAGE_ANALYSIS_URL = 'http://image-analysis.test/ptp';
  const requests = [];
  const helpers = createHelpers({
    httpClient: {
      async post(url, body, config) {
        requests.push({ url, body, config });
        return { data: [{ feature: 'dream pop', probability: 80 }] };
      },
    },
    logger: { info() {}, warn() {} },
    now: () => 100,
  });

  try {
    const result = await helpers.analyzeImage(Buffer.from('image'));
    assert.equal(result[0].feature, 'dream pop');
    assert.equal(requests[0].url, 'http://image-analysis.test/ptp');
    assert.equal(requests[0].body.image, Buffer.from('image').toString('base64'));
  } finally {
    if (previousUrl === undefined) {
      delete process.env.IMAGE_ANALYSIS_URL;
    } else {
      process.env.IMAGE_ANALYSIS_URL = previousUrl;
    }
  }
});

test('generatePlaylist caches tokens and safely combines preview sources', async () => {
  let tokenRequests = 0;
  let now = 1000;
  const httpClient = {
    async post(url) {
      assert.equal(url, 'https://accounts.spotify.com/api/token');
      tokenRequests += 1;
      return { data: { access_token: 'token', expires_in: 3600 } };
    },
    async get(url) {
      if (url === 'https://api.spotify.com/v1/search') {
        return {
          data: {
            tracks: {
              items: [
                {
                  id: 'native',
                  name: 'Native Preview',
                  preview_url: 'https://cdn.example/native.mp3',
                  album: { images: [{ url: 'https://cdn.example/cover.jpg' }] },
                  artists: [{ name: 'Artist One' }],
                  external_urls: { spotify: 'https://open.spotify.com/track/native' },
                },
                {
                  id: 'embed',
                  name: 'Embed Preview',
                  preview_url: null,
                  album: { images: [] },
                  artists: [{ name: 'Artist Two' }],
                  external_urls: {},
                },
              ],
            },
          },
        };
      }

      assert.equal(url, 'https://open.spotify.com/embed/track/embed');
      return {
        data: '<script id="__NEXT_DATA__" type="application/json">' +
          '{"props":{"pageProps":{"state":{"data":{"entity":' +
          '{"audioPreview":{"url":"https://cdn.example/embed"}}}}}}}' +
          '</script>',
      };
    },
  };
  const helpers = createHelpers({
    httpClient,
    wait: async () => undefined,
    logger: { info() {}, warn() {} },
    now: () => now,
  });

  const first = await helpers.generatePlaylist('dream pop');
  now += 1000;
  const second = await helpers.generatePlaylist('indie');

  assert.equal(tokenRequests, 1);
  assert.equal(first[0].audio, 'https://cdn.example/native.mp3');
  assert.equal(first[1].audio, 'https://cdn.example/embed.mp3');
  assert.equal(second.length, 2);
});
