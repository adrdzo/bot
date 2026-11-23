import { useState } from 'react';
import type { Navegar } from '../App';
import { Cabecalho, Cartao, Selo } from '../components/ui';
import { gatilhoDeload, prontosParaSubir, semanasDesdeDeload, sessoesDaSemana } from '../domain/analise';
import { dataLocal, deslocarSemana, diasEntre, formatarDiaSemana, paraData, semanaISO } from '../domain/datas';
import { mediaSemanaISO, sugerirAjuste } from '../domain/nutricao';
import { nSeriesDeload } from '../domain/progressao';
import { useApp } from '../store/AppContext';
import { encerrarDeload, iniciarDeload, iniciarSessao, registrarPeso } from '../store/acoes';

function Tendencia({ delta, unidade, inverter = false }: { delta?: number; unidade: string; inverter?: boolean }) {
  if (delta === undefined || Math.abs(delta) < 0.05) return <span className="muted">estável</span>;
  const desce = delta < 0;
  const bom = inverter ? desce : !desce;
  return (
    <span className={bom ? 'txt-bom' : 'txt-alerta'}>
      {desce ? '▼' : '▲'} {Math.abs(delta).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}
      {unidade} vs. semana anterior
    </span>
  );
}

export function Inicio({ navegar }: { navegar: Navegar }) {
  const { estado, atualizar } = useApp();
  const [peso, setPeso] = useState('');
  const hoje = new Date();
  const u = estado.usuario;
  const semana = semanaISO(hoje);
  const treino = estado.treinos[u.proximoTreino];
  const daSemana = sessoesDaSemana(estado.sessoes, semana);
  const deload = gatilhoDeload(estado, hoje);
  const prontos = prontosParaSubir(estado);
  const ajuste = sugerirAjuste(estado, hoje);

  const pesoSem = mediaSemanaISO(estado.pesagens, semana);
  const pesoAnt = mediaSemanaISO(estado.pesagens, deslocarSemana(semana, -1));
  const pesoHoje = estado.pesagens.find((p) => p.data === dataLocal(hoje));

  const cinturas = [...estado.checkins].filter((c) => c.cinturaCm).sort((a, b) => a.semanaISO.localeCompare(b.semanaISO));
  const cint = cinturas[cinturas.length - 1];
  const cintAnt = cinturas[cinturas.length - 2];

  const checkinFeito = estado.checkins.some((c) => c.semanaISO === semana);
  const checkinAnteriorFeito = estado.checkins.some((c) => c.semanaISO === deslocarSemana(semana, -1));
  const treinouSemanaPassada = sessoesDaSemana(estado.sessoes, deslocarSemana(semana, -1)).length > 0;
  const fimDeSemana = hoje.getDay() === 0 || hoje.getDay() === 6;

  const ultimaAv = [...estado.avaliacoes].sort((a, b) => b.data.localeCompare(a.data))[0];
  const primeira = [...estado.sessoes].sort((a, b) => a.data.localeCompare(b.data))[0];
  const refAv = ultimaAv?.data ?? primeira?.data;
  const avaliacaoDevida = refAv ? diasEntre(paraData(refAv), hoje) >= 28 : false;

  const semanasDeload = semanasDesdeDeload(estado, hoje);
  const diasDeloadRest = estado.deloadAtivo ? 7 - diasEntre(paraData(estado.deloadAtivo.inicio), hoje) : 0;

  const comecar = () => {
    if (!estado.sessaoAtiva) atualizar((e) => iniciarSessao(e));
    navegar('sessao');
  };

  const totalSeries = treino.itens.reduce((t, i) => t + (estado.deloadAtivo ? nSeriesDeload(i.series) : i.series), 0);

  return (
    <>
      <Cabecalho
        titulo={u.nome ? `Bora, ${u.nome}` : 'Projeto Dragão'}
        acao={
          <button className="btn-icone" onClick={() => navegar('config')} aria-label="Configurações">
            ⚙
          </button>
        }
      />
      <p className="data-hoje">{formatarDiaSemana(hoje)}</p>

      {estado.deloadAtivo && (
        <div className="faixa faixa-deload">
          <div>
            <strong>Semana de deload ativa</strong>
            <p>Metade das séries, mesmas cargas, 3–4 RIR. Termina em {Math.max(1, diasDeloadRest)} dia(s).</p>
          </div>
          <button className="btn-texto" onClick={() => atualizar(encerrarDeload)}>
            Encerrar
          </button>
        </div>
      )}

      <section className="hero">
        <div className="hero-topo">
          <span className="hero-rotulo">Próximo treino da fila</span>
          <span className="hero-semana">
            {daSemana.length}/{u.diasPorSemana} na semana
          </span>
        </div>
        <h2 className="hero-treino">{treino.id}</h2>
        <p className="hero-nome">{treino.nome}</p>
        <p className="muted">
          {treino.itens.length} exercícios · {totalSeries} séries{estado.deloadAtivo ? ' (deload)' : ''}
        </p>
        <button className="btn-primario btn-grande" onClick={comecar}>
          {estado.sessaoAtiva ? `Continuar ${estado.sessaoAtiva.treinoId}` : `Começar ${treino.id}`}
        </button>
        <div className="fila" aria-label="Fila de treinos">
          {(['SUP1', 'INF1', 'SUP2', 'INF2'] as const).map((t) => (
            <span key={t} className={`fila-item ${t === u.proximoTreino ? 'atual' : ''} ${daSemana.some((s) => s.treinoId === t) ? 'feito' : ''}`}>
              {t}
            </span>
          ))}
        </div>
      </section>

      {/* Alertas */}
      <div className="alertas">
        {deload.ativo && (
          <div className="alerta alerta-ruim">
            <div>
              <strong>⚠ Deload sugerido</strong>
              <ul>
                {deload.motivos.map((m) => (
                  <li key={m}>{m}</li>
                ))}
              </ul>
            </div>
            <button className="btn-secundario" onClick={() => atualizar(iniciarDeload)}>
              Iniciar semana de deload
            </button>
          </div>
        )}
        {prontos.length > 0 && (
          <button className="alerta alerta-bom" onClick={() => navegar('historico')}>
            <strong>
              ▲ {prontos.length} {prontos.length === 1 ? 'exercício pronto' : 'exercícios prontos'} para subir carga
            </strong>
            <span className="muted">{prontos.map((p) => estado.exercicios[p.exercicioId]?.nome).join(', ')}</span>
          </button>
        )}
        {!checkinFeito && (fimDeSemana || (!checkinAnteriorFeito && treinouSemanaPassada)) && (
          <button className="alerta alerta-alerta" onClick={() => navegar(`checkin/${fimDeSemana || checkinAnteriorFeito ? semana : deslocarSemana(semana, -1)}`)}>
            <strong>■ Faça o check-in semanal</strong>
            <span className="muted">Menos de 30 segundos: cintura, sono, fadiga, motivação.</span>
          </button>
        )}
        {avaliacaoDevida && (
          <button className="alerta alerta-alerta" onClick={() => navegar('avaliacao')}>
            <strong>■ Hora da avaliação mensal</strong>
            <span className="muted">Medidas, fotos e decisão de volume.</span>
          </button>
        )}
        {ajuste?.disponivel && ajuste.deltaKcal !== 0 && (
          <button className="alerta alerta-alerta" onClick={() => navegar('nutricao')}>
            <strong>
              ■ Ajuste calórico sugerido: {ajuste.deltaKcal > 0 ? '+' : ''}
              {ajuste.deltaKcal} kcal
            </strong>
            <span className="muted">{ajuste.motivo}</span>
          </button>
        )}
      </div>

      <div className="grade-2">
        <Cartao titulo="Peso médio (semana)">
          <p className="numero-grande">
            {pesoSem !== undefined ? pesoSem.toLocaleString('pt-BR', { maximumFractionDigits: 1 }) : '—'}
            <small>kg</small>
          </p>
          <Tendencia delta={pesoSem !== undefined && pesoAnt !== undefined ? pesoSem - pesoAnt : undefined} unidade="kg" inverter={u.modoNutricao !== 'ganho'} />
          {pesoHoje ? (
            <p className="muted pequeno">Hoje: {pesoHoje.peso.toLocaleString('pt-BR')} kg ✓</p>
          ) : (
            <form
              className="linha-input"
              onSubmit={(ev) => {
                ev.preventDefault();
                const v = Number(peso.replace(',', '.'));
                if (v > 20 && v < 400) {
                  atualizar((e) => registrarPeso(e, v));
                  setPeso('');
                }
              }}
            >
              <input inputMode="decimal" placeholder="Peso hoje" value={peso} onChange={(e) => setPeso(e.target.value)} aria-label="Peso de hoje em kg" />
              <button className="btn-secundario" type="submit">
                OK
              </button>
            </form>
          )}
        </Cartao>
        <Cartao titulo="Cintura">
          <p className="numero-grande">
            {cint?.cinturaCm?.toLocaleString('pt-BR') ?? '—'}
            <small>cm</small>
          </p>
          {cint && cintAnt ? (
            <Tendencia delta={(cint.cinturaCm ?? 0) - (cintAnt.cinturaCm ?? 0)} unidade="cm" inverter />
          ) : (
            <span className="muted">registre no check-in</span>
          )}
        </Cartao>
      </div>

      <Cartao titulo="Ciclo">
        <div className="linha-info">
          <span>Semanas desde o último deload</span>
          <strong>{semanasDeload ?? '—'} / 10</strong>
        </div>
        <div className="progresso">
          <div style={{ width: `${Math.min(100, ((semanasDeload ?? 0) / 10) * 100)}%` }} />
        </div>
        <div className="linha-info">
          <span>Sessões registradas</span>
          <strong>{estado.sessoes.length}</strong>
        </div>
        {!deload.ativo && !estado.deloadAtivo && (
          <button className="btn-texto" onClick={() => confirm('Iniciar uma semana de deload agora?') && atualizar(iniciarDeload)}>
            Iniciar deload manualmente
          </button>
        )}
      </Cartao>

      {daSemana.length > 0 && (
        <Cartao titulo="Nesta semana">
          {daSemana.map((s) => (
            <div key={s.id} className="linha-info">
              <span>
                <Selo tipo={s.deload ? 'neutro' : 'bom'}>{s.treinoId}</Selo> {formatarDiaSemana(new Date(s.data))}
              </span>
              <span className="muted">{s.registros.reduce((t, r) => t + r.series.length, 0)} séries · {s.duracaoMin ?? '?'} min</span>
            </div>
          ))}
        </Cartao>
      )}
    </>
  );
}
