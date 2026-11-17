import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useStore } from "../store/store";
import { exercicioPorId } from "../data/exercicios";
import { NOMES_EQUIPAMENTO } from "../data/programa";
import { FATORES } from "../logic/nutricao";
import { NOMES_DIAS, hojeISO } from "../logic/datas";
import { pedirPermissao } from "../logic/notificacoes";
import { restaurarFotos, todasFotos } from "../store/fotos";
import { Modal, Passo, Topo, Troca, toast } from "../components/ui";
import type { Equipamento, NivelAtividade } from "../types";

function baixar(nome: string, conteudo: string, tipo: string) {
  const blob = new Blob([conteudo], { type: tipo });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nome;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function Configuracoes() {
  const st = useStore();
  const u = st.usuario;
  const set = st.setUsuario;
  const arq = useRef<HTMLInputElement>(null);
  const [reset, setReset] = useState(false);
  const [comFotos, setComFotos] = useState(true);
  const [anilhasTxt, setAnilhasTxt] = useState(u.anilhasDisponiveis.join(", "));

  const exportarJSON = async () => {
    const { usuario, programa, exerciciosCustom, sessoes, pesagens, checkins, avaliacoes, deloadAtivo } = useStore.getState();
    const dados = {
      app: "projeto-dragao",
      versao: 1,
      exportadoEm: new Date().toISOString(),
      usuario, programa, exerciciosCustom, sessoes, pesagens, checkins, avaliacoes, deloadAtivo,
      fotos: comFotos ? await todasFotos() : undefined,
    };
    baixar(`projeto-dragao-${hojeISO()}.json`, JSON.stringify(dados), "application/json");
    toast("Backup exportado");
  };

  const exportarCSV = () => {
    const linhas = [["data", "treino", "deload", "exercicio", "serie", "carga_kg", "reps", "rir", "execucao_ok"].join(";")];
    st.sessoes.forEach((s) =>
      s.registros.forEach((r) =>
        r.series.filter((x) => x.feita).forEach((x) =>
          linhas.push(
            [s.data.slice(0, 10), s.treinoId, s.deload ? 1 : 0, exercicioPorId(r.exercicioId, st.exerciciosCustom)?.nome ?? r.exercicioId, x.numero, String(x.carga).replace(".", ","), x.reps, x.rir ?? "", x.execucaoOk ? 1 : 0].join(";"),
          ),
        ),
      ),
    );
    baixar(`projeto-dragao-series-${hojeISO()}.csv`, "﻿" + linhas.join("\n"), "text/csv");
    const med = [["data", "peso"].join(";"), ...st.pesagens.map((p) => `${p.data};${String(p.peso).replace(".", ",")}`)];
    baixar(`projeto-dragao-peso-${hojeISO()}.csv`, "﻿" + med.join("\n"), "text/csv");
  };

  const importar = async (f: File) => {
    try {
      const d = JSON.parse(await f.text());
      if (d.app !== "projeto-dragao") throw new Error("arquivo inválido");
      if (d.fotos) await restaurarFotos(d.fotos);
      st.importar(d);
      toast("Dados importados ✓");
    } catch (e) {
      toast(`Erro ao importar: ${(e as Error).message}`);
    }
  };

  return (
    <>
      <Topo titulo="Configurações" voltar />
      <div className="pagina">
        <div className="card coluna">
          <h2>Perfil</h2>
          <div className="campo"><label>Nome</label><input className="input" value={u.nome} onChange={(e) => set({ nome: e.target.value })} /></div>
          <div className="grade2">
            <div className="campo"><label>Altura (cm)</label><Passo valor={u.altura} onChange={(v) => set({ altura: v })} /></div>
            <div className="campo"><label>Idade</label><Passo valor={u.idade} onChange={(v) => set({ idade: v })} /></div>
          </div>
          <div className="campo"><label>Sexo</label><Troca opcoes={[["M", "Masculino"], ["F", "Feminino"]]} valor={u.sexo} onChange={(v) => set({ sexo: v })} /></div>
          <div className="campo">
            <label>Nível de atividade</label>
            <select className="input" value={u.nivelAtividade} onChange={(e) => set({ nivelAtividade: e.target.value as NivelAtividade })}>
              {Object.entries(FATORES).map(([k, f]) => <option key={k} value={k}>{f.nome} – {f.desc}</option>)}
            </select>
          </div>
          <div className="campo">
            <label>% de gordura estimado (opcional)</label>
            <input className="input" inputMode="decimal" value={u.gorduraPct ?? ""} onChange={(e) => set({ gorduraPct: e.target.value ? Number(e.target.value.replace(",", ".")) : undefined })} />
          </div>
        </div>

        <div className="card coluna">
          <h2>Treino</h2>
          <div className="campo">
            <label>Meta semanal</label>
            <Troca opcoes={[["3", "3 treinos"], ["4", "4 treinos"]]} valor={String(u.metaSemanal) as "3" | "4"} onChange={(v) => set({ metaSemanal: Number(v) as 3 | 4 })} />
          </div>
          <div className="campo">
            <label>Dias de treino (para lembretes)</label>
            <div className="linha" style={{ flexWrap: "wrap", gap: 6 }}>
              {NOMES_DIAS.map((n, i) => (
                <button key={i} className={`chip ${u.diasTreino.includes(i) ? "fogo" : ""}`} style={{ border: 0, cursor: "pointer", padding: "6px 10px" }}
                  onClick={() => set({ diasTreino: u.diasTreino.includes(i) ? u.diasTreino.filter((x) => x !== i) : [...u.diasTreino, i].sort() })}>
                  {n.slice(0, 3)}
                </button>
              ))}
            </div>
          </div>
          <div className="grade2">
            <div className="campo"><label>Descanso compostos (s)</label><Passo valor={u.descansoComposto} passo={15} onChange={(v) => set({ descansoComposto: v })} /></div>
            <div className="campo"><label>Descanso isolados (s)</label><Passo valor={u.descansoIsolado} passo={15} onChange={(v) => set({ descansoIsolado: v })} /></div>
          </div>
          <Link to="/config/programa" className="btn">📋 Editar exercícios, séries e faixas</Link>
        </div>

        <div className="card coluna">
          <h2>Cargas disponíveis</h2>
          <div className="mini">Menor salto de carga em cada equipamento. A progressão arredonda para cima nesse passo.</div>
          {(Object.keys(NOMES_EQUIPAMENTO) as Equipamento[]).map((e) => (
            <div key={e} className="linha">
              <span className="flex1" style={{ fontSize: 14 }}>{NOMES_EQUIPAMENTO[e]}</span>
              <div style={{ width: 140 }}>
                <Passo valor={u.passosCarga[e]} passo={0.25} min={0.25} onChange={(v) => set({ passosCarga: { ...u.passosCarga, [e]: v } })} sufixo="kg" />
              </div>
            </div>
          ))}
          <div className="grade2">
            <div className="campo"><label>Barra (kg)</label><Passo valor={u.barraKg} passo={2.5} onChange={(v) => set({ barraKg: v })} /></div>
            <div className="campo">
              <label>Anilhas (kg)</label>
              <input className="input" value={anilhasTxt} onChange={(e) => setAnilhasTxt(e.target.value)}
                onBlur={() => {
                  const v = anilhasTxt.split(/[,;\s]+/).map((x) => Number(x.replace(",", "."))).filter((x) => x > 0);
                  if (v.length) set({ anilhasDisponiveis: v.sort((a, b) => b - a) });
                }} />
            </div>
          </div>
        </div>

        <div className="card coluna">
          <h2>Deload</h2>
          <div className="mini">Último deload: {u.ultimoDeload ?? "nunca"} · programa iniciado em {u.inicioPrograma}</div>
          {st.deloadAtivo ? (
            <button className="btn" onClick={() => { st.cancelarDeload(); toast("Deload cancelado"); }}>Cancelar deload ativo</button>
          ) : (
            <button className="btn" onClick={() => { st.iniciarDeload(); toast("Deload iniciado"); }}>Iniciar deload manualmente</button>
          )}
        </div>

        <div className="card coluna">
          <h2>Aparência e lembretes</h2>
          <Troca opcoes={[["auto", "Automático"], ["escuro", "Escuro"], ["claro", "Claro"]]} valor={u.tema} onChange={(v) => set({ tema: v })} />
          <label className="linha" style={{ cursor: "pointer" }}>
            <input type="checkbox" checked={u.notificacoes} onChange={async (e) => {
              if (e.target.checked) {
                const ok = await pedirPermissao();
                if (!ok) return toast("Permissão de notificação negada");
              }
              set({ notificacoes: e.target.checked });
            }} />
            Notificações (dia de treino, check-in, avaliação, deload)
          </label>
          <label className="linha" style={{ cursor: "pointer" }}>
            <input type="checkbox" checked={u.lembretePesagem} onChange={(e) => set({ lembretePesagem: e.target.checked })} />
            Lembrete de pesagem diária
          </label>
          <div className="mini">Os lembretes aparecem quando o app está aberto ou instalado na tela inicial.</div>
        </div>

        <div className="card coluna">
          <h2>Dados e backup</h2>
          <div className="mini">Tudo fica salvo neste aparelho (funciona offline). Exporte um backup de vez em quando.</div>
          <label className="linha sub"><input type="checkbox" checked={comFotos} onChange={(e) => setComFotos(e.target.checked)} /> Incluir fotos no backup</label>
          <button className="btn" onClick={exportarJSON}>⬇ Exportar backup (JSON)</button>
          <button className="btn" onClick={exportarCSV}>⬇ Exportar planilhas (CSV)</button>
          <button className="btn" onClick={() => arq.current?.click()}>⬆ Importar backup</button>
          <input ref={arq} type="file" accept="application/json,.json" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) importar(f); e.target.value = ""; }} />
          <button className="btn perigo" onClick={() => setReset(true)}>Apagar todos os dados</button>
        </div>
        <div className="mini" style={{ textAlign: "center" }}>Projeto Dragão v1.0 · {st.sessoes.length} treinos registrados</div>
      </div>
      <Modal aberto={reset} fechar={() => setReset(false)} titulo="Apagar tudo?">
        <p className="sub" style={{ margin: 0 }}>Treinos, medidas, check-ins e avaliações serão apagados deste aparelho. Exporte um backup antes.</p>
        <button className="btn perigo bloco" onClick={() => { st.resetTudo(); setReset(false); }}>Apagar tudo</button>
      </Modal>
    </>
  );
}
