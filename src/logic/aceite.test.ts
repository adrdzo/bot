import { describe, expect, it } from "vitest";
import type { CheckinSemanal, RegistroExercicio, Sessao, TreinoId } from "../types";
import { EXERCICIOS, exercicioPorId } from "../data/exercicios";
import { PASSOS_PADRAO, PROGRAMA_PADRAO, ROTACAO } from "../data/programa";
import { calcularMeta, proximaCarga, e1rm, calcularAnilhas } from "./progressao";
import { avaliarDeload, statusExercicio, volumeReferencia, volumeSemana, sugerirDecisaoVolume } from "./analise";
import { semanaISO, semanaAnterior } from "./datas";
import { calcularMetas, tmbMifflin, sugerirAjuste } from "./nutricao";
import { USUARIO_PADRAO } from "../store/store";

const reg = (exercicioId: string, carga: number, reps: number[], ok = true): RegistroExercicio => ({
  exercicioId,
  repsMin: 0,
  repsMax: 0,
  series: reps.map((r, i) => ({ numero: i + 1, carga, reps: r, execucaoOk: ok, feita: true })),
});

let n = 0;
const sessao = (data: string, treinoId: TreinoId, registros: RegistroExercicio[], deload = false): Sessao => ({
  id: String(n++),
  data,
  fim: data,
  treinoId,
  deload,
  registros,
});

const item = (t: TreinoId, id: string) => PROGRAMA_PADRAO.find((x) => x.id === t)!.itens.find((i) => i.exercicioId === id)!;
const ex = (id: string) => exercicioPorId(id)!;

describe("rotação", () => {
  it("depois do INF1 vem o SUP2", () => {
    expect(ROTACAO[(ROTACAO.indexOf("INF1") + 1) % 4]).toBe("SUP2");
    expect(ROTACAO[(ROTACAO.indexOf("INF2") + 1) % 4]).toBe("SUP1");
  });
});

describe("progressão dupla", () => {
  it("remada apoiada 40kg 10/10/10 → 41kg × 8", () => {
    const s = [sessao("2026-11-02", "SUP1", [reg("remada-apoiada", 40, [10, 10, 10])])];
    const m = calcularMeta(ex("remada-apoiada"), item("SUP1", "remada-apoiada"), s, PASSOS_PADRAO);
    expect(m.subiuCarga).toBe(true);
    expect(m.series).toEqual([
      { carga: 41, reps: 8 },
      { carga: 41, reps: 8 },
      { carga: 41, reps: 8 },
    ]);
  });

  it("execução não-OK impede a subida", () => {
    const s = [sessao("2026-11-02", "SUP1", [reg("remada-apoiada", 40, [10, 10, 10], false)])];
    const m = calcularMeta(ex("remada-apoiada"), item("SUP1", "remada-apoiada"), s, PASSOS_PADRAO);
    expect(m.subiuCarga).toBe(false);
    expect(m.series[0].carga).toBe(40);
  });

  it("abaixo do topo: mantém carga e busca +1 rep", () => {
    const s = [sessao("2026-11-02", "SUP1", [reg("remada-apoiada", 40, [10, 9, 8])])];
    const m = calcularMeta(ex("remada-apoiada"), item("SUP1", "remada-apoiada"), s, PASSOS_PADRAO);
    expect(m.series.map((x) => x.carga)).toEqual([40, 40, 40]);
    expect(m.series.map((x) => x.reps)).toEqual([10, 10, 8]);
  });

  it("incrementos por categoria", () => {
    expect(proximaCarga(ex("agachamento"), 100, PASSOS_PADRAO)).toBe(105);
    expect(proximaCarga(ex("agachamento"), 40, PASSOS_PADRAO)).toBe(42.5);
    expect(proximaCarga(ex("supino-reto"), 80, PASSOS_PADRAO)).toBe(82.5);
    expect(proximaCarga(ex("supino-inclinado-halter"), 24, PASSOS_PADRAO)).toBe(26);
    expect(proximaCarga(ex("elevacao-lateral"), 10, PASSOS_PADRAO)).toBe(12);
    expect(proximaCarga(ex("cadeira-extensora"), 50, PASSOS_PADRAO)).toBe(51);
  });

  it("core sem carga progride por reps e sugere variação", () => {
    const s = [sessao("2026-11-02", "INF1", [reg("ab-wheel", 0, [15, 15, 15])])];
    const m = calcularMeta(ex("ab-wheel"), item("INF1", "ab-wheel"), s, PASSOS_PADRAO);
    expect(m.sugestaoCore).toBe(true);
    expect(m.series[0]).toEqual({ carga: 0, reps: 16 });
  });

  it("deload: metade das séries e mesma carga", () => {
    const s = [sessao("2026-11-02", "SUP1", [reg("remada-apoiada", 40, [10, 10, 10])])];
    const m = calcularMeta(ex("remada-apoiada"), item("SUP1", "remada-apoiada"), s, PASSOS_PADRAO, true);
    expect(m.series).toHaveLength(2);
    expect(m.series.every((x) => x.carga === 40)).toBe(true);
    const lat = calcularMeta(ex("elevacao-lateral"), item("SUP1", "elevacao-lateral"), [], PASSOS_PADRAO, true);
    expect(lat.series).toHaveLength(2);
  });

  it("sessões de deload não contam para a progressão", () => {
    const s = [
      sessao("2026-11-02", "SUP1", [reg("remada-apoiada", 40, [9, 9, 9])]),
      sessao("2026-11-09", "SUP1", [reg("remada-apoiada", 40, [8, 8])], true),
    ];
    const m = calcularMeta(ex("remada-apoiada"), item("SUP1", "remada-apoiada"), s, PASSOS_PADRAO);
    expect(m.series.map((x) => x.reps)).toEqual([10, 9, 9]);
  });
});

describe("estagnação e deload", () => {
  const base = [
    sessao("2026-10-26", "INF1", [reg("agachamento", 100, [8, 7, 6])]),
    sessao("2026-10-27", "SUP2", [reg("supino-reto", 80, [8, 8, 7])]),
    sessao("2026-11-02", "INF1", [reg("agachamento", 100, [8, 7, 6])]),
    sessao("2026-11-03", "SUP2", [reg("supino-reto", 80, [8, 8, 7])]),
    sessao("2026-11-09", "INF1", [reg("agachamento", 100, [8, 7, 6])]),
    sessao("2026-11-10", "SUP2", [reg("supino-reto", 80, [8, 7, 7])]),
  ];
  const usuario = { ...USUARIO_PADRAO, inicioPrograma: "2026-10-20" };

  it("detecta estagnação", () => {
    expect(statusExercicio(base, "agachamento")).toBe("estagnado");
    expect(statusExercicio(base, "supino-reto")).toBe("estagnado");
  });

  it("detecta regressão (−2 reps com a mesma carga)", () => {
    const s = [
      sessao("2026-11-02", "INF1", [reg("agachamento", 100, [8, 8, 8])]),
      sessao("2026-11-09", "INF1", [reg("agachamento", 100, [8, 7, 7])]),
    ];
    expect(statusExercicio(s, "agachamento")).toBe("regredindo");
  });

  it("agachamento + supino reto travados → alerta de deload", () => {
    const d = avaliarDeload(base, [], usuario, PROGRAMA_PADRAO, [], "2026-11-12");
    expect(d.ativo).toBe(true);
    expect(d.compostosTravados).toEqual(expect.arrayContaining(["agachamento", "supino-reto"]));
  });

  it("subir a carga conta como progresso", () => {
    const s = [...base.slice(0, 4), sessao("2026-11-09", "INF1", [reg("agachamento", 105, [6, 6, 6])])];
    expect(statusExercicio(s, "agachamento")).toBe("progredindo");
  });

  it("deload por fadiga/sono em 2 semanas seguidas", () => {
    const ck = (semana: string, fadiga: number, sono: number, data: string): CheckinSemanal => ({
      semanaISO: semana,
      data,
      sono,
      fadiga,
      motivacao: 5,
    });
    const c = [ck("2026-W45", 8, 6, "2026-11-08"), ck("2026-W46", 5, 4, "2026-11-15")];
    expect(avaliarDeload([], c, usuario, PROGRAMA_PADRAO, [], "2026-11-16").ativo).toBe(true);
    const c2 = [ck("2026-W45", 8, 6, "2026-11-08"), ck("2026-W46", 5, 6, "2026-11-15")];
    expect(avaliarDeload([], c2, usuario, PROGRAMA_PADRAO, [], "2026-11-16").ativo).toBe(false);
  });

  it("deload por 10 semanas", () => {
    expect(avaliarDeload([], [], { ...usuario, ultimoDeload: "2026-09-01" }, PROGRAMA_PADRAO, [], "2026-11-12").ativo).toBe(true);
  });

  it("decisão mensal sugere deload quando o gatilho está ativo", () => {
    expect(sugerirDecisaoVolume(base, [], usuario, PROGRAMA_PADRAO, [], "2026-11-12").decisao).toBe("deload");
  });
});

describe("volume", () => {
  it("referência do programa bate com a tabela 2.3", () => {
    const ref = volumeReferencia(PROGRAMA_PADRAO);
    expect(ref).toMatchObject({
      Costas: 14,
      "Deltoide lateral": 8,
      "Deltoide posterior": 5,
      Quadríceps: 12,
      Posteriores: 9,
      Peito: 6,
      Bíceps: 4,
      Tríceps: 4,
      Panturrilha: 6,
      Abdômen: 6,
    });
  });

  it("costas = 14 séries depois dos 4 treinos", () => {
    const sess = PROGRAMA_PADRAO.map((t, i) =>
      sessao(`2026-11-1${i}`, t.id, t.itens.map((it) => reg(it.exercicioId, 20, Array(it.series).fill(10)))),
    );
    const v = volumeSemana(sess, semanaISO("2026-11-10"));
    expect(v.Costas).toBe(14);
  });

  it("referência com 3 dias cai ~25%", () => {
    expect(volumeReferencia(PROGRAMA_PADRAO, [], 3).Costas).toBe(10.5);
  });
});

describe("datas, utilitários e nutrição", () => {
  it("semana ISO", () => {
    expect(semanaISO("2026-11-17")).toBe("2026-W47");
    expect(semanaAnterior("2026-W01")).toBe("2025-W52");
    expect(semanaAnterior("2026-W47")).toBe("2026-W46");
  });
  it("e1RM Epley", () => expect(e1rm(100, 10)).toBeCloseTo(133.33, 1));
  it("anilhas", () => expect(calcularAnilhas(100, 20, [20, 10, 5, 2.5, 1.25]).porLado).toEqual([20, 20]));
  it("Mifflin-St Jeor", () => expect(tmbMifflin(80, 180, 30, "M")).toBe(1780));
  it("metas de macro", () => {
    const m = calcularMetas({ ...USUARIO_PADRAO, modoNutricao: "cutting", nivelAtividade: "moderado", altura: 180, idade: 30 }, 80);
    expect(m.tdee).toBe(2759);
    expect(m.proteina).toBe(176);
  });
  it("ajuste nutricional: cutting com peso estável sugere −125 kcal", () => {
    const pes = Array.from({ length: 14 }, (_, i) => ({ data: `2026-11-${String(i + 3).padStart(2, "0")}`, peso: 80 }));
    const a = sugerirAjuste({ ...USUARIO_PADRAO, modoNutricao: "cutting", modoCintura: false }, pes, [], "2026-11-16");
    expect(a.deltaKcal).toBe(-125);
  });
  it("catálogo: substitutos apontam para exercícios existentes", () => {
    const ids = new Set(EXERCICIOS.map((e) => e.id));
    EXERCICIOS.forEach((e) => e.substitutos?.forEach((s) => expect(ids.has(s), `${e.id} → ${s}`).toBe(true)));
    PROGRAMA_PADRAO.forEach((t) => t.itens.forEach((i) => expect(ids.has(i.exercicioId)).toBe(true)));
  });
});
