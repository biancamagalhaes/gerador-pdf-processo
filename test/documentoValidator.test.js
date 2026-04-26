const { test } = require('node:test');
const assert = require('node:assert/strict');

const { validarGeracao } = require('../src/validators/documentoValidator');

const BASE_OK = {
  nomeCliente: 'Maria da Silva',
  genero: 'feminino',
  numeroProcesso: '50013728220234010001',
  especialidade: 'ortopedia',
  templateId: 'impulsionamento-julgamento',
};

test('validarGeracao aceita modelo simples sem campos extras', () => {
  const v = validarGeracao(BASE_OK);
  assert.equal(v.ok, true);
  assert.ok(v.templateDef);
  assert.equal(v.data.templateId, 'impulsionamento-julgamento');
  assert.equal(v.data.genero, 'feminino');
});

test('validarGeracao exige gênero masculino ou feminino', () => {
  const v = validarGeracao({ ...BASE_OK, genero: '' });
  assert.equal(v.ok, false);
  assert.ok(String(v.message).includes('gênero'));
});

test('validarGeracao aceita modelo sem especialidade no catálogo (só nome, processo e extras do modelo)', () => {
  const v = validarGeracao({
    nomeCliente: 'Teste',
    genero: 'masculino',
    numeroProcesso: '50013728220234010001',
    templateId: 'cobrar-inclusao-pauta-julgamento',
    especialidade: '',
    dataRemessaConclusao: '01/01/2025',
    idRecursoInominado: '1',
  });
  assert.equal(v.ok, true);
});

test('validarGeracao retorna 404 para template inexistente', () => {
  const v = validarGeracao({ ...BASE_OK, templateId: 'nao-existe-xyz' });
  assert.equal(v.ok, false);
  assert.equal(v.statusCode, 404);
});

test('validarGeracao exige campos extras do catálogo (cobrar inclusão em pauta)', () => {
  const v = validarGeracao({
    ...BASE_OK,
    templateId: 'cobrar-inclusao-pauta-julgamento',
    dataRemessaConclusao: '',
    idRecursoInominado: '',
  });
  assert.equal(v.ok, false);
  assert.ok(String(v.message).includes('Data remessa'));
});

test('validarGeracao aceita cobrar inclusão com campos preenchidos', () => {
  const v = validarGeracao({
    ...BASE_OK,
    templateId: 'cobrar-inclusao-pauta-julgamento',
    dataRemessaConclusao: '21/02/2026',
    idRecursoInominado: '123',
  });
  assert.equal(v.ok, true);
});

test('validarGeracao não exige juízo quando o modelo lista juizo como opcional', () => {
  const v = validarGeracao({
    ...BASE_OK,
    templateId: 'designacao-pericia',
    juizo: '',
  });
  assert.equal(v.ok, true);
});
