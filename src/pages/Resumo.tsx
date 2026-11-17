import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useStore } from "../store/store";
import { exercicioPorId } from "../data/exercicios";
import { calcularMeta, melhorE1rm, resumoSeries, seriesFeitas, volumeCarga } from "../logic/progressao";
import { fmtDataLonga } from "../logic/datas";
import { Ilustracao } from "../components/Ilustracao";
import { Modal, Stat, Topo, Vazio } from "../components/ui";
import type { Sessao } from "../types";

export interface PR {
  exercicioId: string;
  tipo: "carga" | "e1rm" | "reps";
  texto: string;
}

export function calcularPRs(sessoes: Sessao[], sessao: Sessao): PR[] {
  const anteriores = sessoes.filter((s) => s.data < sessao.data && s.fim);
  const prs: PR[] = [];
  sessao.registros.forEach((r) => {
    const prev = anteriores.flatMap((s) => s.registros.filter((x) => x.exercicioId === r.exercicioId));
    if (!prev.length) return;
    const f = seriesFeitas(r);
    if (!f.length) return;
    const cargaMax = Math.max(...f.map((s) => s.carga));
    const cargaPrev = Math.max(...prev.flatMap((p) => seriesFeitas(p).map((s) => s.carga)));
    const e = melhorE1rm(r);
    const ePrev = Math.max(...prev.map(melhorE1rm));
    if (cargaMax > cargaPrev && cargaMax > 0) prs.push({ exercicioId: r.exercicioId, tipo: "carga", texto: `Maior carga: ${cargaMax} kg` });
    else if (e > ePrev + 0.01 && e > 0) prs.push({ exercicioId: r.exercicioId, tipo: "e1rm", texto: `Recorde de e1RM: ${e.toFixed(1)} kg` });
    else {
      const repsMax = Math.max(...f.filter((s) => s.carga === cargaMax).map((s) => s.reps));
      const repsPrev = Math.max(
        0,
        ...prev.flatMap((p) => seriesFeitas(p).filter((s) => s.carga === cargaMax).map((s) => s.reps)),
      );
      if (repsMax > repsPrev && repsPrev > 0)
        prs.push({ exercicioId: r.exercicioId, tipo: "reps", texto: `Mais reps com ${cargaMax} kg: ${repsMax}` });
    }
  });
  return prs;
}

export default function Resumo() {
  const { id } = useParams();
  const st = useStore();
  const nav = useNavigate();
  const [apagar, setApagar] = useState(false);
  const sessao = st.sessoes.find((s) => s.id === id);
  const prs = useMemo(() => (sessao ? calcularPRs(st.sessoes, sessao) : []), [st.sessoes, sessao]);

  if (!sessao)
    return (
      <>
        <Topo titulo="Resumo" voltar="/" />
        <Vazio ico="🤷" titulo="Sessão não encontrada" />
      </>
    );

  const series = sessao.registros.reduce((a, r) => a + seriesFeitas(r).length, 0);
  const reps = sessao.registros.reduce((a, r) => a + seriesFeitas(r).reduce((b, s) => b + s.reps, 0), 0);
  const volume = sessao.registros.reduce((a, r) => a + volumeCarga(r), 0);
  const treino = st.programa.find((t) => t.id === sessao.treinoId);
  const ultima = st.sessoes[st.sessoes.length - 1]?.id === sessao.id;

  const sobe = ultima
    ? sessao.registros
        .map((r) => {
          const ex = exercicioPorId(r.exercicioId, st.exerciciosCustom);
          const item = treino?.itens.find((i) => i.exercicioId === (r.planejadoId ?? r.exercicioId));
          if (!ex || !item || sessao.deload) return undefined;
          const m = calcularMeta(ex, { ...item, exercicioId: ex.id }, st.sessoes, st.usuario.passosCarga);
          return m.subiuCarga || m.sugestaoCore ? { ex, m } : undefined;
        })
        .filter((x): x is NonNullable<typeof x> => !!x)
    : [];

  return (
    <>
      <Topo titulo={ultima ? "Treino concluído! 🔥" : `Treino ${sessao.treinoId}`} voltar="/" />
      <div className="pagina">
        <div className="sub">
          {sessao.treinoId} · {treino?.nome} · {fmtDataLonga(sessao.data.slice(0, 10))}
          {sessao.deload && <span className="chip aviso" style={{ marginLeft: 6 }}>deload</span>}
        </div>
        <div className="grade2">
          <div className="card"><Stat valor={sessao.duracaoMin ?? "–"} unidade="min" rotulo="Duração" /></div>
          <div className="card"><Stat valor={series} rotulo="Séries de trabalho" /></div>
          <div className="card"><Stat valor={reps} rotulo="Repetições" /></div>
          <div className="card"><Stat valor={Math.round(volume).toLocaleString("pt-BR")} unidade="kg" rotulo="Volume (carga × reps)" /></div>
        </div>

        {prs.length > 0 && (
          <div className="card pr">
            <div className="card-titulo">
              <h2>🏆 Recordes pessoais</h2>
              <span className="chip fogo">{prs.length}</span>
            </div>
            <div className="lista">
              {prs.map((p) => (
                <div key={p.exercicioId} className="linha entre">
                  <span className="forte">{exercicioPorId(p.exercicioId, st.exerciciosCustom)?.nome}</span>
                  <span className="sub">{p.texto}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {sobe.length > 0 && (
          <div className="card">
            <div className="card-titulo">
              <h2>📈 Sobe na próxima vez</h2>
            </div>
            <div className="lista">
              {sobe.map(({ ex, m }) => (
                <div key={ex.id} className="linha entre">
                  <span>{ex.nome}</span>
                  <span className="chip ok">
                    {m.sugestaoCore ? "dificultar / +carga" : `${m.series[0].carga} kg × ${m.series[0].reps}`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="card">
          <h2 style={{ marginBottom: 6 }}>Exercícios</h2>
          <div className="lista">
            {sessao.registros.map((r) => {
              const ex = exercicioPorId(r.exercicioId, st.exerciciosCustom);
              return (
                <Link key={r.exercicioId} to={`/exercicio/${r.exercicioId}`} className="linha">
                  <div className="ex-thumb" style={{ width: 44, height: 44 }}>
                    {ex && <Ilustracao padrao={ex.padrao} tamanho={44} animar={false} />}
                  </div>
                  <div className="flex1">
                    <div className="forte">{ex?.nome ?? r.exercicioId}</div>
                    <div className="mini">
                      {resumoSeries(r)}
                      {r.series.some((s) => s.rir !== undefined) && ` · RIR ${r.series.map((s) => s.rir ?? "–").join("/")}`}
                    </div>
                    {r.nota && <div className="mini">📌 {r.nota}</div>}
                  </div>
                  <span className="mini">e1RM {melhorE1rm(r).toFixed(0)}</span>
                </Link>
              );
            })}
          </div>
        </div>
        {sessao.nota && <div className="card sub">📝 {sessao.nota}</div>}

        {ultima && (
          <div className="alerta ok">
            <span className="ico">➡️</span>
            <div>
              Próximo treino da fila: <b>{st.usuario.proximoTreino}</b>
            </div>
          </div>
        )}
        <Link to="/" className="btn prim bloco">Voltar ao início</Link>
        <button className="btn perigo" onClick={() => setApagar(true)}>Apagar esta sessão</button>
      </div>
      <Modal aberto={apagar} fechar={() => setApagar(false)} titulo="Apagar sessão?">
        <p className="sub" style={{ margin: 0 }}>O registro será removido do histórico e das análises. A fila de treinos não muda.</p>
        <button
          className="btn perigo bloco"
          onClick={() => {
            st.apagarSessao(sessao.id);
            nav("/historico");
          }}
        >
          Apagar
        </button>
      </Modal>
    </>
  );
}
