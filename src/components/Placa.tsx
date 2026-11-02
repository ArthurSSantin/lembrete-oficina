import { formatarPlaca } from "@/lib/util";

export function Placa({ placa }: { placa: string }) {
  return (
    <span className="placa" aria-label={`Placa ${formatarPlaca(placa)}`}>
      <span>{formatarPlaca(placa)}</span>
    </span>
  );
}
