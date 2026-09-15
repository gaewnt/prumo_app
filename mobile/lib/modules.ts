/**
 * Fonte única de verdade dos módulos do Prumo — usada pela home (lista) e por
 * cada tela de módulo.
 *
 * A partir do redesign de hubs, a home mostra 9 grupos (não mais 16 módulos
 * soltos). Alguns grupos são "hubs" com abas por dentro, reunindo módulos que
 * antes apareciam separados — os dados e a lógica de cada um continuam
 * intactos em seu próprio `lib/<slug>.ts`, só a navegação foi agrupada:
 *
 * - Rotina agora inclui a aba Relações.
 * - Desenvolvimento Pessoal agora inclui Treino, Dieta, Beleza, Mente, Detox e Viagens.
 * - Estudos agora inclui Biblioteca.
 *
 * As rotas antigas (ex: `/modulo/treino`, `/modulo/relacoes`) continuam
 * existindo e funcionando normalmente — úteis pra link direto e pro comando
 * de voz — só não aparecem mais soltas na lista da home.
 */

export type ModuleStatus = "mapeado" | "a-definir";

export type ModuleDefinition = {
  slug: string;
  nome: string;
  icone: string; // emoji por enquanto — trocar por ícone próprio no design pass
  status: ModuleStatus;
  resumo: string;
  /** Slugs das abas internas, na ordem em que aparecem — só presente nos hubs. */
  hubOf?: string[];
  /** Exige o plano Prumo Plus — ver `lib/subscription.ts`. Ausente/false = grátis. */
  plusOnly?: boolean;
};

export const modules: ModuleDefinition[] = [
  { slug: "financas", nome: "Finanças", icone: "💰", status: "mapeado", resumo: "Contas, cartões, orçamento, metas e tags." },
  { slug: "rotina", nome: "Rotina", icone: "📅", status: "mapeado", resumo: "Hábitos diários, streaks e relações.", hubOf: ["rotina", "relacoes"] },
  { slug: "veiculo", nome: "Veículo", icone: "🚗", status: "mapeado", resumo: "Custo por km, faturamento e o Copiloto.", plusOnly: true },
  { slug: "dev-pessoal", nome: "Desenvolvimento Pessoal", icone: "✨", status: "mapeado", resumo: "Treino, dieta, beleza, mente, detox e viagens.", hubOf: ["dev-pessoal", "treino", "dieta", "beleza", "mente", "detox", "viagens"], plusOnly: true },
  { slug: "estudos", nome: "Estudos", icone: "🎓", status: "mapeado", resumo: "Matérias, sessões de estudo e biblioteca.", hubOf: ["estudos", "biblioteca"] },
  { slug: "carreira", nome: "Carreira", icone: "💼", status: "mapeado", resumo: "Metas de carreira, cursos e prazos importantes.", plusOnly: true },
  { slug: "casa", nome: "Casa", icone: "🏠", status: "mapeado", resumo: "Lista de compras e tarefas domésticas recorrentes.", plusOnly: true },
  { slug: "saude", nome: "Saúde", icone: "❤️", status: "mapeado", resumo: "Remédios com lembrete, consultas, terapias e hábitos do dia.", plusOnly: true },
  { slug: "pet", nome: "Pet", icone: "🐾", status: "mapeado", resumo: "Vacinas, consultas e cuidados de cada pet.", plusOnly: true },
];

export function getModuleBySlug(slug: string) {
  return modules.find((m) => m.slug === slug);
}
