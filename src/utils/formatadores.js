/**
 * Formatação de dados para exibição em petições.
 * @module utils/formatadores
 */

/**
 * @param {string|undefined} dataStr Data no formato YYYYMMDD
 * @returns {string}
 */
function formatarDataAjuizamento(dataStr) {
  if (!dataStr || dataStr.length < 8) return ' / / ';
  const ano = dataStr.substring(0, 4);
  const mes = dataStr.substring(4, 6);
  const dia = dataStr.substring(6, 8);
  return `${dia}/${mes}/${ano}`;
}

/**
 * Formata número CNJ (20 dígitos).
 * @param {string|undefined} num
 * @returns {string}
 */
function formatarProcesso(num) {
  if (!num || num.length !== 20) return num || '';
  return `${num.substring(0, 7)}-${num.substring(7, 9)}.${num.substring(9, 13)}.${num.substring(13, 14)}.${num.substring(14, 16)}.${num.substring(16, 20)}`;
}

/**
 * Remove não dígitos do número do processo.
 * @param {string} raw
 * @returns {string}
 */
function apenasDigitosProcesso(raw) {
  return String(raw || '').replace(/\D/g, '');
}

module.exports = {
  formatarDataAjuizamento,
  formatarProcesso,
  apenasDigitosProcesso,
};
