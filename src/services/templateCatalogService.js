/**
 * @module services/templateCatalogService
 */

const { TEMPLATES } = require('../templates/catalog/templates');

function listarAtivos() {
  return TEMPLATES.filter((t) => t.ativo);
}

/**
 * @param {string} id
 */
function obterPorId(id) {
  return TEMPLATES.find((t) => t.id === id && t.ativo) || null;
}

/**
 * Lista para o frontend (sem caminhos internos).
 */
function listarParaApi() {
  return listarAtivos().map((t) => ({
    id: t.id,
    nome: t.nome,
    categoria: t.categoria,
    descricao: t.descricao,
    formatos: t.formatos,
    camposUsuario: t.camposUsuario,
    camposDatajud: t.camposDatajud,
    camposInferiveis: Array.isArray(t.camposInferiveis) ? t.camposInferiveis : [],
  }));
}

module.exports = {
  listarAtivos,
  obterPorId,
  listarParaApi,
};
