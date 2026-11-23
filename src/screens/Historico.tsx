import { useState } from 'react';
import type { Navegar } from '../App';
import { GraficoLinha } from '../components/Grafico';
import { Cabecalho, Cartao, Selo, Vazio } from '../components/ui';
import { exerciciosRealizados, ROTULO_STATUS, statusDeHistorico, type StatusExercicio } from '../domain/analise';
import { formatarCurta, formatarLonga } from '../domain/datas';
import { cargaTrabalho, fmtNum, historicoExercicio, melhorE1rm, resumoRegistro, totalReps } from '../domain/progressao';
import { ROTACAO } from '../domain/programa';
import { useApp } from '../store/AppContext';

const TIPO_SELO: Record<StatusExercicio, 'bom' | 'alerta' | 'ruim' | 'neutro'> = {
  novo: 'neutro',
  progredindo: 'bom',
  estagnado: 'alerta',
  regredindo: 'ruim',
};

export function SeloStatus({ status }: { status: StatusExercicio }) {
  return <Selo tipo={TIPO_SELO[status]}>{ROTULO_STATUS[status]}</Selo>;
}

export function Historico({ navegar }: { navegar: Navegar }) {
  const { estado, atualizar } = useApp();
  const [aba, setAba] = useState<'exercicios' | 'sessoes'>('exercicios');

  const noPrograma = new Set(Object.values(estado.treinos).flatMap((t) => t.itens.map((i) => i.exercicioId)));
  const extras = exerciciosRealizados(estado.sessoes).filter((id) => !noPrograma.has(id) && estado.exercicios[id]);

  const linha = (id: string) => {
    const ex = estado.exercicios[id];
    if (!ex) return null;
    const hist = historicoExercicio(estado.sessoes, id);
    const ult = hist[hist.length - 1];
    return (
      <button key={id} className="linha-lista" onClick={() => navegar(`historico/${encodeURIComponent(id)}`)}>
        <span>
          <strong>{ex.nome}</strong>
          <small className="muted">{ult ? `${resumoRegistro(ult.registro)} · ${formatarCurta(new Date(ult.sessao.data))}` : 'sem registros'}</small>
        </span>
        {hist.length > 0 && <SeloStatus status={statusDeHistorico(hist)} />}
      </button>
    );
  };

  const sessoes = [...estado.sessoes].sort((a, b) => b.data.localeCompare(a.data));

  return (
    <>
      <Cabecalho titulo="Histórico" />
      <div className="segmentado" role="tablist">
        <button role="tab" aria-selected={aba === 'exercicios'} className={aba === 'exercicios' ? 'ativo' : ''} onClick={() => setAba('exercicios')}>
          Exercícios
        </button>
        <button role="tab" aria-selected={aba === 'sessoes'} className={aba === 'sessoes' ? 'ativo' : ''} onClick={() => setAba('sessoes')}>
          Sessões ({estado.sessoes.length})
        </button>
      </div>

      {aba === 'exercicios' ? (
        <>
          {ROTACAO.map((t) => (
            <Cartao key={t} titulo={`${t} · ${estado.treinos[t].nome.split('·')[1]?.trim() ?? ''}`}>
              {estado.treinos[t].itens.map((i) => linha(i.exercicioId))}
            </Cartao>
          ))}
          {extras.length > 0 && <Cartao titulo="Substitutos usados">{extras.map(linha)}</Cartao>}
        </>
      ) : sessoes.length === 0 ? (
        <Vazio>Nenhuma sessão registrada ainda.</Vazio>
      ) : (
        sessoes.map((s) => (
          <Cartao
            key={s.id}
            titulo={
              <>
                {s.treinoId} {s.deload && <Selo tipo="neutro">deload</Selo>}
              </>
            }
            extra={<span className="muted pequeno">{formatarLonga(new Date(s.data))} · {s.duracaoMin ?? '?'} min</span>}
          >
            <ul className="lista compacta">
              {s.registros.map((r, i) => (
                <li key={i}>
                  <span>{estado.exercicios[r.exercicioId]?.nome ?? r.exercicioId}</span>
                  <span className="muted">{resumoRegistro(r)}</span>
                  {r.nota && <em className="nota-registro">“{r.nota}”</em>}
                </li>
              ))}
            </ul>
            <button
              className="btn-texto perigo"
              onClick={() => {
                if (confirm('Apagar esta sessão? Isso não pode ser desfeito.'))
                  atualizar((e) => {
                    e.sessoes = e.sessoes.filter((x) => x.id !== s.id);
                  });
              }}
            >
              Apagar sessão
            </button>
          </Cartao>
        ))
      )}
    </>
  );
}

export function HistoricoDetalhe({ id, navegar }: { id: string; navegar: Navegar }) {
  const { estado } = useApp();
  const ex = estado.exercicios[id];
  if (!ex) {
    return (
      <>
        <Cabecalho titulo="Exercício" voltar={() => navegar('historico')} />
        <Vazio>Exercício não encontrado.</Vazio>
      </>
    );
  }
  const hist = historicoExercicio(estado.sessoes, id);
  const todos = historicoExercicio(estado.sessoes, id, true);
  const semCarga = hist.every((o) => cargaTrabalho(o.registro) === 0);
  const status = statusDeHistorico(hist);
  const melhor = hist.reduce((m, o) => Math.max(m, melhorE1rm(o.registro)), 0);
  const maxCarga = hist.reduce((m, o) => Math.max(m, cargaTrabalho(o.registro)), 0);

  return (
    <>
      <Cabecalho titulo={ex.nome} voltar={() => history.back()} />
      <div className="linha-selos">
        <SeloStatus status={status} />
        <span className="muted pequeno">
          {ex.tipo} · {ex.musculoPrincipal}
          {ex.unilateral ? ' · unilateral' : ''}
        </span>
      </div>

      {hist.length > 0 && (
        <div className="grade-2">
          <Cartao titulo={semCarga ? 'Melhor total de reps' : 'Melhor e1RM'}>
            <p className="numero-grande">
              {semCarga ? Math.max(...hist.map((o) => totalReps(o.registro))) : fmtNum(melhor)}
              <small>{semCarga ? 'reps' : 'kg'}</small>
            </p>
          </Cartao>
          <Cartao titulo={semCarga ? 'Sessões' : 'Maior carga'}>
            <p className="numero-grande">
              {semCarga ? hist.length : fmtNum(maxCarga, 2)}
              <small>{semCarga ? '' : 'kg'}</small>
            </p>
          </Cartao>
        </div>
      )}

      {semCarga ? (
        <Cartao>
          <GraficoLinha titulo="Reps totais por sessão" unidade=" reps" casas={0} pontos={hist.map((o) => ({ x: o.sessao.data, y: totalReps(o.registro), rotulo: resumoRegistro(o.registro) }))} />
        </Cartao>
      ) : (
        <>
          <Cartao>
            <GraficoLinha titulo="Carga de trabalho" unidade="kg" pontos={hist.map((o) => ({ x: o.sessao.data, y: cargaTrabalho(o.registro), rotulo: resumoRegistro(o.registro) }))} />
          </Cartao>
          <Cartao>
            <GraficoLinha titulo="e1RM (Epley)" unidade="kg" pontos={hist.map((o) => ({ x: o.sessao.data, y: Number(melhorE1rm(o.registro).toFixed(1)), rotulo: resumoRegistro(o.registro) }))} />
          </Cartao>
        </>
      )}

      <Cartao titulo="Sessões">
        {todos.length === 0 ? (
          <Vazio>Sem registros ainda.</Vazio>
        ) : (
          <div className="tabela-rolagem">
            <table className="tabela">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Treino</th>
                  <th>Séries</th>
                  <th className="num">e1RM</th>
                </tr>
              </thead>
              <tbody>
                {[...todos].reverse().map((o) => (
                  <tr key={o.sessao.id + o.registro.exercicioId}>
                    <td>{formatarCurta(new Date(o.sessao.data))}</td>
                    <td>
                      {o.sessao.treinoId}
                      {o.sessao.deload ? ' (D)' : ''}
                    </td>
                    <td>
                      {resumoRegistro(o.registro)}
                      {o.registro.series.some((s) => !s.execucaoOk) && <span className="txt-alerta"> ✗</span>}
                      {o.registro.series.some((s) => s.rir !== undefined) && (
                        <small className="muted"> RIR {o.registro.series.map((s) => s.rir ?? '–').join('/')}</small>
                      )}
                      {o.registro.nota && <em className="nota-registro">“{o.registro.nota}”</em>}
                    </td>
                    <td className="num">{melhorE1rm(o.registro) ? fmtNum(melhorE1rm(o.registro)) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Cartao>
    </>
  );
}
