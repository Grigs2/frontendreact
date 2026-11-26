import React, { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Button } from './ui';
import { AppRole } from '../services/authService';
import { colors, layout, maxFontSizeMultiplier, spacing, typography } from '../theme';

interface Pergunta {
  pergunta: string;
  resposta: string;
}

/** Perguntas comuns a todos os perfis. */
const COMUNS: Pergunta[] = [
  {
    pergunta: 'Como recebo os avisos do aplicativo?',
    resposta:
      'Os avisos ficam no sino, no topo das telas, e também chegam como notificação no celular. Para recebê-los fora do aplicativo, permita as notificações nas configurações do aparelho.',
  },
  {
    pergunta: 'Esqueci minha senha. O que faço?',
    resposta: 'Na tela de login, toque em "Esqueci minha senha". Você recebe um código por e-mail e cria uma nova senha.',
  },
  {
    pergunta: 'Como corrijo um dado bloqueado ou encerro minha conta?',
    resposta:
      'Os dados que podem ser alterados ficam no Perfil. Para corrigir um dado bloqueado, como CPF ou CNPJ, ou pedir o encerramento da conta, fale com o administrador do Tio da Perua.',
  },
  {
    pergunta: 'Onde leio os Termos de Uso e a Política de Privacidade?',
    resposta: 'No Perfil, em "Termos e privacidade". Por lá também é possível baixar o PDF.',
  },
];

const POR_PERFIL: Record<AppRole, Pergunta[]> = {
  MOTORISTA: [
    {
      pergunta: 'Como coloco um aluno na minha viagem?',
      resposta:
        'Em Vínculos, toque em "Buscar alunos" e envie o convite. O aluno só entra na viagem depois que o responsável aceitar. Pedidos de vaga feitos pelos responsáveis aparecem na aba "Pedidos". Convites e pedidos têm 3 dias para resposta.',
    },
    {
      pergunta: 'Onde vejo os alunos ativos e os vínculos encerrados?',
      resposta:
        'Em Vínculos. A aba "Ativos" mostra os alunos que estão nas suas viagens, e a aba "Encerrados" mostra pedidos e convites recusados ou expirados e transportes encerrados.',
    },
    {
      pergunta: 'Por que não consigo iniciar a viagem?',
      resposta:
        'Antes de iniciar, o aplicativo mostra o que falta: veículo cadastrado, alunos dentro da capacidade, endereços com CEP validado e ao menos um aluno na viagem. Documentos pendentes aparecem como aviso e não impedem o início.',
    },
    {
      pergunta: 'Como envio meus documentos?',
      resposta:
        'No Perfil, em Documentos, informe o número e a validade e envie as fotos: frente e verso da CNH e do licenciamento e uma foto da vistoria, em JPEG ou PNG de até 1 MB. A CNH e o RENAVAM são conferidos pelos dígitos verificadores, e um número inválido não é aceito. O administrador revisa e aprova.',
    },
    {
      pergunta: 'Posso mudar o nome, o horário ou as escolas da viagem?',
      resposta:
        'Sim, pela engrenagem nos detalhes da viagem. O nome pode ser trocado a qualquer momento. O horário só muda enquanto a viagem do dia está planejada, e não é possível adicionar escolas com a viagem do dia já iniciada.',
    },
    {
      pergunta: 'O que acontece se a internet cair durante a viagem?',
      resposta:
        'Embarque, desembarque e falta continuam sendo registrados. Eles ficam guardados no celular e são enviados na mesma ordem quando a conexão voltar. A localização não é guardada para envio posterior.',
    },
    {
      pergunta: 'Por que não consigo salvar a ordem das paradas?',
      resposta:
        'Cada aluno precisa embarcar antes de desembarcar. Por isso, a escola não pode vir antes do embarque de todos os alunos na ida, nem a casa antes da escola na volta.',
    },
  ],
  RESPONSAVEL: [
    {
      pergunta: 'Como coloco meu filho em uma viagem?',
      resposta:
        'Em Motoristas, procure por proximidade ou pelo nome e toque em "Pedir vaga". Se um motorista convidar seu filho, o convite aparece em Vínculos para você aceitar ou recusar em até 3 dias.',
    },
    {
      pergunta: 'Como acompanho a viagem no mapa?',
      resposta:
        'No Início, toque no cartão do aluno e em "Acompanhar viagem". Na primeira vez, autorize o compartilhamento da localização. Você vê o veículo, a próxima parada e a previsão de chegada.',
    },
    {
      pergunta: 'Como aviso que meu filho não vai no transporte?',
      resposta: 'No cartão do aluno, use "Avisar falta" e escolha a data (de hoje até 60 dias) e se é na ida, na volta ou nas duas.',
    },
    {
      pergunta: 'Como falo com o motorista?',
      resposta: 'No acompanhamento da viagem, envie uma mensagem rápida. Há sugestões prontas, como avisar atraso.',
    },
    {
      pergunta: 'Como encerro o transporte do meu filho?',
      resposta: 'Em Vínculos, na aba "Ativos", toque em "Encerrar transporte". Para voltar, é preciso um novo convite ou pedido de vaga.',
    },
    {
      pergunta: 'Outra pessoa da família pode acompanhar o aluno?',
      resposta: 'Sim. Em Alunos, abra os detalhes do aluno e convide outro responsável. Ele recebe o convite e passa a acompanhar após aceitar.',
    },
  ],
  ESCOLA: [
    {
      pergunta: 'Como aprovo um motorista?',
      resposta: 'Em Motoristas, abra o pedido de vínculo e toque em aprovar. Pelo mesmo lugar é possível suspender, reativar ou encerrar o vínculo.',
    },
    {
      pergunta: 'O que acontece quando suspendo ou encerro um vínculo?',
      resposta:
        'A escola sai das viagens do motorista, os alunos da escola saem dos dias ainda planejados, e os pedidos em aberto são recusados com aviso aos responsáveis. Viagens já iniciadas não mudam.',
    },
    {
      pergunta: 'Onde vejo os avisos da escola?',
      resposta: 'Em Avisos, ou pelo sino no topo das telas.',
    },
  ],
  ADMIN: [
    {
      pergunta: 'Como reviso os documentos dos motoristas?',
      resposta:
        'Em Documentos, cada documento mostra as conferências automáticas e as fotos enviadas. Documento vencido, sem validade ou sem as fotos obrigatórias não pode ser aprovado. Ao recusar, informe o motivo.',
    },
    {
      pergunta: 'Como suspendo ou reativo uma conta?',
      resposta: 'Em Contas, pesquise o usuário e use suspender ou reativar.',
    },
    {
      pergunta: 'Onde ficam registradas as ações administrativas?',
      resposta: 'Em Auditoria, com o autor, a ação e a data e hora.',
    },
  ],
};

const TITULO_PERFIL: Record<AppRole, string> = {
  MOTORISTA: 'Para motoristas',
  RESPONSAVEL: 'Para responsáveis',
  ESCOLA: 'Para escolas',
  ADMIN: 'Para administradores',
};

interface AjudaModalProps {
  visible: boolean;
  role: AppRole | null | undefined;
  onClose: () => void;
}

/** Ajuda: perguntas e respostas do perfil do usuário e as comuns a todos, em um pop-up. */
export default function AjudaModal({ visible, role, onClose }: AjudaModalProps) {
  const [aberta, setAberta] = useState<string | null>(null);

  useEffect(() => {
    if (visible) setAberta(null);
  }, [visible]);

  const perfil = role ?? 'RESPONSAVEL';
  const grupos: { titulo: string; itens: Pergunta[] }[] = [
    { titulo: TITULO_PERFIL[perfil], itens: POR_PERFIL[perfil] },
    { titulo: 'Para todos', itens: COMUNS },
  ];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.content} accessibilityViewIsModal>
          <Text style={styles.title} accessibilityRole="header" maxFontSizeMultiplier={maxFontSizeMultiplier}>
            Ajuda
          </Text>
          <Text style={styles.subtitle} maxFontSizeMultiplier={maxFontSizeMultiplier}>
            Toque em uma pergunta para ver a resposta.
          </Text>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.lista}>
            {grupos.map((grupo) => (
              <View key={grupo.titulo}>
                <Text style={styles.secao} accessibilityRole="header" maxFontSizeMultiplier={maxFontSizeMultiplier}>
                  {grupo.titulo}
                </Text>
                {grupo.itens.map((item) => {
                  const chave = `${grupo.titulo}:${item.pergunta}`;
                  const expandida = aberta === chave;
                  return (
                    <View key={chave} style={styles.item}>
                      <Pressable
                        onPress={() => setAberta(expandida ? null : chave)}
                        accessibilityRole="button"
                        accessibilityState={{ expanded: expandida }}
                        accessibilityLabel={item.pergunta}
                        style={styles.pergunta}
                      >
                        <Text style={styles.perguntaTexto} maxFontSizeMultiplier={maxFontSizeMultiplier}>{item.pergunta}</Text>
                        <Feather name={expandida ? 'chevron-up' : 'chevron-down'} size={layout.icon} color={colors.slate500} />
                      </Pressable>
                      {expandida && (
                        <Text style={styles.resposta} maxFontSizeMultiplier={maxFontSizeMultiplier}>{item.resposta}</Text>
                      )}
                    </View>
                  );
                })}
              </View>
            ))}
          </ScrollView>

          <View style={styles.fechar}>
            <Button label="Fechar" variant="tertiary" onPress={onClose} fullWidth />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'center', alignItems: 'center', padding: layout.screenMargin },
  content: { backgroundColor: colors.surface, borderRadius: 24, padding: spacing.xl, width: '100%', maxWidth: 480, maxHeight: '90%' },
  title: { ...typography.heading, color: colors.ink },
  subtitle: { ...typography.caption, color: colors.slate500, marginTop: spacing.xs, marginBottom: spacing.md },
  lista: { paddingBottom: spacing.sm },
  secao: { ...typography.caption, color: colors.slate500, marginTop: spacing.md, marginBottom: spacing.xs },
  item: { borderBottomWidth: 1, borderBottomColor: colors.border },
  pergunta: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.md, minHeight: 48 },
  perguntaTexto: { ...typography.label, color: colors.ink, flex: 1 },
  resposta: { ...typography.body, color: colors.ink, paddingBottom: spacing.md },
  fechar: { marginTop: spacing.lg },
});
