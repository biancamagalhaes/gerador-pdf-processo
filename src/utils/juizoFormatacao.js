/**
 * Formatação do texto de endereçamento ao juízo (cabeçalho) para modelos INSS.
 * Usado pelo mapper de templates e pela API de pré-visualização.
 * @module utils/juizoFormatacao
 */

const JUIZO_VARA_PADRAO =
  'EXCELENTÍSSIMO(A) SENHOR(A) DOUTOR(A) JUIZ(A) DA ______.ª VARA FEDERAL – JUS FEDERAL – ________/BA';

/**
 * Cidades comuns (TRF1 e adjacências) → UF quando o Datajud não traz "CIDADE/UF".
 * Chaves sem acento, maiúsculas.
 */
const CIDADE_PARA_UF = {
  'FEIRA DE SANTANA': 'BA',
  SALVADOR: 'BA',
  'JUIZADO ESPECIAL FEDERAL': 'BA',
  RECIFE: 'PE',
  MACEIO: 'AL',
  NATAL: 'RN',
  'JOAO PESSOA': 'PB',
  ARACAJU: 'SE',
  TERESINA: 'PI',
  FORTALEZA: 'CE',
};

/**
 * Adequa o nome do órgão (ex.: Datajud) ao padrão de endereçamento de vara federal:
 * ordinal com ponto (1.ª), travessões tipográficos e caixa alta.
 *
 * @param {string} orgao
 * @returns {string}
 */
function normalizarOrgaoVaraParaExibicao(orgao) {
  let s = orgao.trim().toUpperCase();
  s = s.replace(/\s*[-–—]\s*/g, ' – ');
  s = s.replace(/^(\d+)\s*\.?\s*º?\s*ª(?=\s|$)/, (_, n) => `${parseInt(n, 10)}.ª`);
  return s;
}

/**
 * Remove acentos para lookup em CIDADE_PARA_UF.
 * @param {string} s
 */
function normalizarChaveCidade(s) {
  return s
    .normalize('NFD')
    .replaceAll(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
}

/**
 * @param {string} cidade
 * @returns {string | null}
 */
function inferUfPorNomeCidade(cidade) {
  const k = normalizarChaveCidade(cidade);
  return CIDADE_PARA_UF[k] || null;
}

/**
 * Órgão julgador que é relatoria / turma recursal (endereçamento ao juiz relator).
 * @param {string} orgao
 */
function isOrgaoRelatoriaTurmaRecursal(orgao) {
  const u = orgao.toUpperCase();
  return /\bRELATORIA\b/.test(u) || /\bTURMA\s+RECURSAL\b/.test(u);
}

/**
 * Monta o cabeçalho padrão de vara: DA N.ª VARA (FEDERAL|ESTADUAL) – JUS … – CIDADE/UF.
 * Quando o Datajud já traz a linha completa (VARA FEDERAL + JUS FEDERAL + local), só normaliza.
 *
 * @param {string} orgaoRaw
 * @param {string} [_numeroProcessoRaw] reservado para inferência futura via CNJ
 */
function montarCabecalhoVara(orgaoRaw, _numeroProcessoRaw = '') {
  const orgao = orgaoRaw.trim().toUpperCase();

  if (/\bVARA\s+(FEDERAL|ESTADUAL)\b/.test(orgao)) {
    const body = normalizarOrgaoVaraParaExibicao(orgaoRaw.trim());
    return `EXCELENTÍSSIMO(A) SENHOR(A) DOUTOR(A) JUIZ(A) DA ${body}`;
  }

  const m = orgao.match(/^(\d+)\s*\.?\s*º?\s*ª\s*(.+)$/);
  if (m && !/\bVARA\b/.test(orgao)) {
    const n = parseInt(m[1], 10);
    let rest = m[2].trim();
    let uf = '';
    const slash = rest.match(/\/\s*([A-Z]{2})\s*$/);
    if (slash) {
      uf = slash[1];
      rest = rest.replace(/\s*\/\s*[A-Z]{2}\s*$/, '').trim();
    }
    if (!uf) {
      uf = inferUfPorNomeCidade(rest) || 'BA';
    }
    const esfera = /\bESTADUAL\b/.test(orgao) ? 'ESTADUAL' : 'FEDERAL';
    const jus = esfera === 'ESTADUAL' ? 'JUS ESTADUAL' : 'JUS FEDERAL';
    const cidade = normalizarChaveCidade(rest);
    return `EXCELENTÍSSIMO(A) SENHOR(A) DOUTOR(A) JUIZ(A) DA ${n}.ª VARA ${esfera} – ${jus} – ${cidade}/${uf}`;
  }

  const body = normalizarOrgaoVaraParaExibicao(orgaoRaw.trim());
  return `EXCELENTÍSSIMO(A) SENHOR(A) DOUTOR(A) JUIZ(A) DA ${body}`;
}

/**
 * Placeholder quando não há órgão julgador na consulta.
 */
function juizoPadraoPorModelo(_templateId) {
  return JUIZO_VARA_PADRAO;
}

/**
 * Usa o órgão julgador retornado pelo Datajud para preencher o juízo do modelo.
 *
 * @param {string} templateId
 * @param {unknown} orgaoJulgador
 * @param {string} [numeroProcessoRaw] 20 dígitos; opcional para inferências futuras
 */
function formatarJuizo(templateId, orgaoJulgador, numeroProcessoRaw = '') {
  const orgao = typeof orgaoJulgador === 'string' ? orgaoJulgador.trim() : '';

  if (!orgao) {
    return juizoPadraoPorModelo(templateId);
  }

  const oU = orgao.toUpperCase();
  if (oU.startsWith('EXCELENTÍSSIMO')) {
    return orgao;
  }

  if (isOrgaoRelatoriaTurmaRecursal(orgao)) {
    return `EXCELENTÍSSIMO(A) SENHOR(A) DOUTOR(A) JUIZ(A) RELATOR(A) DA ${oU}`;
  }

  return montarCabecalhoVara(orgao, numeroProcessoRaw);
}

module.exports = {
  formatarJuizo,
  normalizarOrgaoVaraParaExibicao,
  juizoPadraoPorModelo,
  montarCabecalhoVara,
  isOrgaoRelatoriaTurmaRecursal,
};
