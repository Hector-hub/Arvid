import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadSettings, saveSetting, type DataContext } from '../../data/repository';
import { addDays, toLocalDate } from '../../domain/time/localDate';
import { setLocale, tDynamic } from '../../i18n';
import { routes } from '../router';
import { ActivitiesScreen } from '../screens/ActivitiesScreen';
import { Onboarding } from '../screens/Onboarding';
import { ProfileScreen } from '../screens/ProfileScreen';
import { TodayScreen } from '../screens/TodayScreen';
import { renderRoutes, setupData } from '../test-utils';
import { say } from '../scene/engine';
import { resetConversation } from './brain';

vi.mock('../../pwa/platform', () => ({
  needsInstallForSafety: () => false,
  isIOS: () => false,
  currentPersistState: () => Promise.resolve('granted'),
  requestPersistentStorage: () => Promise.resolve('granted'),
}));

// ARVID "ya ha llegado" a su sitio y lo que dice se registra en vez de dibujarse
vi.mock('../scene/engine', async (original) => ({
  ...(await original<typeof import('../scene/engine')>()),
  say: vi.fn(),
  arvidReady: () => true,
  onArvidReady: (listener: () => void) => {
    listener();
    return () => undefined;
  },
  // Cada prueba empieza sin conversación previa (en la app es por sesión)
  hasUserChatted: () => false,
  celebrate: vi.fn(),
}));

let ctx: DataContext;

beforeEach(async () => {
  ctx = await setupData();
  vi.mocked(say).mockClear();
});

afterEach(async () => {
  setLocale('es');
  await ctx.db.delete();
});

/** Texto de lo último que dijo ARVID (páginas unidas). */
const lastSaid = () => vi.mocked(say).mock.calls.at(-1)?.[0].flat().join(' ') ?? '';

async function skipDialogue(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByRole('button', { name: 'Saltar' }));
}

describe('onboarding con ARVID (ON)', () => {
  beforeEach(async () => {
    await ctx.db.settings.delete('onboardingCompletedAt');
  });

  it('ON-02: idioma, bienvenida, alias, género, personaje, color de ARVID, áreas y listo', async () => {
    const user = userEvent.setup();
    renderRoutes(
      ctx,
      [
        { path: '/', element: <Onboarding /> },
        { path: '/hoy', element: <p>Hoy</p> },
      ],
      '/',
    );
    // 1. Idioma: el control se habilita al terminar el diálogo (ON-04)
    expect(await screen.findByRole('button', { name: 'Continuar' })).toBeDisabled();
    await skipDialogue(user);
    expect(screen.getByRole('radio', { name: 'Español' })).toBeChecked();
    await user.click(screen.getByRole('button', { name: 'Continuar' }));
    // 1b. Compañero: ARVID por defecto (CO-02)
    await skipDialogue(user);
    expect(screen.getByRole('radio', { name: /ARVID/ })).toBeChecked();
    await user.click(screen.getByRole('button', { name: 'Continuar' }));
    // 2. Bienvenida
    await skipDialogue(user);
    await user.click(screen.getByRole('button', { name: 'Empezar' }));
    // 3. Alias, con validación
    await skipDialogue(user);
    await user.click(screen.getByRole('button', { name: 'Continuar' }));
    expect(await screen.findByText('Escribe cómo quieres que te llame')).toBeInTheDocument();
    await user.type(screen.getByLabelText('Tu nombre o alias'), 'Héctor');
    await user.click(screen.getByRole('button', { name: 'Continuar' }));
    // 4. Género
    await skipDialogue(user);
    await user.click(screen.getByRole('radio', { name: 'Masculino' }));
    await user.click(screen.getByRole('button', { name: 'Continuar' }));
    // 5. Personaje: con género masculino se sugiere primero Ghost (PJ-02)
    await skipDialogue(user);
    await waitFor(() => expect(screen.getByRole('radio', { name: /^Ghost, 1 de 4/ })).toBeChecked());
    await user.click(screen.getByRole('button', { name: 'Siguiente' }));
    await waitFor(() => expect(screen.getByRole('radio', { name: /^Drifter, 2 de 4/ })).toBeChecked());
    await user.click(screen.getByRole('radio', { name: 'Ocaso' }));
    await user.click(screen.getByRole('button', { name: 'Continuar' }));
    // 6. Color de ARVID
    await skipDialogue(user);
    await user.click(screen.getByRole('radio', { name: 'Magenta' }));
    await user.click(screen.getByRole('button', { name: 'Continuar' }));
    // 7. Permiso para la IA (IA-06)
    await skipDialogue(user);
    expect(screen.getByText(/envía tu progreso y tus actividades a Mistral AI/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Activar' }));
    // 7b. Notificaciones (spec 10, NT-02): sin Web Push en el entorno de pruebas, solo se explica
    await skipDialogue(user);
    expect(screen.getByText(/no admite notificaciones/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Continuar' }));
    // 7. Áreas de vida
    await skipDialogue(user);
    await user.click(screen.getByRole('button', { name: 'Continuar' }));
    // 8. Listo
    await skipDialogue(user);
    await user.click(screen.getByRole('button', { name: 'Ir a Hoy' }));
    expect(await screen.findByText('Hoy')).toBeInTheDocument();

    const s = await loadSettings(ctx.db);
    expect(s.profile).toEqual({ alias: 'Héctor', gender: 'm' });
    expect(s.avatar).toEqual({ cast: 'el2', variant: 'ocaso' });
    expect(s.arvidColor).toBe('magenta');
    expect(s.arvidAi).toBe(true);
    expect(s.locale).toBe('es');
    expect(s.onboardingCompletedAt).toBeDefined();
  });

  it('CO-02 · ID-01: elegir a DARIS hace que ella narre el resto y que el color sea el suyo', async () => {
    const user = userEvent.setup();
    renderRoutes(ctx, [{ path: '/', element: <Onboarding /> }], '/');
    await skipDialogue(user);
    await user.click(screen.getByRole('button', { name: 'Continuar' }));
    await skipDialogue(user);
    await user.click(screen.getByRole('radio', { name: /DARIS/ }));
    await waitFor(async () => expect((await loadSettings(ctx.db)).companion).toBe('daris'));
    await user.click(screen.getByRole('button', { name: 'Continuar' }));
    // Bienvenida en boca de DARIS, en femenino
    expect(await screen.findByRole('group', { name: 'Diálogo con DARIS' })).toBeInTheDocument();
    await skipDialogue(user);
    expect(screen.getByText('DARIS', { selector: '.dialogue-name' })).toBeInTheDocument();
    expect(tDynamic('arvid.onboarding.welcome.0')).toBe('Hola. Soy DARIS, tu compañera de ruta.');
    await user.click(screen.getByRole('button', { name: 'Empezar' }));
    await skipDialogue(user);
    await user.type(screen.getByLabelText('Tu nombre o alias'), 'Ana');
    await user.click(screen.getByRole('button', { name: 'Continuar' }));
    await skipDialogue(user);
    await user.click(screen.getByRole('radio', { name: 'Femenino' }));
    await user.click(screen.getByRole('button', { name: 'Continuar' }));
    await skipDialogue(user);
    await user.click(screen.getByRole('button', { name: 'Continuar' }));
    // Color de DARIS (DC-01)
    await skipDialogue(user);
    await user.click(screen.getByRole('radio', { name: 'Lima' }));
    await waitFor(async () => expect((await loadSettings(ctx.db)).darisColor).toBe('lima'));
    expect((await loadSettings(ctx.db)).arvidColor).toBe('cian');
  });

  it('ON-05: Atrás conserva lo elegido', async () => {
    const user = userEvent.setup();
    renderRoutes(ctx, [{ path: '/', element: <Onboarding /> }], '/');
    await skipDialogue(user);
    await user.click(screen.getByRole('button', { name: 'Continuar' }));
    await skipDialogue(user);
    await user.click(screen.getByRole('button', { name: 'Continuar' }));
    await skipDialogue(user);
    await user.click(screen.getByRole('button', { name: 'Empezar' }));
    await skipDialogue(user);
    await user.type(screen.getByLabelText('Tu nombre o alias'), 'Ana');
    await user.click(screen.getByRole('button', { name: 'Continuar' }));
    await user.click(await screen.findByRole('button', { name: /Atrás/ }));
    await skipDialogue(user);
    expect(screen.getByLabelText('Tu nombre o alias')).toHaveValue('Ana');
  });

  it('I18N-03: elegir English cambia el idioma al momento', async () => {
    const user = userEvent.setup();
    renderRoutes(ctx, [{ path: '/', element: <Onboarding /> }], '/');
    await skipDialogue(user);
    await user.click(screen.getByRole('radio', { name: 'English' }));
    expect(await screen.findByRole('button', { name: 'Continue' })).toBeInTheDocument();
    expect(document.documentElement.lang).toBe('en');
    expect((await loadSettings(ctx.db)).locale).toBe('en');
  });
});

describe('presentación para usuarios existentes (PR)', () => {
  it('PR-01/02: sin alias aparece la presentación; "Más tarde" la pospone hasta mañana', async () => {
    const user = userEvent.setup();
    renderRoutes(ctx, [{ path: '/hoy', element: <TodayScreen /> }], '/hoy');
    const dialog = await screen.findByRole('dialog', { name: 'ARVID se presenta' });
    await user.click(await within(dialog).findByRole('button', { name: 'Más tarde' }));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'ARVID se presenta' })).not.toBeInTheDocument());
    expect((await loadSettings(ctx.db)).introSnoozedUntil).toBe(addDays(toLocalDate(new Date()), 1));
  });

  it('con alias no aparece', async () => {
    await saveSetting(ctx.db, 'profile', { alias: 'Ana', gender: 'f' });
    renderRoutes(ctx, [{ path: '/hoy', element: <TodayScreen /> }], '/hoy');
    await screen.findByRole('heading', { level: 1 });
    expect(screen.queryByRole('dialog', { name: 'ARVID se presenta' })).not.toBeInTheDocument();
  });
});

describe('Perfil (PF)', () => {
  it('PF-01: /personaje redirige a /perfil y la pestaña se llama Perfil', async () => {
    await saveSetting(ctx.db, 'profile', { alias: 'Ana', gender: 'f' });
    renderRoutes(ctx, routes, '/personaje/disciplina');
    expect(await screen.findByRole('heading', { name: 'Disciplina', level: 1 })).toBeInTheDocument();
    const nav = screen.getByRole('navigation', { name: 'Principal' });
    expect(within(nav).getByRole('link', { name: 'Perfil' })).toHaveAttribute('href', '/perfil');
  });

  it('PF-02: encabezado con alias y estilo', async () => {
    await saveSetting(ctx.db, 'profile', { alias: 'Héctor', gender: 'm' });
    await saveSetting(ctx.db, 'avatar', { cast: 'el2', variant: 'original' });
    renderRoutes(ctx, [{ path: '/perfil', element: <ProfileScreen /> }], '/perfil');
    expect(await screen.findByRole('heading', { name: 'Héctor · Drifter', level: 1 })).toBeInTheDocument();
  });
});

describe('escena: chat y música (CH, MU)', () => {
  beforeEach(async () => {
    await saveSetting(ctx.db, 'profile', { alias: 'Ana', gender: 'f' });
  });

  it('CH-01/02: el chat se despliega, el botón pasa a Enviar y Esc lo cierra', async () => {
    const user = userEvent.setup();
    renderRoutes(ctx, [{ path: '/hoy', element: <TodayScreen /> }], '/hoy');
    await user.click(await screen.findByRole('button', { name: 'Hablar con ARVID' }));
    const input = screen.getByRole('textbox', { name: 'Mensaje para ARVID' });
    expect(input).toHaveFocus();
    expect(input).toHaveAttribute('maxLength', '280');
    expect(screen.getByRole('button', { name: 'Enviar' })).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('textbox', { name: 'Mensaje para ARVID' })).not.toBeInTheDocument();
  });

  it('CH-05 · IA-06: sin permiso, ARVID pide activar la IA y no hay ninguna petición', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const user = userEvent.setup();
    renderRoutes(ctx, [{ path: '/hoy', element: <TodayScreen /> }], '/hoy');
    await user.click(await screen.findByRole('button', { name: 'Hablar con ARVID' }));
    await user.type(screen.getByRole('textbox', { name: 'Mensaje para ARVID' }), '¿Qué hago hoy?{Enter}');
    // El saludo del día puede llegar antes o después: se busca entre todo lo dicho
    const said = () => vi.mocked(say).mock.calls.map((c) => c[0].flat().join(' '));
    await waitFor(() => expect(said().some((x) => /activa «ARVID con IA»/.test(x))).toBe(true), { timeout: 3000 });
    expect(vi.mocked(say).mock.calls.some((c) => c[0].flat().join('') === '…')).toBe(true);
    expect(fetchSpy.mock.calls.some(([url]) => String(url).includes('/api/arvid'))).toBe(false);
    fetchSpy.mockRestore();
  });

  it('CH-03 · IA-05: con IA, ARVID responde con lo que devuelve /api/arvid y recuerda la conversación', async () => {
    await saveSetting(ctx.db, 'arvidAi', true);
    resetConversation();
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => new Response(JSON.stringify({ reply: 'Empieza por Leer, Ana.' })));
    const user = userEvent.setup();
    renderRoutes(ctx, [{ path: '/hoy', element: <TodayScreen /> }], '/hoy');
    await user.click(await screen.findByRole('button', { name: 'Hablar con ARVID' }));
    await user.type(screen.getByRole('textbox', { name: 'Mensaje para ARVID' }), '¿Qué hago hoy?{Enter}');
    const said = () => vi.mocked(say).mock.calls.map((c) => c[0].flat().join(' '));
    await waitFor(() => expect(said()).toContain('Empieza por Leer, Ana.'));
    const chatCall = fetchSpy.mock.calls.map(([, init]) => JSON.parse(String(init?.body))).find((b) => b.moment === 'chat');
    expect(chatCall).toMatchObject({ locale: 'es', messages: [{ role: 'user', content: '¿Qué hago hoy?' }] });
    expect(chatCall.context).toMatchObject({ user: { alias: 'Ana' } });
    fetchSpy.mockRestore();
  });

  it('IA-07: con la cuota agotada (429), ARVID lo explica', async () => {
    await saveSetting(ctx.db, 'arvidAi', true);
    resetConversation();
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => new Response('{}', { status: 429 }));
    const user = userEvent.setup();
    renderRoutes(ctx, [{ path: '/hoy', element: <TodayScreen /> }], '/hoy');
    await user.click(await screen.findByRole('button', { name: 'Hablar con ARVID' }));
    await user.type(screen.getByRole('textbox', { name: 'Mensaje para ARVID' }), 'Hola{Enter}');
    await waitFor(() => expect(vi.mocked(say).mock.calls.some((c) => /no puedo conversar más/.test(c[0].flat().join(' ')))).toBe(true));
    fetchSpy.mockRestore();
  });

  it('MU-01: bocina con aria-pressed, apagada por defecto', async () => {
    renderRoutes(ctx, [{ path: '/hoy', element: <TodayScreen /> }], '/hoy');
    expect(await screen.findByRole('button', { name: 'Música' })).toHaveAttribute('aria-pressed', 'false');
  });
});

describe('momentos por iniciativa propia (DL)', () => {
  beforeEach(async () => {
    await saveSetting(ctx.db, 'profile', { alias: 'Ana', gender: 'f' });
  });

  it('DL-01/02: al abrir Hoy, ARVID saluda por la hora con el estado del día, una vez al día', async () => {
    renderRoutes(ctx, [{ path: '/hoy', element: <TodayScreen /> }], '/hoy');
    await waitFor(() => expect(lastSaid()).toMatch(/^(Buenos días|Buenas tardes|Buenas noches), Ana\. Hoy no tienes nada pendiente\./), {
      timeout: 2000,
    });
    await waitFor(async () => expect((await loadSettings(ctx.db)).arvidSeen?.said?.greeting).toBe(toLocalDate(new Date())));
  });

  it('IA-05: con IA, el saludo lo genera ARVID con el contexto', async () => {
    await saveSetting(ctx.db, 'arvidAi', true);
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => new Response(JSON.stringify({ reply: 'Buenos días, Ana. Hoy toca descansar.' })));
    renderRoutes(ctx, [{ path: '/hoy', element: <TodayScreen /> }], '/hoy');
    await waitFor(() => expect(lastSaid()).toBe('Buenos días, Ana. Hoy toca descansar.'), { timeout: 3000 });
    expect(JSON.parse(String(fetchSpy.mock.calls[0]![1]!.body))).toMatchObject({ moment: 'greeting' });
    fetchSpy.mockRestore();
  });

  it('IA-05: si la IA falla, ARVID usa su frase fija', async () => {
    await saveSetting(ctx.db, 'arvidAi', true);
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => new Response('{}', { status: 502 }));
    renderRoutes(ctx, [{ path: '/hoy', element: <TodayScreen /> }], '/hoy');
    await waitFor(() => expect(lastSaid()).toMatch(/^(Buenos días|Buenas tardes|Buenas noches), Ana\./), { timeout: 3000 });
    fetchSpy.mockRestore();
  });

  it('DL-03: con "ARVID habla por iniciativa propia" desactivado, no saluda', async () => {
    await saveSetting(ctx.db, 'arvidTalks', false);
    renderRoutes(ctx, [{ path: '/hoy', element: <TodayScreen /> }], '/hoy');
    await screen.findByRole('heading', { level: 1 });
    await new Promise((r) => setTimeout(r, 800));
    expect(say).not.toHaveBeenCalled();
  });
});

describe('idioma inglés (I18N)', () => {
  it('textos y categorías predefinidas en inglés; lo escrito por el usuario no se traduce', async () => {
    setLocale('en');
    renderRoutes(ctx, [{ path: '/actividades', element: <ActivitiesScreen /> }], '/actividades');
    expect(await screen.findByRole('heading', { name: 'Activities', level: 1 })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /New activity/ })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'No activities yet' })).toBeInTheDocument();
  });
});
