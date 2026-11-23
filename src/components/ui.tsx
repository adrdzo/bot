import type { ReactNode } from 'react';

export function Cabecalho({ titulo, voltar, acao }: { titulo: string; voltar?: () => void; acao?: ReactNode }) {
  return (
    <header className="cabecalho">
      {voltar ? (
        <button className="btn-icone" onClick={voltar} aria-label="Voltar">
          ‹
        </button>
      ) : (
        <span className="logo" aria-hidden>
          🐉
        </span>
      )}
      <h1>{titulo}</h1>
      <div className="cabecalho-acao">{acao}</div>
    </header>
  );
}

export function Cartao({ titulo, children, className = '', extra }: { titulo?: ReactNode; children: ReactNode; className?: string; extra?: ReactNode }) {
  return (
    <section className={`cartao ${className}`}>
      {(titulo || extra) && (
        <div className="cartao-topo">
          {titulo && <h2>{titulo}</h2>}
          {extra}
        </div>
      )}
      {children}
    </section>
  );
}

/** Seletor 1–10 em uma linha (rápido de tocar). */
export function Escala({ valor, onChange, rotulo, dica }: { valor?: number; onChange: (n: number) => void; rotulo: string; dica?: string }) {
  return (
    <div className="campo">
      <label>
        {rotulo} {dica && <small className="muted">{dica}</small>}
      </label>
      <div className="escala" role="radiogroup" aria-label={rotulo}>
        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={valor === n}
            className={valor === n ? 'ativo' : ''}
            onClick={() => onChange(n)}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}

export function CampoNumero({
  rotulo,
  valor,
  onChange,
  passo = 0.1,
  sufixo,
  placeholder,
}: {
  rotulo: string;
  valor?: number;
  onChange: (n: number | undefined) => void;
  passo?: number;
  sufixo?: string;
  placeholder?: string;
}) {
  return (
    <label className="campo">
      <span>{rotulo}</span>
      <span className="input-sufixo">
        <input
          type="number"
          inputMode="decimal"
          step={passo}
          value={valor ?? ''}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value === '' ? undefined : Number(e.target.value.replace(',', '.')))}
        />
        {sufixo && <em>{sufixo}</em>}
      </span>
    </label>
  );
}

export function Selo({ tipo, children }: { tipo: 'bom' | 'alerta' | 'ruim' | 'neutro' | 'destaque'; children: ReactNode }) {
  const icone = { bom: '▲', alerta: '■', ruim: '▼', neutro: '•', destaque: '★' }[tipo];
  return (
    <span className={`selo selo-${tipo}`}>
      <span aria-hidden>{icone}</span> {children}
    </span>
  );
}

export function Vazio({ children }: { children: ReactNode }) {
  return <p className="vazio">{children}</p>;
}
