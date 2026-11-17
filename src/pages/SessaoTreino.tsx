import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useStore } from "../store/store";
import { EXERCICIOS, exercicioPorId } from "../data/exercicios";
import { ROTACAO } from "../data/programa";
import { aquecimento, calcularMeta, historicoExercicio, resumoSeries } from "../logic/progressao";
import { fmtData, fmtTempo } from "../logic/datas";
import { Ilustracao } from "../components/Ilustracao";
import { MapaMuscular } from "../components/MapaMuscular";
import { Modal, Passo, Topo, toast } from "../components/ui";
import type { Exercicio, RegistroExercicio } from "../types";

function Escolher() {
  const st = useStore();
  const nav = useNavigate();
  return (
    <>
      <Topo titulo="Treinar" />
      <div className="pagina">
        {st.deloadAtivo && (
          <div className="alerta aviso">
            <span className="ico">🧘</span>
            <div>Deload ativo: as sessões terão metade das séries e mesmas cargas.</div>
          </div>
        )}
        {ROTACAO.map((id) => {
          const t = st.programa.find((x) => x.id === id)!;
          const prox = id === st.usuario.proximoTreino;
          const ex = exercicioPorId(t.itens[0]?.exercicioId, st.exerciciosCustom);
          const ultima = [...st.sessoes].reverse().find((s) => s.treinoId === id);
          return (
            <div key={id} className="card" style={prox ? { borderColor: "var(--fogo)" } : undefined}>
              <div className="linha" style={{ gap: 12 }}>
                <div className="ex-thumb">{ex && <Ilustracao padrao={ex.padrao} tamanho={64} animar={false} />}</div>
                <div className="flex1">
                  <div className="linha">
                    <h2>{t.id}</h2>
                    {prox && <span className="chip fogo">próximo da fila</span>}
                  </div>
                  <div className="sub">
                    {t.nome} · {t.foco}
                  </div>
                  <div className="mini">
                    {t.itens.length} exercícios · {t.itens.reduce((a, i) => a + i.series, 0)} séries
                    {ultima && ` · último: ${fmtData(ultima.data.slice(0, 10))}`}
                  </div>
                </div>
              </div>
              <button
                className={`btn bloco ${prox ? "prim" : ""}`}
                style={{ marginTop: 10 }}
                onClick={() => {
                  st.iniciarSessao(id);
                  nav("/treino");
                }}
              >
                ▶ Começar {t.id}
              </button>
            </div>
          );
        })}
        <p className="mini" style={{ textAlign: "center" }}>
          A rotação segue SUP1 → INF1 → SUP2 → INF2. Fazer um treino fora da ordem continua a fila a partir dele.
        </p>
      </div>
    </>
  );
}

function Relogio({ inicio }: { inicio: string }) {
  const [t, setT] = useState(Date.now());
  useEffect(() => {
    const i = setInterval(() => setT(Date.now()), 1000);
    return () => clearInterval(i);
  }, []);
  return <span className="num">{fmtTempo((t - new Date(inicio).getTime()) / 1000)}</span>;
}

function CartaoExercicio({
  reg,
  ri,
  aberto,
  alternar,
  abrirInfo,
  abrirTroca,
}: {
  reg: RegistroExercicio;
  ri: number;
  aberto: boolean;
  alternar: () => void;
  abrirInfo: (e: Exercicio) => void;
  abrirTroca: (ri: number) => void;
}) {
  const st = useStore();
  const ex = exercicioPorId(reg.exercicioId, st.exerciciosCustom)!;
  const passo = st.usuario.passosCarga[ex.equipamento] || 1;
  const hist = useMemo(() => historicoExercicio(st.sessoes, ex.id), [st.sessoes, ex.id]);
  const ultimo = hist[hist.length - 1];
  const item = { exercicioId: ex.id, ordem: ri, series: reg.series.length, repsMin: reg.repsMin, repsMax: reg.repsMax };
  const meta = useMemo(
    () => calcularMeta(ex, item, st.sessoes, st.usuario.passosCarga, st.sessaoAtual?.deload),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ex.id, st.sessoes, reg.repsMin, reg.repsMax],
  );
  const feitas = reg.series.filter((s) => s.feita).length;
  const completo = feitas >= reg.series.length;
  const [nota, setNota] = useState(reg.nota ?? "");
  const [mostrarNota, setMostrarNota] = useState(!!reg.nota);
  const rirPadrao = st.sessaoAtual?.deload ? "3–4" : ex.tipo === "isolado" ? "0–2 (última pode ir a 0)" : "1–2";
  const aq = ex.tipo === "composto" && !st.sessaoAtual?.deload ? aquecimento(reg.series[0]?.carga ?? 0, passo) : [];
  const execOk = reg.series.every((s) => s.execucaoOk);

  const marcar = (si: number) => {
    const s = reg.series[si];
    st.atualizarSerie(ri, si, { feita: !s.feita });
    if (!s.feita) {
      const seg = ex.tipo === "composto" ? st.usuario.descansoComposto : st.usuario.descansoIsolado;
      const ultimaDoEx = si === reg.series.length - 1;
      st.iniciarTimer(ultimaDoEx ? Math.max(seg, 90) : seg);
      navigator.vibrate?.(30);
    }
  };

  return (
    <div className={`ex-card ${completo ? "feito" : ""}`}>
      <div className="ex-cab" onClick={alternar}>
        <div className="ex-thumb">
          <Ilustracao padrao={ex.padrao} tamanho={64} animar={aberto} />
        </div>
        <div className="flex1">
          <div className="linha" style={{ gap: 6, flexWrap: "wrap" }}>
            <span className="forte">{ex.nome}</span>
            {reg.planejadoId && <span className="chip azul">substituto</span>}
          </div>
          <div className="mini">
            {reg.series.length}× {reg.repsMin}–{reg.repsMax} · {ex.musculoPrincipal}
          </div>
          <div className="linha" style={{ gap: 6, marginTop: 4, flexWrap: "wrap" }}>
            {ultimo ? (
              <span className="chip">Última: {resumoSeries(ultimo.registro)}</span>
            ) : (
              <span className="chip">Primeira vez</span>
            )}
            {meta.subiuCarga && <span className="chip ok">↑ carga</span>}
            {meta.sugestaoCore && <span className="chip aviso">dificultar</span>}
          </div>
        </div>
        <div className={`chip ${completo ? "ok" : ""}`}>
          {feitas}/{reg.series.length}
        </div>
      </div>
      {aberto && (
        <div className="ex-corpo">
          <div className="alerta azul" style={{ padding: "8px 10px", fontSize: 13 }}>
            <span>🎯</span>
            <div>
              {meta.motivo} RIR alvo: <b>{rirPadrao}</b>.
            </div>
          </div>
          {aq.length > 0 && feitas === 0 && (
            <div className="mini">
              Aquecimento sugerido: {aq.map((a) => `${a.carga}kg×${a.reps}`).join(" → ")}
            </div>
          )}
          <div className="serie cab">
            <span>#</span>
            <span style={{ textAlign: "center" }}>kg{ex.unilateral ? " (cada)" : ""}</span>
            <span style={{ textAlign: "center" }}>reps</span>
            <span style={{ textAlign: "center" }}>RIR</span>
            <span />
          </div>
          {reg.series.map((s, si) => (
            <div key={si} className={`serie ${s.feita ? "feita" : ""}`}>
              <button
                className="n"
                style={{ border: 0, cursor: "pointer", outline: s.execucaoOk ? undefined : "2px solid var(--aviso)" }}
                title="Toque para marcar execução ruim nesta série"
                onClick={() => st.atualizarSerie(ri, si, { execucaoOk: !s.execucaoOk })}
              >
                {s.execucaoOk ? s.numero : "!"}
              </button>
              <Passo valor={s.carga} passo={passo} onChange={(v) => st.atualizarSerie(ri, si, { carga: v })} rotulo={`carga série ${si + 1}`} />
              <Passo valor={s.reps} passo={1} onChange={(v) => st.atualizarSerie(ri, si, { reps: v })} rotulo={`reps série ${si + 1}`} />
              <select
                className="rir"
                aria-label={`RIR série ${si + 1}`}
                value={s.rir ?? ""}
                onChange={(e) => st.atualizarSerie(ri, si, { rir: e.target.value === "" ? undefined : Number(e.target.value) })}
              >
                <option value="">–</option>
                {[0, 1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
              <button className={`check ${s.feita ? "on" : ""}`} onClick={() => marcar(si)} aria-label={`Confirmar série ${si + 1}`}>
                ✓
              </button>
            </div>
          ))}
          <label className="linha mini" style={{ cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={execOk}
              onChange={(e) => reg.series.forEach((_, si) => st.atualizarSerie(ri, si, { execucaoOk: e.target.checked }))}
            />
            Execução OK em todas as séries (necessário para subir carga)
          </label>
          <div className="linha" style={{ flexWrap: "wrap" }}>
            <button className="btn peq" onClick={() => st.adicionarSerie(ri)}>+ Série</button>
            {reg.series.length > 1 && (
              <button className="btn peq fant" onClick={() => st.removerSerie(ri, reg.series.length - 1)}>− Série</button>
            )}
            <button className="btn peq" onClick={() => abrirInfo(ex)}>ℹ️ Como fazer</button>
            <button className="btn peq" onClick={() => abrirTroca(ri)}>⇄ Substituir</button>
            <button className="btn peq fant" onClick={() => setMostrarNota((v) => !v)}>✎ Nota</button>
          </div>
          {mostrarNota && (
            <textarea
              className="input"
              placeholder="Ex.: banco na posição 4, pegada fechada…"
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              onBlur={() => st.notaExercicio(ri, nota)}
            />
          )}
          {ultimo?.registro.nota && <div className="mini">📌 Nota anterior: {ultimo.registro.nota}</div>}
        </div>
      )}
    </div>
  );
}

export function InfoExercicio({ ex }: { ex: Exercicio }) {
  return (
    <>
      <div className="grade2" style={{ alignItems: "center" }}>
        <div className="card" style={{ padding: 4, background: "var(--bg2)" }}>
          <Ilustracao padrao={ex.padrao} />
        </div>
        <div style={{ display: "grid", placeItems: "center" }}>
          <MapaMuscular principal={ex.musculoPrincipal} secundarios={ex.musculosSecundarios} altura={150} />
        </div>
      </div>
      <div className="linha" style={{ flexWrap: "wrap", gap: 6 }}>
        <span className="chip fogo">{ex.musculoPrincipal}</span>
        {ex.musculosSecundarios?.map((m) => (
          <span key={m} className="chip aviso">{m}</span>
        ))}
        <span className="chip">{ex.tipo}</span>
        {ex.unilateral && <span className="chip azul">unilateral</span>}
      </div>
      <div>
        <h3 style={{ marginBottom: 8 }}>Execução</h3>
        <ol className="passos-lista">
          {ex.execucao.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ol>
      </div>
      {ex.dicas.length > 0 && (
        <div>
          <h3 style={{ marginBottom: 6 }}>Dicas</h3>
          {ex.dicas.map((d) => (
            <div key={d} className="sub">💡 {d}</div>
          ))}
        </div>
      )}
      {ex.erros.length > 0 && (
        <div>
          <h3 style={{ marginBottom: 6 }}>Erros comuns</h3>
          {ex.erros.map((d) => (
            <div key={d} className="sub">⛔ {d}</div>
          ))}
        </div>
      )}
    </>
  );
}

export default function SessaoTreino() {
  const st = useStore();
  const nav = useNavigate();
  const sa = st.sessaoAtual;
  const [aberto, setAberto] = useState<number | null>(null);
  const [info, setInfo] = useState<Exercicio>();
  const [troca, setTroca] = useState<number>();
  const [confirmar, setConfirmar] = useState(false);
  const [descartar, setDescartar] = useState(false);

  useEffect(() => {
    if (!sa || aberto !== null) return;
    const i = sa.registros.findIndex((r) => r.series.some((s) => !s.feita));
    setAberto(i < 0 ? 0 : i);
  }, [sa, aberto]);

  if (!sa) return <Escolher />;

  const total = sa.registros.reduce((a, r) => a + r.series.length, 0);
  const feitas = sa.registros.reduce((a, r) => a + r.series.filter((s) => s.feita).length, 0);
  const treino = st.programa.find((t) => t.id === sa.treinoId)!;

  const regTroca = troca !== undefined ? sa.registros[troca] : undefined;
  const exTroca = regTroca ? exercicioPorId(regTroca.planejadoId ?? regTroca.exercicioId, st.exerciciosCustom) : undefined;
  const todos = [...EXERCICIOS, ...st.exerciciosCustom];
  const opcoesTroca = exTroca
    ? [
        ...(regTroca!.planejadoId ? [exTroca] : []),
        ...(exTroca.substitutos ?? []).map((id) => exercicioPorId(id, st.exerciciosCustom)!).filter(Boolean),
        ...todos.filter(
          (e) => e.musculoPrincipal === exTroca.musculoPrincipal && e.id !== exTroca.id && !exTroca.substitutos?.includes(e.id),
        ),
      ].filter((e) => e.id !== regTroca!.exercicioId)
    : [];

  const finalizar = () => {
    const id = st.finalizarSessao();
    if (id) nav(`/resumo/${id}`);
  };

  return (
    <>
      <Topo
        titulo={`${sa.treinoId}${sa.deload ? " · deload" : ""}`}
        direita={
          <button className="btn ok peq" onClick={() => (feitas < total ? setConfirmar(true) : finalizar())} disabled={feitas === 0}>
            Finalizar
          </button>
        }
      />
      <div className="pagina">
        <div className="card compacto">
          <div className="linha entre">
            <span className="sub">
              {treino.nome} · ⏱ <Relogio inicio={sa.data} />
            </span>
            <span className="forte num">
              {feitas}/{total} séries
            </span>
          </div>
          <div className="barra" style={{ marginTop: 8 }}>
            <i style={{ width: `${(feitas / total) * 100}%` }} />
          </div>
        </div>

        {sa.registros.map((r, ri) => (
          <CartaoExercicio
            key={`${ri}-${r.exercicioId}`}
            reg={r}
            ri={ri}
            aberto={aberto === ri}
            alternar={() => setAberto(aberto === ri ? -1 : ri)}
            abrirInfo={setInfo}
            abrirTroca={setTroca}
          />
        ))}

        <textarea
          className="input"
          placeholder="Como foi o treino? (opcional)"
          defaultValue={sa.nota}
          onBlur={(e) => st.notaSessao(e.target.value)}
        />
        <button className="btn ok gigante" disabled={feitas === 0} onClick={() => (feitas < total ? setConfirmar(true) : finalizar())}>
          ✓ Finalizar treino
        </button>
        <button className="btn perigo" onClick={() => setDescartar(true)}>Descartar treino</button>
        <div style={{ height: 70 }} />
      </div>

      <Modal aberto={!!info} fechar={() => setInfo(undefined)} titulo={info?.nome}>
        {info && <InfoExercicio ex={info} />}
        {info && (
          <Link to={`/exercicio/${info.id}`} className="btn bloco">
            Ver histórico e gráficos
          </Link>
        )}
      </Modal>

      <Modal aberto={troca !== undefined} fechar={() => setTroca(undefined)} titulo="Substituir exercício">
        <p className="sub" style={{ margin: 0 }}>
          A substituição vale só para esta sessão. O histórico fica separado por exercício.
        </p>
        <div className="lista">
          {opcoesTroca.map((e) => (
            <button
              key={e.id}
              className="linha"
              style={{ background: "none", border: 0, textAlign: "left", cursor: "pointer", borderBottom: "1px solid var(--borda)" }}
              onClick={() => {
                st.substituirExercicio(troca!, e.id);
                setTroca(undefined);
                toast(`Trocado por ${e.nome}`);
              }}
            >
              <div className="ex-thumb" style={{ width: 48, height: 48 }}>
                <Ilustracao padrao={e.padrao} tamanho={48} animar={false} />
              </div>
              <div className="flex1">
                <div className="forte">{e.nome}</div>
                <div className="mini">
                  {e.id === regTroca?.planejadoId ? "↩ voltar ao original" : exTroca?.substitutos?.includes(e.id) ? "substituto recomendado" : e.musculoPrincipal}
                </div>
              </div>
            </button>
          ))}
        </div>
      </Modal>

      <Modal aberto={confirmar} fechar={() => setConfirmar(false)} titulo="Finalizar treino?">
        <p className="sub" style={{ margin: 0 }}>
          Você completou {feitas} de {total} séries. Séries não confirmadas não serão salvas.
        </p>
        <button className="btn ok bloco" onClick={finalizar}>Finalizar assim mesmo</button>
        <button className="btn bloco" onClick={() => setConfirmar(false)}>Continuar treinando</button>
      </Modal>

      <Modal aberto={descartar} fechar={() => setDescartar(false)} titulo="Descartar treino?">
        <p className="sub" style={{ margin: 0 }}>Nada desta sessão será salvo e a fila de treinos não avança.</p>
        <button
          className="btn perigo bloco"
          onClick={() => {
            st.descartarSessao();
            setDescartar(false);
            nav("/");
          }}
        >
          Descartar
        </button>
      </Modal>
    </>
  );
}
