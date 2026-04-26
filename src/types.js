/**
 * Tipos compartilhados (JSDoc apenas).
 * @typedef {object} ProcessoNormalizado
 * @property {string} numeroProcessoRaw
 * @property {string} numeroProcessoFormatado
 * @property {string} dataAjuizamentoRaw
 * @property {string} dataAjuizamentoFormatada
 * @property {string} orgaoJulgador
 * @property {string} classe
 * @property {string} sistema
 */

/**
 * @typedef {object} DocumentInput
 * @property {string} nomeCliente
 * @property {string} numeroProcesso
 * @property {'masculino'|'feminino'} genero
 * @property {string} [especialidade]
 * @property {string} templateId
 * @property {string} [juizo]
 * @property {string} [poloPassivoPreset] 'inss' | 'uniao_federal' — padrão INSS; União Federal usa artigo "a"
 * @property {string} [dataRemessaConclusao]
 * @property {string} [idRecursoInominado]
 * @property {string} [dataLaudoMedico]
 * @property {string} [dataLaudoSocial]
 * @property {string} [dataContestacao]
 * @property {string} [dataReplica]
 */

module.exports = {};
