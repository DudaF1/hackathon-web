// database.js
// Banco de dados local da versão web do admin.
// As telas usam estes dados como fonte inicial e salvam alterações no localStorage.

(function () {
function baseHolerites(offset = 0) {
  return [
    { id: 1 + offset, mes: 'Abril', competencia: '04/2026', valorLiquido: 'R$ 2.847,35', dataDisponivel: '05/05/2026', status: 'Esperando assinatura', protocoloDocusign: 'DOC-ABR-2026-10234' },
    { id: 2 + offset, mes: 'Março', competencia: '03/2026', valorLiquido: 'R$ 2.791,80', dataDisponivel: '05/04/2026', status: 'Assinado', protocoloDocusign: 'DOC-MAR-2026-10234', dataAssinatura: '06/04/2026' },
    { id: 3 + offset, mes: 'Fevereiro', competencia: '02/2026', valorLiquido: 'R$ 2.812,40', dataDisponivel: '05/03/2026', status: 'Assinado', protocoloDocusign: 'DOC-FEV-2026-10234', dataAssinatura: '06/03/2026' },
  ];
}

const initialState = {
  fontScale: 1,
  page: 'home',
  muralAtual: 0,
  selectedBenefit: null,
  selectedPessoal: null,
  selectedSector: 'Todos',
  funcionariosModalFilter: null,
  murais: [
    { id: 1, titulo: 'Campanha Dia das Mães', descricao: 'Celebre o Dia das Mães com Lipson', imagem: 'https://images.unsplash.com/photo-1529636798458-92182e662485?auto=format&fit=crop&q=80&w=1200' },
    { id: 2, titulo: 'Campanha interna', descricao: 'Comunicados e novidades da empresa', imagem: 'https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&q=80&w=1200' },
    { id: 3, titulo: 'Treinamento', descricao: 'Novos treinamentos disponíveis', imagem: 'https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&q=80&w=1200' },
    { id: 4, titulo: 'Avisos do RH', descricao: 'Fique atento aos comunicados importantes', imagem: 'https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&q=80&w=1200' },
  ],
  avisos: [
    { id: 1, titulo: 'Aviso importante', descricao: 'Terá vistoria no setor de produção amanhã às 9h.', data: '12/05/2026' },
  ],
  votacoes: [
    {
      id: 1,
      ativa: true,
      pergunta: 'Tiradentes: qual opção você prefere?',
      data: '12/05/2026',
      votosUsuarios: {
        'Sarah': 1,
        'Maria Eduarda': 2,
        'Pedro': 1,
        'Lucas Ferreira': 3,
        'Camila Rocha': 1,
      },
      opcoes: [
        { id: 1, texto: 'Folgar no dia de Tiradentes' },
        { id: 2, texto: 'Folgar na segunda-feira' },
        { id: 3, texto: 'Trabalhar no dia e folgar sexta' },
      ],
    },
  ],
  usuarios: [
    { nome: 'Anna Luiza', usuario: '01@adm', tipo: 'admin', senha: '1234', idade: 28, setor: 'Recursos Humanos', transportadora: { nome: 'TOP', link: 'https://www.boradetop.com.br/' } },
    { nome: 'Anna Beatriz', usuario: '02@adm', tipo: 'admin', senha: '1234', idade: 31, setor: 'Recursos Humanos', transportadora: { nome: 'Alelo', link: 'https://www.alelo.com.br/' } },
    { nome: 'Ana Beatriz', usuario: '03@adm', tipo: 'admin', senha: '1234', idade: 29, setor: 'Departamento Pessoal', transportadora: { nome: 'Flash', link: 'https://flashapp.com.br/' } },
    { nome: 'Sarah', usuario: '01@func', tipo: 'funcionario', senha: '1234', idade: 45, setor: 'Produção', cargo: 'Operadora de produção', transportadora: { nome: 'TOP', link: 'https://www.boradetop.com.br/' } },
    { nome: 'Maria Eduarda', usuario: '02@func', tipo: 'funcionario', senha: '1234', idade: 39, setor: 'Vendas', cargo: 'Atendente comercial', transportadora: { nome: 'Alelo', link: 'https://www.alelo.com.br/' } },
    { nome: 'Pedro', usuario: '03@func', tipo: 'funcionario', senha: '1234', idade: 42, setor: 'Logística', cargo: 'Auxiliar de logística', transportadora: { nome: 'Flash', link: 'https://flashapp.com.br/' } },
    { nome: 'Lucas Ferreira', usuario: '04@func', tipo: 'funcionario', senha: '1234', idade: 26, setor: 'TI', cargo: 'Analista de suporte', transportadora: { nome: 'SOU', link: 'https://www.cartaosou.com.br/' } },
    { nome: 'Camila Rocha', usuario: '05@func', tipo: 'funcionario', senha: '1234', idade: 30, setor: 'Marketing', cargo: 'Assistente de marketing', transportadora: { nome: 'SPTrans', link: 'https://www.sptrans.com.br/' } },
    { nome: 'Bruno Henrique', usuario: '06@func', tipo: 'funcionario', senha: '1234', idade: 37, setor: 'Compras', cargo: 'Comprador', transportadora: { nome: 'SOU', link: 'https://soudiadema.com.br/o-cartao-sou-diadema/' } },
    { nome: 'Juliana Alves', usuario: '07@func', tipo: 'funcionario', senha: '1234', idade: 24, setor: 'Financeiro', cargo: 'Auxiliar financeiro', transportadora: { nome: 'SPTrans', link: 'https://www.sptrans.com.br/' } },
    { nome: 'Ricardo Mendes', usuario: '08@func', tipo: 'funcionario', senha: '1234', idade: 41, setor: 'Produção', cargo: 'Operador de produção', transportadora: { nome: 'VR', link: 'https://www.vr.com.br/' } },
    { nome: 'Fernanda Lima', usuario: '09@func', tipo: 'funcionario', senha: '1234', idade: 33, setor: 'Atendimento', cargo: 'Atendente', transportadora: { nome: 'VR', link: 'https://www.vr.com.br/' } },
    { nome: 'Matheus Souza', usuario: '10@func', tipo: 'funcionario', senha: '1234', idade: 27, setor: 'Estoque', cargo: 'Estoquista', transportadora: { nome: 'Ben', link: 'https://benvt.com.br/' } },
    { nome: 'Patricia Gomes', usuario: '11@func', tipo: 'funcionario', senha: '1234', idade: 35, setor: 'Jurídico', cargo: 'Analista jurídico', transportadora: { nome: 'Ben', link: 'https://benvt.com.br/' } },
    { nome: 'Gustavo Martins', usuario: '12@func', tipo: 'funcionario', senha: '1234', idade: 29, setor: 'TI', cargo: 'Desenvolvedor', transportadora: { nome: 'Ticket', link: 'https://www.ticket.com.br/' } },
    { nome: 'Larissa Costa', usuario: '13@func', tipo: 'funcionario', senha: '1234', idade: 32, setor: 'Qualidade', cargo: 'Analista de qualidade', transportadora: { nome: 'Ticket', link: 'https://www.ticket.com.br/' } },
  ],
  solicitacoes: [
    { id: 1, funcionario: 'Sarah', tipo: 'Troca de férias', descricao: 'Solicitação de alteração do período de férias.', data: '12/05/2026', status: 'Esperando avaliação' },
    { id: 2, funcionario: 'Maria Eduarda', tipo: 'Exame periódico', descricao: 'Agendamento de exame ocupacional.', data: '08/05/2026', status: 'Aprovado' },
    { id: 3, funcionario: 'Pedro', tipo: 'Justificativa de falta', descricao: 'Envio de justificativa para ausência.', data: '03/05/2026', status: 'Negado' },
    { id: 4, funcionario: 'Lucas Ferreira', tipo: 'Convênio Santa Helena', descricao: 'Inclusão de dependente com documentos anexados. Cópias PDF e TXT geradas.', data: '13/05/2026', status: 'Esperando avaliação' },
  ],
  ferias: [
    { id: 1, nome: 'Sarah', setor: 'Produção', cargo: 'Operadora de produção', periodo: '01/05/2026 a 30/05/2026', retorno: '31/05/2026', status: 'Prestes a voltar', cor: 'green' },
    { id: 2, nome: 'Maria Eduarda', setor: 'Vendas', cargo: 'Atendente comercial', periodo: '10/05/2026 a 24/05/2026', retorno: '25/05/2026', status: 'Na metade das férias', cor: 'yellow' },
    { id: 3, nome: 'Pedro', setor: 'Logística', cargo: 'Auxiliar de logística', periodo: '13/05/2026 a 27/05/2026', retorno: '28/05/2026', status: 'Acabou de entrar de férias', cor: 'red' },
  ],
  holeritesAdmin: [
    { id: 1, nome: 'Sarah', setor: 'Produção', cargo: 'Operadora de produção', holerites: baseHolerites(0) },
    { id: 2, nome: 'Maria Eduarda', setor: 'Vendas', cargo: 'Atendente comercial', holerites: baseHolerites(10) },
    { id: 3, nome: 'Pedro', setor: 'Logística', cargo: 'Auxiliar de logística', holerites: baseHolerites(20) },
    { id: 4, nome: 'Lucas Ferreira', setor: 'TI', cargo: 'Analista de suporte', holerites: baseHolerites(30) },
  ],
  treinamentos: [
    { id: 1, titulo: 'Segurança no trabalho', duracao: '15 min', link: 'video-seguranca.mp4' },
    { id: 2, titulo: 'Boas práticas de fabricação', duracao: '30 min', link: 'video-boas-praticas.mp4' },
    { id: 3, titulo: 'Cultura Lipson', duracao: '10 min', link: 'video-cultura.mp4' },
  ],
  conclusoesTreinamento: [
    { id: 1, funcionario: 'Sarah', treinamento: 'Integração de novos funcionários', dataConclusao: '12/05/2026', progresso: '100%' },
    { id: 2, funcionario: 'Pedro', treinamento: 'NR-6 — EPIs', dataConclusao: '11/05/2026', progresso: '100%' },
  ],
};

// Dados extras usados pelas telas administrativas web.
initialState.faltasAdmin = [
  { id: 1, funcionario: 'Sarah', setor: 'Produção', tipo: 'Atestado', data: '03/05/2026', status: 'Justificada', descricao: 'Atestado de exame do dia a dia enviado para o RH.', documento: 'atestado-sarah.pdf' },
  { id: 2, funcionario: 'Maria Eduarda', setor: 'Vendas', tipo: 'Não justificada', data: '08/05/2026', status: 'Não justificada', descricao: 'Ausência registrada sem justificativa anexada.', documento: '' },
  { id: 3, funcionario: 'Pedro', setor: 'Logística', tipo: 'Apontamento', data: '14/05/2026', status: 'Em análise', descricao: 'Atraso apontado no controle de ponto.', documento: 'apontamento-pedro.txt' },
  { id: 4, funcionario: 'Lucas Ferreira', setor: 'TI', tipo: 'Atestado', data: '18/05/2026', status: 'Em análise', descricao: 'Atestado médico anexado pelo funcionário.', documento: 'atestado-lucas.pdf' },
];
initialState.examesAdmin = [
  { id: 1, funcionario: 'Sarah', setor: 'Produção', titulo: 'Anamnese ocupacional', tipo: 'Anamnese', data: '07/05/2026', prazo: 'Até 07/05/2026', local: 'Ambulatório interno', status: 'Concluído', comprovante: 'aso-sarah.pdf' },
  { id: 2, funcionario: 'Maria Eduarda', setor: 'Vendas', titulo: 'Exame físico periódico', tipo: 'Exame físico', data: '16/05/2026', prazo: 'Até 16/05/2026', local: 'Clínica Vida Ocupacional', status: 'Pendente', comprovante: '' },
  { id: 3, funcionario: 'Pedro', setor: 'Logística', titulo: 'Teste complementar', tipo: 'Teste complementar', data: '02/05/2026', prazo: 'Vencido em 02/05/2026', local: 'Laboratório MedLab', status: 'Atrasado', comprovante: '' },
  { id: 4, funcionario: 'Lucas Ferreira', setor: 'TI', titulo: 'Avaliação física ocupacional', tipo: 'Exame físico', data: '19/06/2026', prazo: 'Até 19/06/2026', local: 'Ambulatório interno', status: 'Agendado', comprovante: '' },
];
initialState.dependentesConvenio = [
  { id: 1, funcionario: 'Sarah', nome: 'João Silva', parentesco: 'Filho', cpf: '123.456.789-00', nascimento: '10/04/2020', status: 'Ativo', documentos: ['CPF', 'Certidão de nascimento', 'Comprovante de vínculo'] },
  { id: 2, funcionario: 'Lucas Ferreira', nome: 'Laura Ferreira', parentesco: 'Filha', cpf: '987.654.321-00', nascimento: '22/09/2022', status: 'Em análise', documentos: ['PDF do formulário', 'TXT do formulário', 'Comprovante de residência'] },
];
initialState.cestaFormularios = [
  { id: 1, funcionario: 'Pedro', tipo: 'Retirada', data: '09/05/2026', status: 'Esperando avaliação', protocolo: 'CB-2026-10231' },
  { id: 2, funcionario: 'Maria Eduarda', tipo: 'Entrega', data: '11/05/2026', status: 'Aprovado', protocolo: 'CB-2026-10232' },
];
initialState.farmaciaConfig = {
  nome: 'Farma Gold',
  auxilioFixo: 120,
  porcentagemSalario: 3,
  redeAceita: ['Farma Gold', 'Farmácias parceiras locais', 'Drogarias credenciadas'],
};
initialState.convenioConfig = {
  nome: 'Santa Helena Saúde',
  link: 'https://www.santahelenasaude.com.br/beneficiario/',
  planoPadrao: 'Empresarial com coparticipação',
  documentosDependente: ['CPF do dependente', 'Certidão de nascimento ou RG', 'Comprovante de vínculo', 'Comprovante de residência', 'Documento do responsável'],
};

  window.RH_DATABASE = initialState;
})();
