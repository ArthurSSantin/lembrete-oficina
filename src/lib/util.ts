/** Mantém só dígitos e garante o DDI 55 (Brasil). */
export function normalizarWhatsapp(entrada: string): string {
  const digitos = entrada.replace(/\D/g, "");
  if (digitos.length === 10 || digitos.length === 11) return "55" + digitos;
  return digitos;
}

export function formatarWhatsapp(numero: string): string {
  const d = numero.startsWith("55") ? numero.slice(2) : numero;
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return numero;
}

/** ABC-1D23 / abc1d23 -> ABC1D23 */
export function normalizarPlaca(entrada: string): string {
  return entrada.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function formatarPlaca(placa: string): string {
  return placa.length === 7 ? `${placa.slice(0, 3)}-${placa.slice(3)}` : placa;
}

/** Data de hoje no fuso de São Paulo, formato AAAA-MM-DD. */
export function hojeISO(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
  }).format(new Date());
}

export function somarDias(dataISO: string, dias: number): string {
  const d = new Date(dataISO + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

export function diasEntre(deISO: string, ateISO: string): number {
  const a = new Date(deISO + "T12:00:00Z").getTime();
  const b = new Date(ateISO + "T12:00:00Z").getTime();
  return Math.round((b - a) / 86_400_000);
}

export function formatarData(dataISO: string): string {
  const [a, m, d] = dataISO.slice(0, 10).split("-");
  return `${d}/${m}/${a}`;
}

export function formatarMoeda(valor: number): string {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/**
 * Calcula quando o serviço deve ser refeito.
 * Usa o que vier primeiro: o prazo em dias ou a quilometragem,
 * estimada pela média de km/dia do veículo (quando houver histórico).
 */
export function calcularProxima(params: {
  data: string;
  km: number | null;
  intervaloDias: number | null;
  intervaloKm: number | null;
  kmPorDia: number | null;
}): { proximaData: string | null; proximaKm: number | null } {
  const { data, km, intervaloDias, intervaloKm, kmPorDia } = params;

  const proximaKm = km != null && intervaloKm ? km + intervaloKm : null;

  const candidatos: number[] = [];
  if (intervaloDias) candidatos.push(intervaloDias);
  if (intervaloKm && kmPorDia && kmPorDia > 0) {
    candidatos.push(Math.round(intervaloKm / kmPorDia));
  }
  if (candidatos.length === 0) return { proximaData: null, proximaKm };

  const dias = Math.max(7, Math.min(...candidatos));
  return { proximaData: somarDias(data, dias), proximaKm };
}

/** Média de km/dia a partir de leituras (data, km) do veículo. */
export function estimarKmPorDia(
  leituras: { data: string; km: number | null }[],
): number | null {
  const validas = leituras
    .filter((l): l is { data: string; km: number } => l.km != null)
    .sort((a, b) => a.data.localeCompare(b.data));
  if (validas.length < 2) return null;
  const primeira = validas[0];
  const ultima = validas[validas.length - 1];
  const dias = diasEntre(primeira.data, ultima.data);
  const km = ultima.km - primeira.km;
  if (dias < 15 || km <= 0) return null;
  return km / dias;
}

export function linkWhatsapp(numero: string, texto: string): string {
  return `https://wa.me/${numero}?text=${encodeURIComponent(texto)}`;
}
