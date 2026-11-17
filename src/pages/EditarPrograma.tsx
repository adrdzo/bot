import { useState } from "react";
import { useStore } from "../store/store";
import { EXERCICIOS, exercicioPorId } from "../data/exercicios";
import { ROTACAO } from "../data/programa";
import { Ilustracao } from "../components/Ilustracao";
import { Abas, Modal, Passo, Topo, toast } from "../components/ui";
import type { TreinoId } from "../types";

export default function EditarPrograma() {
  const st = useStore();
  const [tid, setTid] = useState<TreinoId>("SUP1");
  const [adicionar, setAdicionar] = useState(false);
  const [trocar, setTrocar] = useState<number>();
  const [busca, setBusca] = useState("");
  const [reset, setReset] = useState(false);
  const t = st.programa.find((x) => x.id === tid)!;
  const itens = [...t.itens].sort((a, b) => a.ordem - b.ordem);
  const todos = [...EXERCICIOS, ...st.exerciciosCustom].filter((e) => e.nome.toLowerCase().includes(busca.toLowerCase()));

  const Seletor = ({ onPick }: { onPick: (id: string) => void }) => (
    <>
      <input className="input" placeholder="🔍 Buscar" value={busca} onChange={(e) => setBusca(e.target.value)} />
      <div className="lista">
        {todos.map((e) => (
          <button key={e.id} className="linha" style={{ background: "none", border: 0, borderBottom: "1px solid var(--borda)", textAlign: "left", cursor: "pointer" }} onClick={() => onPick(e.id)}>
            <div className="ex-thumb" style={{ width: 40, height: 40 }}><Ilustracao padrao={e.padrao} tamanho={40} animar={false} /></div>
            <div className="flex1"><div className="forte">{e.nome}</div><div className="mini">{e.musculoPrincipal}</div></div>
          </button>
        ))}
      </div>
    </>
  );

  return (
    <>
      <Topo titulo="Editar ficha" voltar />
      <div className="pagina">
        <Abas abas={ROTACAO.map((r) => [r, r] as [TreinoId, string])} ativa={tid} onChange={setTid} />
        <div className="sub">{t.nome} · {t.foco}. As mudanças valem para as próximas sessões; o histórico é mantido.</div>
        {itens.map((it, i) => {
          const ex = exercicioPorId(it.exercicioId, st.exerciciosCustom);
          const idx = t.itens.indexOf(it);
          return (
            <div key={it.exercicioId + i} className="card coluna">
              <div className="linha">
                <div className="ex-thumb" style={{ width: 44, height: 44 }}>{ex && <Ilustracao padrao={ex.padrao} tamanho={44} animar={false} />}</div>
                <div className="flex1">
                  <div className="forte">{i + 1}. {ex?.nome}</div>
                  <div className="mini">{ex?.musculoPrincipal}</div>
                </div>
                <button className="btn peq fant" disabled={i === 0} onClick={() => st.moverItem(tid, i, -1)} aria-label="Subir">↑</button>
                <button className="btn peq fant" disabled={i === itens.length - 1} onClick={() => st.moverItem(tid, i, 1)} aria-label="Descer">↓</button>
              </div>
              <div className="grade3">
                <div className="campo"><label>Séries</label><Passo valor={it.series} min={1} onChange={(v) => st.atualizarItem(tid, idx, { series: v })} /></div>
                <div className="campo"><label>Reps mín</label><Passo valor={it.repsMin} min={1} onChange={(v) => st.atualizarItem(tid, idx, { repsMin: Math.min(v, it.repsMax) })} /></div>
                <div className="campo"><label>Reps máx</label><Passo valor={it.repsMax} min={1} onChange={(v) => st.atualizarItem(tid, idx, { repsMax: Math.max(v, it.repsMin) })} /></div>
              </div>
              <div className="linha">
                <button className="btn peq" onClick={() => { setBusca(""); setTrocar(idx); }}>⇄ Trocar exercício</button>
                <button className="btn peq perigo" onClick={() => st.removerItem(tid, idx)}>Remover</button>
              </div>
            </div>
          );
        })}
        <button className="btn prim" onClick={() => { setBusca(""); setAdicionar(true); }}>+ Adicionar exercício</button>
        <button className="btn fant" onClick={() => setReset(true)}>Restaurar ficha original</button>
      </div>
      <Modal aberto={adicionar} fechar={() => setAdicionar(false)} titulo={`Adicionar ao ${tid}`}>
        <Seletor onPick={(id) => { st.adicionarItem(tid, id); setAdicionar(false); toast("Exercício adicionado"); }} />
      </Modal>
      <Modal aberto={trocar !== undefined} fechar={() => setTrocar(undefined)} titulo="Trocar exercício">
        <Seletor onPick={(id) => { st.atualizarItem(tid, trocar!, { exercicioId: id }); setTrocar(undefined); toast("Exercício trocado"); }} />
      </Modal>
      <Modal aberto={reset} fechar={() => setReset(false)} titulo="Restaurar a ficha original?">
        <p className="sub" style={{ margin: 0 }}>Os 4 treinos voltam ao programa padrão do Projeto Dragão. O histórico não é apagado.</p>
        <button className="btn perigo bloco" onClick={() => { st.restaurarPrograma(); setReset(false); toast("Ficha restaurada"); }}>Restaurar</button>
      </Modal>
    </>
  );
}
