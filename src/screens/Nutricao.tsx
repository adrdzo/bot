import type { Navegar } from '../App';
import { Cabecalho, Cartao, Vazio } from '../components/ui';
import { formatarLonga, hojeISO, somarDias } from '../domain/datas';
import { calcularMetas, mediaPeso, pesoAtual, ROTULO_ATIVIDADE, ROTULO_MODO, sugerirAjuste } from '../domain/nutricao';
import type { ModoNutricao, NivelAtividade } from '../domain/types';
import { useApp } from '../store/AppContext';

const n0 = (n: number) => Math.round(n).toLocaleString('pt-BR');

export function Nutricao({ navegar }: { navegar: Navegar }) {
  const { estado, atualizar } = useApp();
  const u = estado.usuario;
  const hoje = new Date();
  const media7 = mediaPeso(estado.pesagens, somarDias(hoje, -6), hoje).media;
  const peso = media7 ?? pesoAtual(estado);
  const ajusteAcumulado = estado.ajustesNutricao.reduce((t, a) => t + a.deltaKcal, 0);
  const sug = sugerirAjuste(estado, hoje);

  const metas = peso ? calcularMetas(u, peso, ajusteAcumulado) : undefined;

  const registrarAjuste = (delta: number, motivo: string) =>
    atualizar((e) => {
      e.ajustesNutricao.push({ data: hojeISO(), deltaKcal: delta, motivo });
    });

  return (
    <>
      <Cabecalho titulo="Nutrição" />

      <Cartao titulo="Modo">
        <div className="segmentado">
          {(Object.keys(ROTULO_MODO) as ModoNutricao[]).map((m) => (
            <button key={m} className={u.modoNutricao === m ? 'ativo' : ''} onClick={() => atualizar((e) => void (e.usuario.modoNutricao = m))}>
              {ROTULO_MODO[m]}
            </button>
          ))}
        </div>
        <label className="campo">
          <span>Nível de atividade</span>
          <select value={u.nivelAtividade} onChange={(ev) => atualizar((e) => void (e.usuario.nivelAtividade = ev.target.value as NivelAtividade))}>
            {(Object.keys(ROTULO_ATIVIDADE) as NivelAtividade[]).map((k) => (
              <option key={k} value={k}>
                {ROTULO_ATIVIDADE[k]}
              </option>
            ))}
          </select>
        </label>
        <label className="opcao">
          <input type="checkbox" checked={u.priorizarCintura} onChange={(ev) => atualizar((e) => void (e.usuario.priorizarCintura = ev.target.checked))} />
          Modo cintura: a medida da cintura pesa mais que o peso no ajuste
        </label>
        <p className="muted pequeno">
          {u.sexo === 'M' ? 'Homem' : 'Mulher'}, {u.idade} anos, {u.altura} cm ·{' '}
          <a href="#/config" onClick={(e) => (e.preventDefault(), navegar('config'))}>
            editar dados
          </a>
        </p>
      </Cartao>

      {!metas ? (
        <Cartao>
          <Vazio>Registre seu peso (na tela Início ou Corpo) para calcular as metas.</Vazio>
        </Cartao>
      ) : (
        <>
          <Cartao titulo="Metas diárias">
            <p className="numero-grande centro">
              {n0(metas.kcal)}
              <small>kcal</small>
            </p>
            <div className="macros">
              {[
                { rotulo: 'Proteína', g: metas.proteina, kcal: metas.proteina * 4, cls: 'm-prot' },
                { rotulo: 'Carboidrato', g: metas.carbo, kcal: metas.carbo * 4, cls: 'm-carb' },
                { rotulo: 'Gordura', g: metas.gordura, kcal: metas.gordura * 9, cls: 'm-gord' },
              ].map((m) => (
                <div key={m.rotulo} className="macro">
                  <span className="muted pequeno">{m.rotulo}</span>
                  <strong>{n0(m.g)} g</strong>
                  <div className="progresso">
                    <div className={m.cls} style={{ width: `${Math.min(100, (m.kcal / metas.kcal) * 100)}%` }} />
                  </div>
                  <small className="muted">{n0((m.kcal / metas.kcal) * 100)}% das kcal</small>
                </div>
              ))}
            </div>
            <div className="linha-info">
              <span>Peso usado</span>
              <strong>{peso!.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} kg {media7 ? '(média 7 dias)' : ''}</strong>
            </div>
            <div className="linha-info">
              <span>TMB (Mifflin-St Jeor)</span>
              <strong>{n0(metas.tmb)} kcal</strong>
            </div>
            <div className="linha-info">
              <span>Manutenção (TDEE)</span>
              <strong>{n0(metas.tdee)} kcal</strong>
            </div>
            {ajusteAcumulado !== 0 && (
              <div className="linha-info">
                <span>Ajustes acumulados</span>
                <strong>
                  {ajusteAcumulado > 0 ? '+' : ''}
                  {ajusteAcumulado} kcal
                </strong>
              </div>
            )}
            <div className="linha-info">
              <span>Meta do modo</span>
              <strong>{metas.meta}</strong>
            </div>
          </Cartao>

          <Cartao titulo="Ajuste quinzenal">
            {!sug ? (
              <p className="muted">São necessárias ao menos 3 pesagens em cada uma das últimas 2 semanas para sugerir um ajuste.</p>
            ) : !sug.disponivel ? (
              <p className="muted">
                Último ajuste há menos de 2 semanas. Próxima avaliação em {sug.diasParaProximo} dia(s). Tendência atual: {sug.taxaSemanalPct.toFixed(2)}%/sem.
              </p>
            ) : (
              <div className={`sugestao ${sug.deltaKcal === 0 ? 'sugestao-manter' : 'sugestao-aumentar'}`}>
                <strong>
                  {sug.deltaKcal === 0 ? 'Manter as calorias' : `${sug.deltaKcal > 0 ? '+' : ''}${sug.deltaKcal} kcal/dia`}
                </strong>
                <p>{sug.motivo}</p>
                <div className="grade-2">
                  <button className="btn-primario" onClick={() => registrarAjuste(sug.deltaKcal, sug.motivo)}>
                    {sug.deltaKcal === 0 ? 'OK, manter' : 'Aplicar ajuste'}
                  </button>
                  {sug.deltaKcal !== 0 && (
                    <button className="btn-secundario" onClick={() => registrarAjuste(0, `Ignorado: ${sug.motivo}`)}>
                      Ignorar
                    </button>
                  )}
                </div>
              </div>
            )}
          </Cartao>
        </>
      )}

      {estado.ajustesNutricao.length > 0 && (
        <Cartao titulo="Histórico de ajustes">
          <ul className="lista compacta">
            {[...estado.ajustesNutricao].reverse().map((a, i) => (
              <li key={i}>
                <span>{formatarLonga(a.data)}</span>
                <span>
                  <strong>
                    {a.deltaKcal > 0 ? '+' : ''}
                    {a.deltaKcal} kcal
                  </strong>{' '}
                  <small className="muted">{a.motivo}</small>
                </span>
              </li>
            ))}
          </ul>
          <button className="btn-texto perigo" onClick={() => confirm('Zerar todos os ajustes calóricos?') && atualizar((e) => void (e.ajustesNutricao = []))}>
            Zerar ajustes
          </button>
        </Cartao>
      )}
    </>
  );
}
