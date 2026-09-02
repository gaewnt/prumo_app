import React from "react";
import { Text, View, Pressable } from "react-native";
import { useTheme } from "@/lib/theme/theme-provider";
import { fontFamily } from "@/lib/theme/tokens";

type MonthNavProps = {
  /** Qualquer data dentro do mês exibido. */
  monthDate: Date;
  onChange: (next: Date) => void;
  /** Mês mais recente até onde dá pra navegar — padrão: mês atual (não deixa ir pro futuro,
   * já que é histórico de dados que ainda não existem). */
  maxDate?: Date;
};

/**
 * Setas ‹ › + label do mês — extraído do padrão já usado em Planejamento mensal (Finanças) e
 * generalizado pra virar o seletor de "meses anteriores" reaproveitado nos módulos de log
 * diário. Sem estado interno: quem usa guarda o `monthDate` e decide o que
 * buscar quando ele muda — mesmo espírito do `MonthHeatmap`, que já funciona assim.
 */
export function MonthNav({ monthDate, onChange, maxDate }: MonthNavProps) {
  const { tokens } = useTheme();
  const max = maxDate ?? new Date();
  const atMax = monthDate.getFullYear() === max.getFullYear() && monthDate.getMonth() === max.getMonth();

  const rawLabel = monthDate.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  const label = rawLabel.charAt(0).toUpperCase() + rawLabel.slice(1);

  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
      <Pressable
        onPress={() => onChange(new Date(monthDate.getFullYear(), monthDate.getMonth() - 1, 1))}
        hitSlop={10}
      >
        <Text style={{ fontSize: 20, color: tokens.accent }}>‹</Text>
      </Pressable>
      <Text style={{ fontFamily: fontFamily.bodySemibold, fontSize: 14, color: tokens.text }}>
        {label}
      </Text>
      <Pressable
        onPress={() => {
          if (atMax) return;
          onChange(new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 1));
        }}
        disabled={atMax}
        hitSlop={10}
      >
        <Text style={{ fontSize: 20, color: atMax ? tokens.textMuted : tokens.accent }}>›</Text>
      </Pressable>
    </View>
  );
}
