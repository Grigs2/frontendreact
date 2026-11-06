/**
 * Termos de Uso e Política de Privacidade do Tio da Perua.
 *
 * O texto descreve o que o sistema realmente coleta e faz (backend Grigs2/BackEndJava,
 * branch test/exec_swagger_postman). Ao mudar o conteúdo, aumente TERMS_VERSION e
 * configure a mesma versão no backend (variável TERMS_VERSION), que grava em
 * usuario.termos_versao / termos_aceitos_em o aceite feito no cadastro.
 *
 * PENDENTE antes da publicação: definir o e-mail oficial de contato de privacidade
 * (CONTATO_PRIVACIDADE) e revisar o texto com a orientação do projeto.
 */

export const TERMS_VERSION = '1.0';
export const TERMS_UPDATED_AT = '04/11/2026';
export const CONTATO_PRIVACIDADE = '[definir e-mail de contato de privacidade]';

export interface TermsSection {
  title: string;
  paragraphs?: string[];
  items?: string[];
}

export const TERMS_INTRO =
  'Este documento explica as regras de uso do aplicativo Tio da Perua e como tratamos os seus dados pessoais e os dos alunos transportados, conforme a Lei Geral de Proteção de Dados Pessoais (Lei nº 13.709/2018 – LGPD). Leia com atenção: para criar uma conta é preciso declarar que você leu e aceita estes termos.';

export const TERMS_SECTIONS: TermsSection[] = [
  {
    title: '1. Sobre o Tio da Perua',
    paragraphs: [
      'O Tio da Perua é uma plataforma desenvolvida como projeto acadêmico da FATEC Ipiranga (Laboratório de Engenharia de Software) para organizar o transporte escolar: cadastro de motoristas, responsáveis, escolas e alunos; montagem de viagens; registro de embarque e desembarque; acompanhamento da viagem e envio de avisos.',
      'Os responsáveis pelo tratamento dos dados são os integrantes da equipe do projeto. Dúvidas e pedidos sobre privacidade podem ser enviados para: ' + CONTATO_PRIVACIDADE + '.',
    ],
  },
  {
    title: '2. Quem pode usar',
    items: [
      'Motoristas de transporte escolar, responsáveis por alunos e escolas, sempre por pessoa maior de 18 anos.',
      'Cada conta tem um único perfil (motorista, responsável ou escola). Uma mesma conta não pode ser motorista e responsável ao mesmo tempo.',
      'Crianças e adolescentes não criam conta: os dados deles são cadastrados e gerenciados pelo responsável legal.',
    ],
  },
  {
    title: '3. Dados que coletamos',
    items: [
      'Conta e acesso: e-mail, senha (guardada apenas em formato criptografado, que não pode ser revertido), telefone e tipo de perfil.',
      'Dados pessoais: nome completo, CPF e data de nascimento (motorista e responsável); nome, CNPJ e administrador responsável (escola).',
      'Endereço: CEP, logradouro, número, complemento, bairro, cidade e UF.',
      'Motorista: CNH, documentos enviados para validação e dados do veículo (modelo, placa, ano e capacidade).',
      'Alunos (dependentes): nome, CPF, data de nascimento, escola, período e endereços de embarque e desembarque, informados pelo responsável.',
      'Uso do transporte: viagens, solicitações e convites, ordem das paradas e registros de embarque e desembarque com data e horário.',
      'Localização: posição do veículo durante uma viagem em andamento, somente com consentimento (veja o item 5).',
      'Comunicação e segurança: avisos e notificações trocados no aplicativo e registros técnicos de acesso e de ações importantes (auditoria).',
    ],
  },
  {
    title: '4. Para que usamos os dados',
    items: [
      'Criar e manter sua conta, confirmar sua identidade e permitir o login.',
      'Ligar alunos, responsáveis, motoristas e escolas e organizar as viagens.',
      'Registrar presença e informar ao responsável o status do aluno (aguardando, embarcado, a caminho, entregue).',
      'Enviar avisos sobre a viagem e e-mails de recuperação de senha.',
      'Prevenir fraudes e acessos indevidos e manter registros exigidos para auditoria.',
      'Nunca vendemos seus dados nem os usamos para publicidade.',
    ],
  },
  {
    title: '5. Localização durante a viagem',
    paragraphs: [
      'A localização do veículo só é compartilhada durante uma viagem em andamento e depende de consentimento separado: do motorista, para enviar a posição, e do responsável, para cada aluno acompanhado. O consentimento pode ser retirado a qualquer momento no aplicativo.',
      'O histórico de posições de cada viagem é guardado por até 7 dias e depois é apagado. O registro de quando o consentimento foi dado ou retirado é mantido por até 1 ano, para comprovação.',
    ],
  },
  {
    title: '6. Dados de crianças e adolescentes',
    paragraphs: [
      'Os dados dos alunos são tratados no melhor interesse deles (art. 14 da LGPD), com o consentimento do responsável legal que faz o cadastro, e apenas para a finalidade do transporte escolar. Só veem esses dados os responsáveis vinculados ao aluno, o motorista da viagem em que ele está e a escola relacionada.',
    ],
  },
  {
    title: '7. Com quem compartilhamos',
    items: [
      'Entre os próprios usuários, apenas o necessário: o responsável vê dados do motorista e da viagem; o motorista vê os alunos da sua viagem; a escola vê os vínculos com ela.',
      'Serviço de e-mail (SendGrid): recebe seu e-mail para enviar o link de redefinição de senha.',
      'Consulta de CEP (ViaCEP): recebe apenas o CEP digitado, para preencher o endereço automaticamente.',
      'Autoridades públicas, somente quando houver obrigação legal ou ordem judicial.',
    ],
  },
  {
    title: '8. Por quanto tempo guardamos',
    items: [
      'Dados da conta: enquanto ela estiver ativa. Após o pedido de exclusão, eles são eliminados, exceto o que a lei exige guardar.',
      'Histórico de localização: até 7 dias.',
      'Sessões de acesso: até 30 dias sem uso. Links de redefinição de senha valem por tempo limitado e são usados uma única vez.',
      'Registros de auditoria e de consentimento: até 1 ano.',
    ],
  },
  {
    title: '9. Segurança',
    paragraphs: [
      'Usamos conexão autenticada por token com validade curta, senhas criptografadas, controle de acesso por perfil e registro das ações sensíveis. Nenhum sistema é totalmente imune a falhas; se ocorrer um incidente que possa trazer risco a você, avisaremos e tomaremos as medidas previstas na LGPD.',
      'Você é responsável por manter sua senha em sigilo e por sair da conta em aparelhos compartilhados.',
    ],
  },
  {
    title: '10. Seus direitos',
    paragraphs: ['Pelo art. 18 da LGPD, você pode, a qualquer momento:'],
    items: [
      'Confirmar se tratamos seus dados e acessar uma cópia deles.',
      'Corrigir dados incompletos ou desatualizados (pelo seu perfil no aplicativo ou pelo contato de privacidade).',
      'Pedir a anonimização, o bloqueio ou a exclusão de dados desnecessários.',
      'Pedir a portabilidade dos dados e saber com quem eles foram compartilhados.',
      'Retirar o consentimento, ciente de que algumas funções deixam de funcionar sem ele.',
      'Reclamar à Autoridade Nacional de Proteção de Dados (ANPD).',
    ],
  },
  {
    title: '11. Regras de uso',
    items: [
      'Informe dados verdadeiros e mantenha-os atualizados.',
      'Use o aplicativo apenas para o transporte escolar. É proibido acessar dados de alunos sem vínculo com eles.',
      'O motorista não deve operar o aplicativo enquanto dirige.',
      'O Tio da Perua apoia a organização do transporte, mas não substitui as obrigações legais do motorista nem da escola, nem a fiscalização dos órgãos de trânsito.',
      'Contas que violarem estas regras podem ser suspensas pela administração.',
    ],
  },
  {
    title: '12. Alterações destes termos',
    paragraphs: [
      'Se estes termos mudarem, a nova versão será exibida no aplicativo e, quando a mudança for relevante, pediremos um novo aceite.',
    ],
  },
];
