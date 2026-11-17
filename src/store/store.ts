import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  AvaliacaoMensal,
  CheckinSemanal,
  DeloadAtivo,
  Exercicio,
  ItemTreino,
  Pesagem,
  RegistroExercicio,
  Sessao,
  Serie,
  Treino,
  TreinoId,
  Usuario,
} from "../types";
import { PASSOS_PADRAO, PROGRAMA_PADRAO, ROTACAO } from "../data/programa";
import { exercicioPorId } from "../data/exercicios";
import { calcularMeta } from "../logic/progressao";
import { hojeISO, uid } from "../logic/datas";

export const USUARIO_PADRAO: Usuario = {
  nome: "",
  altura: 178,
  idade: 28,
  sexo: "M",
  nivelAtividade: "moderado",
  modoNutricao: "recomposicao",
  modoCintura: true,
  ajusteKcal: 0,
  ajustesNutricao: [],
  passosCarga: { ...PASSOS_PADRAO },
  inicioPrograma: hojeISO(),
  proximoTreino: "SUP1",
  diasTreino: [1, 2, 4, 5],
  metaSemanal: 4,
  descansoComposto: 150,
  descansoIsolado: 75,
  notificacoes: false,
  lembretePesagem: false,
  onboarded: false,
  tema: "auto",
  barraKg: 20,
  anilhasDisponiveis: [25, 20, 15, 10, 5, 2.5, 1.25],
};

export interface Estado {
  usuario: Usuario;
  programa: Treino[];
  exerciciosCustom: Exercicio[];
  sessoes: Sessao[];
  sessaoAtual?: Sessao;
  pesagens: Pesagem[];
  checkins: CheckinSemanal[];
  avaliacoes: AvaliacaoMensal[];
  deloadAtivo?: DeloadAtivo;
  timerFim?: number;
  timerTotal?: number;
  ultimaNotificacao?: Record<string, string>;

  setUsuario: (p: Partial<Usuario>) => void;
  iniciarSessao: (treinoId?: TreinoId) => void;
  atualizarSerie: (ri: number, si: number, p: Partial<Serie>) => void;
  adicionarSerie: (ri: number) => void;
  removerSerie: (ri: number, si: number) => void;
  substituirExercicio: (ri: number, novoId: string) => void;
  notaExercicio: (ri: number, nota: string) => void;
  notaSessao: (nota: string) => void;
  finalizarSessao: () => string | undefined;
  descartarSessao: () => void;
  apagarSessao: (id: string) => void;
  setProximoTreino: (t: TreinoId) => void;

  iniciarTimer: (seg: number) => void;
  ajustarTimer: (delta: number) => void;
  pararTimer: () => void;

  addPesagem: (data: string, peso: number) => void;
  removerPesagem: (data: string) => void;
  salvarCheckin: (c: CheckinSemanal) => void;
  salvarAvaliacao: (a: AvaliacaoMensal) => void;
  apagarAvaliacao: (id: string) => void;

  iniciarDeload: () => void;
  cancelarDeload: () => void;
  aplicarAjusteNutricao: (delta: number, motivo: string) => void;

  atualizarItem: (t: TreinoId, idx: number, p: Partial<ItemTreino>) => void;
  adicionarItem: (t: TreinoId, exercicioId: string) => void;
  removerItem: (t: TreinoId, idx: number) => void;
  moverItem: (t: TreinoId, idx: number, dir: -1 | 1) => void;
  restaurarPrograma: () => void;
  ajustarSeriesMusculo: (musculo: string, delta: number) => void;
  adicionarExercicio: (e: Exercicio) => void;

  marcarNotificacao: (chave: string) => void;
  importar: (d: Partial<Estado>) => void;
  resetTudo: () => void;
}

const seriesDaMeta = (metaSeries: { carga: number; reps: number }[]): Serie[] =>
  metaSeries.map((m, i) => ({ numero: i + 1, carga: m.carga, reps: m.reps, execucaoOk: true, feita: false }));

function montarRegistro(
  item: ItemTreino,
  exId: string,
  st: Pick<Estado, "sessoes" | "usuario" | "exerciciosCustom">,
  deload: boolean,
): RegistroExercicio {
  const ex = exercicioPorId(exId, st.exerciciosCustom)!;
  const meta = calcularMeta(ex, item, st.sessoes, st.usuario.passosCarga, deload);
  return {
    exercicioId: exId,
    planejadoId: exId !== item.exercicioId ? item.exercicioId : undefined,
    repsMin: item.repsMin,
    repsMax: item.repsMax,
    series: seriesDaMeta(meta.series),
  };
}

const mapSessao = (s: Estado, f: (sa: Sessao) => Sessao) => (s.sessaoAtual ? { sessaoAtual: f(s.sessaoAtual) } : {});

export const useStore = create<Estado>()(
  persist(
    (set, get) => ({
      usuario: USUARIO_PADRAO,
      programa: PROGRAMA_PADRAO,
      exerciciosCustom: [],
      sessoes: [],
      pesagens: [],
      checkins: [],
      avaliacoes: [],

      setUsuario: (p) => set((s) => ({ usuario: { ...s.usuario, ...p } })),

      iniciarSessao: (treinoId) => {
        const s = get();
        const id = treinoId ?? s.usuario.proximoTreino;
        const treino = s.programa.find((t) => t.id === id)!;
        const deload = !!s.deloadAtivo;
        const sessao: Sessao = {
          id: uid(),
          data: new Date().toISOString(),
          treinoId: id,
          deload,
          registros: [...treino.itens]
            .sort((a, b) => a.ordem - b.ordem)
            .map((item) => montarRegistro(item, item.exercicioId, s, deload)),
        };
        set({ sessaoAtual: sessao });
      },

      atualizarSerie: (ri, si, p) =>
        set((s) =>
          mapSessao(s, (sa) => {
            const registros = sa.registros.map((r, i) => {
              if (i !== ri) return r;
              const series = r.series.map((se, j) => (j === si ? { ...se, ...p } : se));
              // ao alterar a carga de uma série ainda não feita, propaga para as seguintes não feitas
              if (p.carga !== undefined)
                for (let j = si + 1; j < series.length; j++)
                  if (!series[j].feita && series[j].carga === r.series[si].carga) series[j] = { ...series[j], carga: p.carga };
              return { ...r, series };
            });
            return { ...sa, registros };
          }),
        ),

      adicionarSerie: (ri) =>
        set((s) =>
          mapSessao(s, (sa) => ({
            ...sa,
            registros: sa.registros.map((r, i) => {
              if (i !== ri) return r;
              const u = r.series[r.series.length - 1];
              return {
                ...r,
                series: [
                  ...r.series,
                  { numero: r.series.length + 1, carga: u?.carga ?? 0, reps: u?.reps ?? r.repsMin, execucaoOk: true, feita: false },
                ],
              };
            }),
          })),
        ),

      removerSerie: (ri, si) =>
        set((s) =>
          mapSessao(s, (sa) => ({
            ...sa,
            registros: sa.registros.map((r, i) =>
              i !== ri ? r : { ...r, series: r.series.filter((_, j) => j !== si).map((se, j) => ({ ...se, numero: j + 1 })) },
            ),
          })),
        ),

      substituirExercicio: (ri, novoId) => {
        const s = get();
        if (!s.sessaoAtual) return;
        const treino = s.programa.find((t) => t.id === s.sessaoAtual!.treinoId)!;
        const reg = s.sessaoAtual.registros[ri];
        const planejado = reg.planejadoId ?? reg.exercicioId;
        const item = treino.itens.find((i) => i.exercicioId === planejado) ?? {
          exercicioId: planejado,
          ordem: ri + 1,
          series: reg.series.length,
          repsMin: reg.repsMin,
          repsMax: reg.repsMax,
        };
        const novo = montarRegistro(item, novoId, s, s.sessaoAtual.deload);
        set({
          sessaoAtual: { ...s.sessaoAtual, registros: s.sessaoAtual.registros.map((r, i) => (i === ri ? novo : r)) },
        });
      },

      notaExercicio: (ri, nota) =>
        set((s) => mapSessao(s, (sa) => ({ ...sa, registros: sa.registros.map((r, i) => (i === ri ? { ...r, nota } : r)) }))),

      notaSessao: (nota) => set((s) => mapSessao(s, (sa) => ({ ...sa, nota }))),

      finalizarSessao: () => {
        const s = get();
        const sa = s.sessaoAtual;
        if (!sa) return;
        const fim = new Date().toISOString();
        const final: Sessao = {
          ...sa,
          fim,
          duracaoMin: Math.round((new Date(fim).getTime() - new Date(sa.data).getTime()) / 60000),
          registros: sa.registros.filter((r) => r.series.some((x) => x.feita)),
        };
        const idx = ROTACAO.indexOf(sa.treinoId);
        const proximo = ROTACAO[(idx + 1) % ROTACAO.length];
        let deloadAtivo = s.deloadAtivo;
        let usuario: Usuario = { ...s.usuario, proximoTreino: proximo };
        if (sa.deload && deloadAtivo) {
          const rest = deloadAtivo.sessoesRestantes - 1;
          if (rest <= 0) {
            deloadAtivo = undefined;
            usuario = { ...usuario, ultimoDeload: hojeISO() };
          } else deloadAtivo = { ...deloadAtivo, sessoesRestantes: rest };
        }
        set({
          sessoes: [...s.sessoes, final],
          sessaoAtual: undefined,
          usuario,
          deloadAtivo,
          timerFim: undefined,
        });
        return final.id;
      },

      descartarSessao: () => set({ sessaoAtual: undefined, timerFim: undefined }),
      apagarSessao: (id) => set((s) => ({ sessoes: s.sessoes.filter((x) => x.id !== id) })),
      setProximoTreino: (t) => set((s) => ({ usuario: { ...s.usuario, proximoTreino: t } })),

      iniciarTimer: (seg) => set({ timerFim: Date.now() + seg * 1000, timerTotal: seg }),
      ajustarTimer: (d) =>
        set((s) => (s.timerFim ? { timerFim: s.timerFim + d * 1000, timerTotal: (s.timerTotal ?? 0) + d } : {})),
      pararTimer: () => set({ timerFim: undefined }),

      addPesagem: (data, peso) =>
        set((s) => ({
          pesagens: [...s.pesagens.filter((p) => p.data !== data), { data, peso }].sort((a, b) => a.data.localeCompare(b.data)),
        })),
      removerPesagem: (data) => set((s) => ({ pesagens: s.pesagens.filter((p) => p.data !== data) })),
      salvarCheckin: (c) =>
        set((s) => ({
          checkins: [...s.checkins.filter((x) => x.semanaISO !== c.semanaISO), c].sort((a, b) =>
            a.semanaISO.localeCompare(b.semanaISO),
          ),
        })),
      salvarAvaliacao: (a) =>
        set((s) => ({
          avaliacoes: [...s.avaliacoes.filter((x) => x.id !== a.id), a].sort((x, y) => x.data.localeCompare(y.data)),
        })),
      apagarAvaliacao: (id) => set((s) => ({ avaliacoes: s.avaliacoes.filter((x) => x.id !== id) })),

      iniciarDeload: () =>
        set((s) => ({ deloadAtivo: { inicio: hojeISO(), sessoesRestantes: s.usuario.metaSemanal } })),
      cancelarDeload: () => set({ deloadAtivo: undefined }),
      aplicarAjusteNutricao: (delta, motivo) =>
        set((s) => ({
          usuario: {
            ...s.usuario,
            ajusteKcal: s.usuario.ajusteKcal + delta,
            ajustesNutricao: [...s.usuario.ajustesNutricao, { data: hojeISO(), deltaKcal: delta, motivo }],
          },
        })),

      atualizarItem: (t, idx, p) =>
        set((s) => ({
          programa: s.programa.map((tr) =>
            tr.id !== t ? tr : { ...tr, itens: tr.itens.map((it, i) => (i === idx ? { ...it, ...p } : it)) },
          ),
        })),
      adicionarItem: (t, exercicioId) =>
        set((s) => ({
          programa: s.programa.map((tr) =>
            tr.id !== t
              ? tr
              : { ...tr, itens: [...tr.itens, { exercicioId, ordem: tr.itens.length + 1, series: 3, repsMin: 8, repsMax: 12 }] },
          ),
        })),
      removerItem: (t, idx) =>
        set((s) => ({
          programa: s.programa.map((tr) =>
            tr.id !== t ? tr : { ...tr, itens: tr.itens.filter((_, i) => i !== idx).map((it, i) => ({ ...it, ordem: i + 1 })) },
          ),
        })),
      moverItem: (t, idx, dir) =>
        set((s) => ({
          programa: s.programa.map((tr) => {
            if (tr.id !== t) return tr;
            const itens = [...tr.itens].sort((a, b) => a.ordem - b.ordem);
            const j = idx + dir;
            if (j < 0 || j >= itens.length) return tr;
            [itens[idx], itens[j]] = [itens[j], itens[idx]];
            return { ...tr, itens: itens.map((it, i) => ({ ...it, ordem: i + 1 })) };
          }),
        })),
      restaurarPrograma: () => set({ programa: PROGRAMA_PADRAO }),
      ajustarSeriesMusculo: (musculo, delta) =>
        set((s) => {
          // aplica no primeiro exercício (aumentar) ou no que tem mais séries (reduzir) daquele músculo
          const cands: { t: TreinoId; i: number; series: number }[] = [];
          s.programa.forEach((tr) =>
            tr.itens.forEach((it, i) => {
              if (exercicioPorId(it.exercicioId, s.exerciciosCustom)?.musculoPrincipal === musculo)
                cands.push({ t: tr.id, i, series: it.series });
            }),
          );
          if (!cands.length) return {};
          const alvo = delta > 0 ? cands.reduce((a, b) => (b.series < a.series ? b : a)) : cands.reduce((a, b) => (b.series > a.series ? b : a));
          return {
            programa: s.programa.map((tr) =>
              tr.id !== alvo.t
                ? tr
                : { ...tr, itens: tr.itens.map((it, i) => (i === alvo.i ? { ...it, series: Math.max(1, it.series + delta) } : it)) },
            ),
          };
        }),
      adicionarExercicio: (e) => set((s) => ({ exerciciosCustom: [...s.exerciciosCustom.filter((x) => x.id !== e.id), e] })),

      marcarNotificacao: (chave) =>
        set((s) => ({ ultimaNotificacao: { ...(s.ultimaNotificacao ?? {}), [chave]: hojeISO() } })),
      importar: (d) =>
        set(() => ({
          usuario: { ...USUARIO_PADRAO, ...(d.usuario ?? {}) },
          programa: d.programa ?? PROGRAMA_PADRAO,
          exerciciosCustom: d.exerciciosCustom ?? [],
          sessoes: d.sessoes ?? [],
          pesagens: d.pesagens ?? [],
          checkins: d.checkins ?? [],
          avaliacoes: d.avaliacoes ?? [],
          deloadAtivo: d.deloadAtivo,
          sessaoAtual: undefined,
        })),
      resetTudo: () =>
        set({
          usuario: { ...USUARIO_PADRAO, inicioPrograma: hojeISO() },
          programa: PROGRAMA_PADRAO,
          exerciciosCustom: [],
          sessoes: [],
          pesagens: [],
          checkins: [],
          avaliacoes: [],
          deloadAtivo: undefined,
          sessaoAtual: undefined,
        }),
    }),
    {
      name: "projeto-dragao",
      version: 1,
      partialize: (s) => ({
        usuario: s.usuario,
        programa: s.programa,
        exerciciosCustom: s.exerciciosCustom,
        sessoes: s.sessoes,
        sessaoAtual: s.sessaoAtual,
        pesagens: s.pesagens,
        checkins: s.checkins,
        avaliacoes: s.avaliacoes,
        deloadAtivo: s.deloadAtivo,
        timerFim: s.timerFim,
        timerTotal: s.timerTotal,
        ultimaNotificacao: s.ultimaNotificacao,
      }),
    },
  ),
);

export const useExercicio = (id: string) => {
  const extras = useStore((s) => s.exerciciosCustom);
  return exercicioPorId(id, extras);
};
