/**
 * Geração de PDF a partir de HTML (mesmo conteúdo do template).
 * @module services/pdfService
 */

const puppeteer = require('puppeteer');

const A4_PAGE_HEIGHT_MM = 297;
const DEFAULT_LAYOUT_TOLERANCE_PX = 1;

/**
 * Calcula o espaço necessário para que o rodapé termine exatamente no fim
 * da última página renderizada.
 * @param {{ footerBottomPx: number, pageHeightPx: number, tolerancePx?: number }} params
 * @returns {number}
 */
function calcularEspacadorRodape(params) {
  const {
    footerBottomPx,
    pageHeightPx,
    tolerancePx = DEFAULT_LAYOUT_TOLERANCE_PX,
  } = params;

  if (
    !Number.isFinite(footerBottomPx) ||
    footerBottomPx <= 0 ||
    !Number.isFinite(pageHeightPx) ||
    pageHeightPx <= 0
  ) {
    return 0;
  }

  const remainder = footerBottomPx % pageHeightPx;
  if (remainder <= tolerancePx || pageHeightPx - remainder <= tolerancePx) {
    return 0;
  }

  return Math.round((pageHeightPx - remainder) * 100) / 100;
}

/**
 * Aguarda imagens e fontes para medir o layout final com precisão.
 * @param {import('puppeteer').Page} page
 * @returns {Promise<void>}
 */
async function esperarAssetsDaPagina(page) {
  await page.evaluate(async () => {
    function aguardarImagem(img) {
      if (img.complete) {
        return null;
      }

      return new Promise((resolve) => {
        img.addEventListener('load', resolve, { once: true });
        img.addEventListener('error', resolve, { once: true });
      });
    }

    const pendentes = Array.from(document.images, aguardarImagem).filter(Boolean);

    await Promise.all(pendentes);

    if (document.fonts && 'ready' in document.fonts) {
      try {
        await document.fonts.ready;
      } catch {
        // A ausência de fontes customizadas não deve impedir a geração do PDF.
      }
    }
  });
}

/**
 * Mede o rodapé para alinhá-lo ao final da última página A4.
 * @param {import('puppeteer').Page} page
 * @returns {Promise<{ footerBottomPx: number, pageHeightPx: number } | null>}
 */
async function medirRodape(page) {
  return page.evaluate((pageHeightMm) => {
    const footer = document.querySelector('.footer-image');
    if (!footer) {
      return null;
    }

    const probe = document.createElement('div');
    probe.setAttribute('aria-hidden', 'true');
    probe.style.cssText = [
      'position:absolute',
      'left:-9999px',
      'top:0',
      'width:1px',
      `height:${pageHeightMm}mm`,
      'visibility:hidden',
      'pointer-events:none',
    ].join(';');

    document.body.appendChild(probe);
    const pageHeightPx = probe.getBoundingClientRect().height;
    probe.remove();

    const footerRect = footer.getBoundingClientRect();
    return {
      footerBottomPx: footerRect.top + footerRect.height,
      pageHeightPx,
    };
  }, A4_PAGE_HEIGHT_MM);
}

/**
 * Insere um espaçador antes do rodapé apenas no fluxo do PDF.
 * @param {import('puppeteer').Page} page
 * @param {number} spacerHeightPx
 * @returns {Promise<void>}
 */
async function aplicarEspacadorAntesDoRodape(page, spacerHeightPx) {
  if (!spacerHeightPx) {
    return;
  }

  await page.evaluate((height) => {
    const footer = document.querySelector('.footer-image');
    if (!footer) {
      return;
    }

    let spacer = footer.previousElementSibling;
    if (!(spacer instanceof HTMLElement) || !spacer.classList.contains('pdf-footer-spacer')) {
      spacer = document.createElement('div');
      spacer.className = 'pdf-footer-spacer';
      spacer.setAttribute('aria-hidden', 'true');
      footer.before(spacer);
    }

    spacer.style.height = `${height}px`;
    spacer.style.lineHeight = '0';
    spacer.style.fontSize = '0';
  }, spacerHeightPx);
}

/**
 * Empurra o rodapé até o final da última página sem alterar o HTML base do DOCX.
 * @param {import('puppeteer').Page} page
 * @returns {Promise<void>}
 */
async function alinharRodapeAoFimDaUltimaPagina(page) {
  await esperarAssetsDaPagina(page);
  const layout = await medirRodape(page);
  if (!layout) {
    return;
  }

  const spacerHeightPx = calcularEspacadorRodape(layout);
  await aplicarEspacadorAntesDoRodape(page, spacerHeightPx);
}

/**
 * @param {string} html
 * @returns {Promise<Buffer>}
 */
async function htmlParaPdfBuffer(html) {
  const launchOptions = {
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  };
  if (process.env.PUPPETEER_EXECUTABLE_PATH) {
    launchOptions.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
  }

  const browser = await puppeteer.launch(launchOptions);
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    await alinharRodapeAoFimDaUltimaPagina(page);
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
    });
    return Buffer.isBuffer(pdfBuffer) ? pdfBuffer : Buffer.from(pdfBuffer);
  } finally {
    await browser.close();
  }
}

module.exports = {
  alinharRodapeAoFimDaUltimaPagina,
  calcularEspacadorRodape,
  htmlParaPdfBuffer,
};
