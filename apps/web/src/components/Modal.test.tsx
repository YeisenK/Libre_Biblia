import { describe, expect, it } from 'vitest';
import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Modal } from './Modal';

function Form() {
  const [t, setT] = useState('');
  const [a, setA] = useState('');
  return (
    <Modal open onClose={() => undefined} title="Ficha">
      <input aria-label="Título" value={t} onChange={(e) => setT(e.target.value)} data-autofocus />
      <input aria-label="Autor" value={a} onChange={(e) => setA(e.target.value)} />
    </Modal>
  );
}

describe('Modal', () => {
  it('no devuelve el foco al primer campo al escribir en otro (onClose cambia en cada render)', async () => {
    render(<Form />);
    const author = screen.getByLabelText('Autor');
    await userEvent.click(author);
    await userEvent.type(author, 'Kempis');
    expect(author).toHaveValue('Kempis');
    expect(document.activeElement).toBe(author);
  });
});
