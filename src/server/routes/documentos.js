/**
 * @module server/routes/documentos
 */

const express = require('express');
const controller = require('../controllers/documentosController');

const router = express.Router();

router.get('/config', controller.obterConfiguracao);
router.get('/templates', controller.listarTemplates);
router.post('/juizo/preview', controller.previewJuizo);
router.post('/processos/consultar', controller.consultarProcesso);
router.post('/documentos/gerar', controller.gerarDocumentos);

module.exports = router;
