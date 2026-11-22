import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';

// Session-only state: never persist customer searches or drafts in browser storage.
export const WorkspaceMemory = createContext<Map<string, unknown> | null>(null);

export function useWorkspaceState<T>(key: string, initial: T) {
  const memory = useContext(WorkspaceMemory);
  const [value, setValue] = useState<T>(() => memory?.has(key) ? memory.get(key) as T : initial);
  useEffect(() => { memory?.set(key, value); }, [key, memory, value]);
  return [value, setValue] as const;
}

export function useListPosition(key: string, visible: boolean) {
  const memory = useContext(WorkspaceMemory);
  const lastPosition = useRef(0);
  useLayoutEffect(() => {
    if (!visible) return;
    const position = Number(memory?.get(key) ?? lastPosition.current);
    if (window.scrollY !== position) window.scrollTo(0, position);
    const remember = () => {
      lastPosition.current = window.scrollY;
      memory?.set(key, window.scrollY);
    };
    window.addEventListener('scroll', remember, { passive: true });
    return () => window.removeEventListener('scroll', remember);
  }, [key, memory, visible]);
}

export function useTrackedForm<T>(initial: T) {
  const [state, setState] = useState({ value: initial, saved: initial });
  const setSaved: Dispatch<SetStateAction<T>> = useCallback((action) => {
    setState((current) => {
      const value = typeof action === 'function' ? (action as (value: T) => T)(current.value) : action;
      return { value, saved: value };
    });
  }, []);
  const edit: Dispatch<SetStateAction<T>> = useCallback((action) => {
    setState((current) => ({ ...current, value: typeof action === 'function'
      ? (action as (value: T) => T)(current.value) : action }));
  }, []);
  return [state.value, setSaved, edit, JSON.stringify(state.value) !== JSON.stringify(state.saved)] as const;
}

export function confirmUnsaved(dirty: boolean) {
  return !dirty || window.confirm('Tenés cambios sin guardar. ¿Querés continuar sin guardarlos?');
}

export function useUnloadWarning(dirty: boolean) {
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);
}
