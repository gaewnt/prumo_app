import React, { useState } from "react";
import { Text, View, ActivityIndicator } from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ChallengeCard } from "@/components/rotina/challenge-card";
import { useTheme } from "@/lib/theme/theme-provider";
import { fontFamily } from "@/lib/theme/tokens";
import { useAuthStore } from "@/lib/store/auth-store";
import {
  fetchChallenges,
  startChallenge,
  toggleChallengeDay,
  finishChallenge,
  abandonChallenge,
  deleteChallenge,
  CHALLENGE_PROGRAMS,
  type Challenge,
} from "@/lib/rotina";

/** Conteúdo de Desafios — usado como aba dentro do hub Rotina, ao lado de Hábitos e
 * Relações. Cada programa (`CHALLENGE_PROGRAMS`, conteúdo fixo) aparece uma vez, mostrando
 * o desafio mais recente que a pessoa já começou dele (se algum) ou um convite pra começar. */
export function DesafiosContent() {
  const { tokens } = useTheme();
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.session?.user.id);

  const [pendingChallengeId, setPendingChallengeId] = useState<string | null>(null);
  const [pendingDate, setPendingDate] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ["rotina-challenges", userId],
    queryFn: fetchChallenges,
    enabled: !!userId,
  });
  const challenges = query.data?.challenges ?? [];
  const logs = query.data?.logs ?? [];

  // `challenges` já vem ordenado por `started_at` desc — o primeiro de cada `program_id`
  // encontrado é o mais recente. Só esse aparece; tentativas mais antigas do mesmo
  // programa ficam de fora da lista (o histórico continua no banco, só não some duplicado
  // aqui).
  const latestByProgram = new Map<string, Challenge>();
  for (const c of challenges) {
    if (!latestByProgram.has(c.program_id)) latestByProgram.set(c.program_id, c);
  }

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["rotina-challenges", userId] });
  }

  const startMutation = useMutation({
    mutationFn: (programId: string) => startChallenge(userId!, programId),
    onSuccess: invalidate,
  });

  const toggleMutation = useMutation({
    mutationFn: ({
      challengeId,
      dateStr,
      isCurrentlyDone,
    }: {
      challengeId: string;
      dateStr: string;
      isCurrentlyDone: boolean;
    }) => toggleChallengeDay(userId!, challengeId, dateStr, isCurrentlyDone),
    onMutate: ({ challengeId, dateStr }) => {
      setPendingChallengeId(challengeId);
      setPendingDate(dateStr);
    },
    onSettled: () => {
      setPendingChallengeId(null);
      setPendingDate(null);
      invalidate();
    },
  });

  const finishMutation = useMutation({
    mutationFn: (challengeId: string) => finishChallenge(challengeId),
    onSuccess: invalidate,
  });

  const abandonMutation = useMutation({
    mutationFn: (challengeId: string) => abandonChallenge(challengeId),
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: (challengeId: string) => deleteChallenge(challengeId),
    onSuccess: invalidate,
  });

  const isMutatingStatus = finishMutation.isPending || abandonMutation.isPending || deleteMutation.isPending;

  return (
    <View style={{ gap: 20 }}>
      <View style={{ gap: 4 }}>
        <Text style={{ fontSize: 32 }}>🏁</Text>
        <Text style={{ fontFamily: fontFamily.display, fontSize: 26, color: tokens.text }}>
          Desafios
        </Text>
        <Text style={{ fontFamily: fontFamily.body, fontSize: 15, color: tokens.textMuted }}>
          Programas prontos de alguns dias — a mesma ação, todo dia, até o fim do ciclo.
        </Text>
      </View>

      {query.isLoading ? (
        <ActivityIndicator color={tokens.accent} />
      ) : query.isError ? (
        <Text style={{ fontFamily: fontFamily.body, fontSize: 14, color: tokens.danger }}>
          Não deu pra carregar seus desafios agora. Puxe pra atualizar ou tente de novo em instantes.
        </Text>
      ) : (
        <View style={{ gap: 12 }}>
          {CHALLENGE_PROGRAMS.map((program) => {
            const challenge = latestByProgram.get(program.id) ?? null;
            return (
              <ChallengeCard
                key={program.id}
                program={program}
                challenge={challenge}
                logs={logs}
                onStart={() => startMutation.mutate(program.id)}
                isStarting={startMutation.isPending && startMutation.variables === program.id}
                onToggleDay={(dateStr, isCurrentlyDone) =>
                  challenge && toggleMutation.mutate({ challengeId: challenge.id, dateStr, isCurrentlyDone })
                }
                isToggling={!!challenge && pendingChallengeId === challenge.id}
                pendingDate={pendingDate}
                onFinish={() => challenge && finishMutation.mutate(challenge.id)}
                onAbandon={() => challenge && abandonMutation.mutate(challenge.id)}
                onDelete={() => challenge && deleteMutation.mutate(challenge.id)}
                isMutatingStatus={isMutatingStatus}
              />
            );
          })}
        </View>
      )}
    </View>
  );
}
