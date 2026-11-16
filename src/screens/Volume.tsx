import { useState } from 'react';
import type { Navegar } from '../App';
import { Cabecalho, Cartao, Selo } from '../components/ui';
import { classificarVolume, GRUPOS, sessoesDaSemana, volumeReferencia, volumeSemana } from '../domain/analise';
import { deslocarSemana, rotuloSemana, semanaISO } from '../domain/datas';
import { useApp } from '../store/AppContext';

const ROTULO = { abaixo: 'abaixo', dentro: 'dentro', acima: 'acima' } as const;
const SELO = { abaixo: 'alerta', dentro: 'bom', acima: 'ruim' } as const;

export function Volume(_: { navegar: Navegar }) {
  const { estado } = useApp();
  const atual = semanaISO(new Date());
  const [semana, setSemana] = useState(atual);
  const ref = volumeReferencia(estado.treinos, estado.exercicios);
  const feito = volumeSemana(estado, semana);
  const fator = estado.usuario.diasPorSemana / 4;
  const nSessoes = sessoesDaSemana(estado.sessoes, semana).length;
  const grupos = GRUPOS.filter((g) => (ref[g] ?? 0) > 0 || (feito[g] ?? 0) > 0);
  const totalFeito = grupos.reduce((t, g) => t + (feito[g] ?? 0), 0);
  const totalAlvo = grupos.reduce((t, g) => t + Math.round((ref[g] ?? 0) * fator), 0);

  return (
    <>
      <Cabecalho titulo="Volume semanal" />
      <div className="seletor-semana">
        <button className="btn-icone" onClick={() => setSemana(deslocarSemana(semana, -1))} aria-label="Semana anterior">
          ‹
        </button>
        <div>
          <strong>{semana === atual ? 'Esta semana' : rotuloSemana(semana)}</strong>
          <small className="muted">
            {nSessoes} treino(s) · {totalFeito}/{totalAlvo} séries
          </small>
        </div>
        <button className="btn-icone" disabled={semana >= atual} onClick={() => setSemana(deslocarSemana(semana, 1))} aria-label="Próxima semana">
          ›
        </button>
      </div>

      <Cartao>
        <p className="muted pequeno">
          Séries diretas por músculo × planejado para {estado.usuario.diasPorSemana} dias/semana
          {fator < 1 ? ' (≈75% da referência de 4 dias)' : ''}. Marcas: planejado.
        </p>
        <div className="volume-lista">
          {grupos.map((g) => {
            const alvo = Math.round((ref[g] ?? 0) * fator);
            const f = feito[g] ?? 0;
            const faixa = classificarVolume(f, alvo);
            const escala = Math.max(alvo * 1.4, f, 1);
            return (
              <div key={g} className="volume-item">
                <div className="volume-rotulo">
                  <span>
                    {g}
                    {estado.usuario.gruposPrioritarios.includes(g) && <span title="prioritário"> ★</span>}
                  </span>
                  <span>
                    <strong>{f}</strong>
                    <span className="muted">/{alvo}</span>
                  </span>
                </div>
                <div className="volume-barra" role="img" aria-label={`${g}: ${f} de ${alvo} séries (${ROTULO[faixa]})`}>
                  <div className={`volume-preenchido v-${faixa}`} style={{ width: `${(f / escala) * 100}%` }} />
                  <div className="volume-alvo" style={{ left: `${(alvo / escala) * 100}%` }} />
                </div>
                {semana < atual || nSessoes >= estado.usuario.diasPorSemana ? (
                  <Selo tipo={SELO[faixa]}>{ROTULO[faixa]}</Selo>
                ) : null}
              </div>
            );
          })}
        </div>
      </Cartao>

      <Cartao titulo="Referência do programa (4 dias)">
        <table className="tabela">
          <tbody>
            {grupos.map((g) => (
              <tr key={g}>
                <td>{g}</td>
                <td className="num">{ref[g] ?? 0} séries</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Cartao>
    </>
  );
}
