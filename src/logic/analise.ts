import type { CheckinSemanal, Decisao, Exercicio, Pesagem, Sessao, Treino, Usuario } from "../types";
import { exercicioPorId } from "../data/exercicios";
import { MUSCULOS_PRIORITARIOS, MUSCULOS_VOLUME } from "../data/programa";
import { historicoExercicio, melhorE1rm, seriesFeitas } from "./progressao";
import { addDias, diasEntre, hojeISO, inicioSemana, parseDia, semanaAnterior, semanaISO } from "./datas";

export type StatusExercicio = "progredindo" | "estagnado" | "regredindo" | "novo";

interface Desempenho {
  carga: number;
  repsTotal: number;
}

const desempenho = (sessao: Sessao, exId: string): Desempenho => {
  const r = sessao.registros.find((x) => x.exercicioId === exId)!;
  const f = seriesFeitas(r);
  return { carga: Math.max(0, ...f.map((s) => s.carga)), repsTotal: f.reduce((a, s) => a + s.reps, 0) };
};

const melhorou = (ant: Desempenho, atual: Desempenho) =>
  atual.carga > ant.carga || (atual.carga === ant.carga && atual.repsTotal > ant.repsTotal);

const regrediu = (ant: Desempenho, atual: Desempenho) =>
  atual.carga === ant.carga && ant.repsTotal - atual.repsTotal >= 2;

/** Regra 3.3 */
export function statusExercicio(sessoes: Sessao[], exId: string): StatusExercicio {
  const h = historicoExercicio(sessoes, exId).map((x) => desempenho(x.sessao, exId));
  if (h.length < 2) return "novo";
  const n = h.length;
  if (regrediu(h[n - 2], h[n - 1])) return "regredindo";
  if (n >= 3 && !melhorou(h[n - 3], h[n - 2]) && !melhorou(h[n - 2], h[n - 1])) return "estagnado";
  return "progredindo";
}

export const exerciciosDoPrograma = (programa: Treino[]) => {
  const ids = new Set<string>();
  programa.forEach((t) => t.itens.forEach((i) => ids.add(i.exercicioId)));
  return [...ids];
};

/** exercícios realizados recentemente que pertencem ao programa ou substituíram algo */
function exerciciosAtivos(sessoes: Sessao[], programa: Treino[]) {
  const ids = new Set(exerciciosDoPrograma(programa));
  sessoes.slice(-12).forEach((s) => s.registros.forEach((r) => ids.add(r.exercicioId)));
  return [...ids];
}

export interface MotivoDeload {
  ativo: boolean;
  motivos: string[];
  compostosTravados: string[];
  semanasDesdeDeload: number;
}

/** Regra 3.4 */
export function avaliarDeload(
  sessoes: Sessao[],
  checkins: CheckinSemanal[],
  usuario: Usuario,
  programa: Treino[],
  extras: Exercicio[] = [],
  hoje = hojeISO(),
): MotivoDeload {
  const motivos: string[] = [];
  const compostosTravados = exerciciosAtivos(sessoes, programa).filter((id) => {
    const ex = exercicioPorId(id, extras);
    if (!ex || ex.tipo !== "composto") return false;
    const st = statusExercicio(sessoes, id);
    return st === "estagnado" || st === "regredindo";
  });
  if (compostosTravados.length >= 2) {
    const nomes = compostosTravados.map((id) => exercicioPorId(id, extras)?.nome ?? id);
    motivos.push(`${compostosTravados.length} compostos sem evolução: ${nomes.join(", ")}`);
  }

  const ord = [...checkins].sort((a, b) => b.semanaISO.localeCompare(a.semanaISO));
  if (ord.length >= 2) {
    const [a, b] = ord;
    const consecutivas = semanaAnterior(a.semanaISO) === b.semanaISO;
    const recente = diasEntre(a.data, hoje) <= 14;
    const ruim = (c: CheckinSemanal) => c.fadiga >= 8 || c.sono <= 4;
    if (consecutivas && recente && ruim(a) && ruim(b)) motivos.push("Fadiga alta ou sono ruim por 2 semanas seguidas");
  }

  const ref = usuario.ultimoDeload ?? usuario.inicioPrograma;
  const semanasDesdeDeload = Math.floor(diasEntre(ref, hoje) / 7);
  if (semanasDesdeDeload >= 10) motivos.push(`${semanasDesdeDeload} semanas desde o último deload`);

  return { ativo: motivos.length > 0, motivos, compostosTravados, semanasDesdeDeload };
}

/** Volume de referência por músculo (séries diretas por rotação completa) */
export function volumeReferencia(programa: Treino[], extras: Exercicio[] = [], metaSemanal = 4) {
  const ref: Record<string, number> = {};
  programa.forEach((t) =>
    t.itens.forEach((i) => {
      const ex = exercicioPorId(i.exercicioId, extras);
      if (!ex) return;
      ref[ex.musculoPrincipal] = (ref[ex.musculoPrincipal] ?? 0) + i.series;
    }),
  );
  const fator = metaSemanal / programa.length;
  Object.keys(ref).forEach((k) => (ref[k] = Math.round(ref[k] * fator * 10) / 10));
  return ref;
}

export function volumeSemana(sessoes: Sessao[], semana: string, extras: Exercicio[] = []) {
  const vol: Record<string, number> = {};
  sessoes
    .filter((s) => s.fim && semanaISO(s.data) === semana)
    .forEach((s) =>
      s.registros.forEach((r) => {
        const ex = exercicioPorId(r.exercicioId, extras);
        if (!ex) return;
        vol[ex.musculoPrincipal] = (vol[ex.musculoPrincipal] ?? 0) + seriesFeitas(r).length;
      }),
    );
  return vol;
}

export type FaixaVolume = "abaixo" | "dentro" | "acima";
export const faixaVolume = (feito: number, ref: number): FaixaVolume =>
  feito < ref * 0.8 ? "abaixo" : feito > ref * 1.15 ? "acima" : "dentro";

export const musculosVolume = (ref: Record<string, number>) => {
  const base: string[] = [...MUSCULOS_VOLUME];
  Object.keys(ref).forEach((m) => !base.includes(m) && base.push(m));
  return base;
};

export function sessoesDaSemana(sessoes: Sessao[], semana = semanaISO(new Date())) {
  return sessoes.filter((s) => s.fim && semanaISO(s.data) === semana);
}

/** média de peso dos últimos n dias até `ate` (inclusive) */
export function mediaPeso(pesagens: Pesagem[], ate: string, dias = 7) {
  const lim = addDias(parseDia(ate), -dias + 1);
  const fim = parseDia(ate);
  const v = pesagens.filter((p) => {
    const d = parseDia(p.data);
    return d >= lim && d <= fim;
  });
  if (!v.length) return undefined;
  return v.reduce((a, p) => a + p.peso, 0) / v.length;
}

export function mediaPesoSemanaISO(pesagens: Pesagem[], semana: string) {
  const v = pesagens.filter((p) => semanaISO(p.data) === semana);
  if (!v.length) return undefined;
  return v.reduce((a, p) => a + p.peso, 0) / v.length;
}

/** Série semanal de médias de peso */
export function mediasSemanais(pesagens: Pesagem[]) {
  const map = new Map<string, number[]>();
  pesagens.forEach((p) => {
    const k = semanaISO(p.data);
    map.set(k, [...(map.get(k) ?? []), p.peso]);
  });
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([semana, v]) => ({ semana, media: v.reduce((a, b) => a + b, 0) / v.length, n: v.length }));
}

/** Top N exercícios que mais evoluíram (e1RM) nas últimas ~4 semanas */
export function topEvolucao(sessoes: Sessao[], extras: Exercicio[] = [], n = 5, hoje = hojeISO(), janela = 35) {
  const ids = new Set<string>();
  sessoes.forEach((s) => s.registros.forEach((r) => ids.add(r.exercicioId)));
  const out: { id: string; nome: string; antes: number; agora: number; ganhoPct: number; porReps: boolean }[] = [];
  ids.forEach((id) => {
    const h = historicoExercicio(sessoes, id);
    if (h.length < 2) return;
    const ex = exercicioPorId(id, extras);
    const porReps = h.every((x) => seriesFeitas(x.registro).every((s) => s.carga === 0));
    const valor = (r: (typeof h)[number]) =>
      porReps ? seriesFeitas(r.registro).reduce((a, s) => a + s.reps, 0) : melhorE1rm(r.registro);
    const recentes = h.filter((x) => diasEntre(x.sessao.data, hoje) <= janela);
    const anteriores = h.filter((x) => diasEntre(x.sessao.data, hoje) > janela);
    const base = anteriores.length ? anteriores[anteriores.length - 1] : recentes[0];
    if (!recentes.length || !base) return;
    const agora = Math.max(...recentes.map(valor));
    const antes = valor(base);
    if (antes <= 0) return;
    out.push({ id, nome: ex?.nome ?? id, antes, agora, ganhoPct: ((agora - antes) / antes) * 100, porReps });
  });
  return out.sort((a, b) => b.ganhoPct - a.ganhoPct).slice(0, n);
}

export interface SugestaoVolume {
  decisao: Decisao;
  motivo: string;
  musculos: string[];
}

/** Regra 3.5 */
export function sugerirDecisaoVolume(
  sessoes: Sessao[],
  checkins: CheckinSemanal[],
  usuario: Usuario,
  programa: Treino[],
  extras: Exercicio[] = [],
  hoje = hojeISO(),
): SugestaoVolume {
  const deload = avaliarDeload(sessoes, checkins, usuario, programa, extras, hoje);
  if (deload.ativo) return { decisao: "deload", motivo: deload.motivos.join("; "), musculos: [] };

  const recentes = [...checkins].sort((a, b) => b.semanaISO.localeCompare(a.semanaISO)).slice(0, 4);
  const sono = recentes.length ? recentes.reduce((a, c) => a + c.sono, 0) / recentes.length : 7;
  const fadiga = recentes.length ? recentes.reduce((a, c) => a + c.fadiga, 0) / recentes.length : 5;
  const dor = recentes.filter((c) => c.dorArticular && c.dorArticular.trim()).map((c) => c.dorArticular!.trim());
  const recuperado = sono >= 7 && fadiga <= 6;

  const ids = exerciciosAtivos(sessoes, programa);
  const status = ids.map((id) => ({ id, ex: exercicioPorId(id, extras), st: statusExercicio(sessoes, id) }));
  const regredindo = status.filter((s) => s.st === "regredindo" && s.ex);
  const estagnadosPrioritarios = status.filter(
    (s) => s.st === "estagnado" && s.ex && MUSCULOS_PRIORITARIOS.includes(s.ex.musculoPrincipal),
  );

  if (regredindo.length && (!recuperado || dor.length)) {
    const musc = [...new Set(regredindo.map((s) => s.ex!.musculoPrincipal))];
    return {
      decisao: "reduzir",
      motivo: `Queda de desempenho com ${!recuperado ? `sono ${sono.toFixed(1)} / fadiga ${fadiga.toFixed(1)}` : `dor: ${dor.join(", ")}`}.`,
      musculos: musc,
    };
  }
  if (estagnadosPrioritarios.length && recuperado) {
    const musc = [...new Set(estagnadosPrioritarios.map((s) => s.ex!.musculoPrincipal))];
    return {
      decisao: "aumentar",
      motivo: `Músculo prioritário estagnado com boa recuperação (sono ${sono.toFixed(1)}, fadiga ${fadiga.toFixed(1)}): +1 série/semana.`,
      musculos: musc,
    };
  }
  return {
    decisao: "manter",
    motivo: recuperado
      ? "Cargas evoluindo e recuperação boa: mantenha o volume."
      : "Sem sinais claros para mudar. Priorize sono e recuperação antes de aumentar volume.",
    musculos: [],
  };
}

/** exercícios cuja próxima sessão terá aumento de carga */
export function prontosParaSubir(sessoes: Sessao[], programa: Treino[]) {
  const out: string[] = [];
  programa.forEach((t) =>
    t.itens.forEach((item) => {
      const h = historicoExercicio(sessoes, item.exercicioId);
      const u = h[h.length - 1]?.registro;
      if (!u) return;
      const f = seriesFeitas(u);
      if (f.length >= item.series && f.slice(0, item.series).every((s) => s.reps >= item.repsMax) && f.every((s) => s.execucaoOk))
        out.push(item.exercicioId);
    }),
  );
  return out;
}

export function sequenciaSemanas(sessoes: Sessao[], meta: number, hoje = new Date()) {
  // semanas consecutivas (até a anterior) com a meta cumprida
  let n = 0;
  let semana = semanaAnterior(semanaISO(hoje));
  for (let i = 0; i < 104; i++) {
    const qtd = sessoes.filter((s) => s.fim && semanaISO(s.data) === semana).length;
    if (qtd >= meta) n++;
    else break;
    semana = semanaAnterior(semana);
  }
  if (sessoesDaSemana(sessoes, semanaISO(hoje)).length >= meta) n++;
  return n;
}

export const inicioSemanaISO = (iso: string) => {
  const [y, w] = iso.split("-W").map(Number);
  const seg = inicioSemana(new Date(y, 0, 4));
  return addDias(seg, (w - 1) * 7);
};
