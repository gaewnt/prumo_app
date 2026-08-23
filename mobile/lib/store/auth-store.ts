import { create } from "zustand";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

type AuthState = {
  session: Session | null;
  /** true enquanto a sessão inicial ainda não foi carregada do storage */
  isLoading: boolean;
  setSession: (session: Session | null) => void;
  signOut: () => Promise<void>;
};

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  isLoading: true,
  setSession: (session) => set({ session, isLoading: false }),
  signOut: async () => {
    await supabase.auth.signOut();
    set({ session: null });
  },
}));

/**
 * Chamar uma vez, no root layout, pra manter a sessão sincronizada.
 *
 * `getSession()` só lê o que já está salvo no AsyncStorage do aparelho — não confirma
 * com o servidor se esse usuário ainda existe (ex: a conta foi apagada direto no painel
 * do Supabase). Sem essa confirmação, o app achava que a sessão antiga ainda era válida
 * e pulava a tela de login direto pras perguntas do onboarding, mesmo sem usuário nenhum
 * por trás. `getUser()` valida de verdade contra o servidor — se a conta não existir mais,
 * a sessão local é descartada e a pessoa cai no login.
 */
export function bootstrapAuthListener() {
  supabase.auth.getSession().then(async ({ data }) => {
    if (!data.session) {
      useAuthStore.getState().setSession(null);
      return;
    }

    const { data: userData, error } = await supabase.auth.getUser();
    if (error || !userData.user) {
      await supabase.auth.signOut().catch(() => {});
      useAuthStore.getState().setSession(null);
      return;
    }

    useAuthStore.getState().setSession(data.session);
  });

  const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
    useAuthStore.getState().setSession(session);
  });

  return () => subscription.subscription.unsubscribe();
}
