import type { CheckinSemanal, ModoNutricao, NivelAtividade, Pesagem, Usuario } from "../types";
import { addDias, diasEntre, hojeISO, parseDia } from "./datas";

export const FATORES: Record<NivelAtividade, { fator: number; nome: string; desc: string }> = {
  sedentario: { fator: 1.2, nome: "Sedentário", desc: "Trabalho sentado, pouco movimento" },
  leve: { fator: 1.375, nome: "Leve", desc: "Treino 3x/sem, poucos passos" },
  moderado: { fator: 1.55, nome: "Moderado", desc: "Treino 3–5x/sem, ~8 mil passos" },
  alto: { fator: 1.725, nome: "Alto", desc: "Treino 4–6x/sem + dia ativo" },
  muitoAlto: { fator: 1.9, nome: "Muito alto", desc: "Trabalho físico pesado" },
};

export const MODOS: Record<ModoNutricao, { nome: string; meta: string; minPctSem: number; maxPctSem: number }> = {
  cutting: { nome: "Cutting leve", meta: "−0,5 a −1% do peso/semana", minPctSem: -1, maxPctSem: -0.5 },
  recomposicao: { nome: "Recomposição", meta: "Peso estável (±0,25%/semana)", minPctSem: -0.25, maxPctSem: 0.25 },
  ganho: { nome: "Ganho lento", meta: "+0,25 a 0,5% do peso/mês", minPctSem: 0.06, maxPctSem: 0.12 },
};

export const tmbMifflin = (peso: number, altura: number, idade: number, sexo: "M" | "F") =>
  10 * peso + 6.25 * altura - 5 * idade + (sexo === "M" ? 5 : -161);

export interface Metas {
  tmb: number;
  tdee: number;
  kcal: number;
  proteina: number;
  gordura: number;
  carbo: number;
  faixaProteina: [number, number];
}

export function calcularMetas(u: Usuario, peso: number): Metas {
  const tmb = tmbMifflin(peso, u.altura, u.idade, u.sexo);
  const tdee = tmb * FATORES[u.nivelAtividade].fator;
  let kcal = tdee;
  if (u.modoNutricao === "cutting") kcal = tdee - 400;
  if (u.modoNutricao === "ganho") kcal = tdee * 1.075;
  kcal += u.ajusteKcal;
  const gpk = u.modoNutricao === "cutting" ? 2.2 : 2.0;
  const proteina = peso * gpk;
  const gordura = peso * (u.modoNutricao === "cutting" ? 0.7 : 0.8);
  const carbo = Math.max(0, (kcal - proteina * 4 - gordura * 9) / 4);
  return {
    tmb: Math.round(tmb),
    tdee: Math.round(tdee),
    kcal: Math.round(kcal / 10) * 10,
    proteina: Math.round(proteina),
    gordura: Math.round(gordura),
    carbo: Math.round(carbo),
    faixaProteina: [Math.round(peso * 1.8), Math.round(peso * 2.2)],
  };
}

/** inclinação (kg/dia) por regressão linear */
function inclinacao(pontos: { x: number; y: number }[]) {
  const n = pontos.length;
  const mx = pontos.reduce((a, p) => a + p.x, 0) / n;
  const my = pontos.reduce((a, p) => a + p.y, 0) / n;
  const num = pontos.reduce((a, p) => a + (p.x - mx) * (p.y - my), 0);
  const den = pontos.reduce((a, p) => a + (p.x - mx) ** 2, 0);
  return den === 0 ? 0 : num / den;
}

export interface AjusteSugerido {
  pronto: boolean;
  deltaKcal: number;
  taxaPctSemana?: number;
  variacaoCintura?: number;
  mensagem: string;
  diasParaProximo: number;
}

/** Regra 4.3 */
export function sugerirAjuste(
  u: Usuario,
  pesagens: Pesagem[],
  checkins: CheckinSemanal[],
  hoje = hojeISO(),
): AjusteSugerido {
  const ultimo = u.ajustesNutricao[u.ajustesNutricao.length - 1]?.data;
  const diasDesde = ultimo ? diasEntre(ultimo, hoje) : 999;
  const diasParaProximo = Math.max(0, 14 - diasDesde);
  const lim = addDias(parseDia(hoje), -13);
  const janela = pesagens.filter((p) => parseDia(p.data) >= lim && parseDia(p.data) <= parseDia(hoje));
  if (janela.length < 6) {
    return {
      pronto: false,
      deltaKcal: 0,
      diasParaProximo,
      mensagem: `Registre pelo menos 6 pesagens em 14 dias (você tem ${janela.length}).`,
    };
  }
  const pts = janela.map((p) => ({ x: diasEntre(lim, p.data), y: p.peso }));
  const media = janela.reduce((a, p) => a + p.peso, 0) / janela.length;
  const taxaPctSemana = ((inclinacao(pts) * 7) / media) * 100;
  const modo = MODOS[u.modoNutricao];

  let delta = 0;
  let msg: string;
  if (taxaPctSemana < modo.minPctSem) {
    delta = 125;
    msg = `Peso caindo mais rápido que a meta (${taxaPctSemana.toFixed(2)}%/sem). Sugestão: +125 kcal.`;
  } else if (taxaPctSemana > modo.maxPctSem) {
    delta = -125;
    msg = `Peso acima da meta (${taxaPctSemana.toFixed(2)}%/sem). Sugestão: −125 kcal.`;
  } else {
    msg = `Dentro da meta (${taxaPctSemana.toFixed(2)}%/sem). Mantenha as calorias.`;
  }

  // modo cintura: a cintura pesa mais que a balança
  let variacaoCintura: number | undefined;
  const cint = [...checkins]
    .filter((c) => c.cinturaCm)
    .sort((a, b) => a.semanaISO.localeCompare(b.semanaISO))
    .slice(-3);
  if (u.modoCintura && cint.length >= 2) {
    variacaoCintura = cint[cint.length - 1].cinturaCm! - cint[0].cinturaCm!;
    if (u.modoNutricao === "cutting") {
      if (variacaoCintura <= -0.5 && delta < 0) {
        delta = 0;
        msg = `Cintura caindo (${variacaoCintura.toFixed(1)} cm) mesmo com o peso estável: mantenha as calorias.`;
      } else if (variacaoCintura > 0.5 && delta >= 0) {
        delta = -125;
        msg = `Cintura subindo (+${variacaoCintura.toFixed(1)} cm). Sugestão: −125 kcal.`;
      }
    } else if (variacaoCintura > 1 && delta >= 0) {
      delta = -125;
      msg = `Cintura subiu ${variacaoCintura.toFixed(1)} cm: ganho rápido demais. Sugestão: −125 kcal.`;
    } else if (variacaoCintura < -0.5 && delta < 0) {
      delta = 0;
      msg = `Cintura caindo (${variacaoCintura.toFixed(1)} cm): recomposição funcionando, mantenha as calorias.`;
    }
  }

  return { pronto: diasParaProximo === 0, deltaKcal: delta, taxaPctSemana, variacaoCintura, mensagem: msg, diasParaProximo };
}
