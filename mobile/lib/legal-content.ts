/**
 * Conteúdo da Política de Privacidade e dos Termos de Uso do Prumo — fonte
 * única usada pelas telas `app/(app)/privacidade.tsx` e `app/(app)/termos.tsx`
 * e pelas páginas públicas hospedadas fora do app (pra link de política de
 * privacidade na Play Store). Mudar o texto aqui mantém tudo em sincronia.
 *
 * Ver `LEGAL_VERSION` em `lib/onboarding.ts` — mudanças de conteúdo relevantes
 * (não erros de digitação) devem vir acompanhadas de um bump nessa versão,
 * pra pedir reaceite de quem já usa o app.
 */

export const LEGAL_CONTACT_EMAIL = "gaewnt@gmail.com";
export const LEGAL_LAST_UPDATED = "28 de agosto de 2026";

export type LegalSection = { title: string; body: string };

export const PRIVACY_POLICY: LegalSection[] = [
  {
    title: "Sobre este documento",
    body:
      "Esta Política de Privacidade explica, de forma transparente, como o Prumo lida com os seus dados. O Prumo é um app pessoal de organização de vida — finanças, rotina, saúde, estudos, carreira, casa, relações, pets e, agora, também veículo — desenvolvido de forma independente. Se tiver qualquer dúvida, escreva para " +
      LEGAL_CONTACT_EMAIL +
      ".",
  },
  {
    title: "1. Quais dados o Prumo coleta",
    body:
      "Pra funcionar, o Prumo guarda os dados que você mesmo cadastra em cada módulo: lançamentos financeiros, contas e cartões, hábitos e streaks da rotina, dados de saúde que você optar por registrar (remédios, consultas, terapias), matérias e sessões de estudo, metas de carreira, tarefas da casa, datas importantes de relações, dados de pets, e — no módulo Veículo — informações do seu carro/moto, custos (combustível, financiamento, seguro, IPVA) e corridas/entregas registradas manualmente ou pelo Copiloto. Também guardamos seu e-mail de cadastro, nome de exibição e foto de perfil (se você adicionar uma).",
  },
  {
    title: "2. Reconhecimento de voz",
    body:
      "Se você usar o lançamento por voz, o áudio é processado pelo serviço de reconhecimento de fala do seu próprio aparelho (Android/iOS) só pra transformar sua fala em texto — o Prumo não grava nem armazena o áudio, só o texto reconhecido é usado pra criar o lançamento.",
  },
  {
    title: "3. Cadeado biométrico",
    body:
      "Se você ativar o cadeado do app (Face ID/impressão digital), a verificação biométrica é feita inteiramente pelo sistema do seu aparelho — o Prumo nunca recebe, vê ou armazena seus dados biométricos. O app só recebe um \"sim\" ou \"não\" dizendo se a verificação passou.",
  },
  {
    title: "4. Copiloto (leitura de tela e cálculo de corridas)",
    body:
      "O módulo Veículo tem um recurso opcional chamado Copiloto, que — quando você ativa manualmente a permissão de Acessibilidade do Android pra ele — lê o conteúdo da tela enquanto você está com os apps Uber Driver, 99 Motorista, InDrive ou Rappi abertos, procurando por cartões de oferta de corrida/entrega (valor, distância, tempo estimado), pra calcular na hora quanto aquilo vale por km, por hora e por minuto, mostrando o resultado numa bolha sobre a tela. Essa leitura acontece inteiramente no seu aparelho: o texto da tela não é enviado a nenhum servidor. Só quando você opta por salvar uma corrida detectada no seu histórico, os valores calculados (não o texto bruto da tela) são guardados na sua conta. Você pode desativar o Copiloto e a permissão de Acessibilidade a qualquer momento nas configurações do Android. Por depender da leitura de outros apps, esse recurso é read-only best-effort: o Prumo não tem qualquer vínculo com Uber, 99, InDrive ou Rappi, e a precisão pode variar conforme essas telas mudam — ver também os Termos de Uso.",
  },
  {
    title: "5. Notificações",
    body:
      "Com sua permissão, o Prumo agenda lembretes locais (contas a vencer, hábitos, remédios etc.) diretamente no seu aparelho. Isso não envia dados a servidores externos além dos nossos próprios.",
  },
  {
    title: "6. Onde seus dados ficam guardados",
    body:
      "Seus dados de cadastro (tudo o que não é puramente local, como listado acima) ficam armazenados em banco de dados na nuvem operado pela Supabase, protegidos por regras de acesso que garantem que só você — autenticado com seu login — consegue ler ou alterar seus próprios dados. Não vendemos nem compartilhamos seus dados pessoais com terceiros para fins de marketing.",
  },
  {
    title: "7. Anúncios",
    body:
      "O Prumo pode exibir anúncios via Google AdMob pra ajudar a manter o app gratuito. O AdMob pode coletar identificadores do aparelho e dados de uso do app pra mostrar anúncios relevantes, conforme a própria política de privacidade do Google. Você pode gerenciar suas preferências de anúncios personalizados nas configurações de privacidade do seu Google (Configurações do Android › Google › Anúncios).",
  },
  {
    title: "8. Segurança",
    body:
      "Levamos a proteção dos seus dados a sério e usamos práticas padrão da indústria (conexões criptografadas, controle de acesso por usuário) pra mantê-los seguros. Nenhum sistema é 100% infalível, mas trabalhamos continuamente pra manter tudo protegido.",
  },
  {
    title: "9. Suas escolhas",
    body:
      "Você pode editar ou excluir qualquer lançamento a qualquer momento dentro do app. Em Configurações, é possível apagar todos os seus dados mantendo a conta (\"Começar do zero\") ou excluir a conta e todos os dados permanentemente, sem volta.",
  },
  {
    title: "10. Contato",
    body: "Dúvidas sobre esta política? Escreva pra " + LEGAL_CONTACT_EMAIL + ".",
  },
];

export const TERMS_OF_USE: LegalSection[] = [
  {
    title: "1. Aceitação dos termos",
    body:
      "Ao usar o Prumo, você concorda com estes Termos de Uso e com a Política de Privacidade. Se não concordar, não utilize o app. Esses termos podem ser atualizados; mudanças relevantes vão pedir seu reaceite na próxima vez que você abrir o app.",
  },
  {
    title: "2. O que é o Prumo",
    body:
      "O Prumo é um app pessoal de organização de vida, cobrindo finanças, rotina, veículo, desenvolvimento pessoal, estudos, carreira, casa, saúde e pets. É oferecido \"como está\", sem garantia de disponibilidade ininterrupta ou de ausência total de erros.",
  },
  {
    title: "3. Sua conta",
    body:
      "Você é responsável por manter a confidencialidade do seu login e por tudo que acontecer na sua conta. Avise-nos imediatamente se suspeitar de acesso não autorizado.",
  },
  {
    title: "4. Uso aceitável",
    body:
      "O Prumo é pra uso pessoal. Não é permitido tentar hackear, sobrecarregar, fazer engenharia reversa do app, ou usar o Copiloto pra fins diferentes de calcular o valor das suas próprias corridas.",
  },
  {
    title: "5. Copiloto — aviso importante",
    body:
      "O Copiloto lê a tela de apps de terceiros (Uber Driver, 99 Motorista, InDrive, Rappi) pra ajudar você a calcular o valor de corridas/entregas. Esse recurso não é afiliado, endossado ou aprovado por essas empresas, e o uso de ferramentas de leitura de tela pode não estar de acordo com os termos de uso de cada um desses apps — a responsabilidade por essa decisão é sua. O Prumo não garante que os valores calculados são exatos (a leitura depende do layout de tela de cada app, que muda com o tempo) e não se responsabiliza por decisões tomadas com base nesses cálculos. Use como um apoio, não como fonte única de verdade.",
  },
  {
    title: "6. Seus dados e conteúdo",
    body:
      "Os dados que você cadastra são seus. Você pode exportá-los (nas telas de Finanças e Configurações, quando disponível), apagá-los ou excluir sua conta a qualquer momento — ver Política de Privacidade.",
  },
  {
    title: "7. Anúncios e gratuidade",
    body:
      "O Prumo pode exibir anúncios via Google AdMob pra se manter gratuito. Recursos pagos futuros, se existirem, terão termos próprios apresentados antes da cobrança.",
  },
  {
    title: "8. Isenção de responsabilidade",
    body:
      "O Prumo não substitui aconselhamento financeiro, médico, jurídico ou profissional de nenhuma espécie. As informações e cálculos do app (incluindo os do módulo Veículo e do Copiloto) são apoio à sua organização pessoal, não recomendação profissional. Use seu próprio julgamento.",
  },
  {
    title: "9. Limitação de responsabilidade",
    body:
      "Na máxima medida permitida por lei, o Prumo não se responsabiliza por perdas indiretas, lucros cessantes ou danos decorrentes do uso ou da impossibilidade de uso do app, incluindo eventuais imprecisões em cálculos automáticos.",
  },
  {
    title: "10. Alterações e encerramento",
    body:
      "Podemos atualizar, modificar ou descontinuar funcionalidades do app a qualquer momento. Você pode parar de usar o Prumo e excluir sua conta quando quiser, nas Configurações.",
  },
  {
    title: "11. Lei aplicável",
    body: "Estes termos são regidos pelas leis do Brasil.",
  },
  {
    title: "12. Contato",
    body: "Dúvidas sobre estes termos? Escreva pra " + LEGAL_CONTACT_EMAIL + ".",
  },
];
