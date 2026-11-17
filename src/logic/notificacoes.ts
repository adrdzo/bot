import { useEffect } from "react";
import { useStore } from "../store/store";
import { avaliarDeload } from "./analise";
import { diasEntre, hojeISO, semanaISO } from "./datas";

export async function pedirPermissao() {
  if (!("Notification" in window)) return false;
  const r = await Notification.requestPermission();
  return r === "granted";
}

async function notificar(titulo: string, corpo: string) {
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    if (reg) await reg.showNotification(titulo, { body: corpo, icon: "icon.svg", badge: "icon.svg" });
    else new Notification(titulo, { body: corpo, icon: "icon.svg" });
  } catch {
    /* ignora */
  }
}

/** Avalia os lembretes da seção 8 e dispara no máximo uma vez por dia cada um */
export function verificarLembretes() {
  const s = useStore.getState();
  const u = s.usuario;
  if (!u.notificacoes || !("Notification" in window) || Notification.permission !== "granted") return;
  const hoje = hojeISO();
  const ja = s.ultimaNotificacao ?? {};
  const disparar = (chave: string, titulo: string, corpo: string) => {
    if (ja[chave] === hoje) return;
    s.marcarNotificacao(chave);
    notificar(titulo, corpo);
  };
  const dow = new Date().getDay();
  const treinouHoje = s.sessoes.some((x) => x.data.slice(0, 10) === hoje);
  if (u.diasTreino.includes(dow) && !treinouHoje && new Date().getHours() >= 9)
    disparar("treino", "Projeto Dragão", `Hoje é dia de ${u.proximoTreino} 💪`);
  if (dow === 0 && !s.checkins.some((c) => c.semanaISO === semanaISO(hoje)))
    disparar("checkin", "Check-in semanal", "Faça seu check-in semanal");
  const ultAv = s.avaliacoes[s.avaliacoes.length - 1]?.data ?? u.inicioPrograma;
  if (diasEntre(ultAv, hoje) >= 28) disparar("mensal", "Avaliação mensal", "Hora da avaliação mensal");
  if (!s.deloadAtivo && avaliarDeload(s.sessoes, s.checkins, u, s.programa, s.exerciciosCustom).ativo)
    disparar("deload", "Deload", "Seus dados sugerem uma semana de deload");
  if (u.lembretePesagem && !s.pesagens.some((p) => p.data === hoje) && new Date().getHours() < 12)
    disparar("pesagem", "Pesagem", "Pese-se em jejum");
}

export function useNotificacoes() {
  useEffect(() => {
    const t = setTimeout(verificarLembretes, 1500);
    const i = setInterval(verificarLembretes, 10 * 60 * 1000);
    const vis = () => document.visibilityState === "visible" && verificarLembretes();
    document.addEventListener("visibilitychange", vis);
    return () => {
      clearTimeout(t);
      clearInterval(i);
      document.removeEventListener("visibilitychange", vis);
    };
  }, []);
}
