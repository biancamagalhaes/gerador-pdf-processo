const axios = require('axios');
const fs = require('fs-extra');
const handlebars = require('handlebars');
const puppeteer = require('puppeteer');
const path = require('path');

const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
});

const API_HEADERS = {
    'Authorization': 'APIKey cDZHYzlZa0JadVREZDJCendQbXY6SkJlTzNjLV9TRENyQk1RdnFKZGRQdw==',
    'Content-Type': 'application/json'
};

const pergunta = (texto) => new Promise((resolve) => readline.question(texto, resolve));

function obterLogoBase64(caminho) {
    try {
        const bitmap = fs.readFileSync(caminho);
        return `data:image/png;base64,${bitmap.toString('base64')}`;
    } catch (e) {
        console.error("⚠️ Arquivo logo.png não encontrado na pasta!");
        return "";
    }
}

function formatarDataAjuizamento(dataStr) {
    if (!dataStr || dataStr.length < 8) return " / / ";
    const ano = dataStr.substring(0, 4);
    const mes = dataStr.substring(4, 6);
    const dia = dataStr.substring(6, 8);
    return `${dia}/${mes}/${ano}`;
}

function formatarProcesso(num) {
    if (!num || num.length !== 20) return num;
    return `${num.substring(0, 7)}-${num.substring(7, 9)}.${num.substring(9, 13)}.${num.substring(13, 14)}.${num.substring(14, 16)}.${num.substring(16, 20)}`;
}

async function gerarPdfProcesso(processoId) {
    if (!processoId) {
        console.log("⚠️  Uso: node index.js [NUMERO_DO_PROCESSO]");
        process.exit();
    }

    try {
        // 1. Pede os dados que não vêm na API ou que você quer alterar
        console.log(`--- Automação de Petição ---`);
        const nomeCliente = await pergunta("👤 Digite o NOME DO CLIENTE: ");
        const especialidade = await pergunta("⚕️  Digite a ESPECIALIDADE MÉDICA: ");

        console.log(`\n🔍 Buscando dados do processo ${processoId} no Datajud...`);
        
        const requestBody = {
            "query": {
                "match": {
                    "numeroProcesso": processoId
                }
            }
        };

        const response = await axios.post(`https://api-publica.datajud.cnj.jus.br/api_publica_trf1/_search`, requestBody, {
            headers: API_HEADERS
        });

        const hit = response.data.hits.hits[0];
        
        if (!hit) {
            console.error("❌ Processo não encontrado na base do TRF1.");
            readline.close();
            return;
        }

        const source = hit._source;

        // 2. Preparando os dados para o template
        const dadosParaTemplate = {
            logo_base64: obterLogoBase64(path.resolve(__dirname, 'logo.png')),
            footer_base64: obterLogoBase64(path.resolve(__dirname, 'footer.png')),
            numero_processo: formatarProcesso(source.numeroProcesso),
            nome_cliente: nomeCliente.toUpperCase(), // Força o nome em CAIXA ALTA
            data_distribuicao: formatarDataAjuizamento(source.dataAjuizamento),
            especialidade: especialidade.toUpperCase(), // Força especialidade em CAIXA ALTA
            data_hoje: new Date().toLocaleDateString('pt-BR', { 
                day: '2-digit', month: 'long', year: 'numeric' 
            })
        };

        // 3. Carrega o HTML e injeta os dados
        const htmlTemplate = await fs.readFile('./template.html', 'utf-8');
        const templateCompilado = handlebars.compile(htmlTemplate);
        const htmlFinal = templateCompilado(dadosParaTemplate);

        console.log("📄 Gerando arquivo PDF...");
        const browser = await puppeteer.launch({ headless: "new" });
        const page = await browser.newPage();
        
        // waitUntil: 'networkidle0' é essencial para carregar a logo.png
        await page.setContent(htmlFinal, { waitUntil: 'networkidle0' });

        const nomeArquivo = `${nomeCliente} - Designacao de pericia.pdf`;
        await page.pdf({
            path: nomeArquivo,
            format: 'A4',
            printBackground: true,
            margin: { top: 0, right: 0, bottom: 0, left: 0 }
        });

        await browser.close();
        console.log(`✅ Sucesso! PDF gerado: ${nomeArquivo}`);

    } catch (error) {
        console.error("❌ Erro no processo:", error.message);
    } finally {
        readline.close();
    }
}

// Inicia o script com o argumento passado no terminal
gerarPdfProcesso(process.argv[2]);