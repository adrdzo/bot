import type { Treino, TreinoId, Equipamento } from "../types";

export const ROTACAO: TreinoId[] = ["SUP1", "INF1", "SUP2", "INF2"];

const it = (exercicioId: string, ordem: number, series: number, repsMin: number, repsMax: number) => ({
  exercicioId,
  ordem,
  series,
  repsMin,
  repsMax,
});

export const PROGRAMA_PADRAO: Treino[] = [
  {
    id: "SUP1",
    nome: "Superior 1",
    foco: "Largura e ombros",
    itens: [
      it("barra-fixa", 1, 3, 6, 10),
      it("supino-inclinado-halter", 2, 3, 6, 10),
      it("remada-apoiada", 3, 3, 8, 10),
      it("elevacao-lateral", 4, 4, 12, 15),
      it("crucifixo-inverso", 5, 3, 12, 15),
      it("rosca-inclinada", 6, 2, 10, 12),
      it("triceps-corda", 7, 2, 10, 12),
    ],
  },
  {
    id: "INF1",
    nome: "Inferior 1",
    foco: "Quadríceps",
    itens: [
      it("agachamento", 1, 3, 6, 8),
      it("stiff", 2, 3, 8, 10),
      it("leg-press", 3, 2, 10, 12),
      it("flexora-sentada", 4, 3, 10, 12),
      it("panturrilha-pe", 5, 3, 8, 12),
      it("ab-wheel", 6, 3, 8, 15),
    ],
  },
  {
    id: "SUP2",
    nome: "Superior 2",
    foco: "Costas e ombros",
    itens: [
      it("puxada-neutra", 1, 3, 8, 12),
      it("supino-reto", 2, 3, 6, 10),
      it("remada-unilateral", 3, 3, 8, 12),
      it("pulldown-estendido", 4, 2, 12, 15),
      it("elevacao-lateral-cabo", 5, 4, 12, 20),
      it("face-pull", 6, 2, 12, 15),
      it("rosca-martelo", 7, 2, 10, 12),
      it("triceps-frances", 8, 2, 10, 12),
    ],
  },
  {
    id: "INF2",
    nome: "Inferior 2",
    foco: "Posterior e glúteo",
    itens: [
      it("hack-squat", 1, 3, 8, 10),
      it("mesa-flexora", 2, 3, 10, 12),
      it("bulgaro", 3, 2, 8, 12),
      it("cadeira-extensora", 4, 2, 12, 15),
      it("panturrilha-sentada", 5, 3, 12, 15),
      it("crunch-polia", 6, 3, 10, 15),
    ],
  },
];

export const PASSOS_PADRAO: Record<Equipamento, number> = {
  barra: 2.5,
  halter: 2,
  maquina: 1,
  cabo: 1,
  corporal: 1.25,
};

export const NOMES_EQUIPAMENTO: Record<Equipamento, string> = {
  barra: "Barra (anilhas dos 2 lados)",
  halter: "Halteres",
  maquina: "Máquinas",
  cabo: "Cabos / polia",
  corporal: "Peso adicional (cinto/colete)",
};

export const MUSCULOS_VOLUME = [
  "Costas",
  "Deltoide lateral",
  "Deltoide posterior",
  "Quadríceps",
  "Posteriores",
  "Peito",
  "Bíceps",
  "Tríceps",
  "Panturrilha",
  "Abdômen",
] as const;

export const MUSCULOS_PRIORITARIOS = ["Costas", "Deltoide lateral", "Deltoide posterior"];
