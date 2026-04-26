const PLACEHOLDER_CAMPO = '______________';

const { formatarJuizo, normalizarOrgaoVaraParaExibicao } = require('../../utils/juizoFormatacao');
const { normalizarGenero, participioQualificado } = require('../../utils/generoTexto');

/** Texto padrão do polo passivo nos modelos (réu INSS). */
const POLO_PASSIVO_INSS = 'INSS-INSTITUTO NACIONAL DO SEGURO SOCIAL';

/** Polo passivo quando a ação é contra a União Federal (artigo feminino: "contra a"). */
const POLO_PASSIVO_UNIAO_FEDERAL = 'UNIÃO FEDERAL';

/**
 * @param {unknown} raw
 * @returns {{ litiga_contra_artigo: 'o' | 'a', polo_passivo: string }}
 */
function resolverPoloPassivo(raw) {
  const s = typeof raw === 'string' ? raw.trim().toLowerCase() : '';
  if (s === 'uniao_federal') {
    return { litiga_contra_artigo: 'a', polo_passivo: POLO_PASSIVO_UNIAO_FEDERAL };
  }
  return { litiga_contra_artigo: 'o', polo_passivo: POLO_PASSIVO_INSS };
}

/**
 * @param {unknown} v
 * @returns {string}
 */
function campoOpcional(v) {
  const s =
    typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean'
      ? String(v).trim()
      : '';
  return s || PLACEHOLDER_CAMPO;
}

/**
 * Mapper padrão para petições no modelo INSS (mesmo HTML base).
 * Combina entrada do usuário, processo normalizado e assets.
 *
 * @param {object} params
 * @param {object} params.documentInput
 * @param {object} params.processo
 * @param {{ logo_base64: string, footer_base64: string }} params.logos
 */
function mapToTemplateContext({ documentInput, processo, logos }) {
  const dataHoje = new Date().toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  const juizoInformado =
    typeof documentInput.juizo === 'string' ? documentInput.juizo.trim() : '';

  const generoNorm = normalizarGenero(documentInput.genero);
  const qualificadoParticula = participioQualificado(generoNorm);

  const polo = resolverPoloPassivo(documentInput.poloPassivoPreset);

  return {
    logo_base64: logos.logo_base64,
    footer_base64: logos.footer_base64,
    numero_processo: processo.numeroProcessoFormatado,
    nome_cliente: String(documentInput.nomeCliente || '').toUpperCase(),
    qualificado_particula: qualificadoParticula,
    litiga_contra_artigo: polo.litiga_contra_artigo,
    polo_passivo: polo.polo_passivo,
    data_distribuicao: processo.dataAjuizamentoFormatada,
    especialidade: String(documentInput.especialidade || '').toUpperCase(),
    data_hoje: dataHoje,
    juizo:
      juizoInformado ||
      formatarJuizo(documentInput.templateId, processo.orgaoJulgador, processo.numeroProcessoRaw),
    data_remessa_conclusao: campoOpcional(documentInput.dataRemessaConclusao),
    id_recurso_inominado: campoOpcional(documentInput.idRecursoInominado),
    data_laudo_pericia: campoOpcional(documentInput.dataLaudoMedico),
    data_laudo_social: campoOpcional(documentInput.dataLaudoSocial),
    data_contestacao: campoOpcional(documentInput.dataContestacao),
    data_replica: campoOpcional(documentInput.dataReplica),
  };
}

module.exports = {
  mapToTemplateContext,
  normalizarOrgaoVaraParaExibicao,
  resolverPoloPassivo,
  POLO_PASSIVO_INSS,
  POLO_PASSIVO_UNIAO_FEDERAL,
};
