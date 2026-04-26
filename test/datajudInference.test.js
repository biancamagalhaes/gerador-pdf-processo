const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  inferirCamposDoDocumento,
  aplicarInferenciasAoBody,
} = require('../src/services/datajudInferenceService');

const FIXTURE_PROCESSO_EXEMPLO = {
  numeroProcesso: '10667753720224013300',
  movimentos: [
    {
      complementosTabelados: [
        { codigo: 19, valor: 45, nome: 'Contestação', descricao: 'tipo_de_peticao' },
      ],
      codigo: 85,
      nome: 'Petição',
      dataHora: '2023-02-23T23:59:44.000Z',
    },
    {
      complementosTabelados: [
        { codigo: 3, valor: 36, nome: 'para julgamento', descricao: 'tipo_de_conclusao' },
      ],
      codigo: 51,
      nome: 'Conclusão',
      dataHora: '2024-06-11T13:15:46.000Z',
    },
  ],
};

const FIXTURE_COM_REPLICA = {
  movimentos: [
    ...FIXTURE_PROCESSO_EXEMPLO.movimentos,
    {
      complementosTabelados: [
        { codigo: 19, valor: 46, nome: 'Réplica', descricao: 'tipo_de_peticao' },
      ],
      codigo: 85,
      nome: 'Petição',
      dataHora: '2023-03-10T12:00:00.000Z',
    },
  ],
};

const FIXTURE_LAUDO_PROVAVEL = {
  movimentos: [
    {
      codigo: 581,
      nome: 'Documento',
      dataHora: '2023-05-01T10:00:00.000Z',
      complementosTabelados: [
        { codigo: 4, valor: 1, nome: 'Laudo médico', descricao: 'tipo_de_documento' },
      ],
    },
  ],
};

test('inferirCamposDoDocumento extrai contestação e conclusão para julgamento (confiança certa)', () => {
  const r = inferirCamposDoDocumento(FIXTURE_PROCESSO_EXEMPLO);
  assert.equal(r.dataContestacao.valor, '23/02/2023');
  assert.equal(r.dataContestacao.confianca, 'certa');
  assert.equal(r.dataRemessaConclusao.valor, '11/06/2024');
  assert.equal(r.dataRemessaConclusao.confianca, 'certa');
  assert.equal(r.dataReplica.confianca, 'nenhuma');
  assert.equal(r.idRecursoInominado.valor, null);
  assert.equal(r.idRecursoInominado.confianca, 'nenhuma');
});

test('inferirCamposDoDocumento extrai réplica quando houver petição tipada', () => {
  const r = inferirCamposDoDocumento(FIXTURE_COM_REPLICA);
  assert.equal(r.dataReplica.valor, '10/03/2023');
  assert.equal(r.dataReplica.confianca, 'certa');
});

test('inferirCamposDoDocumento sugere laudo médico como provável por heurística de texto', () => {
  const r = inferirCamposDoDocumento(FIXTURE_LAUDO_PROVAVEL);
  assert.equal(r.dataLaudoMedico.valor, '01/05/2023');
  assert.equal(r.dataLaudoMedico.confianca, 'provavel');
});

test('aplicarInferenciasAoBody preenche apenas onde o usuário deixou vazio e só inferência certa', () => {
  const inferidos = inferirCamposDoDocumento(FIXTURE_PROCESSO_EXEMPLO);
  const merged = aplicarInferenciasAoBody(
    {
      dataContestacao: '',
      dataRemessaConclusao: '',
      idRecursoInominado: '99',
    },
    inferidos
  );
  assert.equal(merged.dataContestacao, '23/02/2023');
  assert.equal(merged.dataRemessaConclusao, '11/06/2024');
  assert.equal(merged.idRecursoInominado, '99');
});

test('aplicarInferenciasAoBody não mescla inferência provável (ex.: laudo)', () => {
  const inferidos = inferirCamposDoDocumento(FIXTURE_LAUDO_PROVAVEL);
  const merged = aplicarInferenciasAoBody({ dataLaudoMedico: '' }, inferidos);
  assert.equal(merged.dataLaudoMedico, '');
});
