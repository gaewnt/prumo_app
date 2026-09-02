import React, { useEffect, useState } from "react";
import { Text, TextInput, View, Pressable, ActivityIndicator } from "react-native";
import { useRouter, Stack } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Screen } from "@/components/ui/screen";
import { useTheme } from "@/lib/theme/theme-provider";
import { fontFamily } from "@/lib/theme/tokens";
import { useAuthStore } from "@/lib/store/auth-store";
import { fetchActiveVehicle, upsertVehicle, type Vehicle, type VehicleSituacao, type VehicleCombustivel } from "@/lib/veiculo";
import { SITUACAO_LABELS, COMBUSTIVEL_LABELS } from "@/components/veiculo/format";

const SITUACAO_OPTIONS = Object.keys(SITUACAO_LABELS) as VehicleSituacao[];
const COMBUSTIVEL_OPTIONS = Object.keys(COMBUSTIVEL_LABELS) as VehicleCombustivel[];

function parseNum(text: string): number | null {
  if (!text.trim()) return null;
  const n = Number(text.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function toText(value: number | null | undefined): string {
  return value == null ? "" : String(value).replace(".", ",");
}

export default function VeiculoCadastroScreen() {
  const { tokens } = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.session?.user.id);

  const vehicleQuery = useQuery({
    queryKey: ["veiculo-active", userId],
    queryFn: fetchActiveVehicle,
    enabled: !!userId,
  });
  const existing = vehicleQuery.data ?? null;

  const [tipo, setTipo] = useState<"carro" | "moto">("carro");
  const [marca, setMarca] = useState("");
  const [modelo, setModelo] = useState("");
  const [anoText, setAnoText] = useState("");
  const [situacao, setSituacao] = useState<VehicleSituacao>("proprio");
  const [combustivel, setCombustivel] = useState<VehicleCombustivel>("flex");
  const [consumoText, setConsumoText] = useState("");
  const [kmAtualText, setKmAtualText] = useState("");

  const [kmMesText, setKmMesText] = useState("");
  const [precoCombustivelText, setPrecoCombustivelText] = useState("");
  const [parcelaText, setParcelaText] = useState("");
  const [vencimentoDiaText, setVencimentoDiaText] = useState("");
  const [parcelasRestantesText, setParcelasRestantesText] = useState("");
  const [seguroText, setSeguroText] = useState("");
  const [valorVeiculoText, setValorVeiculoText] = useState("");
  const [ipvaText, setIpvaText] = useState("");

  const [custosPessoaisText, setCustosPessoaisText] = useState("");
  const [lucroDesejadoText, setLucroDesejadoText] = useState("");

  // Prefill quando o veículo existente carrega — modo edição.
  useEffect(() => {
    if (!existing) return;
    setTipo(existing.tipo);
    setMarca(existing.marca ?? "");
    setModelo(existing.modelo ?? "");
    setAnoText(existing.ano != null ? String(existing.ano) : "");
    setSituacao(existing.situacao ?? "proprio");
    setCombustivel(existing.combustivel ?? "flex");
    setConsumoText(toText(existing.consumo_medio));
    setKmAtualText(existing.km_atual != null ? String(existing.km_atual) : "");
    setKmMesText(existing.km_rodados_mes != null ? String(existing.km_rodados_mes) : "");
    setPrecoCombustivelText(toText(existing.preco_combustivel));
    setParcelaText(toText(existing.financiamento_parcela));
    setVencimentoDiaText(existing.financiamento_vencimento_dia != null ? String(existing.financiamento_vencimento_dia) : "");
    setParcelasRestantesText(
      existing.financiamento_parcelas_restantes != null ? String(existing.financiamento_parcelas_restantes) : ""
    );
    setSeguroText(toText(existing.seguro_mensal));
    setValorVeiculoText(toText(existing.valor_veiculo));
    setIpvaText(toText(existing.ipva_anual));
    setCustosPessoaisText(toText(existing.custos_pessoais_mes));
    setLucroDesejadoText(toText(existing.lucro_desejado_mes));
  }, [existing]);

  const saveMutation = useMutation({
    mutationFn: (fields: Partial<Vehicle>) => upsertVehicle(userId!, existing?.id ?? null, fields),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["veiculo-active", userId] });
      router.back();
    },
  });

  function handleSubmit() {
    saveMutation.mutate({
      tipo,
      marca: marca.trim() || null,
      modelo: modelo.trim() || null,
      ano: parseNum(anoText),
      situacao,
      combustivel,
      consumo_medio: parseNum(consumoText),
      km_atual: parseNum(kmAtualText),
      km_rodados_mes: parseNum(kmMesText),
      preco_combustivel: parseNum(precoCombustivelText),
      financiamento_parcela: situacao === "financiado" ? parseNum(parcelaText) : null,
      financiamento_vencimento_dia: situacao === "financiado" ? parseNum(vencimentoDiaText) : null,
      financiamento_parcelas_restantes: situacao === "financiado" ? parseNum(parcelasRestantesText) : null,
      seguro_mensal: parseNum(seguroText),
      valor_veiculo: parseNum(valorVeiculoText),
      ipva_anual: parseNum(ipvaText),
      custos_pessoais_mes: parseNum(custosPessoaisText),
      lucro_desejado_mes: parseNum(lucroDesejadoText),
    });
  }

  const inputStyle = {
    fontFamily: fontFamily.body,
    fontSize: 15,
    color: tokens.text,
    backgroundColor: tokens.surfaceAlt,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  } as const;

  function fieldLabel(text: string) {
    return (
      <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 12.5, color: tokens.textMuted }}>{text}</Text>
    );
  }

  function pillGroup<T extends string>(options: T[], selected: T, onSelect: (v: T) => void, labels: Record<T, string>) {
    return (
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {options.map((option) => {
          const active = option === selected;
          return (
            <Pressable
              key={option}
              onPress={() => onSelect(option)}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 10,
                backgroundColor: active ? tokens.accent : tokens.surfaceAlt,
              }}
            >
              <Text
                style={{
                  fontFamily: fontFamily.bodyMedium,
                  fontSize: 12.5,
                  color: active ? tokens.accentText : tokens.text,
                }}
              >
                {labels[option]}
              </Text>
            </Pressable>
          );
        })}
      </View>
    );
  }

  const isSectionLoading = vehicleQuery.isLoading;

  return (
    <Screen scroll>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={{ gap: 20 }}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 14, color: tokens.accent }}>
            ← Voltar
          </Text>
        </Pressable>

        <View style={{ gap: 4 }}>
          <Text style={{ fontSize: 32 }}>🔧</Text>
          <Text style={{ fontFamily: fontFamily.display, fontSize: 26, color: tokens.text }}>
            {existing ? "Editar veículo" : "Cadastrar veículo"}
          </Text>
          <Text style={{ fontFamily: fontFamily.body, fontSize: 15, color: tokens.textMuted }}>
            Esses dados alimentam o cálculo de custo por km/hora e o painel de faturamento.
          </Text>
        </View>

        {isSectionLoading ? (
          <ActivityIndicator color={tokens.accent} />
        ) : (
          <View style={{ gap: 16 }}>
            <View style={{ gap: 12 }}>
              <Text style={{ fontFamily: fontFamily.bodySemibold, fontSize: 15, color: tokens.text }}>
                Dados do veículo
              </Text>

              <View style={{ flexDirection: "row", gap: 8 }}>
                {(["carro", "moto"] as const).map((t) => {
                  const active = tipo === t;
                  return (
                    <Pressable
                      key={t}
                      onPress={() => setTipo(t)}
                      style={{
                        flex: 1,
                        paddingVertical: 10,
                        borderRadius: 10,
                        alignItems: "center",
                        backgroundColor: active ? tokens.accent : tokens.surfaceAlt,
                      }}
                    >
                      <Text
                        style={{
                          fontFamily: fontFamily.bodyMedium,
                          fontSize: 13,
                          color: active ? tokens.accentText : tokens.textMuted,
                        }}
                      >
                        {t === "carro" ? "🚗 Carro" : "🏍️ Moto"}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <View style={{ gap: 6 }}>
                {fieldLabel("Marca")}
                <TextInput
                  value={marca}
                  onChangeText={setMarca}
                  placeholder="Ex: Honda, Chevrolet"
                  placeholderTextColor={tokens.textMuted}
                  style={inputStyle}
                />
              </View>

              <View style={{ gap: 6 }}>
                {fieldLabel("Modelo")}
                <TextInput
                  value={modelo}
                  onChangeText={setModelo}
                  placeholder="Ex: Civic, Onix"
                  placeholderTextColor={tokens.textMuted}
                  style={inputStyle}
                />
              </View>

              <View style={{ gap: 6 }}>
                {fieldLabel("Ano")}
                <TextInput
                  value={anoText}
                  onChangeText={setAnoText}
                  placeholder="Ex: 2020"
                  placeholderTextColor={tokens.textMuted}
                  keyboardType="number-pad"
                  style={inputStyle}
                />
              </View>

              <View style={{ gap: 6 }}>
                {fieldLabel("Situação")}
                {pillGroup(SITUACAO_OPTIONS, situacao, setSituacao, SITUACAO_LABELS)}
              </View>

              <View style={{ gap: 6 }}>
                {fieldLabel("Combustível")}
                {pillGroup(COMBUSTIVEL_OPTIONS, combustivel, setCombustivel, COMBUSTIVEL_LABELS)}
              </View>

              <View style={{ flexDirection: "row", gap: 10 }}>
                <View style={{ flex: 1, gap: 6 }}>
                  {fieldLabel("Consumo médio km/L (opcional)")}
                  <TextInput
                    value={consumoText}
                    onChangeText={setConsumoText}
                    placeholder="Ex: 12,5"
                    placeholderTextColor={tokens.textMuted}
                    keyboardType="decimal-pad"
                    style={inputStyle}
                  />
                </View>
                <View style={{ flex: 1, gap: 6 }}>
                  {fieldLabel("Km atual (opcional)")}
                  <TextInput
                    value={kmAtualText}
                    onChangeText={setKmAtualText}
                    placeholder="Ex: 45000"
                    placeholderTextColor={tokens.textMuted}
                    keyboardType="number-pad"
                    style={inputStyle}
                  />
                </View>
              </View>
            </View>

            <View style={{ gap: 12 }}>
              <Text style={{ fontFamily: fontFamily.bodySemibold, fontSize: 15, color: tokens.text }}>
                Custos
              </Text>

              <View style={{ flexDirection: "row", gap: 10 }}>
                <View style={{ flex: 1, gap: 6 }}>
                  {fieldLabel("Km rodados/mês")}
                  <TextInput
                    value={kmMesText}
                    onChangeText={setKmMesText}
                    placeholder="Ex: 3000"
                    placeholderTextColor={tokens.textMuted}
                    keyboardType="decimal-pad"
                    style={inputStyle}
                  />
                </View>
                <View style={{ flex: 1, gap: 6 }}>
                  {fieldLabel("Preço combustível R$/L")}
                  <TextInput
                    value={precoCombustivelText}
                    onChangeText={setPrecoCombustivelText}
                    placeholder="Ex: 5,89"
                    placeholderTextColor={tokens.textMuted}
                    keyboardType="decimal-pad"
                    style={inputStyle}
                  />
                </View>
              </View>

              {situacao === "financiado" ? (
                <View style={{ gap: 10 }}>
                  <View style={{ gap: 6 }}>
                    {fieldLabel("Valor da parcela")}
                    <TextInput
                      value={parcelaText}
                      onChangeText={setParcelaText}
                      placeholder="Ex: 890,00"
                      placeholderTextColor={tokens.textMuted}
                      keyboardType="decimal-pad"
                      style={inputStyle}
                    />
                  </View>
                  <View style={{ flexDirection: "row", gap: 10 }}>
                    <View style={{ flex: 1, gap: 6 }}>
                      {fieldLabel("Dia de vencimento")}
                      <TextInput
                        value={vencimentoDiaText}
                        onChangeText={setVencimentoDiaText}
                        placeholder="Ex: 10"
                        placeholderTextColor={tokens.textMuted}
                        keyboardType="number-pad"
                        style={inputStyle}
                      />
                    </View>
                    <View style={{ flex: 1, gap: 6 }}>
                      {fieldLabel("Parcelas restantes")}
                      <TextInput
                        value={parcelasRestantesText}
                        onChangeText={setParcelasRestantesText}
                        placeholder="Ex: 24"
                        placeholderTextColor={tokens.textMuted}
                        keyboardType="number-pad"
                        style={inputStyle}
                      />
                    </View>
                  </View>
                </View>
              ) : null}

              <View style={{ gap: 6 }}>
                {fieldLabel("Seguro mensal")}
                <TextInput
                  value={seguroText}
                  onChangeText={setSeguroText}
                  placeholder="Ex: 150,00"
                  placeholderTextColor={tokens.textMuted}
                  keyboardType="decimal-pad"
                  style={inputStyle}
                />
              </View>

              <View style={{ gap: 6 }}>
                {fieldLabel("Valor do veículo")}
                <TextInput
                  value={valorVeiculoText}
                  onChangeText={setValorVeiculoText}
                  placeholder="Ex: 60000,00"
                  placeholderTextColor={tokens.textMuted}
                  keyboardType="decimal-pad"
                  style={inputStyle}
                />
              </View>

              <View style={{ gap: 6 }}>
                {fieldLabel("IPVA anual")}
                <TextInput
                  value={ipvaText}
                  onChangeText={setIpvaText}
                  placeholder="Ex: 1200,00 (deixe em branco se não souber ainda)"
                  placeholderTextColor={tokens.textMuted}
                  keyboardType="decimal-pad"
                  style={inputStyle}
                />
              </View>
            </View>

            <View style={{ gap: 12 }}>
              <View style={{ gap: 2 }}>
                <Text style={{ fontFamily: fontFamily.bodySemibold, fontSize: 15, color: tokens.text }}>
                  Meta financeira (opcional)
                </Text>
                <Text style={{ fontFamily: fontFamily.body, fontSize: 12, color: tokens.textMuted }}>
                  Usada pra calcular o progresso da meta mensal no painel.
                </Text>
              </View>

              <View style={{ gap: 6 }}>
                {fieldLabel("Custos pessoais médios/mês")}
                <TextInput
                  value={custosPessoaisText}
                  onChangeText={setCustosPessoaisText}
                  placeholder="Ex: 2500,00"
                  placeholderTextColor={tokens.textMuted}
                  keyboardType="decimal-pad"
                  style={inputStyle}
                />
              </View>

              <View style={{ gap: 6 }}>
                {fieldLabel("Lucro desejado/mês")}
                <TextInput
                  value={lucroDesejadoText}
                  onChangeText={setLucroDesejadoText}
                  placeholder="Ex: 1500,00"
                  placeholderTextColor={tokens.textMuted}
                  keyboardType="decimal-pad"
                  style={inputStyle}
                />
              </View>
            </View>

            <Pressable
              onPress={handleSubmit}
              disabled={saveMutation.isPending}
              style={{
                backgroundColor: tokens.accent,
                borderRadius: 10,
                paddingVertical: 14,
                alignItems: "center",
                opacity: saveMutation.isPending ? 0.6 : 1,
              }}
            >
              {saveMutation.isPending ? (
                <ActivityIndicator color={tokens.accentText} />
              ) : (
                <Text style={{ fontFamily: fontFamily.bodySemibold, fontSize: 15, color: tokens.accentText }}>
                  {existing ? "Salvar alterações" : "Cadastrar veículo"}
                </Text>
              )}
            </Pressable>

            {saveMutation.isError ? (
              <Text style={{ fontFamily: fontFamily.body, fontSize: 13, color: tokens.danger }}>
                Não deu pra salvar agora. Tente de novo em instantes.
              </Text>
            ) : null}
          </View>
        )}
      </View>
    </Screen>
  );
}
