/**
 * @module services/templateContextService
 */

const defaultPrevMapper = require('../templates/mappers/defaultPrevMapper');

const mappers = {
  defaultPrev: defaultPrevMapper,
};

/**
 * @param {object} templateDef Definição do catálogo
 * @param {object} documentInput Entrada do usuário
 * @param {object} processo processo normalizado
 * @param {{ logo_base64: string, footer_base64: string }} logos
 */
function montarContexto(templateDef, documentInput, processo, logos) {
  const mapper = mappers[templateDef.mapperId] || mappers.defaultPrev;
  return mapper.mapToTemplateContext({ documentInput, processo, logos });
}

module.exports = {
  montarContexto,
};
