// Módulo de nutrição (seção 4)

import { diasEntre, paraData, semanaISO, somarDias, dataLocal } from './datas';
import type { EstadoApp, ModoNutricao, NivelAtividade, Pesagem, Usuario } from './types';

export const FATOR_ATIVIDADE: Record<NivelAtividade, number> = {
  sedentario: 1.2,
  leve: 1.375,
  moderado: 1.55,
  alto: 1.725,
  muito_alto: 1.9,
};

export const ROTULO_ATIVIDADE: Record<NivelAtividade, string> = {
  sedentario: 'Sedentário (só o treino)',
  leve: 'Leve (treino + pouco movimento)',
  moderado: 'Moderado (treino + dia ativo)',
  alto: 'Alto (trabalho físico)',
  muito_alto: 'Muito alto (atleta / 2× ao dia)',
};

export const ROTULO_MODO: Record<ModoNutricao, string> = {
  cutting: 'Cutting leve',
  recomposicao: 'Recomposição',
  ganho: 'Ganho lento',
};

/** Mifflin-St Jeor. */
export function tmb(peso: number, alturaCm: number, idade: number, sexo: 'M' | 'F'): number {
  return 10 * peso + 6.25 * alturaCm - 5 * idade + (sexo === 'M' ? 5 : -161);
}

export interface Metas {
  tmb: number;
  tdee: number;
  kcal: number;
  proteina: number;
  gordura: number;
  carbo: number;
  ajusteAcumulado: number;
  meta: string;
}

export function calcularMetas(u: Usuario, peso: number, ajusteAcumulado = 0): Metas {
  const b = tmb(peso, u.altura, u.idade, u.sexo);
  const tdee = b * FATOR_ATIVIDADE[u.nivelAtividade];
  let kcal: number;
  let meta: string;
  switch (u.modoNutricao) {
    case 'cutting':
      kcal = tdee - 400;
      meta = '−0,5 a −1% do peso por semana';
      break;
    case 'ganho':
      kcal = tdee * 1.075;
      meta = '+0,25 a +0,5% do peso por mês';
      break;
    default:
      kcal = tdee;
      meta = 'Peso estável (±0,25%/sem.), cintura caindo';
  }
  kcal += ajusteAcumulado;
  const proteina = peso * (u.modoNutricao === 'cutting' ? 2.2 : 2.0);
  const gordura = peso * (u.modoNutricao === 'cutting' ? 0.7 : 0.8);
  const carbo = Math.max(0, (kcal - proteina * 4 - gordura * 9) / 4);
  return { tmb: b, tdee, kcal, proteina, gordura, carbo, ajusteAcumulado, meta };
}

/** Média das pesagens no intervalo [ini, fim] (datas inclusive). */
export function mediaPeso(pesagens: Pesagem[], ini: Date, fim: Date): { media?: number; n: number } {
  const a = dataLocal(ini);
  const b = dataLocal(fim);
  const l = pesagens.filter((p) => p.data >= a && p.data <= b);
  return { media: l.length ? l.reduce((t, p) => t + p.peso, 0) / l.length : undefined, n: l.length };
}

export function mediaSemanaISO(pesagens: Pesagem[], semana: string): number | undefined {
  const l = pesagens.filter((p) => semanaISO(paraData(p.data)) === semana);
  return l.length ? l.reduce((t, p) => t + p.peso, 0) / l.length : undefined;
}

export function pesoAtual(estado: EstadoApp): number | undefined {
  const ord = [...estado.pesagens].sort((a, b) => b.data.localeCompare(a.data));
  if (ord.length) return ord[0].peso;
  const av = [...estado.avaliacoes].sort((a, b) => b.data.localeCompare(a.data))[0];
  return av?.peso;
}

export interface SugestaoAjuste {
  deltaKcal: number;
  motivo: string;
  taxaSemanalPct: number;
  /** Já passou o intervalo de 2 semanas desde o último ajuste. */
  disponivel: boolean;
  diasParaProximo: number;
}

/**
 * Seção 4.3: compara a média de peso da última semana com a da semana anterior
 * (janela de 2 semanas) contra a meta do modo. No modo cintura, a cintura decide primeiro.
 */
export function sugerirAjuste(estado: EstadoApp, hoje: Date): SugestaoAjuste | undefined {
  const s1 = mediaPeso(estado.pesagens, somarDias(hoje, -6), hoje);
  const s0 = mediaPeso(estado.pesagens, somarDias(hoje, -13), somarDias(hoje, -7));
  if (s1.media === undefined || s0.media === undefined || s1.n < 3 || s0.n < 3) return undefined;

  const taxa = ((s1.media - s0.media) / s0.media) * 100; // %/semana
  const u = estado.usuario;
  const ultimoAjuste = [...estado.ajustesNutricao].sort((a, b) => b.data.localeCompare(a.data))[0];
  const diasDesde = ultimoAjuste ? diasEntre(paraData(ultimoAjuste.data), hoje) : Infinity;
  const disponivel = diasDesde >= 14;
  const diasParaProximo = disponivel ? 0 : 14 - diasDesde;

  // tendência da cintura (últimos check-ins com cintura)
  const cinturas = [...estado.checkins]
    .filter((c) => c.cinturaCm)
    .sort((a, b) => a.semanaISO.localeCompare(b.semanaISO))
    .slice(-3);
  const deltaCintura =
    cinturas.length >= 2 ? (cinturas[cinturas.length - 1].cinturaCm ?? 0) - (cinturas[0].cinturaCm ?? 0) : undefined;

  const r = (deltaKcal: number, motivo: string): SugestaoAjuste => ({ deltaKcal, motivo, taxaSemanalPct: taxa, disponivel, diasParaProximo });
  const fmt = (n: number) => `${n >= 0 ? '+' : ''}${n.toFixed(2)}%/sem.`;

  if (u.priorizarCintura && deltaCintura !== undefined) {
    if (u.modoNutricao === 'cutting' || u.modoNutricao === 'recomposicao') {
      if (u.modoNutricao === 'cutting' && taxa < -1) return r(+150, `Perda rápida demais (${fmt(taxa)}): proteja a massa magra.`);
      if (deltaCintura <= -0.5) return r(0, `Cintura caindo (${deltaCintura.toFixed(1)} cm): manter as calorias.`);
      if (deltaCintura >= 0.5) return r(-150, `Cintura subindo (+${deltaCintura.toFixed(1)} cm): reduzir as calorias.`);
    } else if (deltaCintura >= 1) {
      return r(-100, `Cintura subindo rápido no ganho (+${deltaCintura.toFixed(1)} cm): reduzir as calorias.`);
    }
  }

  switch (u.modoNutricao) {
    case 'cutting':
      if (taxa > -0.5) return r(-150, `Perda abaixo da meta (${fmt(taxa)}; meta −0,5 a −1%).`);
      if (taxa < -1) return r(+150, `Perda acima da meta (${fmt(taxa)}; meta −0,5 a −1%).`);
      return r(0, `Dentro da meta (${fmt(taxa)}).`);
    case 'ganho': {
      // +0,25 a +0,5%/mês ≈ +0,06 a +0,12%/semana
      if (taxa < 0.06) return r(+100, `Ganho abaixo da meta (${fmt(taxa)}; meta ≈ +0,06 a +0,12%/sem.).`);
      if (taxa > 0.12) return r(-100, `Ganho acima da meta (${fmt(taxa)}; meta ≈ +0,06 a +0,12%/sem.).`);
      return r(0, `Dentro da meta (${fmt(taxa)}).`);
    }
    default:
      if (taxa > 0.25) return r(-100, `Peso subindo (${fmt(taxa)}) na recomposição.`);
      if (taxa < -0.25) return r(+100, `Peso caindo (${fmt(taxa)}) na recomposição.`);
      return r(0, `Peso estável (${fmt(taxa)}).`);
  }
}
