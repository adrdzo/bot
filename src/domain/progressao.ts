// Progressão dupla (seção 3.2) e pré-preenchimento das séries

import type { Exercicio, ItemTreino, RegistroExercicio, Sessao, Usuario } from './types';

export interface Ocorrencia {
  sessao: Sessao;
  registro: RegistroExercicio;
}

/** Ocorrências de um exercício em ordem cronológica (sessões de deload excluídas por padrão). */
export function historicoExercicio(sessoes: Sessao[], exercicioId: string, incluirDeload = false): Ocorrencia[] {
  const out: Ocorrencia[] = [];
  for (const sessao of sessoes) {
    if (sessao.deload && !incluirDeload) continue;
    for (const registro of sessao.registros) {
      if (registro.exercicioId === exercicioId && registro.series.length > 0) out.push({ sessao, registro });
    }
  }
  return out.sort((a, b) => a.sessao.data.localeCompare(b.sessao.data));
}

export const cargaTrabalho = (r: RegistroExercicio) => Math.max(0, ...r.series.map((s) => s.carga));
export const totalReps = (r: RegistroExercicio) => r.series.reduce((t, s) => t + s.reps, 0);

/** e1RM de Epley: carga × (1 + reps/30). */
export const e1rm = (carga: number, reps: number) => (carga <= 0 || reps <= 0 ? 0 : carga * (1 + reps / 30));
export const melhorE1rm = (r: RegistroExercicio) => Math.max(0, ...r.series.map((s) => e1rm(s.carga, s.reps)));

const arred = (n: number, casas = 2) => Math.round(n * 10 ** casas) / 10 ** casas;

/** Número em pt-BR (vírgula decimal). */
export const fmtNum = (n: number, casas = 1) => n.toLocaleString('pt-BR', { maximumFractionDigits: casas });

export function formatarKg(n: number): string {
  return `${arred(n).toLocaleString('pt-BR', { maximumFractionDigits: 2 })}kg`;
}

/** "40kg – 10/9/8" (ou "40kg×10 · 42kg×8" quando as cargas variam). */
export function resumoRegistro(r: RegistroExercicio): string {
  if (r.series.length === 0) return '—';
  const cargas = new Set(r.series.map((s) => s.carga));
  if (cargas.size === 1) {
    const c = r.series[0].carga;
    const reps = r.series.map((s) => s.reps).join('/');
    return c > 0 ? `${formatarKg(c)} – ${reps}` : `${reps} reps`;
  }
  return r.series.map((s) => `${formatarKg(s.carga)}×${s.reps}`).join(' · ');
}

/** Incremento bruto conforme a tabela da seção 3.2. */
export function incrementoBruto(ex: Exercicio, carga: number): number {
  if (ex.tipo === 'composto') {
    const pct = ex.pernas ? 0.05 : 0.025;
    return Math.max(carga * pct, ex.incrementoKg);
  }
  return ex.incrementoKg;
}

/** Passo de arredondamento: menor anilha disponível (ou o incremento do exercício se não houver lista). */
export function passoCarga(ex: Exercicio, u: Usuario): number {
  const anilhas = u.anilhasDisponiveis.filter((a) => a > 0);
  return anilhas.length ? Math.min(...anilhas) : ex.incrementoKg || 1;
}

/**
 * Arredonda a carga-alvo para o valor disponível mais próximo, garantindo que fique
 * acima da carga anterior quando for uma subida.
 */
export function arredondarCarga(alvo: number, ex: Exercicio, u: Usuario, anterior?: number): number {
  if (ex.equipamento === 'halter' && u.halteresDisponiveis.length) {
    const lista = [...u.halteresDisponiveis].sort((a, b) => a - b);
    const candidatos = anterior !== undefined ? lista.filter((h) => h > anterior + 1e-9) : lista;
    if (!candidatos.length) return anterior ?? alvo;
    return candidatos.reduce((melhor, h) => (Math.abs(h - alvo) < Math.abs(melhor - alvo) ? h : melhor));
  }
  const passo = passoCarga(ex, u);
  let r = arred(Math.round(alvo / passo) * passo);
  if (anterior !== undefined && r <= anterior + 1e-9) r = arred(Math.ceil((anterior + 1e-9) / passo) * passo);
  if (anterior !== undefined && r <= anterior + 1e-9) r = arred(anterior + passo);
  return r;
}

/** Todas as séries de trabalho no topo da faixa, com execução OK. */
export function atingiuTopo(r: RegistroExercicio, item: Pick<ItemTreino, 'series' | 'repsMax'>): boolean {
  if (r.series.length < item.series) return false;
  return r.series.every((s) => s.reps >= item.repsMax && s.execucaoOk);
}

export interface MetaSerie {
  carga: number;
  reps: number;
}

export interface MetaExercicio {
  series: MetaSerie[];
  sobeCarga: boolean;
  /** Texto do último desempenho, ex. "40kg – 10/9/8". */
  ultima?: string;
  ultimaData?: string;
  /** Dica extra (ex.: core sem carga que passou do topo). */
  dica?: string;
}

export function nSeriesDeload(series: number): number {
  return Math.max(1, Math.ceil(series / 2));
}

/**
 * Calcula a meta da próxima sessão para um exercício.
 * - Sem histórico: carga em branco (0) e meta no fundo da faixa.
 * - Topo atingido: carga += incremento, reps = fundo da faixa.
 * - Senão: mesma carga, +1 rep na série mais fraca.
 * - Deload: metade das séries, mesma carga, reps no fundo da faixa (3–4 RIR).
 */
export function calcularMeta(
  sessoes: Sessao[],
  item: ItemTreino,
  ex: Exercicio,
  u: Usuario,
  deload = false,
): MetaExercicio {
  const hist = historicoExercicio(sessoes, ex.id);
  const ultimo = hist[hist.length - 1];
  const nSeries = deload ? nSeriesDeload(item.series) : item.series;

  if (!ultimo) {
    return { series: Array.from({ length: nSeries }, () => ({ carga: 0, reps: item.repsMin })), sobeCarga: false };
  }

  const r = ultimo.registro;
  const carga = cargaTrabalho(r);
  const base = { ultima: resumoRegistro(r), ultimaData: ultimo.sessao.data };

  if (deload) {
    return { ...base, series: Array.from({ length: nSeries }, () => ({ carga, reps: item.repsMin })), sobeCarga: false };
  }

  if (atingiuTopo(r, item)) {
    if (carga <= 0) {
      // core sem carga: progride por reps; passou do topo → sugerir carga ou variação
      return {
        ...base,
        series: Array.from({ length: nSeries }, () => ({ carga: 0, reps: item.repsMax })),
        sobeCarga: false,
        dica: 'Topo da faixa atingido: adicione carga ou use uma variação mais difícil.',
      };
    }
    const nova = arredondarCarga(carga + incrementoBruto(ex, carga), ex, u, carga);
    return { ...base, series: Array.from({ length: nSeries }, () => ({ carga: nova, reps: item.repsMin })), sobeCarga: true };
  }

  // manter carga, buscar +1 rep na série mais fraca
  const reps = Array.from({ length: nSeries }, (_, i) => {
    const s = r.series[i] ?? r.series[r.series.length - 1];
    return Math.min(s.reps, item.repsMax);
  });
  const menor = Math.min(...reps);
  const idx = reps.indexOf(menor);
  if (reps[idx] < item.repsMax) reps[idx] += 1;
  return { ...base, series: reps.map((rep) => ({ carga, reps: rep })), sobeCarga: false };
}
