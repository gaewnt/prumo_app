/**
 * Parser do comando de voz "lançar despesa" — determinístico, só regex + palavras-chave,
 * sem IA/LLM nenhuma. Mesmo princípio de "insights manuais" já seguido no resto do app: a
 * gente nunca fica adivinhando com um modelo de linguagem, e quando a transcrição não dá
 * pra ter certeza do valor ou da categoria, a tela de revisão (sempre mostrada antes de
 * salvar, nunca salva sozinho) deixa isso claro pra pessoa conferir/corrigir.
 */

/** Categoria usada quando nenhuma palavra-chave bate com clareza — mesma lista de `CATEGORY_PRESETS`. */
export const AMBIGUOUS_CATEGORY_FALLBACK = "Outros";

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  "Alimentação": ["mercado", "supermercado", "comida", "restaurante", "lanche", "padaria", "ifood", "feira", "açougue", "acougue"],
  "Transporte": ["uber", "99", "gasolina", "combustível", "combustivel", "ônibus", "onibus", "metrô", "metro", "táxi", "taxi", "estacionamento", "pedágio", "pedagio"],
  "Moradia": ["aluguel", "condomínio", "condominio", "luz", "água", "agua", "internet", "gás", "gas", "iptu"],
  "Lazer": ["cinema", "show", "viagem", "jogo", "bar", "festa", "streaming", "netflix"],
  "Saúde": ["farmácia", "farmacia", "remédio", "remedio", "médico", "medico", "consulta", "dentista", "academia"],
  "Contas": ["conta", "boleto", "fatura", "cartão", "cartao"],
};

// Palavras de comando/preenchimento — não fazem parte da descrição de verdade do lançamento.
const FILLER_WORDS = new Set([
  "lançar", "lancar", "lança", "lanca", "registrar", "registra", "anotar", "anota", "gastei", "gastar",
  "despesa", "de", "do", "da", "dos", "das", "no", "na", "nos", "nas", "com", "em", "por", "reais", "real", "r$",
]);

export type ParsedExpenseCommand = {
  /** `null` quando não deu pra identificar um valor — força a pessoa a preencher na revisão. */
  amount: number | null;
  /** Sempre uma categoria válida (cai em `AMBIGUOUS_CATEGORY_FALLBACK` se não teve certeza). */
  category: string;
  /** `false` = a categoria acima é um chute neutro, não um reconhecimento de verdade. */
  categoryConfident: boolean;
  description: string;
  rawTranscript: string;
};

function extractAmount(text: string): { amount: number | null; matchedText: string | null } {
  // Cobre "300 reais", "r$ 300", "300,50 reais" — reconhecedores de voz em pt-BR já
  // costumam transcrever número falado ("trezentos") como dígito ("300") por conta própria.
  const match = text.match(/r\$\s*(\d+(?:[.,]\d{1,2})?)|(\d+(?:[.,]\d{1,2})?)\s*reais?\b/i);
  if (!match) return { amount: null, matchedText: null };
  const raw = match[1] ?? match[2];
  const amount = Number(raw.replace(",", "."));
  return { amount: Number.isFinite(amount) && amount > 0 ? amount : null, matchedText: match[0] };
}

function extractCategory(text: string): { category: string | null; confident: boolean; matchedKeyword: string | null } {
  const lower = text.toLowerCase();
  const matches: { category: string; keyword: string }[] = [];
  for (const category of Object.keys(CATEGORY_KEYWORDS)) {
    const hit = CATEGORY_KEYWORDS[category].find((keyword) => lower.includes(keyword));
    if (hit) matches.push({ category, keyword: hit });
  }
  const distinctCategories = Array.from(new Set(matches.map((m) => m.category)));
  if (distinctCategories.length === 1) {
    return { category: distinctCategories[0], confident: true, matchedKeyword: matches[0].keyword };
  }
  // zero categorias bateram, ou mais de uma bateu ao mesmo tempo — os dois casos são
  // ambíguos igual, melhor perguntar do que chutar qual das duas era a certa.
  return { category: null, confident: false, matchedKeyword: null };
}

function extractDescription(text: string, amountMatchedText: string | null) {
  let cleaned = text;
  if (amountMatchedText) cleaned = cleaned.replace(amountMatchedText, " ");
  const words = cleaned
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length > 0)
    .filter((w) => !FILLER_WORDS.has(w.toLowerCase().replace(/[.,!?]/g, "")));
  const description = words.join(" ").trim();
  return description || text.trim();
}

export function parseExpenseCommand(transcript: string): ParsedExpenseCommand {
  const { amount, matchedText } = extractAmount(transcript);
  const { category, confident } = extractCategory(transcript);
  const description = extractDescription(transcript, matchedText);

  return {
    amount,
    category: category ?? AMBIGUOUS_CATEGORY_FALLBACK,
    categoryConfident: confident,
    description,
    rawTranscript: transcript,
  };
}
