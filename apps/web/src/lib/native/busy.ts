// Operaciones largas en curso (p. ej. instalar paquetes). El botón «atrás» de Android no debe salir de la app mientras haya alguna.
const active = new Set<string>();
export const BUSY_BACK_EVENT = 'bc:busy-back';

export function setBusy(key: string, on: boolean): void {
  if (on) active.add(key);
  else active.delete(key);
}
export const isBusy = (): boolean => active.size > 0;

/** Avisa a la pantalla que el usuario pulsó «atrás» durante una operación. Devuelve true si estaba ocupada. */
export function notifyBusyBack(): boolean {
  if (!isBusy()) return false;
  window.dispatchEvent(new Event(BUSY_BACK_EVENT));
  return true;
}
