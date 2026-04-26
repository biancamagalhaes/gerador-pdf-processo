const { test } = require('node:test');
const assert = require('node:assert/strict');

const {
  normalizarGenero,
  participioQualificado,
  generoValido,
} = require('../src/utils/generoTexto');

test('participioQualificado', () => {
  assert.equal(participioQualificado('masculino'), 'qualificado');
  assert.equal(participioQualificado('feminino'), 'qualificada');
  assert.equal(participioQualificado(''), 'qualificado');
});

test('generoValido e normalizarGenero', () => {
  assert.equal(generoValido(normalizarGenero(' Feminino ')), true);
  assert.equal(generoValido(normalizarGenero('MASCULINO')), true);
  assert.equal(generoValido(normalizarGenero('')), false);
});
