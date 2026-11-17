import { useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";

export function Topo({ titulo, voltar, direita }: { titulo: string; voltar?: boolean | string; direita?: ReactNode }) {
  const nav = useNavigate();
  return (
    <div className="topo">
      {voltar && (
        <button
          className="voltar"
          aria-label="Voltar"
          onClick={() => (typeof voltar === "string" ? nav(voltar) : nav(-1))}
        >
          <Icone nome="voltar" />
        </button>
      )}
      <h1>{titulo}</h1>
      {direita}
    </div>
  );
}

export function Modal({ aberto, fechar, children, titulo }: { aberto: boolean; fechar: () => void; children: ReactNode; titulo?: string }) {
  useEffect(() => {
    if (!aberto) return;
    const f = (e: KeyboardEvent) => e.key === "Escape" && fechar();
    window.addEventListener("keydown", f);
    return () => window.removeEventListener("keydown", f);
  }, [aberto, fechar]);
  if (!aberto) return null;
  return (
    <div className="modal-fundo" onClick={fechar}>
      <div className="modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        {titulo && (
          <div className="linha entre">
            <h2>{titulo}</h2>
            <button className="btn fant peq" onClick={fechar} aria-label="Fechar">
              ✕
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}

export function Passo({
  valor,
  onChange,
  passo = 1,
  min = 0,
  sufixo,
  rotulo,
}: {
  valor: number;
  onChange: (v: number) => void;
  passo?: number;
  min?: number;
  sufixo?: string;
  rotulo?: string;
}) {
  const [txt, setTxt] = useState(String(valor));
  useEffect(() => {
    setTxt(String(valor));
  }, [valor]);
  const fix = (v: number) => Math.max(min, Math.round(v * 1000) / 1000);
  return (
    <div className="passo">
      <button type="button" aria-label={`Diminuir ${rotulo ?? ""}`} onClick={() => onChange(fix(valor - passo))}>
        −
      </button>
      <input
        inputMode="decimal"
        aria-label={rotulo}
        value={txt}
        onFocus={(e) => e.target.select()}
        onChange={(e) => {
          setTxt(e.target.value);
          const v = parseFloat(e.target.value.replace(",", "."));
          if (!Number.isNaN(v)) onChange(fix(v));
        }}
        onBlur={() => setTxt(String(valor))}
      />
      {sufixo && <span className="mini" style={{ marginRight: 2 }}>{sufixo}</span>}
      <button type="button" aria-label={`Aumentar ${rotulo ?? ""}`} onClick={() => onChange(fix(valor + passo))}>
        +
      </button>
    </div>
  );
}

export function Escala({ valor, onChange }: { valor?: number; onChange: (v: number) => void }) {
  return (
    <div className="escala">
      {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
        <button type="button" key={n} className={valor === n ? "on" : ""} onClick={() => onChange(n)}>
          {n}
        </button>
      ))}
    </div>
  );
}

export function Troca<T extends string>({ opcoes, valor, onChange }: { opcoes: [T, string][]; valor: T; onChange: (v: T) => void }) {
  return (
    <div className="troca">
      {opcoes.map(([v, r]) => (
        <button type="button" key={v} className={valor === v ? "on" : ""} onClick={() => onChange(v)}>
          {r}
        </button>
      ))}
    </div>
  );
}

export function Abas<T extends string>({ abas, ativa, onChange }: { abas: [T, string][]; ativa: T; onChange: (v: T) => void }) {
  return (
    <div className="abas" role="tablist">
      {abas.map(([v, r]) => (
        <button key={v} role="tab" aria-selected={ativa === v} className={ativa === v ? "on" : ""} onClick={() => onChange(v)}>
          {r}
        </button>
      ))}
    </div>
  );
}

export function Stat({ valor, unidade, rotulo, cor }: { valor: ReactNode; unidade?: string; rotulo: string; cor?: string }) {
  return (
    <div className="stat">
      <div className="v" style={cor ? { color: cor } : undefined}>
        {valor}
        {unidade && <small>{unidade}</small>}
      </div>
      <div className="r">{rotulo}</div>
    </div>
  );
}

export function Tendencia({ delta, inverso = false, unidade = "" }: { delta?: number; inverso?: boolean; unidade?: string }) {
  if (delta === undefined || Number.isNaN(delta)) return <span className="mini">sem dados</span>;
  const bom = inverso ? delta < 0 : delta > 0;
  const neutro = Math.abs(delta) < 0.05;
  const cls = neutro ? "chip" : bom ? "chip ok" : "chip aviso";
  return (
    <span className={cls}>
      {neutro ? "→" : delta > 0 ? "▲" : "▼"} {Math.abs(delta).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}
      {unidade}
    </span>
  );
}

let toastTimer: number | undefined;
export function toast(msg: string) {
  window.dispatchEvent(new CustomEvent("dragao-toast", { detail: msg }));
}
export function Toaster() {
  const [msg, setMsg] = useState<string>();
  useEffect(() => {
    const f = (e: Event) => {
      setMsg((e as CustomEvent).detail);
      clearTimeout(toastTimer);
      toastTimer = window.setTimeout(() => setMsg(undefined), 2400);
    };
    window.addEventListener("dragao-toast", f);
    return () => window.removeEventListener("dragao-toast", f);
  }, []);
  return msg ? <div className="toast">{msg}</div> : null;
}

const ICONES: Record<string, ReactNode> = {
  inicio: <path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />,
  treino: (
    <path d="M6.5 6.5v11M17.5 6.5v11M3 9v6M21 9v6M6.5 12h11" strokeWidth={2.2} fill="none" strokeLinecap="round" />
  ),
  progresso: <path d="M4 19V5M4 19h16M8 15l4-4 3 3 5-6" fill="none" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />,
  corpo: (
    <>
      <circle cx="12" cy="5" r="2.4" />
      <path d="M6 9.5h12M12 9v6m0 0-3 6m3-6 3 6" fill="none" strokeWidth={2} strokeLinecap="round" />
    </>
  ),
  mais: (
    <>
      <circle cx="5" cy="12" r="2" />
      <circle cx="12" cy="12" r="2" />
      <circle cx="19" cy="12" r="2" />
    </>
  ),
  voltar: <path d="M15 5l-7 7 7 7" fill="none" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />,
  play: <path d="M8 5v14l11-7z" />,
};

export function Icone({ nome, tamanho = 20 }: { nome: keyof typeof ICONES | string; tamanho?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={tamanho} height={tamanho} fill="currentColor" stroke="currentColor" strokeWidth={0}>
      {ICONES[nome]}
    </svg>
  );
}

export function Vazio({ ico, titulo, children }: { ico: string; titulo: string; children?: ReactNode }) {
  return (
    <div className="vazio">
      <div className="ico">{ico}</div>
      <div className="forte">{titulo}</div>
      {children && <div className="sub" style={{ marginTop: 4 }}>{children}</div>}
    </div>
  );
}
