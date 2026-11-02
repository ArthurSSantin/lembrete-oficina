import { afterEach, describe, expect, it, vi } from "vitest";
import {
  calcularProxima,
  diasEntre,
  estimarKmPorDia,
  formatarData,
  formatarMoeda,
  formatarPlaca,
  formatarWhatsapp,
  hojeISO,
  lerDecimal,
  linkWhatsapp,
  normalizarPlaca,
  normalizarWhatsapp,
  somarDias,
  whatsappValido,
} from "@/lib/util";

describe("whatsappValido", () => {
  it("aceita 55 + DDD + 8 ou 9 dígitos", () => {
    expect(whatsappValido("5511999998888")).toBe(true);
    expect(whatsappValido("551133334444")).toBe(true);
    expect(whatsappValido("5555999994444")).toBe(true);
  });

  it("recusa sem DDI, DDD começando com 0, curto, longo ou com símbolos", () => {
    expect(whatsappValido("11999998888")).toBe(false);
    expect(whatsappValido("5501999998888")).toBe(false);
    expect(whatsappValido("55119999988")).toBe(false);
    expect(whatsappValido("55119999988880")).toBe(false);
    expect(whatsappValido("+5511999998888")).toBe(false);
    expect(whatsappValido("")).toBe(false);
  });

  it("combinado com normalizarWhatsapp", () => {
    expect(whatsappValido(normalizarWhatsapp("011 99999-8888"))).toBe(true);
    expect(whatsappValido(normalizarWhatsapp("(11) 3333-4444"))).toBe(true);
    expect(whatsappValido(normalizarWhatsapp("99999-8888"))).toBe(false);
  });
});

describe("lerDecimal", () => {
  it("formatos brasileiro, americano e simples", () => {
    expect(lerDecimal("250.00")).toBe(250);
    expect(lerDecimal("250,00")).toBe(250);
    expect(lerDecimal("1.250,50")).toBe(1250.5);
    expect(lerDecimal("1,250.00")).toBe(1250);
    expect(lerDecimal("R$ 300")).toBe(300);
    expect(lerDecimal("R$ 1.234.567,89")).toBe(1234567.89);
    expect(lerDecimal("1250,5")).toBe(1250.5);
    expect(lerDecimal("12.5")).toBe(12.5);
    expect(lerDecimal("300")).toBe(300);
    expect(lerDecimal(" 0,99 ")).toBe(0.99);
    expect(lerDecimal(",50")).toBe(0.5);
  });

  it("separador com 3 dígitos depois é de milhar", () => {
    expect(lerDecimal("1.250")).toBe(1250);
    expect(lerDecimal("1,250")).toBe(1250);
    expect(lerDecimal("1.000.000")).toBe(1000000);
  });

  it("vazio ou sem números -> null", () => {
    expect(lerDecimal("")).toBeNull();
    expect(lerDecimal("R$")).toBeNull();
    expect(lerDecimal("abc")).toBeNull();
  });
});

describe("normalizarWhatsapp", () => {
  it("celular com DDD (11 dígitos) ganha o 55", () => {
    expect(normalizarWhatsapp("(11) 99999-8888")).toBe("5511999998888");
  });

  it("fixo com DDD (10 dígitos) ganha o 55", () => {
    expect(normalizarWhatsapp("(11) 3333-4444")).toBe("551133334444");
  });

  it("DDD 55 (RS) com 10 e 11 dígitos não é confundido com o DDI", () => {
    expect(normalizarWhatsapp("(55) 3333-4444")).toBe("555533334444");
    expect(normalizarWhatsapp("(55) 99999-4444")).toBe("5555999994444");
  });

  it("número já com +55 fica igual", () => {
    expect(normalizarWhatsapp("+55 (11) 99999-8888")).toBe("5511999998888");
    expect(normalizarWhatsapp("551133334444")).toBe("551133334444");
  });

  it("vazio e número curto não ganham DDI", () => {
    expect(normalizarWhatsapp("")).toBe("");
    expect(normalizarWhatsapp("99999-8888")).toBe("999998888");
  });

  it("número digitado com 0 de longa distância (011 99999-8888) vira 55 + DDD + número", () => {
    // Forma comum de digitar no Brasil. Hoje vira "011999998888" (12 dígitos),
    // passa na validação do atendimento (>= 12) e gera um link wa.me inválido.
    expect(normalizarWhatsapp("011 99999-8888")).toBe("5511999998888");
  });
});

describe("formatarWhatsapp", () => {
  it("formata celular e fixo, com ou sem 55", () => {
    expect(formatarWhatsapp("5511999998888")).toBe("(11) 99999-8888");
    expect(formatarWhatsapp("551133334444")).toBe("(11) 3333-4444");
    expect(formatarWhatsapp("11999998888")).toBe("(11) 99999-8888");
  });

  it("devolve como veio quando não reconhece", () => {
    expect(formatarWhatsapp("123")).toBe("123");
  });

  it("ida e volta com normalizarWhatsapp", () => {
    for (const n of ["(11) 99999-8888", "(21) 3333-4444", "(55) 99999-4444"]) {
      expect(formatarWhatsapp(normalizarWhatsapp(n))).toBe(n);
    }
  });
});

describe("normalizarPlaca / formatarPlaca", () => {
  it("remove traço, espaço e põe em maiúsculas", () => {
    expect(normalizarPlaca("abc-1d23")).toBe("ABC1D23");
    expect(normalizarPlaca(" abc 1234 ")).toBe("ABC1234");
    expect(normalizarPlaca("ABC1D23")).toBe("ABC1D23");
  });

  it("formatarPlaca: modelo antigo ganha traço, Mercosul fica sem", () => {
    expect(formatarPlaca("ABC1234")).toBe("ABC-1234");
    expect(formatarPlaca("ABC1D23")).toBe("ABC1D23");
    expect(formatarPlaca("AB12")).toBe("AB12");
  });
});

describe("somarDias", () => {
  it("vira o mês", () => {
    expect(somarDias("2026-01-31", 1)).toBe("2026-02-01");
    expect(somarDias("2026-02-28", 1)).toBe("2026-03-01");
  });

  it("ano bissexto", () => {
    expect(somarDias("2028-02-28", 1)).toBe("2028-02-29");
  });

  it("vira o ano, para frente e para trás", () => {
    expect(somarDias("2026-12-28", 7)).toBe("2027-01-04");
    expect(somarDias("2027-01-02", -3)).toBe("2026-12-30");
  });

  it("zero dias", () => {
    expect(somarDias("2026-06-15", 0)).toBe("2026-06-15");
  });
});

describe("diasEntre", () => {
  it("conta dias na virada de ano e em ano bissexto", () => {
    expect(diasEntre("2026-12-31", "2027-01-01")).toBe(1);
    expect(diasEntre("2028-02-01", "2028-03-01")).toBe(29);
    expect(diasEntre("2026-01-01", "2027-01-01")).toBe(365);
  });

  it("negativo quando a data final é anterior", () => {
    expect(diasEntre("2026-03-10", "2026-03-01")).toBe(-9);
  });

  it("é o inverso de somarDias", () => {
    expect(diasEntre("2026-10-20", somarDias("2026-10-20", 200))).toBe(200);
  });
});

describe("formatarData / formatarMoeda", () => {
  it("formata AAAA-MM-DD como DD/MM/AAAA, mesmo com hora", () => {
    expect(formatarData("2026-03-05")).toBe("05/03/2026");
    expect(formatarData("2026-03-05T23:59:00Z")).toBe("05/03/2026");
  });

  it("formata reais", () => {
    expect(formatarMoeda(1234.5)).toMatch(/^R\$\s1\.234,50$/);
    expect(formatarMoeda(0)).toMatch(/^R\$\s0,00$/);
  });
});

describe("hojeISO", () => {
  afterEach(() => vi.useRealTimers());

  it("usa o fuso de São Paulo (23h de 31/12 em SP já é 01/01 em UTC)", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T02:00:00Z"));
    expect(hojeISO()).toBe("2025-12-31");
  });

  it("formato AAAA-MM-DD", () => {
    expect(hojeISO()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("linkWhatsapp", () => {
  it("codifica o texto", () => {
    expect(linkWhatsapp("5511999998888", "Oi, João! 50% & tal\nok")).toBe(
      "https://wa.me/5511999998888?text=Oi%2C%20Jo%C3%A3o!%2050%25%20%26%20tal%0Aok",
    );
  });
});

describe("calcularProxima", () => {
  const base = {
    data: "2026-01-01",
    km: 50_000,
    intervaloDias: 180,
    intervaloKm: 10_000,
    kmPorDia: null,
  };

  it("sem histórico de km usa só o prazo em dias", () => {
    expect(calcularProxima(base)).toEqual({ proximaData: "2026-06-30", proximaKm: 60_000 });
  });

  it("usa os km quando chegam antes do prazo (100 km/dia -> 100 dias)", () => {
    expect(calcularProxima({ ...base, kmPorDia: 100 })).toEqual({
      proximaData: "2026-04-11",
      proximaKm: 60_000,
    });
  });

  it("usa o prazo quando o carro roda pouco", () => {
    expect(calcularProxima({ ...base, kmPorDia: 10 }).proximaData).toBe("2026-06-30");
  });

  it("nunca agenda para menos de 7 dias", () => {
    expect(calcularProxima({ ...base, kmPorDia: 5_000 }).proximaData).toBe("2026-01-08");
  });

  it("km nulo: sem próxima km, data pelo prazo ou pela média", () => {
    expect(calcularProxima({ ...base, km: null, kmPorDia: 100 })).toEqual({
      proximaData: "2026-04-11",
      proximaKm: null,
    });
    expect(calcularProxima({ ...base, km: null })).toEqual({
      proximaData: "2026-06-30",
      proximaKm: null,
    });
  });

  it("km zero ainda calcula a próxima km", () => {
    expect(calcularProxima({ ...base, km: 0 }).proximaKm).toBe(10_000);
  });

  it("serviço sem intervalo de km (bateria)", () => {
    expect(
      calcularProxima({ ...base, intervaloDias: 730, intervaloKm: null, kmPorDia: 100 }),
    ).toEqual({ proximaData: "2028-01-01", proximaKm: null });
  });

  it("só intervalo de km e sem histórico: sem data", () => {
    expect(calcularProxima({ ...base, intervaloDias: null })).toEqual({
      proximaData: null,
      proximaKm: 60_000,
    });
  });

  it("sem nenhum intervalo: nada", () => {
    expect(
      calcularProxima({ ...base, intervaloDias: null, intervaloKm: null, kmPorDia: 100 }),
    ).toEqual({ proximaData: null, proximaKm: null });
  });

  it("km/dia negativo ou zero é ignorado", () => {
    expect(calcularProxima({ ...base, kmPorDia: -50 }).proximaData).toBe("2026-06-30");
    expect(calcularProxima({ ...base, kmPorDia: 0 }).proximaData).toBe("2026-06-30");
  });

  it("vira o ano", () => {
    expect(calcularProxima({ ...base, data: "2026-12-01", intervaloDias: 60 }).proximaData).toBe(
      "2027-01-30",
    );
  });
});

describe("estimarKmPorDia", () => {
  it("histórico curto (0 ou 1 leitura) -> null", () => {
    expect(estimarKmPorDia([])).toBeNull();
    expect(estimarKmPorDia([{ data: "2026-01-01", km: 10_000 }])).toBeNull();
  });

  it("ignora leituras sem km", () => {
    expect(
      estimarKmPorDia([
        { data: "2026-01-01", km: null },
        { data: "2026-03-02", km: 16_000 },
      ]),
    ).toBeNull();
  });

  it("média entre a primeira e a última leitura, em qualquer ordem", () => {
    const leituras = [
      { data: "2026-03-02", km: 16_000 },
      { data: "2026-01-01", km: 10_000 },
      { data: "2026-02-01", km: null },
    ];
    expect(estimarKmPorDia(leituras)).toBe(100);
  });

  it("menos de 15 dias entre leituras -> null", () => {
    expect(
      estimarKmPorDia([
        { data: "2026-01-01", km: 10_000 },
        { data: "2026-01-10", km: 11_000 },
      ]),
    ).toBeNull();
  });

  it("km igual ou menor (hodômetro trocado/erro de digitação) -> null", () => {
    expect(
      estimarKmPorDia([
        { data: "2026-01-01", km: 10_000 },
        { data: "2026-03-01", km: 10_000 },
      ]),
    ).toBeNull();
    expect(
      estimarKmPorDia([
        { data: "2026-01-01", km: 10_000 },
        { data: "2026-03-01", km: 9_000 },
      ]),
    ).toBeNull();
  });

  it("vira o ano", () => {
    expect(
      estimarKmPorDia([
        { data: "2026-12-02", km: 20_000 },
        { data: "2027-01-01", km: 21_500 },
      ]),
    ).toBe(50);
  });
});
