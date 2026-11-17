import { useState } from "react";
import { useStore } from "../store/store";
import { FATORES, MODOS } from "../logic/nutricao";
import { NOMES_DIAS, hojeISO } from "../logic/datas";
import { Ilustracao } from "../components/Ilustracao";
import { Passo, Troca } from "../components/ui";
import type { ModoNutricao, NivelAtividade } from "../types";

export default function Onboarding() {
  const st = useStore();
  const u = st.usuario;
  const [passo, setPasso] = useState(0);
  const [peso, setPeso] = useState(78);
  const set = st.setUsuario;

  const concluir = () => {
    st.addPesagem(hojeISO(), peso);
    set({ pesoInicial: peso, inicioPrograma: hojeISO(), onboarded: true });
  };

  return (
    <div className="app">
      <div className="pagina" style={{ minHeight: "100vh", justifyContent: "center" }}>
        <div className="pontos" style={{ marginBottom: 8 }}>
          {[0, 1, 2].map((i) => <span key={i} className={i <= passo ? "on" : ""} />)}
        </div>

        {passo === 0 && (
          <>
            <div className="heroi" style={{ alignItems: "center", textAlign: "center" }}>
              <div className="grade2" style={{ width: "100%" }}>
                <Ilustracao padrao="barraFixa" tamanho={140} />
                <Ilustracao padrao="elevacaoLateral" tamanho={140} />
              </div>
              <div style={{ fontSize: 30, fontWeight: 900, letterSpacing: "-0.03em" }}>Projeto Dragão 🐉</div>
              <div className="sub">Hipertrofia natural com foco em V-taper: ombros e dorsais largos, cintura fina.</div>
            </div>
            <div className="card coluna">
              {[
                ["📈", "Progressão dupla automática", "O app pré-preenche carga e reps de cada série."],
                ["🧠", "Deload inteligente", "Detecta estagnação, fadiga e sono ruim."],
                ["📏", "Medidas, fotos e V-taper", "Acompanhe a razão ombro/cintura mês a mês."],
                ["🍽️", "Nutrição ajustável", "Calorias e macros com ajuste a cada 2 semanas."],
              ].map(([i, t, d]) => (
                <div key={t} className="linha" style={{ alignItems: "flex-start" }}>
                  <span style={{ fontSize: 22 }}>{i}</span>
                  <div><div className="forte">{t}</div><div className="mini">{d}</div></div>
                </div>
              ))}
            </div>
            <button className="btn prim gigante" onClick={() => setPasso(1)}>Começar</button>
          </>
        )}

        {passo === 1 && (
          <div className="card coluna">
            <h2>Sobre você</h2>
            <div className="campo"><label>Como quer ser chamado?</label><input className="input" value={u.nome} onChange={(e) => set({ nome: e.target.value })} placeholder="Seu nome" /></div>
            <div className="campo"><label>Sexo</label><Troca opcoes={[["M", "Masculino"], ["F", "Feminino"]]} valor={u.sexo} onChange={(v) => set({ sexo: v })} /></div>
            <div className="grade2">
              <div className="campo"><label>Altura (cm)</label><Passo valor={u.altura} onChange={(v) => set({ altura: v })} /></div>
              <div className="campo"><label>Idade</label><Passo valor={u.idade} onChange={(v) => set({ idade: v })} /></div>
            </div>
            <div className="campo"><label>Peso atual (kg)</label><Passo valor={peso} onChange={setPeso} passo={0.5} /></div>
            <div className="campo">
              <label>Nível de atividade</label>
              <select className="input" value={u.nivelAtividade} onChange={(e) => set({ nivelAtividade: e.target.value as NivelAtividade })}>
                {Object.entries(FATORES).map(([k, f]) => <option key={k} value={k}>{f.nome} – {f.desc}</option>)}
              </select>
            </div>
            <div className="linha">
              <button className="btn" onClick={() => setPasso(0)}>Voltar</button>
              <button className="btn prim flex1" onClick={() => setPasso(2)}>Continuar</button>
            </div>
          </div>
        )}

        {passo === 2 && (
          <div className="card coluna">
            <h2>Seu plano</h2>
            <div className="campo">
              <label>Treinos por semana</label>
              <Troca opcoes={[["3", "3 dias"], ["4", "4 dias"]]} valor={String(u.metaSemanal) as "3" | "4"}
                onChange={(v) => set({ metaSemanal: Number(v) as 3 | 4, diasTreino: v === "3" ? [1, 3, 5] : [1, 2, 4, 5] })} />
            </div>
            <div className="campo">
              <label>Dias preferidos</label>
              <div className="linha" style={{ flexWrap: "wrap", gap: 6 }}>
                {NOMES_DIAS.map((n, i) => (
                  <button key={i} className={`chip ${u.diasTreino.includes(i) ? "fogo" : ""}`} style={{ border: 0, cursor: "pointer", padding: "6px 10px" }}
                    onClick={() => set({ diasTreino: u.diasTreino.includes(i) ? u.diasTreino.filter((x) => x !== i) : [...u.diasTreino, i].sort() })}>
                    {n.slice(0, 3)}
                  </button>
                ))}
              </div>
              <div className="mini">Com 3 dias o app não pula treinos: a fila continua na semana seguinte.</div>
            </div>
            <div className="campo">
              <label>Objetivo nutricional</label>
              <select className="input" value={u.modoNutricao} onChange={(e) => set({ modoNutricao: e.target.value as ModoNutricao })}>
                {Object.entries(MODOS).map(([k, m]) => <option key={k} value={k}>{m.nome} ({m.meta})</option>)}
              </select>
            </div>
            <div className="linha">
              <button className="btn" onClick={() => setPasso(1)}>Voltar</button>
              <button className="btn prim flex1" onClick={concluir}>🔥 Bora treinar</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
