import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useStore } from "../store/store";
import { EXERCICIOS } from "../data/exercicios";
import { exerciciosDoPrograma, statusExercicio } from "../logic/analise";
import { Ilustracao } from "../components/Ilustracao";
import { Topo, Vazio } from "../components/ui";

export const COR_STATUS: Record<string, string> = {
  progredindo: "ok",
  estagnado: "aviso",
  regredindo: "erro",
  novo: "",
};

export default function Exercicios() {
  const st = useStore();
  const [busca, setBusca] = useState("");
  const [musculo, setMusculo] = useState("Todos");
  const [soPrograma, setSoPrograma] = useState(false);
  const todos = useMemo(() => [...EXERCICIOS, ...st.exerciciosCustom], [st.exerciciosCustom]);
  const noPrograma = useMemo(() => new Set(exerciciosDoPrograma(st.programa)), [st.programa]);
  const musculos = ["Todos", ...new Set(todos.map((e) => e.musculoPrincipal))];
  const lista = todos.filter(
    (e) =>
      (musculo === "Todos" || e.musculoPrincipal === musculo) &&
      (!soPrograma || noPrograma.has(e.id)) &&
      e.nome.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "").includes(busca.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "")),
  );

  return (
    <>
      <Topo titulo="Exercícios" voltar />
      <div className="pagina">
        <input className="input" placeholder="🔍 Buscar exercício…" value={busca} onChange={(e) => setBusca(e.target.value)} />
        <div className="abas">
          {musculos.map((m) => (
            <button key={m} className={musculo === m ? "on" : ""} onClick={() => setMusculo(m)}>
              {m}
            </button>
          ))}
        </div>
        <label className="linha sub" style={{ cursor: "pointer" }}>
          <input type="checkbox" checked={soPrograma} onChange={(e) => setSoPrograma(e.target.checked)} />
          Só os da minha ficha
        </label>
        {lista.length === 0 && <Vazio ico="🔎" titulo="Nenhum exercício encontrado" />}
        <div className="galeria">
          {lista.map((e) => {
            const status = statusExercicio(st.sessoes, e.id);
            const feito = st.sessoes.some((s) => s.registros.some((r) => r.exercicioId === e.id));
            return (
              <Link key={e.id} to={`/exercicio/${e.id}`} className="item">
                <div className="ilu">
                  <Ilustracao padrao={e.padrao} />
                </div>
                <div className="forte" style={{ fontSize: 14, lineHeight: 1.25 }}>{e.nome}</div>
                <div className="linha" style={{ gap: 4, flexWrap: "wrap" }}>
                  <span className="chip">{e.musculoPrincipal}</span>
                  {noPrograma.has(e.id) && <span className="chip fogo">ficha</span>}
                  {feito && status !== "novo" && <span className={`chip ${COR_STATUS[status]}`}>{status}</span>}
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </>
  );
}
