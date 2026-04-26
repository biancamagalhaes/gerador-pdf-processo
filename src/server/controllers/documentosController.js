/**
 * @module server/controllers/documentosController
 */

const datajudService = require('../../services/datajudService');
const {
  inferirCamposDoDocumento,
  aplicarInferenciasAoBody,
} = require('../../services/datajudInferenceService');
const { inferirTemplateDoProcesso } = require('../../services/templateInferenceService');
const { normalizarDeHit, resumoParaApi } = require('../../services/processoNormalizerService');
const templateCatalog = require('../../services/templateCatalogService');
const { montarContexto } = require('../../services/templateContextService');
const { renderHtml } = require('../../services/templateService');
const { htmlParaPdfBuffer } = require('../../services/pdfService');
const { htmlParaDocxBuffer } = require('../../services/docService');
const { obterLogosPadrao } = require('../../services/assetsService');
const {
  validarGeracaoPreflight,
  validarGeracaoPosMerge,
  validarConsulta,
} = require('../../validators/documentoValidator');
const { formatarJuizo } = require('../../utils/juizoFormatacao');
const { apenasDigitosProcesso } = require('../../utils/formatadores');

/**
 * @param {string} nome
 */
function sanitizarNomeArquivo(nome) {
  return String(nome)
    .normalize('NFD')
    .replaceAll(/[\u0300-\u036f]/g, '')
    .replaceAll(/[^a-zA-Z0-9._-]+/g, '_')
    .replaceAll(/_+/g, '_')
    .replaceAll(/^_|_$/g, '')
    .substring(0, 80) || 'documento';
}

async function obterConfiguracao(_req, res, next) {
  try {
    res.json({
      datajudApiKeyConfigured: Boolean(process.env.DATAJUD_API_KEY),
    });
  } catch (e) {
    next(e);
  }
}

async function listarTemplates(_req, res, next) {
  try {
    res.json({ templates: templateCatalog.listarParaApi() });
  } catch (e) {
    next(e);
  }
}

/**
 * Pré-visualização do cabeçalho (juízo) que o servidor usaria sem texto manual.
 */
async function previewJuizo(req, res, next) {
  try {
    const templateId =
      typeof req.body?.templateId === 'string' ? req.body.templateId.trim() : '';
    const orgaoJulgador =
      typeof req.body?.orgaoJulgador === 'string' ? req.body.orgaoJulgador : '';
    const numeroProcessoRaw =
      typeof req.body?.numeroProcesso === 'string'
        ? apenasDigitosProcesso(req.body.numeroProcesso)
        : '';
    if (!templateId) {
      return res.status(400).json({ error: 'templateId é obrigatório' });
    }
    const templateDef = templateCatalog.obterPorId(templateId);
    if (!templateDef) {
      return res.status(404).json({ error: 'Modelo de documento não encontrado' });
    }
    res.json({ juizo: formatarJuizo(templateId, orgaoJulgador, numeroProcessoRaw) });
  } catch (e) {
    next(e);
  }
}

async function consultarProcesso(req, res, next) {
  try {
    const v = validarConsulta(req.body);
    if (!v.ok) {
      return res.status(400).json({ error: v.message });
    }
    const { hits } = await datajudService.buscarProcesso(v.data.numeroProcesso);
    const hit = hits[0];
    if (!hit) {
      return res.status(404).json({ error: 'Processo não encontrado na base do TRF1' });
    }
    const processo = normalizarDeHit(hit);
    const inferencias = inferirCamposDoDocumento(hit._source);
    const sugestaoTemplate = inferirTemplateDoProcesso(hit._source);
    return res.json({
      processo: resumoParaApi(processo),
      inferencias,
      sugestaoTemplate,
    });
  } catch (e) {
    if (e.code === 'VALIDATION') {
      return res.status(400).json({ error: e.message });
    }
    if (e.code === 'MISSING_CONFIG') {
      return res.status(503).json({ error: e.message });
    }
    if (e.code === 'DATAJUD_HTTP') {
      return res.status(502).json({ error: e.message });
    }
    next(e);
  }
}

async function gerarDocumentos(req, res, next) {
  try {
    const pre = validarGeracaoPreflight(req.body);
    if (!pre.ok) {
      return res.status(pre.statusCode || 400).json({ error: pre.message });
    }

    const { hits } = await datajudService.buscarProcesso(pre.data.numeroProcesso);
    const hit = hits[0];
    if (!hit) {
      return res.status(404).json({ error: 'Processo não encontrado na base do TRF1' });
    }

    const inferidos = inferirCamposDoDocumento(hit._source);
    const bodyComInferencias = aplicarInferenciasAoBody(req.body, inferidos);

    const v = validarGeracaoPosMerge(bodyComInferencias, pre.templateDef);
    if (!v.ok) {
      return res.status(v.statusCode || 400).json({ error: v.message });
    }

    const { templateDef } = v;

    const processo = normalizarDeHit(hit);
    const logos = obterLogosPadrao();
    const documentInput = {
      nomeCliente: v.data.nomeCliente,
      numeroProcesso: v.data.numeroProcesso,
      genero: v.data.genero,
      especialidade: v.data.especialidade,
      templateId: v.data.templateId,
      juizo: v.data.juizo,
      dataRemessaConclusao: v.data.dataRemessaConclusao,
      idRecursoInominado: v.data.idRecursoInominado,
      dataLaudoMedico: v.data.dataLaudoMedico,
      dataLaudoSocial: v.data.dataLaudoSocial,
      dataContestacao: v.data.dataContestacao,
      dataReplica: v.data.dataReplica,
      poloPassivoPreset: v.data.poloPassivoPreset,
    };

    const contexto = montarContexto(templateDef, documentInput, processo, logos);
    const html = await renderHtml(templateDef.templatePath, contexto);

    const [pdfBuffer, docxBuffer] = await Promise.all([
      htmlParaPdfBuffer(html),
      htmlParaDocxBuffer(html),
    ]);

    const baseNome = sanitizarNomeArquivo(v.data.nomeCliente);
    const slugModelo = sanitizarNomeArquivo(templateDef.nome);
    const nomePdf = `${baseNome} - ${slugModelo}.pdf`;
    const nomeDocx = `${baseNome} - ${slugModelo}.docx`;

    return res.json({
      sucesso: true,
      templateId: templateDef.id,
      arquivos: [
        {
          formato: 'pdf',
          nomeArquivo: nomePdf,
          conteudoBase64: pdfBuffer.toString('base64'),
        },
        {
          formato: 'doc',
          nomeArquivo: nomeDocx,
          conteudoBase64: docxBuffer.toString('base64'),
          mimeType:
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        },
      ],
    });
  } catch (e) {
    if (e.code === 'VALIDATION') {
      return res.status(400).json({ error: e.message });
    }
    if (e.code === 'MISSING_CONFIG') {
      return res.status(503).json({ error: e.message });
    }
    if (e.code === 'DATAJUD_HTTP') {
      return res.status(502).json({ error: e.message });
    }
    next(e);
  }
}

module.exports = {
  obterConfiguracao,
  listarTemplates,
  previewJuizo,
  consultarProcesso,
  gerarDocumentos,
};
