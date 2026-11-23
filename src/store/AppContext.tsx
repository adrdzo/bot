import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import type { EstadoApp } from '../domain/types';
import { carregar, salvar } from './persistencia';

interface Ctx {
  estado: EstadoApp;
  /** Aplica uma alteração sobre uma cópia do estado e persiste. */
  atualizar: (fn: (rascunho: EstadoApp) => void) => void;
  substituir: (novo: EstadoApp) => void;
}

const AppCtx = createContext<Ctx | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [estado, setEstado] = useState<EstadoApp | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const ultimo = useRef<EstadoApp | null>(null);

  useEffect(() => {
    carregar().then(setEstado);
  }, []);

  useEffect(() => {
    if (!estado) return;
    ultimo.current = estado;
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => salvar(estado), 250);
  }, [estado]);

  // garante a gravação ao sair/ocultar o app
  useEffect(() => {
    const flush = () => {
      if (document.visibilityState === 'hidden' && ultimo.current) salvar(ultimo.current);
    };
    document.addEventListener('visibilitychange', flush);
    return () => document.removeEventListener('visibilitychange', flush);
  }, []);

  const atualizar = useCallback((fn: (r: EstadoApp) => void) => {
    setEstado((atual) => {
      if (!atual) return atual;
      const copia = structuredClone(atual);
      fn(copia);
      return copia;
    });
  }, []);

  const substituir = useCallback((novo: EstadoApp) => setEstado(novo), []);

  if (!estado) return <div className="carregando">Carregando…</div>;
  return <AppCtx.Provider value={{ estado, atualizar, substituir }}>{children}</AppCtx.Provider>;
}

export function useApp(): Ctx {
  const c = useContext(AppCtx);
  if (!c) throw new Error('useApp fora do AppProvider');
  return c;
}
