require('dotenv').config();

const crypto = require('crypto');
const cors = require('cors');
const express = require('express');
const morgan = require('morgan');
const multer = require('multer');
const defaultHelpers = require('./helpers');

const DEFAULT_MAX_IMAGE_BYTES = 15 * 1024 * 1024;

function allowedOrigins() {
  return (process.env.CORS_ORIGINS || 'http://localhost:8081,http://localhost:19006')
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean);
}

function createApp({
  analyzeImage = defaultHelpers.analyzeImage,
  generatePlaylist = defaultHelpers.generatePlaylist,
  logger = console,
} = {}) {
  const app = express();
  const origins = allowedOrigins();
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
      files: 1,
      fileSize: Number(process.env.MAX_IMAGE_BYTES || DEFAULT_MAX_IMAGE_BYTES),
    },
    fileFilter: (request, file, callback) => {
      callback(
        file.mimetype.startsWith('image/')
          ? null
          : new multer.MulterError('LIMIT_UNEXPECTED_FILE', file.fieldname),
        file.mimetype.startsWith('image/')
      );
    },
  });

  app.disable('x-powered-by');
  app.use(morgan('combined'));
  app.use(cors({
    origin(origin, callback) {
      if (!origin || origins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error('Origin is not allowed'));
    },
  }));

  app.get('/health', (request, response) => {
    response.json({ status: 'ok' });
  });

  app.post('/analyze-photo-ptp', upload.single('image'), async (request, response) => {
    const requestId = request.get('x-request-id') || crypto.randomUUID();
    response.set('x-request-id', requestId);

    try {
      if (!request.file) {
        return response.status(400).json({ error: 'No image uploaded', requestId });
      }

      const features = await analyzeImage(request.file.buffer);
      if (!Array.isArray(features) || features.length === 0) {
        throw new Error('Image analysis returned no features');
      }

      const searchTerms = [
        features.map(feature => feature.feature).join(', '),
        ...features.map(feature => feature.feature),
      ];
      const tracks = [];

      for (const searchTerm of searchTerms) {
        tracks.push(...await generatePlaylist(searchTerm));
      }

      const uniqueTracks = [
        ...new Map(
          tracks.map(track => [`${track.name}\u0000${track.artist}`, track])
        ).values(),
      ];

      return response.json({ features, playlist: uniqueTracks });
    } catch (error) {
      logger.error(`Request ${requestId} failed:`, error);
      return response.status(502).json({
        error: 'Failed to generate playlist',
        requestId,
      });
    }
  });

  app.use((error, request, response, next) => {
    if (error instanceof multer.MulterError) {
      return response.status(400).json({ error: error.message });
    }

    logger.error('Unhandled API error:', error);
    return response.status(500).json({ error: 'Internal server error' });
  });

  return app;
}

function startServer() {
  const host = process.env.NODE_HOST || '127.0.0.1';
  const port = Number(process.env.NODE_PORT || 33333);
  const app = createApp();
  return app.listen(port, host, () => {
    console.log(`Pic-to-Playlist API listening at http://${host}:${port}`);
  });
}

if (require.main === module) {
  startServer();
}

module.exports = {
  createApp,
  startServer,
};
