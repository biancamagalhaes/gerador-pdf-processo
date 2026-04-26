/**
 * Ponto de entrada: servidor monólito (API + SPA estática).
 */
const app = require('./src/server/app');

const PORT = Number(process.env.PORT) || 3000;

app.listen(PORT, () => {
  console.log(`Servidor em http://localhost:${PORT}`);
});
