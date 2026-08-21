const assert = require('node:assert/strict');
const test = require('node:test');
const { createApp } = require('../server');

async function withServer(app, callback) {
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const { port } = server.address();

  try {
    await callback(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise((resolve, reject) => {
      server.close(error => error ? reject(error) : resolve());
    });
  }
}

test('health endpoint reports ready', async () => {
  await withServer(createApp(), async baseUrl => {
    const response = await fetch(`${baseUrl}/health`);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { status: 'ok' });
  });
});

test('upload endpoint coordinates inference and removes duplicate tracks', async () => {
  const features = [
    { feature: 'dream pop', probability: 70 },
    { feature: 'shoegaze', probability: 30 },
  ];
  const app = createApp({
    analyzeImage: async image => {
      assert.ok(image.length > 0);
      return features;
    },
    generatePlaylist: async searchTerm => [{
      name: 'Same Song',
      artist: 'Same Artist',
      caption: searchTerm,
    }],
    logger: { error() {} },
  });

  await withServer(app, async baseUrl => {
    const body = new FormData();
    body.append('image', new Blob(['image'], { type: 'image/jpeg' }), 'image.jpg');
    const response = await fetch(`${baseUrl}/analyze-photo-ptp`, {
      method: 'POST',
      body,
    });
    const result = await response.json();

    assert.equal(response.status, 200);
    assert.deepEqual(result.features, features);
    assert.equal(result.playlist.length, 1);
    assert.ok(response.headers.get('x-request-id'));
  });
});

test('upload endpoint rejects requests without an image', async () => {
  await withServer(createApp(), async baseUrl => {
    const response = await fetch(`${baseUrl}/analyze-photo-ptp`, {
      method: 'POST',
    });
    assert.equal(response.status, 400);
  });
});
