import React, { useEffect, useState } from "react";
import { View } from "react-native";
import Constants from "expo-constants";

/**
 * Banner do AdMob — usa os IDs de teste do Google até você trocar pelos seus
 * de verdade em `app.json` (plugin `react-native-google-mobile-ads`) e aqui
 * embaixo (`PRODUCTION_AD_UNIT_ID`). Só carrega em builds de verdade: o
 * módulo nativo de anúncios não existe no Expo Go.
 */
const isExpoGo = Constants.appOwnership === "expo" || Constants.executionEnvironment === "storeClient";

// TROCAR pelo seu Ad Unit ID de banner de verdade (criado no console do AdMob) antes de publicar.
const PRODUCTION_AD_UNIT_ID = "ca-app-pub-3940256099942544/6300978111"; // ID de teste do Google

export function AdBanner() {
  const [Comp, setComp] = useState<React.ComponentType<any> | null>(null);
  const [adUnitId, setAdUnitId] = useState<string | null>(null);

  useEffect(() => {
    if (isExpoGo) return;
    let cancelled = false;
    (async () => {
      try {
        const mod = await import("react-native-google-mobile-ads");
        if (cancelled) return;
        const unitId = __DEV__ ? mod.TestIds.BANNER : PRODUCTION_AD_UNIT_ID;
        setAdUnitId(unitId);
        setComp(() => mod.BannerAd);
      } catch {
        // build ainda não tem o módulo de anúncios linkado — some silenciosamente
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!Comp || !adUnitId) return <View />;

  return (
    <View style={{ alignItems: "center" }}>
      <Comp unitId={adUnitId} size="BANNER" />
    </View>
  );
}
