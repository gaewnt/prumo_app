import React from "react";
import { Redirect, Stack } from "expo-router";
import { useAuthStore } from "@/lib/store/auth-store";

/** Área autenticada: qualquer rota aqui dentro exige sessão ativa. */
export default function AppLayout() {
  const session = useAuthStore((s) => s.session);

  if (!session) return <Redirect href="/login" />;

  return <Stack screenOptions={{ headerShown: false }} />;
}
