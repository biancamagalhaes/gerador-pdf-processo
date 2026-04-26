/**
 * Sugere template a partir do payload DataJud (TRF1) com regras conservadoras.
 * @module services/templateInferenceService
 */

const {
  primeiroMovimentoContestacao,
  ultimaConclusaoParaJulgamento,
  primeiroMovimentoReplica,
} = require('./datajudInferenceService');

/** @typedef {'alta' | 'media' | 'baixa'} ConfiancaInferencia */

/**
 * @param {string} s
 */
function normalizarTextoBusca(s) {
  return String(s || '')
    .normalize('NFD')
    .replaceAll(/[\u0300-\u036f]/g, '')
    .toUpperCase();
}

/**
 * @param {object} source `_source` do hit Datajud
 */
function textoClasseEAssuntos(source) {
  const partes = [];
  const classe = source?.classe?.nome ?? source?.classe;
  if (typeof classe === 'string' && classe.trim()) {
    partes.push(classe.trim());
  }
  const assuntos = source?.assuntos;
  if (Array.isArray(assuntos)) {
    for (const a of assuntos) {
      const nome = a?.nome ?? a?.descricao;
      if (typeof nome === 'string' && nome.trim()) {
        partes.push(nome.trim());
      }
    }
  }
  return normalizarTextoBusca(partes.join(' '));
}

/**
 * @param {string} texto
 */
function indicaBpcLoas(texto) {
  if (!texto) return false;
  return (
    texto.includes('BPC') ||
    texto.includes('LOAS') ||
    texto.includes('BENEFICIO DE PRESTACAO CONTINUADA') ||
    texto.includes('ASSISTENCIA SOCIAL')
  );
}

/**
 * @param {string} texto
 */
function indicaAuxilioDoenca(texto) {
  if (!texto) return false;
  return (
    texto.includes('AUXILIO-DOENCA') ||
    texto.includes('AUXILIO DOENCA') ||
    texto.includes('BENEFICIO POR INCAPACIDADE') ||
    (texto.includes('AUXILIO') && texto.includes('DOENCA'))
  );
}

/**
 * @param {object} source `_source` do hit Datajud
 * @returns {{
 *   templateIdSugerido: string | null,
 *   confianca: ConfiancaInferencia,
 *   motivos: string[],
 *   alternativas: string[]
 * }}
 */
function inferirTemplateDoProcesso(source) {
  const movimentos = Array.isArray(source?.movimentos) ? source.movimentos : [];
  const conclJulg = ultimaConclusaoParaJulgamento(movimentos);
  const contest = primeiroMovimentoContestacao(movimentos);
  const replica = primeiroMovimentoReplica(movimentos);

  const temConclusaoJulgamento = Boolean(conclJulg);
  const temContestacao = Boolean(contest);
  const temReplica = Boolean(replica);

  const textoMateria = textoClasseEAssuntos(source);
  const bpc = indicaBpcLoas(textoMateria);
  const auxDoenca = indicaAuxilioDoenca(textoMateria);

  /** @type {string[]} */
  const motivos = [];
  /** @type {string[]} */
  const alternativas = [];

  if (temConclusaoJulgamento && temContestacao && temReplica) {
    alternativas.push(
      'cobrar-inclusao-pauta-julgamento',
      'prolatoria-sentenca-auxilio-doenca',
      'prolatoria-sentenca-bpc-loas-deficiente'
    );
    return {
      templateIdSugerido: null,
      confianca: 'baixa',
      motivos: [
        'Há conclusão para julgamento e também contestação e réplica nos autos; o modelo depende da peça desejada.',
      ],
      alternativas,
    };
  }

  if (temConclusaoJulgamento) {
    motivos.push('Movimento de conclusão para julgamento identificado.');
    return {
      templateIdSugerido: 'cobrar-inclusao-pauta-julgamento',
      confianca: 'alta',
      motivos,
      alternativas: [],
    };
  }

  if (temContestacao && temReplica) {
    if (bpc && auxDoenca) {
      alternativas.push(
        'prolatoria-sentenca-auxilio-doenca',
        'prolatoria-sentenca-bpc-loas-deficiente'
      );
      return {
        templateIdSugerido: null,
        confianca: 'baixa',
        motivos: [
          'Contestação e réplica presentes, mas a matéria (classe/assuntos) indica sinais conflitantes entre auxílio-doença e BPC/LOAS.',
        ],
        alternativas,
      };
    }
    if (bpc) {
      motivos.push(
        'Contestação e réplica presentes; classe ou assuntos sugerem BPC/LOAS.',
      );
      return {
        templateIdSugerido: 'prolatoria-sentenca-bpc-loas-deficiente',
        confianca: 'media',
        motivos,
        alternativas: [],
      };
    }
    if (auxDoenca) {
      motivos.push(
        'Contestação e réplica presentes; classe ou assuntos sugerem auxílio-doença.',
      );
      return {
        templateIdSugerido: 'prolatoria-sentenca-auxilio-doenca',
        confianca: 'media',
        motivos,
        alternativas: [],
      };
    }
    return {
      templateIdSugerido: null,
      confianca: 'baixa',
      motivos: [
        'Contestação e réplica presentes, mas não foi possível inferir a matéria (BPC/LOAS vs auxílio-doença) a partir da classe e dos assuntos.',
      ],
      alternativas: [
        'prolatoria-sentenca-auxilio-doenca',
        'prolatoria-sentenca-bpc-loas-deficiente',
      ],
    };
  }

  return {
    templateIdSugerido: null,
    confianca: 'baixa',
    motivos: [
      'Sem sinais suficientes nos movimentos e na matéria para sugerir um modelo automaticamente.',
    ],
    alternativas: [],
  };
}

module.exports = {
  inferirTemplateDoProcesso,
  textoClasseEAssuntos,
  indicaBpcLoas,
  indicaAuxilioDoenca,
};
