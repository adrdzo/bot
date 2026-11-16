import { useState } from 'react';
import type { Navegar } from '../App';
import { Cabecalho, CampoNumero, Cartao, Selo } from '../components/ui';
import { aplicarDecisaoVolume, GRUPOS, sugestaoVolume, topEvolucao, volumeReferencia } from '../domain/analise';
import { formatarLonga, hojeISO } from '../domain/datas';
import { pesoAtual } from '../domain/nutricao';
import type { AvaliacaoMensal, DecisaoVolume, Grupo, Medidas } from '../domain/types';
import { fmtNum } from '../domain/progressao';
import { useApp } from '../store/AppContext';
import { iniciarDeload, novoId } from '../store/acoes';

const CAMPOS: { k: keyof Medidas; rotulo: string }[] = [
  { k: 'ombros', rotulo: 'Ombros' },
  { k: 'cintura', rotulo: 'Cintura' },
  { k: 'peito', rotulo: 'Peito' },
  { k: 'braco', rotulo: 'Braço' },
  { k: 'coxa', rotulo: 'Coxa' },
  { k: 'panturrilha', rotulo: 'Panturrilha' },
];

const ROTULO_DECISAO: Record<DecisaoVolume, string> = {
  manter: 'Manter volume',
  aumentar: 'Aumentar volume (+1 série/semana)',
  reduzir: 'Reduzir volume (−1 série/semana)',
  deload: 'Semana de deload',
};

type Pose = 'frente' | 'lado' | 'costas';

/** Reduz a foto para ~720px em JPEG para caber no armazenamento local. */
function comprimir(arquivo: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(arquivo);
    img.onload = () => {
      const max = 720;
      const esc = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * esc);
      c.height = Math.round(img.height * esc);
      c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL('image/jpeg', 0.72));
    };
    img.onerror = reject;
    img.src = url;
  });
}

export function Avaliacao({ navegar }: { navegar: Navegar }) {
  const { estado, atualizar } = useApp();
  const hoje = new Date();
  const ordenadas = [...estado.avaliacoes].sort((a, b) => b.data.localeCompare(a.data));
  const anterior = ordenadas[0];
  const sug = sugestaoVolume(estado, hoje);
  const top = topEvolucao(estado, hoje);

  const [peso, setPeso] = useState<number | undefined>(pesoAtual(estado));
  const [medidas, setMedidas] = useState<Partial<Medidas>>({});
  const [fotos, setFotos] = useState<Partial<Record<Pose, string>>>({});
  const [pontosFracos, setPontosFracos] = useState<string[]>([]);
  const [outroPonto, setOutroPonto] = useState('');
  const [decisao, setDecisao] = useState<DecisaoVolume>(sug.decisao);
  const [grupos, setGrupos] = useState<Grupo[]>(sug.grupos);
  const [aplicar, setAplicar] = useState(true);
  const [poseComparar, setPoseComparar] = useState<Pose>('frente');

  const razao = medidas.ombros && medidas.cintura ? medidas.ombros / medidas.cintura : undefined;
  const razaoAnt = anterior ? anterior.medidas.ombros / anterior.medidas.cintura : undefined;
  const completo = peso && CAMPOS.every((c) => (medidas[c.k] ?? 0) > 0);

  const ref = volumeReferencia(estado.treinos, estado.exercicios);
  const previa = decisao === 'aumentar' || decisao === 'reduzir' ? volumeReferencia(aplicarDecisaoVolume(estado.treinos, estado.exercicios, decisao, grupos), estado.exercicios) : undefined;

  const salvar = () => {
    if (!completo) return;
    const av: AvaliacaoMensal = {
      id: novoId(),
      data: hojeISO(),
      peso: peso!,
      medidas: medidas as Medidas,
      fotos,
      pontosFracos: [...pontosFracos, ...(outroPonto.trim() ? [outroPonto.trim()] : [])],
      decisao,
      ...(grupos.length ? { gruposDecisao: grupos } : {}),
    };
    atualizar((e) => {
      e.avaliacoes.push(av);
      if (aplicar && (decisao === 'aumentar' || decisao === 'reduzir') && grupos.length) {
        e.treinos = aplicarDecisaoVolume(e.treinos, e.exercicios, decisao, grupos);
      }
      if (aplicar && decisao === 'deload' && !e.deloadAtivo) iniciarDeload(e);
    });
    navegar('corpo');
  };

  const delta = (k: keyof Medidas) => {
    const a = anterior?.medidas[k];
    const v = medidas[k];
    if (!a || !v) return null;
    const d = v - a;
    return <small className={d === 0 ? 'muted' : k === 'cintura' ? (d < 0 ? 'txt-bom' : 'txt-alerta') : d > 0 ? 'txt-bom' : 'txt-alerta'}>{d > 0 ? '+' : ''}{d.toFixed(1)}</small>;
  };

  return (
    <>
      <Cabecalho titulo="Avaliação mensal" voltar={() => history.back()} />
      {anterior && <p className="muted subtitulo">Anterior: {formatarLonga(anterior.data)} · {fmtNum(anterior.peso)} kg</p>}

      <Cartao titulo="Peso e medidas (cm)">
        <CampoNumero rotulo="Peso" sufixo="kg" valor={peso} onChange={setPeso} />
        <div className="grade-2">
          {CAMPOS.map((c) => (
            <div key={c.k}>
              <CampoNumero
                rotulo={c.rotulo}
                sufixo="cm"
                valor={medidas[c.k]}
                placeholder={anterior ? String(anterior.medidas[c.k]) : ''}
                onChange={(v) => setMedidas({ ...medidas, [c.k]: v })}
              />
              {delta(c.k)}
            </div>
          ))}
        </div>
        <div className="destaque-razao">
          <span>Razão ombro/cintura</span>
          <strong>{razao ? fmtNum(razao, 2) : '—'}</strong>
          {razaoAnt && <small className="muted">antes {fmtNum(razaoAnt, 2)} · meta ~1,60</small>}
        </div>
      </Cartao>

      <Cartao titulo="Fotos">
        <div className="fotos">
          {(['frente', 'lado', 'costas'] as Pose[]).map((p) => (
            <label key={p} className="foto-slot">
              {fotos[p] ? <img src={fotos[p]} alt={`Foto ${p}`} /> : <span>+ {p}</span>}
              <input
                type="file"
                accept="image/*"
                capture="environment"
                hidden
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (f) setFotos({ ...fotos, [p]: await comprimir(f) });
                }}
              />
            </label>
          ))}
        </div>
        {ordenadas.some((a) => a.fotos && Object.keys(a.fotos).length) && (
          <>
            <h3>Comparar com o mês anterior</h3>
            <div className="segmentado">
              {(['frente', 'lado', 'costas'] as Pose[]).map((p) => (
                <button key={p} className={poseComparar === p ? 'ativo' : ''} onClick={() => setPoseComparar(p)}>
                  {p}
                </button>
              ))}
            </div>
            <div className="comparar">
              <figure>
                {anterior?.fotos?.[poseComparar] ? <img src={anterior.fotos[poseComparar]} alt="Mês anterior" /> : <div className="foto-vazia">sem foto</div>}
                <figcaption>{anterior ? formatarLonga(anterior.data) : '—'}</figcaption>
              </figure>
              <figure>
                {fotos[poseComparar] ? <img src={fotos[poseComparar]} alt="Hoje" /> : <div className="foto-vazia">tire a foto acima</div>}
                <figcaption>Hoje</figcaption>
              </figure>
            </div>
          </>
        )}
      </Cartao>

      <Cartao titulo="Top 5 exercícios que mais evoluíram (e1RM, ~4 semanas)">
        {top.length ? (
          <ol className="lista">
            {top.map((t) => (
              <li key={t.exercicioId}>
                <strong>{estado.exercicios[t.exercicioId]?.nome}</strong>{' '}
                <span className="muted">
                  {fmtNum(t.de)} → {fmtNum(t.para)} kg
                </span>{' '}
                <Selo tipo="bom">+{fmtNum(t.pct)}%</Selo>
              </li>
            ))}
          </ol>
        ) : (
          <p className="muted">Ainda sem evolução mensurável. Treine algumas semanas e volte aqui.</p>
        )}
      </Cartao>

      <Cartao titulo="Pontos fracos">
        <div className="chips">
          {GRUPOS.map((g) => (
            <button key={g} className={`chip ${pontosFracos.includes(g) ? 'ativo' : ''}`} aria-pressed={pontosFracos.includes(g)} onClick={() => setPontosFracos(pontosFracos.includes(g) ? pontosFracos.filter((x) => x !== g) : [...pontosFracos, g])}>
              {g}
            </button>
          ))}
        </div>
        <input placeholder="Outro (texto livre)" value={outroPonto} onChange={(e) => setOutroPonto(e.target.value)} />
      </Cartao>

      <Cartao titulo="Decisão de volume">
        <div className={`sugestao sugestao-${sug.decisao}`}>
          <span className="muted pequeno">Sugestão do app</span>
          <strong>{ROTULO_DECISAO[sug.decisao]}{sug.grupos.length ? `: ${sug.grupos.join(', ')}` : ''}</strong>
          <ul>
            {sug.motivos.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
        </div>
        <div className="opcoes">
          {(Object.keys(ROTULO_DECISAO) as DecisaoVolume[]).map((d) => (
            <label key={d} className="opcao">
              <input type="radio" name="decisao" checked={decisao === d} onChange={() => setDecisao(d)} />
              {ROTULO_DECISAO[d]}
            </label>
          ))}
        </div>
        {(decisao === 'aumentar' || decisao === 'reduzir') && (
          <>
            <p className="muted pequeno">Músculos afetados:</p>
            <div className="chips">
              {GRUPOS.filter((g) => ref[g]).map((g) => (
                <button key={g} className={`chip ${grupos.includes(g) ? 'ativo' : ''}`} aria-pressed={grupos.includes(g)} onClick={() => setGrupos(grupos.includes(g) ? grupos.filter((x) => x !== g) : [...grupos, g])}>
                  {g}
                </button>
              ))}
            </div>
            {previa && grupos.length > 0 && (
              <ul className="lista compacta">
                {grupos.map((g) => (
                  <li key={g}>
                    <span>{g}</span>
                    <span>
                      {ref[g]} → <strong>{previa[g]}</strong> séries/semana
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
        {decisao !== 'manter' && (
          <label className="opcao">
            <input type="checkbox" checked={aplicar} onChange={(e) => setAplicar(e.target.checked)} />
            {decisao === 'deload' ? 'Iniciar a semana de deload agora' : 'Aplicar a mudança ao programa'}
          </label>
        )}
      </Cartao>

      <button className="btn-primario btn-grande" disabled={!completo} onClick={salvar}>
        Confirmar avaliação
      </button>
      {!completo && <p className="muted pequeno centro">Preencha o peso e as 6 medidas.</p>}
    </>
  );
}
