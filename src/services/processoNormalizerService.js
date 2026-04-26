/**
 * Normaliza o payload do Datajud para um modelo interno estável.
 * @module services/processoNormalizerService
 */

const { formatarDataAjuizamento, formatarProcesso } = require('../utils/formatadores');

/**
 * @param {object} hit Primeiro hit do Elasticsearch (Datajud)
 * @returns {object}
 */
function normalizarDeHit(hit) {
  const source = hit._source || {};
  const numeroRaw = source.numeroProcesso || '';

  return {
    numeroProcessoRaw: String(numeroRaw).replace(/\D/g, ''),
    numeroProcessoFormatado: formatarProcesso(String(numeroRaw).replace(/\D/g, '')),
    dataAjuizamentoRaw: source.dataAjuizamento || '',
    dataAjuizamentoFormatada: formatarDataAjuizamento(source.dataAjuizamento || ''),
    orgaoJulgador: source.orgaoJulgador?.nome || source.orgaoJulgador || '',
    classe: source.classe?.nome || source.classe || '',
    sistema: source.sistema?.nome || source.sistema || '',
  };
}

/**
 * Resumo seguro para o frontend (sem payload bruto completo).
 * @param {object} p
 */
function resumoParaApi(p) {
  return {
    numeroProcesso: p.numeroProcessoFormatado,
    dataDistribuicao: p.dataAjuizamentoFormatada,
    orgaoJulgador: p.orgaoJulgador,
    classe: p.classe,
  };
}

module.exports = {
  normalizarDeHit,
  resumoParaApi,
};
