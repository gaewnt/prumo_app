import { supabase } from "@/lib/supabase";

/**
 * Camada de dados do onboarding e da personalização por módulo. `profiles`
 * guarda o que é realmente "de perfil" (gênero, nascimento, altura, quando
 * terminou o onboarding); `module_preferences` guarda as respostas do
 * questionário inicial de cada módulo — sempre editável depois, e usada só
 * pra alimentar cálculos/telas daquele módulo (nunca pra esconder um menu:
 * todos os módulos continuam visíveis, personalizado ou não).
 */

export type Gender = "feminino" | "masculino";

export type ModuleAnswers = Record<string, unknown>;

export type OnboardingProfile = {
  gender: Gender | null;
  birth_date: string | null; // YYYY-MM-DD
  height_cm: number | null;
  onboarding_completed_at: string | null;
};

export type ModulePreference = {
  module_slug: string;
  answers: ModuleAnswers;
  skipped: boolean;
  completed_at: string | null;
  hidden: boolean;
};

/** Módulos que ganham seção própria no onboarding nessa primeira versão. */
export const ONBOARDING_MODULE_SLUGS = [
  "treino",
  "financas",
  "rotina",
  "dieta",
  "biblioteca",
  "saude",
  "estudos",
  "dev-pessoal",
] as const;

export async function fetchOnboardingProfile() {
  const { data, error } = await supabase
    .from("profiles")
    .select("gender, birth_date, height_cm, onboarding_completed_at")
    .single();
  if (error) throw error;
  return data as OnboardingProfile;
}

export async function fetchAllModulePreferences() {
  const { data, error } = await supabase
    .from("module_preferences")
    .select("module_slug, answers, skipped, completed_at, hidden");
  if (error) throw error;
  return (data ?? []) as ModulePreference[];
}

/**
 * Mostra/esconde um módulo na lista principal — grava só o campo `hidden`, sem tocar nas
 * respostas do onboarding daquele módulo (mesmo se a pessoa nunca tiver respondido nada:
 * o upsert cria a linha com os valores padrão do banco pros outros campos).
 */
export async function setModuleHidden(userId: string, moduleSlug: string, hidden: boolean) {
  const { error } = await supabase.from("module_preferences").upsert(
    { user_id: userId, module_slug: moduleSlug, hidden },
    { onConflict: "user_id,module_slug" }
  );
  if (error) throw error;
}

/** Respostas de um único módulo — usado dentro da própria tela do módulo (ex: renda fixa em Finanças). */
export async function fetchModulePreference(moduleSlug: string) {
  const { data, error } = await supabase
    .from("module_preferences")
    .select("answers")
    .eq("module_slug", moduleSlug)
    .maybeSingle();
  if (error) throw error;
  return ((data?.answers as ModuleAnswers | undefined) ?? {}) as ModuleAnswers;
}

/**
 * Grava as respostas de um módulo de uma vez (upsert). `skipped` é derivado
 * automaticamente: um objeto vazio == a pessoa não respondeu nada == não
 * personalizado, sem precisar de uma flag separada pra manter em sincronia.
 */
export async function saveModulePreference(
  userId: string,
  moduleSlug: string,
  answers: ModuleAnswers
) {
  const { error } = await supabase.from("module_preferences").upsert(
    {
      user_id: userId,
      module_slug: moduleSlug,
      answers,
      skipped: Object.keys(answers).length === 0,
      completed_at: new Date().toISOString(),
    },
    { onConflict: "user_id,module_slug" }
  );
  if (error) throw error;
}

/** Mescla `patch` nas respostas já salvas de um módulo — usado pra editar um campo isolado depois (ex: renda fixa). */
export async function updateModulePreferenceField(
  userId: string,
  moduleSlug: string,
  patch: ModuleAnswers
) {
  const current = await fetchModulePreference(moduleSlug);
  await saveModulePreference(userId, moduleSlug, { ...current, ...patch });
}

// Mensagem usada quando um UPDATE em `profiles` não afeta nenhuma linha: como a
// policy de RLS filtra silenciosamente (sem erro) linhas que não são da pessoa
// logada, um `userId` desalinhado com a sessão atual passa batido aqui e só
// estoura um erro confuso mais adiante (ex: insert em body_logs). Checar
// explicitamente evita isso.
const PROFILE_MISMATCH_MESSAGE =
  "Não achamos seu perfil pra atualizar — a sessão pode estar desalinhada. Feche o app completamente (não só minimize), abra de novo, entre na conta e tente novamente.";

export async function completeOnboarding(
  userId: string,
  profileInput: { gender: Gender | null; birthDate: string | null; heightCm: number | null }
) {
  const { data, error } = await supabase
    .from("profiles")
    .update({
      gender: profileInput.gender,
      birth_date: profileInput.birthDate,
      height_cm: profileInput.heightCm,
      onboarding_completed_at: new Date().toISOString(),
    })
    .eq("id", userId)
    .select("id");
  if (error) throw error;
  if (!data || data.length === 0) throw new Error(PROFILE_MISMATCH_MESSAGE);
}

/** Usado na tela "Editar perfil" — atualiza gênero/nascimento/altura sem mexer no onboarding em si. */
export async function updateOnboardingProfile(
  userId: string,
  input: { gender: Gender | null; birthDate: string | null; heightCm: number | null }
) {
  const { data, error } = await supabase
    .from("profiles")
    .update({ gender: input.gender, birth_date: input.birthDate, height_cm: input.heightCm })
    .eq("id", userId)
    .select("id");
  if (error) throw error;
  if (!data || data.length === 0) throw new Error(PROFILE_MISMATCH_MESSAGE);
}

/** "2001-05-09" -> "09-05-2001", como pedido (BR com hífen). */
export function formatBirthDate(iso: string) {
  const [y, m, d] = iso.split("-");
  return `${d}-${m}-${y}`;
}
