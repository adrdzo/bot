import { useState } from "react";
import { useStore } from "../store/store";
import { aquecimento, calcularAnilhas, e1rm } from "../logic/progressao";
import { Passo, Topo } from "../components/ui";

const CORES: Record<string, string> = { "25": "#e5484d", "20": "#3e7bfa", "15": "#f5b93a", "10": "#30a46c", "5": "#8e8e93", "2.5": "#5b5bd6", "1.25": "#a1a1aa" };

export default function Ferramentas() {
  const u = useStore((s) => s.usuario);
  const [total, setTotal] = useState(100);
  const [carga, setCarga] = useState(80);
  const [reps, setReps] = useState(8);
  const [trabalho, setTrabalho] = useState(100);
  const { porLado, sobra } = calcularAnilhas(total, u.barraKg, u.anilhasDisponiveis);
  const rm = e1rm(carga, reps);
  const tabela = [1, 3, 5, 6, 8, 10, 12, 15].map((r) => ({ r, c: rm / (1 + r / 30) }));

  return (
    <>
      <Topo titulo="Ferramentas" voltar />
      <div className="pagina">
        <div className="card coluna">
          <h2>🏋️ Calculadora de anilhas</h2>
          <Passo valor={total} onChange={setTotal} passo={2.5} sufixo="kg" rotulo="carga total" />
          <div className="anilhas">
            {[...porLado].reverse().map((a, i) => (
              <div key={`e${i}`} className="anilha" style={{ height: 40 + a * 2, background: CORES[String(a)] ?? "#666" }}>{a}</div>
            ))}
            <div className="barra-eixo" title={`Barra ${u.barraKg} kg`} />
            {porLado.map((a, i) => (
              <div key={`d${i}`} className="anilha" style={{ height: 40 + a * 2, background: CORES[String(a)] ?? "#666" }}>{a}</div>
            ))}
          </div>
          <div className="sub" style={{ textAlign: "center" }}>
            {total < u.barraKg ? "Carga menor que a barra." : porLado.length ? `Por lado: ${porLado.join(" + ")} kg` : "Só a barra."}
            {sobra > 0.001 && ` (faltam ${(sobra * 2).toFixed(2)} kg para fechar)`}
          </div>
          <div className="mini" style={{ textAlign: "center" }}>Barra de {u.barraKg} kg · anilhas configuráveis em Configurações</div>
        </div>

        <div className="card coluna">
          <h2>📐 1RM estimado (Epley)</h2>
          <div className="grade2">
            <div className="campo"><label>Carga</label><Passo valor={carga} onChange={setCarga} passo={2.5} rotulo="carga" /></div>
            <div className="campo"><label>Reps</label><Passo valor={reps} onChange={setReps} min={1} rotulo="reps" /></div>
          </div>
          <div style={{ textAlign: "center", fontSize: 34, fontWeight: 900 }}>{rm.toFixed(1)} kg</div>
          <table className="tabela">
            <thead><tr><th>Reps</th><th>Carga estimada</th><th>% 1RM</th></tr></thead>
            <tbody>
              {tabela.map((t) => (
                <tr key={t.r}><td>{t.r}</td><td className="forte">{t.c.toFixed(1)} kg</td><td>{Math.round((t.c / rm) * 100)}%</td></tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="card coluna">
          <h2>🔥 Aquecimento</h2>
          <Passo valor={trabalho} onChange={setTrabalho} passo={2.5} sufixo="kg" rotulo="carga de trabalho" />
          <div className="lista">
            {aquecimento(trabalho, 2.5).map((a, i) => (
              <div key={i} className="linha entre"><span>Série {i + 1}</span><b>{a.carga} kg × {a.reps}</b></div>
            ))}
            <div className="linha entre"><span>Trabalho</span><b>{trabalho} kg</b></div>
          </div>
          <div className="mini">Aquecimento rápido, sem gerar fadiga: ~50%, 70% e 85% da carga de trabalho.</div>
        </div>
      </div>
    </>
  );
}
