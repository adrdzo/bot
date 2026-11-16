import { useEffect, useRef, useState } from 'react';
import { useApp } from './store/AppContext';
import { manutencao } from './store/acoes';
import { exibir, notificacoesPendentes } from './notificacoes';
import { Inicio } from './screens/Inicio';
import { SessaoTela } from './screens/Sessao';
import { Historico, HistoricoDetalhe } from './screens/Historico';
import { Volume } from './screens/Volume';
import { Corpo } from './screens/Corpo';
import { Checkin } from './screens/Checkin';
import { Avaliacao } from './screens/Avaliacao';
import { Nutricao } from './screens/Nutricao';
import { Configuracoes, EditarTreino } from './screens/Configuracoes';

export type Navegar = (rota: string) => void;

function rotaAtual() {
  return window.location.hash.replace(/^#\/?/, '') || 'inicio';
}

const ABAS = [
  { rota: 'inicio', rotulo: 'Início', icone: '⌂' },
  { rota: 'historico', rotulo: 'Histórico', icone: '↗' },
  { rota: 'volume', rotulo: 'Volume', icone: '▤' },
  { rota: 'corpo', rotulo: 'Corpo', icone: '◎' },
  { rota: 'nutricao', rotulo: 'Nutrição', icone: '◆' },
];

export function App() {
  const [rota, setRota] = useState(rotaAtual);
  const { estado, atualizar } = useApp();

  useEffect(() => {
    const f = () => {
      setRota(rotaAtual());
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', f);
    return () => window.removeEventListener('hashchange', f);
  }, []);

  const estadoRef = useRef(estado);
  estadoRef.current = estado;

  // manutenção (fim do deload, limpeza) + notificações ao abrir e a cada 30 min
  useEffect(() => {
    atualizar((e) => manutencao(e));
    const rodar = () => {
      const pend = notificacoesPendentes(estadoRef.current, new Date());
      if (!pend.length || typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
      pend.forEach(exibir);
      atualizar((e) => {
        e.notificacoesEnviadas.push(...pend.map((n) => n.chave));
      });
    };
    const inicial = window.setTimeout(rodar, 1500);
    const id = window.setInterval(rodar, 30 * 60 * 1000);
    return () => {
      window.clearTimeout(inicial);
      window.clearInterval(id);
    };
  }, [atualizar]);

  const navegar: Navegar = (r) => {
    window.location.hash = '/' + r;
  };

  const [base, param] = rota.split('/');
  let tela;
  switch (base) {
    case 'sessao':
      tela = <SessaoTela navegar={navegar} />;
      break;
    case 'historico':
      tela = param ? <HistoricoDetalhe id={decodeURIComponent(param)} navegar={navegar} /> : <Historico navegar={navegar} />;
      break;
    case 'volume':
      tela = <Volume navegar={navegar} />;
      break;
    case 'corpo':
      tela = <Corpo navegar={navegar} />;
      break;
    case 'checkin':
      tela = <Checkin navegar={navegar} semana={param} />;
      break;
    case 'avaliacao':
      tela = <Avaliacao navegar={navegar} />;
      break;
    case 'nutricao':
      tela = <Nutricao navegar={navegar} />;
      break;
    case 'config':
      tela = param ? <EditarTreino id={param} navegar={navegar} /> : <Configuracoes navegar={navegar} />;
      break;
    default:
      tela = <Inicio navegar={navegar} />;
  }

  const emSessao = base === 'sessao';
  const abaAtiva = ['checkin', 'avaliacao'].includes(base) ? 'corpo' : base;

  return (
    <div className={`app ${emSessao ? 'app-sessao' : ''}`}>
      <main>{tela}</main>
      {!emSessao && (
        <nav className="abas" aria-label="Navegação principal">
          {ABAS.map((a) => (
            <a key={a.rota} href={`#/${a.rota}`} className={abaAtiva === a.rota ? 'ativa' : ''} aria-current={abaAtiva === a.rota ? 'page' : undefined}>
              <span aria-hidden>{a.icone}</span>
              {a.rotulo}
            </a>
          ))}
        </nav>
      )}
      {!emSessao && estado.sessaoAtiva && (
        <button className="sessao-flutuante" onClick={() => navegar('sessao')}>
          Treino {estado.sessaoAtiva.treinoId} em andamento · continuar ›
        </button>
      )}
    </div>
  );
}
