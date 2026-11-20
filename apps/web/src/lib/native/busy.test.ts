import { describe, expect, it, vi } from 'vitest';
import { BUSY_BACK_EVENT, isBusy, notifyBusyBack, setBusy } from './busy';

describe('busy', () => {
  it('avisa solo si hay una operación en curso', () => {
    const fn = vi.fn();
    window.addEventListener(BUSY_BACK_EVENT, fn);
    expect(notifyBusyBack()).toBe(false);
    setBusy('x', true);
    expect(isBusy()).toBe(true);
    expect(notifyBusyBack()).toBe(true);
    expect(fn).toHaveBeenCalledTimes(1);
    setBusy('x', false);
    expect(isBusy()).toBe(false);
    window.removeEventListener(BUSY_BACK_EVENT, fn);
  });
});
