import React from "react";
import { Text, View, Pressable, ActivityIndicator } from "react-native";
import { useTheme } from "@/lib/theme/theme-provider";
import { fontFamily } from "@/lib/theme/tokens";
import {
  challengeDayDate,
  computeChallengeProgress,
  toDateString,
  type Challenge,
  type ChallengeLog,
  type ChallengeProgram,
} from "@/lib/rotina";

type ChallengeCardProps = {
  program: ChallengeProgram;
  /** `null` quando esse programa nunca foi iniciado — mostra o cartão de "Começar". */
  challenge: Challenge | null;
  logs: ChallengeLog[];
  onStart: () => void;
  isStarting: boolean;
  onToggleDay: (dateStr: string, isCurrentlyDone: boolean) => void;
  isToggling: boolean;
  pendingDate?: string | null;
  onFinish: () => void;
  onAbandon: () => void;
  onDelete: () => void;
  isMutatingStatus: boolean;
};

function formatShortDateBr(isoDate: string): string {
  const [, m, d] = isoDate.split("-");
  return `${d}/${m}`;
}

export function ChallengeCard({
  program,
  challenge,
  logs,
  onStart,
  isStarting,
  onToggleDay,
  isToggling,
  pendingDate,
  onFinish,
  onAbandon,
  onDelete,
  isMutatingStatus,
}: ChallengeCardProps) {
  const { tokens } = useTheme();

  const header = (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 18,
          backgroundColor: tokens.surfaceAlt,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text style={{ fontSize: 16 }}>{program.icon}</Text>
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ fontFamily: fontFamily.bodySemibold, fontSize: 14, color: tokens.text }}>
          {program.title}
        </Text>
        <Text style={{ fontFamily: fontFamily.body, fontSize: 12, color: tokens.textMuted }}>
          {program.description}
        </Text>
      </View>
    </View>
  );

  // Nunca começou — cartão convite, só com "Começar".
  if (!challenge) {
    return (
      <View
        style={{
          backgroundColor: tokens.surface,
          borderColor: tokens.border,
          borderWidth: 1,
          borderRadius: 14,
          padding: 14,
          gap: 12,
        }}
      >
        {header}
        <Pressable
          onPress={onStart}
          disabled={isStarting}
          style={{
            backgroundColor: tokens.accentMuted,
            borderRadius: 10,
            paddingVertical: 10,
            alignItems: "center",
            opacity: isStarting ? 0.6 : 1,
          }}
        >
          {isStarting ? (
            <ActivityIndicator size="small" color={tokens.accent} />
          ) : (
            <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 13, color: tokens.accent }}>
              Começar · {program.days} dias
            </Text>
          )}
        </Pressable>
      </View>
    );
  }

  // Já terminou (concluído ou desistiu) — resumo compacto + repetir.
  if (challenge.completed_at || challenge.abandoned_at) {
    const doneCount = logs.filter((l) => l.challenge_id === challenge.id).length;
    const finishedLabel = challenge.completed_at
      ? `✓ Concluído em ${formatShortDateBr(challenge.completed_at)}`
      : `Desistiu em ${formatShortDateBr(challenge.abandoned_at!)}`;
    return (
      <View
        style={{
          backgroundColor: tokens.surface,
          borderColor: tokens.border,
          borderWidth: 1,
          borderRadius: 14,
          padding: 14,
          gap: 12,
          opacity: 0.85,
        }}
      >
        {header}
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Text
            style={{
              fontFamily: fontFamily.bodyMedium,
              fontSize: 12,
              color: challenge.completed_at ? tokens.success : tokens.textMuted,
            }}
          >
            {finishedLabel} · {doneCount} de {program.days} dias
          </Text>
          <View style={{ flexDirection: "row", gap: 14 }}>
            <Pressable onPress={onDelete} disabled={isMutatingStatus} hitSlop={8}>
              <Text style={{ fontFamily: fontFamily.body, fontSize: 12, color: tokens.textMuted }}>
                Excluir
              </Text>
            </Pressable>
            <Pressable onPress={onStart} disabled={isStarting} hitSlop={8}>
              <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 12.5, color: tokens.accent }}>
                {isStarting ? "..." : "Repetir"}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    );
  }

  // Em andamento.
  const progress = computeChallengeProgress(challenge, program, logs);
  const today = toDateString(new Date());

  return (
    <View
      style={{
        backgroundColor: tokens.surface,
        borderColor: tokens.border,
        borderWidth: 1,
        borderRadius: 14,
        padding: 14,
        gap: 12,
      }}
    >
      {header}

      <View style={{ gap: 4 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 12.5, color: tokens.text }}>
            Dia {progress.currentDay} de {progress.totalDays}
          </Text>
          <Text style={{ fontFamily: fontFamily.body, fontSize: 12, color: tokens.textMuted }}>
            {progress.doneCount} feitos
          </Text>
        </View>
        <View
          style={{
            height: 6,
            borderRadius: 3,
            backgroundColor: tokens.surfaceAlt,
            overflow: "hidden",
          }}
        >
          <View
            style={{
              width: `${Math.round((progress.currentDay / progress.totalDays) * 100)}%`,
              height: "100%",
              borderRadius: 3,
              backgroundColor: tokens.accent,
            }}
          />
        </View>
      </View>

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
        {Array.from({ length: program.days }, (_, i) => i + 1).map((dayNumber) => {
          const dateStr = challengeDayDate(challenge, dayNumber);
          const isDone = progress.doneDates.has(dateStr);
          const isFuture = dateStr > today;
          const isToday = dateStr === today;
          const isPendingHere = isToggling && pendingDate === dateStr;
          return (
            <Pressable
              key={dayNumber}
              onPress={!isFuture ? () => onToggleDay(dateStr, isDone) : undefined}
              disabled={isFuture || isToggling}
              style={{
                width: 24,
                height: 24,
                borderRadius: 12,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: isDone ? tokens.accent : tokens.surfaceAlt,
                borderWidth: isToday ? 1.5 : 0,
                borderColor: tokens.accent,
                opacity: isFuture ? 0.4 : 1,
              }}
            >
              {isPendingHere ? (
                <ActivityIndicator size="small" color={isDone ? tokens.accentText : tokens.accent} />
              ) : (
                <Text
                  style={{
                    fontFamily: fontFamily.body,
                    fontSize: 9.5,
                    color: isDone ? tokens.accentText : tokens.textMuted,
                  }}
                >
                  {dayNumber}
                </Text>
              )}
            </Pressable>
          );
        })}
      </View>

      {progress.periodEnded ? (
        <View style={{ gap: 8 }}>
          <Text style={{ fontFamily: fontFamily.body, fontSize: 12, color: tokens.textMuted }}>
            O período de {program.days} dias terminou — você completou {progress.doneCount} de{" "}
            {program.days} dias.
          </Text>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Pressable
              onPress={onAbandon}
              disabled={isMutatingStatus}
              style={{ flex: 1, alignItems: "center", paddingVertical: 10 }}
            >
              <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 13, color: tokens.textMuted }}>
                Encerrar
              </Text>
            </Pressable>
            <Pressable
              onPress={onFinish}
              disabled={isMutatingStatus}
              style={{
                flex: 1,
                backgroundColor: tokens.accent,
                borderRadius: 10,
                paddingVertical: 10,
                alignItems: "center",
                opacity: isMutatingStatus ? 0.6 : 1,
              }}
            >
              <Text style={{ fontFamily: fontFamily.bodySemibold, fontSize: 13, color: tokens.accentText }}>
                Concluir
              </Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Pressable onPress={onAbandon} disabled={isMutatingStatus} hitSlop={8}>
            <Text style={{ fontFamily: fontFamily.body, fontSize: 12, color: tokens.textMuted }}>
              Desistir
            </Text>
          </Pressable>
          {!progress.doneDates.has(today) ? (
            <Pressable onPress={() => onToggleDay(today, false)} disabled={isToggling} hitSlop={8}>
              <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 13, color: tokens.accent }}>
                Marcar hoje
              </Text>
            </Pressable>
          ) : null}
        </View>
      )}
    </View>
  );
}
