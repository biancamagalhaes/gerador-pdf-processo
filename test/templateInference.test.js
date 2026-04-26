const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  inferirTemplateDoProcesso,
  textoClasseEAssuntos,
} = require('../src/services/templateInferenceService');

const MOV_CONCLUSAO_JULG = {
  complementosTabelados: [
    { codigo: 3, valor: 36, nome: 'para julgamento', descricao: 'tipo_de_conclusao' },
  ],
  codigo: 51,
  nome: 'Conclusão',
  dataHora: '2024-06-11T13:15:46.000Z',
};

const MOV_CONTESTACAO = {
  complementosTabelados: [
    { codigo: 19, valor: 45, nome: 'Contestação', descricao: 'tipo_de_peticao' },
  ],
  codigo: 85,
  nome: 'Petição',
  dataHora: '2023-02-23T23:59:44.000Z',
};

const MOV_REPLICA = {
  complementosTabelados: [
    { codigo: 20, valor: 46, nome: 'Réplica', descricao: 'tipo_de_peticao' },
  ],
  codigo: 85,
  nome: 'Petição',
  dataHora: '2023-05-01T12:00:00.000Z',
};

test('inferirTemplateDoProcesso sugere cobrar-inclusao quando há conclusão para julgamento (sem contestação e réplica)', () => {
  const r = inferirTemplateDoProcesso({
    movimentos: [MOV_CONCLUSAO_JULG],
  });
  assert.equal(r.templateIdSugerido, 'cobrar-inclusao-pauta-julgamento');
  assert.equal(r.confianca, 'alta');
  assert.equal(r.alternativas.length, 0);
});

test('inferirTemplateDoProcesso não sugere quando conclusão para julgamento e contestação e réplica (ambíguo)', () => {
  const r = inferirTemplateDoProcesso({
    movimentos: [MOV_CONTESTACAO, MOV_REPLICA, MOV_CONCLUSAO_JULG],
  });
  assert.equal(r.templateIdSugerido, null);
  assert.equal(r.confianca, 'baixa');
  assert.ok(r.alternativas.includes('cobrar-inclusao-pauta-julgamento'));
});

test('inferirTemplateDoProcesso sugere prolatoria BPC quando contestação, réplica e matéria BPC/LOAS', () => {
  const r = inferirTemplateDoProcesso({
    classe: { nome: 'Procedimento Comum Cível — BPC LOAS' },
    movimentos: [MOV_CONTESTACAO, MOV_REPLICA],
  });
  assert.equal(r.templateIdSugerido, 'prolatoria-sentenca-bpc-loas-deficiente');
  assert.equal(r.confianca, 'media');
});

test('inferirTemplateDoProcesso sugere prolatoria auxílio-doença quando contestação, réplica e matéria auxílio-doença', () => {
  const r = inferirTemplateDoProcesso({
    classe: { nome: 'Ação de auxílio-doença' },
    movimentos: [MOV_CONTESTACAO, MOV_REPLICA],
  });
  assert.equal(r.templateIdSugerido, 'prolatoria-sentenca-auxilio-doenca');
  assert.equal(r.confianca, 'media');
});

test('inferirTemplateDoProcesso não sugere prolatoria quando contestação e réplica mas matéria indefinida', () => {
  const r = inferirTemplateDoProcesso({
    classe: { nome: 'Procedimento do Juizado Especial Cível' },
    movimentos: [MOV_CONTESTACAO, MOV_REPLICA],
  });
  assert.equal(r.templateIdSugerido, null);
  assert.ok(r.alternativas.length >= 1);
});

test('inferirTemplateDoProcesso não sugere quando não há sinais', () => {
  const r = inferirTemplateDoProcesso({ movimentos: [] });
  assert.equal(r.templateIdSugerido, null);
  assert.equal(r.confianca, 'baixa');
});

test('textoClasseEAssuntos concatena classe e assuntos', () => {
  const t = textoClasseEAssuntos({
    classe: { nome: 'Foo' },
    assuntos: [{ nome: 'Bar BPC' }],
  });
  assert.ok(t.includes('FOO'));
  assert.ok(t.includes('BAR BPC'));
});
