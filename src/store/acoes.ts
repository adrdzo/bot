// Ações que alteram o estado (todas recebem um rascunho mutável)

import { deloadExpirado } from '../domain/analise';
import { dataLocal, hojeISO } from '../domain/datas';
import { proximoDaFila } from '../domain/programa';
import { calcularMeta, historicoExercicio, melhorE1rm, cargaTrabalho, atingiuTopo } from '../domain/progressao';
import type { EstadoApp, ItemTreino, RegistroRascunho, Sessao, TreinoId } from '../domain/types';

export const novoId = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

function registroRascunho(e: EstadoApp, item: ItemTreino, exercicioId: string, deload: boolean): RegistroRascunho {
  const ex = e.exercicios[exercicioId];
  const meta = calcularMeta(e.sessoes, item, ex, e.usuario, deload);
  return {
    exercicioId,
    planoExercicioId: item.exercicioId,
    series: meta.series.map((m, i) => ({ numero: i + 1, carga: m.carga, reps: m.reps, execucaoOk: true, feita: false })),
  };
}

export function iniciarSessao(e: EstadoApp, treinoId: TreinoId = e.usuario.proximoTreino) {
  const deload = !!e.deloadAtivo;
  const treino = e.treinos[treinoId];
  e.sessaoAtiva = {
    id: novoId(),
    inicio: new Date().toISOString(),
    treinoId,
    deload,
    registros: [...treino.itens].sort((a, b) => a.ordem - b.ordem).map((it) => registroRascunho(e, it, it.exercicioId, deload)),
  };
}

export function substituirExercicio(e: EstadoApp, indice: number, novoExercicioId: string) {
  const s = e.sessaoAtiva;
  if (!s) return;
  const atual = s.registros[indice];
  const item = e.treinos[s.treinoId].itens.find((i) => i.exercicioId === atual.planoExercicioId);
  if (!item) return;
  s.registros[indice] = registroRascunho(e, item, novoExercicioId, s.deload);
}

export interface ResumoSessao {
  sessao: Sessao;
  prs: { exercicioId: string; texto: string }[];
  sobemCarga: string[];
  seriesFeitas: number;
}

/** Salva as séries confirmadas, avança a fila e devolve o resumo (PRs + o que sobe). */
export function finalizarSessao(e: EstadoApp): ResumoSessao | undefined {
  const r = e.sessaoAtiva;
  if (!r) return;
  const fim = new Date();
  const sessao: Sessao = {
    id: r.id,
    data: r.inicio,
    treinoId: r.treinoId,
    deload: r.deload,
    duracaoMin: Math.max(1, Math.round((fim.getTime() - new Date(r.inicio).getTime()) / 60000)),
    registros: r.registros
      .map((reg) => ({
        exercicioId: reg.exercicioId,
        ...(reg.exercicioId !== reg.planoExercicioId ? { substituiuId: reg.planoExercicioId } : {}),
        series: reg.series
          .filter((s) => s.feita)
          .map((s, i) => ({ numero: i + 1, carga: s.carga, reps: s.reps, execucaoOk: s.execucaoOk, ...(s.rir !== undefined ? { rir: s.rir } : {}) })),
        ...(reg.nota ? { nota: reg.nota } : {}),
      }))
      .filter((reg) => reg.series.length > 0 || reg.nota),
  };

  // PRs: melhor e1RM ou maior carga já registrada
  const prs: ResumoSessao['prs'] = [];
  const sobemCarga: string[] = [];
  for (const reg of sessao.registros) {
    if (!reg.series.length) continue;
    const anteriores = historicoExercicio(e.sessoes, reg.exercicioId, true);
    if (anteriores.length) {
      const melhorAntes = Math.max(...anteriores.map((o) => melhorE1rm(o.registro)));
      const cargaAntes = Math.max(...anteriores.map((o) => cargaTrabalho(o.registro)));
      const e1 = melhorE1rm(reg);
      const c = cargaTrabalho(reg);
      if (c > cargaAntes) prs.push({ exercicioId: reg.exercicioId, texto: `Carga recorde: ${c}kg` });
      else if (e1 > melhorAntes + 0.01) prs.push({ exercicioId: reg.exercicioId, texto: `e1RM recorde: ${e1.toFixed(1)}kg` });
    }
    const planoId = reg.substituiuId ?? reg.exercicioId;
    const item = e.treinos[sessao.treinoId].itens.find((i) => i.exercicioId === planoId);
    if (!sessao.deload && item && cargaTrabalho(reg) > 0 && atingiuTopo(reg, item)) sobemCarga.push(reg.exercicioId);
  }

  if (sessao.registros.length) {
    e.sessoes.push(sessao);
    e.usuario.proximoTreino = proximoDaFila(r.treinoId);
  }
  e.sessaoAtiva = undefined;
  return { sessao, prs, sobemCarga, seriesFeitas: sessao.registros.reduce((t, x) => t + x.series.length, 0) };
}

export function iniciarDeload(e: EstadoApp) {
  const agora = new Date().toISOString();
  e.deloadAtivo = { inicio: agora };
  e.usuario.ultimoDeload = agora;
}

export function encerrarDeload(e: EstadoApp) {
  e.deloadAtivo = undefined;
}

/** Encerra automaticamente o deload depois de 7 dias. */
export function manutencao(e: EstadoApp, hoje = new Date()) {
  if (deloadExpirado(e, hoje)) e.deloadAtivo = undefined;
  // limpa marcações de notificação antigas
  const limite = dataLocal(new Date(hoje.getTime() - 40 * 86400000));
  e.notificacoesEnviadas = e.notificacoesEnviadas.filter((k) => (k.split('|')[1] ?? '') >= limite);
}

export function registrarPeso(e: EstadoApp, peso: number, data = hojeISO()) {
  e.pesagens = e.pesagens.filter((p) => p.data !== data);
  e.pesagens.push({ data, peso });
  e.pesagens.sort((a, b) => a.data.localeCompare(b.data));
}
