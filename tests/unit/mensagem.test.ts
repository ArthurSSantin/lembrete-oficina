import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  gerarMensagem,
  mensagemPadrao,
  modeloPadrao,
  preencherModelo,
  type DadosMensagem,
} from "@/lib/mensagem";

const dados: DadosMensagem = {
  tipo: "lembrete",
  oficina: "Auto Center Silva",
  assinatura: "Auto Center Silva - Rua X, 123",
  cliente: "João Pereira da Silva",
  veiculo: "Onix 1.0 2020",
  servico: "Troca de óleo e filtro",
  data: "05/03/2026",
  km: 45_000,
  proximaKm: 55_000,
  atrasoDias: 3,
};

describe("mensagemPadrao", () => {
  it("lembrete: primeiro nome, carro, serviço em minúsculas, data e assinatura", () => {
    expect(mensagemPadrao(dados)).toBe(
      "Oi, João! Tudo bem? Aqui é da Auto Center Silva. O serviço de troca de óleo e filtro do seu Onix 1.0 2020 foi feito em 05/03/2026, e já está chegando a hora de fazer de novo. Quer agendar um horário? É só responder aqui.\n\nAuto Center Silva - Rua X, 123",
    );
  });

  it("sem assinatura (null ou vazia) usa o nome da oficina", () => {
    expect(mensagemPadrao({ ...dados, assinatura: null }).endsWith("\n\nAuto Center Silva")).toBe(
      true,
    );
    expect(mensagemPadrao({ ...dados, assinatura: "" }).endsWith("\n\nAuto Center Silva")).toBe(
      true,
    );
  });

  it("cliente com um nome só e com espaços sobrando", () => {
    expect(mensagemPadrao({ ...dados, cliente: "Maria" })).toMatch(/^Oi, Maria!/);
    expect(mensagemPadrao({ ...dados, cliente: "  Ana   Lima " })).toMatch(/^Oi, Ana!/);
  });

  it("km nulo não quebra o texto", () => {
    expect(mensagemPadrao({ ...dados, km: null })).not.toMatch(/undefined|null|\{km\}/);
  });

  it("recomendado mantém o serviço como foi escrito", () => {
    const m = mensagemPadrao({ ...dados, tipo: "recomendado", servico: "Pastilhas de freio" });
    expect(m).toContain("precisava de: Pastilhas de freio.");
  });

  it("pós-venda sem link não deixa parágrafo de avaliação vazio", () => {
    const m = mensagemPadrao({ ...dados, tipo: "posvenda", linkAvaliacao: null });
    expect(m).not.toContain("avaliação");
    expect(m).not.toMatch(/\n{3,}/);
  });

  it("pós-venda com link inclui o link", () => {
    const m = mensagemPadrao({ ...dados, tipo: "posvenda", linkAvaliacao: "https://g.page/x" });
    expect(m).toContain("https://g.page/x");
  });

  it("reativação cita a data da última visita", () => {
    expect(mensagemPadrao({ ...dados, tipo: "reativacao" })).toContain("desde 05/03/2026");
  });

  it("nenhum tipo deixa variável sem trocar", () => {
    for (const tipo of ["lembrete", "recomendado", "posvenda", "reativacao"] as const) {
      expect(mensagemPadrao({ ...dados, tipo })).not.toMatch(/\{[a-z_]+\}/);
    }
  });
});

describe("preencherModelo / modeloPadrao", () => {
  it("troca {km} formatado e deixa variável desconhecida como está", () => {
    expect(preencherModelo("{nome}: {km} {xyz}", dados)).toBe("João: 45.000 km {xyz}");
  });

  it("sem km, some o ' com {km}' / ' aos {km}' / ' a {km}'", () => {
    const semKm = { ...dados, km: null };
    expect(preencherModelo("Feito em {data} com {km}, ok.", semKm)).toBe("Feito em 05/03/2026, ok.");
    expect(preencherModelo("Trocado aos {km}.", semKm)).toBe("Trocado.");
    expect(preencherModelo("Revisão a {km} rodados.", semKm)).toBe("Revisão rodados.");
    expect(preencherModelo("Feito em {data} com {km}.", dados)).toBe("Feito em 05/03/2026 com 45.000 km.");
  });

  it("km nulo vira vazio", () => {
    expect(preencherModelo("Km: {km}.", { ...dados, km: null })).toBe("Km: .");
  });

  it("modeloPadrao de posvenda depende do link", () => {
    expect(modeloPadrao("posvenda", true)).toContain("{link}");
    expect(modeloPadrao("posvenda", false)).not.toContain("{link}");
  });
});

describe("gerarMensagem sem chave da IA", () => {
  const antes = { ...process.env };
  beforeEach(() => {
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.ANTHROPIC_AUTH_TOKEN;
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => {
    process.env = { ...antes };
    vi.restoreAllMocks();
  });

  it("usa a mensagem padrão", async () => {
    expect(await gerarMensagem(dados)).toEqual({ texto: mensagemPadrao(dados), origem: "padrao" });
  });

  it("usa o modelo da oficina quando existe", async () => {
    const r = await gerarMensagem({ ...dados, modelo: "Oi {nome}, {servico}" });
    expect(r).toEqual({ texto: "Oi João, troca de óleo e filtro", origem: "modelo" });
  });
});
