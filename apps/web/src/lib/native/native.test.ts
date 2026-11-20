import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = { native: true };
const filesystem = { writeFile: vi.fn(async (o: { path: string }) => ({ uri: `file:///cache/${o.path}` })) };
const share = { share: vi.fn(async () => ({ activityType: 'x' })) };
const statusBar = { setStyle: vi.fn(async () => undefined), setBackgroundColor: vi.fn(async () => undefined) };
const browser = { open: vi.fn(async () => undefined) };
const splash = { hide: vi.fn(async () => undefined) };
let backHandler: ((e: { canGoBack: boolean }) => void) | null = null;
const remove = vi.fn(async () => undefined);
const app = {
  addListener: vi.fn(async (_n: string, h: (e: { canGoBack: boolean }) => void) => ((backHandler = h), { remove })),
  exitApp: vi.fn(async () => undefined),
};

vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => state.native } }));
vi.mock('@capacitor/filesystem', () => ({ Filesystem: filesystem, Directory: { Cache: 'CACHE' }, Encoding: { UTF8: 'utf8' } }));
vi.mock('@capacitor/share', () => ({ Share: share }));
vi.mock('@capacitor/status-bar', () => ({ StatusBar: statusBar, Style: { Light: 'LIGHT', Dark: 'DARK' } }));
vi.mock('@capacitor/browser', () => ({ Browser: browser }));
vi.mock('@capacitor/splash-screen', () => ({ SplashScreen: splash }));
vi.mock('@capacitor/app', () => ({ App: app }));

import { _resetNativeCache, isNative } from './platform';
import { shareFileNative, shareTextNative } from './files';
import { applyNativeTheme } from './theme';
import { initNative, isExternalHref } from './init';
import { closeTopModal, registerModal } from './modalStack';
import { downloadText } from '../share';

beforeEach(() => {
  vi.clearAllMocks();
  state.native = true;
  _resetNativeCache();
  backHandler = null;
});

describe('plataforma', () => {
  it('detecta nativo y web', async () => {
    expect(await isNative()).toBe(true);
    state.native = false;
    _resetNativeCache();
    expect(await isNative()).toBe(false);
  });
});

describe('archivos y compartir', () => {
  it('texto: escribe en caché y abre la hoja de compartir', async () => {
    expect(await shareFileNative('copia.json', '{"a":1}', 'Copia')).toBe(true);
    expect(filesystem.writeFile).toHaveBeenCalledWith(expect.objectContaining({ path: 'copia.json', data: '{"a":1}', directory: 'CACHE', encoding: 'utf8' }));
    expect(share.share).toHaveBeenCalledWith(expect.objectContaining({ files: ['file:///cache/copia.json'] }));
  });
  it('blob: lo convierte a base64 sin codificación', async () => {
    await shareFileNative('a.png', new Blob(['hola'], { type: 'image/png' }), 'Imagen');
    const arg = filesystem.writeFile.mock.calls[0]![0] as unknown as { data: string; encoding?: string };
    expect(arg.data).toBe(btoa('hola'));
    expect(arg.encoding).toBeUndefined();
  });
  it('cancelar la hoja no es un error', async () => {
    share.share.mockRejectedValueOnce(new Error('Share canceled'));
    await expect(shareFileNative('a.json', 'x', 't')).resolves.toBe(true);
    share.share.mockRejectedValueOnce(new Error('fallo real'));
    await expect(shareFileNative('a.json', 'x', 't')).rejects.toThrow('fallo real');
  });
  it('compartir texto', async () => {
    expect(await shareTextNative('Jn 1,1', 'Jn 1')).toBe(true);
    expect(share.share).toHaveBeenCalledWith(expect.objectContaining({ text: 'Jn 1,1', title: 'Jn 1' }));
  });
  it('en la web devuelve false y no toca plugins', async () => {
    state.native = false;
    expect(await shareFileNative('a', 'b', 'c')).toBe(false);
    expect(await shareTextNative('a', 'b')).toBe(false);
    expect(filesystem.writeFile).not.toHaveBeenCalled();
  });
  it('downloadText usa compartir en nativo', async () => {
    expect(await downloadText('x.json', '{}')).toBe('shared');
  });
});

describe('tema nativo', () => {
  it('oscuro: barra con iconos claros y fondo del tema', async () => {
    await applyNativeTheme('dark');
    expect(statusBar.setStyle).toHaveBeenCalledWith({ style: 'DARK' });
    expect(statusBar.setBackgroundColor).toHaveBeenCalledWith({ color: '#14161a' });
  });
  it('claro: iconos oscuros; web: nada', async () => {
    await applyNativeTheme('light');
    expect(statusBar.setStyle).toHaveBeenCalledWith({ style: 'LIGHT' });
    vi.clearAllMocks();
    state.native = false;
    _resetNativeCache();
    await applyNativeTheme('dark');
    expect(statusBar.setStyle).not.toHaveBeenCalled();
  });
});

describe('enlaces externos', () => {
  it('clasifica', () => {
    const o = 'https://localhost';
    expect(isExternalHref('https://github.com/x', o)).toBe(true);
    expect(isExternalHref('/leer/', o)).toBe(false);
    expect(isExternalHref('https://localhost/leer/', o)).toBe(false);
    expect(isExternalHref('mailto:a@b.c', o)).toBe(false);
    expect(isExternalHref(null, o)).toBe(false);
  });
});

describe('initNative', () => {
  it('oculta el splash y no registra nada en la web', async () => {
    state.native = false;
    await initNative();
    expect(splash.hide).not.toHaveBeenCalled();
    expect(app.addListener).not.toHaveBeenCalled();
  });
  it('botón atrás: cierra modal, luego history.back, luego sale', async () => {
    const cleanup = await initNative();
    expect(splash.hide).toHaveBeenCalled();
    const close = vi.fn();
    const unreg = registerModal(close);
    const back = vi.spyOn(window.history, 'back').mockImplementation(() => undefined);
    backHandler!({ canGoBack: true });
    expect(close).toHaveBeenCalledTimes(1);
    expect(back).not.toHaveBeenCalled();
    unreg();
    backHandler!({ canGoBack: true });
    expect(back).toHaveBeenCalledTimes(1);
    backHandler!({ canGoBack: false });
    expect(app.exitApp).toHaveBeenCalledTimes(1);
    cleanup();
    expect(remove).toHaveBeenCalled();
    back.mockRestore();
  });
  it('abre enlaces externos en el navegador del sistema', async () => {
    const cleanup = await initNative();
    const a = document.createElement('a');
    a.href = 'https://github.com/YeisenK/Libre_Biblia';
    a.target = '_blank';
    document.body.appendChild(a);
    const ev = new MouseEvent('click', { bubbles: true, cancelable: true });
    a.dispatchEvent(ev);
    expect(ev.defaultPrevented).toBe(true);
    expect(browser.open).toHaveBeenCalledWith({ url: 'https://github.com/YeisenK/Libre_Biblia' });
    const local = document.createElement('a');
    local.setAttribute('href', '/leer/');
    document.body.appendChild(local);
    const ev2 = new MouseEvent('click', { bubbles: true, cancelable: true });
    local.dispatchEvent(ev2);
    expect(browser.open).toHaveBeenCalledTimes(1);
    cleanup();
  });
});

describe('modalStack', () => {
  it('cierra el último registrado', () => {
    const a = vi.fn(), b = vi.fn();
    const ua = registerModal(a), ub = registerModal(b);
    expect(closeTopModal()).toBe(true);
    expect(b).toHaveBeenCalled();
    expect(a).not.toHaveBeenCalled();
    ub();
    ua();
    expect(closeTopModal()).toBe(false);
  });
});
