// Estagnação, gatilho de deload, volume semanal, decisão de volume (seções 2.3, 3.3–3.5, 5.3)

import { deslocarSemana, diasEntre, paraData, semanaISO } from './datas';
import {
  atingiuTopo,
  cargaTrabalho,
  historicoExercicio,
  melhorE1rm,
  totalReps,
  type Ocorrencia,
} from './progressao';
import type { CheckinSemanal, DecisaoVolume, EstadoApp, Grupo, RegistroExercicio, Sessao, Treino, TreinoId, Exercicio } from './types';

export type StatusExercicio = 'novo' | 'progredindo' | 'estagnado' | 'regredindo';

export const GRUPOS: Grupo[] = [
  'Costas',
  'Deltoide lateral',
  'Deltoide posterior',
  'Quadríceps',
  'Posteriores',
  'Glúteo',
  'Peito',
  'Bíceps',
  'Tríceps',
  'Panturrilha',
  'Abdômen',
];

/** Houve melhora de `a` para `b`? (carga maior, ou mesma carga com mais reps totais) */
export function melhorou(a: RegistroExercicio, b: RegistroExercicio): boolean {
  const ca = cargaTrabalho(a);
  const cb = cargaTrabalho(b);
  if (cb > ca + 1e-9) return true;
  if (Math.abs(cb - ca) < 1e-9) return totalReps(b) > totalReps(a);
  // carga menor: só conta como melhora se o e1RM subiu
  return melhorE1rm(b) > melhorE1rm(a) + 1e-9;
}

/** Regrediu: mesma carga e reps totais caíram ≥ 2. */
export function regrediu(a: RegistroExercicio, b: RegistroExercicio): boolean {
  return Math.abs(cargaTrabalho(a) - cargaTrabalho(b)) < 1e-9 && totalReps(b) <= totalReps(a) - 2;
}

export function statusDeHistorico(hist: Ocorrencia[]): StatusExercicio {
  const n = hist.length;
  if (n < 2) return 'novo';
  const [a, b] = [hist[n - 2].registro, hist[n - 1].registro];
  if (regrediu(a, b)) return 'regredindo';
  if (n >= 3 && !melhorou(hist[n - 3].registro, a) && !melhorou(a, b)) return 'estagnado';
  return 'progredindo';
}

export function statusExercicio(sessoes: Sessao[], exercicioId: string, desde?: string): StatusExercicio {
  let hist = historicoExercicio(sessoes, exercicioId);
  if (desde) hist = hist.filter((o) => o.sessao.data >= desde);
  return statusDeHistorico(hist);
}

export const ROTULO_STATUS: Record<StatusExercicio, string> = {
  novo: 'poucos dados',
  progredindo: 'progredindo',
  estagnado: 'estagnado',
  regredindo: 'regredindo',
};

/** Ids de exercícios que aparecem em sessões (opcionalmente a partir de uma data). */
export function exerciciosRealizados(sessoes: Sessao[], desde?: string): string[] {
  const ids = new Set<string>();
  for (const s of sessoes) {
    if (desde && s.data < desde) continue;
    for (const r of s.registros) if (r.series.length) ids.add(r.exercicioId);
  }
  return [...ids];
}

export interface GatilhoDeload {
  ativo: boolean;
  motivos: string[];
}

/** Os dois check-ins mais recentes são de semanas seguidas e ambos com fadiga ≥ 8 ou sono ≤ 4? */
export function recuperacaoRuimDuasSemanas(checkins: CheckinSemanal[], hoje: Date): boolean {
  const ord = [...checkins].sort((a, b) => b.semanaISO.localeCompare(a.semanaISO));
  if (ord.length < 2) return false;
  const [c1, c2] = ord;
  const atual = semanaISO(hoje);
  const recente = c1.semanaISO === atual || c1.semanaISO === deslocarSemana(atual, -1);
  const seguidas = deslocarSemana(c1.semanaISO, -1) === c2.semanaISO;
  const ruim = (c: CheckinSemanal) => c.fadiga >= 8 || c.sono <= 4;
  return recente && seguidas && ruim(c1) && ruim(c2);
}

/** Data de referência do último deload (ou da primeira sessão, se nunca houve deload). */
export function referenciaDeload(estado: EstadoApp): string | undefined {
  if (estado.usuario.ultimoDeload) return estado.usuario.ultimoDeload;
  const primeira = [...estado.sessoes].sort((a, b) => a.data.localeCompare(b.data))[0];
  return primeira?.data;
}

export function semanasDesdeDeload(estado: EstadoApp, hoje: Date): number | undefined {
  const ref = referenciaDeload(estado);
  if (!ref) return undefined;
  return Math.floor(diasEntre(paraData(ref), hoje) / 7);
}

/** Seção 3.4: qualquer condição verdadeira → sugerir deload. */
export function gatilhoDeload(estado: EstadoApp, hoje: Date): GatilhoDeload {
  if (estado.deloadAtivo) return { ativo: false, motivos: [] };
  const motivos: string[] = [];
  const desde = estado.usuario.ultimoDeload;

  const compostosRuins = exerciciosRealizados(estado.sessoes, desde)
    .map((id) => estado.exercicios[id])
    .filter((e): e is Exercicio => !!e && e.tipo === 'composto')
    .filter((e) => {
      const st = statusExercicio(estado.sessoes, e.id, desde);
      return st === 'estagnado' || st === 'regredindo';
    });
  if (compostosRuins.length >= 2) {
    motivos.push(`${compostosRuins.length} compostos sem progresso: ${compostosRuins.map((e) => e.nome).join(', ')}`);
  }

  if (recuperacaoRuimDuasSemanas(estado.checkins, hoje)) {
    motivos.push('Fadiga ≥ 8 ou sono ≤ 4 por 2 semanas seguidas');
  }

  const semanas = semanasDesdeDeload(estado, hoje);
  if (semanas !== undefined && semanas >= 10) {
    motivos.push(`${semanas} semanas desde o último deload`);
  }

  return { ativo: motivos.length > 0, motivos };
}

/** O deload ativo termina 7 dias após o início. */
export function deloadExpirado(estado: EstadoApp, hoje: Date): boolean {
  return !!estado.deloadAtivo && diasEntre(paraData(estado.deloadAtivo.inicio), hoje) >= 7;
}

// ---------------- Volume ----------------

export type VolumePorGrupo = Partial<Record<Grupo, number>>;

/** Séries planejadas por grupo somando os 4 treinos (= tabela 2.3 com o programa padrão). */
export function volumeReferencia(treinos: Record<TreinoId, Treino>, exercicios: Record<string, Exercicio>): VolumePorGrupo {
  const v: VolumePorGrupo = {};
  for (const t of Object.values(treinos)) {
    for (const it of t.itens) {
      const g = exercicios[it.exercicioId]?.grupo;
      if (g) v[g] = (v[g] ?? 0) + it.series;
    }
  }
  return v;
}

/** Séries realizadas por grupo nas sessões da semana ISO informada. */
export function volumeSemana(estado: EstadoApp, semana: string): VolumePorGrupo {
  const v: VolumePorGrupo = {};
  for (const s of estado.sessoes) {
    if (semanaISO(paraData(s.data)) !== semana) continue;
    for (const r of s.registros) {
      const g = estado.exercicios[r.exercicioId]?.grupo;
      if (g) v[g] = (v[g] ?? 0) + r.series.length;
    }
  }
  return v;
}

export type FaixaVolume = 'abaixo' | 'dentro' | 'acima';

export function classificarVolume(feito: number, alvo: number): FaixaVolume {
  if (alvo <= 0) return feito > 0 ? 'acima' : 'dentro';
  if (feito < alvo * 0.85) return 'abaixo';
  if (feito > alvo * 1.15) return 'acima';
  return 'dentro';
}

export function sessoesDaSemana(sessoes: Sessao[], semana: string): Sessao[] {
  return sessoes.filter((s) => semanaISO(paraData(s.data)) === semana);
}

// ---------------- Prontos para subir / evolução ----------------

export interface ProntoParaSubir {
  treinoId: TreinoId;
  exercicioId: string;
}

export function prontosParaSubir(estado: EstadoApp): ProntoParaSubir[] {
  const out: ProntoParaSubir[] = [];
  for (const t of Object.values(estado.treinos)) {
    for (const it of t.itens) {
      const hist = historicoExercicio(estado.sessoes, it.exercicioId);
      const ult = hist[hist.length - 1];
      if (ult && cargaTrabalho(ult.registro) > 0 && atingiuTopo(ult.registro, it)) {
        out.push({ treinoId: t.id, exercicioId: it.exercicioId });
      }
    }
  }
  return out;
}

export interface Evolucao {
  exercicioId: string;
  de: number;
  para: number;
  pct: number;
}

/** Top N exercícios por ganho de e1RM entre ~28 dias atrás e a sessão mais recente. */
export function topEvolucao(estado: EstadoApp, hoje: Date, n = 5, janelaDias = 28): Evolucao[] {
  const out: Evolucao[] = [];
  for (const id of exerciciosRealizados(estado.sessoes)) {
    const hist = historicoExercicio(estado.sessoes, id);
    if (hist.length < 2) continue;
    const ultimo = hist[hist.length - 1];
    if (diasEntre(paraData(ultimo.sessao.data), hoje) > janelaDias) continue;
    const limite = diasEntre(paraData(hist[0].sessao.data), hoje) >= janelaDias;
    const base =
      (limite && [...hist].reverse().find((o) => diasEntre(paraData(o.sessao.data), hoje) >= janelaDias)) || hist[0];
    if (base === ultimo) continue;
    const de = melhorE1rm(base.registro);
    const para = melhorE1rm(ultimo.registro);
    if (de <= 0 || para <= de) continue;
    out.push({ exercicioId: id, de, para, pct: (para / de - 1) * 100 });
  }
  return out.sort((a, b) => b.pct - a.pct).slice(0, n);
}

// ---------------- Decisão de volume (3.5) ----------------

export interface SugestaoVolume {
  decisao: DecisaoVolume;
  grupos: Grupo[];
  motivos: string[];
  sonoMedio?: number;
  fadigaMedia?: number;
}

export function sugestaoVolume(estado: EstadoApp, hoje: Date): SugestaoVolume {
  const gat = gatilhoDeload(estado, hoje);
  if (gat.ativo) return { decisao: 'deload', grupos: [], motivos: gat.motivos };

  const semanaAtual = semanaISO(hoje);
  const ultimas = Array.from({ length: 5 }, (_, i) => deslocarSemana(semanaAtual, -i));
  const cks = estado.checkins.filter((c) => ultimas.includes(c.semanaISO));
  const media = (f: (c: CheckinSemanal) => number) => (cks.length ? cks.reduce((t, c) => t + f(c), 0) / cks.length : undefined);
  const sonoMedio = media((c) => c.sono);
  const fadigaMedia = media((c) => c.fadiga);
  const dor = cks.some((c) => !!c.dorArticular);

  const desde = (() => {
    const d = new Date(hoje);
    d.setDate(d.getDate() - 35);
    return d.toISOString();
  })();
  const recentes = exerciciosRealizados(estado.sessoes.filter((s) => !s.deload), desde);
  const comStatus = recentes.map((id) => ({ ex: estado.exercicios[id], st: statusExercicio(estado.sessoes, id, estado.usuario.ultimoDeload) }));
  const ruins = comStatus.filter((x) => x.ex && (x.st === 'regredindo' || x.st === 'estagnado'));
  const queda = comStatus.filter((x) => x.ex && x.st === 'regredindo');
  const gruposDe = (l: typeof comStatus) => [...new Set(l.map((x) => x.ex.grupo))];

  if (sonoMedio === undefined || fadigaMedia === undefined) {
    return { decisao: 'manter', grupos: [], motivos: ['Sem check-ins recentes: faça os check-ins semanais para uma sugestão melhor.'] };
  }

  const recuperacaoBoa = sonoMedio >= 7 && fadigaMedia <= 6 && !dor;
  const motivosRec = [`Sono médio ${sonoMedio.toFixed(1)}`, `Fadiga média ${fadigaMedia.toFixed(1)}`];
  if (dor) motivosRec.push('Dor articular relatada');

  if (!recuperacaoBoa && (queda.length > 0 || ruins.length > 0 || dor)) {
    const afetados = gruposDe(queda.length ? queda : ruins);
    return {
      decisao: 'reduzir',
      grupos: afetados,
      sonoMedio,
      fadigaMedia,
      motivos: [
        ...(queda.length ? [`Queda de desempenho: ${queda.map((x) => x.ex.nome).join(', ')}`] : []),
        ...(!queda.length && ruins.length ? [`Sem progresso: ${ruins.map((x) => x.ex.nome).join(', ')}`] : []),
        ...motivosRec,
      ],
    };
  }

  if (recuperacaoBoa) {
    const prioritariosEstagnados = gruposDe(
      comStatus.filter((x) => x.ex && x.st === 'estagnado' && estado.usuario.gruposPrioritarios.includes(x.ex.grupo)),
    );
    if (prioritariosEstagnados.length) {
      return {
        decisao: 'aumentar',
        grupos: prioritariosEstagnados,
        sonoMedio,
        fadigaMedia,
        motivos: [`Músculo prioritário estagnado: ${prioritariosEstagnados.join(', ')}`, ...motivosRec],
      };
    }
  }

  return {
    decisao: 'manter',
    grupos: [],
    sonoMedio,
    fadigaMedia,
    motivos: [ruins.length ? 'Alguns exercícios sem progresso, mas sem sinal claro para mudar o volume' : 'Cargas subindo', ...motivosRec],
  };
}

/**
 * Aplica a decisão confirmada ao programa: +1 série/semana (aumentar) ou −1 série (reduzir)
 * por grupo. Prefere mexer em isolados; nunca deixa um item com menos de 1 série.
 */
export function aplicarDecisaoVolume(
  treinos: Record<TreinoId, Treino>,
  exercicios: Record<string, Exercicio>,
  decisao: 'aumentar' | 'reduzir',
  grupos: Grupo[],
): Record<TreinoId, Treino> {
  const novo = structuredClone(treinos);
  for (const g of grupos) {
    const itens = Object.values(novo)
      .flatMap((t) => t.itens)
      .filter((it) => exercicios[it.exercicioId]?.grupo === g);
    if (!itens.length) continue;
    const prio = (it: (typeof itens)[number]) => (exercicios[it.exercicioId].tipo === 'composto' ? 1 : 0);
    if (decisao === 'aumentar') {
      const alvo = [...itens].sort((a, b) => prio(a) - prio(b) || a.series - b.series)[0];
      alvo.series += 1;
    } else {
      const alvo = [...itens].filter((it) => it.series > 1).sort((a, b) => prio(a) - prio(b) || b.series - a.series)[0];
      if (alvo) alvo.series -= 1;
    }
  }
  return novo;
}
