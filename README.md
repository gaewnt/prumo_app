# Prumo

Este repositório tem duas partes:

- `mobile/` — o app Expo (React Native + TypeScript). É o que você abre no celular ou no navegador.
- `supabase/` — o schema do banco (migrations SQL) e as Edge Functions que rodam no seu projeto Supabase.
- `Prumo.md` — a especificação completa do produto: visão, diferenciais em relação ao Core App, stack e roadmap por fases. Comece por ali se quiser o contexto todo.

## 1. Criar o projeto no Supabase

1. Crie uma conta e um projeto em [supabase.com](https://supabase.com) (o plano gratuito cobre essa fase).
2. Abra **SQL Editor** no painel do projeto e rode, **nesta ordem**, o conteúdo de cada arquivo em `supabase/migrations/` (são numerados de `0001` a `0025` — rode todos, na ordem numérica). Isso cria todas as tabelas, os índices e as políticas de segurança (cada pessoa só acessa os próprios dados).
   - Se preferir usar a CLI do Supabase em vez de colar no editor: `supabase link` e depois `supabase db push` dentro da pasta `supabase/`.
   - A migration `0025_web_push_cron.sql` precisa que você troque dois marcadores (`COLOQUE_AQUI_SUA_PROJECT_REF` e `COLOQUE_AQUI_SUA_SERVICE_ROLE_KEY`) pelos valores do seu projeto antes de rodar — os comentários no início do arquivo explicam onde achar cada um.
3. Em **Project Settings → API**, copie a **Project URL** e a chave **anon public** (ou, em painéis mais novos, a chave **publishable**).
4. Em **Authentication → Providers**, confirme que "Email" está ativado (vem ativado por padrão). Se quiser pular a confirmação por e-mail durante os testes, desative "Confirm email" em **Authentication → Email**.
5. Se for usar o lembrete diário via Web Push na versão site, publique a Edge Function `supabase/functions/send-web-push` (`supabase functions deploy send-web-push`) e configure as secrets `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` e, opcionalmente, `VAPID_SUBJECT` (`supabase secrets set`).

A primeira migration já inclui um gatilho (`handle_new_user`) que, toda vez que alguém se cadastra, cria o perfil e ativa os módulos automaticamente.

## 2. Rodar o app

```bash
cd mobile
cp .env.example .env
# edite .env com a URL e a chave anon/publishable do seu projeto Supabase

npm install
npm start
```

Isso abre o Metro Bundler com um QR code. Com o app **Expo Go** instalado no celular (Android ou iOS), escaneie o código e o Prumo abre direto no seu aparelho — sem precisar compilar nada nativo. Também dá pra rodar `npm run web` pra testar no navegador enquanto não tiver o celular à mão.

> **Nota sobre a versão do Expo:** o projeto está fixado numa versão específica do Expo SDK por causa da política de compatibilidade do Expo Go nas lojas de app, que muda com frequência. Veja `mobile/AGENTS.md` (não versionado neste repositório — fica só localmente) ou confira a política atual em [expo.dev/changelog](https://expo.dev/changelog) antes de atualizar o SDK.

## 3. O que já funciona

- Cadastro e login por e-mail/senha (Supabase Auth), com bloqueio opcional por biometria.
- Tema claro/escuro/automático, com paleta própria do Prumo (ver `mobile/lib/theme/tokens.ts`).
- Home organizada em 9 grupos (alguns são "hubs" com abas por dentro, reunindo módulos relacionados — ver `mobile/lib/modules.ts`), cobrindo 17 módulos ao todo: Finanças, Rotina, Relações, Veículo (com o Copiloto de corridas por app), Desenvolvimento Pessoal (Treino, Dieta, Beleza, Mente, Detox, Viagens), Estudos (com Biblioteca), Carreira, Casa, Saúde e Pet.
- Finanças: contas, cartões, orçamento por categoria, metas, tags, histórico de lançamentos por conta (com edição e exclusão), contas a pagar com vínculo à conta usada no pagamento, investimentos e gráficos.
- Veículo/Copiloto: registro de corridas, abastecimento e manutenção, cálculo de custo por km e faturamento, sincronizado automaticamente com Finanças.
- Estudos: grade de aulas recorrentes com marcação de presença (inclusive retroativa) e sessões de estudo por matéria.
- Notificações push nativas (Expo Notifications) no app instalado e Web Push (RFC 8291/8292, sem dependências externas) na versão site, com lembrete diário configurável em Perfil.
- Perfil editável (nome de exibição, avatar por enquanto não incluído) e termos/privacidade.
- Os módulos "listas simples" (Beleza, Viagens, Carreira, Mente, Pet, Detox, Casa, etc.) rodam sobre um motor genérico único (`mobile/components/simple-list/` + tabela `simple_module_items`), configurado por módulo em cada arquivo de `mobile/app/(app)/modulo/<slug>.tsx`.

## 4. Próximos passos técnicos

- Existe uma Edge Function de insights cruzados entre módulos (`supabase/functions/ai-insights/`, chamando um provedor de LLM configurável) e uma camada de acesso pronta em `mobile/lib/insights.ts`, mas essa frente ainda não está conectada a nenhuma tela — fica como possibilidade pra retomar mais adiante (ver `Prumo.md`, Fase 2).
- `module_events` é a tabela central de eventos entre módulos, pensada pra alimentar tanto as pendências da home quanto uma futura camada de insights.

Detalhes de cada decisão de produto (por que Expo, por que Supabase, por que esse modelo de dados) estão em `Prumo.md`.
