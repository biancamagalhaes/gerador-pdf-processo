const { test } = require('node:test');
const assert = require('node:assert/strict');

const { calcularEspacadorRodape } = require('../src/services/pdfService');

test('calcularEspacadorRodape retorna zero quando o rodapé já termina no fim da página', () => {
  const spacer = calcularEspacadorRodape({
    footerBottomPx: 1000,
    pageHeightPx: 1000,
  });

  assert.equal(spacer, 0);
});

test('calcularEspacadorRodape retorna o espaço restante até o fim da última página', () => {
  const spacer = calcularEspacadorRodape({
    footerBottomPx: 780,
    pageHeightPx: 1000,
  });

  assert.equal(spacer, 220);
});

test('calcularEspacadorRodape arredonda diferenças subpixel acima da tolerância', () => {
  const spacer = calcularEspacadorRodape({
    footerBottomPx: 999.6,
    pageHeightPx: 1000,
    tolerancePx: 0.25,
  });

  assert.equal(spacer, 0.4);
});

test('calcularEspacadorRodape ignora medições inválidas', () => {
  const spacer = calcularEspacadorRodape({
    footerBottomPx: Number.NaN,
    pageHeightPx: 1000,
  });

  assert.equal(spacer, 0);
});
