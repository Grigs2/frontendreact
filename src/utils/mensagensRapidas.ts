/** Mensagem pronta: o título vira o título da notificação e o texto, o corpo. */
export interface MensagemRapida {
  titulo: string;
  texto: string;
}

const primeiroNome = (nome?: string | null) => (nome ?? '').trim().split(/\s+/)[0] || 'o aluno';

/**
 * Sugestões do motorista para o responsável de um aluno.
 * @param buscaEmCasa  a parada atual é a busca do aluno em casa (ida); false = entrega em casa (volta)
 * @param minutos      previsão de chegada, quando a rota está disponível
 */
export function sugestoesDoMotorista(aluno?: string | null, buscaEmCasa = true, minutos?: number | null): MensagemRapida[] {
  const nome = primeiroNome(aluno);
  const lista: MensagemRapida[] = [];
  if (minutos !== null && minutos !== undefined && minutos > 0) {
    lista.push({ titulo: 'Estou chegando', texto: `Chego em cerca de ${minutos} min.` });
  }
  if (buscaEmCasa) {
    lista.push(
      { titulo: 'Estou na porta', texto: `Estou na porta da sua casa para buscar ${nome}.` },
      { titulo: 'Pode se preparar', texto: `Estou chegando. Pode preparar ${nome} para sair.` },
    );
  } else {
    lista.push(
      { titulo: 'Estou chegando', texto: `Estou chegando com ${nome}.` },
      { titulo: 'Estou na porta', texto: `Estou na porta da sua casa com ${nome}.` },
    );
  }
  lista.push(
    { titulo: 'Vou atrasar', texto: 'Vou atrasar alguns minutos. Já estou a caminho.' },
    { titulo: 'Trânsito lento', texto: 'O trânsito está lento, mas já estou a caminho.' },
  );
  // Evita duas sugestões iguais (ex.: "Estou chegando" com e sem minutos).
  return lista.filter((m, i) => lista.findIndex((o) => o.texto === m.texto) === i);
}

/** Sugestões do responsável para o motorista. */
export function sugestoesDoResponsavel(): MensagemRapida[] {
  return [
    { titulo: 'Já estamos descendo', texto: 'Já estamos descendo.' },
    { titulo: 'Um minutinho', texto: 'Aguarde só um minutinho, por favor.' },
    { titulo: 'Vamos atrasar', texto: 'Vamos atrasar alguns minutos.' },
    { titulo: 'Estou no portão', texto: 'Estou esperando no portão.' },
    { titulo: 'Obrigado', texto: 'Obrigado!' },
  ];
}

/** Sugestões do formulário de nova mensagem, conforme o perfil de quem escreve. */
export function sugestoesDoFormulario(perfil?: string | null): MensagemRapida[] {
  if (perfil === 'MOTORISTA') {
    return [
      { titulo: 'Vou atrasar', texto: 'Vou atrasar alguns minutos. Já estou a caminho.' },
      { titulo: 'Trânsito lento', texto: 'O trânsito está lento, mas já estou a caminho.' },
      { titulo: 'Saindo agora', texto: 'Estou saindo agora para a rota.' },
    ];
  }
  if (perfil === 'RESPONSAVEL') return sugestoesDoResponsavel();
  return [];
}
