/**
 * @module server/createApp
 */

const path = require('path');
const express = require('express');
const cors = require('cors');
const documentosRoutes = require('./routes/documentos');
const { errorHandler } = require('./middleware/errorHandler');

function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json({ limit: '2mb' }));

  const publicDir = path.join(__dirname, '..', '..', 'public');
  app.use(express.static(publicDir));

  app.get('/health', (_req, res) => {
    res.json({ ok: true });
  });

  app.use('/api', documentosRoutes);
  app.use('/api', (req, res) => {
    res.status(404).json({ error: 'Rota não encontrada' });
  });

  app.get('*', (req, res) => {
    res.sendFile(path.join(publicDir, 'index.html'));
  });

  app.use(errorHandler);

  return app;
}

module.exports = { createApp };
