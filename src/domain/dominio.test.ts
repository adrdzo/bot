import { describe, expect, it } from 'vitest';
import { estadoInicial, proximoDaFila, TREINOS_PADRAO } from './programa';
import { calcularMeta, arredondarCarga, e1rm, nSeriesDeload, resumoRegistro } from './progressao';
import {
  aplicarDecisaoVolume,
  gatilhoDeload,
  prontosParaSubir,
  statusExercicio,
  sugestaoVolume,
  volumeReferencia,
  volumeSemana,
} from './analise';
import { semanaISO, deslocarSemana, inicioSemanaISO, dataLocal } from './datas';
import { calcularMetas, sugerirAjuste, tmb } from './nutricao';
import type { EstadoApp, Sessao, TreinoId } from './types';

let seq = 0;
function sessao(data: string, treinoId: TreinoId, regs: Record<string, [number, number[]]>, deload = false): Sessao {
  return {
    id: `s${seq++}`,
    data: new Date(data + 'T10:00:00').toISOString(),
    treinoId,
    deload,
    registros: Object.entries(regs).map(([exercicioId, [carga, reps]]) => ({
      exercicioId,
      series: reps.map((r, i) => ({ numero: i + 1, carga, reps: r, execucaoOk: true })),
    })),
  };
}

const item = (t: TreinoId, id: string) => TREINOS_PADRAO[t].itens.find((i) => i.exercicioId === id)!;

describe('rotação', () => {
  it('depois do INF1 vem o SUP2 e depois do INF2 volta ao SUP1', () => {
    expect(proximoDaFila('INF1')).toBe('SUP2');
    expect(proximoDaFila('INF2')).toBe('SUP1');
  });
});

describe('progressão dupla', () => {
  it('remada apoiada 40kg – 10/10/10 (faixa 8–10) → 41kg × 8', () => {
    const e = estadoInicial();
    e.sessoes = [sessao('2026-11-02', 'SUP1', { remada_apoiada: [40, [10, 10, 10]] })];
    const meta = calcularMeta(e.sessoes, item('SUP1', 'remada_apoiada'), e.exercicios.remada_apoiada, e.usuario);
    expect(meta.sobeCarga).toBe(true);
    expect(meta.series).toEqual([
      { carga: 41, reps: 8 },
      { carga: 41, reps: 8 },
      { carga: 41, reps: 8 },
    ]);
    expect(meta.ultima).toBe('40kg – 10/10/10');
  });

  it('respeita as anilhas disponíveis (menor anilha 2,5 kg → 42,5 kg)', () => {
    const e = estadoInicial();
    e.usuario.anilhasDisponiveis = [2.5, 5, 10, 20];
    expect(arredondarCarga(41, e.exercicios.remada_apoiada, e.usuario, 40)).toBe(42.5);
  });

  it('usa a lista de halteres quando existe', () => {
    const e = estadoInicial();
    e.usuario.halteresDisponiveis = [10, 12, 14, 16, 18, 20, 22.5, 25];
    expect(arredondarCarga(22.5, e.exercicios.supino_inclinado_halteres, e.usuario, 22)).toBe(22.5);
    expect(arredondarCarga(18.4, e.exercicios.supino_inclinado_halteres, e.usuario, 18)).toBe(20);
  });

  it('pernas compostas sobem 5% (mín. 2,5 kg)', () => {
    const e = estadoInicial();
    e.sessoes = [sessao('2026-11-02', 'INF1', { agachamento_livre: [100, [8, 8, 8]] })];
    const meta = calcularMeta(e.sessoes, item('INF1', 'agachamento_livre'), e.exercicios.agachamento_livre, e.usuario);
    expect(meta.series[0]).toEqual({ carga: 105, reps: 6 });
  });

  it('sem topo: mantém a carga e busca +1 rep na série mais fraca', () => {
    const e = estadoInicial();
    e.sessoes = [sessao('2026-11-02', 'SUP1', { remada_apoiada: [40, [10, 9, 8]] })];
    const meta = calcularMeta(e.sessoes, item('SUP1', 'remada_apoiada'), e.exercicios.remada_apoiada, e.usuario);
    expect(meta.sobeCarga).toBe(false);
    expect(meta.series.map((s) => s.reps)).toEqual([10, 9, 9]);
    expect(meta.series.every((s) => s.carga === 40)).toBe(true);
  });

  it('execução não-OK bloqueia a subida de carga', () => {
    const e = estadoInicial();
    const s = sessao('2026-11-02', 'SUP1', { remada_apoiada: [40, [10, 10, 10]] });
    s.registros[0].series[2].execucaoOk = false;
    e.sessoes = [s];
    expect(calcularMeta(e.sessoes, item('SUP1', 'remada_apoiada'), e.exercicios.remada_apoiada, e.usuario).sobeCarga).toBe(false);
  });

  it('core sem carga no topo sugere adicionar carga/variação', () => {
    const e = estadoInicial();
    e.sessoes = [sessao('2026-11-02', 'INF1', { ab_wheel: [0, [15, 15, 15]] })];
    const meta = calcularMeta(e.sessoes, item('INF1', 'ab_wheel'), e.exercicios.ab_wheel, e.usuario);
    expect(meta.dica).toMatch(/carga/);
  });

  it('ignora sessões de deload ao calcular a meta (retoma as cargas anteriores)', () => {
    const e = estadoInicial();
    e.sessoes = [
      sessao('2026-11-02', 'SUP1', { remada_apoiada: [40, [10, 9, 9]] }),
      sessao('2026-11-09', 'SUP1', { remada_apoiada: [40, [8, 8]] }, true),
    ];
    const meta = calcularMeta(e.sessoes, item('SUP1', 'remada_apoiada'), e.exercicios.remada_apoiada, e.usuario);
    expect(meta.ultima).toBe('40kg – 10/9/9');
  });

  it('e1RM de Epley e resumo', () => {
    expect(e1rm(100, 30)).toBe(200);
    expect(resumoRegistro({ exercicioId: 'x', series: [{ numero: 1, carga: 40, reps: 10, execucaoOk: true }, { numero: 2, carga: 40, reps: 9, execucaoOk: true }] })).toBe('40kg – 10/9');
  });
});

describe('deload', () => {
  it('semana de deload: metade das séries (3 → 2), mesmas cargas', () => {
    expect(nSeriesDeload(3)).toBe(2);
    expect(nSeriesDeload(4)).toBe(2);
    expect(nSeriesDeload(1)).toBe(1);
    const e = estadoInicial();
    e.sessoes = [sessao('2026-11-02', 'SUP2', { supino_reto: [80, [8, 8, 7]] })];
    const meta = calcularMeta(e.sessoes, item('SUP2', 'supino_reto'), e.exercicios.supino_reto, e.usuario, true);
    expect(meta.series).toHaveLength(2);
    expect(meta.series.every((s) => s.carga === 80)).toBe(true);
  });

  it('agachamento e supino reto sem melhora por 2 semanas → alerta de deload', () => {
    const e: EstadoApp = estadoInicial();
    e.sessoes = [
      sessao('2026-10-26', 'INF1', { agachamento_livre: [100, [8, 7, 6]] }),
      sessao('2026-10-27', 'SUP2', { supino_reto: [80, [8, 8, 7]] }),
      sessao('2026-11-02', 'INF1', { agachamento_livre: [100, [8, 7, 6]] }),
      sessao('2026-11-03', 'SUP2', { supino_reto: [80, [8, 8, 7]] }),
      sessao('2026-11-09', 'INF1', { agachamento_livre: [100, [7, 7, 6]] }),
      sessao('2026-11-10', 'SUP2', { supino_reto: [80, [8, 7, 7]] }),
    ];
    expect(statusExercicio(e.sessoes, 'agachamento_livre')).toBe('estagnado');
    const g = gatilhoDeload(e, new Date(2026, 10, 12));
    expect(g.ativo).toBe(true);
    expect(g.motivos[0]).toMatch(/Agachamento/);
  });

  it('progredindo não dispara deload', () => {
    const e = estadoInicial();
    e.sessoes = [
      sessao('2026-10-26', 'INF1', { agachamento_livre: [100, [8, 7, 6]] }),
      sessao('2026-11-02', 'INF1', { agachamento_livre: [100, [8, 8, 6]] }),
      sessao('2026-11-09', 'INF1', { agachamento_livre: [100, [8, 8, 7]] }),
    ];
    expect(statusExercicio(e.sessoes, 'agachamento_livre')).toBe('progredindo');
    expect(gatilhoDeload(e, new Date(2026, 10, 12)).ativo).toBe(false);
  });

  it('regressão: mesma carga com 2+ reps a menos', () => {
    const e = estadoInicial();
    e.sessoes = [
      sessao('2026-11-02', 'INF1', { agachamento_livre: [100, [8, 8, 7]] }),
      sessao('2026-11-09', 'INF1', { agachamento_livre: [100, [7, 7, 7]] }),
    ];
    expect(statusExercicio(e.sessoes, 'agachamento_livre')).toBe('regredindo');
  });

  it('fadiga alta por 2 semanas seguidas dispara deload', () => {
    const e = estadoInicial();
    const hoje = new Date(2026, 10, 15);
    const w = semanaISO(hoje);
    e.checkins = [
      { semanaISO: w, pesoMedio: 80, sono: 6, fadiga: 8, motivacao: 5 },
      { semanaISO: deslocarSemana(w, -1), pesoMedio: 80, sono: 4, fadiga: 5, motivacao: 5 },
    ];
    expect(gatilhoDeload(e, hoje).ativo).toBe(true);
  });

  it('10 semanas desde o último deload dispara deload', () => {
    const e = estadoInicial();
    e.usuario.ultimoDeload = '2026-09-01';
    expect(gatilhoDeload(e, new Date(2026, 10, 10)).motivos.join()).toMatch(/10 semanas/);
  });
});

describe('volume', () => {
  it('referência do programa padrão bate com a tabela 2.3', () => {
    const e = estadoInicial();
    expect(volumeReferencia(e.treinos, e.exercicios)).toEqual({
      Costas: 14,
      Peito: 6,
      'Deltoide lateral': 8,
      'Deltoide posterior': 5,
      Bíceps: 4,
      Tríceps: 4,
      Quadríceps: 12,
      Posteriores: 9,
      Panturrilha: 6,
      Abdômen: 6,
    });
  });

  it('costas = 14 séries depois de completar os 4 treinos', () => {
    const e = estadoInicial();
    const semana = '2026-W46';
    const seg = inicioSemanaISO(semana);
    e.sessoes = (['SUP1', 'INF1', 'SUP2', 'INF2'] as TreinoId[]).map((t, i) => {
      const d = new Date(seg);
      d.setDate(d.getDate() + i);
      return {
        id: t,
        data: d.toISOString(),
        treinoId: t,
        deload: false,
        registros: e.treinos[t].itens.map((it) => ({
          exercicioId: it.exercicioId,
          series: Array.from({ length: it.series }, (_, n) => ({ numero: n + 1, carga: 10, reps: it.repsMin, execucaoOk: true })),
        })),
      };
    });
    expect(volumeSemana(e, semana).Costas).toBe(14);
  });

  it('aplicar decisão: +1 série em isolado do grupo; −1 nunca abaixo de 1', () => {
    const e = estadoInicial();
    const mais = aplicarDecisaoVolume(e.treinos, e.exercicios, 'aumentar', ['Deltoide lateral']);
    expect(volumeReferencia(mais, e.exercicios)['Deltoide lateral']).toBe(9);
    const menos = aplicarDecisaoVolume(e.treinos, e.exercicios, 'reduzir', ['Costas']);
    expect(volumeReferencia(menos, e.exercicios).Costas).toBe(13);
  });

  it('decisão: prioritário estagnado com boa recuperação → aumentar', () => {
    const e = estadoInicial();
    const hoje = new Date(2026, 10, 15);
    e.sessoes = [
      sessao('2026-10-26', 'SUP1', { elevacao_lateral: [10, [13, 13, 12, 12]] }),
      sessao('2026-11-02', 'SUP1', { elevacao_lateral: [10, [13, 13, 12, 12]] }),
      sessao('2026-11-09', 'SUP1', { elevacao_lateral: [10, [13, 12, 12, 12]] }),
    ];
    e.checkins = [{ semanaISO: semanaISO(hoje), pesoMedio: 80, sono: 8, fadiga: 4, motivacao: 8 }];
    const s = sugestaoVolume(e, hoje);
    expect(s.decisao).toBe('aumentar');
    expect(s.grupos).toEqual(['Deltoide lateral']);
  });

  it('prontos para subir carga', () => {
    const e = estadoInicial();
    e.sessoes = [sessao('2026-11-02', 'SUP1', { remada_apoiada: [40, [10, 10, 10]], elevacao_lateral: [8, [15, 15, 14, 13]] })];
    expect(prontosParaSubir(e).map((p) => p.exercicioId)).toEqual(['remada_apoiada']);
  });
});

describe('nutrição', () => {
  it('Mifflin-St Jeor', () => {
    expect(tmb(80, 180, 30, 'M')).toBe(1780);
    expect(tmb(60, 165, 30, 'F')).toBeCloseTo(1320.25);
  });

  it('macros fecham as calorias', () => {
    const e = estadoInicial();
    const m = calcularMetas(e.usuario, 80);
    expect(m.proteina * 4 + m.gordura * 9 + m.carbo * 4).toBeCloseTo(m.kcal);
  });

  it('cutting perdendo devagar → sugerir −150 kcal', () => {
    const e = estadoInicial();
    e.usuario.modoNutricao = 'cutting';
    e.usuario.priorizarCintura = false;
    const hoje = new Date(2026, 10, 15);
    for (let i = 0; i < 14; i++) {
      const d = new Date(hoje);
      d.setDate(d.getDate() - i);
      e.pesagens.push({ data: dataLocal(d), peso: i < 7 ? 80 : 80.1 });
    }
    expect(sugerirAjuste(e, hoje)?.deltaKcal).toBe(-150);
  });
});
