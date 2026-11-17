import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useStore } from "../store/store";
import { calcularMetas, FATORES, MODOS, sugerirAjuste } from "../logic/nutricao";
import { mediaPeso } from "../logic/analise";
import { fmtData, hojeISO } from "../logic/datas";
import { Topo, Troca, toast } from "../components/ui";
import type { ModoNutricao } from "../types";

export default function Nutricao() {
  const st = useStore();
  const u = st.usuario;
  const peso = mediaPeso(st.pesagens, hojeISO(), 7) ?? st.pesagens[st.pesagens.length - 1]?.peso ?? u.pesoInicial ?? 75;
  const metas = calcularMetas(u, peso);
  const ajuste = useMemo(() => sugerirAjuste(u, st.pesagens, st.checkins), [u, st.pesagens, st.checkins]);
  const macros = [
    { n: "Proteína", g: metas.proteina, kcal: metas.proteina * 4, cor: "var(--fogo)" },
    { n: "Carboidrato", g: metas.carbo, kcal: metas.carbo * 4, cor: "var(--azul)" },
    { n: "Gordura", g: metas.gordura, kcal: metas.gordura * 9, cor: "var(--aviso)" },
  ];
  const totalKcal = macros.reduce((a, m) => a + m.kcal, 0) || 1;

  return (
    <>
      <Topo titulo="Nutrição" voltar />
      <div className="pagina">
        <Troca<ModoNutricao>
          opcoes={[
            ["cutting", "Cutting leve"],
            ["recomposicao", "Recomposição"],
            ["ganho", "Ganho lento"],
          ]}
          valor={u.modoNutricao}
          onChange={(v) => st.setUsuario({ modoNutricao: v })}
        />
        <div className="mini" style={{ textAlign: "center" }}>Meta: {MODOS[u.modoNutricao].meta}</div>

        <div className="heroi" style={{ alignItems: "center", textAlign: "center" }}>
          <div className="rotulo">Meta diária</div>
          <div style={{ fontSize: 44, fontWeight: 900, letterSpacing: "-0.03em", lineHeight: 1 }}>
            {metas.kcal.toLocaleString("pt-BR")}
            <span style={{ fontSize: 16, color: "var(--txt2)", fontWeight: 600 }}> kcal</span>
          </div>
          <div className="mini">
            TMB {metas.tmb} · manutenção {metas.tdee} kcal{u.ajusteKcal ? ` · ajustes ${u.ajusteKcal > 0 ? "+" : ""}${u.ajusteKcal}` : ""}
          </div>
          <div style={{ display: "flex", width: "100%", height: 12, borderRadius: 99, overflow: "hidden", gap: 2 }}>
            {macros.map((m) => (
              <div key={m.n} title={`${m.n}: ${Math.round((m.kcal / totalKcal) * 100)}%`} style={{ width: `${(m.kcal / totalKcal) * 100}%`, background: m.cor }} />
            ))}
          </div>
          <div className="grade3" style={{ width: "100%" }}>
            {macros.map((m) => (
              <div key={m.n}>
                <div className="linha" style={{ justifyContent: "center", gap: 4 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 2, background: m.cor, display: "inline-block" }} />
                  <span className="mini">{m.n}</span>
                </div>
                <div style={{ fontSize: 22, fontWeight: 800 }}>{m.g} g</div>
                <div className="mini">{Math.round((m.kcal / totalKcal) * 100)}%</div>
              </div>
            ))}
          </div>
        </div>

        <div className="card coluna">
          <div className="linha entre">
            <h2>Ajuste quinzenal</h2>
            <span className="chip">{ajuste.pronto ? "disponível" : `em ${ajuste.diasParaProximo} dias`}</span>
          </div>
          <div className={`alerta ${ajuste.deltaKcal === 0 ? "ok" : "aviso"}`}>
            <span className="ico">{ajuste.deltaKcal === 0 ? "✅" : ajuste.deltaKcal > 0 ? "⬆️" : "⬇️"}</span>
            <div>
              {ajuste.mensagem}
              {ajuste.variacaoCintura !== undefined && (
                <div className="mini">Cintura nas últimas semanas: {ajuste.variacaoCintura > 0 ? "+" : ""}{ajuste.variacaoCintura.toFixed(1)} cm</div>
              )}
            </div>
          </div>
          {ajuste.deltaKcal !== 0 && (
            <button
              className="btn prim"
              disabled={!ajuste.pronto}
              onClick={() => {
                st.aplicarAjusteNutricao(ajuste.deltaKcal, ajuste.mensagem);
                toast(`Ajuste de ${ajuste.deltaKcal > 0 ? "+" : ""}${ajuste.deltaKcal} kcal aplicado`);
              }}
            >
              Aplicar {ajuste.deltaKcal > 0 ? "+" : ""}
              {ajuste.deltaKcal} kcal
            </button>
          )}
          <label className="linha sub" style={{ cursor: "pointer" }}>
            <input type="checkbox" checked={u.modoCintura} onChange={(e) => st.setUsuario({ modoCintura: e.target.checked })} />
            Modo cintura: a medida da cintura pesa mais que a balança
          </label>
          {u.ajustesNutricao.length > 0 && (
            <div className="lista">
              {[...u.ajustesNutricao].reverse().slice(0, 5).map((a, i) => (
                <div key={i} className="linha entre">
                  <span className="mini">{fmtData(a.data)}</span>
                  <span className="chip">{a.deltaKcal > 0 ? "+" : ""}{a.deltaKcal} kcal</span>
                </div>
              ))}
              <button className="btn peq fant" onClick={() => st.setUsuario({ ajusteKcal: 0, ajustesNutricao: [] })}>Zerar ajustes</button>
            </div>
          )}
        </div>

        <div className="card coluna">
          <h2>Base do cálculo</h2>
          <div className="lista">
            <div className="linha entre"><span className="sub">Peso usado (média 7 dias)</span><b>{peso.toFixed(1)} kg</b></div>
            <div className="linha entre"><span className="sub">Altura · idade · sexo</span><b>{u.altura} cm · {u.idade} · {u.sexo}</b></div>
            <div className="linha entre"><span className="sub">Atividade</span><b>{FATORES[u.nivelAtividade].nome} (×{FATORES[u.nivelAtividade].fator})</b></div>
            <div className="linha entre"><span className="sub">Proteína</span><b>{metas.faixaProteina[0]}–{metas.faixaProteina[1]} g/dia</b></div>
          </div>
          <div className="mini">Mifflin-St Jeor × fator de atividade. Proteína 1,8–2,2 g/kg (topo no cutting), gordura 0,6–1,0 g/kg, carboidrato no restante.</div>
          <Link to="/config" className="btn peq">Editar dados pessoais</Link>
        </div>
      </div>
    </>
  );
}
