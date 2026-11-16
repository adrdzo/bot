import { useMemo, useRef, useState } from 'react';

export interface Ponto {
  /** Data ISO (YYYY-MM-DD ou completa). */
  x: string;
  y: number;
  rotulo?: string;
}

interface Props {
  pontos: Ponto[];
  titulo: string;
  unidade?: string;
  casas?: number;
  /** Linha de referência horizontal (ex.: meta 1,6). */
  referencia?: { y: number; rotulo: string };
  altura?: number;
}

const L = 320; // largura lógica do viewBox
const M = { t: 12, r: 12, b: 22, l: 40 };

function ticks(min: number, max: number, n = 4): number[] {
  if (min === max) return [min];
  const passoBruto = (max - min) / n;
  const mag = 10 ** Math.floor(Math.log10(passoBruto));
  const passo = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((p) => p >= passoBruto) ?? passoBruto;
  const out: number[] = [];
  for (let v = Math.ceil(min / passo) * passo; v <= max + 1e-9; v += passo) out.push(Number(v.toFixed(6)));
  return out;
}

const fmtData = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' });
const t = (s: string) => (s.length === 10 ? new Date(s + 'T12:00:00') : new Date(s)).getTime();

/** Gráfico de linha de série única, com cruz + dica ao passar o dedo/mouse. */
export function GraficoLinha({ pontos, titulo, unidade = '', casas = 1, referencia, altura = 170 }: Props) {
  const [hover, setHover] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const H = altura;

  const geo = useMemo(() => {
    const ord = [...pontos].sort((a, b) => t(a.x) - t(b.x));
    const xs = ord.map((p) => t(p.x));
    const ys = ord.map((p) => p.y);
    if (referencia) ys.push(referencia.y);
    let yMin = Math.min(...ys);
    let yMax = Math.max(...ys);
    const folga = (yMax - yMin) * 0.12 || Math.abs(yMax) * 0.05 || 1;
    yMin -= folga;
    yMax += folga;
    const xMin = Math.min(...xs);
    const xMax = Math.max(...xs);
    const sx = (v: number) => (xMax === xMin ? (M.l + L - M.r) / 2 : M.l + ((v - xMin) / (xMax - xMin)) * (L - M.l - M.r));
    const sy = (v: number) => M.t + (1 - (v - yMin) / (yMax - yMin)) * (H - M.t - M.b);
    return { ord, sx, sy, yTicks: ticks(yMin, yMax), xs };
  }, [pontos, referencia, H]);

  if (pontos.length === 0) {
    return (
      <figure className="grafico">
        <figcaption>{titulo}</figcaption>
        <p className="vazio">Sem dados ainda.</p>
      </figure>
    );
  }

  const { ord, sx, sy, yTicks } = geo;
  const caminho = ord.map((p, i) => `${i ? 'L' : 'M'}${sx(t(p.x)).toFixed(1)},${sy(p.y).toFixed(1)}`).join(' ');
  const fmtY = (v: number) => v.toLocaleString('pt-BR', { maximumFractionDigits: casas });

  const mover = (clientX: number) => {
    const svg = svgRef.current;
    if (!svg) return;
    const r = svg.getBoundingClientRect();
    const x = ((clientX - r.left) / r.width) * L;
    let melhor = 0;
    ord.forEach((p, i) => {
      if (Math.abs(sx(t(p.x)) - x) < Math.abs(sx(t(ord[melhor].x)) - x)) melhor = i;
    });
    setHover(melhor);
  };

  const h = hover !== null ? ord[hover] : null;
  const xLabels = ord.length <= 1 ? ord : [ord[0], ord[ord.length - 1]];

  return (
    <figure className="grafico">
      <figcaption>
        <span>{titulo}</span>
        {h ? (
          <span className="grafico-dica">
            <strong>
              {fmtY(h.y)}
              {unidade}
            </strong>{' '}
            · {fmtData.format(t(h.x))}
            {h.rotulo ? ` · ${h.rotulo}` : ''}
          </span>
        ) : (
          <span className="grafico-dica muted">
            último: <strong>{fmtY(ord[ord.length - 1].y)}{unidade}</strong>
          </span>
        )}
      </figcaption>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${L} ${H}`}
        role="img"
        aria-label={`${titulo}: ${ord.length} pontos, último ${fmtY(ord[ord.length - 1].y)}${unidade}`}
        onPointerMove={(e) => mover(e.clientX)}
        onPointerDown={(e) => mover(e.clientX)}
        onPointerLeave={() => setHover(null)}
        style={{ touchAction: 'pan-y' }}
      >
        {yTicks.map((v) => (
          <g key={v}>
            <line x1={M.l} x2={L - M.r} y1={sy(v)} y2={sy(v)} className="grade" />
            <text x={M.l - 6} y={sy(v)} className="eixo" textAnchor="end" dominantBaseline="middle">
              {fmtY(v)}
            </text>
          </g>
        ))}
        {xLabels.map((p, i) => (
          <text
            key={p.x + i}
            x={sx(t(p.x))}
            y={H - 6}
            className="eixo"
            textAnchor={xLabels.length > 1 ? (i === 0 ? 'start' : 'end') : 'middle'}
          >
            {fmtData.format(t(p.x))}
          </text>
        ))}
        {referencia && (
          <g>
            <line x1={M.l} x2={L - M.r} y1={sy(referencia.y)} y2={sy(referencia.y)} className="referencia" />
            <text x={L - M.r} y={sy(referencia.y) - 4} className="eixo" textAnchor="end">
              {referencia.rotulo}
            </text>
          </g>
        )}
        <path d={caminho} className="linha" />
        {ord.length <= 40 &&
          ord.map((p, i) => <circle key={i} cx={sx(t(p.x))} cy={sy(p.y)} r={hover === i ? 5 : 3.5} className="ponto" />)}
        {h && (
          <g pointerEvents="none">
            <line x1={sx(t(h.x))} x2={sx(t(h.x))} y1={M.t} y2={H - M.b} className="cruz" />
            <circle cx={sx(t(h.x))} cy={sy(h.y)} r={5.5} className="ponto ativo" />
          </g>
        )}
      </svg>
    </figure>
  );
}
