import { memo, useMemo } from "react";
import type { Padrao } from "../types";

/**
 * Ilustrações animadas geradas por cinemática inversa.
 * Cada padrão define duas poses (A = início, B = pico da contração); os quadros
 * intermediários são calculados e tocados em loop via SMIL.
 */

type P = [number, number];
type Anexo = { em: Junta; tipo: "anilha" | "halter" | "rolo" | "plataforma" | "roda" | "pegada"; dx?: number; dy?: number };
type Junta = "mao" | "pe" | "ombro" | "joelho" | "quadril" | "mao2";

interface Pose {
  quadril: P;
  tronco: number; // graus; 180 = em pé
  mao?: P;
  maoRel?: P;
  cotovelo?: 1 | -1;
  mao2?: P;
  cotovelo2?: 1 | -1;
  pe: P;
  joelho?: 1 | -1;
  pe2?: P;
  joelho2?: 1 | -1;
}

interface Def {
  vista?: "lado" | "frente";
  a: Pose;
  b: Pose;
  cenario?: (string | { t: "rect"; x: number; y: number; w: number; h: number; r?: number; rot?: [number, number, number] })[];
  cabo?: { ancora: P; em: Junta };
  anexos?: Anexo[];
  chao?: boolean;
  dur?: number;
}

const TRONCO = 48;
const BRACO = 27;
const ANTEBRACO = 25;
const COXA = 36;
const CANELA = 34;

const dir = (a: number): P => [Math.sin((a * Math.PI) / 180), Math.cos((a * Math.PI) / 180)];
const soma = (p: P, v: P, k = 1): P => [p[0] + v[0] * k, p[1] + v[1] * k];

function ik(a: P, b: P, l1: number, l2: number, lado: number): P {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  let d = Math.hypot(dx, dy) || 0.001;
  d = Math.min(Math.max(d, Math.abs(l1 - l2) + 0.01), l1 + l2 - 0.01);
  const ux = dx / (Math.hypot(dx, dy) || 1);
  const uy = dy / (Math.hypot(dx, dy) || 1);
  const x = (l1 * l1 - l2 * l2 + d * d) / (2 * d);
  const h = Math.sqrt(Math.max(0, l1 * l1 - x * x));
  return [a[0] + ux * x - uy * h * lado, a[1] + uy * x + ux * h * lado];
}

/** ponto final real de uma cadeia de 2 ossos (quando o alvo está fora do alcance) */
const fim = (_a: P, j: P, alvo: P, l2: number): P => {
  const v: P = [alvo[0] - j[0], alvo[1] - j[1]];
  const n = Math.hypot(v[0], v[1]) || 1;
  return [j[0] + (v[0] / n) * l2, j[1] + (v[1] / n) * l2];
};

interface Quadro {
  [k: string]: P;
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const lerpP = (a: P, b: P, t: number): P => [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];

function resolverLado(p: Pose): Quadro {
  const ombro = soma(p.quadril, dir(p.tronco), TRONCO);
  const cabeca = soma(ombro, dir(p.tronco), 14);
  const alvoMao = p.mao ?? soma(ombro, p.maoRel ?? [0, 52]);
  const cot = ik(ombro, alvoMao, BRACO, ANTEBRACO, p.cotovelo ?? 1);
  const mao = fim(ombro, cot, alvoMao, ANTEBRACO);
  const joelho = ik(p.quadril, p.pe, COXA, CANELA, p.joelho ?? -1);
  const tornozelo = fim(p.quadril, joelho, p.pe, CANELA);
  const q: Quadro = { ombro, cabeca, cot, mao, joelho, tornozelo, quadril: p.quadril };
  const alvo2 = p.mao2 ?? alvoMao;
  const cot2 = ik(ombro, alvo2, BRACO, ANTEBRACO, p.cotovelo2 ?? p.cotovelo ?? 1);
  q.cot2 = cot2;
  q.mao2 = fim(ombro, cot2, alvo2, ANTEBRACO);
  const pe2 = p.pe2 ?? p.pe;
  const j2 = ik(p.quadril, pe2, COXA, CANELA, p.joelho2 ?? p.joelho ?? -1);
  q.joelho2 = j2;
  q.tornozelo2 = fim(p.quadril, j2, pe2, CANELA);
  return q;
}

function resolverFrente(p: Pose): Quadro {
  const pesc: P = [p.quadril[0], p.quadril[1] - TRONCO];
  const oE: P = [pesc[0] - 15, pesc[1] + 3];
  const oD: P = [pesc[0] + 15, pesc[1] + 3];
  const alvo = p.mao!;
  const maoD: P = [p.quadril[0] + alvo[0], alvo[1]];
  const maoE: P = [p.quadril[0] - alvo[0], alvo[1]];
  const cotD = ik(oD, maoD, BRACO, ANTEBRACO, -1);
  const cotE = ik(oE, maoE, BRACO, ANTEBRACO, 1);
  const qE: P = [p.quadril[0] - 8, p.quadril[1]];
  const qD: P = [p.quadril[0] + 8, p.quadril[1]];
  const peD: P = [p.quadril[0] + p.pe[0], p.pe[1]];
  const peE: P = [p.quadril[0] - p.pe[0], p.pe[1]];
  const jD = ik(qD, peD, COXA, CANELA, 1);
  const jE = ik(qE, peE, COXA, CANELA, -1);
  return {
    pesc,
    cabeca: [pesc[0], pesc[1] - 13],
    oE,
    oD,
    cotD,
    cotE,
    maoD: fim(oD, cotD, maoD, ANTEBRACO),
    maoE: fim(oE, cotE, maoE, ANTEBRACO),
    qE,
    qD,
    jD,
    jE,
    tD: fim(qD, jD, peD, CANELA),
    tE: fim(qE, jE, peE, CANELA),
    quadril: p.quadril,
  };
}

function interpPose(a: Pose, b: Pose, t: number): Pose {
  const o: Pose = {
    ...a,
    quadril: lerpP(a.quadril, b.quadril, t),
    tronco: lerp(a.tronco, b.tronco, t),
    pe: lerpP(a.pe, b.pe, t),
  };
  if (a.mao && b.mao) o.mao = lerpP(a.mao, b.mao, t);
  if (a.maoRel && b.maoRel) o.maoRel = lerpP(a.maoRel, b.maoRel, t);
  if (a.mao2 && b.mao2) o.mao2 = lerpP(a.mao2, b.mao2, t);
  if (a.pe2 && b.pe2) o.pe2 = lerpP(a.pe2, b.pe2, t);
  return o;
}

const N = 24;
const easing = (i: number) => {
  // 0 → 1 → 0, com pausa leve nos extremos
  const x = i / N;
  const tri = x < 0.5 ? x * 2 : 2 - x * 2;
  return 0.5 - 0.5 * Math.cos(Math.PI * Math.min(1, Math.max(0, (tri - 0.08) / 0.84)));
};

const D: Record<Padrao, Def> = {
  barraFixa: {
    chao: false,
    cenario: ["M60 22 H140", "M60 22 V8 M140 22 V8"],
    a: { quadril: [100, 124], tronco: 180, mao: [101, 22], cotovelo: 1, pe: [86, 186], joelho: -1 },
    b: { quadril: [97, 94], tronco: 192, mao: [101, 22], cotovelo: 1, pe: [82, 156], joelho: -1 },
  },
  puxadaVertical: {
    cenario: [{ t: "rect", x: 66, y: 140, w: 44, h: 7, r: 3 }, "M88 147 V180", { t: "rect", x: 112, y: 116, w: 14, h: 8, r: 4 }],
    cabo: { ancora: [96, 4], em: "mao" },
    anexos: [{ em: "mao", tipo: "pegada" }],
    a: { quadril: [88, 136], tronco: 188, mao: [100, 38], cotovelo: 1, pe: [128, 178], joelho: -1 },
    b: { quadril: [88, 136], tronco: 196, mao: [92, 86], cotovelo: 1, pe: [128, 178], joelho: -1 },
  },
  supinoInclinado: {
    cenario: ["M48 104 L118 142", "M118 142 L140 142", "M112 142 V180 M60 112 L80 180"],
    anexos: [{ em: "mao", tipo: "halter" }],
    a: { quadril: [116, 134], tronco: -118, mao: [70, 58], cotovelo: 1, pe: [150, 178], joelho: -1 },
    b: { quadril: [116, 134], tronco: -118, mao: [70, 96], cotovelo: 1, pe: [150, 178], joelho: -1 },
  },
  supinoReto: {
    cenario: [{ t: "rect", x: 40, y: 128, w: 90, h: 7, r: 3 }, "M54 135 V180 M118 135 V180", "M58 128 V60 M58 60 h8"],
    anexos: [{ em: "mao", tipo: "anilha" }],
    a: { quadril: [112, 122], tronco: -90, mao: [66, 70], cotovelo: 1, pe: [146, 178], joelho: -1 },
    b: { quadril: [112, 122], tronco: -90, mao: [70, 110], cotovelo: 1, pe: [146, 178], joelho: -1 },
  },
  remadaApoiada: {
    cenario: ["M66 126 L118 74", "M80 112 V180 M100 92 V180"],
    anexos: [{ em: "mao", tipo: "pegada" }],
    a: { quadril: [72, 118], tronco: 138, mao: [120, 138], cotovelo: 1, pe: [58, 178], joelho: -1 },
    b: { quadril: [72, 118], tronco: 138, mao: [96, 108], cotovelo: 1, pe: [58, 178], joelho: -1 },
  },
  remadaUnilateral: {
    cenario: [{ t: "rect", x: 44, y: 122, w: 92, h: 7, r: 3 }, "M56 129 V180 M124 129 V180"],
    anexos: [{ em: "mao", tipo: "halter" }],
    a: {
      quadril: [72, 104],
      tronco: 96,
      mao: [118, 156],
      cotovelo: 1,
      mao2: [124, 122],
      pe: [60, 178],
      joelho: -1,
      pe2: [44, 120],
      joelho2: -1,
    },
    b: {
      quadril: [72, 104],
      tronco: 96,
      mao: [100, 112],
      cotovelo: 1,
      mao2: [124, 122],
      pe: [60, 178],
      joelho: -1,
      pe2: [44, 120],
      joelho2: -1,
    },
  },
  elevacaoLateral: {
    vista: "frente",
    anexos: [{ em: "mao", tipo: "halter" }],
    a: { quadril: [100, 110], tronco: 180, mao: [24, 112], pe: [12, 178] },
    b: { quadril: [100, 110], tronco: 180, mao: [64, 64], pe: [12, 178] },
  },
  crucifixoInverso: {
    vista: "frente",
    cenario: [{ t: "rect", x: 84, y: 40, w: 32, h: 70, r: 6 }, "M100 128 V180"],
    anexos: [{ em: "mao", tipo: "pegada" }],
    a: { quadril: [100, 124], tronco: 180, mao: [14, 76], pe: [26, 178] },
    b: { quadril: [100, 124], tronco: 180, mao: [64, 72], pe: [26, 178] },
  },
  facePull: {
    cabo: { ancora: [176, 56], em: "mao" },
    cenario: ["M176 10 V180"],
    anexos: [{ em: "mao", tipo: "pegada" }],
    a: { quadril: [82, 110], tronco: 184, mao: [132, 62], cotovelo: -1, pe: [90, 178], pe2: [70, 178] },
    b: { quadril: [82, 110], tronco: 186, mao: [98, 48], cotovelo: -1, pe: [90, 178], pe2: [70, 178] },
  },
  rosca: {
    anexos: [{ em: "mao", tipo: "halter" }],
    a: { quadril: [88, 110], tronco: 180, mao: [92, 113], cotovelo: 1, pe: [92, 178] },
    b: { quadril: [88, 110], tronco: 182, mao: [104, 68], cotovelo: 1, pe: [92, 178] },
  },
  tricepsPolia: {
    cabo: { ancora: [118, 4], em: "mao" },
    anexos: [{ em: "mao", tipo: "pegada" }],
    a: { quadril: [86, 110], tronco: 172, mao: [112, 82], cotovelo: 1, pe: [90, 178] },
    b: { quadril: [86, 110], tronco: 172, mao: [100, 118], cotovelo: 1, pe: [90, 178] },
  },
  tricepsFrances: {
    anexos: [{ em: "mao", tipo: "halter" }],
    a: { quadril: [90, 110], tronco: 180, mao: [76, 48], cotovelo: 1, pe: [94, 178] },
    b: { quadril: [90, 110], tronco: 180, mao: [94, 10], cotovelo: 1, pe: [94, 178] },
  },
  agachamento: {
    cenario: ["M30 180 V40 M30 72 h14 M170 180 V40 M170 72 h-14"],
    anexos: [{ em: "ombro", tipo: "anilha", dx: -3, dy: -4 }],
    a: { quadril: [92, 108], tronco: 180, mao: [80, 62], cotovelo: -1, pe: [96, 178], joelho: -1 },
    b: { quadril: [70, 142], tronco: 140, maoRel: [-12, 2], cotovelo: -1, pe: [96, 178], joelho: -1 },
  },
  stiff: {
    anexos: [{ em: "mao", tipo: "anilha" }],
    a: { quadril: [90, 108], tronco: 180, mao: [94, 132], cotovelo: -1, pe: [96, 178], joelho: -1 },
    b: { quadril: [74, 112], tronco: 104, mao: [118, 156], cotovelo: -1, pe: [96, 178], joelho: -1 },
  },
  legPress: {
    cenario: ["M24 168 L96 168 L42 110", "M100 40 L180 120", "M60 168 V180 M96 168 V180"],
    anexos: [{ em: "pe", tipo: "plataforma" }],
    a: { quadril: [82, 160], tronco: -118, mao: [92, 164], cotovelo: 1, pe: [144, 106], joelho: -1 },
    b: { quadril: [82, 160], tronco: -118, mao: [92, 164], cotovelo: 1, pe: [108, 130], joelho: -1 },
  },
  flexoraSentada: {
    cenario: [{ t: "rect", x: 60, y: 122, w: 60, h: 7, r: 3 }, "M60 122 V60", "M84 129 V180", { t: "rect", x: 100, y: 106, w: 22, h: 8, r: 4 }],
    anexos: [{ em: "pe", tipo: "rolo", dx: -4, dy: -4 }],
    a: { quadril: [70, 118], tronco: 176, mao: [104, 120], cotovelo: 1, pe: [154, 126], joelho: -1 },
    b: { quadril: [70, 118], tronco: 170, mao: [104, 120], cotovelo: 1, pe: [112, 152], joelho: -1 },
  },
  mesaFlexora: {
    cenario: [{ t: "rect", x: 26, y: 120, w: 120, h: 7, r: 3 }, "M40 127 V180 M134 127 V180"],
    anexos: [{ em: "pe", tipo: "rolo", dx: 0, dy: -6 }],
    a: { quadril: [96, 114], tronco: -90, mao: [36, 124], cotovelo: 1, pe: [166, 116], joelho: 1 },
    b: { quadril: [96, 114], tronco: -90, mao: [36, 124], cotovelo: 1, pe: [124, 76], joelho: 1 },
  },
  panturrilhaPe: {
    cenario: [{ t: "rect", x: 82, y: 170, w: 36, h: 10, r: 2 }, "M60 180 V40 M60 54 H86"],
    anexos: [{ em: "ombro", tipo: "rolo", dx: 0, dy: -4 }],
    a: { quadril: [90, 106], tronco: 180, mao: [76, 60], cotovelo: -1, pe: [94, 174], joelho: -1 },
    b: { quadril: [90, 94], tronco: 180, mao: [76, 48], cotovelo: -1, pe: [94, 162], joelho: -1 },
  },
  panturrilhaSentada: {
    cenario: [{ t: "rect", x: 50, y: 126, w: 46, h: 7, r: 3 }, "M70 133 V180", { t: "rect", x: 108, y: 168, w: 22, h: 12, r: 2 }],
    anexos: [{ em: "joelho", tipo: "rolo", dx: 0, dy: -7 }],
    a: { quadril: [72, 122], tronco: 180, mao: [104, 116], cotovelo: 1, pe: [114, 168], joelho: -1 },
    b: { quadril: [72, 122], tronco: 180, mao: [104, 108], cotovelo: 1, pe: [114, 158], joelho: -1 },
  },
  abWheel: {
    anexos: [{ em: "mao", tipo: "roda" }],
    a: { quadril: [92, 136], tronco: 128, mao: [134, 170], cotovelo: 1, pe: [60, 178], joelho: -1 },
    b: { quadril: [106, 150], tronco: 100, mao: [182, 170], cotovelo: 1, pe: [60, 178], joelho: -1 },
  },
  crunchPolia: {
    cabo: { ancora: [150, 4], em: "mao" },
    anexos: [{ em: "mao", tipo: "pegada" }],
    a: { quadril: [86, 128], tronco: 174, maoRel: [12, -6], cotovelo: 1, pe: [50, 178], joelho: -1 },
    b: { quadril: [86, 128], tronco: 116, maoRel: [12, 6], cotovelo: 1, pe: [50, 178], joelho: -1 },
  },
  hack: {
    cenario: ["M40 40 L84 178", { t: "rect", x: 92, y: 174, w: 40, h: 6, r: 2 }],
    anexos: [{ em: "ombro", tipo: "rolo", dx: -2, dy: -6 }],
    a: { quadril: [82, 110], tronco: 196, mao: [70, 64], cotovelo: -1, pe: [112, 176], joelho: -1 },
    b: { quadril: [76, 146], tronco: 196, mao: [64, 100], cotovelo: -1, pe: [112, 176], joelho: -1 },
  },
  bulgaro: {
    cenario: [{ t: "rect", x: 20, y: 138, w: 44, h: 8, r: 3 }, "M28 146 V180 M56 146 V180"],
    anexos: [{ em: "mao", tipo: "halter" }],
    a: { quadril: [96, 106], tronco: 180, maoRel: [2, 50], cotovelo: -1, pe: [126, 178], joelho: -1, pe2: [50, 134], joelho2: -1 },
    b: { quadril: [92, 140], tronco: 172, maoRel: [2, 50], cotovelo: -1, pe: [126, 178], joelho: -1, pe2: [50, 134], joelho2: -1 },
  },
  extensora: {
    cenario: [{ t: "rect", x: 56, y: 124, w: 56, h: 7, r: 3 }, "M56 124 L48 60", "M80 131 V180"],
    anexos: [{ em: "pe", tipo: "rolo", dx: 0, dy: 3 }],
    a: { quadril: [66, 120], tronco: 190, mao: [86, 126], cotovelo: 1, pe: [108, 158], joelho: -1 },
    b: { quadril: [66, 120], tronco: 190, mao: [86, 126], cotovelo: 1, pe: [138, 116], joelho: -1 },
  },
  pulldownEstendido: {
    cabo: { ancora: [160, 4], em: "mao" },
    anexos: [{ em: "mao", tipo: "pegada" }],
    a: { quadril: [82, 110], tronco: 160, mao: [134, 40], cotovelo: 1, pe: [92, 178], pe2: [74, 178] },
    b: { quadril: [82, 110], tronco: 164, mao: [100, 120], cotovelo: 1, pe: [92, 178], pe2: [74, 178] },
  },
  flexao: {
    a: { quadril: [86, 132], tronco: 102, mao: [138, 176], cotovelo: 1, pe: [20, 176], joelho: 1 },
    b: { quadril: [86, 158], tronco: 96, mao: [138, 176], cotovelo: 1, pe: [20, 176], joelho: 1 },
  },
  prancha: {
    a: { quadril: [86, 152], tronco: 98, mao: [158, 176], cotovelo: -1, pe: [20, 176], joelho: 1 },
    b: { quadril: [86, 148], tronco: 97, mao: [158, 176], cotovelo: -1, pe: [20, 176], joelho: 1 },
  },
};

function construir(padrao: Padrao) {
  const def = D[padrao];
  const frente = def.vista === "frente";
  const quadros: Quadro[] = [];
  for (let i = 0; i <= N; i++) {
    const pose = interpPose(def.a, def.b, easing(i));
    quadros.push(frente ? resolverFrente(pose) : resolverLado(pose));
  }
  return { def, quadros, frente };
}

const vals = (qs: Quadro[], k: string, eixo: 0 | 1, d = 0) =>
  qs.map((q) => (q[k][eixo] + d).toFixed(1)).join(";");

interface Props {
  padrao: Padrao;
  tamanho?: number | string;
  animar?: boolean;
  className?: string;
}

function IlustracaoBase({ padrao, tamanho = "100%", animar = true, className }: Props) {
  const { def, quadros, frente } = useMemo(() => construir(padrao), [padrao]);
  const dur = `${def.dur ?? 2.6}s`;
  const q0 = quadros[0];

  const Seg = ({ a, b, w, cor }: { a: string; b: string; w: number; cor: string }) => (
    <line x1={q0[a][0]} y1={q0[a][1]} x2={q0[b][0]} y2={q0[b][1]} stroke={cor} strokeWidth={w} strokeLinecap="round">
      {animar && (
        <>
          <animate attributeName="x1" dur={dur} repeatCount="indefinite" values={vals(quadros, a, 0)} />
          <animate attributeName="y1" dur={dur} repeatCount="indefinite" values={vals(quadros, a, 1)} />
          <animate attributeName="x2" dur={dur} repeatCount="indefinite" values={vals(quadros, b, 0)} />
          <animate attributeName="y2" dur={dur} repeatCount="indefinite" values={vals(quadros, b, 1)} />
        </>
      )}
    </line>
  );

  const Mover = ({ k, children, dx = 0, dy = 0 }: { k: string; children: React.ReactNode; dx?: number; dy?: number }) => (
    <g transform={`translate(${q0[k][0] + dx} ${q0[k][1] + dy})`}>
      {animar && (
        <animateTransform
          attributeName="transform"
          type="translate"
          dur={dur}
          repeatCount="indefinite"
          values={quadros.map((q) => `${(q[k][0] + dx).toFixed(1)} ${(q[k][1] + dy).toFixed(1)}`).join(";")}
        />
      )}
      {children}
    </g>
  );

  const pele = "var(--ilu-corpo)";
  const pele2 = "var(--ilu-corpo2)";
  const ac = "var(--ilu-carga)";
  const eq = "var(--ilu-equip)";

  const juntaChave = (em: Junta) => {
    if (frente) return em === "mao" ? "maoD" : em === "mao2" ? "maoE" : em === "pe" ? "tD" : em === "ombro" ? "oD" : "quadril";
    return { mao: "mao", mao2: "mao2", pe: "tornozelo", ombro: "ombro", joelho: "joelho", quadril: "quadril" }[em];
  };

  const desenharAnexo = (a: Anexo, k: string, i: number) => {
    const forma = (() => {
      switch (a.tipo) {
        case "anilha":
          return (
            <>
              <circle r={12} fill={ac} opacity={0.9} />
              <circle r={3} fill="var(--bg)" />
            </>
          );
        case "halter":
          return frente ? (
            <>
              <rect x={-3} y={-9} width={6} height={18} rx={2} fill={ac} />
            </>
          ) : (
            <>
              <rect x={-9} y={-3.5} width={18} height={7} rx={2.5} fill={ac} />
            </>
          );
        case "rolo":
          return <rect x={-8} y={-5} width={16} height={10} rx={5} fill={eq} />;
        case "plataforma":
          return <line x1={-14} y1={-14} x2={14} y2={14} stroke={eq} strokeWidth={5} strokeLinecap="round" transform="translate(6 -4)" />;
        case "roda":
          return (
            <>
              <circle r={9} fill="none" stroke={ac} strokeWidth={4} />
              <circle r={2} fill={ac} />
            </>
          );
        case "pegada":
          return <circle r={3.5} fill={ac} />;
      }
    })();
    return (
      <Mover key={`${k}-${i}`} k={k} dx={a.dx} dy={a.dy}>
        {forma}
      </Mover>
    );
  };

  const cabo = def.cabo;
  const caboK = cabo ? juntaChave(cabo.em) : "";

  return (
    <svg viewBox="0 0 200 200" width={tamanho} height={tamanho} className={className} role="img" aria-label="Demonstração do exercício">
      {def.chao !== false && <line x1={8} y1={181} x2={192} y2={181} stroke={eq} strokeWidth={2} opacity={0.5} />}
      {(def.cenario ?? []).map((c, i) =>
        typeof c === "string" ? (
          <path key={i} d={c} stroke={eq} strokeWidth={4} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        ) : (
          <rect key={i} x={c.x} y={c.y} width={c.w} height={c.h} rx={c.r ?? 0} fill={eq} />
        ),
      )}
      {cabo && (
        <>
          <circle cx={cabo.ancora[0]} cy={cabo.ancora[1]} r={4} fill={eq} />
          <line x1={cabo.ancora[0]} y1={cabo.ancora[1]} x2={q0[caboK][0]} y2={q0[caboK][1]} stroke={ac} strokeWidth={1.5}>
            {animar && (
              <>
                <animate attributeName="x2" dur={dur} repeatCount="indefinite" values={vals(quadros, caboK, 0)} />
                <animate attributeName="y2" dur={dur} repeatCount="indefinite" values={vals(quadros, caboK, 1)} />
              </>
            )}
          </line>
        </>
      )}
      {frente ? (
        <>
          <Seg a="qE" b="jE" w={11} cor={pele} />
          <Seg a="jE" b="tE" w={9} cor={pele} />
          <Seg a="qD" b="jD" w={11} cor={pele} />
          <Seg a="jD" b="tD" w={9} cor={pele} />
          <Seg a="quadril" b="pesc" w={24} cor={pele} />
          <Seg a="oE" b="oD" w={12} cor={pele} />
          <Seg a="oE" b="cotE" w={9} cor={pele} />
          <Seg a="cotE" b="maoE" w={8} cor={pele} />
          <Seg a="oD" b="cotD" w={9} cor={pele} />
          <Seg a="cotD" b="maoD" w={8} cor={pele} />
          <Mover k="cabeca">
            <circle r={10} fill={pele} />
          </Mover>
          {(def.anexos ?? []).flatMap((a, i) =>
            a.em === "mao" ? [desenharAnexo(a, "maoD", i), desenharAnexo(a, "maoE", i + 100)] : [desenharAnexo(a, juntaChave(a.em), i)],
          )}
        </>
      ) : (
        <>
          <Seg a="ombro" b="cot2" w={8} cor={pele2} />
          <Seg a="cot2" b="mao2" w={7} cor={pele2} />
          <Seg a="quadril" b="joelho2" w={11} cor={pele2} />
          <Seg a="joelho2" b="tornozelo2" w={9} cor={pele2} />
          <Seg a="quadril" b="joelho" w={12} cor={pele} />
          <Seg a="joelho" b="tornozelo" w={10} cor={pele} />
          <Seg a="quadril" b="ombro" w={20} cor={pele} />
          <Seg a="ombro" b="cot" w={9} cor={pele} />
          <Seg a="cot" b="mao" w={8} cor={pele} />
          <Mover k="cabeca">
            <circle r={10.5} fill={pele} stroke="var(--bg2)" strokeWidth={1.5} />
          </Mover>
          {(def.anexos ?? []).map((a, i) => desenharAnexo(a, juntaChave(a.em), i))}
        </>
      )}
    </svg>
  );
}

export const Ilustracao = memo(IlustracaoBase);
export const PADROES = Object.keys(D) as Padrao[];
