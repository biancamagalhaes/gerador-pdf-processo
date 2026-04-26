const { test } = require('node:test');
const assert = require('node:assert/strict');
const { formatarJuizo } = require('../src/utils/juizoFormatacao');

test('órgão parcial sem VARA vira cabeçalho de vara federal + comarca (Feira de Santana)', () => {
  const j = formatarJuizo('cobrar-inclusao-pauta-julgamento', '01ª FEIRA DE SANTANA');
  assert.equal(
    j,
    'EXCELENTÍSSIMO(A) SENHOR(A) DOUTOR(A) JUIZ(A) DA 1.ª VARA FEDERAL – JUS FEDERAL – FEIRA DE SANTANA/BA'
  );
});

test('órgão com cidade/UF no sufixo preserva a UF', () => {
  const j = formatarJuizo('designacao-pericia', '02ª FEIRA DE SANTANA/PE');
  assert.ok(j.includes('FEIRA DE SANTANA/PE'));
  assert.ok(j.includes('2.ª VARA FEDERAL'));
});

test('relatoria / turma recursal mantém endereçamento ao juiz relator', () => {
  const j = formatarJuizo(
    'cobrar-inclusao-pauta-julgamento',
    '1ª RELATORIA DA 1ª TURMA RECURSAL DE SALVADOR/BA'
  );
  assert.ok(j.startsWith('EXCELENTÍSSIMO(A) SENHOR(A) DOUTOR(A) JUIZ(A) RELATOR(A) DA '));
  assert.ok(j.includes('RELATORIA'));
});

test('linha completa de vara federal só normaliza travessões e ordinal', () => {
  const j = formatarJuizo(
    'impulsionamento-julgamento',
    '3ª VARA FEDERAL - JUS FEDERAL - FEIRA DE SANTANA/BA'
  );
  assert.equal(
    j,
    'EXCELENTÍSSIMO(A) SENHOR(A) DOUTOR(A) JUIZ(A) DA 3.ª VARA FEDERAL – JUS FEDERAL – FEIRA DE SANTANA/BA'
  );
});
