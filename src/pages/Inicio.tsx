import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useStore } from "../store/store";
import { exercicioPorId } from "../data/exercicios";
import { avaliarDeload, mediaPeso, prontosParaSubir, sequenciaSemanas, sessoesDaSemana } from "../logic/analise";
import { addDias, diasEntre, fmtData, hojeISO, inicioSemana, semanaISO } from "../logic/datas";
import { Ilustracao } from "../components/Ilustracao";
import { Passo, Stat, Tendencia, toast } from "../components/ui";

export default function Inicio() {
  const nav = useNavigate();
  const st = useStore();
  const { usuario: u, sessoes, programa, checkins, pesagens, avaliacoes, deloadAtivo, sessaoAtual, exerciciosCustom } = st;
  const hoje = hojeISO();
  const treino = programa.find((t) => t.id === u.proximoTreino)!;
  const semana = sessoesDaSemana(sessoes);
  const deload = useMemo(
    () => avaliarDeload(sessoes, checkins, u, programa, exerciciosCustom),
    [sessoes, checkins, u, programa, exerciciosCustom],
  );
  const prontos = useMemo(() => prontosParaSubir(sessoes, programa), [sessoes, programa]);
  const pesoSem = mediaPeso(pesagens, hoje, 7);
  const pesoAnt = mediaPeso(pesagens, hojeISO(addDias(new Date(), -7)), 7);
  const cint = checkins.filter((c) => c.cinturaCm);
  const cintU = cint[cint.length - 1];
  const cintA = cint[cint.length - 2];
  const pesoHoje = pesagens.find((p) => p.data === hoje);
  const [peso, setPeso] = useState(pesoHoje?.peso ?? pesagens[pesagens.length - 1]?.peso ?? u.pesoInicial ?? 75);
  const checkinFeito = checkins.some((c) => c.semanaISO === semanaISO(hoje));
  const ultAval = avaliacoes[avaliacoes.length - 1];
  const avalDevida = diasEntre(ultAval?.data ?? u.inicioPrograma, hoje) >= 28;
  const streak = sequenciaSemanas(sessoes, u.metaSemanal);
  const razao = ultAval ? ultAval.medidas.ombros / ultAval.medidas.cintura : undefined;
  const dow = new Date().getDay();
  const seg = inicioSemana(new Date());
  const dias = Array.from({ length: 7 }, (_, i) => addDias(seg, i));
  const primeiro = exercicioPorId(treino.itens[0]?.exercicioId, exerciciosCustom);
  const minutos = treino.itens.reduce((a, i) => {
    const ex = exercicioPorId(i.exercicioId, exerciciosCustom);
    const desc = ex?.tipo === "composto" ? u.descansoComposto : u.descansoIsolado;
    return a + i.series * (desc + 45);
  }, 0) / 60;

  const saud = new Date().getHours() < 12 ? "Bom dia" : new Date().getHours() < 18 ? "Boa tarde" : "Boa noite";

  return (
    <div className="pagina">
      <div className="linha entre" style={{ paddingTop: 4 }}>
        <div>
          <div className="sub">{saud}{u.nome ? `, ${u.nome}` : ""} 🔥</div>
          <h1 style={{ margin: 0, fontSize: 24, letterSpacing: "-0.02em" }}>Projeto Dragão</h1>
        </div>
        <div className="chip fogo" title="Semanas seguidas cumprindo a meta">
          🔥 {streak} sem.
        </div>
      </div>

      {sessaoAtual && (
        <Link to="/treino" className="alerta fogo">
          <span className="ico">⏱️</span>
          <div className="flex1">
            <div className="forte">Treino {sessaoAtual.treinoId} em andamento</div>
            <div className="sub">Toque para continuar de onde parou.</div>
          </div>
        </Link>
      )}

      {deloadAtivo && (
        <div className="alerta aviso">
          <span className="ico">🧘</span>
          <div className="flex1">
            <div className="forte">Semana de deload ativa</div>
            <div className="sub">
              Metade das séries, mesma carga, 3–4 RIR. Faltam {deloadAtivo.sessoesRestantes} sessão(ões).
            </div>
          </div>
        </div>
      )}

      <div className="heroi">
        <div className="ilu">{primeiro && <Ilustracao padrao={primeiro.padrao} tamanho={130} />}</div>
        <div className="linha" style={{ gap: 6 }}>
          <span className="chip fogo">Próximo treino</span>
          {deloadAtivo && <span className="chip aviso">Deload</span>}
        </div>
        <div style={{ maxWidth: "62%" }}>
          <div style={{ fontSize: 30, fontWeight: 900, letterSpacing: "-0.03em", lineHeight: 1 }}>{treino.id}</div>
          <div className="forte" style={{ marginTop: 4 }}>
            {treino.nome} · {treino.foco}
          </div>
          <div className="sub" style={{ marginTop: 4 }}>
            {treino.itens.length} exercícios · ~{Math.round(minutos / 5) * 5} min
          </div>
        </div>
        <button
          className="btn prim gigante"
          onClick={() => {
            if (!sessaoAtual) st.iniciarSessao();
            nav("/treino");
          }}
        >
          ▶ {sessaoAtual ? "Continuar treino" : `Começar ${treino.id}`}
        </button>
        <Link to="/programa" className="mini" style={{ textAlign: "center" }}>
          Ver a ficha completa ou trocar o treino →
        </Link>
      </div>

      {/* alertas */}
      {deload.ativo && !deloadAtivo && (
        <div className="alerta erro">
          <span className="ico">⚠️</span>
          <div className="flex1 coluna" style={{ gap: 6 }}>
            <div className="forte">Deload sugerido</div>
            {deload.motivos.map((m) => (
              <div key={m} className="sub">• {m}</div>
            ))}
            <div className="linha">
              <button
                className="btn peq prim"
                onClick={() => {
                  st.iniciarDeload();
                  toast("Deload iniciado para as próximas sessões");
                }}
              >
                Iniciar deload
              </button>
            </div>
          </div>
        </div>
      )}
      {prontos.length > 0 && (
        <div className="alerta ok">
          <span className="ico">📈</span>
          <div className="flex1">
            <div className="forte">
              {prontos.length} exercício{prontos.length > 1 ? "s" : ""} pronto{prontos.length > 1 ? "s" : ""} para subir carga
            </div>
            <div className="sub">{prontos.map((id) => exercicioPorId(id, exerciciosCustom)?.nome).join(", ")}</div>
          </div>
        </div>
      )}
      {!checkinFeito && (dow === 0 || dow >= 5) && (
        <Link to="/checkin" className="alerta azul">
          <span className="ico">📝</span>
          <div className="flex1">
            <div className="forte">Faça o check-in semanal</div>
            <div className="sub">Menos de 30 segundos: cintura, sono, fadiga e motivação.</div>
          </div>
        </Link>
      )}
      {avalDevida && (
        <Link to="/avaliacao/nova" className="alerta aviso">
          <span className="ico">📏</span>
          <div className="flex1">
            <div className="forte">Hora da avaliação mensal</div>
            <div className="sub">Medidas, fotos e decisão de volume.</div>
          </div>
        </Link>
      )}

      <div className="card">
        <div className="card-titulo">
          <h2>Esta semana</h2>
          <span className="chip">
            {semana.length}/{u.metaSemanal} treinos
          </span>
        </div>
        <div className="calendario" style={{ marginBottom: 8 }}>
          {dias.map((d) => {
            const iso = hojeISO(d);
            const s = sessoes.find((x) => x.fim && x.data.slice(0, 10) === iso);
            const cls = s ? (s.deload ? "dl" : s.treinoId.startsWith("SUP") ? "sup" : "inf") : "";
            const planejado = u.diasTreino.includes(d.getDay());
            return (
              <div
                key={iso}
                className={`d ${cls} ${iso === hoje ? "hoje" : ""}`}
                title={s ? s.treinoId : planejado ? "Dia de treino" : "Descanso"}
                style={!s && planejado ? { border: "1px dashed var(--txt3)" } : undefined}
              >
                {s ? s.treinoId : ["D", "S", "T", "Q", "Q", "S", "S"][d.getDay()]}
              </div>
            );
          })}
        </div>
        <div className="pontos">
          {Array.from({ length: u.metaSemanal }, (_, i) => (
            <span key={i} className={i < semana.length ? "on" : ""} />
          ))}
        </div>
      </div>

      <div className="grade2">
        <Link to="/corpo" className="card">
          <Stat valor={pesoSem ? pesoSem.toFixed(1) : "–"} unidade="kg" rotulo="Peso médio (7 dias)" />
          <div style={{ marginTop: 6 }}>
            <Tendencia delta={pesoSem && pesoAnt ? pesoSem - pesoAnt : undefined} unidade=" kg" inverso={u.modoNutricao === "cutting"} />
          </div>
        </Link>
        <Link to="/corpo" className="card">
          <Stat valor={cintU?.cinturaCm?.toFixed(1) ?? "–"} unidade="cm" rotulo="Cintura (último)" />
          <div style={{ marginTop: 6 }}>
            <Tendencia delta={cintU && cintA ? cintU.cinturaCm! - cintA.cinturaCm! : undefined} unidade=" cm" inverso />
          </div>
        </Link>
      </div>

      <div className="card">
        <div className="card-titulo">
          <h3>Pesagem de hoje</h3>
          {pesoHoje && <span className="chip ok">✓ {pesoHoje.peso} kg</span>}
        </div>
        <div className="linha">
          <div className="flex1">
            <Passo valor={peso} onChange={setPeso} passo={0.1} sufixo="kg" rotulo="peso" />
          </div>
          <button
            className="btn prim"
            onClick={() => {
              st.addPesagem(hoje, Math.round(peso * 10) / 10);
              toast("Peso registrado");
            }}
          >
            {pesoHoje ? "Atualizar" : "Salvar"}
          </button>
        </div>
        <div className="mini" style={{ marginTop: 6 }}>Em jejum, após ir ao banheiro. O app calcula a média semanal.</div>
      </div>

      {razao && (
        <Link to="/progresso" className="card">
          <div className="linha entre">
            <div>
              <div className="rotulo">Razão ombro/cintura</div>
              <div style={{ fontSize: 26, fontWeight: 800 }}>{razao.toFixed(2)}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div className="mini">Meta estética</div>
              <div className="forte">1,60</div>
            </div>
          </div>
          <div className="barra" style={{ marginTop: 8 }}>
            <i style={{ width: `${Math.min(100, ((razao - 1.2) / 0.5) * 100)}%` }} />
            <span className="marca" style={{ left: `${((1.6 - 1.2) / 0.5) * 100}%` }} />
          </div>
        </Link>
      )}

      {sessoes.length > 0 && (
        <div className="card">
          <div className="card-titulo">
            <h3>Últimos treinos</h3>
            <Link to="/historico" className="mini">ver tudo →</Link>
          </div>
          <div className="lista">
            {[...sessoes]
              .reverse()
              .slice(0, 3)
              .map((s) => (
                <Link key={s.id} to={`/resumo/${s.id}`} className="linha entre">
                  <div className="linha">
                    <span className={`chip ${s.treinoId.startsWith("SUP") ? "fogo" : "azul"}`}>{s.treinoId}</span>
                    <span>{fmtData(s.data.slice(0, 10))}</span>
                    {s.deload && <span className="chip aviso">deload</span>}
                  </div>
                  <span className="mini">
                    {s.registros.reduce((a, r) => a + r.series.filter((x) => x.feita).length, 0)} séries · {s.duracaoMin ?? "–"} min
                  </span>
                </Link>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
