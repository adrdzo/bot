import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useStore } from "../store/store";
import { mediaPesoSemanaISO } from "../logic/analise";
import { hojeISO, semanaISO } from "../logic/datas";
import { Escala, Passo, Topo, toast } from "../components/ui";

export default function Checkin() {
  const st = useStore();
  const nav = useNavigate();
  const semana = semanaISO(new Date());
  const existente = st.checkins.find((c) => c.semanaISO === semana);
  const ultCint = [...st.checkins].reverse().find((c) => c.cinturaCm)?.cinturaCm;
  const pesoMedio = mediaPesoSemanaISO(st.pesagens, semana);
  const [cintura, setCintura] = useState<number>(existente?.cinturaCm ?? ultCint ?? 80);
  const [medirCintura, setMedirCintura] = useState(existente ? !!existente.cinturaCm : true);
  const [sono, setSono] = useState(existente?.sono);
  const [fadiga, setFadiga] = useState(existente?.fadiga);
  const [motivacao, setMotivacao] = useState(existente?.motivacao);
  const [dor, setDor] = useState(!!existente?.dorArticular);
  const [local, setLocal] = useState(existente?.dorArticular ?? "");
  const [coment, setComent] = useState(existente?.comentarios ?? "");
  const ok = sono && fadiga && motivacao;

  return (
    <>
      <Topo titulo="Check-in semanal" voltar />
      <div className="pagina">
        <div className="sub">Semana {semana}. Responda pensando nos últimos 7 dias.</div>
        <div className="card linha entre">
          <div>
            <div className="rotulo">Peso médio da semana</div>
            <div style={{ fontSize: 22, fontWeight: 800 }}>{pesoMedio ? `${pesoMedio.toFixed(1)} kg` : "–"}</div>
          </div>
          <span className="mini" style={{ maxWidth: 140, textAlign: "right" }}>calculado automaticamente das pesagens diárias</span>
        </div>
        <div className="card coluna">
          <div className="linha entre">
            <span className="rotulo">Cintura (altura do umbigo, em jejum)</span>
            <input type="checkbox" checked={medirCintura} onChange={(e) => setMedirCintura(e.target.checked)} aria-label="Medir cintura" />
          </div>
          {medirCintura && <Passo valor={cintura} onChange={setCintura} passo={0.5} sufixo="cm" rotulo="cintura" />}
        </div>
        <div className="card coluna">
          <span className="rotulo">😴 Qualidade do sono (1 péssimo – 10 ótimo)</span>
          <Escala valor={sono} onChange={setSono} />
          <span className="rotulo" style={{ marginTop: 6 }}>🥵 Fadiga (1 descansado – 10 destruído)</span>
          <Escala valor={fadiga} onChange={setFadiga} />
          <span className="rotulo" style={{ marginTop: 6 }}>🔥 Motivação para treinar</span>
          <Escala valor={motivacao} onChange={setMotivacao} />
        </div>
        <div className="card coluna">
          <label className="linha" style={{ cursor: "pointer" }}>
            <input type="checkbox" checked={dor} onChange={(e) => setDor(e.target.checked)} />
            <span>🦴 Senti dor articular esta semana</span>
          </label>
          {dor && <input className="input" placeholder="Onde? (ex.: ombro direito, joelho)" value={local} onChange={(e) => setLocal(e.target.value)} />}
          <textarea className="input" placeholder="Comentários (opcional)" value={coment} onChange={(e) => setComent(e.target.value)} />
        </div>
        {fadiga && fadiga >= 8 && <div className="alerta aviso"><span className="ico">⚠️</span><div>Fadiga alta. Se repetir na próxima semana, o app vai sugerir deload.</div></div>}
        {sono && sono <= 4 && <div className="alerta aviso"><span className="ico">😴</span><div>Sono ruim limita a recuperação. Priorize 7–9 h.</div></div>}
        <button
          className="btn prim gigante"
          disabled={!ok}
          onClick={() => {
            st.salvarCheckin({
              semanaISO: semana,
              data: hojeISO(),
              pesoMedio,
              cinturaCm: medirCintura ? cintura : undefined,
              sono: sono!,
              fadiga: fadiga!,
              motivacao: motivacao!,
              dorArticular: dor && local.trim() ? local.trim() : dor ? "sim" : undefined,
              comentarios: coment.trim() || undefined,
            });
            toast("Check-in salvo ✓");
            nav(-1);
          }}
        >
          Salvar check-in
        </button>
      </div>
    </>
  );
}
