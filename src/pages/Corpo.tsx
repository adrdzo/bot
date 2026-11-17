import { useState } from "react";
import { Link } from "react-router-dom";
import { useStore } from "../store/store";
import { mediasSemanais } from "../logic/analise";
import { fmtData, fmtDataLonga, hojeISO, semanaISO } from "../logic/datas";
import { GraficoLinha } from "../components/Graficos";
import { Abas, Passo, Topo, Vazio, toast } from "../components/ui";

type Aba = "peso" | "checkins" | "avaliacoes";

function Peso() {
  const st = useStore();
  const [data, setData] = useState(hojeISO());
  const [peso, setPeso] = useState(st.pesagens[st.pesagens.length - 1]?.peso ?? st.usuario.pesoInicial ?? 75);
  const medias = mediasSemanais(st.pesagens);
  const dados = st.pesagens.slice(-60).map((p) => ({ x: fmtData(p.data), y: p.peso }));
  return (
    <>
      <div className="card coluna">
        <h2>Registrar peso</h2>
        <div className="grade2">
          <input type="date" className="input" value={data} max={hojeISO()} onChange={(e) => setData(e.target.value)} />
          <Passo valor={peso} onChange={setPeso} passo={0.1} sufixo="kg" rotulo="peso" />
        </div>
        <button
          className="btn prim"
          onClick={() => {
            st.addPesagem(data, Math.round(peso * 10) / 10);
            toast("Peso salvo");
          }}
        >
          Salvar pesagem
        </button>
      </div>
      <div className="card">
        <h2 style={{ marginBottom: 8 }}>Pesagens diárias</h2>
        <GraficoLinha id="pesod" dados={dados} unidade="kg" cor="var(--azul)" />
      </div>
      <div className="card">
        <h2 style={{ marginBottom: 6 }}>Médias semanais</h2>
        {medias.length === 0 ? (
          <Vazio ico="⚖️" titulo="Sem pesagens ainda" />
        ) : (
          <table className="tabela">
            <thead>
              <tr>
                <th>Semana</th>
                <th>Média</th>
                <th>Variação</th>
                <th>Nº</th>
              </tr>
            </thead>
            <tbody>
              {[...medias].reverse().slice(0, 12).map((m, i, arr) => {
                const ant = arr[i + 1];
                const d = ant ? m.media - ant.media : undefined;
                return (
                  <tr key={m.semana}>
                    <td>{m.semana}</td>
                    <td className="forte">{m.media.toFixed(1)} kg</td>
                    <td>{d === undefined ? "–" : `${d > 0 ? "+" : ""}${d.toFixed(2)} kg`}</td>
                    <td>{m.n}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
      {st.pesagens.length > 0 && (
        <div className="card">
          <h3 style={{ marginBottom: 4 }}>Últimos registros</h3>
          <div className="lista">
            {[...st.pesagens].reverse().slice(0, 14).map((p) => (
              <div key={p.data} className="linha entre">
                <span>{fmtDataLonga(p.data)}</span>
                <span className="linha">
                  <b>{p.peso} kg</b>
                  <button className="btn peq fant" aria-label="Remover" onClick={() => st.removerPesagem(p.data)}>✕</button>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

function Checkins() {
  const st = useStore();
  const feito = st.checkins.some((c) => c.semanaISO === semanaISO(new Date()));
  return (
    <>
      <Link to="/checkin" className="btn prim bloco">
        {feito ? "✎ Editar check-in desta semana" : "+ Fazer check-in semanal"}
      </Link>
      {st.checkins.length === 0 && <Vazio ico="📝" titulo="Nenhum check-in ainda">Leva menos de 30 segundos.</Vazio>}
      {[...st.checkins].reverse().map((c) => (
        <div key={c.semanaISO} className="card">
          <div className="linha entre">
            <span className="forte">{c.semanaISO}</span>
            <span className="mini">{fmtData(c.data)}</span>
          </div>
          <div className="grade3" style={{ marginTop: 8 }}>
            <div className="mini">😴 Sono <b className="num" style={{ color: c.sono <= 4 ? "var(--erro)" : "var(--txt)" }}>{c.sono}</b></div>
            <div className="mini">🥵 Fadiga <b className="num" style={{ color: c.fadiga >= 8 ? "var(--erro)" : "var(--txt)" }}>{c.fadiga}</b></div>
            <div className="mini">🔥 Motiv. <b className="num" style={{ color: "var(--txt)" }}>{c.motivacao}</b></div>
          </div>
          <div className="linha" style={{ marginTop: 6, gap: 6, flexWrap: "wrap" }}>
            {c.pesoMedio && <span className="chip">⚖️ {c.pesoMedio.toFixed(1)} kg</span>}
            {c.cinturaCm && <span className="chip">📏 {c.cinturaCm} cm</span>}
            {c.dorArticular && <span className="chip erro">🦴 {c.dorArticular}</span>}
          </div>
          {c.comentarios && <div className="sub" style={{ marginTop: 6 }}>{c.comentarios}</div>}
        </div>
      ))}
    </>
  );
}

function Avaliacoes() {
  const st = useStore();
  return (
    <>
      <Link to="/avaliacao/nova" className="btn prim bloco">+ Nova avaliação mensal</Link>
      {st.avaliacoes.length === 0 && <Vazio ico="📏" titulo="Nenhuma avaliação ainda">Medidas, fotos e razão ombro/cintura a cada 4 semanas.</Vazio>}
      {[...st.avaliacoes].reverse().map((a) => (
        <Link key={a.id} to={`/avaliacao/${a.id}`} className="card">
          <div className="linha entre">
            <span className="forte">{fmtDataLonga(a.data)}</span>
            <span className="chip fogo">{(a.medidas.ombros / a.medidas.cintura).toFixed(2)}</span>
          </div>
          <div className="mini" style={{ marginTop: 6 }}>
            {a.peso} kg · cintura {a.medidas.cintura} · ombros {a.medidas.ombros} · braço {a.medidas.braco} · decisão: <b>{a.decisao}</b>
          </div>
        </Link>
      ))}
    </>
  );
}

export default function Corpo() {
  const [aba, setAba] = useState<Aba>("peso");
  return (
    <>
      <Topo titulo="Corpo e medidas" />
      <div className="pagina">
        <Abas abas={[["peso", "Peso"], ["checkins", "Check-ins"], ["avaliacoes", "Avaliações"]]} ativa={aba} onChange={setAba} />
        {aba === "peso" && <Peso />}
        {aba === "checkins" && <Checkins />}
        {aba === "avaliacoes" && <Avaliacoes />}
      </div>
    </>
  );
}
