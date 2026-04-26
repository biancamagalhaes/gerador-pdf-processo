/**
 * Entrada do servidor HTTP (monólito).
 * O `listen` fica em `index.js` na raiz para que `npm start` funcione.
 * @module server/app
 */

require('dotenv').config();

const { createApp } = require('./createApp');

const app = createApp();

module.exports = app;
