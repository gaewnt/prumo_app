/**
 * Fonte única de verdade dos 16 módulos do Prumo — usada pela home (grade)
 * e por cada tela de módulo. Os 6 primeiros têm tabela própria (Fase 1);
 * os outros 10 usam o motor genérico de lista simples (ver
 * `mobile/lib/simple-list.ts` e `mobile/components/simple-list/`).
 */

export type ModuleStatus = "mapeado" | "a-definir";

export type ModuleDefinition = {
  slug: string;
  nome: string;
  icone: string; // emoji por enquanto — trocar por ícone próprio no design pass
  status: ModuleStatus;
  resumo: string;
};

export const modules: ModuleDefinition[] = [
  { slug: "financas", nome: "Finanças", icone: "💰", status: "mapeado", resumo: "Receitas, despesas, contas a vencer e investimentos." },
  { slug: "rotina", nome: "Rotina", icone: "📅", status: "mapeado", resumo: "Hábitos diários, streaks, marcos e calendário do mês." },
  { slug: "treino", nome: "Treino", icone: "💪", status: "mapeado", resumo: "Treino do dia, peso, metas e evolução." },
  { slug: "dieta", nome: "Dieta", icone: "🥗", status: "mapeado", resumo: "Cardápio semanal, água e evolução de peso." },
  { slug: "biblioteca", nome: "Biblioteca", icone: "📖", status: "mapeado", resumo: "Meta anual, sequência de leitura e citações." },
  { slug: "dev-pessoal", nome: "Dev. Pessoal", icone: "✨", status: "mapeado", resumo: "Nível, XP, metas, diário e humor num só lugar." },
  { slug: "saude", nome: "Saúde", icone: "❤️", status: "mapeado", resumo: "Remédios com lembrete, consultas, terapias e hábitos do dia." },
  { slug: "casa", nome: "Casa", icone: "🏠", status: "mapeado", resumo: "Lista de compras e tarefas domésticas recorrentes." },
  { slug: "estudos", nome: "Estudos", icone: "🎓", status: "mapeado", resumo: "Matérias com horário de aula, sessões de estudo e tarefas com prazo." },
  { slug: "beleza", nome: "Beleza", icone: "💧", status: "mapeado", resumo: "Rotina de cuidados, produtos com validade e check-in diário da pele." },
  { slug: "viagens", nome: "Viagens", icone: "✈️", status: "mapeado", resumo: "Roteiro, checklist e datas de cada viagem." },
  { slug: "carreira", nome: "Carreira", icone: "💼", status: "mapeado", resumo: "Metas de carreira, cursos e prazos importantes." },
  { slug: "mente", nome: "Mente", icone: "🧠", status: "mapeado", resumo: "Sessões de mindfulness, meditação e técnicas rápidas." },
  { slug: "relacoes", nome: "Relações", icone: "👥", status: "mapeado", resumo: "Aniversários, lembretes e datas de quem você gosta." },
  { slug: "pet", nome: "Pet", icone: "🐾", status: "mapeado", resumo: "Vacinas, consultas e cuidados de cada pet." },
  { slug: "detox", nome: "Detox", icone: "🌿", status: "mapeado", resumo: "Hábitos que você quer reduzir ou monitorar." },
];

export function getModuleBySlug(slug: string) {
  return modules.find((m) => m.slug === slug);
}
