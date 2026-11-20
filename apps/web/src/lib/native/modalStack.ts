// Registro de diálogos abiertos, para que el botón «atrás» de Android cierre el superior.
const stack: Array<() => void> = [];

export function registerModal(close: () => void): () => void {
  stack.push(close);
  return () => {
    const i = stack.lastIndexOf(close);
    if (i >= 0) stack.splice(i, 1);
  };
}

/** Cierra el diálogo superior. Devuelve false si no había ninguno. */
export function closeTopModal(): boolean {
  const top = stack[stack.length - 1];
  if (!top) return false;
  top();
  return true;
}
