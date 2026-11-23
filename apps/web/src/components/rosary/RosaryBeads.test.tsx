import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { RosaryBeads } from './RosaryBeads';

describe('RosaryBeads', () => {
  it('dibuja el rosario completo con una cuenta actual', () => {
    const { container } = render(<RosaryBeads stateOf={(i) => (i === 10 ? 'current' : i < 10 ? 'done' : 'pending')} />);
    expect(container.querySelector('svg')).toBeTruthy();
    expect(container.querySelectorAll('g[filter]').length).toBe(1);
  });
  it('la vista de decena y el toque avanzan', () => {
    const onTap = vi.fn();
    const { getByRole } = render(<RosaryBeads view="decade" stateOf={() => 'pending'} onTap={onTap} tapLabel="Siguiente" />);
    getByRole('button', { name: 'Siguiente' }).click();
    expect(onTap).toHaveBeenCalledOnce();
  });
});
