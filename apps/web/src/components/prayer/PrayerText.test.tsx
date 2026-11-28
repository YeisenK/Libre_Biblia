import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { PrayerText } from './PrayerText';

describe('PrayerText: modo grupo', () => {
  const text = 'V. Señor, ten piedad.\nR. Señor, ten piedad.';
  it('sin modo grupo conserva V./R.', () => {
    const { container } = render(<PrayerText text={text} />);
    expect(container.querySelector('[data-part]')).toBeNull();
  });
  it('con modo grupo marca guía y todos', () => {
    const { container } = render(<PrayerText text={text} group />);
    expect(container.querySelector('[data-part="guia"]')?.textContent).toContain('Guía');
    expect(container.querySelector('[data-part="todos"]')?.textContent).toContain('Todos');
  });
});
