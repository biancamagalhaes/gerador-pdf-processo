const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  formatarProcesso,
  formatarDataAjuizamento,
  apenasDigitosProcesso,
} = require('../src/utils/formatadores');

test('formatarProcesso formata CNJ de 20 dígitos', () => {
  const n = '50013728220234010001';
  assert.match(formatarProcesso(n), /^\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}$/);
});

test('formatarDataAjuizamento converte YYYYMMDD', () => {
  assert.equal(formatarDataAjuizamento('20230415'), '15/04/2023');
});

test('apenasDigitosProcesso remove máscara', () => {
  assert.equal(apenasDigitosProcesso('5001372-82.2023.4.01.0001'), '50013728220234010001');
});
