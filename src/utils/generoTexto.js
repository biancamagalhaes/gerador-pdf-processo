/**
 * Normalização de gênero para concordância gramatical em petições.
 * @module utils/generoTexto
 */

const GENEROS_VALIDOS = new Set(['masculino', 'feminino']);

/**
 * @param {unknown} raw
 * @returns {string}
 */
function normalizarGenero(raw) {
  return typeof raw === 'string' ? raw.trim().toLowerCase() : '';
}

/**
 * Particípio de "qualificar" conforme o gênero informado.
 * @param {string} generoNormalizado resultado de {@link normalizarGenero}
 * @returns {'qualificado' | 'qualificada'}
 */
function participioQualificado(generoNormalizado) {
  return generoNormalizado === 'feminino' ? 'qualificada' : 'qualificado';
}

/**
 * @param {string} generoNormalizado
 */
function generoValido(generoNormalizado) {
  return GENEROS_VALIDOS.has(generoNormalizado);
}

module.exports = {
  GENEROS_VALIDOS,
  normalizarGenero,
  participioQualificado,
  generoValido,
};
