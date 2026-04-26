/**
 * Renderização Handlebars a partir do arquivo de template.
 * @module services/templateService
 */

const fs = require('fs-extra');
const handlebars = require('handlebars');

/**
 * @param {string} templatePath Caminho absoluto
 * @param {Record<string, unknown>} context
 * @returns {Promise<string>}
 */
async function renderHtml(templatePath, context) {
  const htmlTemplate = await fs.readFile(templatePath, 'utf-8');
  const compiled = handlebars.compile(htmlTemplate);
  return compiled(context);
}

module.exports = {
  renderHtml,
};
