import React from "react";
import { Redirect, Stack } from "expo-router";
import { useAuthStore } from "@/lib/store/auth-store";

/** Quem já está logado não deve ver login/cadastro de novo. */
export default function AuthLayout() {
  const session = useAuthStore((s) => s.session);
  // Login por senha OK mas ainda falta o código da verificação em duas etapas (ver
  // `lib/mfa.ts`) — a sessão já existe, mas não deve liberar a navegação ainda. A própria
  // tela de login mostra a etapa de código nesse caso, então continua no Stack normalmente.
  const mfaPending = useAuthStore((s) => s.mfaPending);

  if (session && !mfaPending) return <Redirect href="/" />;

  return <Stack screenOptions={{ headerShown: false }} />;
}
