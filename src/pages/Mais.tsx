import { Link } from "react-router-dom";
import { Topo } from "../components/ui";

const ITENS = [
  { to: "/programa", ic: "📋", t: "Minha ficha", d: "SUP1 · INF1 · SUP2 · INF2 e a fila de treinos" },
  { to: "/exercicios", ic: "🏋️", t: "Biblioteca de exercícios", d: "Animações, técnica, músculos e histórico" },
  { to: "/historico", ic: "📅", t: "Histórico de treinos", d: "Calendário e todas as sessões" },
  { to: "/nutricao", ic: "🍽️", t: "Nutrição", d: "Calorias, macros e ajuste quinzenal" },
  { to: "/checkin", ic: "📝", t: "Check-in semanal", d: "Sono, fadiga, motivação e cintura" },
  { to: "/avaliacao/nova", ic: "📏", t: "Avaliação mensal", d: "Medidas, fotos e decisão de volume" },
  { to: "/ferramentas", ic: "🧮", t: "Ferramentas", d: "Calculadora de anilhas, 1RM e aquecimento" },
  { to: "/config", ic: "⚙️", t: "Configurações", d: "Perfil, cargas, notificações, backup" },
];

export default function Mais() {
  return (
    <>
      <Topo titulo="Mais" />
      <div className="pagina">
        {ITENS.map((i) => (
          <Link key={i.to} to={i.to} className="menu-item">
            <span className="ic">{i.ic}</span>
            <div className="flex1">
              <div className="forte">{i.t}</div>
              <div className="mini">{i.d}</div>
            </div>
            <span className="mini">›</span>
          </Link>
        ))}
        <p className="mini" style={{ textAlign: "center", marginTop: 8 }}>
          “Para um atleta natural, o objetivo não é fazer o máximo que consegue recuperar hoje. É fazer o mínimo necessário para continuar evoluindo por meses e anos seguidos.”
        </p>
      </div>
    </>
  );
}
