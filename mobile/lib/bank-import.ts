/**
 * Importação de extrato bancário (CSV/OFX) — lê um arquivo exportado do app/site do banco
 * e devolve uma lista de lançamentos candidatos, sem salvar nada sozinho: a tela de revisão
 * (`app/(app)/importar-extrato.tsx`) sempre mostra tudo antes de gravar, seguindo o mesmo
 * princípio de "não inventar dado" do resto do app — uma linha que não dá pra entender com
 * confiança é contada em `skippedCount`, nunca adivinhada.
 *
 * Não existe um formato único de CSV de banco — cada um exporta diferente. Em vez de
 * suportar bancos específicos (frágil, quebra a cada mudança de layout), o parser tenta
 * reconhecer colunas comuns pelo nome do cabeçalho (data/descrição/valor, em português ou
 * inglês) e datas/valores nos formatos mais comuns (BR: vírgula decimal e DD/MM/AAAA;
 * internacional: ponto decimal e AAAA-MM-DD). OFX é mais previsível (formato padronizado),
 * então sai mais completo.
 */

export type ImportedTransaction = {
  occurredAt: string; // YYYY-MM-DD
  description: string;
  amount: number; // sempre positivo — o sinal já virou `kind`
  kind: "income" | "expense";
};

export type ImportResult = {
  transactions: ImportedTransaction[];
  /** Linhas/blocos que não deu pra entender com confiança (coluna não reconhecida, data ou
   * valor inválido) — mostrado na revisão pra pessoa saber que algo ficou de fora. */
  skippedCount: number;
};

function stripAccents(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function splitCsvLine(line: string, delimiter: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === delimiter && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

/** Bancos brasileiros costumam exportar CSV com ";" (a vírgula já é o separador decimal
 * do valor) — detecta olhando qual aparece mais vezes na linha de cabeçalho. */
function detectDelimiter(headerLine: string): string {
  const commaCount = (headerLine.match(/,/g) ?? []).length;
  const semicolonCount = (headerLine.match(/;/g) ?? []).length;
  return semicolonCount > commaCount ? ";" : ",";
}

/** Aceita "45,90", "-45.90", "1.234,56", "R$ 45,90", "(45,90)" (parênteses = negativo,
 * convenção comum em extrato). Devolve `null` quando não reconhece. */
function parseAmount(raw: string): number | null {
  let s = raw.trim().replace(/R\$|\s/g, "");
  if (!s) return null;
  const negative = /^-/.test(s) || /^\(.*\)$/.test(s);
  s = s.replace(/[()\-+]/g, "");
  if (!s) return null;
  const lastComma = s.lastIndexOf(",");
  const lastDot = s.lastIndexOf(".");
  if (lastComma > lastDot) {
    s = s.replace(/\./g, "").replace(",", ".");
  } else if (lastDot > lastComma) {
    s = s.replace(/,/g, "");
  }
  const n = Number(s);
  if (!Number.isFinite(n)) return null;
  return negative ? -Math.abs(n) : n;
}

/** Aceita "AAAA-MM-DD..." e "DD/MM/AAAA" (ano com 2 ou 4 dígitos). Devolve `null` quando
 * não reconhece. */
function parseDateFlexible(raw: string): string | null {
  const s = raw.trim();
  let m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/.exec(s);
  if (m) {
    const day = m[1].padStart(2, "0");
    const month = m[2].padStart(2, "0");
    const year = m[3].length === 2 ? `20${m[3]}` : m[3];
    return `${year}-${month}-${day}`;
  }
  return null;
}

const DATE_HEADER_HINTS = ["data", "date"];
const DESC_HEADER_HINTS = ["descri", "histor", "memo", "detalhe", "title", "estabelecimento", "lancamento"];
const AMOUNT_HEADER_HINTS = ["valor", "amount", "value", "montante"];

export function parseCsvStatement(text: string): ImportResult {
  const lines = text.split(/\r\n|\n|\r/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return { transactions: [], skippedCount: 0 };

  const delimiter = detectDelimiter(lines[0]);
  const headerCells = splitCsvLine(lines[0], delimiter).map((h) => stripAccents(h.trim().toLowerCase()));
  const dateIdx = headerCells.findIndex((h) => DATE_HEADER_HINTS.some((hint) => h.includes(hint)));
  const descIdx = headerCells.findIndex((h) => DESC_HEADER_HINTS.some((hint) => h.includes(hint)));
  const amountIdx = headerCells.findIndex((h) => AMOUNT_HEADER_HINTS.some((hint) => h.includes(hint)));

  // Sem data ou sem valor reconhecidos, não dá pra confiar em nada do arquivo — mais
  // seguro devolver tudo como "não reconhecido" do que arriscar ler a coluna errada.
  if (dateIdx === -1 || amountIdx === -1) {
    return { transactions: [], skippedCount: lines.length - 1 };
  }

  const transactions: ImportedTransaction[] = [];
  let skippedCount = 0;
  for (let i = 1; i < lines.length; i++) {
    const cells = splitCsvLine(lines[i], delimiter);
    const occurredAt = parseDateFlexible(cells[dateIdx] ?? "");
    const amount = parseAmount(cells[amountIdx] ?? "");
    if (!occurredAt || amount === null || amount === 0) {
      skippedCount++;
      continue;
    }
    const description = descIdx >= 0 ? (cells[descIdx] ?? "").trim() : "";
    transactions.push({
      occurredAt,
      description,
      amount: Math.abs(amount),
      kind: amount < 0 ? "expense" : "income",
    });
  }
  return { transactions, skippedCount };
}

/** OFX é SGML "solto" (tags sem fechamento por campo é comum) — regex direto no texto
 * resolve melhor que tentar validar como XML de verdade. `TRNAMT` no padrão OFX já vem
 * sempre com ponto decimal, então não precisa do mesmo tratamento de locale do CSV. */
export function parseOfxStatement(text: string): ImportResult {
  const blocks = text.match(/<STMTTRN>[\s\S]*?<\/STMTTRN>/gi) ?? [];
  const transactions: ImportedTransaction[] = [];
  let skippedCount = 0;
  for (const block of blocks) {
    const dateMatch = /<DTPOSTED>\s*(\d{8})/i.exec(block);
    const amountMatch = /<TRNAMT>\s*(-?[\d.]+)/i.exec(block);
    const memoMatch = /<MEMO>([^\r\n<]*)/i.exec(block);
    const nameMatch = /<NAME>([^\r\n<]*)/i.exec(block);
    if (!dateMatch || !amountMatch) {
      skippedCount++;
      continue;
    }
    const d = dateMatch[1];
    const amount = Number(amountMatch[1]);
    if (!Number.isFinite(amount) || amount === 0) {
      skippedCount++;
      continue;
    }
    transactions.push({
      occurredAt: `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`,
      description: (memoMatch?.[1] ?? nameMatch?.[1] ?? "").trim(),
      amount: Math.abs(amount),
      kind: amount < 0 ? "expense" : "income",
    });
  }
  return { transactions, skippedCount };
}

export function parseStatementFile(filename: string, content: string): ImportResult {
  const ext = filename.toLowerCase().split(".").pop() ?? "";
  if (ext === "ofx" || ext === "qfx") return parseOfxStatement(content);
  return parseCsvStatement(content);
}

/** Heurística de duplicata: mesmo dia + mesmo valor + mesmo tipo já existente no
 * histórico. Não é garantia (dois lançamentos legítimos podem coincidir), por isso a
 * revisão só vem com esses pré-desmarcados, nunca escondidos. */
export function isLikelyDuplicate(
  candidate: ImportedTransaction,
  existing: { occurred_at: string; amount: number; kind: string }[]
): boolean {
  return existing.some(
    (t) => t.occurred_at === candidate.occurredAt && Number(t.amount) === candidate.amount && t.kind === candidate.kind
  );
}
