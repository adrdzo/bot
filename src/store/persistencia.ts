// Armazenamento local (offline) em IndexedDB, com fallback em localStorage

import { estadoInicial, USUARIO_PADRAO, VERSAO_ESTADO } from '../domain/programa';
import type { EstadoApp } from '../domain/types';

const DB = 'projeto-dragao';
const STORE = 'kv';
const CHAVE = 'estado';

function abrir(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function carregar(): Promise<EstadoApp> {
  try {
    const db = await abrir();
    const valor = await new Promise<unknown>((resolve, reject) => {
      const req = db.transaction(STORE).objectStore(STORE).get(CHAVE);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    if (valor) return migrar(valor as Partial<EstadoApp>);
  } catch {
    try {
      const txt = localStorage.getItem(DB);
      if (txt) return migrar(JSON.parse(txt));
    } catch {
      /* sem armazenamento disponível */
    }
  }
  return estadoInicial();
}

export async function salvar(estado: EstadoApp): Promise<void> {
  try {
    const db = await abrir();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(estado, CHAVE);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    try {
      localStorage.setItem(DB, JSON.stringify(estado));
    } catch {
      /* sem armazenamento disponível */
    }
  }
}

/** Completa campos que não existiam em versões anteriores / backups importados. */
export function migrar(bruto: Partial<EstadoApp>): EstadoApp {
  const base = estadoInicial();
  return {
    ...base,
    ...bruto,
    versao: VERSAO_ESTADO,
    usuario: { ...USUARIO_PADRAO, ...(bruto.usuario ?? {}) },
    exercicios: { ...base.exercicios, ...(bruto.exercicios ?? {}) },
    treinos: { ...base.treinos, ...(bruto.treinos ?? {}) },
    sessoes: bruto.sessoes ?? [],
    pesagens: bruto.pesagens ?? [],
    checkins: bruto.checkins ?? [],
    avaliacoes: bruto.avaliacoes ?? [],
    ajustesNutricao: bruto.ajustesNutricao ?? [],
    notificacoesEnviadas: bruto.notificacoesEnviadas ?? [],
  };
}
