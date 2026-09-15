import { create } from "zustand";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

type AuthState = {
  session: Session | null;
  /** true enquanto a sessão inicial ainda não foi carregada do storage */
  isLoading: boolean;
  /** true = existe um fator de verificação em duas etapas (TOTP) ativo na conta E a
   * sessão atual ainda não confirmou o código (login incompleto — ver `lib/mfa.ts`). Só
   * confiável depois que `isLoading` vira `false`. */
  mfaPending: boolean;
  setSession: (session: Session | null) => void;
  setMfaPending: (pending: boolean) => void;
  signOut: () => Promise<void>;
};

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  isLoading: true,
  mfaPending: false,
  setSession: (session) => set({ session }),
  setMfaPending: (mfaPending) => set({ mfaPending }),
  signOut: async () => {
    await supabase.auth.signOut();
    set({ session: null, mfaPending: false });
  },
}));

/** Sem sessão, não tem o que verificar. Com sessão, consulta o nível de garantia da
 * autenticação atual (`aal1`/`aal2`) — só existe `nextLevel: "aal2"` quando a conta tem um
 * fator TOTP verificado, e só nesse caso `currentLevel !== nextLevel` significa que o
 * login por senha já aconteceu mas o código da verificação em duas etapas ainda não foi
 * confirmado. */
async function refreshMfaPending(session: Session | null) {
  if (!session) {
    useAuthStore.getState().setMfaPending(false);
    return;
  }
  const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  const pending = !error && !!data && data.nextLevel === "aal2" && data.currentLevel !== data.nextLevel;
  useAuthStore.getState().setMfaPending(pending);
}

/**
 * Chamar uma vez, no root layout, pra manter a sessão sincronizada.
 *
 * `getSession()` só lê o que já está salvo no AsyncStorage do aparelho — não confirma
 * com o servidor se esse usuário ainda existe (ex: a conta foi apagada direto no painel
 * do Supabase). Sem essa confirmação, o app achava que a sessão antiga ainda era válida
 * e pulava a tela de login direto pras perguntas do onboarding, mesmo sem usuário nenhum
 * por trás. `getUser()` valida de verdade contra o servidor — se a conta não existir mais,
 * a sessão local é descartada e a pessoa cai no login.
 *
 * `isLoading` só vira `false` depois que `mfaPending` também já foi calculado pra sessão
 * inicial — evita uma primeira renderização que libera a navegação por uma fração de
 * segundo antes de perceber que falta a segunda etapa do login.
 */
export function bootstrapAuthListener() {
  supabase.auth.getSession().then(async ({ data }) => {
    if (!data.session) {
      useAuthStore.getState().setSession(null);
      await refreshMfaPending(null);
      useAuthStore.setState({ isLoading: false });
      return;
    }

    const { data: userData, error } = await supabase.auth.getUser();
    if (error || !userData.user) {
      await supabase.auth.signOut().catch(() => {});
      useAuthStore.getState().setSession(null);
      await refreshMfaPending(null);
      useAuthStore.setState({ isLoading: false });
      return;
    }

    useAuthStore.getState().setSession(data.session);
    await refreshMfaPending(data.session);
    useAuthStore.setState({ isLoading: false });
  });

  const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
    useAuthStore.getState().setSession(session);
    refreshMfaPending(session);
  });

  return () => subscription.subscription.unsubscribe();
}
