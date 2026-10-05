import { create } from 'zustand';

export type ToastTone = 'success' | 'error' | 'info';

export interface Toast {
  id: number;
  message: string;
  tone: ToastTone;
}

interface ToastState {
  toasts: Toast[];
  dismiss: (id: number) => void;
}

const DURATION_MS = 4000;
let nextId = 1;

export const useToastStore = create<ToastState>()((set) => ({
  toasts: [],
  dismiss: (id) => {
    set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) }));
  },
}));

/** Affiche un message éphémère, annoncé aux lecteurs d'écran. */
export function toast(message: string, tone: ToastTone = 'success') {
  const id = nextId++;
  useToastStore.setState((state) => ({ toasts: [...state.toasts, { id, message, tone }] }));
  setTimeout(() => {
    useToastStore.getState().dismiss(id);
  }, DURATION_MS);
}
