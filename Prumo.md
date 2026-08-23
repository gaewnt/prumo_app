## O que é

Prumo é um app de organização de vida pessoal — finanças, rotina, corpo, desenvolvimento pessoal e mais — pensado como concorrente direto do Core App, mas resolvendo três problemas que o Core deixa na mesa: os módulos não conversam entre si, o "toque de IA" é só cosmético, e o modelo de acesso usa fricção (trial que já cobra o ano) em vez de confiança. O nome vem do fio de prumo: o instrumento que acha o eixo vertical certo. A proposta do app é a mesma — te ajudar a achar o prumo da própria vida.

Este documento é a referência viva do projeto. Vamos atualizá-lo conforme mais decisões forem tomadas.

**Estado atual: os 16 módulos estão construídos.** Fase 0 (fundação) e Fase 1 (os 6 módulos
mapeados) concluídas e testadas. A Fase 2 (IA cruzada) foi tentada e removida do escopo por
ora — três provedores de IA (Gemini, OpenRouter, Anthropic) foram testados via Edge
Function e nenhum chegou a um resultado estável a tempo, então a decisão foi seguir sem
insights e priorizar os módulos que faltavam. Os 10 módulos que só tinham ícone + nome
(Saúde, Casa, Estudos, Beleza, Viagens, Carreira, Mente, Relações, Pet, Detox) foram
desenhados do zero como listas editáveis (grupo opcional, data opcional, título, notas,
concluído) usando um motor genérico único, em vez de mapear o Core telas a tela. Detalhes
de como rodar estão no `README.md` do pacote.

## Decisões já tomadas

| Frente | Decisão |
|---|---|
| Objetivo | Produto pra lançar publicamente, não só uso pessoal |
| Plataforma | App nativo mobile, via Expo / React Native |
| Backend | Supabase (Postgres + Auth + Storage + Realtime) |
| Acesso | Gratuito por enquanto — monetização fica pra depois de ter uso real |
| Escopo | Todos os 16 módulos do Core como referência de amplitude |
| Prioridades | Integração entre módulos, modelo de acesso justo, IA real, design & experiência, dark mode essencial |

## Diferenciais em relação ao Core

**Integração real entre módulos.** No Core, cada módulo parece isolado — a única ponte visível é a home sugerindo "que tal ler um pouco de [livro]?". No Prumo, os módulos escrevem numa camada de eventos compartilhada, e essa camada alimenta tanto o dashboard quanto os insights. Treino conectado com dieta (dias de treino sugerem ajuste de cardápio), rotina puxando hábitos que já existem em outros módulos em vez de duplicar cadastro, finanças conectada a metas de desenvolvimento pessoal.

**IA que analisa, não decora.** O Core tem um ícone de brilho (✨) no módulo de finanças sem função clara nas telas que vimos. No Prumo, um insight de verdade é gerado a partir dos dados cruzados do próprio usuário — correlações reais entre módulos, não frases genéricas.

**Acesso sem armadilha.** O funil do Core anuncia "3 dias grátis" mas cobra o plano anual completo se você não tiver cartão configurado pra bloquear a cobrança — você confirmou isso testando. O Prumo começa gratuito. Quando (e se) vier a monetizar, o modelo será transparente: aviso claro antes de qualquer cobrança, cancelamento simples.

**Dark mode como cidadão de primeira classe.** Não é um toggle que inverte cores — os dois temas são desenhados com o mesmo cuidado desde o início.

## Stack técnico

| Camada | Escolha | Por quê |
|---|---|---|
| App | Expo (React Native) + TypeScript + Expo Router | Um código pra Android e iOS, testável no celular via Expo Go sem compilar nativo a cada mudança |
| Estado local / UI | Zustand | Leve, sem boilerplate, bom pra estado de tema, sessão, preferências |
| Dados remotos | TanStack Query sobre Supabase | Cache, sincronização e revalidação automática entre telas e módulos |
| Backend | Supabase (Postgres, Auth, Storage, Realtime, Edge Functions) | Open source, tier gratuito generoso, dados relacionais — essencial pra cruzar informação entre módulos |
| IA | API da Anthropic (Claude), chamada só a partir de uma Edge Function | Nunca client-side, protege a chave de API e permite mandar apenas dados agregados, não brutos |
| Notificações | Expo Notifications | Push nativo integrado ao Expo, sem serviço extra |

## Arquitetura em alto nível

Dois projetos versionados juntos: o app Expo e o projeto Supabase (migrations SQL + Edge Functions).

Cada usuário tem seus dados isolados por Row Level Security no Postgres — ninguém acessa dado de outra pessoa mesmo com a mesma API pública. Cada módulo grava numa tabela própria (`transactions`, `habit_logs`, `workout_logs` etc) e, em paralelo, numa tabela central `module_events` (tipo de evento, módulo de origem, timestamp, payload resumido). Essa tabela central é o que a Edge Function de IA lê pra gerar insights cruzados, e também é o que popula as "pendências de hoje" da home sem cada módulo precisar saber dos outros.

## Modelo de dados — núcleo

- `users` — perfil, tema preferido, horário de notificação, módulos ativos
- `module_events` — camada compartilhada de eventos entre módulos (a peça central da integração)
- `ai_insights` — cache dos insights gerados, pra não reprocessar toda vez que a home abre
- Tabelas por módulo (`habits` / `habit_logs`, `transactions` / `bills`, `workouts` / `exercises`, `meals` / `meal_plans`, `books` / `reading_logs`, `goals` / `journal_entries`, `mood_logs` — uma por módulo conforme for sendo construído)

## Os 16 módulos

Seis módulos foram mapeados em detalhe a partir das telas do Core que você mandou, com
tabela própria cada. Os outros dez não tinham nenhuma tela do Core pra referência — foram
desenhados do zero como listas editáveis simples (grupo opcional, data opcional, título,
notas, concluído), todos rodando sobre a mesma tabela genérica (`simple_module_items`).

| Módulo | Status | Funções | Melhoria proposta no Prumo |
|---|---|---|---|
| Finanças | Mapeado (tabela própria) | Dashboard (receitas, despesas, saldo, investimentos), alertas de conta a vencer, gastos por categoria, receitas vs despesas | Alertas cruzados com outros módulos (ex: gasto de delivery em dias sem treino registrado) |
| Rotina | Mapeado (tabela própria) | Hábitos diários em tabela semanal, streak com heatmap, rotina com horário de início | Hábitos puxados automaticamente de outros módulos em vez de recadastrar (treinar já marcado se o treino do dia foi concluído) |
| Treino | Mapeado (tabela própria) | Treino do dia com séries/reps/carga, checklist de conclusão | Sugestão de ajuste no cardápio do dia baseada no treino feito |
| Dieta | Mapeado (tabela própria) | Cardápio semanal editável, refeições configuráveis, copiar/limpar dia | Lista de compras gerada automaticamente a partir do cardápio da semana |
| Biblioteca | Mapeado (tabela própria) | Progresso de leitura, projeção de data de término por ritmo de páginas/dia | Correlação com o módulo de humor (ex: leitura cai quando o score de humor cai) |
| Dev. Pessoal | Mapeado (tabela própria) | Frase do dia, lista de motivações pessoais | Diário e metas conectados ao insight de IA — motivação vira contexto pros outros módulos |
| Saúde | Construído (lista genérica) | Itens com data — exames, consultas, remédios | Promover pra tabela própria se precisar de mais estrutura (ex: histórico por exame) |
| Casa | Construído (lista genérica) | Itens sem grupo/data — tarefas domésticas | — |
| Estudos | Construído (lista genérica) | Itens agrupados por matéria, com prazo | — |
| Beleza | Construído (lista genérica) | Itens sem grupo/data — rotina de cuidados | — |
| Viagens | Construído (lista genérica) | Itens agrupados por viagem, com data | — |
| Carreira | Construído (lista genérica) | Itens com prazo — metas, cursos | — |
| Mente | Construído (lista genérica) | Itens sem grupo/data — mindfulness, meditação, terapia | — |
| Relações | Construído (lista genérica) | Itens agrupados por pessoa, com data importante | — |
| Pet | Construído (lista genérica) | Itens agrupados por pet, com data — vacinas, consultas | — |
| Detox | Construído (lista genérica) | Itens sem grupo/data — hábitos a reduzir | — |

A IA cruzada (Fase 2) foi tentada com três provedores (Gemini, OpenRouter, Anthropic) e
removida do escopo — nenhum chegou a um resultado estável a tempo. Fica como possibilidade
pra retomar mais adiante, mas não é mais um bloqueador pro resto do produto.

## Home / Dashboard

Mantém o que funciona no Core — saudação personalizada, score do dia com streak, ações rápidas, pendências agregadas — mas troca a sugestão contextual fixa por um insight real gerado pela camada de IA, com explicação de por que aquele insight apareceu (não uma frase solta).

## Onboarding

O quiz adaptativo do Core (pergunta a área mais "fora de controle" e ramifica a partir dali) é uma boa prática de personalização e vale manter. O que muda: sem paywall no fim do fluxo. Como o Prumo começa gratuito, o onboarding termina te levando direto pro app funcionando, sem tela de assinatura escondida atrás de um trial.

## IA real — como funciona na prática

Uma Edge Function do Supabase lê os últimos eventos de `module_events` do usuário (agregados, não dados brutos linha a linha), monta um resumo, e manda pra API da Anthropic pedindo correlações entre módulos. O resultado fica em cache em `ai_insights` e é regenerado no máximo uma vez por dia (ou sob demanda, se o usuário pedir). Exemplos do tipo de insight que a integração entre módulos permite: relação entre dias de treino e gasto com delivery, relação entre semanas de leitura baixa e score de humor baixo, relação entre hábito de dormir cedo e consistência no treino do dia seguinte.

## Design e dark mode

Identidade visual pensada em torno do conceito de prumo — instrumento de precisão, não "grade colorida de 16 ícones" como no Core. Paleta com uma base neutra (grafite/quase-preto) e um único accent forte, cores semânticas (vencendo hoje, concluído, atrasado) tratadas à parte do accent principal. Dark mode desenhado junto com o tema claro desde a primeira tela, não como inversão automática de cor.

## Roadmap por fases

**Fase 0 — Fundação. ✅ Concluída.** Projeto Expo + Supabase configurados, autenticação, design system com os dois temas, navegação entre módulos, home vazia funcionando.

**Fase 1 — Módulos vitais. ✅ Concluída.** Os seis módulos já mapeados: Rotina, Finanças, Treino, Dieta, Biblioteca, Dev. Pessoal. São os que geram dado todo dia e já têm especificação clara.

**Fase 2 — IA cruzada. ⏸ Tentada e pausada.** Chegou a ser implementada (Edge Function +
três provedores de IA testados), mas nenhum chegou a um resultado estável a tempo. Removida
do app por ora pra não travar o resto do produto — pode ser retomada no futuro.

**Fase 3 — Módulos restantes. ✅ Concluída.** Os dez módulos "a definir" foram desenhados
do zero como listas editáveis simples, rodando sobre um motor genérico único em vez de
mapear o Core tela a tela.

**Fase 4 — Polish e decisão de monetização.** Notificações push reais, testes com uso real, e só então decidir se e como monetizar.

## Próximos passos

Três decisões abrem o caminho pra começar a construir de fato:

1. Paleta e identidade visual do Prumo — posso propor um primeiro conceito visual pra você reagir.
2. O que fazer com os dez módulos não mapeados — mandar mais telas do Core, ou desenhar do zero como diferencial.
3. Setup do repositório Expo + projeto Supabase, pra Fase 0 começar a sair do papel.
