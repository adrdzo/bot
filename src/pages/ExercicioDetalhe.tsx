import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useStore } from "../store/store";
import { exercicioPorId } from "../data/exercicios";
import { historicoExercicio, melhorE1rm, resumoSeries, seriesFeitas, volumeCarga } from "../logic/progressao";
import { statusExercicio } from "../logic/analise";
import { fmtData } from "../logic/datas";
import { GraficoLinha } from "../components/Graficos";
import { Abas, Stat, Topo, Vazio } from "../components/ui";
import { InfoExercicio } from "./SessaoTreino";
import { COR_STATUS } from "./Exercicios";

type Metrica = "e1rm" | "carga" | "volume" | "reps";

export default function ExercicioDetalhe() {
  const { id = "" } = useParams();
  const st = useStore();
  const ex = exercicioPorId(id, st.exerciciosCustom);
  const [aba, setAba] = useState<"progresso" | "tecnica">("progresso");
  const [metrica, setMetrica] = useState<Metrica>("e1rm");
  const hist = useMemo(() => historicoExercicio(st.sessoes, id, true), [st.sessoes, id]);
  const status = statusExercicio(st.sessoes, id);

  if (!ex)
    return (
      <>
        <Topo titulo="Exercício" voltar />
        <Vazio ico="🤷" titulo="Exercício não encontrado" />
      </>
    );

  const semCarga = hist.length > 0 && hist.every((h) => seriesFeitas(h.registro).every((s) => s.carga === 0));
  const valor = (r: (typeof hist)[number]["registro"]): number => {
    const f = seriesFeitas(r);
    switch (metrica) {
      case "e1rm":
        return Math.round(melhorE1rm(r) * 10) / 10;
      case "carga":
        return Math.max(...f.map((s) => s.carga));
      case "volume":
        return Math.round(volumeCarga(r));
      case "reps":
        return f.reduce((a, s) => a + s.reps, 0);
    }
  };
  const dados = hist
    .filter((h) => !h.sessao.deload)
    .map((h) => ({ x: fmtData(h.sessao.data.slice(0, 10)), y: valor(h.registro), extra: resumoSeries(h.registro) }));
  const melhorE = Math.max(0, ...hist.map((h) => melhorE1rm(h.registro)));
  const cargaMax = Math.max(0, ...hist.flatMap((h) => seriesFeitas(h.registro).map((s) => s.carga)));
  const primeira = hist.find((h) => !h.sessao.deload);
  const ganho = primeira && hist.length > 1 ? ((melhorE - melhorE1rm(primeira.registro)) / (melhorE1rm(primeira.registro) || 1)) * 100 : undefined;
  const textoStatus: Record<string, string> = {
    progredindo: "Carga ou reps subindo. Continue assim.",
    estagnado: "Sem aumento de carga nem reps em 2 sessões seguidas. Revise sono, técnica e RIR.",
    regredindo: "Reps caíram 2+ com a mesma carga. Sinal de fadiga acumulada.",
    novo: "Poucos dados ainda: são necessárias 3 sessões para avaliar.",
  };

  return (
    <>
      <Topo titulo={ex.nome} voltar />
      <div className="pagina">
        <Abas abas={[["progresso", "Progresso"], ["tecnica", "Como fazer"]]} ativa={aba} onChange={setAba} />
        {aba === "tecnica" ? (
          <InfoExercicio ex={ex} />
        ) : (
          <>
            <div className={`alerta ${COR_STATUS[status] || "azul"}`}>
              <span className="ico">{status === "progredindo" ? "📈" : status === "estagnado" ? "⏸️" : status === "regredindo" ? "📉" : "🆕"}</span>
              <div>
                <div className="forte" style={{ textTransform: "capitalize" }}>{status}</div>
                <div className="sub">{textoStatus[status]}</div>
              </div>
            </div>
            <div className="grade3">
              <div className="card compacto"><Stat valor={semCarga ? "–" : melhorE.toFixed(0)} unidade="kg" rotulo="Melhor e1RM" /></div>
              <div className="card compacto"><Stat valor={cargaMax} unidade="kg" rotulo="Maior carga" /></div>
              <div className="card compacto">
                <Stat valor={ganho !== undefined && !semCarga ? `${ganho >= 0 ? "+" : ""}${ganho.toFixed(0)}` : hist.length} unidade={ganho !== undefined && !semCarga ? "%" : ""} rotulo={ganho !== undefined && !semCarga ? "Desde o início" : "Sessões"} />
              </div>
            </div>
            <div className="card">
              <div className="abas" style={{ marginBottom: 10 }}>
                {(
                  [
                    ["e1rm", "e1RM"],
                    ["carga", "Carga"],
                    ["volume", "Volume"],
                    ["reps", "Reps"],
                  ] as [Metrica, string][]
                ).map(([m, r]) => (
                  <button key={m} className={metrica === m ? "on" : ""} onClick={() => setMetrica(m)}>
                    {r}
                  </button>
                ))}
              </div>
              <GraficoLinha id={`ex-${metrica}`} dados={dados} unidade={metrica === "reps" ? "reps" : "kg"} />
              <div className="mini" style={{ marginTop: 6 }}>
                e1RM = carga × (1 + reps/30) (Epley). Sessões de deload ficam fora do gráfico.
              </div>
            </div>
            <div className="card">
              <h3 style={{ marginBottom: 6 }}>Sessões</h3>
              {hist.length === 0 ? (
                <Vazio ico="🏋️" titulo="Ainda não realizado" />
              ) : (
                <table className="tabela">
                  <thead>
                    <tr>
                      <th>Data</th>
                      <th>Séries</th>
                      <th style={{ textAlign: "right" }}>e1RM</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...hist].reverse().map((h) => (
                      <tr key={h.sessao.id}>
                        <td>
                          {fmtData(h.sessao.data.slice(0, 10))}
                          {h.sessao.deload && <span className="chip aviso" style={{ marginLeft: 4 }}>DL</span>}
                        </td>
                        <td>
                          {resumoSeries(h.registro)}
                          {h.registro.nota && <div className="mini">📌 {h.registro.nota}</div>}
                        </td>
                        <td style={{ textAlign: "right" }}>{melhorE1rm(h.registro).toFixed(1)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
}
