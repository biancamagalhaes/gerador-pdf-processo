/**
 * @module server/middleware/errorHandler
 */

function errorHandler(err, _req, res, _next) {
  console.error(err);
  const status = err.status && Number.isInteger(err.status) ? err.status : 500;
  const message =
    process.env.NODE_ENV === 'production'
      ? 'Erro interno do servidor'
      : err.message || 'Erro interno do servidor';
  res.status(status).json({ error: message });
}

module.exports = { errorHandler };
