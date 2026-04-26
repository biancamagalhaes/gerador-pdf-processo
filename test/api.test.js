const { test } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { createApp } = require('../src/server/createApp');
const datajudService = require('../src/services/datajudService');

const app = createApp();

test('GET /health retorna ok', async () => {
  const res = await request(app).get('/health');
  assert.equal(res.status, 200);
  assert.equal(res.body.ok, true);
});

test('GET /api/templates lista modelos', async () => {
  const res = await request(app).get('/api/templates');
  assert.equal(res.status, 200);
  assert.ok(Array.isArray(res.body.templates));
  assert.ok(res.body.templates.length >= 10);
});

test('POST /api/juizo/preview retorna cabeçalho formatado', async () => {
  const res = await request(app).post('/api/juizo/preview').send({
    templateId: 'designacao-pericia',
    orgaoJulgador: '1ª Vara Federal - Feira de Santana/BA',
  });
  assert.equal(res.status, 200);
  assert.ok(typeof res.body.juizo === 'string');
  assert.ok(res.body.juizo.includes('EXCELENTÍSSIMO'));
  assert.ok(res.body.juizo.includes('1.ª VARA FEDERAL'));
});

test('POST /api/juizo/preview retorna 400 sem templateId', async () => {
  const res = await request(app).post('/api/juizo/preview').send({ orgaoJulgador: 'x' });
  assert.equal(res.status, 400);
});

test('POST /api/juizo/preview retorna 404 para modelo inexistente', async () => {
  const res = await request(app).post('/api/juizo/preview').send({
    templateId: 'modelo-inexistente',
    orgaoJulgador: '',
  });
  assert.equal(res.status, 404);
});

test('GET /api/config informa se a chave do Datajud está configurada', async () => {
  const prev = process.env.DATAJUD_API_KEY;
  try {
    delete process.env.DATAJUD_API_KEY;
    const res = await request(app).get('/api/config');
    assert.equal(res.status, 200);
    assert.equal(res.body.datajudApiKeyConfigured, false);
  } finally {
    if (prev === undefined) {
      delete process.env.DATAJUD_API_KEY;
    } else {
      process.env.DATAJUD_API_KEY = prev;
    }
  }
});

test('POST /api/processos/consultar retorna sugestaoTemplate quando o processo é encontrado', async () => {
  const prevKey = process.env.DATAJUD_API_KEY;
  const origBuscar = datajudService.buscarProcesso;
  datajudService.buscarProcesso = async () => ({
    hits: [
      {
        _source: {
          numeroProcesso: '50013728220234010001',
          movimentos: [
            {
              complementosTabelados: [
                {
                  codigo: 3,
                  valor: 36,
                  nome: 'para julgamento',
                  descricao: 'tipo_de_conclusao',
                },
              ],
              codigo: 51,
              nome: 'Conclusão',
              dataHora: '2024-06-11T13:15:46.000Z',
            },
          ],
        },
      },
    ],
  });
  process.env.DATAJUD_API_KEY = 'stub';
  try {
    const res = await request(app).post('/api/processos/consultar').send({
      numeroProcesso: '50013728220234010001',
    });
    assert.equal(res.status, 200);
    assert.ok(res.body.sugestaoTemplate);
    assert.equal(res.body.sugestaoTemplate.templateIdSugerido, 'cobrar-inclusao-pauta-julgamento');
    assert.equal(res.body.sugestaoTemplate.confianca, 'alta');
    assert.ok(res.body.inferencias);
    assert.equal(res.body.inferencias.dataRemessaConclusao.confianca, 'certa');
    assert.equal(res.body.inferencias.dataRemessaConclusao.valor, '11/06/2024');
  } finally {
    datajudService.buscarProcesso = origBuscar;
    if (prevKey === undefined) {
      delete process.env.DATAJUD_API_KEY;
    } else {
      process.env.DATAJUD_API_KEY = prevKey;
    }
  }
});

test('POST /api/processos/consultar sem chave retorna erro', async () => {
  const prev = process.env.DATAJUD_API_KEY;
  try {
    delete process.env.DATAJUD_API_KEY;
    const res = await request(app).post('/api/processos/consultar').send({
      numeroProcesso: '50013728220234010001',
    });
    assert.ok(res.status === 503);
  } finally {
    if (prev === undefined) {
      delete process.env.DATAJUD_API_KEY;
    } else {
      process.env.DATAJUD_API_KEY = prev;
    }
  }
});

test('POST /api/documentos/gerar retorna 400 quando faltam campos obrigatórios do modelo', async () => {
  const prevKey = process.env.DATAJUD_API_KEY;
  const origBuscar = datajudService.buscarProcesso;
  datajudService.buscarProcesso = async () => ({
    hits: [
      {
        _source: {
          numeroProcesso: '50013728220234010001',
          movimentos: [],
        },
      },
    ],
  });
  process.env.DATAJUD_API_KEY = 'stub';
  try {
    const res = await request(app).post('/api/documentos/gerar').send({
      nomeCliente: 'Teste',
      genero: 'masculino',
      numeroProcesso: '50013728220234010001',
      templateId: 'cobrar-inclusao-pauta-julgamento',
      dataRemessaConclusao: '',
      idRecursoInominado: '',
    });
    assert.equal(res.status, 400);
    assert.ok(String(res.body.error).length > 0);
  } finally {
    datajudService.buscarProcesso = origBuscar;
    if (prevKey === undefined) {
      delete process.env.DATAJUD_API_KEY;
    } else {
      process.env.DATAJUD_API_KEY = prevKey;
    }
  }
});

test('POST /api/documentos/gerar retorna 404 para modelo inexistente', async () => {
  const res = await request(app).post('/api/documentos/gerar').send({
    nomeCliente: 'Teste',
    genero: 'feminino',
    numeroProcesso: '50013728220234010001',
    templateId: 'template-inexistente-123',
  });
  assert.equal(res.status, 404);
});
