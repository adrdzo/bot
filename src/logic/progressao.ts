import type { Equipamento, Exercicio, ItemTreino, RegistroExercicio, Sessao } from "../types";

export interface MetaSerie {
  carga: number;
  reps: number;
}

export interface MetaExercicio {
  series: MetaSerie[];
  subiuCarga: boolean;
  motivo: string;
  sugestaoCore?: boolean;
  primeiraVez: boolean;
}

/** Sessões (não-deload) em que o exercício foi realizado, mais antigas primeiro */
export function historicoExercicio(sessoes: Sessao[], exercicioId: string, incluirDeload = false) {
  return sessoes
    .filter((s) => (incluirDeload || !s.deload) && s.fim)
    .map((s) => ({ sessao: s, registro: s.registros.find((r) => r.exercicioId === exercicioId) }))
    .filter((x): x is { sessao: Sessao; registro: RegistroExercicio } =>
      !!x.registro && x.registro.series.some((se) => se.feita),
    )
    .sort((a, b) => a.sessao.data.localeCompare(b.sessao.data));
}

export const seriesFeitas = (r: RegistroExercicio) => r.series.filter((s) => s.feita);

export function arredondarParaCima(valor: number, passo: number) {
  if (passo <= 0) return valor;
  return Math.round(Math.ceil(valor / passo - 1e-9) * passo * 1000) / 1000;
}

/** Calcula a próxima carga conforme a regra 3.2 */
export function proximaCarga(ex: Exercicio, cargaAtual: number, passos: Record<Equipamento, number>) {
  const passo = passos[ex.equipamento] || 1;
  let inc: number;
  switch (ex.categoria) {
    case "pernas":
      inc = Math.max(cargaAtual * 0.05, 2.5);
      break;
    case "superior":
      inc = Math.max(cargaAtual * 0.025, Math.min(passo, 2), 1);
      break;
    default:
      inc = passo;
  }
  let nova = arredondarParaCima(cargaAtual + inc, passo);
  if (nova <= cargaAtual) nova = arredondarParaCima(cargaAtual + passo, passo);
  return nova;
}

export function atingiuTopo(reg: RegistroExercicio, item: Pick<ItemTreino, "series" | "repsMax">) {
  const feitas = seriesFeitas(reg);
  return (
    feitas.length >= item.series &&
    feitas.slice(0, item.series).every((s) => s.reps >= item.repsMax) &&
    feitas.every((s) => s.execucaoOk)
  );
}

/** Meta da próxima sessão (progressão dupla) */
export function calcularMeta(
  ex: Exercicio,
  item: ItemTreino,
  sessoes: Sessao[],
  passos: Record<Equipamento, number>,
  deload = false,
): MetaExercicio {
  const hist = historicoExercicio(sessoes, ex.id);
  const nSeries = deload ? Math.max(1, Math.ceil(item.series / 2)) : item.series;
  const ultimo = hist[hist.length - 1]?.registro;

  if (!ultimo) {
    return {
      series: Array.from({ length: nSeries }, () => ({ carga: 0, reps: item.repsMin })),
      subiuCarga: false,
      motivo: "Primeira vez: escolha uma carga para ~2 RIR no fundo da faixa.",
      primeiraVez: true,
    };
  }

  const feitas = seriesFeitas(ultimo);
  const cargaDe = (i: number) => (feitas[i] ?? feitas[feitas.length - 1]).carga;
  const repsDe = (i: number) => (feitas[i] ?? feitas[feitas.length - 1]).reps;

  if (deload) {
    return {
      series: Array.from({ length: nSeries }, (_, i) => ({ carga: cargaDe(i), reps: item.repsMin })),
      subiuCarga: false,
      motivo: "Deload: mesma carga, metade das séries, 3–4 RIR.",
      primeiraVez: false,
    };
  }

  const topo = atingiuTopo(ultimo, item);
  const semCarga = ex.tipo === "core" && feitas.every((s) => s.carga === 0);

  if (topo && semCarga) {
    return {
      series: Array.from({ length: nSeries }, (_, i) => ({ carga: 0, reps: repsDe(i) + 1 })),
      subiuCarga: false,
      sugestaoCore: true,
      motivo: "Passou do topo da faixa: adicione carga ou use uma variação mais difícil.",
      primeiraVez: false,
    };
  }

  if (topo) {
    const base = Math.max(...feitas.map((s) => s.carga));
    const nova = proximaCarga(ex, base, passos);
    return {
      series: Array.from({ length: nSeries }, () => ({ carga: nova, reps: item.repsMin })),
      subiuCarga: true,
      motivo: `Topo da faixa atingido em todas as séries: +${+(nova - base).toFixed(2)} kg.`,
      primeiraVez: false,
    };
  }

  // manter carga, buscar +1 rep em alguma série
  const series = Array.from({ length: nSeries }, (_, i) => ({
    carga: cargaDe(i),
    reps: Math.max(item.repsMin, Math.min(repsDe(i), item.repsMax)),
  }));
  const alvo = series.findIndex((s, i) => repsDe(i) < item.repsMax && s.reps < item.repsMax);
  if (alvo >= 0) series[alvo].reps = Math.max(item.repsMin, repsDe(alvo) + 1);
  const execRuim = feitas.some((s) => !s.execucaoOk);
  return {
    series,
    subiuCarga: false,
    motivo: execRuim
      ? "Execução não marcada como OK: mantenha a carga e capriche na técnica."
      : "Mantenha a carga e busque +1 repetição.",
    primeiraVez: false,
  };
}

export const e1rm = (carga: number, reps: number) => (reps <= 0 ? 0 : carga * (1 + reps / 30));

export const melhorE1rm = (r: RegistroExercicio) =>
  Math.max(0, ...seriesFeitas(r).map((s) => e1rm(s.carga, s.reps)));

export const resumoSeries = (r: RegistroExercicio) => {
  const f = seriesFeitas(r);
  if (!f.length) return "–";
  const cargas = new Set(f.map((s) => s.carga));
  if (cargas.size === 1) return `${f[0].carga}kg – ${f.map((s) => s.reps).join("/")}`;
  return f.map((s) => `${s.carga}×${s.reps}`).join(", ");
};

export const volumeCarga = (r: RegistroExercicio) => seriesFeitas(r).reduce((a, s) => a + s.carga * s.reps, 0);

/** Aquecimento sugerido para compostos */
export function aquecimento(cargaTrabalho: number, passo: number) {
  if (cargaTrabalho < 20) return [];
  const pcts = [
    [0.5, 8],
    [0.7, 4],
    [0.85, 2],
  ];
  return pcts.map(([p, reps]) => ({
    carga: Math.max(0, Math.round((cargaTrabalho * p) / passo) * passo),
    reps,
  }));
}

/** Anilhas por lado para uma carga na barra */
export function calcularAnilhas(total: number, barra: number, disponiveis: number[]) {
  let resto = (total - barra) / 2;
  const out: number[] = [];
  if (resto < 0) return { porLado: [], sobra: resto };
  for (const a of [...disponiveis].sort((x, y) => y - x)) {
    while (resto >= a - 1e-9) {
      out.push(a);
      resto = Math.round((resto - a) * 1000) / 1000;
    }
  }
  return { porLado: out, sobra: resto };
}
