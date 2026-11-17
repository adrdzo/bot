import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export interface Ponto {
  x: string;
  y: number;
  extra?: string;
}

const Dica = ({ active, payload, unidade }: { active?: boolean; payload?: { payload: Ponto }[]; unidade?: string }) => {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="card compacto" style={{ fontSize: 13, boxShadow: "0 8px 24px rgba(0,0,0,.3)" }}>
      <div className="mini">{p.x}</div>
      <div className="forte num">
        {p.y.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}
        {unidade && ` ${unidade}`}
      </div>
      {p.extra && <div className="mini">{p.extra}</div>}
    </div>
  );
};

/** Gráfico de linha de série única: 2px, área suave, grade discreta, tooltip com crosshair */
export function GraficoLinha({
  dados,
  unidade,
  cor = "var(--fogo)",
  altura = 180,
  meta,
  metaRotulo,
  id,
}: {
  dados: Ponto[];
  unidade?: string;
  cor?: string;
  altura?: number;
  meta?: number;
  metaRotulo?: string;
  id: string;
}) {
  if (dados.length < 2)
    return (
      <div className="mini" style={{ height: 80, display: "grid", placeItems: "center", textAlign: "center" }}>
        Registre pelo menos 2 pontos para ver o gráfico.
      </div>
    );
  const ys = dados.map((d) => d.y).concat(meta !== undefined ? [meta] : []);
  const min = Math.min(...ys);
  const max = Math.max(...ys);
  const pad = Math.max((max - min) * 0.15, 0.5);
  return (
    <div style={{ width: "100%", height: altura }}>
      <ResponsiveContainer>
        <AreaChart data={dados} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
          <defs>
            <linearGradient id={`g-${id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={cor} stopOpacity={0.28} />
              <stop offset="100%" stopColor={cor} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="var(--borda)" strokeDasharray="0" />
          <XAxis dataKey="x" tickLine={false} axisLine={false} minTickGap={24} />
          <YAxis
            tickLine={false}
            axisLine={false}
            domain={[Math.floor((min - pad) * 10) / 10, Math.ceil((max + pad) * 10) / 10]}
            tickFormatter={(v) => Number(v).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}
            width={52}
          />
          {meta !== undefined && (
            <ReferenceLine
              y={meta}
              stroke="var(--txt3)"
              strokeDasharray="4 4"
              label={{ value: metaRotulo ?? "meta", position: "insideTopRight", fill: "var(--txt2)", fontSize: 11 }}
            />
          )}
          <Tooltip content={<Dica unidade={unidade} />} cursor={{ stroke: "var(--txt3)", strokeWidth: 1 }} />
          <Area
            type="monotone"
            dataKey="y"
            stroke={cor}
            strokeWidth={2}
            fill={`url(#g-${id})`}
            dot={dados.length <= 16 ? { r: 3, fill: cor, stroke: "var(--card)", strokeWidth: 2 } : false}
            activeDot={{ r: 5, fill: cor, stroke: "var(--card)", strokeWidth: 2 }}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
