import { useEffect } from "react";
import { HashRouter, NavLink, Route, Routes, useLocation } from "react-router-dom";
import { useStore } from "./store/store";
import { Icone, Toaster } from "./components/ui";
import { TimerDescanso } from "./components/TimerDescanso";
import { useNotificacoes } from "./logic/notificacoes";
import Inicio from "./pages/Inicio";
import SessaoTreino from "./pages/SessaoTreino";
import Resumo from "./pages/Resumo";
import Historico from "./pages/Historico";
import Exercicios from "./pages/Exercicios";
import ExercicioDetalhe from "./pages/ExercicioDetalhe";
import Progresso from "./pages/Progresso";
import Corpo from "./pages/Corpo";
import Checkin from "./pages/Checkin";
import Avaliacao from "./pages/Avaliacao";
import Nutricao from "./pages/Nutricao";
import Mais from "./pages/Mais";
import Configuracoes from "./pages/Configuracoes";
import EditarPrograma from "./pages/EditarPrograma";
import Ferramentas from "./pages/Ferramentas";
import Onboarding from "./pages/Onboarding";
import Programa from "./pages/Programa";

function Nav() {
  const emSessao = useStore((s) => !!s.sessaoAtual);
  return (
    <nav className="nav">
      <div className="nav-in">
        <NavLink to="/" end>
          <Icone nome="inicio" />
          Início
        </NavLink>
        <NavLink to="/progresso">
          <Icone nome="progresso" />
          Progresso
        </NavLink>
        <NavLink to="/treino" className="centro">
          <span className="bolha">
            <Icone nome={emSessao ? "treino" : "play"} tamanho={24} />
          </span>
          {emSessao ? "Em treino" : "Treinar"}
        </NavLink>
        <NavLink to="/corpo">
          <Icone nome="corpo" />
          Corpo
        </NavLink>
        <NavLink to="/mais">
          <Icone nome="mais" />
          Mais
        </NavLink>
      </div>
    </nav>
  );
}

function Rolagem() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function Tema() {
  const tema = useStore((s) => s.usuario.tema);
  useEffect(() => {
    const el = document.documentElement;
    if (tema === "claro") el.setAttribute("data-theme", "light");
    else if (tema === "escuro") el.setAttribute("data-theme", "dark");
    else el.removeAttribute("data-theme");
  }, [tema]);
  return null;
}

export default function App() {
  const onboarded = useStore((s) => s.usuario.onboarded);
  useNotificacoes();
  return (
    <HashRouter>
      <Tema />
      <Rolagem />
      <Toaster />
      {!onboarded ? (
        <Onboarding />
      ) : (
        <div className="app">
          <Routes>
            <Route path="/" element={<Inicio />} />
            <Route path="/treino" element={<SessaoTreino />} />
            <Route path="/resumo/:id" element={<Resumo />} />
            <Route path="/historico" element={<Historico />} />
            <Route path="/exercicios" element={<Exercicios />} />
            <Route path="/exercicio/:id" element={<ExercicioDetalhe />} />
            <Route path="/progresso" element={<Progresso />} />
            <Route path="/corpo" element={<Corpo />} />
            <Route path="/checkin" element={<Checkin />} />
            <Route path="/avaliacao/:id" element={<Avaliacao />} />
            <Route path="/nutricao" element={<Nutricao />} />
            <Route path="/mais" element={<Mais />} />
            <Route path="/programa" element={<Programa />} />
            <Route path="/config" element={<Configuracoes />} />
            <Route path="/config/programa" element={<EditarPrograma />} />
            <Route path="/ferramentas" element={<Ferramentas />} />
            <Route path="*" element={<Inicio />} />
          </Routes>
          <TimerDescanso />
          <Nav />
        </div>
      )}
    </HashRouter>
  );
}
