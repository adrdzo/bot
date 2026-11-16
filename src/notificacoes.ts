// Notificações (seção 8). Sem servidor de push: são verificadas quando o app é aberto
// e a cada 30 min enquanto ele estiver aberto/em segundo plano.

import { gatilhoDeload } from './domain/analise';
import { dataLocal, diasEntre, paraData, semanaISO } from './domain/datas';
import type { EstadoApp } from './domain/types';

export interface Notificacao {
  chave: string;
  titulo: string;
  corpo: string;
}

export function notificacoesPendentes(e: EstadoApp, agora: Date): Notificacao[] {
  const u = e.usuario;
  if (!u.notificacoes) return [];
  const hoje = dataLocal(agora);
  const lista: Notificacao[] = [];
  const add = (evento: string, titulo: string, corpo: string) => {
    const chave = `${evento}|${hoje}`;
    if (!e.notificacoesEnviadas.includes(chave)) lista.push({ chave, titulo, corpo });
  };

  const treinouHoje = e.sessoes.some((s) => dataLocal(new Date(s.data)) === hoje);
  if (u.diasTreino.includes(agora.getDay()) && !treinouHoje && agora.getHours() >= 9) {
    add('treino', 'Projeto Dragão', `Hoje é dia de ${u.proximoTreino} 💪`);
  }

  if (agora.getDay() === 0 && !e.checkins.some((c) => c.semanaISO === semanaISO(agora))) {
    add('checkin', 'Check-in semanal', 'Faça seu check-in semanal');
  }

  const ultimaAv = [...e.avaliacoes].sort((a, b) => b.data.localeCompare(a.data))[0];
  const primeira = [...e.sessoes].sort((a, b) => a.data.localeCompare(b.data))[0];
  const refAv = ultimaAv?.data ?? primeira?.data;
  if (refAv && diasEntre(paraData(refAv), agora) >= 28) {
    add('avaliacao', 'Avaliação mensal', 'Hora da avaliação mensal');
  }

  if (gatilhoDeload(e, agora).ativo) {
    add('deload', 'Deload', 'Seus dados sugerem uma semana de deload');
  }

  if (u.lembretePesagem && !e.pesagens.some((p) => p.data === hoje) && agora.getHours() >= 6 && agora.getHours() < 12) {
    add('peso', 'Pesagem', 'Pese-se em jejum');
  }
  return lista;
}

export async function exibir(n: Notificacao) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    if (reg) await reg.showNotification(n.titulo, { body: n.corpo, icon: 'icon.svg', tag: n.chave });
    else new Notification(n.titulo, { body: n.corpo, icon: 'icon.svg' });
  } catch {
    /* ignorado */
  }
}

export async function pedirPermissao(): Promise<boolean> {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  return (await Notification.requestPermission()) === 'granted';
}
