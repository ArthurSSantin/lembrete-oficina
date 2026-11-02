import { describe, expect, it } from "vitest";
import { lerPlanilha, normalizarData } from "@/lib/importacao";

describe("normalizarData", () => {
  it("dd/mm/aaaa, d/m/aaaa e aaaa-mm-dd", () => {
    expect(normalizarData("15/03/2026")).toBe("2026-03-15");
    expect(normalizarData("5/3/2026")).toBe("2026-03-05");
    expect(normalizarData("2026-03-15")).toBe("2026-03-15");
    expect(normalizarData(" 2026-3-5 ")).toBe("2026-03-05");
    expect(normalizarData("15.03.2026")).toBe("2026-03-15");
    expect(normalizarData("15-03-2026")).toBe("2026-03-15");
  });

  it("aaaa-mm-dd com hora (exportado de sistema)", () => {
    expect(normalizarData("2026-03-15T10:00:00")).toBe("2026-03-15");
    expect(normalizarData("2026-03-15 10:00")).toBe("2026-03-15");
  });

  it("dd/mm/aa: até 50 é 20xx, acima é 19xx", () => {
    expect(normalizarData("15/03/26")).toBe("2026-03-15");
    expect(normalizarData("01/01/50")).toBe("2050-01-01");
    expect(normalizarData("01/01/99")).toBe("1999-01-01");
  });

  it("datas inválidas viram vazio", () => {
    expect(normalizarData("31/02/2026")).toBe("");
    expect(normalizarData("29/02/2026")).toBe("");
    expect(normalizarData("32/01/2026")).toBe("");
    expect(normalizarData("15/13/2026")).toBe("");
    expect(normalizarData("2026-02-30")).toBe("");
    expect(normalizarData("")).toBe("");
    expect(normalizarData("ontem")).toBe("");
    expect(normalizarData("03/2026")).toBe("");
  });

  it("29/02 em ano bissexto vale", () => {
    expect(normalizarData("29/02/2028")).toBe("2028-02-29");
  });
});

describe("lerPlanilha", () => {
  it("colado do Excel (TAB), cabeçalho com acento e maiúsculas", () => {
    const texto =
      "Nome\tTelefone\tPlaca\tVeículo\tAno\tÚltimo Serviço\tÚltima Visita\tKm\tValor\n" +
      "João Silva\t(11) 98888-7777\tabc-1d23\tOnix 1.0\t2020\tTroca de óleo\t15/03/2026\t45.000\tR$ 250,00\r\n";
    const r = lerPlanilha(texto);
    expect(r.colunasAchadas.sort()).toEqual(
      ["ano", "data", "km", "modelo", "nome", "placa", "servico", "valor", "whatsapp"].sort(),
    );
    expect(r.linhas).toEqual([
      {
        nome: "João Silva",
        whatsapp: "(11) 98888-7777",
        placa: "abc-1d23",
        modelo: "Onix 1.0",
        ano: "2020",
        servico: "Troca de óleo",
        data: "2026-03-15",
        km: "45.000",
        valor: "R$ 250,00",
      },
    ]);
  });

  it("CSV com ponto e vírgula (Excel em português) e valor com vírgula", () => {
    const r = lerPlanilha("nome;whatsapp;valor\nMaria;11 91234-5678;1.234,56\n");
    expect(r.linhas[0]).toMatchObject({ nome: "Maria", whatsapp: "11 91234-5678", valor: "1.234,56" });
  });

  it("CSV com vírgula e aspas (vírgula e aspas dentro do campo)", () => {
    const r = lerPlanilha(
      'nome,whatsapp,modelo\n"Silva, José",11912345678,"Gol ""Bola"" 1.0"\n',
    );
    expect(r.linhas[0]).toMatchObject({
      nome: "Silva, José",
      whatsapp: "11912345678",
      modelo: 'Gol "Bola" 1.0',
    });
  });

  it("ignora linhas em branco e colunas desconhecidas; colunas faltando ficam vazias", () => {
    const r = lerPlanilha("nome\tobs\twhatsapp\n\nAna\tqualquer\t11999990000\n   \n");
    expect(r.linhas).toHaveLength(1);
    expect(r.linhas[0]).toMatchObject({ nome: "Ana", whatsapp: "11999990000", placa: "", data: "" });
    expect(r.colunasAchadas).not.toContain("placa");
  });

  it("linha com menos campos que o cabeçalho não quebra", () => {
    const r = lerPlanilha("nome;whatsapp;placa\nBeto\n");
    expect(r.linhas[0]).toMatchObject({ nome: "Beto", whatsapp: "", placa: "" });
  });

  it("data inválida na planilha vira vazio", () => {
    const r = lerPlanilha("nome;whatsapp;data\nCaio;11999990000;31/02/2026\n");
    expect(r.linhas[0].data).toBe("");
  });

  it("só cabeçalho ou vazio: nenhuma linha", () => {
    expect(lerPlanilha("nome;whatsapp\n").linhas).toEqual([]);
    expect(lerPlanilha("").linhas).toEqual([]);
  });

  it("cabeçalho 'Nome do Cliente' e 'Data do Serviço' são reconhecidos", () => {
    const r = lerPlanilha("Nome do Cliente;Celular;Data do Serviço\nDiva;11999990000;01/02/2026\n");
    expect(r.linhas[0]).toMatchObject({ nome: "Diva", whatsapp: "11999990000", data: "2026-02-01" });
  });

  it("cabeçalho 'WhatsApp' com espaços e BOM do Excel", () => {
    // CSV salvo pelo Excel ("CSV UTF-8") começa com BOM (﻿).
    const r = lerPlanilha("﻿nome;whatsapp\nEva;11999990000\n");
    expect(r.colunasAchadas).toContain("nome");
    expect(r.linhas[0].nome).toBe("Eva");
  });
});
