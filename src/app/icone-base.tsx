/** Desenho do ícone: o adesivo amarelo de troca de óleo sobre o asfalto. */
export function IconeBase({ lado }: { lado: number }) {
  const s = lado / 512;
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#1b2220",
      }}
    >
      <div
        style={{
          width: 300 * s,
          height: 300 * s,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f2b705",
          border: `${14 * s}px solid #0f1413`,
          borderRadius: 36 * s,
          transform: "rotate(-6deg)",
        }}
      >
        <svg width={170 * s} height={170 * s} viewBox="0 0 24 24" fill="none" stroke="#1b2220" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </svg>
      </div>
    </div>
  );
}
