import { useEffect, useRef, useState } from 'react';

function beep() {
  try {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AC();
    [0, 0.25, 0.5].forEach((d) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.value = 880;
      g.gain.setValueAtTime(0.25, ctx.currentTime + d);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + d + 0.18);
      o.connect(g).connect(ctx.destination);
      o.start(ctx.currentTime + d);
      o.stop(ctx.currentTime + d + 0.2);
    });
    setTimeout(() => ctx.close(), 1000);
  } catch {
    /* sem áudio */
  }
  navigator.vibrate?.([200, 100, 200]);
}

/** Timer de descanso baseado em horário de término (continua certo com a tela apagada). */
export function TimerDescanso({ fim, total, onAjustar, onFechar }: { fim: number; total: number; onAjustar: (seg: number) => void; onFechar: () => void }) {
  const [agora, setAgora] = useState(Date.now());
  const avisou = useRef(false);

  useEffect(() => {
    avisou.current = false;
  }, [fim]);

  useEffect(() => {
    const id = window.setInterval(() => setAgora(Date.now()), 250);
    return () => window.clearInterval(id);
  }, []);

  const restante = Math.max(0, Math.ceil((fim - agora) / 1000));
  useEffect(() => {
    if (restante === 0 && !avisou.current) {
      avisou.current = true;
      beep();
    }
  }, [restante]);

  const mm = Math.floor(restante / 60);
  const ss = String(restante % 60).padStart(2, '0');
  const pct = total > 0 ? Math.min(100, ((total - restante) / total) * 100) : 100;

  return (
    <div className={`timer ${restante === 0 ? 'timer-fim' : ''}`} role="timer" aria-live="polite">
      <div className="timer-barra" style={{ width: `${pct}%` }} />
      <span className="timer-rotulo">{restante === 0 ? 'Bora! Próxima série' : 'Descanso'}</span>
      <strong className="timer-tempo">
        {mm}:{ss}
      </strong>
      <div className="timer-botoes">
        <button onClick={() => onAjustar(-15)} aria-label="Menos 15 segundos">
          −15
        </button>
        <button onClick={() => onAjustar(30)} aria-label="Mais 30 segundos">
          +30
        </button>
        <button onClick={onFechar} aria-label="Fechar timer">
          ✕
        </button>
      </div>
    </div>
  );
}
