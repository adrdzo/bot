import { Link, useNavigate } from "react-router-dom";
import { useStore } from "../store/store";
import { exercicioPorId } from "../data/exercicios";
import { ROTACAO } from "../data/programa";
import { Ilustracao } from "../components/Ilustracao";
import { Topo, toast } from "../components/ui";

export default function Programa() {
  const st = useStore();
  const nav = useNavigate();
  return (
    <>
      <Topo titulo="Minha ficha" voltar direita={<Link to="/config/programa" className="btn peq">✎ Editar</Link>} />
      <div className="pagina">
        <div className="sub">Rotação fixa: SUP1 → INF1 → SUP2 → INF2. O app sempre mostra o próximo da fila, não um treino por dia da semana.</div>
        {ROTACAO.map((id) => {
          const t = st.programa.find((x) => x.id === id)!;
          const prox = st.usuario.proximoTreino === id;
          return (
            <div key={id} className="card" style={prox ? { borderColor: "var(--fogo)" } : undefined}>
              <div className="card-titulo">
                <div>
                  <h2>{t.id} · {t.nome}</h2>
                  <div className="mini">{t.foco}</div>
                </div>
                {prox ? (
                  <span className="chip fogo">próximo</span>
                ) : (
                  <button className="btn peq" onClick={() => { st.setProximoTreino(id); toast(`${id} definido como próximo`); }}>
                    Tornar próximo
                  </button>
                )}
              </div>
              <div className="lista">
                {[...t.itens].sort((a, b) => a.ordem - b.ordem).map((it) => {
                  const ex = exercicioPorId(it.exercicioId, st.exerciciosCustom);
                  return (
                    <Link key={it.exercicioId} to={`/exercicio/${it.exercicioId}`} className="linha">
                      <div className="ex-thumb" style={{ width: 44, height: 44 }}>
                        {ex && <Ilustracao padrao={ex.padrao} tamanho={44} animar={false} />}
                      </div>
                      <div className="flex1">
                        <div className="forte" style={{ fontSize: 14 }}>{ex?.nome}</div>
                        <div className="mini">{ex?.musculoPrincipal} · {ex?.tipo}</div>
                      </div>
                      <span className="chip num">{it.series} × {it.repsMin}–{it.repsMax}</span>
                    </Link>
                  );
                })}
              </div>
              <button className="btn bloco" style={{ marginTop: 8 }} disabled={!!st.sessaoAtual} onClick={() => { st.iniciarSessao(id); nav("/treino"); }}>
                ▶ Começar {t.id}
              </button>
            </div>
          );
        })}
      </div>
    </>
  );
}
