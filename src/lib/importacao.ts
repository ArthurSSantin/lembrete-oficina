/** Leitura de planilha colada (Excel/Google Planilhas) ou arquivo CSV. Sem dependências. */

export type LinhaImportada = {
  nome: string;
  whatsapp: string;
  placa: string;
  modelo: string;
  ano: string;
  servico: string;
  data: string; // AAAA-MM-DD ou ""
  km: string;
  valor: string;
};

export const COLUNAS: { chave: keyof LinhaImportada; nomes: string[] }[] = [
  { chave: "nome", nomes: ["nome", "cliente", "nome do cliente"] },
  { chave: "whatsapp", nomes: ["whatsapp", "telefone", "celular", "fone", "contato"] },
  { chave: "placa", nomes: ["placa"] },
  { chave: "modelo", nomes: ["modelo", "carro", "veiculo", "veículo"] },
  { chave: "ano", nomes: ["ano"] },
  { chave: "servico", nomes: ["servico", "serviço", "ultimo servico", "último serviço"] },
  { chave: "data", nomes: ["data", "data do servico", "data do serviço", "ultima visita", "última visita"] },
  { chave: "km", nomes: ["km", "quilometragem"] },
  { chave: "valor", nomes: ["valor", "total"] },
];

function semAcento(s: string) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

/** Separa uma linha respeitando aspas. */
function dividir(linha: string, sep: string): string[] {
  const campos: string[] = [];
  let atual = "";
  let aspas = false;
  for (let i = 0; i < linha.length; i++) {
    const ch = linha[i];
    if (ch === '"') {
      if (aspas && linha[i + 1] === '"') {
        atual += '"';
        i++;
      } else aspas = !aspas;
    } else if (ch === sep && !aspas) {
      campos.push(atual.trim());
      atual = "";
    } else atual += ch;
  }
  campos.push(atual.trim());
  return campos;
}

/** dd/mm/aaaa, dd/mm/aa, aaaa-mm-dd -> aaaa-mm-dd. Inválida -> "". */
export function normalizarData(entrada: string): string {
  const t = entrada.trim();
  let m = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return valida(+m[1], +m[2], +m[3]);
  m = t.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})$/);
  if (m) {
    let ano = +m[3];
    if (ano < 100) ano += ano > 50 ? 1900 : 2000;
    return valida(ano, +m[2], +m[1]);
  }
  return "";
}

function valida(a: number, m: number, d: number): string {
  const dt = new Date(Date.UTC(a, m - 1, d));
  if (dt.getUTCFullYear() !== a || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return "";
  return `${a}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export function lerPlanilha(texto: string): { linhas: LinhaImportada[]; colunasAchadas: string[] } {
  const brutas = texto.replace(/\r/g, "").split("\n").filter((l) => l.trim());
  if (brutas.length < 2) return { linhas: [], colunasAchadas: [] };

  const cab = brutas[0];
  const sep = cab.includes("\t") ? "\t" : cab.split(";").length > cab.split(",").length ? ";" : ",";
  const titulos = dividir(cab, sep).map(semAcento);

  const indice = new Map<keyof LinhaImportada, number>();
  for (const c of COLUNAS) {
    const i = titulos.findIndex((t) => c.nomes.map(semAcento).includes(t));
    if (i >= 0) indice.set(c.chave, i);
  }

  const linhas = brutas.slice(1).map((l) => {
    const campos = dividir(l, sep);
    const valor = (k: keyof LinhaImportada) => {
      const i = indice.get(k);
      return i === undefined ? "" : (campos[i] ?? "");
    };
    return {
      nome: valor("nome"),
      whatsapp: valor("whatsapp"),
      placa: valor("placa"),
      modelo: valor("modelo"),
      ano: valor("ano"),
      servico: valor("servico"),
      data: normalizarData(valor("data")),
      km: valor("km"),
      valor: valor("valor"),
    };
  });

  return { linhas, colunasAchadas: [...indice.keys()] };
}
