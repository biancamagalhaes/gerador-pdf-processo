/**
 * SPA: wizard em 4 passos, catálogo de templates e geração PDF + Word.
 */

const CAMPOS_BASE_FORM = new Set(['nomeCliente', 'numeroProcesso']);

/** Alinhado a `CHAVES_MERGE_INFERENCIA` no servidor. */
const CHAVES_MERGE_INFERENCIA = [
  'dataRemessaConclusao',
  'idRecursoInominado',
  'dataLaudoMedico',
  'dataLaudoSocial',
  'dataContestacao',
  'dataReplica',
];

/** Campos que podem ficar vazios (juízo vem do Datajud ou texto padrão). */
const CAMPOS_OPCIONAIS_TEMPLATE = new Set(['juizo', 'poloPassivoPreset']);

/**
 * Rótulos curtos para validação — alinhados a `src/validators/documentoValidator.js`.
 */
const LABELS_VALIDACAO = {
  especialidade: 'Especialidade médica',
  juizo: 'Juízo',
  dataRemessaConclusao: 'Data remessa à conclusão',
  idRecursoInominado: 'ID do recurso inominado',
  dataLaudoMedico: 'Data do laudo médico/perícia',
  dataLaudoSocial: 'Data do laudo social',
  dataContestacao: 'Data da contestação',
  dataReplica: 'Data da réplica',
  poloPassivoPreset: 'Polo passivo (réu)',
};

/**
 * Rótulos exibidos no formulário (podem ser mais descritivos).
 */
const LABELS_FORM = {
  especialidade: 'Especialidade médica',
  juizo: 'Texto do cabeçalho (juízo)',
  dataRemessaConclusao: 'Data remessa à conclusão',
  idRecursoInominado: 'ID do recurso inominado',
  dataLaudoMedico: 'Data do laudo médico/perícia',
  dataLaudoSocial: 'Data do laudo social',
  dataContestacao: 'Data da contestação',
  dataReplica: 'Data da réplica',
  poloPassivoPreset: 'Polo passivo (réu)',
};

/** Chaves retornadas em `GET /api/templates` como `camposDatajud` → rótulo + campo em `processo` da consulta. */
const MAPA_CAMPOS_DATAJUD = {
  numeroProcesso: { titulo: 'Número do processo', chaveResumo: 'numeroProcesso' },
  dataAjuizamento: { titulo: 'Data de distribuição', chaveResumo: 'dataDistribuicao' },
};

/**
 * Aviso ao usuário: alinhado à montagem do cabeçalho no servidor (`src/utils/juizoFormatacao.js`
 * — ordinal N.ª, travessões, maiúsculas no PDF).
 */
const TEXTO_AJUDA_PADRAO_CABECALHO_JUIZO =
  'No documento gerado, o endereçamento ao juízo seguirá o padrão: EXCELENTÍSSIMO(A) SENHOR(A) DOUTOR(A) JUIZ(A) DA [N].ª [órgão] – JUS FEDERAL – [cidade]/[UF] (ordinal com ponto antes do ª, travessões entre os trechos), conforme o órgão julgador retornado pelo Datajud. Exemplo: DA 1.ª VARA FEDERAL – JUS FEDERAL – FEIRA DE SANTANA/BA.';

const CHAVES_EXTRAS_API = [
  'juizo',
  'poloPassivoPreset',
  'dataRemessaConclusao',
  'idRecursoInominado',
  'dataLaudoMedico',
  'dataLaudoSocial',
  'dataContestacao',
  'dataReplica',
];

/** Cache local da última consulta Datajud (sessionStorage + espelho em memória). */
const SESSION_STORAGE_CONSULTA_KEY = 'gerador-pdf-processo:datajudConsulta';

const state = {
  templates: [],
  selectedTemplateId: null,
  /** @type {1 | 2 | 3 | 4} */
  currentStep: 1,
  /** Maior passo já alcançado (para navegação no stepper). */
  maxStepReached: 1,
  processoConsultado: false,
  /** @type {{ numeroProcesso?: string, dataDistribuicao?: string, orgaoJulgador?: string, classe?: string } | null} */
  processoResumo: null,
  /**
   * Inferências por campo: `{ valor, confianca, origem? }` ou legado `string` (tratado como certa).
   * @type {Record<string, unknown> | null}
   */
  processoInferencias: null,
  /**
   * Última sugestão do servidor (POST /api/processos/consultar).
   * @type {{
   *   templateIdSugerido: string | null,
   *   confianca: string,
   *   motivos: string[],
   *   alternativas: string[]
   * } | null}
   */
  sugestaoTemplate: null,
  datajudApiKeyConfigured: true,
  /**
   * Última consulta bem-sucedida indexada por chave nome|número.
   * @type {{
   *   chave: string,
   *   nomeCliente: string,
   *   numeroProcesso: string,
   *   processo: object | null,
   *   inferencias: object | null,
   *   sugestaoTemplate: object | null,
   * } | null}
   */
  consultaCache: null,
};

const el = {
  form: document.getElementById('form-base'),
  templateIdInput: document.getElementById('template-id-input'),
  btnConsultar: document.getElementById('btn-consultar'),
  consultaStatus: document.getElementById('consulta-status'),
  processoResumo: document.getElementById('processo-resumo'),
  templateCards: document.getElementById('template-cards'),
  templateHint: document.getElementById('template-hint'),
  templateSugestao: document.getElementById('template-sugestao'),
  btnUsarModelo: document.getElementById('btn-usar-modelo'),
  btnVoltarStep1: document.getElementById('btn-voltar-step1'),
  complementFields: document.getElementById('complement-fields'),
  btnGerar: document.getElementById('btn-gerar'),
  btnVoltarStep2: document.getElementById('btn-voltar-step2'),
  geracaoStatus: document.getElementById('geracao-status'),
  geracaoStatusStep2: document.getElementById('geracao-status-step2'),
  downloadsPanel: document.getElementById('downloads-panel'),
  downloadSuccessBanner: document.getElementById('download-success-banner'),
  btnNovoDocumento: document.getElementById('btn-novo-documento'),
  inputNomeCliente: document.querySelector('#form-base input[name="nomeCliente"]'),
  inputNumeroProcesso: document.querySelector('#form-base input[name="numeroProcesso"]'),
};

function showStatus(target, message, type = 'info') {
  if (!target) return;
  target.hidden = false;
  target.textContent = message;
  target.className = `status ${type}`;
}

function hideStatus(target) {
  if (!target) return;
  target.hidden = true;
  target.textContent = '';
}

async function fetchJson(url, options = {}) {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || res.statusText || 'Erro na requisição');
    err.status = res.status;
    throw err;
  }
  return data;
}

function getSelectedTemplate() {
  if (!state.selectedTemplateId) return null;
  return state.templates.find((t) => t.id === state.selectedTemplateId) || null;
}

/**
 * @param {FormData} formData
 * @param {string} fieldName
 */
function getFormTextValue(formData, fieldName) {
  const value = formData.get(fieldName);
  return typeof value === 'string' ? value.trim() : '';
}

/**
 * O campo opcional `juizo` fica em `#complement-fields`; em alguns navegadores o valor pode não
 * entrar no FormData como esperado — lemos diretamente do input quando existir.
 * @returns {string | null} string (inclui "") se o input existir; null se ainda não foi renderizado
 */
function getJuizoFromComplementDom() {
  const inp = el.complementFields?.querySelector?.('input[name="juizo"]');
  if (!inp) return null;
  return typeof inp.value === 'string' ? inp.value : '';
}

/**
 * Valores atuais dos campos extras (antes de um re-render que recria os inputs).
 * @returns {Record<string, string>}
 */
function getExtraFieldValuesSnapshot() {
  const fd = new FormData(el.form);
  const out = {};
  for (const k of CHAVES_EXTRAS_API) {
    const v = fd.get(k);
    if (typeof v === 'string') {
      out[k] = v;
    }
  }
  const juizoDom = getJuizoFromComplementDom();
  if (juizoDom !== null) {
    out.juizo = juizoDom;
  }
  return out;
}

function getFormPayload() {
  const fd = new FormData(el.form);
  const base = {
    nomeCliente: getFormTextValue(fd, 'nomeCliente'),
    genero: getFormTextValue(fd, 'genero'),
    numeroProcesso: getFormTextValue(fd, 'numeroProcesso').replaceAll(/\D/g, ''),
    especialidade: getFormTextValue(fd, 'especialidade'),
    templateId: getFormTextValue(fd, 'templateId'),
  };
  const extras = {};
  for (const k of CHAVES_EXTRAS_API) {
    extras[k] = getFormTextValue(fd, k);
  }
  const juizoDom = getJuizoFromComplementDom();
  if (juizoDom !== null) {
    extras.juizo = typeof juizoDom === 'string' ? juizoDom.trim() : '';
  }
  return { ...base, ...extras };
}

/**
 * @param {string} nome
 */
function normalizarNomeCliente(nome) {
  return typeof nome === 'string' ? nome.trim().replace(/\s+/g, ' ') : '';
}

/**
 * @param {string} nome
 * @param {string} digitos20
 */
function montarChaveConsulta(nome, digitos20) {
  return `${normalizarNomeCliente(nome)}|${digitos20}`;
}

function carregarConsultaDoCache() {
  try {
    const raw = sessionStorage.getItem(SESSION_STORAGE_CONSULTA_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed.chave === 'string' &&
      typeof parsed.numeroProcesso === 'string' &&
      parsed.numeroProcesso.length === 20
    ) {
      state.consultaCache = parsed;
    }
  } catch {
    // ignore
  }
}

/**
 * @param {{
 *   chave: string,
 *   nomeCliente: string,
 *   numeroProcesso: string,
 *   processo: object | null,
 *   inferencias: object | null,
 *   sugestaoTemplate: object | null,
 * }} entry
 */
function persistirConsultaNoCache(entry) {
  state.consultaCache = entry;
  try {
    sessionStorage.setItem(SESSION_STORAGE_CONSULTA_KEY, JSON.stringify(entry));
  } catch {
    // ignore
  }
}

function limparConsultaCache() {
  state.consultaCache = null;
  try {
    sessionStorage.removeItem(SESSION_STORAGE_CONSULTA_KEY);
  } catch {
    // ignore
  }
}

/**
 * Se o usuário alterar nome ou número de forma que não bata com o cache, descarta o cache.
 * Compara nome normalizado e string de dígitos (inclui edição parcial do número).
 */
function invalidarCacheSeChaveDivergir() {
  if (!state.consultaCache) return;
  const fd = new FormData(el.form);
  const nome = getFormTextValue(fd, 'nomeCliente');
  const digits = getFormTextValue(fd, 'numeroProcesso').replaceAll(/\D/g, '');
  const nomeNorm = normalizarNomeCliente(nome);
  if (nomeNorm !== state.consultaCache.nomeCliente) {
    limparConsultaCache();
    return;
  }
  if (digits !== state.consultaCache.numeroProcesso) {
    limparConsultaCache();
  }
}

function limparSelecaoModelo() {
  state.selectedTemplateId = null;
  if (el.templateIdInput) el.templateIdInput.value = '';
  renderTemplateCards();
  renderTemplateHint(null);
  syncUsarModeloButton();
}

/**
 * Passo 1: nome e número do processo (20 dígitos).
 * @returns {{ ok: true } | { ok: false, message: string }}
 */
function validatePasso1() {
  const fd = new FormData(el.form);
  const nome = getFormTextValue(fd, 'nomeCliente');
  const digits = getFormTextValue(fd, 'numeroProcesso').replaceAll(/\D/g, '');
  if (!nome) {
    return { ok: false, message: 'Informe o nome do cliente.' };
  }
  const genero = getFormTextValue(fd, 'genero');
  if (genero !== 'masculino' && genero !== 'feminino') {
    return { ok: false, message: 'Selecione o gênero (masculino ou feminino).' };
  }
  if (digits.length !== 20) {
    return { ok: false, message: 'O número do processo deve ter 20 dígitos.' };
  }
  return { ok: true };
}

/**
 * Passo 2: consulta Datajud já feita e modelo selecionado; revalida passo 1.
 * @returns {{ ok: true } | { ok: false, message: string }}
 */
function validatePasso2() {
  const p1 = validatePasso1();
  if (!p1.ok) return p1;
  if (!state.processoConsultado) {
    return { ok: false, message: 'Consulte o processo antes de continuar.' };
  }
  if (!state.selectedTemplateId) {
    return { ok: false, message: 'Selecione um modelo de documento na lista.' };
  }
  return { ok: true };
}

/**
 * Volta a um passo anterior e “esquece” os passos seguintes (maxStepReached = destino).
 * Ao voltar ao 1: limpa só seleção de modelo e estado volátil da consulta; mantém cache local (nome+número).
 * Ao voltar ao 2 desde o 3, limpa complemento.
 * @param {number} targetStep
 */
function goToStepBackward(targetStep) {
  const s = /** @type {1 | 2 | 3 | 4} */ (Math.min(4, Math.max(1, Math.floor(targetStep))));
  if (s === 1) {
    limparSelecaoModelo();
    state.processoConsultado = false;
    state.processoResumo = null;
    state.processoInferencias = null;
    state.sugestaoTemplate = null;
    renderProcessoResumo();
    renderTemplateSugestao();
  }
  if (s <= 2) {
    el.complementFields.innerHTML = '';
  }
  state.maxStepReached = s;
  goToStep(s, { skipMaxBump: true });
  hideStatus(el.geracaoStatus);
  hideStatus(el.geracaoStatusStep2);
}

/**
 * Normaliza o retorno da API (objeto ou string legada).
 * @param {unknown} raw
 * @returns {{ valor: string | null, confianca: string, origem?: string }}
 */
function inferenciaDoRaw(raw) {
  if (raw == null) {
    return { valor: null, confianca: 'nenhuma' };
  }
  if (typeof raw === 'string') {
    const v = raw.trim();
    return v
      ? { valor: v, confianca: 'certa' }
      : { valor: null, confianca: 'nenhuma' };
  }
  if (typeof raw === 'object' && raw !== null) {
    const o = /** @type {{ valor?: unknown, confianca?: string, origem?: string }} */ (raw);
    const valor =
      typeof o.valor === 'string' && o.valor.trim() ? o.valor.trim() : null;
    let confianca = o.confianca;
    if (confianca !== 'certa' && confianca !== 'provavel' && confianca !== 'nenhuma') {
      confianca = valor ? 'certa' : 'nenhuma';
    }
    if (!valor) {
      return { valor: null, confianca: 'nenhuma', origem: o.origem };
    }
    return { valor, confianca, origem: o.origem };
  }
  return { valor: null, confianca: 'nenhuma' };
}

/**
 * @param {string} campo
 */
function inferenciaParaCampo(campo) {
  return inferenciaDoRaw(state.processoInferencias?.[campo]);
}

/**
 * @param {Record<string, string>} payload
 */
function aplicarInferenciasAoPayloadLocal(payload) {
  const infer = state.processoInferencias;
  if (!infer || typeof infer !== 'object') return payload;
  const out = { ...payload };
  for (const key of CHAVES_MERGE_INFERENCIA) {
    const user = typeof out[key] === 'string' ? out[key].trim() : '';
    const { valor, confianca } = inferenciaDoRaw(infer[key]);
    if (!user && confianca === 'certa' && valor) {
      out[key] = valor;
    }
  }
  return out;
}

/**
 * Campos obrigatórios além da base (nome e processo), exceto opcionais como juízo.
 */
function camposExtrasObrigatorios(camposUsuario) {
  if (!Array.isArray(camposUsuario)) return [];
  return camposUsuario.filter(
    (c) => !CAMPOS_BASE_FORM.has(c) && !CAMPOS_OPCIONAIS_TEMPLATE.has(c)
  );
}

function validarPayloadParaTemplate(payload, template) {
  if (!template) return 'Selecione um modelo.';
  for (const campo of camposExtrasObrigatorios(template.camposUsuario)) {
    if (typeof payload[campo] !== 'string' || !payload[campo].trim()) {
      const rotulo = LABELS_VALIDACAO[campo] || campo;
      return `${rotulo} é obrigatório para este modelo`;
    }
  }
  return null;
}

/**
 * Valor sugerido para exibição (certa ou provável).
 * @param {string} campo
 */
function valorInferidoParaCampo(campo) {
  const { valor } = inferenciaParaCampo(campo);
  return valor;
}

/**
 * Indica se ainda há trabalho manual no passo 3 (campos extras a preencher ou opcional juízo).
 * @param {object | null} template
 */
function hasComplementWorkForUser(template) {
  if (!template || !Array.isArray(template.camposUsuario)) return false;
  const extras = template.camposUsuario.filter((c) => !CAMPOS_BASE_FORM.has(c));
  if (extras.length === 0) return false;

  const fd = new FormData(el.form);
  if (template.camposUsuario.includes('especialidade')) {
    const esp = getFormTextValue(fd, 'especialidade');
    if (!esp.trim()) return true;
  }

  const obrigatorios = camposExtrasObrigatorios(template.camposUsuario);
  for (const c of obrigatorios) {
    if (c === 'especialidade') continue;
    const inf = inferenciaParaCampo(c);
    if (!(inf.confianca === 'certa' && inf.valor)) return true;
  }
  if (extras.some((c) => CAMPOS_OPCIONAIS_TEMPLATE.has(c))) return true;
  return false;
}

/**
 * Polo passivo (réu): INSS por padrão ou União Federal (artigo “a”).
 * @param {Record<string, string>} [preserved]
 */
function criarSelectPoloPassivo(preserved = {}) {
  const label = document.createElement('label');
  label.className = 'extra-label extra-label--optional';

  const span = document.createElement('span');
  span.className = 'extra-label-text';
  span.textContent = LABELS_FORM.poloPassivoPreset || 'Polo passivo (réu)';
  const badge = document.createElement('span');
  badge.className = 'field-badge field-badge--optional';
  badge.textContent = 'Opcional';
  span.appendChild(document.createTextNode(' '));
  span.appendChild(badge);

  const select = document.createElement('select');
  select.name = 'poloPassivoPreset';
  select.setAttribute('form', 'form-base');
  select.setAttribute('aria-required', 'false');

  const optInss = document.createElement('option');
  optInss.value = 'inss';
  optInss.textContent = 'INSS — Instituto Nacional do Seguro Social (padrão)';

  const optUniao = document.createElement('option');
  optUniao.value = 'uniao_federal';
  optUniao.textContent = 'União Federal';

  select.appendChild(optInss);
  select.appendChild(optUniao);

  const rawPreservado =
    typeof preserved.poloPassivoPreset === 'string' ? preserved.poloPassivoPreset.trim().toLowerCase() : '';
  select.value = rawPreservado === 'uniao_federal' ? 'uniao_federal' : 'inss';

  const hint = document.createElement('p');
  hint.className = 'extra-field-microcopy';
  hint.textContent =
    'Na maioria dos casos o réu é o INSS (“contra o …”). Se a ação for contra a União Federal, escolha a segunda opção (“contra a …”).';

  label.appendChild(span);
  label.appendChild(select);
  label.appendChild(hint);
  return label;
}

/**
 * @param {string} campo
 * @param {{ obrigatorio: boolean, preserved?: Record<string, string>, confiancaInferencia?: string }} opts
 */
function criarInputExtra(campo, { obrigatorio, preserved = {}, confiancaInferencia = 'nenhuma' }) {
  if (campo === 'poloPassivoPreset') {
    return criarSelectPoloPassivo(preserved);
  }

  const label = document.createElement('label');
  label.className = obrigatorio ? 'extra-label extra-label--required' : 'extra-label extra-label--optional';

  const span = document.createElement('span');
  span.className = 'extra-label-text';
  span.textContent = LABELS_FORM[campo] || campo;

  if (obrigatorio) {
    const badge = document.createElement('span');
    badge.className = 'field-badge field-badge--required';
    badge.textContent = 'Obrigatório';
    span.appendChild(document.createTextNode(' '));
    span.appendChild(badge);
    if (confiancaInferencia === 'provavel') {
      const badgeR = document.createElement('span');
      badgeR.className = 'field-badge field-badge--review';
      badgeR.textContent = 'Revisar';
      span.appendChild(document.createTextNode(' '));
      span.appendChild(badgeR);
    }
  } else {
    const badge = document.createElement('span');
    badge.className = 'field-badge field-badge--optional';
    badge.textContent = 'Opcional';
    span.appendChild(document.createTextNode(' '));
    span.appendChild(badge);
  }

  const input = document.createElement('input');
  input.type = 'text';
  input.name = campo;
  input.setAttribute('form', 'form-base');
  input.autocomplete = 'off';
  if (campo.startsWith('data')) {
    input.placeholder = 'dd/mm/aaaa';
    input.inputMode = 'numeric';
  }
  if (obrigatorio) {
    input.setAttribute('aria-required', 'true');
  } else {
    input.setAttribute('aria-required', 'false');
  }

  const inferido = valorInferidoParaCampo(campo);
  const rawPreservado = typeof preserved[campo] === 'string' ? preserved[campo] : '';
  if (rawPreservado.trim()) {
    input.value = rawPreservado;
  } else if (inferido) {
    input.value = inferido;
  }

  label.appendChild(span);
  label.appendChild(input);

  if (campo === 'juizo') {
    const hint = document.createElement('p');
    hint.className = 'extra-field-microcopy';
    hint.textContent =
      'O texto acima é o que será inserido no modelo (mesma regra do servidor). Edite se precisar de outro endereçamento. Se apagar tudo, o servidor monta de novo a partir do órgão julgador da consulta.';
    label.appendChild(hint);
  }

  if (obrigatorio && campo.startsWith('data')) {
    const hint = document.createElement('p');
    hint.className = 'extra-field-microcopy';
    if (confiancaInferencia === 'provavel') {
      hint.textContent =
        'Data provável a partir do Datajud (heurística); confira nos autos e ajuste se necessário (dd/mm/aaaa).';
    } else if (inferido) {
      hint.textContent = 'Sugerido a partir do Datajud; ajuste se necessário (dd/mm/aaaa).';
    } else {
      hint.textContent =
        'Este dado não vem da consulta Datajud nesta versão; informe conforme os autos.';
    }
    label.appendChild(hint);
  }

  if (obrigatorio && campo === 'idRecursoInominado' && !inferido) {
    const hint = document.createElement('p');
    hint.className = 'extra-field-microcopy';
    hint.textContent =
      'O identificador do recurso não consta no Datajud; informe conforme consta nos autos.';
    label.appendChild(hint);
  }

  return label;
}

/**
 * Painel read-only com valores confirmados pelo Datajud.
 * @param {string[]} campos
 */
function renderPainelAutofill(campos) {
  const wrap = document.createElement('div');
  wrap.className = 'autofill-panel';

  const h = document.createElement('h3');
  h.className = 'autofill-panel-title';
  h.textContent = 'Preenchido automaticamente (Datajud)';
  wrap.appendChild(h);

  const sub = document.createElement('p');
  sub.className = 'autofill-panel-hint';
  sub.textContent =
    'Estes valores foram identificados nos movimentos processuais e serão aplicados na geração.';
  wrap.appendChild(sub);

  const dl = document.createElement('dl');
  dl.className = 'extra-resumo-dl';
  for (const campo of campos) {
    const inf = inferenciaParaCampo(campo);
    const dt = document.createElement('dt');
    dt.textContent = LABELS_FORM[campo] || campo;
    const dd = document.createElement('dd');
    dd.appendChild(document.createTextNode(inf.valor || '—'));
    if (typeof inf.origem === 'string' && inf.origem.trim()) {
      const small = document.createElement('div');
      small.className = 'extra-inferencia-origem';
      small.textContent = inf.origem.trim();
      dd.appendChild(small);
    }
    dl.appendChild(dt);
    dl.appendChild(dd);
  }
  wrap.appendChild(dl);
  return wrap;
}

/**
 * Resumo compacto do processo no passo 3 (contexto sem repetir o passo 2).
 */
function appendMiniProcessoResumo(container) {
  if (!state.processoResumo) return;
  const p = state.processoResumo;
  const box = document.createElement('div');
  box.className = 'mini-processo-resumo';

  const h = document.createElement('h3');
  h.className = 'mini-processo-resumo-title';
  h.textContent = 'Processo (consulta Datajud)';
  box.appendChild(h);

  const dl = document.createElement('dl');
  dl.className = 'extra-resumo-dl';
  const linhas = [
    ['Número', p.numeroProcesso],
    ['Distribuição', p.dataDistribuicao],
    ['Órgão julgador', p.orgaoJulgador],
    ['Classe', p.classe],
  ];
  for (const [dt, dd] of linhas) {
    if (typeof dd !== 'string' || !dd.trim()) continue;
    const dEl = document.createElement('dt');
    dEl.textContent = dt;
    const ddEl = document.createElement('dd');
    ddEl.textContent = dd.trim();
    dl.appendChild(dEl);
    dl.appendChild(ddEl);
  }
  box.appendChild(dl);
  container.appendChild(box);
}

/**
 * Pré-preenche o cabeçalho (juízo) com o mesmo texto que o servidor usaria sem sobrescrita manual.
 * @param {object | null} template
 * @param {Record<string, string>} [preservedExtras]
 */
async function renderComplementFieldsWithJuizoPreview(template, preservedExtras) {
  const preserved =
    preservedExtras && typeof preservedExtras === 'object' ? { ...preservedExtras } : {};
  const modeloUsaJuizo =
    template && Array.isArray(template.camposUsuario) && template.camposUsuario.includes('juizo');
  if (
    modeloUsaJuizo &&
    template?.id &&
    state.processoResumo?.orgaoJulgador &&
    !Object.prototype.hasOwnProperty.call(preserved, 'juizo')
  ) {
    try {
      const payloadBase = getFormPayload();
      const data = await fetchJson('/api/juizo/preview', {
        method: 'POST',
        body: JSON.stringify({
          templateId: template.id,
          orgaoJulgador: state.processoResumo.orgaoJulgador,
          numeroProcesso: payloadBase.numeroProcesso,
        }),
      });
      if (data?.juizo && typeof data.juizo === 'string') {
        preserved.juizo = data.juizo;
      }
    } catch {
      // Sem pré-visualização: campo vazio e o servidor monta a partir do órgão julgador
    }
  }
  renderComplementFields(template, preserved);
}

/**
 * Campos complementares do passo 3: autofill + opcional + obrigatórios a digitar.
 * @param {object | null} template
 * @param {Record<string, string>} [preservedExtras]
 */
function renderComplementFields(template, preservedExtras) {
  const preserved =
    preservedExtras && typeof preservedExtras === 'object' ? preservedExtras : {};
  el.complementFields.innerHTML = '';
  if (!template || !Array.isArray(template.camposUsuario)) {
    return;
  }
  const extras = template.camposUsuario.filter((c) => !CAMPOS_BASE_FORM.has(c));
  if (extras.length === 0) {
    return;
  }

  const intro = document.createElement('p');
  intro.className = 'hint complement-intro';
  intro.textContent =
    'Confira o que já está definido e preencha apenas o que falta para este modelo.';
  el.complementFields.appendChild(intro);

  if (state.processoConsultado && state.processoResumo) {
    appendMiniProcessoResumo(el.complementFields);
  }

  const obrigatorios = camposExtrasObrigatorios(template.camposUsuario);
  const certosInferidos = obrigatorios.filter((c) => {
    const inf = inferenciaParaCampo(c);
    return inf.confianca === 'certa' && inf.valor;
  });
  if (certosInferidos.length > 0) {
    el.complementFields.appendChild(renderPainelAutofill(certosInferidos));
  }

  const modeloUsaJuizo =
    Array.isArray(template.camposUsuario) && template.camposUsuario.includes('juizo');
  if (modeloUsaJuizo) {
    const pPadrao = document.createElement('p');
    pPadrao.className = 'extra-section-hint extra-section-hint--cabecalho-juizo';
    pPadrao.textContent = TEXTO_AJUDA_PADRAO_CABECALHO_JUIZO;
    el.complementFields.appendChild(pPadrao);
  }

  const opcionais = extras.filter((c) => CAMPOS_OPCIONAIS_TEMPLATE.has(c));
  if (opcionais.length > 0) {
    const secOpt = document.createElement('div');
    secOpt.className = 'extra-section extra-section--optional';
    const h = document.createElement('h3');
    h.className = 'extra-section-title';
    h.textContent = 'Opcional — ajuste manual';
    secOpt.appendChild(h);
    const sub = document.createElement('p');
    sub.className = 'extra-section-hint';
    sub.textContent = 'Só preencha se quiser alterar o padrão sugerido pelo sistema.';
    secOpt.appendChild(sub);
    for (const campo of opcionais) {
      secOpt.appendChild(criarInputExtra(campo, { obrigatorio: false, preserved }));
    }
    el.complementFields.appendChild(secOpt);
  }

  const renderizarObrigatorios = obrigatorios.filter((c) => {
    const inf = inferenciaParaCampo(c);
    return !(inf.confianca === 'certa' && inf.valor);
  });
  if (renderizarObrigatorios.length > 0) {
    const secReq = document.createElement('div');
    secReq.className = 'extra-section extra-section--required-block';
    const h = document.createElement('h3');
    h.className = 'extra-section-title';
    const algumInferido = obrigatorios.some((c) => valorInferidoParaCampo(c));
    h.textContent = algumInferido
      ? 'Informe ou revise (obrigatório para este modelo)'
      : 'Obrigatório — informe (não inferido pela consulta)';
    secReq.appendChild(h);
    const sub = document.createElement('p');
    sub.className = 'extra-section-hint';
    sub.textContent = algumInferido
      ? 'Revise os valores sugeridos; preencha o que faltar. Use dd/mm/aaaa nas datas.'
      : 'Estes campos não são obtidos automaticamente; use dd/mm/aaaa nas datas.';
    secReq.appendChild(sub);
    for (const campo of renderizarObrigatorios) {
      const inf = inferenciaParaCampo(campo);
      secReq.appendChild(
        criarInputExtra(campo, {
          obrigatorio: true,
          preserved,
          confiancaInferencia: inf.confianca,
        })
      );
    }
    el.complementFields.appendChild(secReq);
  }
}

function renderProcessoResumo() {
  if (!el.processoResumo) return;
  el.processoResumo.innerHTML = '';
  if (!state.processoConsultado || !state.processoResumo) {
    el.processoResumo.hidden = true;
    return;
  }
  const p = state.processoResumo;
  el.processoResumo.hidden = false;

  const title = document.createElement('h3');
  title.className = 'processo-resumo-title';
  title.textContent = 'Resumo da consulta (Datajud)';
  el.processoResumo.appendChild(title);

  const dl = document.createElement('dl');
  dl.className = 'processo-resumo-dl';

  const linhas = [
    ['Número', p.numeroProcesso],
    ['Distribuição', p.dataDistribuicao],
    ['Órgão julgador', p.orgaoJulgador],
    ['Classe', p.classe],
  ];
  for (const [dt, dd] of linhas) {
    if (typeof dd !== 'string' || !dd.trim()) continue;
    const dEl = document.createElement('dt');
    dEl.textContent = dt;
    const ddEl = document.createElement('dd');
    ddEl.textContent = dd.trim();
    dl.appendChild(dEl);
    dl.appendChild(ddEl);
  }
  el.processoResumo.appendChild(dl);

  const foot = document.createElement('p');
  foot.className = 'processo-resumo-foot';
  foot.textContent =
    'Esses dados alimentam número, data de distribuição e o texto do juízo quando você não informa cabeçalho manual.';
  el.processoResumo.appendChild(foot);
}

function syncUsarModeloButton() {
  if (!el.btnUsarModelo) return;
  el.btnUsarModelo.disabled = !state.selectedTemplateId;
}

const ROTULO_CONFIANCA = {
  alta: 'alta',
  media: 'média',
  baixa: 'baixa',
};

/**
 * Exibe texto sobre a sugestão automática de modelo após consulta ao Datajud.
 */
function renderTemplateSugestao() {
  if (!el.templateSugestao) return;
  const s = state.sugestaoTemplate;
  if (!s || typeof s !== 'object') {
    el.templateSugestao.hidden = true;
    el.templateSugestao.textContent = '';
    return;
  }

  const id = s.templateIdSugerido;
  const conf = ROTULO_CONFIANCA[s.confianca] || String(s.confianca || '');
  const motivos = Array.isArray(s.motivos) ? s.motivos.filter(Boolean) : [];
  const alternativas = Array.isArray(s.alternativas) ? s.alternativas : [];

  if (typeof id === 'string' && id.trim()) {
    const t = state.templates.find((x) => x.id === id.trim());
    const nome = t ? t.nome : id.trim();
    el.templateSugestao.hidden = false;
    el.templateSugestao.className = 'hint compact template-sugestao template-sugestao--ok';
    el.templateSugestao.textContent = `Sugestão automática (confiança ${conf}): ${nome}. Você pode escolher outro modelo na lista abaixo.`;
    return;
  }

  const partes = [];
  partes.push('Não foi possível sugerir um modelo automaticamente.');
  if (motivos.length > 0) {
    partes.push(motivos[0]);
  }
  if (alternativas.length > 0) {
    const nomes = alternativas
      .map((aid) => {
        const tm = state.templates.find((x) => x.id === aid);
        return tm ? tm.nome : aid;
      })
      .filter(Boolean);
    if (nomes.length > 0) {
      partes.push(`Opções comuns neste cenário: ${nomes.join('; ')}.`);
    }
  }

  el.templateSugestao.hidden = false;
  el.templateSugestao.className = 'hint compact template-sugestao template-sugestao--neutral';
  el.templateSugestao.textContent = partes.join(' ');
}

function renderTemplateHint(template) {
  if (!el.templateHint) return;
  if (!template) {
    el.templateHint.hidden = true;
    el.templateHint.textContent = '';
    return;
  }

  el.templateHint.hidden = false;
  const partes = [`${template.categoria} — ${template.descricao}`];
  if (Array.isArray(template.camposDatajud) && template.camposDatajud.length > 0) {
    const nomes = template.camposDatajud
      .map((k) => MAPA_CAMPOS_DATAJUD[k]?.titulo)
      .filter(Boolean);
    if (nomes.length > 0) {
      partes.push(`Do processo: ${nomes.join(', ')}.`);
    }
  }
  el.templateHint.textContent = partes.join(' ');
}

function renderTemplateCards() {
  if (!el.templateCards) return;
  el.templateCards.innerHTML = '';

  const suggestedId =
    typeof state.sugestaoTemplate?.templateIdSugerido === 'string'
      ? state.sugestaoTemplate.templateIdSugerido.trim()
      : '';

  state.templates.forEach((template) => {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'template-card';
    card.setAttribute('role', 'option');
    card.dataset.templateId = template.id;
    card.setAttribute(
      'aria-selected',
      state.selectedTemplateId === template.id ? 'true' : 'false'
    );

    if (state.selectedTemplateId === template.id) {
      card.classList.add('template-card--selected');
    }
    if (suggestedId && template.id === suggestedId) {
      card.classList.add('template-card--suggested');
    }

    const title = document.createElement('strong');
    title.className = 'template-card-title';
    title.textContent = template.nome;

    const cat = document.createElement('span');
    cat.className = 'template-card-categoria';
    cat.textContent = template.categoria;

    const desc = document.createElement('span');
    desc.className = 'template-card-desc';
    desc.textContent = template.descricao;

    const meta = document.createElement('span');
    meta.className = 'template-card-meta';
    if (suggestedId && template.id === suggestedId) {
      const badge = document.createElement('span');
      badge.className = 'template-card-badge';
      badge.textContent = 'Sugerido';
      meta.appendChild(badge);
    }

    card.appendChild(title);
    card.appendChild(cat);
    card.appendChild(desc);
    if (meta.childNodes.length > 0) {
      card.appendChild(meta);
    }

    card.addEventListener('click', async () => {
      await setSelectedTemplateId(template.id, getExtraFieldValuesSnapshot());
      hideStatus(el.geracaoStatus);
      hideStatus(el.geracaoStatusStep2);
    });

    el.templateCards.appendChild(card);
  });
}

/**
 * @param {string} templateId
 * @param {Record<string, string>} [preservedExtras]
 */
async function setSelectedTemplateId(templateId, preservedExtras) {
  const anterior = state.selectedTemplateId;
  let preserved =
    preservedExtras && typeof preservedExtras === 'object' ? { ...preservedExtras } : {};
  if (anterior && templateId && anterior !== templateId && state.currentStep === 3) {
    delete preserved.juizo;
  }
  state.selectedTemplateId = templateId || null;
  if (el.templateIdInput) {
    el.templateIdInput.value = templateId || '';
  }
  renderTemplateCards();
  renderTemplateHint(getSelectedTemplate());
  if (state.currentStep === 3) {
    await renderComplementFieldsWithJuizoPreview(getSelectedTemplate(), preserved);
  }
  syncUsarModeloButton();
}

/**
 * @param {number} stepNum
 */
function isStepperNavDisabled(stepNum) {
  if (state.currentStep === 4) return true;
  if (stepNum > state.maxStepReached) return true;
  if (stepNum === 4) return true;
  if (stepNum > state.currentStep) return true;
  return false;
}

function refreshStepper() {
  for (let n = 1; n <= 4; n += 1) {
    const btn = document.getElementById(`stepper-${n}`);
    if (!btn) continue;
    const isCurrent = state.currentStep === n;
    const isDone = n < state.currentStep;
    btn.disabled = isStepperNavDisabled(n);
    if (isCurrent) {
      btn.setAttribute('aria-current', 'step');
    } else {
      btn.removeAttribute('aria-current');
    }
    btn.classList.toggle('stepper-step--current', isCurrent);
    btn.classList.toggle('stepper-step--done', isDone && !isCurrent);
    btn.classList.toggle('stepper-step--pending', !isDone && !isCurrent);
  }
}

/**
 * @param {number} step
 * @param {{ skipMaxBump?: boolean }} [opts]
 */
function goToStep(step, opts = {}) {
  const s = /** @type {1 | 2 | 3 | 4} */ (Math.min(4, Math.max(1, Math.floor(step))));
  state.currentStep = s;
  if (!opts.skipMaxBump) {
    state.maxStepReached = Math.max(state.maxStepReached, s);
  }

  for (let n = 1; n <= 4; n += 1) {
    const section = document.getElementById(`wizard-step-${n}`);
    if (section) {
      section.hidden = n !== s;
    }
  }
  refreshStepper();
}

function bindStepperNav() {
  for (let n = 1; n <= 4; n += 1) {
    const btn = document.getElementById(`stepper-${n}`);
    if (!btn) continue;
    btn.addEventListener('click', () => {
      if (btn.disabled) return;
      if (n === state.currentStep) return;
      if (n === 1) {
        goToStepBackward(1);
        return;
      }
      if (n === 2 && state.maxStepReached >= 2) {
        goToStepBackward(2);
      }
    });
  }
}

async function loadTemplates() {
  const data = await fetchJson('/api/templates');
  state.templates = data.templates || [];
  renderTemplateCards();
}

async function loadConfiguracao() {
  const data = await fetchJson('/api/config');
  state.datajudApiKeyConfigured = Boolean(data.datajudApiKeyConfigured);
  if (!state.datajudApiKeyConfigured) {
    showStatus(el.consultaStatus, 'DATAJUD_API_KEY não configurada no ambiente', 'error');
  }
}

/**
 * @param {{
 *   processo?: object | null,
 *   inferencias?: object | null,
 *   sugestaoTemplate?: object | null,
 * }} data
 * @param {{ statusMessage: string }} opts
 */
async function aplicarResultadoConsulta(data, opts) {
  state.processoResumo = data.processo && typeof data.processo === 'object' ? data.processo : null;
  state.processoInferencias =
    data.inferencias && typeof data.inferencias === 'object' ? data.inferencias : null;
  state.sugestaoTemplate =
    data.sugestaoTemplate && typeof data.sugestaoTemplate === 'object'
      ? data.sugestaoTemplate
      : null;
  state.processoConsultado = true;
  const preservedExtras = getExtraFieldValuesSnapshot();
  renderProcessoResumo();
  if (state.sugestaoTemplate?.templateIdSugerido) {
    await setSelectedTemplateId(state.sugestaoTemplate.templateIdSugerido, preservedExtras);
  } else {
    await setSelectedTemplateId('', preservedExtras);
  }
  renderTemplateSugestao();
  state.maxStepReached = Math.max(state.maxStepReached, 2);
  goToStep(2);
  showStatus(el.consultaStatus, opts.statusMessage, 'ok');
}

/**
 * @param {object} data Resposta de `/api/processos/consultar`
 * @param {{ nomeCliente: string, numeroProcesso: string }} payload
 */
function montarEPersistirCacheConsulta(data, payload) {
  const nomeNorm = normalizarNomeCliente(payload.nomeCliente);
  persistirConsultaNoCache({
    chave: montarChaveConsulta(nomeNorm, payload.numeroProcesso),
    nomeCliente: nomeNorm,
    numeroProcesso: payload.numeroProcesso,
    processo: data.processo && typeof data.processo === 'object' ? data.processo : null,
    inferencias: data.inferencias && typeof data.inferencias === 'object' ? data.inferencias : null,
    sugestaoTemplate:
      data.sugestaoTemplate && typeof data.sugestaoTemplate === 'object'
        ? data.sugestaoTemplate
        : null,
  });
}

async function onConsultar() {
  hideStatus(el.consultaStatus);
  hideStatus(el.geracaoStatus);
  hideStatus(el.geracaoStatusStep2);
  el.downloadsPanel.innerHTML = '';
  if (el.downloadSuccessBanner) {
    el.downloadSuccessBanner.hidden = true;
    el.downloadSuccessBanner.textContent = '';
  }

  const v1 = validatePasso1();
  if (!v1.ok) {
    showStatus(el.consultaStatus, v1.message, 'error');
    return;
  }

  const payload = getFormPayload();
  if (!state.consultaCache) {
    carregarConsultaDoCache();
  }

  const nomeNorm = normalizarNomeCliente(payload.nomeCliente);
  const chaveAtual = montarChaveConsulta(nomeNorm, payload.numeroProcesso);
  if (state.consultaCache && state.consultaCache.chave === chaveAtual) {
    el.btnConsultar.disabled = true;
    try {
      await aplicarResultadoConsulta(
        {
          processo: state.consultaCache.processo,
          inferencias: state.consultaCache.inferencias,
          sugestaoTemplate: state.consultaCache.sugestaoTemplate,
        },
        {
          statusMessage:
            'Usando dados da última consulta (mesmo nome e processo). Nenhuma nova chamada ao Datajud.',
        }
      );
    } finally {
      el.btnConsultar.disabled = false;
    }
    return;
  }

  el.btnConsultar.disabled = true;
  try {
    const data = await fetchJson('/api/processos/consultar', {
      method: 'POST',
      body: JSON.stringify({ numeroProcesso: payload.numeroProcesso }),
    });
    montarEPersistirCacheConsulta(data, {
      nomeCliente: payload.nomeCliente,
      numeroProcesso: payload.numeroProcesso,
    });
    await aplicarResultadoConsulta(data, {
      statusMessage: 'Processo localizado no Datajud. Escolha o modelo no passo seguinte.',
    });
  } catch (e) {
    limparConsultaCache();
    state.processoConsultado = false;
    state.processoResumo = null;
    state.processoInferencias = null;
    state.sugestaoTemplate = null;
    renderTemplateSugestao();
    renderProcessoResumo();
    await setSelectedTemplateId('', getExtraFieldValuesSnapshot());
    showStatus(
      el.consultaStatus,
      e.message || 'Falha ao consultar o processo.',
      'error'
    );
  } finally {
    el.btnConsultar.disabled = false;
  }
}

function triggerDownload(nomeArquivo, base64, mimeType) {
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) {
    bytes[i] = bin.codePointAt(i) || 0;
  }
  const blob = new Blob([bytes], { type: mimeType || 'application/octet-stream' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nomeArquivo;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * @param {object} data Resposta de `/api/documentos/gerar`
 */
function fillDownloads(data) {
  if (!data || typeof data !== 'object') return;
  el.downloadsPanel.innerHTML = '';
  if (el.downloadSuccessBanner) {
    el.downloadSuccessBanner.hidden = false;
    el.downloadSuccessBanner.textContent = 'Arquivos gerados com sucesso.';
  }
  (data.arquivos || []).forEach((arquivo) => {
    const link = document.createElement('a');
    link.href = '#';
    link.className = 'download-link-btn';
    link.textContent = `Baixar ${arquivo.formato.toUpperCase()} — ${arquivo.nomeArquivo}`;
    link.addEventListener('click', (ev) => {
      ev.preventDefault();
      triggerDownload(
        arquivo.nomeArquivo,
        arquivo.conteudoBase64,
        arquivo.mimeType || 'application/octet-stream'
      );
    });
    el.downloadsPanel.appendChild(link);
  });
}

/**
 * @returns {Promise<{ ok: boolean, data?: object, message?: string }>}
 */
async function runGenerateInternal() {
  const payload = getFormPayload();
  const template = getSelectedTemplate();

  if (!payload.templateId || !state.selectedTemplateId) {
    return { ok: false, message: 'Selecione um modelo.' };
  }
  if (!state.processoConsultado) {
    return { ok: false, message: 'Consulte o processo antes de gerar.' };
  }

  const msgExtra = validarPayloadParaTemplate(
    aplicarInferenciasAoPayloadLocal(payload),
    template
  );
  if (msgExtra) {
    return { ok: false, message: msgExtra };
  }

  try {
    const data = await fetchJson('/api/documentos/gerar', {
      method: 'POST',
      body: JSON.stringify({
        ...payload,
        templateId: state.selectedTemplateId,
      }),
    });
    return { ok: true, data };
  } catch (e) {
    return {
      ok: false,
      message: e.message || 'Erro ao gerar documentos.',
    };
  }
}

async function onUsarModelo() {
  const v2 = validatePasso2();
  if (!v2.ok) {
    showStatus(el.consultaStatus, v2.message, 'error');
    return;
  }

  const template = getSelectedTemplate();
  if (!template) {
    showStatus(el.consultaStatus, 'Selecione um modelo na lista.', 'error');
    return;
  }

  hideStatus(el.geracaoStatusStep2);

  if (hasComplementWorkForUser(template)) {
    state.maxStepReached = Math.max(state.maxStepReached, 3);
    goToStep(3);
    el.btnUsarModelo.disabled = true;
    try {
      await renderComplementFieldsWithJuizoPreview(template, getExtraFieldValuesSnapshot());
    } finally {
      el.btnUsarModelo.disabled = false;
    }
    return;
  }

  el.btnUsarModelo.disabled = true;
  try {
    const result = await runGenerateInternal();
    if (!result.ok) {
      showStatus(el.geracaoStatusStep2, result.message || 'Erro ao gerar.', 'error');
      return;
    }
    state.maxStepReached = Math.max(state.maxStepReached, 4);
    goToStep(4);
    fillDownloads(result.data);
  } finally {
    el.btnUsarModelo.disabled = false;
  }
}

async function onGerar() {
  const v2 = validatePasso2();
  if (!v2.ok) {
    showStatus(el.geracaoStatus, v2.message, 'error');
    return;
  }

  hideStatus(el.geracaoStatus);
  el.downloadsPanel.innerHTML = '';
  if (el.downloadSuccessBanner) {
    el.downloadSuccessBanner.hidden = true;
  }

  el.btnGerar.disabled = true;
  try {
    const result = await runGenerateInternal();
    if (!result.ok) {
      showStatus(el.geracaoStatus, result.message || 'Erro ao gerar.', 'error');
      return;
    }
    state.maxStepReached = Math.max(state.maxStepReached, 4);
    goToStep(4);
    fillDownloads(result.data);
  } finally {
    el.btnGerar.disabled = false;
  }
}

function resetWizard() {
  limparConsultaCache();
  state.processoConsultado = false;
  state.processoResumo = null;
  state.processoInferencias = null;
  state.sugestaoTemplate = null;
  state.selectedTemplateId = null;
  state.maxStepReached = 1;
  if (el.templateIdInput) el.templateIdInput.value = '';
  el.form.reset();
  hideStatus(el.consultaStatus);
  hideStatus(el.geracaoStatus);
  hideStatus(el.geracaoStatusStep2);
  el.downloadsPanel.innerHTML = '';
  if (el.downloadSuccessBanner) {
    el.downloadSuccessBanner.hidden = true;
    el.downloadSuccessBanner.textContent = '';
  }
  renderProcessoResumo();
  renderTemplateSugestao();
  renderTemplateCards();
  renderTemplateHint(null);
  el.complementFields.innerHTML = '';
  goToStep(1);
}

el.btnConsultar.addEventListener('click', onConsultar);
el.btnGerar.addEventListener('click', onGerar);
if (el.btnUsarModelo) {
  el.btnUsarModelo.addEventListener('click', onUsarModelo);
}
if (el.btnVoltarStep1) {
  el.btnVoltarStep1.addEventListener('click', () => {
    goToStepBackward(1);
  });
}
if (el.btnVoltarStep2) {
  el.btnVoltarStep2.addEventListener('click', () => {
    goToStepBackward(2);
  });
}
if (el.btnNovoDocumento) {
  el.btnNovoDocumento.addEventListener('click', resetWizard);
}

bindStepperNav();

function bindPasso1InvalidacaoCache() {
  const handler = () => invalidarCacheSeChaveDivergir();
  if (el.inputNomeCliente) {
    el.inputNomeCliente.addEventListener('input', handler);
    el.inputNomeCliente.addEventListener('change', handler);
  }
  if (el.inputNumeroProcesso) {
    el.inputNumeroProcesso.addEventListener('input', handler);
    el.inputNumeroProcesso.addEventListener('change', handler);
  }
}

Promise.all([loadTemplates(), loadConfiguracao()])
  .then(async () => {
    carregarConsultaDoCache();
    bindPasso1InvalidacaoCache();
    await setSelectedTemplateId('');
    goToStep(1, { skipMaxBump: true });
    state.maxStepReached = 1;
    refreshStepper();
  })
  .catch(() => {
    showStatus(el.consultaStatus, 'Não foi possível carregar a aplicação.', 'error');
  });
