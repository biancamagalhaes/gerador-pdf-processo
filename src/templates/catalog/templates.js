/**
 * Catálogo de modelos documentais (mínimo 10 itens).
 * Vários modelos compartilham o mesmo HTML base até haver peças específicas.
 * @module templates/catalog/templates
 */

const path = require('path');

const TEMPLATE_PADRAO_INSS = path.join(
  __dirname,
  '..',
  'modelos',
  'padrao-inss',
  'template.html'
);

const TEMPLATE_DESIGNACAO_PERICIA = path.join(
  __dirname,
  '..',
  'modelos',
  'designacao-pericia',
  'template.html'
);

const TEMPLATE_COBRAR_INCLUSAO_PAUTA = path.join(
  __dirname,
  '..',
  'modelos',
  'cobrar-inclusao-pauta-julgamento',
  'template.html'
);

const TEMPLATE_INTIMACAO_PARTE_RE = path.join(
  __dirname,
  '..',
  'modelos',
  'intimacao-parte-re',
  'template.html'
);

const TEMPLATE_PROLATORIA_AUXILIO_DOENCA = path.join(
  __dirname,
  '..',
  'modelos',
  'prolatoria-sentenca-auxilio-doenca',
  'template.html'
);

const TEMPLATE_PROLATORIA_BPC_LOAS = path.join(
  __dirname,
  '..',
  'modelos',
  'prolatoria-sentenca-bpc-loas-deficiente',
  'template.html'
);

/** @type {import('./templateTypes').TemplateDefinition[]} */
const TEMPLATES = [
  {
    id: 'designacao-pericia',
    nome: 'Designação de perícia médica',
    categoria: 'Benefícios por incapacidade',
    descricao: 'Impulsionamento do feito para designação de perícia com especialista.',
    ativo: true,
    templatePath: TEMPLATE_DESIGNACAO_PERICIA,
    mapperId: 'defaultPrev',
    formatos: ['pdf', 'doc'],
    camposUsuario: ['nomeCliente', 'especialidade', 'juizo', 'poloPassivoPreset'],
    camposDatajud: ['numeroProcesso', 'dataAjuizamento'],
    camposInferiveis: [],
  },
  {
    id: 'cobrar-inclusao-pauta-julgamento',
    nome: 'Cobrar inclusão do processo em pauta de julgamento',
    categoria: 'Recursos',
    descricao: 'Requer inclusão em pauta após conclusão para julgamento.',
    ativo: true,
    templatePath: TEMPLATE_COBRAR_INCLUSAO_PAUTA,
    mapperId: 'defaultPrev',
    formatos: ['pdf', 'doc'],
    camposUsuario: [
      'nomeCliente',
      'juizo',
      'poloPassivoPreset',
      'dataRemessaConclusao',
      'idRecursoInominado',
    ],
    camposDatajud: ['numeroProcesso'],
    camposInferiveis: ['dataRemessaConclusao'],
  },
  {
    id: 'intimacao-parte-re',
    nome: 'Intimação da parte ré',
    categoria: 'Dilação probatória',
    descricao: 'Requer intimação da ré para contestação ou proposta de acordo após laudo.',
    ativo: true,
    templatePath: TEMPLATE_INTIMACAO_PARTE_RE,
    mapperId: 'defaultPrev',
    formatos: ['pdf', 'doc'],
    camposUsuario: ['nomeCliente', 'juizo', 'poloPassivoPreset', 'dataLaudoMedico'],
    camposDatajud: ['numeroProcesso', 'dataAjuizamento'],
    camposInferiveis: [],
  },
  {
    id: 'prolatoria-sentenca-auxilio-doenca',
    nome: 'Prolação da sentença (auxílio-doença)',
    categoria: 'Sentença',
    descricao: 'Impulsionamento para prolação de sentença após laudo, contestação e réplica.',
    ativo: true,
    templatePath: TEMPLATE_PROLATORIA_AUXILIO_DOENCA,
    mapperId: 'defaultPrev',
    formatos: ['pdf', 'doc'],
    camposUsuario: [
      'nomeCliente',
      'juizo',
      'poloPassivoPreset',
      'dataLaudoMedico',
      'dataContestacao',
      'dataReplica',
    ],
    camposDatajud: ['numeroProcesso', 'dataAjuizamento'],
    camposInferiveis: ['dataContestacao', 'dataReplica'],
  },
  {
    id: 'prolatoria-sentenca-bpc-loas-deficiente',
    nome: 'Prolação da sentença (BPC/LOAS deficiente)',
    categoria: 'Sentença',
    descricao: 'Impulsionamento para sentença com laudos médico e social, contestação e réplica.',
    ativo: true,
    templatePath: TEMPLATE_PROLATORIA_BPC_LOAS,
    mapperId: 'defaultPrev',
    formatos: ['pdf', 'doc'],
    camposUsuario: [
      'nomeCliente',
      'juizo',
      'poloPassivoPreset',
      'dataLaudoMedico',
      'dataLaudoSocial',
      'dataContestacao',
      'dataReplica',
    ],
    camposDatajud: ['numeroProcesso', 'dataAjuizamento'],
    camposInferiveis: ['dataContestacao', 'dataReplica'],
  },
  {
    id: 'prolatoria-sentenca-bpc-loas-idoso-2',
    nome: 'Prolação da sentença (BPC/LOAS idoso — alternativo)',
    categoria: 'Sentença',
    descricao: 'Mesmo texto do modelo BPC/LOAS idoso (segunda versão do .docx).',
    ativo: true,
    templatePath: TEMPLATE_PROLATORIA_BPC_LOAS,
    mapperId: 'defaultPrev',
    formatos: ['pdf', 'doc'],
    camposUsuario: [
      'nomeCliente',
      'juizo',
      'poloPassivoPreset',
      'dataLaudoMedico',
      'dataLaudoSocial',
      'dataContestacao',
      'dataReplica',
    ],
    camposDatajud: ['numeroProcesso', 'dataAjuizamento'],
    camposInferiveis: ['dataContestacao', 'dataReplica'],
  },
  {
    id: 'impulsionamento-julgamento',
    nome: 'Impulsionamento de julgamento',
    categoria: 'Geral',
    descricao: 'Requer celeridade e julgamento do feito nos termos da inicial.',
    ativo: true,
    templatePath: TEMPLATE_PADRAO_INSS,
    mapperId: 'defaultPrev',
    formatos: ['pdf', 'doc'],
    camposUsuario: ['nomeCliente', 'especialidade', 'poloPassivoPreset'],
    camposDatajud: ['numeroProcesso', 'dataAjuizamento'],
    camposInferiveis: [],
  },
  {
    id: 'juntada-documentos',
    nome: 'Juntada de documentos',
    categoria: 'Instrução processual',
    descricao: 'Requer a juntada de documentos aos autos.',
    ativo: true,
    templatePath: TEMPLATE_PADRAO_INSS,
    mapperId: 'defaultPrev',
    formatos: ['pdf', 'doc'],
    camposUsuario: ['nomeCliente', 'especialidade', 'poloPassivoPreset'],
    camposDatajud: ['numeroProcesso', 'dataAjuizamento'],
    camposInferiveis: [],
  },
  {
    id: 'esclarecimentos-pericia',
    nome: 'Esclarecimentos à perícia',
    categoria: 'Perícia médica',
    descricao: 'Requer esclarecimentos ou complementação de laudo pericial.',
    ativo: true,
    templatePath: TEMPLATE_PADRAO_INSS,
    mapperId: 'defaultPrev',
    formatos: ['pdf', 'doc'],
    camposUsuario: ['nomeCliente', 'especialidade', 'poloPassivoPreset'],
    camposDatajud: ['numeroProcesso', 'dataAjuizamento'],
    camposInferiveis: [],
  },
  {
    id: 'habilitacao-assistente',
    nome: 'Habilitação de assistente técnico',
    categoria: 'Perícia médica',
    descricao: 'Requer habilitação de assistente técnico em perícia.',
    ativo: true,
    templatePath: TEMPLATE_PADRAO_INSS,
    mapperId: 'defaultPrev',
    formatos: ['pdf', 'doc'],
    camposUsuario: ['nomeCliente', 'especialidade', 'poloPassivoPreset'],
    camposDatajud: ['numeroProcesso', 'dataAjuizamento'],
    camposInferiveis: [],
  },
  {
    id: 'manifestacao-interesse',
    nome: 'Manifestação de interesse em audiência',
    categoria: 'Audiência',
    descricao: 'Requer designação ou manifestação sobre audiência.',
    ativo: true,
    templatePath: TEMPLATE_PADRAO_INSS,
    mapperId: 'defaultPrev',
    formatos: ['pdf', 'doc'],
    camposUsuario: ['nomeCliente', 'especialidade', 'poloPassivoPreset'],
    camposDatajud: ['numeroProcesso', 'dataAjuizamento'],
    camposInferiveis: [],
  },
  {
    id: 'pedido-intimacao-inss',
    nome: 'Pedido de intimação do INSS',
    categoria: 'Dilação probatória',
    descricao: 'Requer intimação do INSS para juntada ou manifestação.',
    ativo: true,
    templatePath: TEMPLATE_PADRAO_INSS,
    mapperId: 'defaultPrev',
    formatos: ['pdf', 'doc'],
    camposUsuario: ['nomeCliente', 'especialidade', 'poloPassivoPreset'],
    camposDatajud: ['numeroProcesso', 'dataAjuizamento'],
    camposInferiveis: [],
  },
  {
    id: 'requerimento-acessibilidade',
    nome: 'Requerimento de acessibilidade',
    categoria: 'Audiência / perícia',
    descricao: 'Requer adaptações de acessibilidade em perícia ou audiência.',
    ativo: true,
    templatePath: TEMPLATE_PADRAO_INSS,
    mapperId: 'defaultPrev',
    formatos: ['pdf', 'doc'],
    camposUsuario: ['nomeCliente', 'especialidade', 'poloPassivoPreset'],
    camposDatajud: ['numeroProcesso', 'dataAjuizamento'],
    camposInferiveis: [],
  },
  {
    id: 'substabelecimento',
    nome: 'Substabelecimento com reserva',
    categoria: 'Representação processual',
    descricao: 'Registro de substabelecimento ou retificação de procuração.',
    ativo: true,
    templatePath: TEMPLATE_PADRAO_INSS,
    mapperId: 'defaultPrev',
    formatos: ['pdf', 'doc'],
    camposUsuario: ['nomeCliente', 'especialidade', 'poloPassivoPreset'],
    camposDatajud: ['numeroProcesso', 'dataAjuizamento'],
    camposInferiveis: [],
  },
  {
    id: 'requerimento-homologacao-acordo',
    nome: 'Requerimento de homologação de acordo',
    categoria: 'Acordo',
    descricao: 'Requer homologação de acordo ou transação nos autos.',
    ativo: true,
    templatePath: TEMPLATE_PADRAO_INSS,
    mapperId: 'defaultPrev',
    formatos: ['pdf', 'doc'],
    camposUsuario: ['nomeCliente', 'especialidade', 'poloPassivoPreset'],
    camposDatajud: ['numeroProcesso', 'dataAjuizamento'],
    camposInferiveis: [],
  },
];

module.exports = {
  TEMPLATES,
};
