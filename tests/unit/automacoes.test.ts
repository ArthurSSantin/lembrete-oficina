import { describe, expect, it } from "vitest";
import { ehDiaDeBackup, textoDoAviso } from "@/lib/automacoes";

const TOQUE = "Toque para abrir a fila com as mensagens prontas.";

describe("textoDoAviso", () => {
  it("um lembrete só (singular)", () => {
    expect(textoDoAviso({ lembretes: 1, posvenda: 0 })).toEqual({
      titulo: "1 cliente para chamar hoje",
      corpo: `1 lembrete. ${TOQUE}`,
      url: "/chamar",
    });
  });

  it("só lembretes (plural)", () => {
    const t = textoDoAviso({ lembretes: 4, posvenda: 0 });
    expect(t.titulo).toBe("4 clientes para chamar hoje");
    expect(t.corpo).toBe(`4 lembretes. ${TOQUE}`);
  });

  it("só pós-venda, singular e plural", () => {
    expect(textoDoAviso({ lembretes: 0, posvenda: 1 }).corpo).toBe(
      `1 agradecimento de visita. ${TOQUE}`,
    );
    const t = textoDoAviso({ lembretes: 0, posvenda: 3 });
    expect(t.titulo).toBe("3 clientes para chamar hoje");
    expect(t.corpo).toBe(`3 agradecimentos de visita. ${TOQUE}`);
  });

  it("os dois juntos", () => {
    const t = textoDoAviso({ lembretes: 3, posvenda: 2 });
    expect(t.titulo).toBe("5 clientes para chamar hoje");
    expect(t.corpo).toBe(`3 lembretes e 2 agradecimentos de visita. ${TOQUE}`);
  });
});

describe("ehDiaDeBackup (segunda-feira em São Paulo, UTC-3)", () => {
  it("segunda ao meio-dia", () => {
    expect(ehDiaDeBackup(new Date("2026-11-02T15:00:00Z"))).toBe(true);
  });

  it("segunda 23:59 em SP já é terça em UTC: ainda é dia de backup", () => {
    expect(ehDiaDeBackup(new Date("2026-11-03T02:59:00Z"))).toBe(true);
  });

  it("domingo 23:59 em SP já é segunda em UTC: não é dia de backup", () => {
    expect(ehDiaDeBackup(new Date("2026-11-02T02:59:00Z"))).toBe(false);
  });

  it("segunda 00:00 em SP (03:00 UTC)", () => {
    expect(ehDiaDeBackup(new Date("2026-11-02T03:00:00Z"))).toBe(true);
  });

  it("terça 00:00 em SP (03:00 UTC) não é", () => {
    expect(ehDiaDeBackup(new Date("2026-11-03T03:00:00Z"))).toBe(false);
  });

  it("horário do cron (11:00 UTC = 8h em SP) só às segundas", () => {
    const dias = ["2026-11-01", "2026-11-02", "2026-11-03", "2026-11-04", "2026-11-05", "2026-11-06", "2026-11-07"];
    expect(dias.map((d) => ehDiaDeBackup(new Date(`${d}T11:00:00Z`)))).toEqual([
      false, true, false, false, false, false, false,
    ]);
  });
});
