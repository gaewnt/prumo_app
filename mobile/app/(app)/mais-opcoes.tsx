import React, { useState } from "react";
import { Text, View, Pressable, Share } from "react-native";
import { useRouter, Stack } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Screen } from "@/components/ui/screen";
import { useTheme } from "@/lib/theme/theme-provider";
import { fontFamily } from "@/lib/theme/tokens";
import { useAuthStore } from "@/lib/store/auth-store";
import { fetchFinancas, formatCurrency } from "@/lib/financas";
import { fetchEstudos } from "@/lib/estudos";
import { fetchActiveVehicle, fetchFuelLogs, fetchMaintenanceLogs } from "@/lib/veiculo";
import { MAINTENANCE_TYPE_LABELS } from "@/components/veiculo/format";
import { fetchSaude, APPOINTMENT_KIND_LABELS } from "@/lib/saude";

type Tab = "gerenciar" | "geral" | "sobre";

function Card({ children }: { children: React.ReactNode }) {
  const { tokens } = useTheme();
  return (
    <View style={{ backgroundColor: tokens.surface, borderColor: tokens.border, borderWidth: 1, borderRadius: 14 }}>
      {children}
    </View>
  );
}

function OptionRow({
  icon,
  label,
  onPress,
  disabledNote,
  isFirst,
}: {
  icon: string;
  label: string;
  onPress?: () => void;
  disabledNote?: string;
  isFirst?: boolean;
}) {
  const { tokens } = useTheme();
  const content = (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingHorizontal: 14,
        paddingVertical: 14,
        borderTopWidth: isFirst ? 0 : 1,
        borderTopColor: tokens.border,
        opacity: disabledNote ? 0.55 : 1,
      }}
    >
      <Text style={{ fontSize: 18 }}>{icon}</Text>
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: fontFamily.body, fontSize: 14, color: tokens.text }}>{label}</Text>
        {disabledNote ? (
          <Text style={{ fontFamily: fontFamily.body, fontSize: 11.5, color: tokens.textMuted, marginTop: 2 }}>
            {disabledNote}
          </Text>
        ) : null}
      </View>
      {onPress && !disabledNote ? <Text style={{ fontSize: 18, color: tokens.textMuted }}>›</Text> : null}
    </View>
  );
  return onPress && !disabledNote ? <Pressable onPress={onPress}>{content}</Pressable> : content;
}

/** "Mais opções" do Mobills, adaptado ao que o Prumo tem de verdade por baixo — algumas
 * entradas da referência (Modo viagem, Cards da tela inicial, Importar dados) não têm
 * equivalente na arquitetura atual e ficam marcadas como indisponíveis em vez de escondidas,
 * pra deixar claro que foram consideradas e não esquecidas. */
export default function MaisOpcoesScreen() {
  const { tokens } = useTheme();
  const router = useRouter();
  const userId = useAuthStore((s) => s.session?.user.id);
  const [tab, setTab] = useState<Tab>("gerenciar");

  const financasQuery = useQuery({
    queryKey: ["financas", userId],
    queryFn: fetchFinancas,
    enabled: !!userId,
  });

  // Consultas usadas só na exportação em CSV dos outros módulos — como essa tela é pouco
  // acessada, não tem problema buscar tudo aqui em vez de reaproveitar as queries das telas
  // de cada módulo (que não estão montadas quando "Mais opções" está aberta).
  const estudosQuery = useQuery({
    queryKey: ["estudos", userId],
    queryFn: fetchEstudos,
    enabled: !!userId,
  });
  const vehicleQuery = useQuery({
    queryKey: ["veiculo-ativo", userId],
    queryFn: fetchActiveVehicle,
    enabled: !!userId,
  });
  const vehicleId = vehicleQuery.data?.id;
  const fuelLogsQuery = useQuery({
    queryKey: ["veiculo-abastecimentos", vehicleId],
    queryFn: () => fetchFuelLogs(vehicleId!),
    enabled: !!vehicleId,
  });
  const maintenanceLogsQuery = useQuery({
    queryKey: ["veiculo-manutencoes", vehicleId],
    queryFn: () => fetchMaintenanceLogs(vehicleId!),
    enabled: !!vehicleId,
  });
  const saudeQuery = useQuery({
    queryKey: ["saude", userId],
    queryFn: fetchSaude,
    enabled: !!userId,
  });

  async function shareCsv(header: string, rows: string[], title: string) {
    const csv = [header, ...rows].join("\n");
    try {
      await Share.share({ message: csv, title });
    } catch {
      // pessoa cancelou o compartilhamento — não precisa de tratamento especial
    }
  }

  async function handleExportar() {
    const transactions = financasQuery.data?.transactions ?? [];
    const header = "data,tipo,categoria,descricao,valor";
    const rows = transactions.map((t) => {
      const tipo = t.kind === "income" ? "receita" : t.kind === "expense" ? "despesa" : "transferencia";
      const descricao = (t.description ?? "").replace(/,/g, ";");
      return `${t.occurred_at},${tipo},${t.category},${descricao},${t.amount}`;
    });
    await shareCsv(header, rows, "Relatório Prumo — Finanças (CSV)");
  }

  async function handleExportarEstudos() {
    const sessions = estudosQuery.data?.sessions ?? [];
    const subjects = estudosQuery.data?.subjects ?? [];
    const subjectName = new Map(subjects.map((s) => [s.id, s.name]));
    const header = "data,materia,minutos";
    const rows = sessions.map((s) => {
      const materia = (subjectName.get(s.subject_id) ?? "—").replace(/,/g, ";");
      return `${s.session_date},${materia},${s.duration_minutes}`;
    });
    await shareCsv(header, rows, "Relatório Prumo — Estudos (CSV)");
  }

  async function handleExportarVeiculo() {
    const fuelLogs = fuelLogsQuery.data ?? [];
    const maintenanceLogs = maintenanceLogsQuery.data ?? [];
    const header = "data,tipo,descricao,valor";
    const fuelRows = fuelLogs.map((f) => {
      const descricao = `${f.litros} litros${f.tanque_cheio ? " · tanque cheio" : ""} · ${f.km_atual} km`;
      return `${f.abastecido_em},abastecimento,${descricao},${f.valor_total}`;
    });
    const maintenanceRows = maintenanceLogs.map((m) => {
      const descricao = `${MAINTENANCE_TYPE_LABELS[m.tipo]}${m.descricao ? ` — ${m.descricao.replace(/,/g, ";")}` : ""}`;
      return `${m.realizado_em},manutencao,${descricao},${m.valor}`;
    });
    const rows = [...fuelRows, ...maintenanceRows].sort((a, b) => a.localeCompare(b));
    await shareCsv(header, rows, "Relatório Prumo — Veículo (CSV)");
  }

  async function handleExportarSaude() {
    const appointments = saudeQuery.data?.appointments ?? [];
    const medications = saudeQuery.data?.medications ?? [];
    const medicationLogs = saudeQuery.data?.medicationLogs ?? [];
    const medicationName = new Map(medications.map((m) => [m.id, m.name]));
    const header = "data,tipo,descricao,status";
    const appointmentRows = appointments.map((a) => {
      const data = a.scheduled_at.slice(0, 10);
      const descricao = `${a.title}${a.professional ? ` · ${a.professional}` : ""}`.replace(/,/g, ";");
      return `${data},${APPOINTMENT_KIND_LABELS[a.kind]},${descricao},${a.completed_at ? "concluída" : "agendada"}`;
    });
    const medicationRows = medicationLogs.map((l) => {
      const descricao = (medicationName.get(l.medication_id) ?? "—").replace(/,/g, ";");
      return `${l.log_date},medicamento,${descricao},${l.taken_at ? "tomado" : "pendente"}`;
    });
    const rows = [...appointmentRows, ...medicationRows].sort((a, b) => a.localeCompare(b));
    await shareCsv(header, rows, "Relatório Prumo — Saúde (CSV)");
  }

  async function handleConvidar() {
    try {
      await Share.share({
        message:
          "Tô usando o Prumo pra organizar minha vida — finanças, rotina, treino e muito mais num só app.",
      });
    } catch {
      // cancelado
    }
  }

  return (
    <Screen scroll>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={{ gap: 20 }}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 14, color: tokens.accent }}>
            ← Voltar
          </Text>
        </Pressable>

        <Text style={{ fontFamily: fontFamily.display, fontSize: 26, color: tokens.text }}>
          Mais opções
        </Text>

        <View style={{ flexDirection: "row", gap: 8 }}>
          {(
            [
              { key: "gerenciar" as const, label: "Gerenciar" },
              { key: "geral" as const, label: "Geral" },
              { key: "sobre" as const, label: "Sobre" },
            ]
          ).map((t) => {
            const selected = tab === t.key;
            return (
              <Pressable
                key={t.key}
                onPress={() => setTab(t.key)}
                style={{
                  flex: 1,
                  paddingVertical: 10,
                  borderRadius: 10,
                  alignItems: "center",
                  backgroundColor: selected ? tokens.accent : tokens.surfaceAlt,
                }}
              >
                <Text
                  style={{
                    fontFamily: fontFamily.bodyMedium,
                    fontSize: 13,
                    color: selected ? tokens.accentText : tokens.textMuted,
                  }}
                >
                  {t.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {tab === "gerenciar" ? (
          <View style={{ gap: 16 }}>
            <Card>
              <OptionRow icon="🏦" label="Contas" onPress={() => router.push("/modulo/financas-contas")} isFirst />
              <OptionRow icon="💳" label="Cartão de crédito" onPress={() => router.push("/modulo/financas-cartao")} />
              <OptionRow icon="🗂️" label="Categorias" onPress={() => router.push("/modulo/financas-categorias")} />
              <OptionRow icon="🏷️" label="Tags" onPress={() => router.push("/modulo/financas-tags")} />
              <OptionRow icon="🎯" label="Objetivos" onPress={() => router.push("/modulo/financas-metas")} />
            </Card>
            <Card>
              <OptionRow icon="📤" label="Exportar Finanças (CSV)" onPress={handleExportar} isFirst />
              <OptionRow icon="📚" label="Exportar Estudos (CSV)" onPress={handleExportarEstudos} />
              <OptionRow icon="🚗" label="Exportar Veículo (CSV)" onPress={handleExportarVeiculo} />
              <OptionRow icon="🩺" label="Exportar Saúde (CSV)" onPress={handleExportarSaude} />
              <OptionRow
                icon="📥"
                label="Importar extrato (CSV/OFX)"
                onPress={() => router.push("/importar-extrato")}
              />
              <OptionRow
                icon="📱"
                label="Cards da tela inicial"
                disabledNote="Widget nativo — fora do alcance das ferramentas do Expo por enquanto."
              />
              <OptionRow
                icon="✈️"
                label="Modo viagem"
                disabledNote="Sem equivalente direto no Prumo hoje."
              />
              <OptionRow
                icon="⏰"
                label="Lembretes de registro e bem-estar"
                onPress={() => router.push("/configuracoes")}
              />
            </Card>
          </View>
        ) : null}

        {tab === "geral" ? (
          <View style={{ gap: 16 }}>
            <Card>
              <OptionRow icon="📊" label="Planejamento mensal" onPress={() => router.push("/modulo/financas-orcamento")} isFirst />
              <OptionRow icon="📈" label="Gráficos e balanço do mês" onPress={() => router.push("/modulo/financas")} />
            </Card>
            <Text style={{ fontFamily: fontFamily.body, fontSize: 12.5, color: tokens.textMuted }}>
              "Meu desempenho" e "Calendário" da referência já aparecem direto na tela principal de
              Finanças (fluxo de caixa e gasto por categoria) — não duplicamos como telas separadas.
            </Text>
          </View>
        ) : null}

        {tab === "sobre" ? (
          <View style={{ gap: 16 }}>
            <Card>
              <OptionRow icon="📣" label="Convide amigos" onPress={handleConvidar} isFirst />
              <OptionRow icon="⭐" label="Avaliar agora" disabledNote="O Prumo ainda não está publicado nas lojas." />
              <OptionRow icon="📄" label="Termos de uso" disabledNote="Ainda não publicado." />
              <OptionRow icon="💬" label="Central de ajuda" disabledNote="Ainda não existe — por enquanto, fale direto com quem constrói o app." />
            </Card>
            <View style={{ alignItems: "center", gap: 4, paddingVertical: 12 }}>
              <Text style={{ fontFamily: fontFamily.display, fontSize: 20, color: tokens.text }}>Prumo</Text>
              <Text style={{ fontFamily: fontFamily.body, fontSize: 13, color: tokens.textMuted }}>
                Sua vida em prumo.
              </Text>
              <Text style={{ fontFamily: fontFamily.body, fontSize: 12, color: tokens.textMuted, marginTop: 6 }}>
                Versão 1.0.0
              </Text>
            </View>
          </View>
        ) : null}
      </View>
    </Screen>
  );
}
