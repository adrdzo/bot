import { useState } from "react";
import { Link } from "react-router-dom";
import { useStore } from "../store/store";
import { exercicioPorId } from "../data/exercicios";
import { seriesFeitas, volumeCarga } from "../logic/progressao";
import { addDias, fmtDataLonga, hojeISO, inicioSemana } from "../logic/datas";
import { Topo, Vazio } from "../components/ui";

const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

export default function Historico() {
  const st = useStore();
  const [mes, setMes] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [filtro, setFiltro] = useState<string>("todos");
  const sessoes = [...st.sessoes].filter((s) => filtro === "todos" || s.treinoId === filtro).reverse();
  const inicio = inicioSemana(mes);
  const dias = Array.from({ length: 42 }, (_, i) => addDias(inicio, i));
  const hoje = hojeISO();

  return (
    <>
      <Topo titulo="Histórico" voltar />
      <div className="pagina">
        <div className="card">
          <div className="card-titulo">
            <button className="btn peq fant" onClick={() => setMes(new Date(mes.getFullYear(), mes.getMonth() - 1, 1))}>‹</button>
            <h3>
              {MESES[mes.getMonth()]} {mes.getFullYear()}
            </h3>
            <button className="btn peq fant" onClick={() => setMes(new Date(mes.getFullYear(), mes.getMonth() + 1, 1))}>›</button>
          </div>
          <div className="calendario" style={{ marginBottom: 4 }}>
            {["S", "T", "Q", "Q", "S", "S", "D"].map((d, i) => (
              <div key={i} className="mini" style={{ textAlign: "center" }}>{d}</div>
            ))}
          </div>
          <div className="calendario">
            {dias.map((d) => {
              const iso = hojeISO(d);
              const s = st.sessoes.find((x) => x.data.slice(0, 10) === iso);
              const cls = s ? (s.deload ? "dl" : s.treinoId.startsWith("SUP") ? "sup" : "inf") : "";
              const conteudo = <>{s ? s.treinoId.replace("SUP", "S").replace("INF", "I") : d.getDate()}</>;
              return s ? (
                <Link key={iso} to={`/resumo/${s.id}`} className={`d ${cls} ${iso === hoje ? "hoje" : ""}`}>{conteudo}</Link>
              ) : (
                <div key={iso} className={`d ${d.getMonth() !== mes.getMonth() ? "fora" : ""} ${iso === hoje ? "hoje" : ""}`}>{conteudo}</div>
              );
            })}
          </div>
          <div className="linha" style={{ marginTop: 10, gap: 10, flexWrap: "wrap" }}>
            <span className="mini"><span className="chip fogo">S</span> Superior</span>
            <span className="mini"><span className="chip azul">I</span> Inferior</span>
            <span className="mini"><span className="chip aviso">D</span> Deload</span>
          </div>
        </div>

        <div className="abas">
          {["todos", "SUP1", "INF1", "SUP2", "INF2"].map((f) => (
            <button key={f} className={filtro === f ? "on" : ""} onClick={() => setFiltro(f)}>
              {f === "todos" ? "Todos" : f}
            </button>
          ))}
        </div>

        {sessoes.length === 0 && <Vazio ico="📅" titulo="Nenhum treino registrado ainda" />}
        {sessoes.map((s) => {
          const nSeries = s.registros.reduce((a, r) => a + seriesFeitas(r).length, 0);
          const vol = s.registros.reduce((a, r) => a + volumeCarga(r), 0);
          return (
            <Link key={s.id} to={`/resumo/${s.id}`} className="card">
              <div className="linha entre">
                <div className="linha">
                  <span className={`chip ${s.treinoId.startsWith("SUP") ? "fogo" : "azul"}`}>{s.treinoId}</span>
                  {s.deload && <span className="chip aviso">deload</span>}
                </div>
                <span className="mini">{fmtDataLonga(s.data.slice(0, 10))}</span>
              </div>
              <div className="sub" style={{ marginTop: 6 }}>
                {s.registros.map((r) => exercicioPorId(r.exercicioId, st.exerciciosCustom)?.nome).join(" · ")}
              </div>
              <div className="mini" style={{ marginTop: 4 }}>
                {nSeries} séries · {Math.round(vol).toLocaleString("pt-BR")} kg de volume · {s.duracaoMin ?? "–"} min
              </div>
            </Link>
          );
        })}
      </div>
    </>
  );
}

