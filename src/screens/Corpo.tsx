import { useState } from 'react';
import type { Navegar } from '../App';
import { GraficoLinha } from '../components/Grafico';
import { Cabecalho, Cartao, Vazio } from '../components/ui';
import { formatarCurta, formatarLonga, hojeISO, inicioSemanaISO, rotuloSemana, semanaISO } from '../domain/datas';
import { fmtNum } from '../domain/progressao';
import { useApp } from '../store/AppContext';
import { registrarPeso } from '../store/acoes';

export function Corpo({ navegar }: { navegar: Navegar }) {
  const { estado, atualizar } = useApp();
  const [data, setData] = useState(hojeISO());
  const [peso, setPeso] = useState('');
  const semana = semanaISO(new Date());

  const pesagens = estado.pesagens.slice(-90);
  const checkins = [...estado.checkins].sort((a, b) => b.semanaISO.localeCompare(a.semanaISO));
  const avaliacoes = [...estado.avaliacoes].sort((a, b) => a.data.localeCompare(b.data));
  const cinturaPts = [...estado.checkins]
    .filter((c) => c.cinturaCm)
    .sort((a, b) => a.semanaISO.localeCompare(b.semanaISO))
    .map((c) => ({ x: inicioSemanaISO(c.semanaISO).toISOString(), y: c.cinturaCm!, rotulo: rotuloSemana(c.semanaISO) }));
  const razaoPts = avaliacoes.filter((a) => a.medidas.cintura > 0 && a.medidas.ombros > 0).map((a) => ({ x: a.data, y: Number((a.medidas.ombros / a.medidas.cintura).toFixed(3)) }));

  return (
    <>
      <Cabecalho titulo="Corpo" />
      <div className="grade-2">
        <button className="btn-primario" onClick={() => navegar(`checkin/${semana}`)}>
          {estado.checkins.some((c) => c.semanaISO === semana) ? 'Editar check-in' : 'Check-in semanal'}
        </button>
        <button className="btn-secundario" onClick={() => navegar('avaliacao')}>
          Avaliação mensal
        </button>
      </div>

      <Cartao titulo="Peso corporal (em jejum)">
        <form
          className="linha-input"
          onSubmit={(e) => {
            e.preventDefault();
            const v = Number(peso.replace(',', '.'));
            if (v > 20 && v < 400) {
              atualizar((d) => registrarPeso(d, v, data));
              setPeso('');
            }
          }}
        >
          <input type="date" className="input-data" value={data} max={hojeISO()} onChange={(e) => setData(e.target.value)} aria-label="Data da pesagem" />
          <input inputMode="decimal" placeholder="kg" value={peso} onChange={(e) => setPeso(e.target.value)} aria-label="Peso em kg" />
          <button className="btn-secundario" type="submit">
            Salvar
          </button>
        </form>
        <GraficoLinha titulo="Peso (últimos 90 registros)" unidade="kg" pontos={pesagens.map((p) => ({ x: p.data, y: p.peso }))} />
        {pesagens.length > 0 && (
          <details>
            <summary>Ver/apagar registros</summary>
            <ul className="lista compacta">
              {[...pesagens].reverse().map((p) => (
                <li key={p.data}>
                  <span>{formatarCurta(p.data)}</span>
                  <span>{fmtNum(p.peso)} kg</span>
                  <button
                    className="btn-texto perigo"
                    onClick={() =>
                      atualizar((d) => {
                        d.pesagens = d.pesagens.filter((x) => x.data !== p.data);
                      })
                    }
                  >
                    apagar
                  </button>
                </li>
              ))}
            </ul>
          </details>
        )}
      </Cartao>

      <Cartao>
        <GraficoLinha titulo="Cintura (altura do umbigo)" unidade=" cm" pontos={cinturaPts} />
      </Cartao>

      <Cartao>
        <GraficoLinha titulo="Razão ombro/cintura (V-taper)" casas={2} pontos={razaoPts} referencia={{ y: 1.6, rotulo: 'meta 1,6' }} />
        {razaoPts.length === 0 && <p className="muted pequeno">Registre ombros e cintura na avaliação mensal.</p>}
      </Cartao>

      <Cartao titulo="Check-ins">
        {checkins.length === 0 ? (
          <Vazio>Nenhum check-in ainda.</Vazio>
        ) : (
          <div className="tabela-rolagem">
            <table className="tabela">
              <thead>
                <tr>
                  <th>Semana</th>
                  <th className="num">Peso</th>
                  <th className="num">Cint.</th>
                  <th className="num">Sono</th>
                  <th className="num">Fad.</th>
                  <th className="num">Mot.</th>
                </tr>
              </thead>
              <tbody>
                {checkins.map((c) => (
                  <tr key={c.semanaISO} onClick={() => navegar(`checkin/${c.semanaISO}`)} className="clicavel">
                    <td>
                      {rotuloSemana(c.semanaISO)}
                      {c.dorArticular && <span className="txt-alerta" title={c.dorArticular}> ⚠</span>}
                    </td>
                    <td className="num">{c.pesoMedio ? fmtNum(c.pesoMedio) : '—'}</td>
                    <td className="num">{c.cinturaCm ? fmtNum(c.cinturaCm) : '—'}</td>
                    <td className="num">{c.sono}</td>
                    <td className="num">{c.fadiga}</td>
                    <td className="num">{c.motivacao}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Cartao>

      <Cartao titulo="Avaliações mensais">
        {avaliacoes.length === 0 ? (
          <Vazio>Nenhuma avaliação ainda.</Vazio>
        ) : (
          <ul className="lista compacta">
            {[...avaliacoes].reverse().map((a) => (
              <li key={a.id}>
                <span>{formatarLonga(a.data)}</span>
                <span>
                  {fmtNum(a.peso)} kg · razão {fmtNum(a.medidas.ombros / a.medidas.cintura, 2)} · {a.decisao}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Cartao>
    </>
  );
}
