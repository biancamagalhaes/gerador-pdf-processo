/**
 * @module validators/documentoValidator
 */

const { apenasDigitosProcesso } = require('../utils/formatadores');
const { normalizarGenero, generoValido } = require('../utils/generoTexto');
const templateCatalog = require('../services/templateCatalogService');

/** Campos já tratados na base do formulário (nome + processo). */
const CAMPOS_BASE = new Set(['nomeCliente', 'numeroProcesso']);

/** Pode ficar vazio (juízo vem do Datajud ou texto padrão no mapper). */
const CAMPOS_OPCIONAIS_TEMPLATE = new Set(['juizo', 'poloPassivoPreset']);

const LABELS_CAMPO = {
  especialidade: 'Especialidade médica',
  dataRemessaConclusao: 'Data remessa à conclusão',
  idRecursoInominado: 'ID do recurso inominado',
  dataLaudoMedico: 'Data do laudo médico/perícia',
  dataLaudoSocial: 'Data do laudo social',
  dataContestacao: 'Data da contestação',
  dataReplica: 'Data da réplica',
  juizo: 'Juízo',
  poloPassivoPreset: 'Polo passivo (réu)',
};

/**
 * @param {unknown} body
 * @param {string} key
 */
function strTrim(body, key) {
  return typeof body?.[key] === 'string' ? body[key].trim() : '';
}

/**
 * Campos do modelo que devem ser informados pelo usuário (além da base), exceto opcionais.
 * @param {string[]} camposUsuario
 */
function camposExtrasObrigatorios(camposUsuario) {
  if (!Array.isArray(camposUsuario)) return [];
  return camposUsuario.filter(
    (c) => !CAMPOS_BASE.has(c) && !CAMPOS_OPCIONAIS_TEMPLATE.has(c)
  );
}

/**
 * @param {unknown} body
 */
function extrairCamposExtrasGeracao(body) {
  return {
    especialidade: strTrim(body, 'especialidade'),
    juizo: strTrim(body, 'juizo'),
    dataRemessaConclusao: strTrim(body, 'dataRemessaConclusao'),
    idRecursoInominado: strTrim(body, 'idRecursoInominado'),
    dataLaudoMedico: strTrim(body, 'dataLaudoMedico'),
    dataLaudoSocial: strTrim(body, 'dataLaudoSocial'),
    dataContestacao: strTrim(body, 'dataContestacao'),
    dataReplica: strTrim(body, 'dataReplica'),
    poloPassivoPreset: strTrim(body, 'poloPassivoPreset'),
  };
}

/**
 * @param {object} templateDef
 * @param {Record<string, string>} valoresPorCampo
 * @returns {{ ok: true } | { ok: false, message: string }}
 */
function validarCamposExtrasDoTemplate(templateDef, valoresPorCampo) {
  for (const campo of camposExtrasObrigatorios(templateDef.camposUsuario)) {
    const v = valoresPorCampo[campo];
    if (typeof v !== 'string' || !v.trim()) {
      const rotulo = LABELS_CAMPO[campo] || campo;
      return { ok: false, message: `${rotulo} é obrigatório para este modelo` };
    }
  }
  return { ok: true };
}

/**
 * Validação antes de consultar o Datajud (nome, processo, modelo e especialidade se o modelo exigir).
 * @param {unknown} body
 * @returns {{ ok: true, templateDef: object, data: { nomeCliente: string, numeroProcesso: string, templateId: string } } | { ok: false, message: string, statusCode?: number }}
 */
function validarGeracaoPreflight(body) {
  const nomeCliente = strTrim(body, 'nomeCliente');
  const templateId = strTrim(body, 'templateId');
  const numeroProcesso =
    typeof body?.numeroProcesso === 'string' ? body.numeroProcesso : '';

  const extras = extrairCamposExtrasGeracao(body);

  if (!nomeCliente) {
    return { ok: false, message: 'Nome do cliente é obrigatório' };
  }
  const genero = normalizarGenero(body?.genero);
  if (!generoValido(genero)) {
    return { ok: false, message: 'Informe o gênero (masculino ou feminino)' };
  }
  if (!templateId) {
    return { ok: false, message: 'Selecione um modelo de documento' };
  }
  const digits = apenasDigitosProcesso(numeroProcesso);
  if (digits.length !== 20) {
    return { ok: false, message: 'Número do processo deve conter 20 dígitos' };
  }

  const templateDef = templateCatalog.obterPorId(templateId);
  if (!templateDef) {
    return {
      ok: false,
      message: 'Modelo de documento não encontrado',
      statusCode: 404,
    };
  }

  if (
    Array.isArray(templateDef.camposUsuario) &&
    templateDef.camposUsuario.includes('especialidade') &&
    !extras.especialidade
  ) {
    return { ok: false, message: 'Especialidade médica é obrigatória para este modelo' };
  }

  return {
    ok: true,
    templateDef,
    data: {
      nomeCliente,
      numeroProcesso: digits,
      templateId,
      genero,
    },
  };
}

/**
 * Valida após mesclar inferências do Datajud com o corpo da requisição.
 * @param {unknown} mergedBody
 * @param {object} templateDef
 */
function validarGeracaoPosMerge(mergedBody, templateDef) {
  const nomeCliente = strTrim(mergedBody, 'nomeCliente');
  const templateId = strTrim(mergedBody, 'templateId');
  const numeroProcesso =
    typeof mergedBody?.numeroProcesso === 'string' ? mergedBody.numeroProcesso : '';
  const digits = apenasDigitosProcesso(numeroProcesso);
  const genero = normalizarGenero(mergedBody?.genero);
  if (!generoValido(genero)) {
    return { ok: false, message: 'Informe o gênero (masculino ou feminino)' };
  }
  const extras = extrairCamposExtrasGeracao(mergedBody);

  const vExtras = validarCamposExtrasDoTemplate(templateDef, extras);
  if (!vExtras.ok) {
    return vExtras;
  }

  return {
    ok: true,
    templateDef,
    data: {
      nomeCliente,
      numeroProcesso: digits,
      templateId,
      genero,
      ...extras,
    },
  };
}

/**
 * Validação completa sem inferência (testes e fluxos que já enviam todos os campos).
 * @param {unknown} body
 * @returns {{ ok: true, data: object, templateDef: object } | { ok: false, message: string, statusCode?: number }}
 */
function validarGeracao(body) {
  const pre = validarGeracaoPreflight(body);
  if (!pre.ok) {
    return pre;
  }
  return validarGeracaoPosMerge(body, pre.templateDef);
}

/**
 * @param {unknown} body
 */
function validarConsulta(body) {
  const numeroProcesso =
    typeof body?.numeroProcesso === 'string' ? body.numeroProcesso : '';
  const digits = apenasDigitosProcesso(numeroProcesso);
  if (digits.length !== 20) {
    return { ok: false, message: 'Número do processo deve conter 20 dígitos' };
  }
  return { ok: true, data: { numeroProcesso: digits } };
}

module.exports = {
  validarGeracao,
  validarGeracaoPreflight,
  validarGeracaoPosMerge,
  validarConsulta,
  validarCamposExtrasDoTemplate,
  extrairCamposExtrasGeracao,
};
