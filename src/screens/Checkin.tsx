import { useState } from 'react';
import type { Navegar } from '../App';
import { Cabecalho, CampoNumero, Cartao, Escala } from '../components/ui';
import { deslocarSemana, rotuloSemana, semanaISO } from '../domain/datas';
import { mediaSemanaISO } from '../domain/nutricao';
import type { CheckinSemanal } from '../domain/types';
import { useApp } from '../store/AppContext';

export function Checkin({ navegar, semana: semanaParam }: { navegar: Navegar; semana?: string }) {
  const { estado, atualizar } = useApp();
  const atual = semanaISO(new Date());
  const [semana, setSemana] = useState(semanaParam && /^\d{4}-W\d{2}$/.test(semanaParam) ? semanaParam : atual);
  const existente = estado.checkins.find((c) => c.semanaISO === semana);
  const pesoAuto = mediaSemanaISO(estado.pesagens, semana);
  const anterior = [...estado.checkins].filter((c) => c.semanaISO < semana).sort((a, b) => b.semanaISO.localeCompare(a.semanaISO))[0];

  const [f, setF] = useState<Partial<CheckinSemanal> & { temDor: boolean }>(() => ({
    ...(existente ?? {}),
    pesoMedio: existente?.pesoMedio ?? (pesoAuto ? Number(pesoAuto.toFixed(1)) : undefined),
    temDor: !!existente?.dorArticular,
  }));

  const trocarSemana = (s: string) => {
    setSemana(s);
    const ex = estado.checkins.find((c) => c.semanaISO === s);
    const pa = mediaSemanaISO(estado.pesagens, s);
    setF({ ...(ex ?? {}), pesoMedio: ex?.pesoMedio ?? (pa ? Number(pa.toFixed(1)) : undefined), temDor: !!ex?.dorArticular });
  };

  const valido = f.sono && f.fadiga && f.motivacao;

  const salvar = () => {
    if (!valido) return;
    const c: CheckinSemanal = {
      semanaISO: semana,
      pesoMedio: f.pesoMedio ?? 0,
      ...(f.cinturaCm ? { cinturaCm: f.cinturaCm } : {}),
      sono: f.sono!,
      fadiga: f.fadiga!,
      motivacao: f.motivacao!,
      ...(f.temDor ? { dorArticular: f.dorArticular?.trim() || 'sim' } : {}),
      ...(f.comentarios?.trim() ? { comentarios: f.comentarios.trim() } : {}),
    };
    atualizar((e) => {
      e.checkins = e.checkins.filter((x) => x.semanaISO !== semana).concat(c);
    });
    navegar('inicio');
  };

  return (
    <>
      <Cabecalho titulo="Check-in semanal" voltar={() => history.back()} />
      <div className="seletor-semana">
        <button className="btn-icone" onClick={() => trocarSemana(deslocarSemana(semana, -1))} aria-label="Semana anterior">
          ‹
        </button>
        <div>
          <strong>{semana === atual ? 'Esta semana' : rotuloSemana(semana)}</strong>
          <small className="muted">{existente ? 'editando' : 'novo'}</small>
        </div>
        <button className="btn-icone" disabled={semana >= atual} onClick={() => trocarSemana(deslocarSemana(semana, 1))} aria-label="Próxima semana">
          ›
        </button>
      </div>

      <Cartao>
        <div className="grade-2">
          <CampoNumero
            rotulo={pesoAuto ? 'Peso médio (auto)' : 'Peso médio'}
            sufixo="kg"
            valor={f.pesoMedio}
            onChange={(v) => setF({ ...f, pesoMedio: v })}
          />
          <CampoNumero
            rotulo="Cintura (umbigo)"
            sufixo="cm"
            valor={f.cinturaCm}
            placeholder={anterior?.cinturaCm ? String(anterior.cinturaCm) : ''}
            onChange={(v) => setF({ ...f, cinturaCm: v })}
          />
        </div>
        <Escala rotulo="Sono" dica="1 péssimo · 10 ótimo" valor={f.sono} onChange={(n) => setF({ ...f, sono: n })} />
        <Escala rotulo="Fadiga" dica="1 descansado · 10 destruído" valor={f.fadiga} onChange={(n) => setF({ ...f, fadiga: n })} />
        <Escala rotulo="Motivação" dica="1 baixa · 10 alta" valor={f.motivacao} onChange={(n) => setF({ ...f, motivacao: n })} />
        <div className="campo">
          <label>Dor articular?</label>
          <div className="segmentado">
            <button className={!f.temDor ? 'ativo' : ''} onClick={() => setF({ ...f, temDor: false })}>
              Não
            </button>
            <button className={f.temDor ? 'ativo' : ''} onClick={() => setF({ ...f, temDor: true })}>
              Sim
            </button>
          </div>
          {f.temDor && (
            <input placeholder="Local (ex.: ombro direito)" value={f.dorArticular === 'sim' ? '' : f.dorArticular ?? ''} onChange={(e) => setF({ ...f, dorArticular: e.target.value })} />
          )}
        </div>
        <label className="campo">
          <span>Comentários</span>
          <textarea value={f.comentarios ?? ''} onChange={(e) => setF({ ...f, comentarios: e.target.value })} />
        </label>
      </Cartao>
      <button className="btn-primario btn-grande" disabled={!valido} onClick={salvar}>
        Salvar check-in
      </button>
      {!valido && <p className="muted pequeno centro">Preencha sono, fadiga e motivação.</p>}
    </>
  );
}
