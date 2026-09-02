import React, { useRef, useState } from "react";
import { Text, TextInput, View, Pressable, ActivityIndicator } from "react-native";
import { useRouter, Stack } from "expo-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Screen } from "@/components/ui/screen";
import { StepProgress } from "@/components/onboarding/step-progress";
import { OptionPill } from "@/components/onboarding/option-pill";
import { useTheme } from "@/lib/theme/theme-provider";
import { fontFamily } from "@/lib/theme/tokens";
import { supabase } from "@/lib/supabase";
import { completeOnboarding, saveModulePreference, ONBOARDING_MODULE_SLUGS, type Gender } from "@/lib/onboarding";
import { logBodyWeight, createTrainingGoal } from "@/lib/treino";
import { createHabit } from "@/lib/rotina";
import { createMotivation } from "@/lib/dev-pessoal";

/**
 * Envolve cada gravação com um rótulo de qual passo falhou — sem isso, um erro de RLS
 * numa tabela qualquer (ex: body_logs) aparece na tela sem dizer em qual etapa do
 * onboarding ele aconteceu, dificultando o diagnóstico à distância.
 */
async function runStep<T>(label: string, fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err: any) {
    const detail = [err?.message, err?.code ? `código ${err.code}` : null, err?.hint]
      .filter(Boolean)
      .join(" — ");
    throw new Error(`[${label}] ${detail || "erro desconhecido"}`);
  }
}

type ChoiceOption = { label: string; value: string };

type Step =
  | { kind: "intro" }
  | { kind: "gender" }
  | { kind: "birthdate" }
  | { kind: "body" }
  | { kind: "single"; module: string; field: string; title: string; subtitle?: string; options: ChoiceOption[] }
  | { kind: "multi"; module: string; field: string; title: string; subtitle?: string; options: ChoiceOption[] }
  | { kind: "number"; module: string; field: string; title: string; subtitle?: string; placeholder: string; label: string }
  | { kind: "text"; module: string; field: string; title: string; subtitle?: string; placeholder: string; label: string }
  | { kind: "done" };

const STEPS: Step[] = [
  { kind: "intro" },
  { kind: "gender" },
  { kind: "birthdate" },
  { kind: "body" },
  {
    kind: "single",
    module: "treino",
    field: "frequencia",
    title: "Com que frequência você se exercita?",
    options: [
      { label: "Quase todos os dias", value: "quase_todos_os_dias" },
      { label: "Várias vezes por semana", value: "varias_vezes_semana" },
      { label: "Várias vezes por mês", value: "varias_vezes_mes" },
      { label: "Não me exercito atualmente", value: "nao_exercito" },
    ],
  },
  {
    kind: "multi",
    module: "treino",
    field: "motivacoes",
    title: "O que te motiva a se exercitar?",
    options: [
      { label: "Parecer melhor", value: "Parecer melhor" },
      { label: "Sentir-se bem com meu corpo", value: "Sentir-se bem com meu corpo" },
      { label: "Estar em forma", value: "Estar em forma" },
      { label: "Melhorar saúde", value: "Melhorar saúde" },
      { label: "Reduzir estresse", value: "Reduzir estresse" },
      { label: "Nenhuma das opções", value: "Nenhuma das opções" },
    ],
  },
  {
    kind: "multi",
    module: "treino",
    field: "objetivos",
    title: "Qual é o seu objetivo?",
    options: [
      { label: "Perder peso", value: "Perder peso" },
      { label: "Construir músculo", value: "Construir músculo" },
      { label: "Melhorar disposição", value: "Melhorar disposição" },
    ],
  },
  {
    kind: "number",
    module: "financas",
    field: "renda_fixa",
    title: "Qual sua renda fixa mensal?",
    subtitle: "Ex: salário. Ajuda a acompanhar quanto sobra todo mês.",
    label: "Renda fixa (R$)",
    placeholder: "Ex: 2500,00",
  },
  {
    kind: "multi",
    module: "rotina",
    field: "habitos",
    title: "Quais hábitos você quer acompanhar?",
    subtitle: "A gente já cria eles pra você começar a marcar hoje mesmo.",
    options: [
      { label: "Beber água", value: "Beber água" },
      { label: "Dormir cedo", value: "Dormir cedo" },
      { label: "Exercitar-se", value: "Exercitar-se" },
      { label: "Estudar", value: "Estudar" },
      { label: "Meditar", value: "Meditar" },
      { label: "Ler", value: "Ler" },
    ],
  },
  {
    kind: "single",
    module: "dieta",
    field: "refeicoes_por_dia",
    title: "Quantas refeições você costuma fazer por dia?",
    options: [
      { label: "3 refeições", value: "3" },
      { label: "4 refeições", value: "4" },
      { label: "5 ou mais", value: "5+" },
    ],
  },
  {
    kind: "single",
    module: "dieta",
    field: "objetivo",
    title: "Qual é o seu objetivo com a alimentação?",
    options: [
      { label: "Perder peso", value: "Perder peso" },
      { label: "Manter o peso atual", value: "Manter o peso atual" },
      { label: "Ganhar massa muscular", value: "Ganhar massa muscular" },
      { label: "Comer de forma mais saudável", value: "Comer de forma mais saudável" },
    ],
  },
  {
    kind: "multi",
    module: "dieta",
    field: "restricoes",
    title: "Alguma restrição alimentar?",
    subtitle: "Ajuda a organizar seu cardápio depois — dá pra mudar quando quiser.",
    options: [
      { label: "Vegetariana", value: "Vegetariana" },
      { label: "Vegana", value: "Vegana" },
      { label: "Sem lactose", value: "Sem lactose" },
      { label: "Sem glúten", value: "Sem glúten" },
      { label: "Nenhuma", value: "Nenhuma" },
    ],
  },
  {
    kind: "number",
    module: "dieta",
    field: "meta_agua_litros",
    title: "Quantos litros de água você quer beber por dia?",
    subtitle: "Vira sua meta no monitor de água de Dieta.",
    label: "Meta de água (litros)",
    placeholder: "Ex: 2",
  },
  {
    kind: "number",
    module: "biblioteca",
    field: "meta_livros",
    title: "Quantos livros você pretende ler esse ano?",
    label: "Meta de livros",
    placeholder: "Ex: 12",
  },
  {
    kind: "single",
    module: "saude",
    field: "prioridade",
    title: "O que você mais quer acompanhar em Saúde?",
    subtitle: "Os dois ficam disponíveis de qualquer forma — é só pra saber o que priorizar.",
    options: [
      { label: "Remédios com lembrete", value: "Remédios com lembrete" },
      { label: "Consultas e terapias", value: "Consultas e terapias" },
      { label: "Os dois", value: "Os dois" },
    ],
  },
  {
    kind: "number",
    module: "estudos",
    field: "meta_horas_semana",
    title: "Quantas horas por semana você pretende estudar?",
    label: "Meta semanal",
    placeholder: "Ex: 10",
  },
  {
    // Múltipla escolha, como pedido — dá pra querer desenvolver mais de uma área ao mesmo tempo.
    kind: "multi",
    module: "dev-pessoal",
    field: "area_foco",
    title: "Qual área você mais quer desenvolver agora?",
    options: [
      { label: "Carreira", value: "Carreira" },
      { label: "Relacionamentos", value: "Relacionamentos" },
      { label: "Saúde mental", value: "Saúde mental" },
      { label: "Hábitos", value: "Hábitos" },
      { label: "Finanças pessoais", value: "Finanças pessoais" },
      { label: "Outro", value: "Outro" },
    ],
  },
  {
    // A seção "Motivações" do Dev. Pessoal (a "frase do dia") ficava sempre vazia até a
    // pessoa cadastrar uma na mão — essa pergunta já deixa a primeira frase pronta.
    kind: "text",
    module: "dev-pessoal",
    field: "frase_motivacional",
    title: "Tem alguma frase que te motiva?",
    subtitle: "Ela vira sua primeira \"frase do dia\" em Dev. Pessoal — dá pra adicionar mais depois.",
    label: "Sua frase",
    placeholder: "Ex: Um dia de cada vez.",
  },
  { kind: "done" },
];

const FIRST_QUESTION_INDEX = 1;
const LAST_QUESTION_INDEX = STEPS.length - 2;

// Os componentes abaixo ficam FORA de OnboardingScreen de propósito: se fossem definidos
// dentro dela, cada nova tecla digitada recriaria a função e o React trocaria de
// identidade o componente inteiro a cada render — derrubando e remontando o TextInput e
// fechando o teclado no meio da digitação (foi exatamente o bug do peso/renda fixa).

function StepTitle({ children }: { children: string }) {
  const { tokens } = useTheme();
  return <Text style={{ fontFamily: fontFamily.display, fontSize: 24, color: tokens.text }}>{children}</Text>;
}

function StepSubtitle({ children }: { children: string }) {
  const { tokens } = useTheme();
  return <Text style={{ fontFamily: fontFamily.body, fontSize: 14, color: tokens.textMuted }}>{children}</Text>;
}

function ContinueButton({
  label = "Continuar",
  onPress,
  disabled = false,
  loading = false,
}: {
  label?: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
}) {
  const { tokens } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={{
        backgroundColor: tokens.accent,
        borderRadius: 12,
        paddingVertical: 15,
        alignItems: "center",
        opacity: disabled || loading ? 0.6 : 1,
      }}
    >
      {loading ? (
        <ActivityIndicator color={tokens.accentText} />
      ) : (
        <Text style={{ fontFamily: fontFamily.bodySemibold, fontSize: 15, color: tokens.accentText }}>{label}</Text>
      )}
    </Pressable>
  );
}

function SkipLink({ onPress }: { onPress: () => void }) {
  const { tokens } = useTheme();
  return (
    <Pressable onPress={onPress} style={{ alignItems: "center", paddingVertical: 8 }}>
      <Text style={{ fontFamily: fontFamily.body, fontSize: 13, color: tokens.textMuted }}>Pular por enquanto</Text>
    </Pressable>
  );
}

function LabeledField({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = "decimal-pad",
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder: string;
  keyboardType?: "decimal-pad" | "default";
}) {
  const { tokens } = useTheme();
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ fontFamily: fontFamily.body, fontSize: 12.5, color: tokens.textMuted }}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={tokens.textMuted}
        keyboardType={keyboardType}
        style={{
          fontFamily: fontFamily.body,
          fontSize: 16,
          color: tokens.text,
          backgroundColor: tokens.surfaceAlt,
          borderRadius: 10,
          paddingHorizontal: 14,
          paddingVertical: 12,
        }}
      />
    </View>
  );
}

function BirthDateFields({
  day,
  month,
  year,
  onChangeDay,
  onChangeMonth,
  onChangeYear,
}: {
  day: string;
  month: string;
  year: string;
  onChangeDay: (t: string) => void;
  onChangeMonth: (t: string) => void;
  onChangeYear: (t: string) => void;
}) {
  const { tokens } = useTheme();
  const monthRef = useRef<TextInput>(null);
  const yearRef = useRef<TextInput>(null);
  const fieldStyle = {
    fontFamily: fontFamily.mono,
    fontSize: 18,
    color: tokens.text,
    backgroundColor: tokens.surfaceAlt,
    borderRadius: 10,
    paddingVertical: 14,
    textAlign: "center" as const,
  };
  return (
    <View style={{ flexDirection: "row", gap: 8 }}>
      <TextInput
        value={day}
        onChangeText={(t) => {
          const digits = t.replace(/\D/g, "").slice(0, 2);
          onChangeDay(digits);
          if (digits.length === 2) monthRef.current?.focus();
        }}
        placeholder="DD"
        placeholderTextColor={tokens.textMuted}
        keyboardType="number-pad"
        maxLength={2}
        style={[fieldStyle, { width: 64 }]}
      />
      <TextInput
        ref={monthRef}
        value={month}
        onChangeText={(t) => {
          const digits = t.replace(/\D/g, "").slice(0, 2);
          onChangeMonth(digits);
          if (digits.length === 2) yearRef.current?.focus();
        }}
        placeholder="MM"
        placeholderTextColor={tokens.textMuted}
        keyboardType="number-pad"
        maxLength={2}
        style={[fieldStyle, { width: 64 }]}
      />
      <TextInput
        ref={yearRef}
        value={year}
        onChangeText={(t) => onChangeYear(t.replace(/\D/g, "").slice(0, 4))}
        placeholder="AAAA"
        placeholderTextColor={tokens.textMuted}
        keyboardType="number-pad"
        maxLength={4}
        style={[fieldStyle, { width: 88 }]}
      />
    </View>
  );
}

export default function OnboardingScreen() {
  const { tokens } = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [stepIndex, setStepIndex] = useState(0);
  const [gender, setGender] = useState<Gender | null>(null);
  const [birthDay, setBirthDay] = useState("");
  const [birthMonth, setBirthMonth] = useState("");
  const [birthYear, setBirthYear] = useState("");
  const [heightText, setHeightText] = useState("");
  const [weightNowText, setWeightNowText] = useState("");
  const [weightTargetText, setWeightTargetText] = useState("");
  const [answers, setAnswers] = useState<Record<string, Record<string, unknown>>>({});

  const step = STEPS[stepIndex];

  function setAnswer(moduleSlug: string, field: string, value: unknown) {
    setAnswers((prev) => ({ ...prev, [moduleSlug]: { ...(prev[moduleSlug] ?? {}), [field]: value } }));
  }

  function clearAnswer(moduleSlug: string, field: string) {
    setAnswers((prev) => {
      const moduleAnswers = { ...(prev[moduleSlug] ?? {}) };
      delete moduleAnswers[field];
      return { ...prev, [moduleSlug]: moduleAnswers };
    });
  }

  function toggleMultiValue(moduleSlug: string, field: string, value: string) {
    const current = (answers[moduleSlug]?.[field] as string[] | undefined) ?? [];
    const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
    setAnswer(moduleSlug, field, next);
  }

  function goNext() {
    setStepIndex((i) => Math.min(i + 1, STEPS.length - 1));
  }

  function goBack() {
    setStepIndex((i) => Math.max(0, i - 1));
  }

  function goSkip() {
    if (step.kind === "single" || step.kind === "multi" || step.kind === "number" || step.kind === "text") {
      clearAnswer(step.module, step.field);
    } else if (step.kind === "gender") {
      setGender(null);
    } else if (step.kind === "birthdate") {
      setBirthDay("");
      setBirthMonth("");
      setBirthYear("");
    } else if (step.kind === "body") {
      setHeightText("");
      setWeightNowText("");
      setWeightTargetText("");
    }
    goNext();
  }

  const finalizeMutation = useMutation({
    mutationFn: async () => {
      // Busca o usuário direto da sessão atual (em vez de confiar num valor já
      // guardado antes) — evita gravar com um id de conta desatualizado depois
      // de um logout/login no meio do onboarding.
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData.user) {
        throw new Error("Sessão não encontrada — feche o app e entre de novo antes de concluir.");
      }
      const userId = authData.user.id;

      const birthDate =
        birthDay.length > 0 && birthMonth.length > 0 && birthYear.length === 4
          ? `${birthYear}-${birthMonth.padStart(2, "0")}-${birthDay.padStart(2, "0")}`
          : null;
      const heightCm = heightText ? Number(heightText.replace(",", ".")) : null;
      const weightNow = weightNowText ? Number(weightNowText.replace(",", ".")) : null;
      const weightTarget = weightTargetText ? Number(weightTargetText.replace(",", ".")) : null;

      await runStep("perfil", () => completeOnboarding(userId, { gender, birthDate, heightCm }));

      if (weightNow && weightNow > 0) {
        await runStep("peso", () => logBodyWeight(userId, weightNow));
      }
      if (weightNow && weightTarget && weightNow > 0 && weightTarget > 0 && weightNow !== weightTarget) {
        await runStep("meta de peso", () =>
          createTrainingGoal(userId, {
            title: `Chegar em ${weightTarget} kg`,
            metricType: "weight",
            startValue: weightNow,
            targetValue: weightTarget,
            currentValue: null,
            unit: "kg",
            targetDate: null,
          })
        );
      }

      await runStep("preferências dos módulos", () =>
        Promise.all(ONBOARDING_MODULE_SLUGS.map((slug) => saveModulePreference(userId, slug, answers[slug] ?? {})))
      );

      const habitos = (answers.rotina?.habitos as string[] | undefined) ?? [];
      for (const habitName of habitos) {
        await runStep("hábitos", () => createHabit(userId, habitName, [0, 1, 2, 3, 4, 5, 6]));
      }

      const fraseMotivacional = (answers["dev-pessoal"]?.frase_motivacional as string | undefined)?.trim();
      if (fraseMotivacional) {
        await runStep("frase motivacional", () => createMotivation(userId, fraseMotivacional, 0));
      }
    },
    onSuccess: () => {
      // Remove (não só invalida) o cache do status do onboarding antes de navegar.
      // Com só invalidateQueries, a Home podia remontar mostrando por uma fração de
      // segundo o dado ANTIGO ainda em cache (onboarding_completed_at nulo, de antes
      // de terminar) enquanto o refetch ainda não tinha voltado — e nesse instante ela
      // já decidia redirecionar de volta pro onboarding. Isso resetava as respostas
      // (a tela remonta do zero) e um segundo toque em "Pular tudo por agora" ou
      // "Concluir" rodava com tudo vazio, sobrescrevendo o que tinha acabado de ser
      // salvo com sucesso. Removendo o cache, a Home sempre busca o dado fresco.
      queryClient.removeQueries({ queryKey: ["onboarding-status"] });
      queryClient.invalidateQueries();
      router.replace("/");
    },
  });

  function renderStep() {
    switch (step.kind) {
      case "intro":
        return (
          <View style={{ gap: 20 }}>
            <Text style={{ fontSize: 40 }}>👋</Text>
            <StepTitle>Vamos personalizar o Prumo</StepTitle>
            <StepSubtitle>
              Algumas perguntas rápidas pra deixar cada módulo mais seu. Você pode pular qualquer uma —
              os módulos continuam todos disponíveis do mesmo jeito.
            </StepSubtitle>
            <ContinueButton label="Vamos lá" onPress={goNext} />
            <Pressable
              onPress={() => finalizeMutation.mutate()}
              disabled={finalizeMutation.isPending}
              style={{ alignItems: "center", paddingVertical: 8, opacity: finalizeMutation.isPending ? 0.5 : 1 }}
            >
              <Text style={{ fontFamily: fontFamily.body, fontSize: 13, color: tokens.textMuted }}>
                {finalizeMutation.isPending ? "Salvando…" : "Pular tudo por agora"}
              </Text>
            </Pressable>
          </View>
        );

      case "gender":
        return (
          <View style={{ gap: 14 }}>
            <StepTitle>Você é...</StepTitle>
            <OptionPill
              label="Mulher"
              selected={gender === "feminino"}
              onPress={() => {
                setGender("feminino");
                goNext();
              }}
            />
            <OptionPill
              label="Homem"
              selected={gender === "masculino"}
              onPress={() => {
                setGender("masculino");
                goNext();
              }}
            />
            <SkipLink onPress={goSkip} />
          </View>
        );

      case "birthdate":
        return (
          <View style={{ gap: 14 }}>
            <StepTitle>Qual sua data de nascimento?</StepTitle>
            <StepSubtitle>Formato DD-MM-AAAA.</StepSubtitle>
            <BirthDateFields
              day={birthDay}
              month={birthMonth}
              year={birthYear}
              onChangeDay={setBirthDay}
              onChangeMonth={setBirthMonth}
              onChangeYear={setBirthYear}
            />
            <ContinueButton
              onPress={goNext}
              disabled={!(birthDay.length > 0 && birthMonth.length > 0 && birthYear.length === 4)}
            />
            <SkipLink onPress={goSkip} />
          </View>
        );

      case "body":
        return (
          <View style={{ gap: 14 }}>
            <StepTitle>Altura e peso</StepTitle>
            <StepSubtitle>Usado no check-in e nas metas do Treino — dá pra editar quando quiser.</StepSubtitle>
            <LabeledField label="Altura (cm)" value={heightText} onChangeText={setHeightText} placeholder="Ex: 165" />
            <LabeledField
              label="Peso atual (kg)"
              value={weightNowText}
              onChangeText={setWeightNowText}
              placeholder="Ex: 60"
            />
            <LabeledField
              label="Peso alvo (kg) — opcional"
              value={weightTargetText}
              onChangeText={setWeightTargetText}
              placeholder="Ex: 58"
            />
            <ContinueButton onPress={goNext} />
            <SkipLink onPress={goSkip} />
          </View>
        );

      case "single":
        return (
          <View style={{ gap: 14 }}>
            <StepTitle>{step.title}</StepTitle>
            {step.subtitle ? <StepSubtitle>{step.subtitle}</StepSubtitle> : null}
            {step.options.map((opt) => (
              <OptionPill
                key={opt.value}
                label={opt.label}
                selected={answers[step.module]?.[step.field] === opt.value}
                onPress={() => {
                  setAnswer(step.module, step.field, opt.value);
                  goNext();
                }}
              />
            ))}
            <SkipLink onPress={goSkip} />
          </View>
        );

      case "multi": {
        const selectedList = (answers[step.module]?.[step.field] as string[] | undefined) ?? [];
        return (
          <View style={{ gap: 14 }}>
            <StepTitle>{step.title}</StepTitle>
            {step.subtitle ? <StepSubtitle>{step.subtitle}</StepSubtitle> : null}
            {step.options.map((opt) => (
              <OptionPill
                key={opt.value}
                label={opt.label}
                selected={selectedList.includes(opt.value)}
                onPress={() => toggleMultiValue(step.module, step.field, opt.value)}
              />
            ))}
            <ContinueButton onPress={goNext} />
            <SkipLink onPress={goSkip} />
          </View>
        );
      }

      case "number":
        return (
          <View style={{ gap: 14 }}>
            <StepTitle>{step.title}</StepTitle>
            {step.subtitle ? <StepSubtitle>{step.subtitle}</StepSubtitle> : null}
            <LabeledField
              label={step.label}
              value={(answers[step.module]?.[step.field] as string | undefined) ?? ""}
              onChangeText={(t) => setAnswer(step.module, step.field, t)}
              placeholder={step.placeholder}
            />
            <ContinueButton onPress={goNext} />
            <SkipLink onPress={goSkip} />
          </View>
        );

      case "text":
        return (
          <View style={{ gap: 14 }}>
            <StepTitle>{step.title}</StepTitle>
            {step.subtitle ? <StepSubtitle>{step.subtitle}</StepSubtitle> : null}
            <LabeledField
              label={step.label}
              value={(answers[step.module]?.[step.field] as string | undefined) ?? ""}
              onChangeText={(t) => setAnswer(step.module, step.field, t)}
              placeholder={step.placeholder}
              keyboardType="default"
            />
            <ContinueButton onPress={goNext} />
            <SkipLink onPress={goSkip} />
          </View>
        );

      case "done":
        return (
          <View style={{ gap: 20 }}>
            <Text style={{ fontSize: 40 }}>✅</Text>
            <StepTitle>Tudo pronto!</StepTitle>
            <StepSubtitle>
              Você pode mudar qualquer resposta depois em Configurações → Editar perfil, ou direto dentro de
              cada módulo.
            </StepSubtitle>
            {finalizeMutation.isError ? (
              <Text style={{ fontFamily: fontFamily.body, fontSize: 13, color: tokens.danger }}>
                Não deu pra salvar agora: {(finalizeMutation.error as Error)?.message ?? "erro desconhecido"}.
                {"\n"}Confere se a migration mais recente já rodou no Supabase e tenta de novo.
              </Text>
            ) : null}
            <ContinueButton
              label="Concluir"
              onPress={() => finalizeMutation.mutate()}
              loading={finalizeMutation.isPending}
            />
          </View>
        );
    }
  }

  const isQuestion = stepIndex >= FIRST_QUESTION_INDEX && stepIndex <= LAST_QUESTION_INDEX;

  return (
    <Screen scroll>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={{ flex: 1, gap: 24 }}>
        <View style={{ minHeight: 24, justifyContent: "center" }}>
          {stepIndex > 0 ? (
            <Pressable onPress={goBack} hitSlop={8} style={{ alignSelf: "flex-start" }}>
              <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 14, color: tokens.accent }}>
                ‹ Voltar
              </Text>
            </Pressable>
          ) : null}
        </View>

        {isQuestion ? (
          <StepProgress total={LAST_QUESTION_INDEX - FIRST_QUESTION_INDEX + 1} current={stepIndex - FIRST_QUESTION_INDEX} />
        ) : null}

        <View style={{ flex: 1, justifyContent: step.kind === "intro" || step.kind === "done" ? "center" : "flex-start" }}>
          {renderStep()}
        </View>
      </View>
    </Screen>
  );
}
