# Prumo

Este repositório tem duas partes:

- `mobile/` — o app Expo (React Native + TypeScript). É o que você abre no celular.
- `supabase/` — o schema do banco (migrations SQL) que roda no seu projeto Supabase.
- `Prumo.md` — a especificação completa do produto: visão, diferenciais em relação ao Core App, stack, os 16 módulos e o roadmap por fases. Comece por ali se quiser o contexto todo.

Este pacote entrega os **16 módulos completos**: os 6 mapeados a partir do Core App (Finanças, Rotina, Treino, Dieta, Biblioteca, Dev. Pessoal) e os outros 10 (Saúde, Casa, Estudos, Beleza, Viagens, Carreira, Mente, Relações, Pet, Detox), construídos como listas editáveis com o motor genérico descrito na seção 4.

## 1. Criar o projeto no Supabase

1. Crie uma conta e um projeto em [supabase.com](https://supabase.com) (o plano gratuito cobre essa fase).
2. Abra **SQL Editor** no painel do projeto e rode, **nesta ordem**, o conteúdo de cada arquivo em `supabase/migrations/`: `0001_core_schema.sql`, `0002_bills_paid_amount.sql`, `0003_investments.sql` e `0004_extra_modules.sql`. Isso cria todas as tabelas, os índices e as políticas de segurança (cada pessoa só acessa os próprios dados).
   - Se preferir usar a CLI do Supabase em vez de colar no editor: `supabase link` e depois `supabase db push` dentro da pasta `supabase/`.
3. Em **Project Settings → API**, copie a **Project URL** e a chave **anon public**.
4. Em **Authentication → Providers**, confirme que "Email" está ativado (vem ativado por padrão). Se quiser pular a confirmação por e-mail durante os testes, desative "Confirm email" em **Authentication → Email**.

Essa migration já inclui um gatilho (`handle_new_user`) que, toda vez que alguém se cadastra, cria o perfil e ativa os 16 módulos automaticamente — testado localmente antes da entrega.

## 2. Rodar o app

```bash
cd mobile
cp .env.example .env
# edite .env com a URL e a chave anon do seu projeto Supabase

npm install
npm start
```

Isso abre o Metro Bundler com um QR code. Com o app **Expo Go** instalado no celular (Android ou iOS), escaneie o código e o Prumo abre direto no seu aparelho — sem precisar compilar nada nativo. Também dá pra rodar `npm run web` pra testar no navegador enquanto não tiver o celular à mão.

> **Nota sobre a versão do Expo:** o projeto está fixado no **Expo SDK 54**. Não é escolha de gosto: em 21/08/2026 a Expo mudou a política do Expo Go e só o SDK 54 continua garantido tanto na App Store quanto na Play Store (confirmado em [expo.dev/changelog/expo-go-and-app-store-may-2026](https://expo.dev/changelog/expo-go-and-app-store-may-2026) e [expo.dev/changelog/sdk-56](https://expo.dev/changelog/sdk-56)). SDK 56 e 57 só rodam via `eas go`/build customizado, não pelo Expo Go instalado normalmente. Antes de atualizar o SDK, confira a política atual em [expo.dev/changelog](https://expo.dev/changelog) (procure posts com "Expo Go" no título) — ela muda com frequência.

## 3. O que já funciona

- Cadastro e login por e-mail/senha (Supabase Auth).
- Tema claro/escuro/automático, com paleta própria do Prumo (ver `mobile/lib/theme/tokens.ts`).
- Home com a grade dos 16 módulos.
- Os 6 módulos mapeados (Finanças, Rotina, Treino, Dieta, Biblioteca, Dev. Pessoal), cada
  um com criação, edição e exclusão de tudo que ele guarda.
- Os outros 10 módulos (Saúde, Casa, Estudos, Beleza, Viagens, Carreira, Mente, Relações,
  Pet, Detox), como listas editáveis — ver seção 4.

## 4. Os 10 módulos "simples"

Saúde, Casa, Estudos, Beleza, Viagens, Carreira, Mente, Relações, Pet e Detox usam o mesmo
motor por baixo: uma única tabela (`simple_module_items`, migration
`0004_extra_modules.sql`) e um único conjunto de telas genérico
(`mobile/components/simple-list/`), configurado por módulo em cada arquivo de
`mobile/app/(app)/modulo/<slug>.tsx` — só passando o rótulo do "grupo" (ex: "Matéria" em
Estudos, "Pet" em Pet) e da data, quando fizer sentido pro módulo.

Cada item tem título, notas, uma data opcional, um "grupo" opcional (ex: qual pet, qual
viagem) e pode ser marcado como feito, editado ou excluído — sem precisar de uma tabela
nova por módulo.

Se algum desses módulos precisar de um comportamento bem mais específico no futuro (ex:
Pet com carteira de vacinação por animal), dá pra "promovê-lo": criar uma tabela própria e
trocar só o arquivo de tela desse módulo, sem mexer nos outros nove.

## 5. Próximos passos técnicos

- Sem pendência de IA no momento — o projeto segue 100% funcional sem insights cruzados.
- Dieta e Dev. Pessoal ainda gravam eventos básicos em `module_events`
  (`meal_item_added`, `mood_logged`, `goal_completed`); a tabela continua existindo pra uso
  futuro, mas hoje não tem nenhum consumidor.

Detalhes de cada decisão (por que Expo, por que Supabase, por que esse modelo de dados) estão em `Prumo.md`.
