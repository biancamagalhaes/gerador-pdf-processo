/**
 * Carrega imagens locais como data URI para uso em templates HTML.
 * @module services/assetsService
 */

const fs = require('fs-extra');
const path = require('path');

const PROJECT_ROOT = path.join(__dirname, '..', '..');

/**
 * @param {string} fileName Nome do arquivo na raiz do projeto (ex.: logo.png)
 * @returns {string} data URI ou string vazia se ausente
 */
function obterImagemBase64(fileName) {
  const caminho = path.join(PROJECT_ROOT, fileName);
  try {
    const bitmap = fs.readFileSync(caminho);
    const ext = path.extname(fileName).toLowerCase();
    const mime =
      ext === '.png'
        ? 'image/png'
        : ext === '.jpg' || ext === '.jpeg'
          ? 'image/jpeg'
          : 'application/octet-stream';
    return `data:${mime};base64,${bitmap.toString('base64')}`;
  } catch {
    return '';
  }
}

/**
 * Logos padrão do escritório para templates INSS.
 * @returns {{ logo_base64: string, footer_base64: string }}
 */
function obterLogosPadrao() {
  return {
    logo_base64: obterImagemBase64('logo.png'),
    footer_base64: obterImagemBase64('footer.png'),
  };
}

module.exports = {
  obterImagemBase64,
  obterLogosPadrao,
  PROJECT_ROOT,
};
