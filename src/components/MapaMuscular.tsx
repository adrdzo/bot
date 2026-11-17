import { memo } from "react";
import type { Musculo } from "../types";

/** Mapa muscular frente/costas com destaque do músculo principal e secundários */

type Forma = { m: Musculo; d: string };

const espelhar = (d: string) =>
  d.replace(/([MLCQ])\s*([\d.\s,-]+)/g, (_, cmd: string, nums: string) => {
    const n = nums.trim().split(/[\s,]+/).map(Number);
    const out: number[] = [];
    for (let i = 0; i < n.length; i += 2) out.push(100 - n[i], n[i + 1]);
    return `${cmd}${out.join(" ")} `;
  });

const par = (m: Musculo, d: string): Forma[] => [
  { m, d },
  { m, d: espelhar(d) },
];

const SILHUETA =
  "M50 6 C56 6 59 11 59 17 C59 23 56 27 54 28 L55 31 C62 32 70 34 74 38 C78 42 79 50 80 58 L83 82 C84 88 86 96 86 102 L83 104 C80 98 78 92 76 86 L72 66 L70 72 C70 80 71 88 70 96 C72 104 72 112 71 120 L68 148 C68 160 67 170 66 182 L64 192 L56 192 L56 182 C55 168 54 152 52 136 L50 122 L48 136 C46 152 45 168 44 182 L44 192 L36 192 L34 182 C33 170 32 160 32 148 L29 120 C28 112 28 104 30 96 C29 88 30 80 30 72 L28 66 L24 86 C22 92 20 98 17 104 L14 102 C14 96 16 88 17 82 L20 58 C21 50 22 42 26 38 C30 34 38 32 45 31 L46 28 C44 27 41 23 41 17 C41 11 44 6 50 6 Z";

const FRENTE: Forma[] = [
  ...par("Trapézio", "M45 31 L40 33 L46 35 Z"),
  ...par("Deltoide anterior", "M38 34 C34 35 31 38 31 43 L34 47 C36 42 38 38 42 36 Z"),
  ...par("Deltoide lateral", "M30 37 C26 40 24 45 24 51 L29 52 C30 46 31 41 34 37 Z"),
  ...par("Peito", "M49 37 L42 36 C37 39 34 44 34 49 C36 54 42 56 49 54 Z"),
  ...par("Bíceps", "M28 54 C25 59 24 65 25 70 L30 70 C31 65 32 59 32 54 Z"),
  ...par("Antebraço", "M24 74 C22 80 20 88 18 96 L22 97 C24 90 27 82 29 75 Z"),
  { m: "Abdômen", d: "M43 58 L57 58 L57 88 C55 94 45 94 43 88 Z" },
  ...par("Abdômen", "M41 60 L37 64 L36 84 L41 88 Z"),
  ...par("Quadríceps", "M33 104 C31 116 32 132 35 144 L43 146 C45 136 47 122 46 108 L40 100 Z"),
  ...par("Panturrilha", "M35 156 C34 164 35 172 37 178 L40 178 C40 170 40 162 39 155 Z"),
];

const COSTAS: Forma[] = [
  { m: "Trapézio", d: "M50 28 L42 32 L36 35 L44 38 L50 52 L56 38 L64 35 L58 32 Z" },
  ...par("Deltoide posterior", "M36 36 C32 37 29 40 29 45 L34 48 C36 43 38 40 42 38 Z"),
  ...par("Deltoide lateral", "M29 38 C26 41 24 45 24 51 L28 51 C29 46 30 42 32 39 Z"),
  ...par("Costas", "M49 52 L43 39 L36 43 C34 50 34 58 36 66 C39 74 44 80 49 82 Z"),
  ...par("Tríceps", "M28 53 C25 58 24 64 25 70 L30 70 C31 64 32 58 32 53 Z"),
  ...par("Antebraço", "M24 74 C22 80 20 88 18 96 L22 97 C24 90 27 82 29 75 Z"),
  ...par("Lombar", "M49 84 L44 82 L42 96 L49 98 Z"),
  ...par("Glúteo", "M49 100 L40 98 C34 102 32 110 34 118 C40 122 46 120 49 116 Z"),
  ...par("Posteriores", "M34 122 C33 132 34 142 36 150 L43 150 C45 142 46 132 47 122 Z"),
  ...par("Panturrilha", "M35 154 C33 160 33 168 36 176 L42 176 C43 168 43 160 41 154 Z"),
];

interface Props {
  principal: Musculo;
  secundarios?: Musculo[];
  altura?: number;
}

function MapaBase({ principal, secundarios = [], altura = 160 }: Props) {
  const cor = (m: Musculo) =>
    m === principal ? "var(--musc-principal)" : secundarios.includes(m) ? "var(--musc-secundario)" : "var(--musc-neutro)";
  const corpo = (formas: Forma[], dx: number, titulo: string) => (
    <g transform={`translate(${dx} 0)`}>
      <path d={SILHUETA} fill="var(--musc-silhueta)" />
      {formas.map((f, i) => (
        <path key={i} d={f.d} fill={cor(f.m)}>
          <title>{f.m}</title>
        </path>
      ))}
      <text x={50} y={204} textAnchor="middle" fontSize={8} fill="var(--txt2)">
        {titulo}
      </text>
    </g>
  );
  return (
    <svg viewBox="0 0 210 208" height={altura} role="img" aria-label={`Músculos: ${principal}`}>
      {corpo(FRENTE, 0, "Frente")}
      {corpo(COSTAS, 110, "Costas")}
    </svg>
  );
}

export const MapaMuscular = memo(MapaBase);
