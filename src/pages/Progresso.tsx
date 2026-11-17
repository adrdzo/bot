import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useStore } from "../store/store";
import { exercicioPorId } from "../data/exercicios";
import {
  faixaVolume,
  inicioSemanaISO,
  mediasSemanais,
  musculosVolume,
  sessoesDaSemana,
  statusExercicio,
  topEvolucao,
  volumeReferencia,
  volumeSemana,
} from "../logic/analise";
import { historicoExercicio, melhorE1rm } from "../logic/progressao";
import { addDias, fmtData, fmtMesAno, hojeISO, semanaISO } from "../logic/datas";
import { GraficoLinha } from "../components/Graficos";
import { Ilustracao } from "../components/Ilustracao";
import { Abas, Topo, Vazio } from "../components/ui";
import { COR_STATUS } from "./Exercicios";

type Aba = "volume" | "exercicios" | "corpo";

const COR_FAIXA = { abaixo: "var(--aviso)", dentro: "var(--ok)", acima: "var(--azul)" };

function Volume() {
  const st = useStore();
  const [offset, setOffset] = useState(0);
  const data = addDias(new Date(), offset * 7);
  const semana = semanaISO(data);
  const ref = useMemo(
    () => volumeReferencia(st.programa, st.exerciciosCustom, st.usuario.metaSemanal),
    [st.programa, st.exerciciosCustom, st.usuario.metaSemanal],
  );
  const feito = useMemo(() => volumeSemana(st.sessoes, semana, st.exerciciosCustom), [st.sessoes, semana, st.exerciciosCustom]);
  const sess = sessoesDaSemana(st.sessoes, semana);
  const ini = inicioSemanaISO(semana);
  return (
    <>
      <div className="card compacto linha entre">
        <button className="btn peq fant" onClick={() => setOffset(offset - 1)}>‹</button>
        <div style={{ textAlign: "center" }}>
          <div className="forte">{offset === 0 ? "Semana atual" : semana}</div>
          <div className="mini">
            {fmtData(hojeISO(ini))} – {fmtData(hojeISO(addDias(ini, 6)))} · {sess.map((s) => s.treinoId).join(", ") || "nenhum treino"}
          </div>
        </div>
        <button className="btn peq fant" onClick={() => setOffset(Math.min(0, offset + 1))} disabled={offset === 0}>›</button>
      </div>
      <div className="card">
        <div className="card-titulo">
          <h2>Séries por músculo</h2>
          <span className="mini">feito / planejado</span>
        </div>
        <div className="coluna" style={{ gap: 12 }}>
          {musculosVolume(ref).map((m) => {
            const r = ref[m] ?? 0;
            const f = feito[m] ?? 0;
            if (!r && !f) return null;
            const fx = faixaVolume(f, r);
            const max = Math.max(r * 1.3, f, 1);
            return (
              <div key={m}>
                <div className="linha entre" style={{ marginBottom: 4 }}>
                  <span className="forte" style={{ fontSize: 14 }}>{m}</span>
                  <span className="linha" style={{ gap: 6 }}>
                    <span className="num">
                      <b>{f}</b> / {r}
                    </span>
                    <span className="chip" style={{ color: COR_FAIXA[fx] }}>
                      {fx === "abaixo" ? "▼ abaixo" : fx === "acima" ? "▲ acima" : "● dentro"}
                    </span>
                  </span>
                </div>
                <div className="barra" title={`${f} de ${r} séries`}>
                  <i style={{ width: `${(f / max) * 100}%`, background: COR_FAIXA[fx] }} />
                  <span className="marca" style={{ left: `${(r / max) * 100}%` }} />
                </div>
              </div>
            );
          })}
        </div>
        <div className="mini" style={{ marginTop: 12 }}>
          Referência calculada da sua ficha para {st.usuario.metaSemanal} treinos/semana
          {st.usuario.metaSemanal === 3 && " (com 3 dias o volume cai ~25%)"}. O traço marca o planejado. Conta só séries confirmadas.
        </div>
      </div>
    </>
  );
}

function ExerciciosProg() {
  const st = useStore();
  const top = useMemo(() => topEvolucao(st.sessoes, st.exerciciosCustom), [st.sessoes, st.exerciciosCustom]);
  const ids = [...new Set(st.sessoes.flatMap((s) => s.registros.map((r) => r.exercicioId)))];
  if (!ids.length) return <Vazio ico="🏋️" titulo="Nenhum exercício registrado ainda">Faça seu primeiro treino para ver a evolução.</Vazio>;
  const contagem = { progredindo: 0, estagnado: 0, regredindo: 0, novo: 0 };
  const itens = ids.map((id) => {
    const status = statusExercicio(st.sessoes, id);
    contagem[status]++;
    const h = historicoExercicio(st.sessoes, id);
    return { id, ex: exercicioPorId(id, st.exerciciosCustom), status, e1: h.length ? melhorE1rm(h[h.length - 1].registro) : 0, n: h.length };
  });
  return (
    <>
      <div className="grade3">
        <div className="card compacto" style={{ textAlign: "center" }}>
          <div style={{ fontSize: 22, fontWeight: 800 }}>{contagem.progredindo}</div>
          <div className="mini">📈 progredindo</div>
        </div>
        <div className="card compacto" style={{ textAlign: "center" }}>
          <div style={{ fontSize: 22, fontWeight: 800 }}>{contagem.estagnado}</div>
          <div className="mini">⏸️ estagnados</div>
        </div>
        <div className="card compacto" style={{ textAlign: "center" }}>
          <div style={{ fontSize: 22, fontWeight: 800 }}>{contagem.regredindo}</div>
          <div className="mini">📉 regredindo</div>
        </div>
      </div>
      {top.length > 0 && (
        <div className="card">
          <h2 style={{ marginBottom: 8 }}>🏆 Top 5 evolução (≈ 5 semanas)</h2>
          <div className="lista">
            {top.map((t, i) => (
              <Link key={t.id} to={`/exercicio/${t.id}`} className="linha entre">
                <span>
                  <b>{i + 1}.</b> {t.nome}
                </span>
                <span className={`chip ${t.ganhoPct > 0 ? "ok" : ""}`}>
                  {t.ganhoPct >= 0 ? "+" : ""}
                  {t.ganhoPct.toFixed(1)}% {t.porReps ? "reps" : "e1RM"}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}
      <div className="card">
        <h2 style={{ marginBottom: 4 }}>Todos os exercícios</h2>
        <div className="lista">
          {itens.map((it) => (
            <Link key={it.id} to={`/exercicio/${it.id}`} className="linha">
              <div className="ex-thumb" style={{ width: 44, height: 44 }}>
                {it.ex && <Ilustracao padrao={it.ex.padrao} tamanho={44} animar={false} />}
              </div>
              <div className="flex1">
                <div className="forte">{it.ex?.nome ?? it.id}</div>
                <div className="mini">
                  {it.n} sessões · e1RM {it.e1.toFixed(0)} kg
                </div>
              </div>
              <span className={`chip ${COR_STATUS[it.status]}`}>{it.status}</span>
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}

function CorpoProg() {
  const st = useStore();
  const medias = mediasSemanais(st.pesagens).map((m) => ({ x: m.semana.slice(5), y: Math.round(m.media * 10) / 10, extra: `${m.n} pesagens` }));
  const cint = st.checkins.filter((c) => c.cinturaCm).map((c) => ({ x: c.semanaISO.slice(5), y: c.cinturaCm! }));
  const razao = st.avaliacoes.map((a) => ({
    x: fmtMesAno(a.data),
    y: Math.round((a.medidas.ombros / a.medidas.cintura) * 100) / 100,
    extra: `${a.medidas.ombros} / ${a.medidas.cintura} cm`,
  }));
  const sono = st.checkins.map((c) => ({ x: c.semanaISO.slice(5), y: c.sono }));
  const fadiga = st.checkins.map((c) => ({ x: c.semanaISO.slice(5), y: c.fadiga }));
  return (
    <>
      <div className="card">
        <div className="card-titulo">
          <h2>Razão ombro/cintura</h2>
          <span className="chip fogo">meta ~1,60</span>
        </div>
        <GraficoLinha id="razao" dados={razao} meta={1.6} metaRotulo="1,60" />
        <div className="mini">Indicador-chave do V-taper, das avaliações mensais.</div>
      </div>
      <div className="card">
        <h2 style={{ marginBottom: 8 }}>Peso: média semanal</h2>
        <GraficoLinha id="peso" dados={medias} unidade="kg" cor="var(--azul)" />
      </div>
      <div className="card">
        <h2 style={{ marginBottom: 8 }}>Cintura (umbigo)</h2>
        <GraficoLinha id="cint" dados={cint} unidade="cm" cor="var(--ok)" />
      </div>
      <div className="grade2">
        <div className="card">
          <h3 style={{ marginBottom: 6 }}>Sono</h3>
          <GraficoLinha id="sono" dados={sono} altura={120} cor="var(--azul)" />
        </div>
        <div className="card">
          <h3 style={{ marginBottom: 6 }}>Fadiga</h3>
          <GraficoLinha id="fadiga" dados={fadiga} altura={120} cor="var(--aviso)" />
        </div>
      </div>
    </>
  );
}

export default function Progresso() {
  const [aba, setAba] = useState<Aba>("volume");
  return (
    <>
      <Topo titulo="Progresso" />
      <div className="pagina">
        <Abas abas={[["volume", "Volume"], ["exercicios", "Exercícios"], ["corpo", "Corpo"]]} ativa={aba} onChange={setAba} />
        {aba === "volume" && <Volume />}
        {aba === "exercicios" && <ExerciciosProg />}
        {aba === "corpo" && <CorpoProg />}
      </div>
    </>
  );
}
