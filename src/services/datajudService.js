/**
 * Integração com a API pública do Datajud (TRF1).
 * @module services/datajudService
 */

const axios = require('axios');
const { apenasDigitosProcesso } = require('../utils/formatadores');

const DEFAULT_SEARCH_URL =
  'https://api-publica.datajud.cnj.jus.br/api_publica_trf1/_search';

/**
 * Serializa o corpo da resposta para log (sem recorte).
 * @param {unknown} data
 * @returns {string}
 */
function corpoRespostaParaLog(data) {
  if (data === undefined) {
    return 'undefined';
  }
  try {
    return JSON.stringify(data);
  } catch {
    return String(data);
  }
}

/**
 * @param {string} digits
 * @param {number} status
 * @param {unknown} data
 */
function logRespostaCompletaDatajud(digits, status, data) {
  console.info(
    `[Datajud] resposta completa da API (processo=${digits}, status=${status}): ${corpoRespostaParaLog(data)}`
  );
}

/**
 * @param {string} numeroProcesso Com ou sem máscara
 * @returns {Promise<{ hits: object[] }>}
 */
async function buscarProcesso(numeroProcesso) {
  const apiKey = process.env.DATAJUD_API_KEY;
  if (!apiKey) {
    const err = new Error('DATAJUD_API_KEY não configurada no ambiente');
    err.code = 'MISSING_CONFIG';
    throw err;
  }

  const digits = apenasDigitosProcesso(numeroProcesso);
  if (digits.length !== 20) {
    const err = new Error('Número do processo deve conter 20 dígitos');
    err.code = 'VALIDATION';
    throw err;
  }

  const url = process.env.DATAJUD_TRF1_URL || DEFAULT_SEARCH_URL;

  const requestBody = {
    query: {
      match: {
        numeroProcesso: digits,
      },
    },
  };

  let response;
  try {
    response = await axios.post(url, requestBody, {
      headers: {
        Authorization: `APIKey ${apiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
      validateStatus: () => true,
    });
  } catch (e) {
    const err = new Error(e.message || 'Falha de rede ao consultar o Datajud');
    err.code = 'DATAJUD_HTTP';
    throw err;
  }

  if (response.status >= 400) {
    logRespostaCompletaDatajud(digits, response.status, response.data);
    const err = new Error(
      response.data?.message || `Datajud retornou status ${response.status}`
    );
    err.code = 'DATAJUD_HTTP';
    err.status = response.status;
    throw err;
  }

  logRespostaCompletaDatajud(digits, response.status, response.data);

  const hits = response.data?.hits?.hits || [];
  return { hits, digits };
}

module.exports = {
  buscarProcesso,
  DEFAULT_SEARCH_URL,
};
