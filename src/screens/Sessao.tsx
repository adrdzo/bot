import { useEffect, useState } from 'react';
import type { Navegar } from '../App';
import { TimerDescanso } from '../components/Timer';
import { Cabecalho, Selo } from '../components/ui';
import { formatarCurta } from '../domain/datas';
import { calcularMeta, formatarKg } from '../domain/progressao';
import type { EstadoApp, RegistroRascunho } from '../domain/types';
import { useApp } from '../store/AppContext';
import { finalizarSessao, iniciarSessao, substituirExercicio, type ResumoSessao } from '../store/acoes';

const ROTULO_TIPO = { composto: 'composto', isolado: 'isolado', core: 'core' };

function fmtSeg(s: number) {
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

function Decorrido({ inicio }: { inicio: string }) {
  const [agora, setAgora] = useState(Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setAgora(Date.now()), 15000);
    return () => window.clearInterval(id);
  }, []);
  return <span className="muted">{Math.max(0, Math.floor((agora - new Date(inicio).getTime()) / 60000))} min</span>;
}

export function SessaoTela({ navegar }: { navegar: Navegar }) {
  const { estado, atualizar, substituir } = useApp();
  const [timer, setTimer] = useState<{ fim: number; total: number } | null>(null);
  const [resumo, setResumo] = useState<ResumoSessao | null>(null);
  const [trocando, setTrocando] = useState<number | null>(null);
  const [notaAberta, setNotaAberta] = useState<Record<number, boolean>>({});

  const s = estado.sessaoAtiva;

  if (resumo) return <Resumo resumo={resumo} estado={estado} navegar={navegar} />;

  if (!s) {
    return (
      <>
        <Cabecalho titulo="Treino" voltar={() => navegar('inicio')} />
        <div className="cartao">
          <p>Nenhum treino em andamento.</p>
          <button
            className="btn-primario btn-grande"
            onClick={() => atualizar((e) => iniciarSessao(e))}
          >
            Começar {estado.usuario.proximoTreino}
          </button>
        </div>
      </>
    );
  }

  const treino = estado.treinos[s.treinoId];
  const alterarSerie = (ri: number, si: number, campo: Partial<RegistroRascunho['series'][number]>) =>
    atualizar((e) => {
      const serie = e.sessaoAtiva!.registros[ri].series[si];
      Object.assign(serie, campo);
      // ao alterar a carga da 1ª série ainda não feita, replica para as seguintes não feitas
      if (campo.carga !== undefined) {
        e.sessaoAtiva!.registros[ri].series.forEach((x, k) => {
          if (k > si && !x.feita) x.carga = campo.carga!;
        });
      }
    });

  const confirmarSerie = (ri: number, si: number) => {
    const reg = s.registros[ri];
    const serie = reg.series[si];
    const feita = !serie.feita;
    alterarSerie(ri, si, { feita });
    if (feita) {
      const ex = estado.exercicios[reg.exercicioId];
      const seg = ex?.tipo === 'composto' ? estado.usuario.descansoCompostoSeg : estado.usuario.descansoIsoladoSeg;
      setTimer({ fim: Date.now() + seg * 1000, total: seg });
    }
  };

  const feitas = s.registros.reduce((t, r) => t + r.series.filter((x) => x.feita).length, 0);
  const total = s.registros.reduce((t, r) => t + r.series.length, 0);

  const finalizar = () => {
    const pendentes = total - feitas;
    if (feitas === 0) {
      if (confirm('Nenhuma série confirmada. Descartar este treino?')) {
        atualizar((e) => {
          e.sessaoAtiva = undefined;
        });
        navegar('inicio');
      }
      return;
    }
    if (pendentes > 0 && !confirm(`${pendentes} série(s) não confirmada(s) serão ignoradas. Finalizar mesmo assim?`)) return;
    const copia = structuredClone(estado);
    const r = finalizarSessao(copia);
    substituir(copia);
    setTimer(null);
    if (r) setResumo(r);
  };

  return (
    <>
      <Cabecalho
        titulo={`${s.treinoId}${s.deload ? ' · deload' : ''}`}
        voltar={() => navegar('inicio')}
        acao={<Decorrido inicio={s.inicio} />}
      />
      <p className="muted subtitulo">
        {treino.nome} · {feitas}/{total} séries
      </p>
      <div className="progresso">
        <div style={{ width: `${total ? (feitas / total) * 100 : 0}%` }} />
      </div>
      {s.deload && <div className="faixa faixa-deload">Deload: mesmas cargas, pare com 3–4 reps na reserva.</div>}

      {s.registros.map((reg, ri) => {
        const ex = estado.exercicios[reg.exercicioId];
        const item = treino.itens.find((i) => i.exercicioId === reg.planoExercicioId);
        if (!ex || !item) return null;
        const meta = calcularMeta(estado.sessoes, item, ex, estado.usuario, s.deload);
        const plano = estado.exercicios[reg.planoExercicioId];
        const subs = (plano?.substitutos ?? []).concat(reg.exercicioId !== reg.planoExercicioId ? [reg.planoExercicioId] : []).filter((id) => id !== reg.exercicioId && estado.exercicios[id]);
        const completo = reg.series.every((x) => x.feita);
        const descanso = ex.tipo === 'composto' ? estado.usuario.descansoCompostoSeg : estado.usuario.descansoIsoladoSeg;
        return (
          <section key={ri} className={`exercicio ${completo ? 'completo' : ''}`}>
            <div className="exercicio-topo">
              <div>
                <h2>
                  <a href={`#/historico/${encodeURIComponent(ex.id)}`} className="link-sutil">
                    {ex.nome}
                  </a>
                </h2>
                {reg.exercicioId !== reg.planoExercicioId && <p className="muted pequeno">substituindo {plano?.nome}</p>}
                <p className="muted pequeno">
                  {reg.series.length} × {item.repsMin}–{item.repsMax} · {ROTULO_TIPO[ex.tipo]} · descanso {fmtSeg(descanso)}
                </p>
              </div>
              {subs.length > 0 && (
                <button className="btn-texto" onClick={() => setTrocando(trocando === ri ? null : ri)}>
                  ⇄ trocar
                </button>
              )}
            </div>

            {trocando === ri && (
              <div className="trocar-lista">
                {subs.map((id) => (
                  <button
                    key={id}
                    className="btn-secundario"
                    onClick={() => {
                      atualizar((e) => substituirExercicio(e, ri, id));
                      setTrocando(null);
                    }}
                  >
                    {estado.exercicios[id].nome}
                    {id === reg.planoExercicioId ? ' (original)' : ''}
                  </button>
                ))}
              </div>
            )}

            <div className="ultima">
              {meta.ultima ? (
                <span>
                  Última: <strong>{meta.ultima}</strong>
                  {meta.ultimaData && <span className="muted"> ({formatarCurta(new Date(meta.ultimaData))})</span>}
                </span>
              ) : (
                <span className="muted">Primeira vez: escolha uma carga para {item.repsMin}–{item.repsMax} reps com 1–2 RIR.</span>
              )}
              {meta.sobeCarga && <Selo tipo="bom">sobe carga → {formatarKg(meta.series[0].carga)}</Selo>}
            </div>
            {meta.dica && <p className="dica">💡 {meta.dica}</p>}

            <div className="series" role="table" aria-label={`Séries de ${ex.nome}`}>
              <div className="serie serie-cab" role="row">
                <span>#</span>
                <span>kg</span>
                <span>reps</span>
                <span>RIR</span>
                <span title="Execução OK">exec.</span>
                <span />
              </div>
              {reg.series.map((serie, si) => {
                const ultimaSerie = si === reg.series.length - 1;
                return (
                  <div key={si} className={`serie ${serie.feita ? 'feita' : ''}`} role="row">
                    <span className="serie-num">{si + 1}</span>
                    <input
                      type="number"
                      inputMode="decimal"
                      step="0.5"
                      aria-label={`Carga da série ${si + 1}`}
                      value={serie.carga === 0 && !serie.feita && !meta.ultima ? '' : serie.carga}
                      placeholder="kg"
                      onChange={(e) => alterarSerie(ri, si, { carga: e.target.value === '' ? 0 : Number(e.target.value) })}
                    />
                    <input
                      type="number"
                      inputMode="numeric"
                      aria-label={`Repetições da série ${si + 1}`}
                      value={serie.reps}
                      onChange={(e) => alterarSerie(ri, si, { reps: e.target.value === '' ? 0 : Math.max(0, Math.round(Number(e.target.value))) })}
                    />
                    <select
                      aria-label={`RIR da série ${si + 1}`}
                      value={serie.rir ?? ''}
                      onChange={(e) => alterarSerie(ri, si, { rir: e.target.value === '' ? undefined : Number(e.target.value) })}
                    >
                      <option value="">–</option>
                      {[0, 1, 2, 3, 4, 5].map((n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
                    </select>
                    <button
                      className={`exec ${serie.execucaoOk ? 'ok' : 'nok'}`}
                      aria-pressed={serie.execucaoOk}
                      aria-label={`Execução ${serie.execucaoOk ? 'OK' : 'ruim'} na série ${si + 1}`}
                      onClick={() => alterarSerie(ri, si, { execucaoOk: !serie.execucaoOk })}
                    >
                      {serie.execucaoOk ? '✓' : '✗'}
                    </button>
                    <button
                      className={`confirmar ${serie.feita ? 'ativo' : ''}`}
                      aria-pressed={serie.feita}
                      aria-label={serie.feita ? `Desfazer série ${si + 1}` : `Confirmar série ${si + 1}`}
                      onClick={() => confirmarSerie(ri, si)}
                    >
                      {serie.feita ? '✔' : '○'}
                    </button>
                    {ultimaSerie && ex.tipo !== 'composto' && !s.deload && !serie.feita && (
                      <span className="serie-dica">última série: pode ir a 0 RIR</span>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="exercicio-rodape">
              <button
                className="btn-texto"
                onClick={() =>
                  atualizar((e) => {
                    const r = e.sessaoAtiva!.registros[ri];
                    const ult = r.series[r.series.length - 1];
                    r.series.push({ numero: r.series.length + 1, carga: ult?.carga ?? 0, reps: ult?.reps ?? item.repsMin, execucaoOk: true, feita: false });
                  })
                }
              >
                + série
              </button>
              {reg.series.length > 1 && !reg.series[reg.series.length - 1].feita && (
                <button
                  className="btn-texto"
                  onClick={() =>
                    atualizar((e) => {
                      e.sessaoAtiva!.registros[ri].series.pop();
                    })
                  }
                >
                  − série
                </button>
              )}
              <button className="btn-texto" onClick={() => setNotaAberta({ ...notaAberta, [ri]: !(notaAberta[ri] ?? !!reg.nota) })}>
                ✎ nota{reg.nota ? ' •' : ''}
              </button>
            </div>
            {(notaAberta[ri] ?? !!reg.nota) && (
              <textarea
                className="nota"
                placeholder="Ex.: pegada mais fechada, dor no ombro…"
                value={reg.nota ?? ''}
                onChange={(e) =>
                  atualizar((d) => {
                    d.sessaoAtiva!.registros[ri].nota = e.target.value || undefined;
                  })
                }
              />
            )}
          </section>
        );
      })}

      <div className="acoes-fim">
        <button className="btn-primario btn-grande" onClick={finalizar}>
          Finalizar treino
        </button>
        <button
          className="btn-texto perigo"
          onClick={() => {
            if (confirm('Descartar este treino? Nada será salvo.')) {
              atualizar((e) => {
                e.sessaoAtiva = undefined;
              });
              navegar('inicio');
            }
          }}
        >
          Descartar treino
        </button>
      </div>

      {timer && (
        <TimerDescanso
          fim={timer.fim}
          total={timer.total}
          onAjustar={(seg) => setTimer((t) => (t ? { fim: Math.max(Date.now(), t.fim + seg * 1000), total: Math.max(1, t.total + seg) } : t))}
          onFechar={() => setTimer(null)}
        />
      )}
    </>
  );
}

function Resumo({ resumo, estado, navegar }: { resumo: ResumoSessao; estado: EstadoApp; navegar: Navegar }) {
  const nome = (id: string) => estado.exercicios[id]?.nome ?? id;
  return (
    <>
      <Cabecalho titulo="Treino concluído 🔥" />
      <section className="hero">
        <h2 className="hero-treino">{resumo.sessao.treinoId}</h2>
        <p className="hero-nome">
          {resumo.seriesFeitas} séries · {resumo.sessao.duracaoMin} min
        </p>
        <p className="muted">Próximo da fila: {estado.usuario.proximoTreino}</p>
      </section>

      <section className="cartao">
        <h2>Recordes</h2>
        {resumo.prs.length ? (
          <ul className="lista">
            {resumo.prs.map((p) => (
              <li key={p.exercicioId}>
                <Selo tipo="destaque">PR</Selo> <strong>{nome(p.exercicioId)}</strong> — {p.texto}
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">Sem recordes hoje. Consistência é o que constrói o dragão.</p>
        )}
      </section>

      <section className="cartao">
        <h2>Sobe carga na próxima vez</h2>
        {resumo.sobemCarga.length ? (
          <ul className="lista">
            {resumo.sobemCarga.map((id) => (
              <li key={id}>
                <Selo tipo="bom">sobe</Selo> {nome(id)}
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">Nenhum exercício bateu o topo da faixa em todas as séries. Busque +1 rep.</p>
        )}
      </section>

      <section className="cartao">
        <h2>Registro</h2>
        <ul className="lista">
          {resumo.sessao.registros.map((r) => (
            <li key={r.exercicioId}>
              <strong>{nome(r.exercicioId)}</strong>:{' '}
              {r.series.map((x) => `${x.carga ? x.carga + 'kg×' : ''}${x.reps}${x.execucaoOk ? '' : '✗'}`).join(' · ')}
            </li>
          ))}
        </ul>
      </section>
      <button className="btn-primario btn-grande" onClick={() => navegar('inicio')}>
        Voltar ao início
      </button>
    </>
  );
}
