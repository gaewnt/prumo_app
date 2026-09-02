// Edge Function que dispara o lembrete diário de lançamento via Web Push, pra
// funcionar de verdade na versão site (Netlify). `expo-notifications` (usado no app
// instalado) não existe na web; aqui é implementado o protocolo Web Push "de verdade"
// (RFC 8291 — criptografia aes128gcm — e RFC 8292 — autenticação VAPID), só com a Web
// Crypto API padrão (`crypto.subtle`), sem depender de nenhuma lib externa — evita
// arriscar compatibilidade de pacote `npm:` de criptografia dentro do runtime Deno das
// Edge Functions.
//
// Chamada a cada minuto por um agendador `pg_cron` (ver migration `0025_web_push_cron.sql`)
// — a função decide sozinha, a cada chamada, se algum lembrete deve disparar agora.
//
// Variáveis de ambiente necessárias (configurar com `supabase secrets set`, ver diário):
// - SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY — injetadas automaticamente pelo runtime.
// - VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY — par de chaves gerado uma única vez (não muda).
// - VAPID_SUBJECT (opcional) — "mailto:algum@email.com", identifica quem manda a
//   notificação pros serviços de push (Chrome/Firefox/etc); usa um padrão se não setar.

import { createClient } from "npm:@supabase/supabase-js@2";

const textEncoder = new TextEncoder();

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function concatBytes(...arrs: Uint8Array[]): Uint8Array {
  const total = arrs.reduce((sum, a) => sum + a.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const a of arrs) {
    out.set(a, offset);
    offset += a.length;
  }
  return out;
}

function base64UrlToBytes(b64url: string): Uint8Array {
  const b64 = b64url.replace(/-/g, "+").replace(/_/g, "/");
  const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
  const bin = atob(padded);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  const b64 = btoa(bin);
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function hmacSha256(key: Uint8Array, data: Uint8Array): Promise<Uint8Array> {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    key,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, data);
  return new Uint8Array(sig);
}

/** HKDF-Expand de um único bloco — suficiente aqui porque nunca pedimos mais que os 32
 * bytes de saída do SHA-256 (RFC 5869 §2.3: com L <= tamanho do hash, basta T(1)). */
async function hkdfExpandOne(prk: Uint8Array, info: Uint8Array, length: number): Promise<Uint8Array> {
  const input = concatBytes(info, new Uint8Array([1]));
  const t = await hmacSha256(prk, input);
  return t.slice(0, length);
}

/**
 * Criptografa o payload no formato "aes128gcm" (RFC 8188) usando a chave pública/segredo
 * de autenticação da inscrição do navegador (RFC 8291 — Message Encryption for Web Push).
 * Devolve o corpo binário pronto pra mandar pro endpoint do serviço de push.
 */
async function encryptPayload(
  payload: Uint8Array,
  receiverPublicKeyB64: string,
  authSecretB64: string
): Promise<Uint8Array> {
  const receiverPublicKeyBytes = base64UrlToBytes(receiverPublicKeyB64);
  const authSecret = base64UrlToBytes(authSecretB64);

  const localKeyPair = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveBits"]
  );
  const localPublicKeyRaw = new Uint8Array(
    await crypto.subtle.exportKey("raw", localKeyPair.publicKey)
  );

  const receiverKey = await crypto.subtle.importKey(
    "raw",
    receiverPublicKeyBytes,
    { name: "ECDH", namedCurve: "P-256" },
    false,
    []
  );
  const sharedSecretBits = await crypto.subtle.deriveBits(
    { name: "ECDH", public: receiverKey } as EcdhKeyDeriveParams,
    localKeyPair.privateKey,
    256
  );
  const sharedSecret = new Uint8Array(sharedSecretBits);

  // RFC 8291 §3.3 — combina o segredo ECDH com o `auth` da inscrição.
  const prkKey = await hmacSha256(authSecret, sharedSecret);
  const keyInfo = concatBytes(
    textEncoder.encode("WebPush: info"),
    new Uint8Array([0]),
    receiverPublicKeyBytes,
    localPublicKeyRaw
  );
  const ikm = await hkdfExpandOne(prkKey, keyInfo, 32);

  // RFC 8188 — content-coding aes128gcm, agora com o salt aleatório desta mensagem.
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const prk2 = await hmacSha256(salt, ikm);
  const cek = await hkdfExpandOne(
    prk2,
    concatBytes(textEncoder.encode("Content-Encoding: aes128gcm"), new Uint8Array([0])),
    16
  );
  const nonce = await hkdfExpandOne(
    prk2,
    concatBytes(textEncoder.encode("Content-Encoding: nonce"), new Uint8Array([0])),
    12
  );

  // Registro único (mensagem pequena, sem precisar de mais de um bloco) — delimitador
  // 0x02 marca "último registro, sem padding" (RFC 8188 §2).
  const plaintext = concatBytes(payload, new Uint8Array([2]));
  const cekKey = await crypto.subtle.importKey("raw", cek, { name: "AES-GCM" }, false, ["encrypt"]);
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, cekKey, plaintext)
  );

  const recordSize = 4096;
  const header = new Uint8Array(16 + 4 + 1 + localPublicKeyRaw.length);
  header.set(salt, 0);
  new DataView(header.buffer).setUint32(16, recordSize, false);
  header[20] = localPublicKeyRaw.length;
  header.set(localPublicKeyRaw, 21);

  return concatBytes(header, ciphertext);
}

/** Monta o cabeçalho `Authorization: vapid t=<JWT>, k=<chave pública>` (RFC 8292). */
async function buildVapidHeader(
  endpoint: string,
  vapidPublicKeyB64: string,
  vapidPrivateKeyB64: string,
  subject: string
): Promise<string> {
  const url = new URL(endpoint);
  const aud = `${url.protocol}//${url.host}`;
  const header = { typ: "JWT", alg: "ES256" };
  const exp = Math.floor(Date.now() / 1000) + 12 * 3600;
  const payload = { aud, exp, sub: subject };
  const headerB64 = bytesToBase64Url(textEncoder.encode(JSON.stringify(header)));
  const payloadB64 = bytesToBase64Url(textEncoder.encode(JSON.stringify(payload)));
  const signingInput = `${headerB64}.${payloadB64}`;

  const pubBytes = base64UrlToBytes(vapidPublicKeyB64);
  const x = pubBytes.slice(1, 33);
  const y = pubBytes.slice(33, 65);
  const d = base64UrlToBytes(vapidPrivateKeyB64);

  const jwk = {
    kty: "EC",
    crv: "P-256",
    x: bytesToBase64Url(x),
    y: bytesToBase64Url(y),
    d: bytesToBase64Url(d),
    ext: true,
  };
  const key = await crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  );
  // Web Crypto já devolve a assinatura ECDSA no formato "raw" (r||s, 64 bytes) — é
  // exatamente o formato que JWT ES256 espera, sem precisar converter de DER.
  const sigBuf = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    key,
    textEncoder.encode(signingInput)
  );
  const sigB64 = bytesToBase64Url(new Uint8Array(sigBuf));
  return `vapid t=${signingInput}.${sigB64}, k=${vapidPublicKeyB64}`;
}

type PushSubscriptionRow = { endpoint: string; p256dh: string; auth: string };

async function sendWebPush(
  subscription: PushSubscriptionRow,
  payload: Record<string, unknown>,
  vapidPublicKey: string,
  vapidPrivateKey: string,
  vapidSubject: string
): Promise<Response> {
  const payloadBytes = textEncoder.encode(JSON.stringify(payload));
  const body = await encryptPayload(payloadBytes, subscription.p256dh, subscription.auth);
  const authHeader = await buildVapidHeader(
    subscription.endpoint,
    vapidPublicKey,
    vapidPrivateKey,
    vapidSubject
  );
  return await fetch(subscription.endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Encoding": "aes128gcm",
      TTL: "86400",
      Authorization: authHeader,
    },
    body,
  });
}

/** Data/hora "agora" no fuso de São Paulo, formatada sem depender de parsing de string
 * localizada (evita ambiguidade entre formatos de locale). */
function nowInSaoPaulo(): { date: string; time: string } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "00";
  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    time: `${get("hour")}:${get("minute")}`,
  };
}

Deno.serve(async (req: Request) => {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");
    const vapidSubject = Deno.env.get("VAPID_SUBJECT") ?? "mailto:contato@prumo.app";
    if (!vapidPublicKey || !vapidPrivateKey) {
      return json(
        { error: "VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY não configuradas (supabase secrets set)." },
        500
      );
    }

    const supabase = createClient(supabaseUrl, serviceKey);
    const { date: today, time: nowHHMM } = nowInSaoPaulo();

    // "app.lembrete_diario_hora" é o horário configurado em Editar perfil —
    // qualquer um cujo horário bate com o minuto atual (fuso de São Paulo) e ainda não
    // recebeu o aviso hoje é considerado "devido" agora.
    const { data: prefs, error: prefsError } = await supabase
      .from("module_preferences")
      .select("user_id, answers")
      .eq("module_slug", "app")
      .eq("answers->>lembrete_diario_hora", nowHHMM);
    if (prefsError) throw prefsError;

    const due = (prefs ?? []).filter((row) => {
      const answers = (row.answers ?? {}) as Record<string, unknown>;
      if (!answers.lembrete_diario_id) return false;
      if (answers.lembrete_diario_last_sent === today) return false;
      return true;
    });

    let sent = 0;
    let cleaned = 0;
    for (const row of due) {
      const { data: subs } = await supabase
        .from("push_subscriptions")
        .select("endpoint, p256dh, auth")
        .eq("user_id", row.user_id);

      for (const sub of (subs ?? []) as PushSubscriptionRow[]) {
        try {
          const res = await sendWebPush(
            sub,
            { title: "Prumo", body: "Não esqueça de registrar o que rolou hoje." },
            vapidPublicKey,
            vapidPrivateKey,
            vapidSubject
          );
          if (res.status === 404 || res.status === 410) {
            // Inscrição expirada/revogada do lado do navegador — limpa, best-effort.
            await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
            cleaned++;
          } else if (res.ok) {
            sent++;
          }
        } catch {
          // best-effort — um endpoint com problema não deve travar os outros.
        }
      }

      const answers = (row.answers ?? {}) as Record<string, unknown>;
      await supabase
        .from("module_preferences")
        .update({ answers: { ...answers, lembrete_diario_last_sent: today } })
        .eq("module_slug", "app")
        .eq("user_id", row.user_id);
    }

    return json({ checked: prefs?.length ?? 0, due: due.length, sent, cleaned });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
