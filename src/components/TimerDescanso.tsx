import { useEffect, useRef, useState } from "react";
import { useStore } from "../store/store";
import { fmtTempo } from "../logic/datas";

let ctx: AudioContext | undefined;
export function bip(vezes = 3) {
  try {
    ctx ??= new AudioContext();
    for (let i = 0; i < vezes; i++) {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.value = i === vezes - 1 ? 1320 : 880;
      g.gain.setValueAtTime(0.0001, ctx.currentTime + i * 0.25);
      g.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + i * 0.25 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + i * 0.25 + 0.18);
      o.connect(g).connect(ctx.destination);
      o.start(ctx.currentTime + i * 0.25);
      o.stop(ctx.currentTime + i * 0.25 + 0.2);
    }
  } catch {
    /* sem áudio */
  }
  navigator.vibrate?.([200, 100, 200]);
}

export function TimerDescanso() {
  const fimT = useStore((s) => s.timerFim);
  const total = useStore((s) => s.timerTotal ?? 1);
  const ajustar = useStore((s) => s.ajustarTimer);
  const parar = useStore((s) => s.pararTimer);
  const [agora, setAgora] = useState(Date.now());
  const avisou = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (!fimT) return;
    const i = setInterval(() => setAgora(Date.now()), 250);
    return () => clearInterval(i);
  }, [fimT]);

  const rest = fimT ? Math.ceil((fimT - agora) / 1000) : 0;
  useEffect(() => {
    if (fimT && rest <= 0 && avisou.current !== fimT) {
      avisou.current = fimT;
      bip();
    }
    if (fimT && rest < -30) parar();
  }, [rest, fimT, parar]);

  if (!fimT) return null;
  const pct = Math.max(0, Math.min(1, rest / total));
  return (
    <div className={`timer ${rest <= 0 ? "zero" : ""}`}>
      <div className="timer-in">
        <div className="coluna" style={{ gap: 2 }}>
          <span className="mini">{rest <= 0 ? "Bora! Próxima série" : "Descanso"}</span>
          <span className="tempo">{fmtTempo(Math.abs(rest))}</span>
        </div>
        <div className="flex1">
          <div className="barra">
            <i style={{ width: `${pct * 100}%`, background: rest <= 0 ? "var(--ok)" : undefined, transition: "width .25s linear" }} />
          </div>
        </div>
        <button className="btn peq" onClick={() => ajustar(-15)}>−15</button>
        <button className="btn peq" onClick={() => ajustar(15)}>+15</button>
        <button className="btn peq fant" onClick={parar} aria-label="Pular descanso">✕</button>
      </div>
    </div>
  );
}
