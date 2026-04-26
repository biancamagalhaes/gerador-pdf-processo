const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  sanitizarHtmlParaDocx,
  removerWidthPercentEmCelulas,
  normalizarBlocosStyleParaDocx,
} = require('../src/services/docService');

test('sanitizarHtmlParaDocx remove width em % em td sem duplicar >', () => {
  const html = '<table><tr><td style="width: 10%;">x</td></tr></table>';
  const out = sanitizarHtmlParaDocx(html);
  assert.ok(!out.includes('width'));
  assert.ok(out.includes('<td>x</td>'));
});

test('sanitizarHtmlParaDocx mantém outros estilos na célula', () => {
  const html = '<td class="c" style="color: red; width: 50%;">z</td>';
  const out = sanitizarHtmlParaDocx(html);
  assert.match(out, /style="color: red"/);
  assert.ok(!/width/i.test(out));
});

test('removerWidthPercentEmCelulas só trata células com style', () => {
  const html = '<td>x</td>';
  assert.equal(removerWidthPercentEmCelulas(html), html);
});

test('normalizarBlocosStyleParaDocx remove @page e propriedades de impressão', () => {
  const html = `<head><style type="text/css">
    @page { size: A4; margin: 0; }
    * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    body { font-size: 12px; }
  </style></head>`;
  const out = normalizarBlocosStyleParaDocx(html);
  assert.ok(!out.includes('@page'));
  assert.ok(!out.includes('print-color-adjust'));
  assert.ok(!out.includes('-webkit-print-color-adjust'));
  assert.ok(out.includes('font-size: 12px'));
});

test('normalizarBlocosStyleParaDocx remove position fixed', () => {
  const html = '<style>.footer { position: fixed; bottom: 0; }</style>';
  const out = normalizarBlocosStyleParaDocx(html);
  assert.ok(!/position\s*:\s*fixed/i.test(out));
});

test('sanitizarHtmlParaDocx encadeia remoção de % em td e normalização de style', () => {
  const html = `<style>@page { margin: 0; }</style><td style="width: 20%;">a</td>`;
  const out = sanitizarHtmlParaDocx(html);
  assert.ok(!out.includes('@page'));
  assert.ok(out.includes('<td>a</td>'));
});
