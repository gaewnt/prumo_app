import React from "react";
import { Text, View, Pressable } from "react-native";
import { useTheme } from "@/lib/theme/theme-provider";
import { fontFamily } from "@/lib/theme/tokens";
import type { SimpleListItem } from "@/lib/simple-list";

type ItemRowProps = {
  item: SimpleListItem;
  showGroup: boolean;
  showDate: boolean;
  onToggleDone: () => void;
  onEdit: () => void;
  onDelete: () => void;
};

function formatDate(dateStr: string) {
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
}

export function ItemRow({ item, showGroup, showDate, onToggleDone, onEdit, onDelete }: ItemRowProps) {
  const { tokens } = useTheme();

  return (
    <View
      style={{
        backgroundColor: tokens.surface,
        borderColor: tokens.border,
        borderWidth: 1,
        borderRadius: 14,
        padding: 14,
        gap: 10,
        flexDirection: "row",
        alignItems: "flex-start",
      }}
    >
      <Pressable
        onPress={onToggleDone}
        hitSlop={8}
        style={{
          width: 24,
          height: 24,
          borderRadius: 12,
          borderWidth: 1.5,
          borderColor: item.done ? tokens.accent : tokens.border,
          backgroundColor: item.done ? tokens.accent : "transparent",
          alignItems: "center",
          justifyContent: "center",
          marginTop: 2,
        }}
      >
        {item.done ? <Text style={{ fontSize: 13, color: tokens.accentText }}>✓</Text> : null}
      </Pressable>

      <View style={{ flex: 1, gap: 4 }}>
        {showGroup && item.group_name ? (
          <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 11, color: tokens.accent }}>
            {item.group_name.toUpperCase()}
          </Text>
        ) : null}
        <Text
          style={{
            fontFamily: fontFamily.bodySemibold,
            fontSize: 15,
            color: item.done ? tokens.textMuted : tokens.text,
            textDecorationLine: item.done ? "line-through" : "none",
          }}
        >
          {item.title}
        </Text>
        {item.notes ? (
          <Text style={{ fontFamily: fontFamily.body, fontSize: 13, color: tokens.textMuted }}>
            {item.notes}
          </Text>
        ) : null}
        {showDate && item.item_date ? (
          <Text style={{ fontFamily: fontFamily.body, fontSize: 12, color: tokens.textMuted }}>
            📅 {formatDate(item.item_date)}
          </Text>
        ) : null}
      </View>

      <View style={{ gap: 10, alignItems: "flex-end" }}>
        <Pressable onPress={onEdit} hitSlop={8}>
          <Text style={{ fontFamily: fontFamily.body, fontSize: 13, color: tokens.accent }}>Editar</Text>
        </Pressable>
        <Pressable onPress={onDelete} hitSlop={8}>
          <Text style={{ fontFamily: fontFamily.body, fontSize: 13, color: tokens.textMuted }}>Excluir</Text>
        </Pressable>
      </View>
    </View>
  );
}
