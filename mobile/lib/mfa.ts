import { supabase } from "@/lib/supabase";

/**
 * Segunda camada de verificação no login (2FA por TOTP), usando o suporte nativo de MFA
 * do Supabase Auth — funciona com qualquer app autenticador (Google Authenticator, Authy,
 * 1Password etc.). Diferente do bloqueio por biometria (`lib/biometric-lock.ts`), que é
 * local ao aparelho e só protege quem já está com o app aberto e desbloqueado no celular,
 * isso protege a CONTA em si: mesmo com a senha em mãos, faltaria o código do app
 * autenticador pra completar o login — tanto no app quanto no site.
 *
 * Um login por senha sozinho deixa a sessão em "aal1". Com um fator TOTP verificado
 * cadastrado, falta subir pra "aal2" (via `verifyLoginCode`) antes do app liberar a
 * navegação — ver `lib/store/auth-store.ts` (`mfaPending`) e `app/(auth)/login.tsx`.
 */

export type TotpEnrollment = {
  factorId: string;
  /** SVG cru (não é data URI) — renderizar com `SvgXml` do `react-native-svg`. */
  qrCode: string;
  /** Pra digitar manualmente no app autenticador quando não dá pra escanear o QR code. */
  secret: string;
};

/** Fator TOTP já verificado (ativo) desta conta, se existir — ignora fatores ainda
 * pendentes de confirmação (cadastro começado e nunca terminado). */
export async function getVerifiedTotpFactor() {
  const { data, error } = await supabase.auth.mfa.listFactors();
  if (error) throw error;
  return data.totp.find((factor) => factor.status === "verified") ?? null;
}

/** Início do cadastro — gera o QR code. Não ativa nada sozinho: só depois de
 * `confirmTotpEnrollment` com um código válido é que o fator vira "verified". */
export async function startTotpEnrollment(): Promise<TotpEnrollment> {
  const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp" });
  if (error) throw error;
  return { factorId: data.id, qrCode: data.totp!.qr_code, secret: data.totp!.secret };
}

/** Confirma o cadastro com o código de 6 dígitos gerado pelo app autenticador. */
export async function confirmTotpEnrollment(factorId: string, code: string) {
  const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId });
  if (challengeError) throw challengeError;
  const { error: verifyError } = await supabase.auth.mfa.verify({
    factorId,
    challengeId: challenge.id,
    code,
  });
  if (verifyError) throw verifyError;
}

/** Desiste de um cadastro em andamento (fechou antes de confirmar o código) — sem isso, o
 * fator "unverified" ficaria pra sempre associado à conta sem nunca virar ativo. */
export async function cancelTotpEnrollment(factorId: string) {
  await supabase.auth.mfa.unenroll({ factorId }).catch(() => {});
}

/** Segunda etapa do login — confirma o código e eleva a sessão de aal1 pra aal2. O
 * Supabase atualiza a sessão sozinho ao verificar; o listener em `auth-store.ts` percebe
 * a mudança e libera a navegação. */
export async function verifyLoginCode(factorId: string, code: string) {
  const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId });
  if (challengeError) throw challengeError;
  const { error: verifyError } = await supabase.auth.mfa.verify({
    factorId,
    challengeId: challenge.id,
    code,
  });
  if (verifyError) throw verifyError;
}

/** Desativa a verificação em duas etapas. Só chega a esta tela depois de um login que já
 * passou pela segunda etapa (sessão em aal2 — exigido pelo Supabase pra remover um fator
 * já verificado), então não precisa pedir o código de novo aqui. */
export async function disableTotp(factorId: string) {
  const { error } = await supabase.auth.mfa.unenroll({ factorId });
  if (error) throw error;
}
