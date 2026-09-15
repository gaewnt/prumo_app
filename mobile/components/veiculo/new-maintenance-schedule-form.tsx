import React, { useState } from "react";
import { Text, TextInput, View, Pressable, ActivityIndicator } from "react-native";
import { useTheme } from "@/lib/theme/theme-provider";
import { fontFamily } from "@/lib/theme/tokens";
import { MAINTENANCE_SCHEDULE_REMINDER_OPTIONS, type MaintenanceScheduleInput, type MaintenanceType } from "@/lib/veiculo";
import { MAINTENANCE_TYPE_LABELS } from "@/components/veiculo/format";

type NewMaintenanceScheduleFormProps = {
  onSubmit: (input: MaintenanceScheduleInput) => void;
  onCancel: () => void;
  isSaving: boolean;
  initial?: MaintenanceScheduleInput;
  submitLabel?: string;
};

const MAINTENANCE_TYPES = Object.keys(MAINTENANCE_TYPE_LABELS) as MaintenanceType[];

/** Mesmo padrão de data livre "DD/MM/AAAA" já usado em `new-maintenance-log-form.tsx`/
 * `new-deadline-form.tsx`. */
function parseBrDate(text: string): string | null {
  const match = text.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return null;
  const [, d, m, y] = match;
  return `${y}-${m}-${d}`;
}

function toBrDate(iso: string | null): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function parseNum(text: string): number | null {
  if (!text.trim()) return null;
  const n = Number(text.replace(",", "."));
  return Number.isFinite(n) && n > 0 ? n : null;
}

function numToText(n: number | null | undefined): string {
  return n != null ? String(n).replace(".", ",") : "";
}

/** Agenda a PRÓXIMA manutenção prevista — por data, por km, ou os dois (o que vencer
 * primeiro conta). Diferente do formulário de manutenção já feita: aqui não tem valor
 * pago, porque ainda não aconteceu. */
export function NewMaintenanceScheduleForm({
  onSubmit,
  onCancel,
  isSaving,
  initial,
  submitLabel,
}: NewMaintenanceScheduleFormProps) {
  const { tokens } = useTheme();
  const [tipo, setTipo] = useState<MaintenanceType>(initial?.tipo ?? "revisao");
  const [descricao, setDescricao] = useState(initial?.descricao ?? "");
  const [dateText, setDateText] = useState(toBrDate(initial?.dueDate ?? null));
  const [kmText, setKmText] = useState(numToText(initial?.dueKm));
  const [reminderDaysBefore, setReminderDaysBefore] = useState<number | null>(initial?.reminderDaysBefore ?? null);
  const [notes, setNotes] = useState(initial?.notes ?? "");

  const parsedDate = dateText.trim() ? parseBrDate(dateText) : null;
  const dateInvalid = dateText.trim().length > 0 && parsedDate === null;
  const km = parseNum(kmText);
  const hasDate = parsedDate !== null;
  const hasKm = km !== null;
  const isValid = (hasDate || hasKm) && !dateInvalid;

  const inputStyle = {
    fontFamily: fontFamily.body,
    fontSize: 15,
    color: tokens.text,
    backgroundColor: tokens.surfaceAlt,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  } as const;

  function handleSubmit() {
    if (!isValid) return;
    onSubmit({
      tipo,
      descricao: descricao.trim() || null,
      dueDate: parsedDate,
      dueKm: km,
      reminderDaysBefore: hasDate ? reminderDaysBefore : null,
      notes: notes.trim(),
    });
  }

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
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {MAINTENANCE_TYPES.map((t) => {
          const selected = tipo === t;
          return (
            <Pressable
              key={t}
              onPress={() => setTipo(t)}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 10,
                backgroundColor: selected ? tokens.accent : tokens.surfaceAlt,
              }}
            >
              <Text
                style={{
                  fontFamily: fontFamily.bodyMedium,
                  fontSize: 12.5,
                  color: selected ? tokens.accentText : tokens.text,
                }}
              >
                {MAINTENANCE_TYPE_LABELS[t]}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {tipo === "outro" ? (
        <TextInput
          value={descricao}
          onChangeText={setDescricao}
          placeholder="O que precisa ser feito"
          placeholderTextColor={tokens.textMuted}
          style={inputStyle}
        />
      ) : null}

      <View style={{ gap: 4 }}>
        <Text style={{ fontFamily: fontFamily.body, fontSize: 12, color: tokens.textMuted }}>
          Data prevista (opcional se preencher o km)
        </Text>
        <TextInput
          value={dateText}
          onChangeText={setDateText}
          placeholder="DD/MM/AAAA"
          placeholderTextColor={tokens.textMuted}
          keyboardType="numbers-and-punctuation"
          style={inputStyle}
        />
        {dateInvalid ? (
          <Text style={{ fontFamily: fontFamily.body, fontSize: 11.5, color: tokens.danger }}>
            Use o formato DD/MM/AAAA.
          </Text>
        ) : null}
      </View>

      <View style={{ gap: 4 }}>
        <Text style={{ fontFamily: fontFamily.body, fontSize: 12, color: tokens.textMuted }}>
          Km previsto (opcional se preencher a data)
        </Text>
        <TextInput
          value={kmText}
          onChangeText={setKmText}
          placeholder="Ex: 45000"
          placeholderTextColor={tokens.textMuted}
          keyboardType="decimal-pad"
          style={inputStyle}
        />
        <Text style={{ fontFamily: fontFamily.body, fontSize: 11.5, color: tokens.textMuted }}>
          Comparado com o km atual do cadastro do veículo — atualize-o de vez em quando pra
          isso continuar fazendo sentido.
        </Text>
      </View>

      {hasDate ? (
        <View style={{ gap: 6 }}>
          <Text style={{ fontFamily: fontFamily.body, fontSize: 12, color: tokens.textMuted }}>Lembrete</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {MAINTENANCE_SCHEDULE_REMINDER_OPTIONS.map((option) => {
              const selected = reminderDaysBefore === option.value;
              return (
                <Pressable
                  key={option.label}
                  onPress={() => setReminderDaysBefore(option.value)}
                  style={{
                    backgroundColor: selected ? tokens.accent : tokens.surfaceAlt,
                    borderRadius: 999,
                    paddingHorizontal: 12,
                    paddingVertical: 7,
                  }}
                >
                  <Text
                    style={{
                      fontFamily: fontFamily.bodyMedium,
                      fontSize: 12.5,
                      color: selected ? tokens.accentText : tokens.text,
                    }}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : null}

      <TextInput
        value={notes}
        onChangeText={setNotes}
        placeholder="Notas (opcional)"
        placeholderTextColor={tokens.textMuted}
        multiline
        style={[inputStyle, { minHeight: 48, textAlignVertical: "top" }]}
      />

      <View style={{ flexDirection: "row", gap: 8 }}>
        <Pressable onPress={onCancel} style={{ flex: 1, alignItems: "center", paddingVertical: 12 }}>
          <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 14, color: tokens.textMuted }}>
            Cancelar
          </Text>
        </Pressable>
        <Pressable
          onPress={handleSubmit}
          disabled={isSaving || !isValid}
          style={{
            flex: 1,
            backgroundColor: tokens.accent,
            borderRadius: 10,
            paddingVertical: 12,
            alignItems: "center",
            opacity: isSaving || !isValid ? 0.6 : 1,
          }}
        >
          {isSaving ? (
            <ActivityIndicator color={tokens.accentText} />
          ) : (
            <Text style={{ fontFamily: fontFamily.bodySemibold, fontSize: 14, color: tokens.accentText }}>
              {submitLabel ?? "Salvar"}
            </Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}
