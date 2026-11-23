import { useRef, useState } from 'react';
import type { Navegar } from '../App';
import { Cabecalho, CampoNumero, Cartao } from '../components/ui';
import { GRUPOS } from '../domain/analise';
import { hojeISO } from '../domain/datas';
import { estadoInicial, ROTACAO, TREINOS_PADRAO } from '../domain/programa';
import type { Equipamento, Exercicio, Grupo, TipoExercicio, TreinoId } from '../domain/types';
import { pedirPermissao } from '../notificacoes';
import { useApp } from '../store/AppContext';
import { migrar } from '../store/persistencia';

const DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

/** "1; 1,25; 2.5" → [1, 1.25, 2.5] (separador: ";" ou espaço). */
const listaNum = (s: string) =>
  s
    .split(/[;\s]+/)
    .map((x) => Number(x.replace(',', '.')))
    .filter((n) => n > 0);

function baixar(nome: string, conteudo: string, tipo: string) {
  const blob = new Blob([conteudo], { type: tipo });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nome;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function Configuracoes({ navegar }: { navegar: Navegar }) {
  const { estado, atualizar, substituir } = useApp();
  const u = estado.usuario;
  const arquivo = useRef<HTMLInputElement>(null);
  const [anilhas, setAnilhas] = useState(u.anilhasDisponiveis.join('; '));
  const [halteres, setHalteres] = useState(u.halteresDisponiveis.join('; '));
  const set = (fn: (us: typeof u) => void) => atualizar((e) => fn(e.usuario));

  const exportarCSV = () => {
    const linhas = [['data', 'treino', 'deload', 'exercicio', 'serie', 'carga_kg', 'reps', 'rir', 'execucao_ok', 'nota'].join(',')];
    for (const s of estado.sessoes) {
      for (const r of s.registros) {
        for (const x of r.series) {
          linhas.push(
            [s.data, s.treinoId, s.deload, `"${estado.exercicios[r.exercicioId]?.nome ?? r.exercicioId}"`, x.numero, x.carga, x.reps, x.rir ?? '', x.execucaoOk, `"${(r.nota ?? '').replace(/"/g, '""')}"`].join(','),
          );
        }
      }
    }
    baixar(`projeto-dragao-series-${hojeISO()}.csv`, linhas.join('\n'), 'text/csv');
  };

  return (
    <>
      <Cabecalho titulo="Configurações" voltar={() => navegar('inicio')} />

      <Cartao titulo="Seus dados">
        <label className="campo">
          <span>Nome</span>
          <input value={u.nome} onChange={(e) => set((x) => void (x.nome = e.target.value))} />
        </label>
        <div className="grade-2">
          <CampoNumero rotulo="Altura" sufixo="cm" passo={1} valor={u.altura} onChange={(v) => set((x) => void (x.altura = v ?? 0))} />
          <CampoNumero rotulo="Idade" sufixo="anos" passo={1} valor={u.idade} onChange={(v) => set((x) => void (x.idade = v ?? 0))} />
          <label className="campo">
            <span>Sexo</span>
            <select value={u.sexo} onChange={(e) => set((x) => void (x.sexo = e.target.value as 'M' | 'F'))}>
              <option value="M">Masculino</option>
              <option value="F">Feminino</option>
            </select>
          </label>
          <CampoNumero rotulo="% gordura (opcional)" sufixo="%" valor={u.gorduraPct} onChange={(v) => set((x) => void (x.gorduraPct = v))} />
        </div>
      </Cartao>

      <Cartao titulo="Rotina">
        <div className="campo">
          <label>Treinos por semana</label>
          <div className="segmentado">
            {([3, 4] as const).map((n) => (
              <button key={n} className={u.diasPorSemana === n ? 'ativo' : ''} onClick={() => set((x) => void (x.diasPorSemana = n))}>
                {n} dias
              </button>
            ))}
          </div>
        </div>
        <div className="campo">
          <label>Dias de treino (para o lembrete)</label>
          <div className="chips">
            {DIAS.map((d, i) => (
              <button
                key={d}
                className={`chip ${u.diasTreino.includes(i) ? 'ativo' : ''}`}
                aria-pressed={u.diasTreino.includes(i)}
                onClick={() => set((x) => void (x.diasTreino = x.diasTreino.includes(i) ? x.diasTreino.filter((k) => k !== i) : [...x.diasTreino, i].sort()))}
              >
                {d}
              </button>
            ))}
          </div>
        </div>
        <label className="campo">
          <span>Próximo treino da fila</span>
          <select value={u.proximoTreino} onChange={(e) => set((x) => void (x.proximoTreino = e.target.value as TreinoId))}>
            {ROTACAO.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </label>
        <div className="grade-2">
          <CampoNumero rotulo="Descanso compostos" sufixo="s" passo={15} valor={u.descansoCompostoSeg} onChange={(v) => set((x) => void (x.descansoCompostoSeg = v ?? 150))} />
          <CampoNumero rotulo="Descanso isolados" sufixo="s" passo={15} valor={u.descansoIsoladoSeg} onChange={(v) => set((x) => void (x.descansoIsoladoSeg = v ?? 75))} />
        </div>
        <div className="campo">
          <label>Músculos prioritários (decisão de volume)</label>
          <div className="chips">
            {GRUPOS.map((g) => (
              <button
                key={g}
                className={`chip ${u.gruposPrioritarios.includes(g) ? 'ativo' : ''}`}
                aria-pressed={u.gruposPrioritarios.includes(g)}
                onClick={() => set((x) => void (x.gruposPrioritarios = x.gruposPrioritarios.includes(g) ? x.gruposPrioritarios.filter((k) => k !== g) : [...x.gruposPrioritarios, g]))}
              >
                {g}
              </button>
            ))}
          </div>
        </div>
      </Cartao>

      <Cartao titulo="Anilhas e halteres">
        <label className="campo">
          <span>Anilhas / incrementos disponíveis (kg)</span>
          <input
            value={anilhas}
            onChange={(e) => setAnilhas(e.target.value)}
            onBlur={() => {
              const l = listaNum(anilhas);
              set((x) => void (x.anilhasDisponiveis = l));
              setAnilhas(l.join('; '));
            }}
            placeholder="1; 1,25; 2,5; 5; 10; 20"
          />
          <small className="muted">A menor anilha define o arredondamento das cargas (barra, máquina, cabo). Separe com “;”.</small>
        </label>
        <label className="campo">
          <span>Halteres disponíveis (kg)</span>
          <input
            value={halteres}
            onChange={(e) => setHalteres(e.target.value)}
            onBlur={() => {
              const l = listaNum(halteres).sort((a, b) => a - b);
              set((x) => void (x.halteresDisponiveis = l));
              setHalteres(l.join('; '));
            }}
            placeholder="ex.: 10; 12; 14; 16; 18; 20; 22,5"
          />
          <small className="muted">Vazio = arredondar halteres como anilhas.</small>
        </label>
      </Cartao>

      <Cartao titulo="Treinos">
        {ROTACAO.map((t) => (
          <button key={t} className="linha-lista" onClick={() => navegar(`config/${t}`)}>
            <span>
              <strong>{t}</strong>
              <small className="muted">
                {estado.treinos[t].itens.length} exercícios · {estado.treinos[t].itens.reduce((s, i) => s + i.series, 0)} séries
              </small>
            </span>
            <span aria-hidden>›</span>
          </button>
        ))}
      </Cartao>

      <Cartao titulo="Notificações">
        <label className="opcao">
          <input
            type="checkbox"
            checked={u.notificacoes}
            onChange={async (e) => {
              const quer = e.target.checked;
              const ok = quer ? await pedirPermissao() : false;
              if (quer && !ok) alert('Permissão de notificação negada pelo navegador.');
              set((x) => void (x.notificacoes = quer && ok));
            }}
          />
          Lembretes (dia de treino, check-in de domingo, avaliação mensal, deload)
        </label>
        <label className="opcao">
          <input type="checkbox" checked={u.lembretePesagem} onChange={(e) => set((x) => void (x.lembretePesagem = e.target.checked))} />
          Lembrete de pesagem diária (manhã)
        </label>
        <p className="muted pequeno">Os lembretes aparecem quando o app está instalado e é aberto (ou fica em segundo plano). Não há servidor de push.</p>
      </Cartao>

      <Cartao titulo="Dados">
        <div className="grade-2">
          <button className="btn-secundario" onClick={() => baixar(`projeto-dragao-${hojeISO()}.json`, JSON.stringify(estado, null, 2), 'application/json')}>
            Exportar JSON
          </button>
          <button className="btn-secundario" onClick={exportarCSV}>
            Exportar CSV (séries)
          </button>
          <button className="btn-secundario" onClick={() => arquivo.current?.click()}>
            Importar JSON
          </button>
          <button
            className="btn-secundario perigo"
            onClick={() => {
              if (confirm('Apagar TODOS os dados e voltar ao início? Exporte um backup antes.') && confirm('Tem certeza?')) substituir(estadoInicial());
            }}
          >
            Apagar tudo
          </button>
        </div>
        <input
          ref={arquivo}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            try {
              const dados = JSON.parse(await f.text());
              if (!dados || typeof dados !== 'object' || !('usuario' in dados)) throw new Error('formato');
              if (confirm('Substituir todos os dados atuais pelo backup?')) substituir(migrar(dados));
            } catch {
              alert('Arquivo inválido.');
            }
            e.target.value = '';
          }}
        />
        <p className="muted pequeno">
          {estado.sessoes.length} sessões · {estado.pesagens.length} pesagens · {estado.checkins.length} check-ins · {estado.avaliacoes.length} avaliações
        </p>
      </Cartao>
      <p className="muted pequeno centro">Projeto Dragão · dados salvos só neste aparelho</p>
    </>
  );
}

const TIPOS: TipoExercicio[] = ['composto', 'isolado', 'core'];
const EQUIP: Record<Equipamento, string> = { barra: 'Barra', halter: 'Halter', maquina: 'Máquina', cabo: 'Cabo', peso_corporal: 'Peso corporal' };

export function EditarTreino({ id, navegar }: { id: string; navegar: Navegar }) {
  const { estado, atualizar } = useApp();
  const [novo, setNovo] = useState<Partial<Exercicio> | null>(null);
  const [adicionar, setAdicionar] = useState('');
  const tid = id as TreinoId;
  const treino = estado.treinos[tid];
  if (!treino) return null;
  const itens = [...treino.itens].sort((a, b) => a.ordem - b.ordem);

  const mexer = (fn: (t: typeof treino) => void) =>
    atualizar((e) => {
      fn(e.treinos[tid]);
      e.treinos[tid].itens.sort((a, b) => a.ordem - b.ordem).forEach((it, i) => (it.ordem = i + 1));
    });

  const catalogo = Object.values(estado.exercicios).sort((a, b) => a.nome.localeCompare(b.nome));

  return (
    <>
      <Cabecalho titulo={`Editar ${tid}`} voltar={() => navegar('config')} />
      <Cartao>
        <label className="campo">
          <span>Nome do treino</span>
          <input value={treino.nome} onChange={(e) => mexer((t) => void (t.nome = e.target.value))} />
        </label>
      </Cartao>

      {itens.map((it, i) => {
        const ex = estado.exercicios[it.exercicioId];
        return (
          <Cartao key={it.exercicioId + i} className="editar-item">
            <div className="cartao-topo">
              <h2>
                {i + 1}. {ex?.nome ?? it.exercicioId}
              </h2>
              <div className="botoes-ordem">
                <button className="btn-icone" disabled={i === 0} aria-label="Subir" onClick={() => mexer((t) => {
                  const a = t.itens.find((x) => x.exercicioId === itens[i - 1].exercicioId)!;
                  const b = t.itens.find((x) => x.exercicioId === it.exercicioId)!;
                  [a.ordem, b.ordem] = [b.ordem, a.ordem];
                })}>
                  ↑
                </button>
                <button className="btn-icone" disabled={i === itens.length - 1} aria-label="Descer" onClick={() => mexer((t) => {
                  const a = t.itens.find((x) => x.exercicioId === itens[i + 1].exercicioId)!;
                  const b = t.itens.find((x) => x.exercicioId === it.exercicioId)!;
                  [a.ordem, b.ordem] = [b.ordem, a.ordem];
                })}>
                  ↓
                </button>
                <button
                  className="btn-icone perigo"
                  aria-label="Remover"
                  onClick={() => confirm(`Remover ${ex?.nome} do ${tid}?`) && mexer((t) => void (t.itens = t.itens.filter((x) => x.exercicioId !== it.exercicioId)))}
                >
                  ✕
                </button>
              </div>
            </div>
            <div className="grade-3">
              <CampoNumero rotulo="Séries" passo={1} valor={it.series} onChange={(v) => mexer((t) => void (t.itens.find((x) => x.exercicioId === it.exercicioId)!.series = Math.max(1, Math.round(v ?? 1))))} />
              <CampoNumero rotulo="Reps mín" passo={1} valor={it.repsMin} onChange={(v) => mexer((t) => void (t.itens.find((x) => x.exercicioId === it.exercicioId)!.repsMin = Math.max(1, Math.round(v ?? 1))))} />
              <CampoNumero rotulo="Reps máx" passo={1} valor={it.repsMax} onChange={(v) => mexer((t) => void (t.itens.find((x) => x.exercicioId === it.exercicioId)!.repsMax = Math.max(1, Math.round(v ?? 1))))} />
            </div>
            {ex && (
              <div className="grade-2">
                <CampoNumero rotulo="Incremento mín." sufixo="kg" passo={0.5} valor={ex.incrementoKg} onChange={(v) => atualizar((e) => void (e.exercicios[ex.id].incrementoKg = v ?? 1))} />
                <label className="campo">
                  <span>Tipo</span>
                  <select value={ex.tipo} onChange={(ev) => atualizar((e) => void (e.exercicios[ex.id].tipo = ev.target.value as TipoExercicio))}>
                    {TIPOS.map((t) => (
                      <option key={t}>{t}</option>
                    ))}
                  </select>
                </label>
              </div>
            )}
            {it.repsMin > it.repsMax && <p className="txt-alerta pequeno">Reps mín maior que reps máx.</p>}
          </Cartao>
        );
      })}

      <Cartao titulo="Adicionar exercício">
        <div className="linha-input">
          <select value={adicionar} onChange={(e) => setAdicionar(e.target.value)} aria-label="Exercício do catálogo">
            <option value="">Escolha do catálogo…</option>
            {catalogo
              .filter((e) => !treino.itens.some((i) => i.exercicioId === e.id))
              .map((e) => (
                <option key={e.id} value={e.id}>
                  {e.nome}
                </option>
              ))}
          </select>
          <button
            className="btn-secundario"
            disabled={!adicionar}
            onClick={() => {
              const ex = estado.exercicios[adicionar];
              mexer((t) => t.itens.push({ exercicioId: adicionar, ordem: 999, series: 3, repsMin: ex.tipo === 'composto' ? 8 : 10, repsMax: ex.tipo === 'composto' ? 10 : 15 }));
              setAdicionar('');
            }}
          >
            Adicionar
          </button>
        </div>
        {!novo ? (
          <button className="btn-texto" onClick={() => setNovo({ tipo: 'isolado', grupo: 'Costas', equipamento: 'maquina', incrementoKg: 1 })}>
            + criar exercício novo
          </button>
        ) : (
          <div className="novo-exercicio">
            <label className="campo">
              <span>Nome</span>
              <input value={novo.nome ?? ''} onChange={(e) => setNovo({ ...novo, nome: e.target.value })} />
            </label>
            <div className="grade-2">
              <label className="campo">
                <span>Tipo</span>
                <select value={novo.tipo} onChange={(e) => setNovo({ ...novo, tipo: e.target.value as TipoExercicio })}>
                  {TIPOS.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </label>
              <label className="campo">
                <span>Músculo (volume)</span>
                <select value={novo.grupo} onChange={(e) => setNovo({ ...novo, grupo: e.target.value as Grupo })}>
                  {GRUPOS.map((g) => (
                    <option key={g}>{g}</option>
                  ))}
                </select>
              </label>
              <label className="campo">
                <span>Equipamento</span>
                <select value={novo.equipamento} onChange={(e) => setNovo({ ...novo, equipamento: e.target.value as Equipamento })}>
                  {Object.entries(EQUIP).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </label>
              <CampoNumero rotulo="Incremento" sufixo="kg" passo={0.5} valor={novo.incrementoKg} onChange={(v) => setNovo({ ...novo, incrementoKg: v })} />
            </div>
            <label className="opcao">
              <input type="checkbox" checked={!!novo.pernas} onChange={(e) => setNovo({ ...novo, pernas: e.target.checked })} />
              Composto de pernas (+5% por subida)
            </label>
            <div className="grade-2">
              <button
                className="btn-primario"
                disabled={!novo.nome?.trim()}
                onClick={() => {
                  const idNovo = 'custom_' + Date.now().toString(36);
                  const ex: Exercicio = {
                    id: idNovo,
                    nome: novo.nome!.trim(),
                    tipo: novo.tipo ?? 'isolado',
                    musculoPrincipal: novo.grupo ?? 'Costas',
                    grupo: (novo.grupo ?? 'Costas') as Grupo,
                    equipamento: novo.equipamento ?? 'maquina',
                    incrementoKg: novo.incrementoKg ?? 1,
                    pernas: novo.pernas,
                    custom: true,
                    substitutos: [],
                  };
                  atualizar((e) => {
                    e.exercicios[idNovo] = ex;
                    e.treinos[tid].itens.push({ exercicioId: idNovo, ordem: e.treinos[tid].itens.length + 1, series: 3, repsMin: ex.tipo === 'composto' ? 8 : 10, repsMax: ex.tipo === 'composto' ? 10 : 15 });
                  });
                  setNovo(null);
                }}
              >
                Criar e adicionar
              </button>
              <button className="btn-secundario" onClick={() => setNovo(null)}>
                Cancelar
              </button>
            </div>
          </div>
        )}
      </Cartao>

      <button
        className="btn-texto perigo"
        onClick={() => confirm(`Restaurar o ${tid} original da especificação?`) && atualizar((e) => void (e.treinos[tid] = structuredClone(TREINOS_PADRAO[tid])))}
      >
        Restaurar {tid} padrão
      </button>
    </>
  );
}
