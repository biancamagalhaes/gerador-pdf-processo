/**
 * Geração de documento Word (Office Open XML .docx) a partir do mesmo HTML do PDF.
 * O formato de saída é .docx, compatível com Microsoft Word e LibreOffice.
 * @module services/docService
 */

const HTMLtoDOCX = require('html-to-docx');

/**
 * Remove `width` em porcentagem em &lt;td&gt;/&lt;th&gt;.
 * O html-to-docx 1.8.x gera XML inválido (`Invalid XML name: @w`) nesse caso.
 * @param {string} html
 * @returns {string}
 */
function removerWidthPercentEmCelulas(html) {
  return String(html).replaceAll(
    /<(td|th)\b([^>]*?)\sstyle="([^"]*)"/gi,
    (match, tag, rest, styleContent) => {
      const cleaned = styleContent
        .replaceAll(/\bwidth\s*:\s*[\d.]+%;?/gi, '')
        .replaceAll(/;\s*;/g, ';')
        .replaceAll(/^\s*;\s*/g, '')
        .replaceAll(/\s*;\s*$/g, '')
        .trim();
      const antes = rest.trim();
      if (!cleaned) {
        return antes ? `<${tag} ${antes}` : `<${tag}`;
      }
      return `<${tag}${rest} style="${cleaned}"`;
    }
  );
}

/**
 * O conversor html-to-docx não interpreta bem @page, impressão e posicionamento fixo.
 * Limpa apenas blocos &lt;style&gt; para reduzir divergências em relação ao PDF.
 * @param {string} html
 * @returns {string}
 */
const STYLE_BLOCK_REGEX = /<style\b[^>]*>([\s\S]*?)<\/style>/gi;
const OPEN_STYLE_TAG_REGEX = /^<style\b[^>]*>/i;

function normalizarBlocosStyleParaDocx(html) {
  return String(html).replaceAll(STYLE_BLOCK_REGEX, (full, css) => {
    let cleaned = css
      .replaceAll(/@page\s*\{[^}]*\}/gi, '')
      .replaceAll(/-webkit-print-color-adjust\s*:\s*[^;]+;?/gi, '')
      .replaceAll(/print-color-adjust\s*:\s*[^;]+;?/gi, '')
      .replaceAll(/position\s*:\s*fixed\s*;?/gi, '');
    cleaned = cleaned.replaceAll(/\n\s*\n\s*\n/g, '\n\n');
    const openTag = OPEN_STYLE_TAG_REGEX.exec(full);
    return openTag ? `${openTag[0]}${cleaned}</style>` : full;
  });
}

/**
 * Sanitizações aplicadas só na geração DOCX (o PDF usa o HTML original).
 * @param {string} html
 * @returns {string}
 */
function sanitizarHtmlParaDocx(html) {
  let out = String(html);
  out = removerWidthPercentEmCelulas(out);
  out = normalizarBlocosStyleParaDocx(out);
  return out;
}

/**
 * @param {string} html
 * @returns {Promise<Buffer>}
 */
async function htmlParaDocxBuffer(html) {
  const htmlDocx = sanitizarHtmlParaDocx(html);
  const result = await HTMLtoDOCX(htmlDocx, null, {
    orientation: 'portrait',
    margins: {
      top: 720,
      right: 720,
      bottom: 720,
      left: 720,
    },
  });
  if (Buffer.isBuffer(result)) {
    return result;
  }
  if (result instanceof ArrayBuffer) {
    return Buffer.from(result);
  }
  return Buffer.from(result);
}

module.exports = {
  htmlParaDocxBuffer,
  sanitizarHtmlParaDocx,
  removerWidthPercentEmCelulas,
  normalizarBlocosStyleParaDocx,
};
