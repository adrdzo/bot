import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useStore } from "../store/store";
import { mediaPeso, sugerirDecisaoVolume, topEvolucao } from "../logic/analise";
import { fmtDataLonga, hojeISO, uid } from "../logic/datas";
import { apagarFoto, lerFoto, salvarFoto } from "../store/fotos";
import { Modal, Passo, Topo, toast } from "../components/ui";
import type { AvaliacaoMensal, Decisao, Medidas } from "../types";

const CAMPOS: [keyof Medidas, string][] = [
  ["ombros", "Ombros (circunferência)"],
  ["cintura", "Cintura (umbigo)"],
  ["peito", "Peito"],
  ["braco", "Braço (contraído)"],
  ["coxa", "Coxa"],
  ["panturrilha", "Panturrilha"],
];
const POSES = [
  ["frente", "Frente"],
  ["lado", "Lado"],
  ["costas", "Costas"],
] as const;
type Pose = (typeof POSES)[number][0];

const PONTOS = ["Deltoide lateral", "Dorsais", "Peito", "Braços", "Quadríceps", "Posteriores", "Panturrilha", "Abdômen", "Cintura"];

const NOMES_DECISAO: Record<Decisao, string> = {
  manter: "Manter volume",
  aumentar: "Aumentar volume",
  reduzir: "Reduzir volume",
  deload: "Fazer deload",
};

function Foto({ id, rotulo, onPick, onLimpar }: { id?: string; rotulo: string; onPick?: (f: File) => void; onLimpar?: () => void }) {
  const [src, setSrc] = useState<string>();
  const inp = useRef<HTMLInputElement>(null);
  useEffect(() => {
    let vivo = true;
    if (id) lerFoto(id).then((s) => vivo && setSrc(s));
    else setSrc(undefined);
    return () => {
      vivo = false;
    };
  }, [id]);
  return (
    <div className="foto" onClick={() => onPick && inp.current?.click()}>
      {src ? <img src={src} alt={rotulo} /> : <span>{onPick ? `📷\n${rotulo}` : "sem foto"}</span>}
      <span className="tag">{rotulo}</span>
      {onPick && (
        <input
          ref={inp}
          type="file"
          accept="image/*"
          capture="environment"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onPick(f);
            e.target.value = "";
          }}
        />
      )}
      {src && onLimpar && (
        <button
          className="btn peq"
          style={{ position: "absolute", top: 4, right: 4, minHeight: 24, padding: "0 6px" }}
          onClick={(e) => {
            e.stopPropagation();
            onLimpar();
          }}
        >
          ✕
        </button>
      )}
    </div>
  );
}

export default function Avaliacao() {
  const { id = "nova" } = useParams();
  const st = useStore();
  const nav = useNavigate();
  const existente = st.avaliacoes.find((a) => a.id === id);
  const anteriores = st.avaliacoes.filter((a) => a.id !== id && (!existente || a.data < existente.data));
  const anterior = anteriores[anteriores.length - 1];
  const sugestao = useMemo(
    () => sugerirDecisaoVolume(st.sessoes, st.checkins, st.usuario, st.programa, st.exerciciosCustom),
    [st.sessoes, st.checkins, st.usuario, st.programa, st.exerciciosCustom],
  );
  const top = useMemo(() => topEvolucao(st.sessoes, st.exerciciosCustom), [st.sessoes, st.exerciciosCustom]);
  const base: Medidas = existente?.medidas ??
    anterior?.medidas ?? { cintura: 80, braco: 36, peito: 100, coxa: 56, panturrilha: 37, ombros: 118 };
  const [aid] = useState(existente?.id ?? uid());
  const [data, setData] = useState(existente?.data ?? hojeISO());
  const [peso, setPeso] = useState(existente?.peso ?? Math.round((mediaPeso(st.pesagens, hojeISO(), 7) ?? st.usuario.pesoInicial ?? 75) * 10) / 10);
  const [gordura, setGordura] = useState<number | undefined>(existente?.gorduraPct);
  const [med, setMed] = useState<Medidas>({ ...base });
  const [fotos, setFotos] = useState<Partial<Record<Pose, string>>>(existente?.fotos ?? {});
  const [pontos, setPontos] = useState<string[]>(existente?.pontosFracos ?? []);
  const [decisao, setDecisao] = useState<Decisao>(existente?.decisao ?? sugestao.decisao);
  const [nota, setNota] = useState(existente?.nota ?? "");
  const [comparar, setComparar] = useState<Pose>();
  const [apagar, setApagar] = useState(false);
  const razao = med.ombros / med.cintura;
  const razaoAnt = anterior ? anterior.medidas.ombros / anterior.medidas.cintura : undefined;

  const salvar = () => {
    const a: AvaliacaoMensal = {
      id: aid,
      data,
      peso,
      gorduraPct: gordura,
      medidas: med,
      fotos,
      pontosFracos: pontos,
      decisao,
      musculosAjuste: decisao === sugestao.decisao ? sugestao.musculos : [],
      nota: nota.trim() || undefined,
    };
    st.salvarAvaliacao(a);
    if (!existente) {
      if (decisao === "deload") st.iniciarDeload();
      if ((decisao === "aumentar" || decisao === "reduzir") && a.musculosAjuste?.length)
        a.musculosAjuste.forEach((m) => st.ajustarSeriesMusculo(m, decisao === "aumentar" ? 1 : -1));
    }
    toast("Avaliação salva ✓");
    nav("/corpo");
  };

  return (
    <>
      <Topo titulo={existente ? "Avaliação mensal" : "Nova avaliação"} voltar />
      <div className="pagina">
        <div className="grade2">
          <div className="campo">
            <label>Data</label>
            <input type="date" className="input" value={data} onChange={(e) => setData(e.target.value)} />
          </div>
          <div className="campo">
            <label>Peso (kg)</label>
            <Passo valor={peso} onChange={setPeso} passo={0.1} rotulo="peso" />
          </div>
        </div>
        <div className="campo">
          <label>% de gordura estimado (opcional)</label>
          <input
            className="input"
            inputMode="decimal"
            value={gordura ?? ""}
            onChange={(e) => setGordura(e.target.value ? Number(e.target.value.replace(",", ".")) : undefined)}
          />
        </div>

        <div className="card coluna">
          <div className="card-titulo" style={{ margin: 0 }}>
            <h2>Medidas (cm)</h2>
            {anterior && <span className="mini">vs {fmtDataLonga(anterior.data)}</span>}
          </div>
          {CAMPOS.map(([k, r]) => {
            const d = anterior ? med[k] - anterior.medidas[k] : undefined;
            return (
              <div key={k} className="linha">
                <div className="flex1">
                  <div style={{ fontSize: 14 }}>{r}</div>
                  {d !== undefined && Math.abs(d) > 0.01 && (
                    <div className="mini" style={{ color: (k === "cintura" ? d < 0 : d > 0) ? "var(--ok)" : "var(--aviso)" }}>
                      {d > 0 ? "+" : ""}
                      {d.toFixed(1)} cm
                    </div>
                  )}
                </div>
                <div style={{ width: 150 }}>
                  <Passo valor={med[k]} onChange={(v) => setMed({ ...med, [k]: v })} passo={0.5} rotulo={r} />
                </div>
              </div>
            );
          })}
        </div>

        <div className="card">
          <div className="linha entre">
            <div>
              <div className="rotulo">Razão ombro/cintura</div>
              <div style={{ fontSize: 30, fontWeight: 900 }}>{razao.toFixed(2)}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              {razaoAnt && Math.abs(razao - razaoAnt) >= 0.005 && (
                <div className={`chip ${razao >= razaoAnt ? "ok" : "aviso"}`}>
                  {razao >= razaoAnt ? "▲" : "▼"} {Math.abs(razao - razaoAnt).toFixed(2)}
                </div>
              )}
              <div className="mini" style={{ marginTop: 4 }}>meta estética ~1,60</div>
            </div>
          </div>
          <div className="barra" style={{ marginTop: 8 }}>
            <i style={{ width: `${Math.max(0, Math.min(100, ((razao - 1.2) / 0.5) * 100))}%` }} />
            <span className="marca" style={{ left: "80%" }} />
          </div>
        </div>

        <div className="card coluna">
          <h2>Fotos</h2>
          <div className="mini">Mesma luz, mesmo horário, em jejum. As fotos ficam só neste aparelho.</div>
          <div className="fotos">
            {POSES.map(([p, r]) => (
              <Foto
                key={p}
                id={fotos[p]}
                rotulo={r}
                onPick={async (f) => {
                  const fid = `${aid}-${p}`;
                  await salvarFoto(f, fid);
                  setFotos({ ...fotos, [p]: fid });
                }}
                onLimpar={() => {
                  if (fotos[p]) apagarFoto(fotos[p]!);
                  const n = { ...fotos };
                  delete n[p];
                  setFotos(n);
                }}
              />
            ))}
          </div>
          {anterior?.fotos && Object.keys(anterior.fotos).length > 0 && (
            <div className="linha" style={{ flexWrap: "wrap" }}>
              <span className="mini">Comparar com o mês anterior:</span>
              {POSES.filter(([p]) => anterior.fotos?.[p]).map(([p, r]) => (
                <button key={p} className="btn peq" onClick={() => setComparar(p)}>{r}</button>
              ))}
            </div>
          )}
        </div>

        {top.length > 0 && (
          <div className="card">
            <h2 style={{ marginBottom: 6 }}>🏆 Top 5 que mais evoluíram</h2>
            <div className="lista">
              {top.map((t, i) => (
                <div key={t.id} className="linha entre">
                  <span>{i + 1}. {t.nome}</span>
                  <span className="chip ok">{t.ganhoPct >= 0 ? "+" : ""}{t.ganhoPct.toFixed(1)}%</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="card coluna">
          <h2>Pontos fracos</h2>
          <div className="linha" style={{ flexWrap: "wrap", gap: 6 }}>
            {PONTOS.map((p) => (
              <button
                key={p}
                className={`chip ${pontos.includes(p) ? "fogo" : ""}`}
                style={{ border: 0, cursor: "pointer", padding: "6px 10px" }}
                onClick={() => setPontos(pontos.includes(p) ? pontos.filter((x) => x !== p) : [...pontos, p])}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        <div className="card coluna">
          <h2>Decisão de volume</h2>
          <div className="alerta azul">
            <span className="ico">🤖</span>
            <div>
              <div className="forte">Sugestão: {NOMES_DECISAO[sugestao.decisao]}</div>
              <div className="sub">{sugestao.motivo}</div>
              {sugestao.musculos.length > 0 && <div className="sub">Músculos: {sugestao.musculos.join(", ")}</div>}
            </div>
          </div>
          <div className="grade2">
            {(Object.keys(NOMES_DECISAO) as Decisao[]).map((d) => (
              <button key={d} className={`btn ${decisao === d ? "prim" : ""}`} onClick={() => setDecisao(d)}>
                {NOMES_DECISAO[d]}
              </button>
            ))}
          </div>
          <div className="mini">
            O app sugere, você confirma.{" "}
            {!existente &&
              (decisao === "deload"
                ? "Ao salvar, o deload começa nas próximas sessões."
                : decisao !== "manter" && decisao === sugestao.decisao && sugestao.musculos.length
                  ? `Ao salvar, a ficha será ajustada em ${decisao === "aumentar" ? "+1" : "−1"} série/semana em: ${sugestao.musculos.join(", ")}.`
                  : "")}
          </div>
          <textarea className="input" placeholder="Observações do mês" value={nota} onChange={(e) => setNota(e.target.value)} />
        </div>

        <button className="btn prim gigante" onClick={salvar}>Salvar avaliação</button>
        {existente && (
          <button className="btn perigo" onClick={() => setApagar(true)}>Apagar avaliação</button>
        )}
      </div>

      <Modal aberto={!!comparar} fechar={() => setComparar(undefined)} titulo="Antes × agora">
        {comparar && (
          <div className="grade2">
            <div className="coluna">
              <span className="mini">{anterior && fmtDataLonga(anterior.data)}</span>
              <Foto id={anterior?.fotos?.[comparar]} rotulo="Antes" />
            </div>
            <div className="coluna">
              <span className="mini">{fmtDataLonga(data)}</span>
              <Foto id={fotos[comparar]} rotulo="Agora" />
            </div>
          </div>
        )}
      </Modal>
      <Modal aberto={apagar} fechar={() => setApagar(false)} titulo="Apagar avaliação?">
        <button
          className="btn perigo bloco"
          onClick={() => {
            Object.values(existente?.fotos ?? {}).forEach((f) => f && apagarFoto(f));
            st.apagarAvaliacao(aid);
            nav("/corpo");
          }}
        >
          Apagar
        </button>
      </Modal>
    </>
  );
}
