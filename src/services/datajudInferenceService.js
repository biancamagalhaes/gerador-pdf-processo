/**
 * Infere campos úteis à geração de documentos a partir do payload bruto do Datajud (TRF1).
 * Heurísticas baseadas em códigos/nomes de movimentos e complementos tabelados do PJe.
 * @module services/datajudInferenceService
 */

/**
 * @typedef {'certa' | 'provavel' | 'nenhuma'} ConfiancaInferencia
 */

/**
 * @typedef {{ valor: string | null, confianca: ConfiancaInferencia, origem?: string }} InferenciaCampo
 */

/**
 * @param {string|undefined} iso
 * @returns {string|null} dd/mm/aaaa ou null
 */
function dataIsoParaPtBr(iso) {
  if (!iso || typeof iso !== 'string') return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'America/Sao_Paulo',
  });
}

/**
 * @param {object} mov
 * @param {string} descricao
 * @param {string} nome
 */
function temComplemento(mov, descricao, nome) {
  const tabs = mov.complementosTabelados;
  if (!Array.isArray(tabs)) return false;
  return tabs.some((c) => c.descricao === descricao && c.nome === nome);
}

/**
 * Texto agregado do movimento para heurísticas prováveis.
 * @param {object} mov
 */
function textoMovimento(mov) {
  const parts = [mov.nome, mov.codigo != null ? String(mov.codigo) : ''];
  if (Array.isArray(mov.complementosTabelados)) {
    for (const c of mov.complementosTabelados) {
      parts.push(c.nome, c.descricao);
    }
  }
  return parts.filter(Boolean).join(' ').toLowerCase();
}

/**
 * @param {string|null} valor
 * @param {ConfiancaInferencia} confianca
 * @param {string} [origem]
 * @returns {InferenciaCampo}
 */
function campoInferido(valor, confianca, origem) {
  const v = typeof valor === 'string' && valor.trim() ? valor.trim() : null;
  if (!v || confianca === 'nenhuma') {
    return { valor: null, confianca: 'nenhuma', origem };
  }
  return { valor: v, confianca, origem };
}

/**
 * @param {object[]} movimentos
 * @returns {{ dataHora: string } | null}
 */
function primeiroMovimentoContestacao(movimentos) {
  let melhor = null;
  for (const m of movimentos) {
    if (m.codigo !== 85 || m.nome !== 'Petição') continue;
    if (!temComplemento(m, 'tipo_de_peticao', 'Contestação')) continue;
    if (!m.dataHora) continue;
    if (!melhor || String(m.dataHora) < String(melhor.dataHora)) {
      melhor = m;
    }
  }
  return melhor;
}

/**
 * @param {object[]} movimentos
 * @returns {{ dataHora: string } | null}
 */
function ultimaConclusaoParaJulgamento(movimentos) {
  let melhor = null;
  for (const m of movimentos) {
    if (m.codigo !== 51 || m.nome !== 'Conclusão') continue;
    if (!temComplemento(m, 'tipo_de_conclusao', 'para julgamento')) continue;
    if (!m.dataHora) continue;
    if (!melhor || String(m.dataHora) > String(melhor.dataHora)) {
      melhor = m;
    }
  }
  return melhor;
}

/**
 * @param {object[]} movimentos
 * @returns {{ dataHora: string } | null}
 */
function primeiroMovimentoReplica(movimentos) {
  let melhor = null;
  for (const m of movimentos) {
    if (m.codigo !== 85 || m.nome !== 'Petição') continue;
    if (!temComplemento(m, 'tipo_de_peticao', 'Réplica')) continue;
    if (!m.dataHora) continue;
    if (!melhor || String(m.dataHora) < String(melhor.dataHora)) {
      melhor = m;
    }
  }
  return melhor;
}

/** Indícios de laudo social (evita confundir com laudo médico). */
const REGEX_LAUDO_SOCIAL = /\b(laudo\s+social|per[ií]cia\s+social|assist(ente)?\s+social)\b/i;

/** Indícios genéricos de laudo/perícia (exclui só laudo social quando já capturado à parte). */
const REGEX_LAUDO_MEDICO_PROVAVEL =
  /\b(laudo(\s+m[eé]dico)?|per[ií]cia(\s+m[eé]dica)?|parecer\s+t[eé]cnico|exame\s+pericial)\b/i;

/**
 * Primeiro movimento com data cuja descrição sugere laudo social (ordem cronológica).
 * @param {object[]} movimentos
 * @returns {object | null}
 */
function primeiroMovimentoLaudoSocialProvavel(movimentos) {
  let melhor = null;
  for (const m of movimentos) {
    if (!m.dataHora) continue;
    const t = textoMovimento(m);
    if (!REGEX_LAUDO_SOCIAL.test(t)) continue;
    if (!melhor || String(m.dataHora) < String(melhor.dataHora)) {
      melhor = m;
    }
  }
  return melhor;
}

/**
 * Primeiro movimento com indício de laudo/perícia médica, excluindo texto típico de laudo social.
 * @param {object[]} movimentos
 */
function primeiroMovimentoLaudoMedicoProvavel(movimentos) {
  let melhor = null;
  for (const m of movimentos) {
    if (!m.dataHora) continue;
    const t = textoMovimento(m);
    if (REGEX_LAUDO_SOCIAL.test(t)) continue;
    if (!REGEX_LAUDO_MEDICO_PROVAVEL.test(t)) continue;
    if (!melhor || String(m.dataHora) < String(melhor.dataHora)) {
      melhor = m;
    }
  }
  return melhor;
}

/**
 * @param {object} source `_source` do hit Datajud
 * @returns {Record<string, InferenciaCampo>} chaves alinhadas a `documentInput`
 */
function inferirCamposDoDocumento(source) {
  const movimentos = Array.isArray(source?.movimentos) ? source.movimentos : [];

  const contest = primeiroMovimentoContestacao(movimentos);
  const conclJulg = ultimaConclusaoParaJulgamento(movimentos);
  const replica = primeiroMovimentoReplica(movimentos);
  const laudoMedProv = primeiroMovimentoLaudoMedicoProvavel(movimentos);
  const laudoSocProv = primeiroMovimentoLaudoSocialProvavel(movimentos);

  return {
    dataContestacao: campoInferido(
      contest?.dataHora ? dataIsoParaPtBr(contest.dataHora) : null,
      contest ? 'certa' : 'nenhuma',
      contest ? 'Petição (tipo_de_peticao: Contestação)' : undefined
    ),
    dataRemessaConclusao: campoInferido(
      conclJulg?.dataHora ? dataIsoParaPtBr(conclJulg.dataHora) : null,
      conclJulg ? 'certa' : 'nenhuma',
      conclJulg ? 'Conclusão (tipo_de_conclusao: para julgamento)' : undefined
    ),
    dataReplica: campoInferido(
      replica?.dataHora ? dataIsoParaPtBr(replica.dataHora) : null,
      replica ? 'certa' : 'nenhuma',
      replica ? 'Petição (tipo_de_peticao: Réplica)' : undefined
    ),
    dataLaudoMedico: campoInferido(
      laudoMedProv?.dataHora ? dataIsoParaPtBr(laudoMedProv.dataHora) : null,
      laudoMedProv ? 'provavel' : 'nenhuma',
      laudoMedProv
        ? 'Heurística: texto do movimento sugere laudo/perícia médica'
        : undefined
    ),
    dataLaudoSocial: campoInferido(
      laudoSocProv?.dataHora ? dataIsoParaPtBr(laudoSocProv.dataHora) : null,
      laudoSocProv ? 'provavel' : 'nenhuma',
      laudoSocProv
        ? 'Heurística: texto do movimento sugere laudo/perícia social'
        : undefined
    ),
    idRecursoInominado: campoInferido(null, 'nenhuma'),
  };
}

/** Chaves extras que podem ser preenchidas por inferência antes da validação. */
const CHAVES_MERGE_INFERENCIA = [
  'dataRemessaConclusao',
  'idRecursoInominado',
  'dataLaudoMedico',
  'dataLaudoSocial',
  'dataContestacao',
  'dataReplica',
];

/**
 * Valor aplicável no merge automático (somente inferência `certa`).
 * @param {InferenciaCampo | undefined} inf
 * @returns {string|null}
 */
function valorParaMerge(inf) {
  if (!inf || typeof inf !== 'object') return null;
  if (inf.confianca !== 'certa') return null;
  const v = inf.valor;
  return typeof v === 'string' && v.trim() ? v.trim() : null;
}

/**
 * Retorna uma cópia do corpo com inferências **certas** aplicadas onde o usuário deixou vazio.
 * Inferências `provavel` não são mescladas no servidor (o usuário confirma no front).
 * @param {Record<string, unknown>} body
 * @param {Record<string, InferenciaCampo>} inferidos
 * @returns {Record<string, unknown>}
 */
function aplicarInferenciasAoBody(body, inferidos) {
  const out = { ...body };
  for (const key of CHAVES_MERGE_INFERENCIA) {
    const user = typeof body[key] === 'string' ? body[key].trim() : '';
    const merged = valorParaMerge(inferidos[key]);
    if (!user && merged) {
      out[key] = merged;
    }
  }
  return out;
}

module.exports = {
  inferirCamposDoDocumento,
  aplicarInferenciasAoBody,
  CHAVES_MERGE_INFERENCIA,
  dataIsoParaPtBr,
  valorParaMerge,
  primeiroMovimentoContestacao,
  ultimaConclusaoParaJulgamento,
  primeiroMovimentoReplica,
  temComplemento,
};
