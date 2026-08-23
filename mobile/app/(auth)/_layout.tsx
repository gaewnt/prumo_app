import React from "react";
import { Redirect, Stack } from "expo-router";
import { useAuthStore } from "@/lib/store/auth-store";

/** Quem já está logado não deve ver login/cadastro de novo. */
export default function AuthLayout() {
  const session = useAuthStore((s) => s.session);

  if (session) return <Redirect href="/" />;

  return <Stack screenOptions={{ headerShown: false }} />;
}
