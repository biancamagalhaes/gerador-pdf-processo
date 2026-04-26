const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');

const templateCatalog = require('../src/services/templateCatalogService');
const { montarContexto } = require('../src/services/templateContextService');
const { normalizarDeHit } = require('../src/services/processoNormalizerService');
const { renderHtml } = require('../src/services/templateService');

const LOGOS_FIXTURE = {
  logo_base64: 'data:image/png;base64,LOGO_FIXTURE',
  footer_base64: 'data:image/png;base64,FOOTER_FIXTURE',
};

const PROCESSO_FIXTURE_BASE = {
  numeroProcesso: '50013728220234010001',
  dataAjuizamento: '20230415',
  classe: { nome: 'Procedimento do Juizado Especial Cível' },
  sistema: { nome: 'PJe' },
};

const SHARED_SOURCE_SNIPPETS = [
  '@page',
  "font-family: 'Calibri', sans-serif;",
  'margin: 1cm 2.5cm 2.5cm 2.5cm;',
  'line-height: 1.5;',
  'margin-left: 0;',
  'width: 270px;',
  'text-transform: uppercase;',
  'text-indent: 1cm;',
  'calc(100% + 5cm)',
  'assinaturas-spacer',
  'border-collapse: collapse;',
  '<img src="{{logo_base64}}" alt="Logo">',
  '<img src="{{footer_base64}}" alt="Rodapé">',
  '{{qualificado_particula}}',
  '{{litiga_contra_artigo}}',
  '{{polo_passivo}}',
  '<div class="juizo">',
  'Processo n.º <span class="negrito">{{numero_processo}}</span>',
  'EDDIE PARISH',
  'CARLOS ZENANDRO',
  'OAB/BA n.º 23.186',
  'OAB/BA n.º 27.022',
  '<p class="texto"',
];

const SHARED_RENDERED_SNIPPETS = [
  '<img src="data:image/png;base64,LOGO_FIXTURE" alt="Logo">',
  '<img src="data:image/png;base64,FOOTER_FIXTURE" alt="Rodapé">',
  'Processo n.º <span class="negrito">5001372-82.2023.4.01.0001</span>',
  'Salvador, Bahia, em 08 de abril de 2026.',
  'EDDIE PARISH',
  'CARLOS ZENANDRO',
  'OAB/BA n.º 23.186',
  'OAB/BA n.º 27.022',
  'já qualificada nos autos',
  'em que litiga contra o',
  'INSS-INSTITUTO NACIONAL DO SEGURO SOCIAL',
];

const UNEXPECTED_RENDERED_SNIPPETS = [
  '{{',
  '}}',
  'qualificadX',
  'XX/XX/XXXX',
  'qualificado(a)',
];

const TEMPLATE_SCENARIOS = [
  {
    templateId: 'impulsionamento-julgamento',
    orgaoJulgador: '3ª VARA FEDERAL - JUS FEDERAL - FEIRA DE SANTANA/BA',
    documentInput: {
      nomeCliente: 'Maria da Silva',
      genero: 'feminino',
      numeroProcesso: '50013728220234010001',
      especialidade: 'ortopedia',
    },
    expectedJuizo:
      'EXCELENTÍSSIMO(A) SENHOR(A) DOUTOR(A) JUIZ(A) DA 3.ª VARA FEDERAL – JUS FEDERAL – FEIRA DE SANTANA/BA',
    expectedSourceSnippets: ['{{juizo}}', '{{data_distribuicao}}', '{{especialidade}}'],
    expectedRenderedSnippets: [
      'MARIA DA SILVA',
      '15/04/2023',
      'ORTOPEDIA',
      'PERÍCIA MÉDICA',
    ],
  },
  {
    templateId: 'designacao-pericia',
    orgaoJulgador: '3ª VARA FEDERAL - JUS FEDERAL - FEIRA DE SANTANA/BA',
    documentInput: {
      nomeCliente: 'Maria da Silva',
      genero: 'feminino',
      numeroProcesso: '50013728220234010001',
      especialidade: 'ortopedia',
    },
    expectedJuizo:
      'EXCELENTÍSSIMO(A) SENHOR(A) DOUTOR(A) JUIZ(A) DA 3.ª VARA FEDERAL – JUS FEDERAL – FEIRA DE SANTANA/BA',
    expectedSourceSnippets: ['{{juizo}}', '{{data_distribuicao}}', '{{especialidade}}'],
    expectedRenderedSnippets: [
      'MARIA DA SILVA',
      '15/04/2023',
      'ORTOPEDIA',
      'PERÍCIA MÉDICA',
    ],
  },
  {
    templateId: 'cobrar-inclusao-pauta-julgamento',
    orgaoJulgador: '1ª RELATORIA DA 1ª TURMA RECURSAL DE SALVADOR/BA',
    documentInput: {
      nomeCliente: 'Maria da Silva',
      genero: 'feminino',
      numeroProcesso: '50013728220234010001',
      especialidade: '',
      dataRemessaConclusao: '21/02/2026',
      idRecursoInominado: '1234567890',
    },
    expectedJuizo:
      'EXCELENTÍSSIMO(A) SENHOR(A) DOUTOR(A) JUIZ(A) RELATOR(A) DA 1ª RELATORIA DA 1ª TURMA RECURSAL DE SALVADOR/BA',
    expectedSourceSnippets: ['{{juizo}}', '{{data_remessa_conclusao}}', '{{id_recurso_inominado}}'],
    expectedRenderedSnippets: [
      'MARIA DA SILVA',
      '21/02/2026',
      '1234567890',
      'pauta de julgamento',
      'Recurso Inominado de <span class="italico">id</span>.',
    ],
  },
  {
    templateId: 'intimacao-parte-re',
    orgaoJulgador: '3ª VARA FEDERAL - JUS FEDERAL - FEIRA DE SANTANA/BA',
    documentInput: {
      nomeCliente: 'Maria da Silva',
      genero: 'feminino',
      numeroProcesso: '50013728220234010001',
      especialidade: '',
      dataLaudoMedico: '10/05/2025',
    },
    expectedJuizo:
      'EXCELENTÍSSIMO(A) SENHOR(A) DOUTOR(A) JUIZ(A) DA 3.ª VARA FEDERAL – JUS FEDERAL – FEIRA DE SANTANA/BA',
    expectedSourceSnippets: ['{{juizo}}', '{{data_laudo_pericia}}'],
    expectedRenderedSnippets: [
      'MARIA DA SILVA',
      '10/05/2025',
      'INTIMAÇÃO DA PARTE RÉ',
      'APRESENTE CONTESTAÇÃO OU PROPOSTA DE ACORDO',
    ],
  },
  {
    templateId: 'prolatoria-sentenca-auxilio-doenca',
    orgaoJulgador: '3ª VARA FEDERAL - JUS FEDERAL - FEIRA DE SANTANA/BA',
    documentInput: {
      nomeCliente: 'Maria da Silva',
      genero: 'feminino',
      numeroProcesso: '50013728220234010001',
      especialidade: '',
      dataLaudoMedico: '10/05/2025',
      dataContestacao: '20/05/2025',
      dataReplica: '30/05/2025',
    },
    expectedJuizo:
      'EXCELENTÍSSIMO(A) SENHOR(A) DOUTOR(A) JUIZ(A) DA 3.ª VARA FEDERAL – JUS FEDERAL – FEIRA DE SANTANA/BA',
    expectedSourceSnippets: [
      '{{juizo}}',
      '{{data_laudo_pericia}}',
      '{{data_contestacao}}',
      '{{data_replica}}',
      'texto-conclusao',
      'negrito italico',
      'negrito sublinhado',
    ],
    expectedRenderedSnippets: [
      'MARIA DA SILVA',
      '10/05/2025',
      '20/05/2025',
      '30/05/2025',
      'REITERAR AS PETIÇÕES ANTERIORMENTE PROTOLADAS',
      'negrito italico',
      'negrito sublinhado',
      'PROLAÇÃO DA SENTENÇA',
    ],
  },
  {
    templateId: 'prolatoria-sentenca-bpc-loas-deficiente',
    orgaoJulgador: '3ª VARA FEDERAL - JUS FEDERAL - FEIRA DE SANTANA/BA',
    documentInput: {
      nomeCliente: 'Maria da Silva',
      genero: 'feminino',
      numeroProcesso: '50013728220234010001',
      especialidade: '',
      dataLaudoMedico: '10/05/2025',
      dataLaudoSocial: '15/05/2025',
      dataContestacao: '20/05/2025',
      dataReplica: '30/05/2025',
    },
    expectedJuizo:
      'EXCELENTÍSSIMO(A) SENHOR(A) DOUTOR(A) JUIZ(A) DA 3.ª VARA FEDERAL – JUS FEDERAL – FEIRA DE SANTANA/BA',
    expectedSourceSnippets: [
      '{{juizo}}',
      '{{data_laudo_pericia}}',
      '{{data_laudo_social}}',
      '{{data_contestacao}}',
      '{{data_replica}}',
      'texto-conclusao',
      'negrito italico',
      'negrito sublinhado',
    ],
    expectedRenderedSnippets: [
      'MARIA DA SILVA',
      '10/05/2025',
      '15/05/2025',
      '20/05/2025',
      '30/05/2025',
      'REITERAR AS PETIÇÕES ANTERIORMENTE PROTOLADAS',
      'negrito italico',
      'negrito sublinhado',
      'PROLAÇÃO DA SENTENÇA',
    ],
  },
];

function criarProcessoNormalizado(orgaoJulgador) {
  return normalizarDeHit({
    _source: {
      ...PROCESSO_FIXTURE_BASE,
      orgaoJulgador: { nome: orgaoJulgador },
    },
  });
}

function assertContainsAll(texto, trechos, contexto) {
  trechos.forEach((trecho) => {
    assert.ok(
      texto.includes(trecho),
      `${contexto} deveria conter ${JSON.stringify(trecho)}`
    );
  });
}

async function carregarTemplate(templateId) {
  const templateDef = templateCatalog.obterPorId(templateId);
  assert.ok(templateDef, `Template ${templateId} deve existir no catálogo`);

  const source = await fs.readFile(templateDef.templatePath, 'utf8');
  return { templateDef, source };
}

async function renderizarTemplate(scenario) {
  const { templateDef } = await carregarTemplate(scenario.templateId);
  const processo = criarProcessoNormalizado(scenario.orgaoJulgador);
  const contexto = montarContexto(
    templateDef,
    {
      templateId: scenario.templateId,
      ...scenario.documentInput,
    },
    processo,
    LOGOS_FIXTURE
  );

  const html = await renderHtml(templateDef.templatePath, {
    ...contexto,
    data_hoje: '08 de abril de 2026',
  });

  return { html, contexto, processo, templateDef };
}

test('montarContexto usa dados do processo consultado e do formulario', async () => {
  const scenario = TEMPLATE_SCENARIOS.find((item) => item.templateId === 'designacao-pericia');
  const { contexto, processo } = await renderizarTemplate(scenario);

  assert.equal(contexto.nome_cliente, 'MARIA DA SILVA');
  assert.equal(contexto.numero_processo, processo.numeroProcessoFormatado);
  assert.equal(contexto.data_distribuicao, '15/04/2023');
  assert.equal(contexto.especialidade, 'ORTOPEDIA');
  assert.equal(contexto.qualificado_particula, 'qualificada');
  assert.equal(contexto.juizo, scenario.expectedJuizo);
});

test('montarContexto usa artigo feminino e texto da União Federal quando poloPassivoPreset é uniao_federal', () => {
  const templateDef = templateCatalog.obterPorId('designacao-pericia');
  const processo = criarProcessoNormalizado('3ª VARA FEDERAL - JUS FEDERAL - FEIRA DE SANTANA/BA');

  const contexto = montarContexto(
    templateDef,
    {
      nomeCliente: 'Maria da Silva',
      genero: 'feminino',
      numeroProcesso: '50013728220234010001',
      especialidade: 'ortopedia',
      templateId: 'designacao-pericia',
      poloPassivoPreset: 'uniao_federal',
    },
    processo,
    LOGOS_FIXTURE
  );

  assert.equal(contexto.litiga_contra_artigo, 'a');
  assert.equal(contexto.polo_passivo, 'UNIÃO FEDERAL');
});

test('montarContexto preserva placeholders visuais quando faltam campos opcionais', () => {
  const templateDef = templateCatalog.obterPorId('cobrar-inclusao-pauta-julgamento');
  const processo = criarProcessoNormalizado(
    '1ª RELATORIA DA 1ª TURMA RECURSAL DE SALVADOR/BA'
  );

  const contexto = montarContexto(
    templateDef,
    {
      nomeCliente: 'Maria da Silva',
      genero: 'masculino',
      numeroProcesso: '50013728220234010001',
      especialidade: '',
      templateId: 'cobrar-inclusao-pauta-julgamento',
    },
    processo,
    LOGOS_FIXTURE
  );

  assert.equal(contexto.qualificado_particula, 'qualificado');
  assert.equal(contexto.data_remessa_conclusao, '______________');
  assert.equal(contexto.id_recurso_inominado, '______________');
  assert.equal(
    contexto.juizo,
    'EXCELENTÍSSIMO(A) SENHOR(A) DOUTOR(A) JUIZ(A) RELATOR(A) DA 1ª RELATORIA DA 1ª TURMA RECURSAL DE SALVADOR/BA'
  );
});

test('modelos BPC deficiente e idoso alternativo compartilham o mesmo HTML', () => {
  const principal = templateCatalog.obterPorId('prolatoria-sentenca-bpc-loas-deficiente');
  const alternativo = templateCatalog.obterPorId('prolatoria-sentenca-bpc-loas-idoso-2');

  assert.ok(principal);
  assert.ok(alternativo);
  assert.equal(principal.templatePath, alternativo.templatePath);
});

test('templates mantem a estrutura visual compartilhada e os placeholders essenciais', async () => {
  for (const scenario of TEMPLATE_SCENARIOS) {
    const { source } = await carregarTemplate(scenario.templateId);

    assertContainsAll(
      source,
      SHARED_SOURCE_SNIPPETS,
      `O template ${scenario.templateId}`
    );
    assertContainsAll(
      source,
      scenario.expectedSourceSnippets,
      `O template ${scenario.templateId}`
    );
  }
});

test('templates renderizados substituem os campos dinamicos sem vazar placeholders do docx', async () => {
  for (const scenario of TEMPLATE_SCENARIOS) {
    const { html } = await renderizarTemplate(scenario);

    assertContainsAll(
      html,
      SHARED_RENDERED_SNIPPETS,
      `O HTML renderizado de ${scenario.templateId}`
    );
    assertContainsAll(
      html,
      [scenario.expectedJuizo, ...scenario.expectedRenderedSnippets],
      `O HTML renderizado de ${scenario.templateId}`
    );

    UNEXPECTED_RENDERED_SNIPPETS.forEach((trecho) => {
      assert.ok(
        !html.includes(trecho),
        `O HTML renderizado de ${scenario.templateId} nao deveria conter ${JSON.stringify(trecho)}`
      );
    });
  }
});
